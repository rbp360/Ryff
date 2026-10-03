'use client';

import { use, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { BackButton } from '@/components/BackButton';


interface RigItem {
  id: number;
  raw_text: string;
  brand: string | null;
  model: string | null;
  category: string;
  serial_number?: string | null;
  purchase_date?: string | null;
  purchase_price?: string | null;
  current_strings?: string | null;
  last_restrung_at?: string | null;
  pickups_summary?: string | null;
  modifications_summary?: string | null;
  valves_summary?: string | null;
  last_valves_changed_at?: string | null;
}

interface RigItemLog {
  id: number;
  event_type: string;
  title: string;
  description: string | null;
  component: string | null;
  original_part: string | null;
  event_date: string;
}

interface MatchingNewsItem {
  id: number;
  title: string;
  headline?: string;
  source_name: string;
  url: string;
}

function getStringHealthText(dateStr?: string | null): { text: string; warn: boolean } {
  if (!dateStr) return { text: 'Not logged yet', warn: false };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { text: dateStr, warn: false };

  const diffDays = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return { text: 'Today', warn: false };
  if (diffDays < 7) return { text: `${diffDays} days ago`, warn: false };

  const weeks = Math.floor(diffDays / 7);
  if (weeks < 12) return { text: `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} (${weeks} weeks ago)`, warn: false };
  return { text: `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} (${weeks} weeks ago - Restring due!)`, warn: true };
}

export default function GearDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const itemId = resolvedParams.id;

  const [item, setItem] = useState<RigItem | null>(null);
  const [logs, setLogs] = useState<RigItemLog[]>([]);
  const [news, setNews] = useState<MatchingNewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Quick Log State (Voice or Text)
  const [logText, setLogText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isProcessingLog, setIsProcessingLog] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let ignore = false;
    async function loadItem() {
      try {
        const res = await fetch(`/api/rig/${itemId}`);
        if (!res.ok) {
          throw new Error('Gear item not found');
        }
        const data = await res.json();
        if (!ignore) {
          setItem(data.item);
          setLogs(data.logs || []);
          if (data.matchingNews) setNews(data.matchingNews);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Failed to load gear');
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadItem();
    return () => {
      ignore = true;
    };
  }, [itemId]);

  // Voice recording handlers (15s limit)
  async function startRecording() {
    setError(null);
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
        await handleAudioSubmit(audioBlob, mimeType);
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
      setError('Microphone access denied or not supported on this browser.');
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

  async function handleAudioSubmit(audioBlob: Blob, mimeType: string) {
    setIsProcessingLog(true);
    setError(null);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        const res = await fetch(`/api/rig/${itemId}/log`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audioBase64: base64Audio, audioMimeType: mimeType }),
        });

        const data = await res.json();
        if (res.ok) {
          if (data.log) setLogs((prev) => [data.log, ...prev]);
          if (data.item) setItem(data.item);
        } else {
          setError(data.error || 'Failed to process voice log');
        }
        setIsProcessingLog(false);
      };
    } catch {
      setError('Network error processing audio.');
      setIsProcessingLog(false);
    }
  }

  async function handleTextSubmit() {
    if (!logText.trim() || isProcessingLog) return;
    setIsProcessingLog(true);
    setError(null);

    try {
      const res = await fetch(`/api/rig/${itemId}/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: logText.trim() }),
      });

      const data = await res.json();
      if (res.ok) {
        setLogText('');
        if (data.log) setLogs((prev) => [data.log, ...prev]);
        if (data.item) setItem(data.item);
      } else {
        setError(data.error || 'Failed to save log');
      }
    } catch {
      setError('Network error saving log.');
    } finally {
      setIsProcessingLog(false);
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <p style={{ color: 'var(--mu)', fontSize: '13px' }}>Loading gear details...</p>
      </div>
    );
  }

  if (!item) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <p style={{ color: 'var(--mu)', fontSize: '14px', marginBottom: '14px' }}>
          {error || 'Gear item not found.'}
        </p>
        <Link href="/rig" className="back">
          ‹ Back to Rig room
        </Link>
      </div>
    );
  }

  const isGuitar =
    item.category?.toLowerCase() === 'guitar' ||
    item.category?.toLowerCase() === 'guitars' ||
    !item.category;
  const isAmp = item.category?.toLowerCase() === 'amp' || item.category?.toLowerCase() === 'amps';
  const stringHealth = getStringHealthText(item.last_restrung_at);

  return (
    <>
      <BackButton fallbackHref="/rig" label="Rig room" />


      {/* 4:3 Hero Photo */}
      <div className="ph hero">
        ▨ {item.brand ? `${item.brand} ` : ''}{item.model || item.raw_text} · 4:3
      </div>

      <h1 style={{ marginTop: '16px' }}>
        {item.brand ? `${item.brand} ` : ''}{item.model || item.raw_text}
      </h1>
      <p className="sub">{item.category || 'Gear'}</p>

      {/* Status Card */}
      <div className="status">
        <small>{isGuitar ? 'Last string change' : isAmp ? 'Last valve service' : 'Last logged'}</small>
        <b style={{ color: stringHealth.warn ? '#f59e0b' : 'var(--tx)' }}>
          {isGuitar
            ? stringHealth.text
            : isAmp && item.last_valves_changed_at
            ? new Date(item.last_valves_changed_at).toLocaleDateString()
            : logs[0]
            ? `${logs[0].title} · ${logs[0].event_date}`
            : 'Nothing logged yet'}
        </b>
      </div>

      {/* Quick Audio Voice & Note Logger */}
      <h2>Log something</h2>
      <div className="card" style={{ padding: '16px' }}>
        <p style={{ color: 'var(--mu)', fontSize: '12px', marginBottom: '12px' }}>
          Speak any maintenance, setup, string change, or parts swap. AI automatically logs it.
        </p>

        {isRecording ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#161616',
              border: '1px solid var(--ac)',
              borderRadius: '12px',
              padding: '12px 16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: '#ef4444',
                  animation: 'pulse 1s infinite',
                }}
              />
              <span style={{ fontSize: '13px', fontWeight: 800 }}>
                Listening ({recordingSeconds}s / 15s)...
              </span>
            </div>
            <button
              type="button"
              onClick={stopRecording}
              style={{
                background: 'var(--ac)',
                color: '#000',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 800,
              }}
            >
              Done
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              type="button"
              onClick={startRecording}
              disabled={isProcessingLog}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '10px',
                border: '1px dashed var(--ac)',
                color: 'var(--ac)',
                fontSize: '13px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: 'rgba(34,197,94,0.06)',
              }}
            >
              <span style={{ fontSize: '16px' }}>🎙️</span>
              <span>{isProcessingLog ? 'AI processing audio...' : 'Tap to Record Voice Memo'}</span>
            </button>

            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <input
                value={logText}
                onChange={(e) => setLogText(e.target.value)}
                placeholder="Or type a note (e.g. Changed strings to 10-46)..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTextSubmit();
                }}
                disabled={isProcessingLog}
                style={{
                  flex: 1,
                  background: '#0a0a0a',
                  border: '1px solid var(--ln)',
                  color: 'var(--tx)',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                }}
              />
              <button
                type="button"
                onClick={handleTextSubmit}
                disabled={isProcessingLog || !logText.trim()}
                style={{
                  background: 'var(--sf)',
                  border: '1px solid var(--ln)',
                  padding: '0 16px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                Save
              </button>
            </div>
          </div>
        )}

        {error && (
          <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '10px', fontWeight: 600 }}>
            {error}
          </p>
        )}
      </div>

      {/* Specs Sheet Overview */}
      {(item.current_strings || item.pickups_summary || item.modifications_summary || item.serial_number) && (
        <>
          <h2>Specs & Mods</h2>
          <div className="card" style={{ padding: '14px' }}>
            {item.current_strings && (
              <div className="row">
                <span style={{ color: 'var(--mu)' }}>Strings</span>
                <b>{item.current_strings}</b>
              </div>
            )}
            {item.pickups_summary && (
              <div className="row">
                <span style={{ color: 'var(--mu)' }}>Pickups</span>
                <b>{item.pickups_summary}</b>
              </div>
            )}
            {item.modifications_summary && (
              <div className="row">
                <span style={{ color: 'var(--mu)' }}>Mods</span>
                <b>{item.modifications_summary}</b>
              </div>
            )}
            {item.serial_number && (
              <div className="row">
                <span style={{ color: 'var(--mu)' }}>Serial</span>
                <b>{item.serial_number}</b>
              </div>
            )}
          </div>
        </>
      )}

      {/* History Timeline */}
      <h2>History</h2>
      {logs.length === 0 ? (
        <p className="sub">Nothing logged yet.</p>
      ) : (
        <div className="tl">
          {logs.map((log) => (
            <div key={log.id}>
              <b>
                {log.title}
                <span className="ltag">{log.event_type}</span>
              </b>
              <small>
                {new Date(log.event_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                {log.description ? ` · ${log.description}` : ''}
              </small>
            </div>
          ))}
        </div>
      )}

      {/* In the News */}
      {news.length > 0 && (
        <>
          <h2>In the news</h2>
          {news.map((n) => (
            <a
              key={n.id}
              href={n.url}
              target="_blank"
              rel="noopener nofollow"
              className="nrow"
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div className="ph" style={{ width: 44, height: 44, minWidth: 44, fontSize: '10px' }}>
                ▨
              </div>
              <span style={{ flex: 1, minWidth: 0, fontWeight: 700 }}>
                {n.headline || n.title}
              </span>
            </a>
          ))}
        </>
      )}
    </>
  );
}
