'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { formatGearTitle } from '@/lib/gear-utils';
import { BackButton } from '@/components/BackButton';
import { GearThumbnail } from '@/components/GearThumbnail';

export interface RigItemData {
  id: number | string;
  raw_text: string;
  brand: string | null;
  model: string | null;
  category: string;
  kind: 'own' | 'want';
  budget_gbp: number | null;
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

  // Sync state if initialItems changes
  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

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
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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

  // Voice recording handlers (15s cap)
  async function startRecording() {
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4',
      });

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        if (timerRef.current) clearInterval(timerRef.current);
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        await handleAudioLog(audioBlob, mimeType);
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 14) {
            stopRecording();
            return 15;
          }
          return prev + 1;
        });
      }, 1000);
    } catch {
      alert('Microphone access was denied or is not supported.');
      setIsRecording(false);
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }

  async function handleAudioLog(audioBlob: Blob, mimeType: string) {
    setIsSubmitting(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        // If an item is selected or first owned item exists, log to it
        const targetId = ownedItems[0]?.id;
        if (targetId) {
          const res = await fetch(`/api/rig/${targetId}/log`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audioBase64: base64Audio, audioMimeType: mimeType }),
          });
          if (res.ok) {
            refreshRig();
          }
        }
      };
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleTextSubmit() {
    const text = inputText.trim();
    if (!text || isSubmitting) return;

    setIsSubmitting(true);
    setInputText('');

    try {
      // Check if it's adding gear or logging
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
          <h1 style={{ marginBottom: 0 }}>Rig room</h1>
        </div>
        <Link href="/setup" className="gearbtn" aria-label="Setup">
          ⚙
        </Link>
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
                Your rig is empty
              </p>
              <p style={{ color: 'var(--mu)', fontSize: '13px', margin: 0 }}>
                Speak or type your guitars, amps, and pedals below to get started.
              </p>
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
                      imageUrl={item.image_url}
                      brand={item.brand}
                      model={item.model}
                      category={item.category}
                      rawText={item.raw_text}
                      alt={formatGearTitle(item.brand, item.model, item.raw_text)}
                    />
                    <div className="b">
                      <b>{formatGearTitle(item.brand, item.model, item.raw_text)}</b>
                      <small>{item.category || 'Gear'}</small>
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
            </div>
          )}

          {/* Sticky Bottom Bar with Quick-Mic */}
          <div className="comp" style={{ position: 'sticky', bottom: '66px', zIndex: 40 }}>
            {isRecording ? (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: '#161616',
                  borderRadius: '24px',
                  padding: '10px 16px',
                  border: '1px solid var(--ac)',
                }}
              >
                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: '#ef4444',
                    animation: 'pulse 1s infinite',
                  }}
                />
                <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--tx)' }}>
                  Recording ({recordingSeconds}s / 15s)...
                </span>
                <button
                  type="button"
                  onClick={stopRecording}
                  style={{
                    marginLeft: 'auto',
                    background: 'var(--ac)',
                    color: '#000',
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '4px 10px',
                    borderRadius: '12px',
                  }}
                >
                  Done
                </button>
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
                  }}
                >
                  🎙️
                </button>
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
    </>
  );
}
