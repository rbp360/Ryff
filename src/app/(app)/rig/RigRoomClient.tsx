'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { formatGearTitle } from '@/lib/gear-utils';
import { BackButton } from '@/components/BackButton';
import { GearThumbnail } from '@/components/GearThumbnail';
import { NapkinIngesterModal } from '@/components/NapkinIngesterModal';
import { AddGearModal } from '@/components/AddGearModal';
import { useAudioRecorder, AudioRecordResult } from '@/hooks/useAudioRecorder';

export interface RigItemData {
  id: number | string;
  raw_text: string;
  brand: string | null;
  model: string | null;
  category: string;
  kind: 'own' | 'want';
  budget_gbp: number | null;
  nickname?: string | null;
  current_strings?: string | null;
  last_restrung_at?: string | null;
  image_url?: string | null;
}

export interface RigLogData {
  id: number | string;
  rig_item_id: number | string;
  item_name?: string;
  event_type: string;
  title: string;
  description: string | null;
  event_date: string;
}

interface RigRoomClientProps {
  initialItems: RigItemData[];
  initialLogs: RigLogData[];
}

const EVENT_CHIPS = ['String change', 'Clean', 'Setup', 'Note', 'Valve change'];

function getWeeksAgo(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24 * 7)));
}

export function RigRoomClient({ initialItems, initialLogs }: RigRoomClientProps) {
  const [segment, setSegment] = useState<'gear' | 'log' | 'wants'>('gear');
  const [items, setItems] = useState<RigItemData[]>(initialItems);
  const [logs, setLogs] = useState<RigLogData[]>(initialLogs);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAddGearModal, setShowAddGearModal] = useState(false);

  // Sync state if initialItems changes
  const [prevInitialItems, setPrevInitialItems] = useState(initialItems);
  if (initialItems !== prevInitialItems) {
    setPrevInitialItems(initialItems);
    setItems(initialItems);
  }

  // Refresh items on window focus or mount to pick up edits from /rig/[id]
  useEffect(() => {
    async function syncItems() {
      try {
        const res = await fetch('/api/rig');
        if (res.ok) {
          const data = await res.json();
          if (data.items) setItems(data.items);
          if (data.logs) setLogs(data.logs);
        }
      } catch {
        // ignore background sync errors
      }
    }

    syncItems();
    window.addEventListener('focus', syncItems);
    return () => window.removeEventListener('focus', syncItems);
  }, []);

  // Bottom Input & Voice Memo State
  const [inputText, setInputText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribeNotice, setTranscribeNotice] = useState<string | null>(null);

  // Add Log Entry Form State
  const [showLogForm, setShowLogForm] = useState(false);
  const [logItemId, setLogItemId] = useState<string>('');
  const [logType, setLogType] = useState('String change');
  const [logNote, setLogNote] = useState('');
  const [isSavingLog, setIsSavingLog] = useState(false);

  // Add Want State
  const [showWantForm, setShowWantForm] = useState(false);
  const [wantText, setWantText] = useState('');
  const [wantBudget, setWantBudget] = useState('');

  const ownedItems = items.filter((i) => i.kind === 'own');
  const wantedItems = items.filter((i) => i.kind === 'want');

  // Process recorded audio through Gemini speech-to-text
  async function handleProcessAudio(recordResult: AudioRecordResult) {
    setIsTranscribing(true);
    setTranscribeNotice(null);
    try {
      const res = await fetch('/api/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: recordResult.audioBase64,
          audioMimeType: recordResult.audioMimeType,
          context: {
            screen: '/rig',
          },
        }),
      });

      const data = await res.json();
      if (res.ok && data.text) {
        setInputText(data.text);
        // Automatically open the Command Sheet to present the proposal & action confirmation
        window.dispatchEvent(
          new CustomEvent('ryff_open_command', {
            detail: { initialText: data.text, autoSubmit: true },
          })
        );
      } else {
        setTranscribeNotice(data.error || 'Speech transcription failed. Please try again.');
      }
    } catch {
      setTranscribeNotice('Network error transcribing audio.');
    } finally {
      setIsTranscribing(false);
    }
  }

  const {
    isRecording,
    recordingSeconds,
    maxSeconds,
    audioLevel,
    startRecording,
    stopRecording,
    cancelRecording,
    error: recorderError,
  } = useAudioRecorder(15, {
    onAutoStop: (result) => {
      handleProcessAudio(result);
    },
  });

  async function handleFinishRecording() {
    setIsTranscribing(true);
    setTranscribeNotice(null);
    const result = await stopRecording();
    if (result && result.audioBase64) {
      await handleProcessAudio(result);
    } else {
      setIsTranscribing(false);
    }
  }

  async function handleTextSubmit() {
    const text = inputText.trim();
    if (!text || isSubmitting) return;

    // Detect if this looks like a command / question / maintenance log rather than simple gear naming
    const isMaintenanceOrCommand =
      text.includes('?') ||
      /\b(string|strings|restring|clean|cleaned|setup|tune|valve|tube|pot|action|intonation|bought|sold|sell|how|what|why|who|recommend|tell|log|maintenance|service)\b/i.test(
        text
      );

    if (isMaintenanceOrCommand) {
      window.dispatchEvent(
        new CustomEvent('ryff_open_command', {
          detail: { initialText: text, autoSubmit: true },
        })
      );
      setInputText('');
      return;
    }

    setIsSubmitting(true);
    setInputText('');

    try {
      const res = await fetch('/api/rig', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ textLines: text, mode: 'append' }),
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function refreshRig() {
    try {
      const res = await fetch('/api/rig');
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        if (data.logs) setLogs(data.logs);
      }
    } catch {
      // Refresh failed
    }
  }

  async function handleSaveLog() {
    const targetItemId = logItemId || (ownedItems[0] ? String(ownedItems[0].id) : '');
    if (!targetItemId) return;

    setIsSavingLog(true);
    try {
      const res = await fetch(`/api/rig/${targetItemId}/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: logType.toLowerCase().replace(/\s+/g, '_'),
          title: logType,
          description: logNote || null,
        }),
      });

      if (res.ok) {
        setShowLogForm(false);
        setLogNote('');
        refreshRig();
      }
    } finally {
      setIsSavingLog(false);
    }
  }

  async function handleAddWant() {
    let text = wantText.trim();
    if (!text) return;

    // Clean any leading Want: or colons if the user already typed them
    text = text.replace(/^(want|wtb|iso)\s*[:–—-]*/i, '').replace(/^[:\s–—-]+/, '').trim();

    const budgetNum = wantBudget ? parseInt(wantBudget, 10) : null;
    const formatted = `Want: ${text}${budgetNum ? ` under £${budgetNum}` : ''}`;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/rig', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ textLines: formatted, mode: 'append' }),
      });
      if (res.ok) {
        setShowWantForm(false);
        setWantText('');
        setWantBudget('');
        const data = await res.json();
        setItems(data.items || []);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <div className="top" style={{ marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <BackButton fallbackHref="/" />
          <h1 style={{ marginBottom: 0 }}>Rig Passport</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid var(--ln)',
              background: 'var(--sf)',
              color: 'var(--tx)',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            📥 Import Notes / CSV
          </button>
          <Link href="/setup" className="gearbtn" aria-label="Setup">
            ⚙
          </Link>
        </div>
      </div>

      {/* Segmented Control: Gear | Log | Wants */}
      <div className="seg segw" style={{ marginBottom: '18px' }}>
        <button
          type="button"
          className={segment === 'gear' ? 'on' : ''}
          onClick={() => setSegment('gear')}
        >
          Gear ({ownedItems.length})
        </button>
        <button
          type="button"
          className={segment === 'log' ? 'on' : ''}
          onClick={() => setSegment('log')}
        >
          Log ({logs.length})
        </button>
        <button
          type="button"
          className={segment === 'wants' ? 'on' : ''}
          onClick={() => setSegment('wants')}
        >
          Wants ({wantedItems.length})
        </button>
      </div>

      {/* SEGMENT 1: GEAR GRID */}
      {segment === 'gear' && (
        <>
          {ownedItems.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '32px 16px' }}>
              <p style={{ color: 'var(--tx)', fontWeight: 800, fontSize: '15px', marginBottom: '6px' }}>
                Your Rig Passport is empty
              </p>
              <p style={{ color: 'var(--mu)', fontSize: '13px', margin: '0 0 16px' }}>
                Speak or type your guitars, amps, and pedals below, or import existing notes.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setShowAddGearModal(true)}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    border: '1px solid var(--ac)',
                    background: 'var(--ac)',
                    color: '#000',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>+</span> Add Gear Manually
                </button>
                <button
                  type="button"
                  onClick={() => setShowImportModal(true)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid var(--ln)',
                    background: 'var(--sf)',
                    color: 'var(--tx)',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  📥 Import Notes or Spreadsheet
                </button>
              </div>
            </div>
          ) : (
            <div className="grid">
              {ownedItems.map((item) => {
                const isGuitar =
                  item.category?.toLowerCase() === 'guitar' ||
                  item.category?.toLowerCase() === 'guitars' ||
                  !item.category;
                const weeks = getWeeksAgo(item.last_restrung_at);

                return (
                  <Link
                    key={item.id}
                    href={`/rig/${item.id}`}
                    className="gc"
                    style={{ textDecoration: 'none' }}
                  >
                    <GearThumbnail
                      itemId={item.id}
                      imageUrl={item.image_url}
                      brand={item.brand}
                      model={item.model}
                      category={item.category}
                      rawText={item.raw_text}
                      alt={formatGearTitle(item.brand, item.model, item.raw_text)}
                    />
                    <div className="b">
                      <b>{item.nickname || formatGearTitle(item.brand, item.model, item.raw_text)}</b>
                      <small>
                        {item.nickname
                          ? `${formatGearTitle(item.brand, item.model, item.raw_text)} · ${item.category || 'Gear'}`
                          : (item.category || 'Gear')}
                      </small>
                      {isGuitar && weeks !== null && (
                        <small
                          className={weeks >= 12 ? 'warn' : 'ok'}
                          style={{ display: 'block', marginTop: '4px', fontWeight: 700 }}
                        >
                          Strings: {weeks === 0 ? 'Today' : `${weeks} weeks ago`}
                        </small>
                      )}
                    </div>
                  </Link>
                );
              })}

              {/* Green dashed / dotted manual ADD gear element matching user sketch */}
              <button
                type="button"
                onClick={() => setShowAddGearModal(true)}
                className="gc gc-add-manual"
                style={{
                  background: 'rgba(34, 197, 94, 0.03)',
                  border: '2px dashed var(--ac)',
                  borderRadius: 'var(--r)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '210px',
                  padding: '20px 14px',
                  textAlign: 'center',
                  gap: '12px',
                  transition: 'all 0.2s ease',
                  outline: 'none',
                  boxShadow: 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(34, 197, 94, 0.08)';
                  e.currentTarget.style.borderColor = '#4ade80';
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(34, 197, 94, 0.22)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(34, 197, 94, 0.03)';
                  e.currentTarget.style.borderColor = 'var(--ac)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 'rgba(34, 197, 94, 0.14)',
                    border: '1.5px solid var(--ac)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '26px',
                    color: 'var(--ac)',
                    fontWeight: 900,
                  }}
                >
                  +
                </div>
                <div>
                  <b
                    style={{
                      color: 'var(--ac)',
                      fontSize: '15px',
                      fontWeight: 900,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      display: 'block',
                    }}
                  >
                    + ADD GEAR
                  </b>
                  <small
                    style={{
                      color: 'var(--mu)',
                      fontSize: '11px',
                      fontWeight: 600,
                      display: 'block',
                      marginTop: '4px',
                    }}
                  >
                    Add instrument, amp, or pedal
                  </small>
                </div>
              </button>
            </div>
          )}

          {/* Notice banner for errors */}
          {(recorderError || transcribeNotice) && (
            <div
              style={{
                position: 'sticky',
                bottom: '124px',
                zIndex: 41,
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #ef4444',
                color: '#fca5a5',
                padding: '8px 14px',
                borderRadius: '12px',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px',
              }}
            >
              <span>{recorderError || transcribeNotice}</span>
              <button
                type="button"
                onClick={() => setTranscribeNotice(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#fca5a5',
                  cursor: 'pointer',
                  fontWeight: 800,
                  fontSize: '14px',
                  padding: '0 4px',
                }}
              >
                ✕
              </button>
            </div>
          )}

          {/* Sticky Bottom Bar with Quick-Mic & Live Equalizer */}
          <div className="comp" style={{ position: 'sticky', bottom: '66px', zIndex: 40 }}>
            {isRecording ? (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: '#161616',
                  borderRadius: '24px',
                  padding: '10px 16px',
                  border: '1px solid var(--ac, #22c55e)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                }}
              >
                {/* Live pulsing recording dot */}
                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: '#ef4444',
                    boxShadow: '0 0 10px rgba(239, 68, 68, 0.8)',
                    animation: 'pulse 1s infinite',
                    flexShrink: 0,
                  }}
                />

                <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--tx)', whiteSpace: 'nowrap' }}>
                  Recording ({recordingSeconds}s / {maxSeconds}s)
                </span>

                {/* Real-time Web Audio API Equalizer Meter */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                    height: '20px',
                    padding: '0 8px',
                    background: 'rgba(255,255,255,0.04)',
                    borderRadius: '10px',
                  }}
                  title={`Microphone input level: ${audioLevel}%`}
                >
                  {[0.6, 1.1, 1.5, 1.0, 0.7].map((mult, idx) => {
                    const rawH = (audioLevel / 100) * 18 * mult;
                    const barHeight = Math.max(3, Math.min(18, Math.round(rawH)));
                    const isLive = audioLevel > 5;
                    return (
                      <span
                        key={idx}
                        style={{
                          width: '3px',
                          height: `${barHeight}px`,
                          borderRadius: '2px',
                          background: isLive ? 'var(--ac, #22c55e)' : '#444',
                          transition: 'height 0.08s ease, background-color 0.1s ease',
                        }}
                      />
                    );
                  })}
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      marginLeft: '4px',
                      color: audioLevel > 5 ? 'var(--ac, #22c55e)' : 'var(--mu)',
                    }}
                  >
                    {audioLevel > 5 ? 'Signal OK' : 'Listening...'}
                  </span>
                </div>

                {/* Cancel & Done buttons */}
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={cancelRecording}
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      color: 'var(--mu)',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '5px 9px',
                      borderRadius: '12px',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleFinishRecording}
                    style={{
                      background: 'var(--ac)',
                      color: '#000',
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '5px 12px',
                      borderRadius: '12px',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : isTranscribing ? (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: '#161616',
                  borderRadius: '24px',
                  padding: '10px 16px',
                  border: '1px solid var(--ac, #22c55e)',
                }}
              >
                <span
                  style={{
                    width: '14px',
                    height: '14px',
                    border: '2px solid rgba(255,255,255,0.2)',
                    borderTopColor: 'var(--ac, #22c55e)',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                    display: 'inline-block',
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--tx)' }}>
                  Transcribing speech with Gemini...
                </span>
              </div>
            ) : (
              <>
                <input
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Add gear or ask a question..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleTextSubmit();
                  }}
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={startRecording}
                  aria-label="Record voice memo"
                  title="Speak command or gear note (15s limit)"
                  style={{
                    width: '42px',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    borderRadius: '50%',
                    background: 'var(--sf)',
                    border: '1px solid var(--ln)',
                    color: 'var(--ac)',
                    cursor: 'pointer',
                  }}
                >
                  🎙️
                </button>
                {inputText.trim().length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      window.dispatchEvent(
                        new CustomEvent('ryff_open_command', {
                          detail: { initialText: inputText.trim(), autoSubmit: true },
                        })
                      );
                      setInputText('');
                    }}
                    title="Review & run action proposal with Ryff"
                    style={{
                      background: 'var(--ac)',
                      color: '#000',
                      fontWeight: 800,
                      fontSize: '12px',
                      padding: '8px 12px',
                      borderRadius: '16px',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    ⚡ Tell Ryff
                  </button>
                )}
                <button type="button" onClick={handleTextSubmit} disabled={isSubmitting}>
                  Send
                </button>
              </>
            )}
          </div>
        </>
      )}

      {/* SEGMENT 2: LOG TIMELINE */}
      {segment === 'log' && (
        <>
          {showLogForm ? (
            <div className="card form" style={{ marginBottom: '18px' }}>
              <h3>New entry</h3>
              <p>Defaults to today.</p>

              <select
                value={logItemId || (ownedItems[0] ? String(ownedItems[0].id) : '')}
                onChange={(e) => setLogItemId(e.target.value)}
              >
                {ownedItems.map((g) => (
                  <option key={g.id} value={g.id}>
                    {formatGearTitle(g.brand, g.model, g.raw_text)}
                  </option>
                ))}
              </select>

              <div className="chips">
                {EVENT_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    className={`chip ${logType === chip ? 'on' : ''}`}
                    onClick={() => setLogType(chip)}
                  >
                    {chip}
                  </button>
                ))}
              </div>

              <input
                value={logNote}
                onChange={(e) => setLogNote(e.target.value)}
                placeholder="Note (optional)"
              />

              <div className="acts">
                <button type="button" onClick={() => setShowLogForm(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="pri"
                  onClick={handleSaveLog}
                  disabled={isSavingLog}
                >
                  {isSavingLog ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="addb"
              onClick={() => setShowLogForm(true)}
            >
              + Add entry
            </button>
          )}

          <h2>All entries</h2>
          {logs.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '24px 16px' }}>
              <p style={{ color: 'var(--mu)', fontSize: '13px' }}>
                No maintenance entries logged yet. Tap + Add entry above or use voice memo on any gear item.
              </p>
            </div>
          ) : (
            <div className="tl">
              {logs.map((log) => (
                <div key={log.id}>
                  <b>
                    {log.item_name || 'Rig Item'}
                    <span className="ltag">{log.title || log.event_type}</span>
                  </b>
                  <small>
                    {log.event_date ? new Date(log.event_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Today'}
                    {log.description ? ` · ${log.description}` : ''}
                  </small>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* SEGMENT 3: WANTS GRID */}
      {segment === 'wants' && (
        <>
          {showWantForm ? (
            <div className="card form" style={{ marginBottom: '18px' }}>
              <h3>Track new want</h3>
              <p>Ryff will automatically monitor used marketplace listings.</p>

              <input
                value={wantText}
                onChange={(e) => setWantText(e.target.value)}
                placeholder="Gear name (e.g. Soldano SLO-30, Charvel 750XL)"
              />

              <input
                type="number"
                value={wantBudget}
                onChange={(e) => setWantBudget(e.target.value)}
                placeholder="Max budget £ (optional)"
              />

              <div className="acts">
                <button type="button" onClick={() => setShowWantForm(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="pri"
                  onClick={handleAddWant}
                  disabled={isSubmitting}
                >
                  Save Want
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="addb"
              onClick={() => setShowWantForm(true)}
              style={{ marginBottom: '16px' }}
            >
              + Add Want to Track
            </button>
          )}

          {wantedItems.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '32px 16px' }}>
              <p style={{ color: 'var(--tx)', fontWeight: 800, fontSize: '15px', marginBottom: '6px' }}>
                No gear on your wants list
              </p>
              <p style={{ color: 'var(--mu)', fontSize: '13px' }}>
                Add items you are hunting for to monitor used bargains and price drops across Reverb.
              </p>
            </div>
          ) : (
            <div className="grid">
              {wantedItems.map((want) => (
                <div key={want.id} className="gc want">
                  <GearThumbnail
                    itemId={want.id}
                    imageUrl={want.image_url}
                    brand={want.brand}
                    model={want.model}
                    category={want.category}
                    rawText={want.raw_text}
                    alt={formatGearTitle(want.brand, want.model, want.raw_text)}
                  />
                  <div className="b">
                    <b>{formatGearTitle(want.brand, want.model, want.raw_text)}</b>
                    <small>
                      {want.category || 'Gear'} · {want.budget_gbp ? `under £${want.budget_gbp}` : 'Tracking'}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <NapkinIngesterModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportComplete={refreshRig}
      />

      <AddGearModal
        isOpen={showAddGearModal}
        onClose={() => setShowAddGearModal(false)}
        onGearAdded={(updatedItems) => setItems(updatedItems)}
      />
    </>
  );
}
