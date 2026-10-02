'use client';

import { useState, useEffect, useRef, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface RigItem {
  id: number;
  raw_text: string;
  brand: string | null;
  model: string | null;
  category: string;
  kind: 'own' | 'want';
  serial_number: string | null;
  purchase_date: string | null;
  purchase_price: string | null;
  condition: string | null;
  year_manufacture: string | null;
  current_strings: string | null;
  last_restrung_at: string | null;
  pickups_summary: string | null;
  modifications_summary: string | null;
  valves_summary: string | null;
  last_valves_changed_at: string | null;
  last_serviced_at: string | null;
  notes: string | null;
  nickname: string | null;
  color: string | null;
  specs: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface RigItemLog {
  id: number;
  rig_item_id: number;
  event_type: 'string_change' | 'modification' | 'maintenance' | 'repair' | 'valve_change' | 'setup' | 'note' | 'general';
  title: string;
  description: string | null;
  component: string | null;
  original_part: string | null;
  metadata: Record<string, unknown>;
  logged_via: 'manual' | 'audio' | 'text_prompt';
  audio_transcript: string | null;
  event_date: string;
  created_at: string;
}

function getRelativeTimeString(dateStr: string | null): { text: string; alertLevel: 'ok' | 'warn' | 'due' | 'none' } {
  if (!dateStr) return { text: 'Not recorded', alertLevel: 'none' };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { text: dateStr, alertLevel: 'none' };

  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { text: 'Upcoming', alertLevel: 'ok' };
  if (diffDays === 0) return { text: 'Today', alertLevel: 'ok' };
  if (diffDays === 1) return { text: 'Yesterday', alertLevel: 'ok' };
  if (diffDays < 30) return { text: `${diffDays} days ago`, alertLevel: 'ok' };

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 3) return { text: `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`, alertLevel: 'ok' };
  if (diffMonths < 6) return { text: `${diffMonths} months ago`, alertLevel: 'warn' };
  return { text: `${diffMonths} months ago (Restring due!)`, alertLevel: 'due' };
}

export default function GearDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const itemId = resolvedParams.id;

  const [item, setItem] = useState<RigItem | null>(null);
  const [logs, setLogs] = useState<RigItemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Quick Log State (Voice or Text)
  const [logText, setLogText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isProcessingLog, setIsProcessingLog] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Edit Mode for Specs Form
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<RigItem>>({});
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    async function loadItem() {
      try {
        const res = await fetch(`/api/rig/${itemId}`);
        if (!res.ok) {
          if (res.status === 404) throw new Error('Gear item not found');
          throw new Error('Failed to load gear item');
        }
        const data = await res.json();
        if (!isCancelled) {
          setItem(data.item);
          setLogs(data.logs || []);
          setEditForm(data.item);
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load gear');
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    loadItem();
    return () => {
      isCancelled = true;
    };
  }, [itemId]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  // Voice recording handlers (15 seconds max limit)
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
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
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
    } catch (err) {
      console.error('Microphone error:', err);
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
          body: JSON.stringify({
            audioBase64: base64Audio,
            audioMimeType: mimeType,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to process audio note');

        if (data.log) setLogs((prev) => [data.log, ...prev]);
        if (data.item) {
          setItem(data.item);
          setEditForm(data.item);
        }
        showToast(`Logged: "${data.log.title}"`);
        setIsProcessingLog(false);
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process audio note');
      setIsProcessingLog(false);
    }
  }

  async function handleTextSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!logText.trim()) return;

    setIsProcessingLog(true);
    setError(null);
    try {
      const res = await fetch(`/api/rig/${itemId}/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: logText.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to parse log');

      if (data.log) setLogs((prev) => [data.log, ...prev]);
      if (data.item) {
        setItem(data.item);
        setEditForm(data.item);
      }
      setLogText('');
      showToast(`Logged: "${data.log.title}"`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit log');
    } finally {
      setIsProcessingLog(false);
    }
  }

  // Direct Inline Field Editing
  const [inlineEditingField, setInlineEditingField] = useState<string | null>(null);
  const [inlineFieldValue, setInlineFieldValue] = useState<string>('');
  const [isSavingInline, setIsSavingInline] = useState(false);

  function startInlineEdit(field: string, initialValue: string | null | undefined) {
    setInlineEditingField(field);
    setInlineFieldValue(initialValue || '');
  }

  async function saveInlineField(field: string, value: string) {
    setIsSavingInline(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        [field]: value.trim() ? value.trim() : null,
      };

      const res = await fetch(`/api/rig/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update');

      setItem(data.item);
      setEditForm(data.item);
      setInlineEditingField(null);
      showToast('Updated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSavingInline(false);
    }
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    setIsSavingEdit(true);
    setError(null);
    try {
      const res = await fetch(`/api/rig/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save edits');

      setItem(data.item);
      setIsEditing(false);
      showToast('Gear specs updated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function handleDeleteLog(logId: number) {
    try {
      const res = await fetch(`/api/rig/${itemId}/log?logId=${logId}`, { method: 'DELETE' });
      if (res.ok) {
        setLogs(logs.filter((l) => l.id !== logId));
        showToast('Log entry removed');
      }
    } catch (err) {
      console.error('Delete log failed:', err);
    }
  }

  async function handleDeleteItem() {
    if (!confirm(`Are you sure you want to remove ${item?.brand || ''} ${item?.model || 'this item'} from your rig?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/rig/${itemId}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/rig');
      }
    } catch (err) {
      console.error('Delete item failed:', err);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 p-8 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span>Loading gear details...</span>
        </div>
      </main>
    );
  }

  if (!item) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 p-8">
        <div className="max-w-2xl mx-auto space-y-4">
          <p className="text-red-400">{error || 'Gear item not found.'}</p>
          <Link href="/rig" className="text-cyan-400 hover:underline text-sm">
            ← Back to Rig
          </Link>
        </div>
      </main>
    );
  }

  const stringRel = getRelativeTimeString(item.last_restrung_at);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 font-sans">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-950 border border-emerald-500 text-emerald-200 px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-sm animate-fade-in">
          <span>✓</span>
          <span>{toast}</span>
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/rig"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-cyan-400 transition"
          >
            <span>←</span> Back to Rig List
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="text-xs bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 px-3 py-1.5 rounded-lg transition"
            >
              {isEditing ? 'Cancel Edit' : 'Edit Specs'}
            </button>
            <button
              onClick={handleDeleteItem}
              className="text-xs text-red-400 hover:text-red-300 bg-red-950/40 hover:bg-red-950/70 border border-red-900/60 px-3 py-1.5 rounded-lg transition"
            >
              Delete Gear
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-red-950/60 border border-red-800 rounded-xl text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Gear Title Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-2xl">
                  {item.category === 'guitar' ? '🎸' : item.category === 'bass' ? '🎸' : item.category === 'amp' ? '🔊' : '🎛️'}
                </span>
                <span className="bg-cyan-950/70 border border-cyan-800 text-cyan-300 px-2.5 py-0.5 rounded-full text-[11px] font-mono uppercase tracking-wider">
                  {item.category}
                </span>
                {item.condition && (
                  <span className="bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full text-[11px] font-mono">
                    {item.condition}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {item.brand ? <span className="text-cyan-400 mr-2">{item.brand}</span> : null}
                {item.model || item.raw_text}
              </h1>

              {item.nickname && (
                <p className="text-sm text-slate-400 italic">
                  &ldquo;{item.nickname}&rdquo; {item.color ? `· ${item.color}` : ''}
                </p>
              )}
            </div>

            {/* String Maintenance Alert Badge */}
            {item.category === 'guitar' || item.category === 'bass' ? (
              <div
                className={`p-3.5 rounded-xl border flex items-center gap-3 text-xs ${
                  stringRel.alertLevel === 'due'
                    ? 'bg-amber-950/60 border-amber-600 text-amber-200'
                    : stringRel.alertLevel === 'warn'
                    ? 'bg-amber-950/30 border-amber-800/60 text-amber-300'
                    : 'bg-slate-950 border-slate-800 text-slate-300'
                }`}
              >
                <div className="text-lg">
                  {stringRel.alertLevel === 'due' ? '⚠️' : '🧵'}
                </div>
                <div>
                  <div className="font-semibold text-slate-200">
                    {item.current_strings || 'Strings not set'}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Restrung: {stringRel.text}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Edit Specs Form Drawer */}
        {isEditing && (
          <div className="bg-slate-900 border border-cyan-800/60 rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider">
              Edit Gear Specifications
            </h2>
            <form onSubmit={handleSaveEdit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Brand</label>
                <input
                  type="text"
                  value={editForm.brand || ''}
                  onChange={(e) => setEditForm({ ...editForm, brand: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Model</label>
                <input
                  type="text"
                  value={editForm.model || ''}
                  onChange={(e) => setEditForm({ ...editForm, model: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Serial Number</label>
                <input
                  type="text"
                  placeholder="e.g. ABCD12345"
                  value={editForm.serial_number || ''}
                  onChange={(e) => setEditForm({ ...editForm, serial_number: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Purchase Date</label>
                <input
                  type="text"
                  placeholder="e.g. August 2017"
                  value={editForm.purchase_date || ''}
                  onChange={(e) => setEditForm({ ...editForm, purchase_date: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Current Strings</label>
                <input
                  type="text"
                  placeholder="e.g. Elixir 9-42s"
                  value={editForm.current_strings || ''}
                  onChange={(e) => setEditForm({ ...editForm, current_strings: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Last Restrung Date (YYYY-MM-DD)</label>
                <input
                  type="date"
                  value={editForm.last_restrung_at ? editForm.last_restrung_at.split('T')[0] : ''}
                  onChange={(e) => setEditForm({ ...editForm, last_restrung_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-slate-400 mb-1">Pickups / Hardware</label>
                <input
                  type="text"
                  placeholder="e.g. Stock neck, Lavarack custom 9k bridge (original HFS in case)"
                  value={editForm.pickups_summary || ''}
                  onChange={(e) => setEditForm({ ...editForm, pickups_summary: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-slate-400 mb-1">Modifications & Circuit Tweaks</label>
                <input
                  type="text"
                  placeholder="e.g. R2 resistor swapped for 280k, treble bleed added"
                  value={editForm.modifications_summary || ''}
                  onChange={(e) => setEditForm({ ...editForm, modifications_summary: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200"
                />
              </div>
              <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold rounded-lg"
                >
                  {isSavingEdit ? 'Saving...' : 'Save Specifications'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Quick Specs Overview Grid (with Direct Inline Click-to-Edit) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Serial Number */}
          <div
            onClick={() => {
              if (inlineEditingField !== 'serial_number') {
                startInlineEdit('serial_number', item.serial_number);
              }
            }}
            className="bg-slate-900 hover:bg-slate-900/90 border border-slate-800/80 hover:border-cyan-800/60 rounded-xl p-4 transition cursor-pointer relative group"
          >
            <div className="flex items-center justify-between">
              <div className="text-[11px] uppercase tracking-wider text-slate-500 font-mono">Serial No.</div>
              <span className="text-[10px] text-slate-500 opacity-0 group-hover:opacity-100 transition">✏️ Edit</span>
            </div>
            {inlineEditingField === 'serial_number' ? (
              <div className="mt-1.5 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  autoFocus
                  value={inlineFieldValue}
                  onChange={(e) => setInlineFieldValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveInlineField('serial_number', inlineFieldValue);
                    if (e.key === 'Escape') setInlineEditingField(null);
                  }}
                  className="w-full bg-slate-950 border border-cyan-500 rounded px-2 py-1 text-xs text-white font-mono"
                />
                <button
                  type="button"
                  disabled={isSavingInline}
                  onClick={() => saveInlineField('serial_number', inlineFieldValue)}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white px-2 py-1 rounded text-xs"
                >
                  ✓
                </button>
                <button
                  type="button"
                  onClick={() => setInlineEditingField(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded text-xs"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="text-sm font-semibold text-slate-200 mt-1 font-mono">
                {item.serial_number || <span className="text-slate-600 font-normal">Add Serial...</span>}
              </div>
            )}
          </div>

          {/* Purchased Date */}
          <div
            onClick={() => {
              if (inlineEditingField !== 'purchase_date') {
                startInlineEdit('purchase_date', item.purchase_date);
              }
            }}
            className="bg-slate-900 hover:bg-slate-900/90 border border-slate-800/80 hover:border-cyan-800/60 rounded-xl p-4 transition cursor-pointer relative group"
          >
            <div className="flex items-center justify-between">
              <div className="text-[11px] uppercase tracking-wider text-slate-500 font-mono">Purchased</div>
              <span className="text-[10px] text-slate-500 opacity-0 group-hover:opacity-100 transition">✏️ Edit</span>
            </div>
            {inlineEditingField === 'purchase_date' ? (
              <div className="mt-1.5 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  autoFocus
                  placeholder="e.g. August 2017"
                  value={inlineFieldValue}
                  onChange={(e) => setInlineFieldValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveInlineField('purchase_date', inlineFieldValue);
                    if (e.key === 'Escape') setInlineEditingField(null);
                  }}
                  className="w-full bg-slate-950 border border-cyan-500 rounded px-2 py-1 text-xs text-white"
                />
                <button
                  type="button"
                  disabled={isSavingInline}
                  onClick={() => saveInlineField('purchase_date', inlineFieldValue)}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white px-2 py-1 rounded text-xs"
                >
                  ✓
                </button>
                <button
                  type="button"
                  onClick={() => setInlineEditingField(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded text-xs"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="text-sm font-semibold text-slate-200 mt-1">
                {item.purchase_date || <span className="text-slate-600 font-normal">Add Date...</span>}
              </div>
            )}
          </div>

          {/* Strings / Gauge */}
          <div
            onClick={() => {
              if (inlineEditingField !== 'current_strings') {
                startInlineEdit('current_strings', item.current_strings);
              }
            }}
            className="bg-slate-900 hover:bg-slate-900/90 border border-slate-800/80 hover:border-cyan-800/60 rounded-xl p-4 transition cursor-pointer relative group"
          >
            <div className="flex items-center justify-between">
              <div className="text-[11px] uppercase tracking-wider text-slate-500 font-mono">Strings / Gauge</div>
              <span className="text-[10px] text-slate-500 opacity-0 group-hover:opacity-100 transition">✏️ Edit</span>
            </div>
            {inlineEditingField === 'current_strings' ? (
              <div className="mt-1.5 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  autoFocus
                  placeholder="e.g. Elixir 9-42"
                  value={inlineFieldValue}
                  onChange={(e) => setInlineFieldValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveInlineField('current_strings', inlineFieldValue);
                    if (e.key === 'Escape') setInlineEditingField(null);
                  }}
                  className="w-full bg-slate-950 border border-cyan-500 rounded px-2 py-1 text-xs text-white"
                />
                <button
                  type="button"
                  disabled={isSavingInline}
                  onClick={() => saveInlineField('current_strings', inlineFieldValue)}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white px-2 py-1 rounded text-xs"
                >
                  ✓
                </button>
                <button
                  type="button"
                  onClick={() => setInlineEditingField(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded text-xs"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="text-sm font-semibold text-slate-200 mt-1">
                {item.current_strings || <span className="text-slate-600 font-normal">Add Strings...</span>}
              </div>
            )}
          </div>

          {/* Last Restrung Date */}
          <div
            onClick={() => {
              if (inlineEditingField !== 'last_restrung_at') {
                startInlineEdit(
                  'last_restrung_at',
                  item.last_restrung_at ? item.last_restrung_at.split('T')[0] : ''
                );
              }
            }}
            className="bg-slate-900 hover:bg-slate-900/90 border border-slate-800/80 hover:border-cyan-800/60 rounded-xl p-4 transition cursor-pointer relative group"
          >
            <div className="flex items-center justify-between">
              <div className="text-[11px] uppercase tracking-wider text-slate-500 font-mono">Last Restrung</div>
              <span className="text-[10px] text-slate-500 opacity-0 group-hover:opacity-100 transition">✏️ Edit</span>
            </div>
            {inlineEditingField === 'last_restrung_at' ? (
              <div className="mt-1.5 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                <input
                  type="date"
                  autoFocus
                  value={inlineFieldValue}
                  onChange={(e) => setInlineFieldValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      saveInlineField(
                        'last_restrung_at',
                        inlineFieldValue ? new Date(inlineFieldValue).toISOString() : ''
                      );
                    }
                    if (e.key === 'Escape') setInlineEditingField(null);
                  }}
                  className="w-full bg-slate-950 border border-cyan-500 rounded px-2 py-1 text-xs text-white"
                />
                <button
                  type="button"
                  disabled={isSavingInline}
                  onClick={() =>
                    saveInlineField(
                      'last_restrung_at',
                      inlineFieldValue ? new Date(inlineFieldValue).toISOString() : ''
                    )
                  }
                  className="bg-cyan-600 hover:bg-cyan-500 text-white px-2 py-1 rounded text-xs"
                >
                  ✓
                </button>
                <button
                  type="button"
                  onClick={() => setInlineEditingField(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded text-xs"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="text-sm font-semibold text-slate-200 mt-1">
                {stringRel.text}
              </div>
            )}
          </div>
        </div>

        {/* Hardware & Modifications Highlights (with Click-to-Edit on every card) */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-white uppercase tracking-wider">
              Hardware & Modifications
            </h2>
            <span className="text-[10px] text-cyan-400 font-mono">Click card to edit text</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Pickups Card */}
            <div
              onClick={() => {
                if (inlineEditingField !== 'pickups_summary') {
                  startInlineEdit('pickups_summary', item.pickups_summary);
                }
              }}
              className="p-3.5 bg-slate-950 hover:bg-slate-950/90 border border-slate-800/70 hover:border-cyan-700/60 rounded-lg transition cursor-pointer relative group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-cyan-400 font-semibold">Pickups / Electronics</span>
                <span className="text-[10px] text-slate-500 opacity-0 group-hover:opacity-100 transition">✏️ Edit</span>
              </div>
              {inlineEditingField === 'pickups_summary' ? (
                <div className="space-y-2 pt-1" onClick={(e) => e.stopPropagation()}>
                  <textarea
                    rows={3}
                    autoFocus
                    value={inlineFieldValue}
                    onChange={(e) => setInlineFieldValue(e.target.value)}
                    placeholder="e.g. Lavarack Custom bridge (~9.8k, Jackson J90 style), stock neck"
                    className="w-full bg-slate-900 border border-cyan-500 rounded p-2 text-xs text-slate-200 focus:outline-none"
                  />
                  <div className="flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setInlineEditingField(null)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isSavingInline}
                      onClick={() => saveInlineField('pickups_summary', inlineFieldValue)}
                      className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-medium text-xs"
                    >
                      {isSavingInline ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-slate-300 leading-relaxed">
                  {item.pickups_summary || (
                    <span className="text-slate-600 italic">No pickups noted yet. Click to add.</span>
                  )}
                </p>
              )}
            </div>

            {/* Modifications Card */}
            <div
              onClick={() => {
                if (inlineEditingField !== 'modifications_summary') {
                  startInlineEdit('modifications_summary', item.modifications_summary);
                }
              }}
              className="p-3.5 bg-slate-950 hover:bg-slate-950/90 border border-slate-800/70 hover:border-amber-700/60 rounded-lg transition cursor-pointer relative group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-amber-400 font-semibold">Modifications & Circuit</span>
                <span className="text-[10px] text-slate-500 opacity-0 group-hover:opacity-100 transition">✏️ Edit</span>
              </div>
              {inlineEditingField === 'modifications_summary' ? (
                <div className="space-y-2 pt-1" onClick={(e) => e.stopPropagation()}>
                  <textarea
                    rows={3}
                    autoFocus
                    value={inlineFieldValue}
                    onChange={(e) => setInlineFieldValue(e.target.value)}
                    placeholder="e.g. Replaced bridge pickup with Lavarack Custom humbucker; R2 resistor swapped for 280k"
                    className="w-full bg-slate-900 border border-amber-500 rounded p-2 text-xs text-slate-200 focus:outline-none"
                  />
                  <div className="flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setInlineEditingField(null)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isSavingInline}
                      onClick={() => saveInlineField('modifications_summary', inlineFieldValue)}
                      className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded font-medium text-xs"
                    >
                      {isSavingInline ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-slate-300 leading-relaxed">
                  {item.modifications_summary || (
                    <span className="text-slate-600 italic">No modifications noted. Click to add.</span>
                  )}
                </p>
              )}
            </div>

            {/* Valves / Tubes Card (Amps or on demand) */}
            {(item.category === 'amp' || item.valves_summary) && (
              <div
                onClick={() => {
                  if (inlineEditingField !== 'valves_summary') {
                    startInlineEdit('valves_summary', item.valves_summary);
                  }
                }}
                className="p-3.5 bg-slate-950 hover:bg-slate-950/90 border border-slate-800/70 hover:border-purple-700/60 rounded-lg transition cursor-pointer relative group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-purple-400 font-semibold">Valves / Tubes</span>
                  <span className="text-[10px] text-slate-500 opacity-0 group-hover:opacity-100 transition">✏️ Edit</span>
                </div>
                {inlineEditingField === 'valves_summary' ? (
                  <div className="space-y-2 pt-1" onClick={(e) => e.stopPropagation()}>
                    <textarea
                      rows={2}
                      autoFocus
                      value={inlineFieldValue}
                      onChange={(e) => setInlineFieldValue(e.target.value)}
                      placeholder="e.g. JJ EL34 power tubes fitted, bias set at 36mA"
                      className="w-full bg-slate-900 border border-purple-500 rounded p-2 text-xs text-slate-200 focus:outline-none"
                    />
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setInlineEditingField(null)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={isSavingInline}
                        onClick={() => saveInlineField('valves_summary', inlineFieldValue)}
                        className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded font-medium text-xs"
                      >
                        {isSavingInline ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-300 leading-relaxed">
                    {item.valves_summary || (
                      <span className="text-slate-600 italic">No tube details logged. Click to add.</span>
                    )}
                  </p>
                )}
              </div>
            )}

            {/* General Notes Card */}
            {(item.notes || inlineEditingField === 'notes') && (
              <div
                onClick={() => {
                  if (inlineEditingField !== 'notes') {
                    startInlineEdit('notes', item.notes);
                  }
                }}
                className="p-3.5 bg-slate-950 hover:bg-slate-950/90 border border-slate-800/70 hover:border-slate-700 rounded-lg transition cursor-pointer relative group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-slate-400 font-semibold">Notes</span>
                  <span className="text-[10px] text-slate-500 opacity-0 group-hover:opacity-100 transition">✏️ Edit</span>
                </div>
                {inlineEditingField === 'notes' ? (
                  <div className="space-y-2 pt-1" onClick={(e) => e.stopPropagation()}>
                    <textarea
                      rows={2}
                      autoFocus
                      value={inlineFieldValue}
                      onChange={(e) => setInlineFieldValue(e.target.value)}
                      placeholder="e.g. Action setup at 1.5mm, 10-way switch mod"
                      className="w-full bg-slate-900 border border-slate-500 rounded p-2 text-xs text-slate-200 focus:outline-none"
                    />
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setInlineEditingField(null)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={isSavingInline}
                        onClick={() => saveInlineField('notes', inlineFieldValue)}
                        className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded font-medium text-xs"
                      >
                        {isSavingInline ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-300 leading-relaxed">{item.notes}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Voice & Quick Log Section */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/30 border border-cyan-900/50 rounded-2xl p-6 sm:p-7 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>🎙️</span> Voice & Quick Log
              </h2>
              <p className="text-xs text-slate-400">
                Speak or type updates (e.g. &ldquo;Just restrung with Elixir 9-46s on Monday&rdquo; or &ldquo;Swapped R2 resistor for 280k&rdquo;)
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Audio Record Button (15s limit) */}
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessingLog}
              className={`flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl font-semibold text-xs transition shadow-lg cursor-pointer ${
                isRecording
                  ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse'
                  : 'bg-cyan-600 hover:bg-cyan-500 text-white'
              }`}
            >
              <span className="text-sm">{isRecording ? '⏹' : '🎤'}</span>
              <span>
                {isRecording
                  ? `Recording... (${recordingSeconds}s / 15s - Tap to Stop)`
                  : 'Record Audio Note'}
              </span>
            </button>

            {/* Text Input Log */}
            <form onSubmit={handleTextSubmit} className="flex-1 flex gap-2">
              <input
                type="text"
                value={logText}
                onChange={(e) => setLogText(e.target.value)}
                placeholder="Or type update: 'Restrung with Elixir 9-42s'..."
                disabled={isRecording || isProcessingLog}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
              />
              <button
                type="submit"
                disabled={!logText.trim() || isProcessingLog}
                className="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-medium text-xs px-4 py-3 rounded-xl transition"
              >
                {isProcessingLog ? 'Processing...' : 'Log'}
              </button>
            </form>
          </div>

          {isProcessingLog && (
            <div className="flex items-center gap-2 text-xs text-cyan-400 pt-1 animate-pulse">
              <div className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <span>AI is analyzing your note, updating specs, and logging the event...</span>
            </div>
          )}
        </div>

        {/* Maintenance & Modification Event History Feed */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
              <span>📋</span> Maintenance & Modification History ({logs.length})
            </h2>
          </div>

          {logs.length === 0 ? (
            <div className="py-8 text-center space-y-1">
              <p className="text-xs text-slate-400 italic">No events or modifications logged yet.</p>
              <p className="text-[11px] text-slate-500">Record a voice memo or enter a note above to track your string changes, repairs, and mods.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 text-xs space-y-2 relative group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                            log.event_type === 'string_change'
                              ? 'bg-emerald-950/70 border border-emerald-800 text-emerald-300'
                              : log.event_type === 'modification'
                              ? 'bg-amber-950/70 border border-amber-800 text-amber-300'
                              : log.event_type === 'valve_change'
                              ? 'bg-purple-950/70 border border-purple-800 text-purple-300'
                              : 'bg-slate-900 border border-slate-800 text-slate-300'
                          }`}
                        >
                          {log.event_type.replace('_', ' ')}
                        </span>
                        <h3 className="font-semibold text-slate-200">{log.title}</h3>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {log.event_date}
                        </span>
                      </div>

                      {log.description && log.description !== log.title && (
                        <p className="text-slate-300 leading-relaxed">{log.description}</p>
                      )}

                      {log.audio_transcript && (
                        <p className="text-[11px] text-slate-400 italic bg-slate-900/60 rounded px-2.5 py-1.5 border border-slate-800/50">
                          &ldquo;{log.audio_transcript}&rdquo;
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                        {log.component && (
                          <span className="bg-slate-900 text-cyan-300 px-2 py-0.5 rounded">
                            Component: {log.component}
                          </span>
                        )}
                        {log.original_part && (
                          <span className="bg-slate-900 text-amber-300 px-2 py-0.5 rounded">
                            📦 Retained Part: {log.original_part}
                          </span>
                        )}
                        <span className="text-slate-500 text-[10px]">
                          via {log.logged_via === 'audio' ? '🎙️ voice' : log.logged_via === 'text_prompt' ? '⚡ AI text' : '✍️ manual'}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteLog(log.id)}
                      className="text-slate-600 hover:text-red-400 p-1 transition opacity-0 group-hover:opacity-100"
                      title="Delete entry"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
