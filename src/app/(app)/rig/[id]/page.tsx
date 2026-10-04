'use client';

import { use, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { BackButton } from '@/components/BackButton';
import { GearHeroPhoto } from '@/components/GearHeroPhoto';
import {
  GUITAR_TUNINGS,
  BASS_TUNINGS,
  GUITAR_STRING_GAUGES,
  BASS_STRING_GAUGES,
  STRING_MANUFACTURERS,
  PICKUP_MANUFACTURERS,
  detectSettingsProvider,
  getBackdropForCategory,
  autocompleteDate,
  resolveStringSpecs,
  type DetectedProvider,
} from '@/lib/gear-specs';

interface GearSetupSnapshot {
  savedAt: number;
  monthYear: string;
  tuning?: string;
  stringGauge?: string;
  stringManufacturer?: string;
  numberOfStrings?: number;
  pickupBridge?: string;
  pickupMiddle?: string;
  pickupNeck?: string;
  ampSettings?: string;
  settingsFileUrl?: string;
  nickname?: string;
  notes?: string;
}

interface RigItem {
  id: number;
  raw_text: string;
  brand: string | null;
  model: string | null;
  category: string;
  nickname?: string | null;
  image_url?: string | null;
  serial_number?: string | null;
  purchase_date?: string | null;
  purchase_price?: string | null;
  condition?: string | null;
  year_manufacture?: string | null;
  color?: string | null;
  notes?: string | null;
  room?: string | null;
  current_strings?: string | null;
  last_restrung_at?: string | null;
  number_of_strings?: number | null;
  tuning?: string | null;
  string_gauge?: string | null;
  string_manufacturer?: string | null;
  pickup_bridge?: string | null;
  pickup_middle?: string | null;
  pickup_neck?: string | null;
  pickups_summary?: string | null;
  modifications_summary?: string | null;
  valves_summary?: string | null;
  last_valves_changed_at?: string | null;
  amp_settings?: string | null;
  settings_file_url?: string | null;
  drum_head_details?: string | null;
  drum_head_tension?: string | null;
  drum_head_change_date?: string | null;
  drum_body?: string | null;
  drum_mods_muffles?: string | null;
  drum_pieces?: Array<{ id: string; pieceType?: string; headDetails?: string; headTension?: string; headChangeDate?: string; body?: string; modsMuffles?: string }>;
  cymbal_pieces?: Array<{ id: string; cymbalType?: string; brandModel?: string; diameter?: string; changeDate?: string; notes?: string }>;
  snapshots?: GearSetupSnapshot[];
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
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Quick Log State (Voice or Text)
  const [logText, setLogText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isProcessingLog, setIsProcessingLog] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Spec Editing States
  const [isEditingSpecs, setIsEditingSpecs] = useState(false);
  const [isSavingSpecs, setIsSavingSpecs] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showSnapshotModal, setShowSnapshotModal] = useState(false);
  const [activeSnapshot, setActiveSnapshot] = useState<GearSetupSnapshot | null>(null);

  // Form State for quick spec editing
  const [tuningVal, setTuningVal] = useState('');
  const [gaugeVal, setGaugeVal] = useState('');
  const [stringsBrandVal, setStringsBrandVal] = useState('');
  const [stringsCountVal, setStringsCountVal] = useState<number | ''>('');
  const [pickupBridgeVal, setPickupBridgeVal] = useState('');
  const [pickupMiddleVal, setPickupMiddleVal] = useState('');
  const [pickupNeckVal, setPickupNeckVal] = useState('');
  const [ampSettingsVal, setAmpSettingsVal] = useState('');
  const [presetUrlVal, setPresetUrlVal] = useState('');
  const [notesVal, setNotesVal] = useState('');
  const [nicknameVal, setNicknameVal] = useState('');

  // Settings Modal fields
  const [editBrand, setEditBrand] = useState('');
  const [editModel, setEditModel] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editSerial, setEditSerial] = useState('');
  const [editYear, setEditYear] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editPurchasePrice, setEditPurchasePrice] = useState('');
  const [editPurchaseDate, setEditPurchaseDate] = useState('');

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
          const it = data.item as RigItem;
          setItem(it);
          setLogs(data.logs || []);
          if (data.matchingNews) setNews(data.matchingNews);

          // Sync local form state
          const resolved = resolveStringSpecs(it.string_gauge, it.string_manufacturer, it.current_strings);
          setTuningVal(it.tuning || '');
          setGaugeVal(it.string_gauge || resolved.normalizedGauge || resolved.gauge || '');
          setStringsBrandVal(it.string_manufacturer || resolved.manufacturer || '');
          setStringsCountVal(it.number_of_strings ?? '');
          setPickupBridgeVal(it.pickup_bridge || '');
          setPickupMiddleVal(it.pickup_middle || '');
          setPickupNeckVal(it.pickup_neck || '');
          setAmpSettingsVal(it.amp_settings || '');
          setPresetUrlVal(it.settings_file_url || '');
          setNotesVal(it.notes || '');
          setNicknameVal(it.nickname || '');

          setEditBrand(it.brand || '');
          setEditModel(it.model || '');
          setEditCategory(it.category || 'guitar');
          setEditSerial(it.serial_number || '');
          setEditYear(it.year_manufacture || '');
          setEditColor(it.color || '');
          setEditPurchasePrice(it.purchase_price || '');
          setEditPurchaseDate(it.purchase_date || '');
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

  async function updateGear(fields: Partial<RigItem>) {
    try {
      const res = await fetch(`/api/rig/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });
      const data = await res.json();
      if (res.ok && data.item) {
        setItem(data.item);
        setSaveSuccessMsg('Saved successfully!');
        setTimeout(() => setSaveSuccessMsg(null), 3000);
        return true;
      } else {
        setError(data.error || 'Failed to update item');
      }
    } catch {
      setError('Network error saving changes');
    }
    return false;
  }

  async function handleSaveSpecs() {
    setIsSavingSpecs(true);
    setError(null);
    await updateGear({
      tuning: tuningVal || null,
      string_gauge: gaugeVal || null,
      string_manufacturer: stringsBrandVal || null,
      number_of_strings: stringsCountVal || null,
      pickup_bridge: pickupBridgeVal || null,
      pickup_middle: pickupMiddleVal || null,
      pickup_neck: pickupNeckVal || null,
      amp_settings: ampSettingsVal || null,
      settings_file_url: presetUrlVal || null,
      notes: notesVal || null,
      nickname: nicknameVal || null,
    });
    setIsSavingSpecs(false);
    setIsEditingSpecs(false);
  }

  function openSettingsModal() {
    if (item) {
      setNicknameVal(item.nickname || '');
      setEditBrand(item.brand || '');
      setEditModel(item.model || '');
      setEditCategory(item.category || 'guitar');
      setEditSerial(item.serial_number || '');
      setEditYear(item.year_manufacture || '');
      setEditColor(item.color || '');
      setEditPurchasePrice(item.purchase_price || '');
      setEditPurchaseDate(item.purchase_date || '');
    }
    setShowSettingsModal(true);
  }

  async function handleSaveSettingsModal(e: React.FormEvent) {
    e.preventDefault();
    setIsSavingSpecs(true);
    await updateGear({
      nickname: nicknameVal || null,
      brand: editBrand || null,
      model: editModel || null,
      category: editCategory || 'guitar',
      serial_number: editSerial || null,
      year_manufacture: editYear || null,
      color: editColor || null,
      purchase_price: editPurchasePrice || null,
      purchase_date: editPurchaseDate || null,
    });
    setIsSavingSpecs(false);
    setShowSettingsModal(false);
  }

  async function handleCreateSnapshot() {
    if (!item) return;
    const now = new Date();
    const monthYear = `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getFullYear()).slice(-2)}`;
    const newSnapshot: GearSetupSnapshot = {
      savedAt: Date.now(),
      monthYear,
      tuning: item.tuning || tuningVal || undefined,
      stringGauge: item.string_gauge || gaugeVal || undefined,
      stringManufacturer: item.string_manufacturer || stringsBrandVal || undefined,
      numberOfStrings: item.number_of_strings || (stringsCountVal ? Number(stringsCountVal) : undefined),
      pickupBridge: item.pickup_bridge || pickupBridgeVal || undefined,
      pickupMiddle: item.pickup_middle || pickupMiddleVal || undefined,
      pickupNeck: item.pickup_neck || pickupNeckVal || undefined,
      ampSettings: item.amp_settings || ampSettingsVal || undefined,
      settingsFileUrl: item.settings_file_url || presetUrlVal || undefined,
      nickname: item.nickname || nicknameVal || undefined,
      notes: item.notes || notesVal || `Saved snapshot on ${now.toLocaleDateString()}`,
    };

    const currentSnapshots = item.snapshots || [];
    const updatedSnapshots = [newSnapshot, ...currentSnapshots];

    // Auto-append snapshot tag into notes for rapid reference
    const noteMarker = `--Snapshot ${monthYear}--`;
    const updatedNotes = item.notes ? `${item.notes} ${noteMarker}` : noteMarker;
    setNotesVal(updatedNotes);

    await updateGear({
      snapshots: updatedSnapshots,
      notes: updatedNotes,
    });
    setSaveSuccessMsg(`Snapshot saved for ${monthYear}!`);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  }

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
          if (data.item) {
            setItem(data.item);
            if (data.item.tuning) setTuningVal(data.item.tuning);
            if (data.item.string_gauge) setGaugeVal(data.item.string_gauge);
            if (data.item.string_manufacturer) setStringsBrandVal(data.item.string_manufacturer);
            if (data.item.nickname) setNicknameVal(data.item.nickname);
          }
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
        if (data.item) {
          setItem(data.item);
          if (data.item.tuning) setTuningVal(data.item.tuning);
          if (data.item.string_gauge) setGaugeVal(data.item.string_gauge);
          if (data.item.string_manufacturer) setStringsBrandVal(data.item.string_manufacturer);
          if (data.item.nickname) setNicknameVal(data.item.nickname);
        }
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
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <p style={{ color: 'var(--mu)', fontSize: '14px' }}>Loading gear details...</p>
      </div>
    );
  }

  if (!item) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <p style={{ color: 'var(--mu)', fontSize: '15px', marginBottom: '14px' }}>
          {error || 'Gear item not found.'}
        </p>
        <Link href="/rig" className="back">
          ‹ Back to Rig room
        </Link>
      </div>
    );
  }

  const categoryLower = (item.category || '').toLowerCase();
  const isGuitar = categoryLower === 'guitar' || categoryLower === 'guitars';
  const isBass = categoryLower === 'bass' || categoryLower === 'basses';
  const isAmp = categoryLower === 'amp' || categoryLower === 'amps' || categoryLower === 'cab';
  const isPedal = categoryLower === 'pedal' || categoryLower === 'pedals' || categoryLower === 'effects' || categoryLower === 'amplifiers-effects';
  const isDrum = categoryLower === 'drums' || categoryLower === 'percussion';
  const stringHealth = getStringHealthText(item.last_restrung_at);

  const backdropSrc = getBackdropForCategory(item.category, item.room);
  const detectedPreset: DetectedProvider | null = item.settings_file_url ? detectSettingsProvider(item.settings_file_url) : null;
  const countKey = typeof stringsCountVal === 'number' ? stringsCountVal : (isBass ? 4 : 6);
  const tuningOptions = isBass ? (BASS_TUNINGS[countKey] || []) : (GUITAR_TUNINGS[countKey] || []);
  const gaugeOptions = isBass ? (BASS_STRING_GAUGES[countKey] || []) : (GUITAR_STRING_GAUGES[countKey] || []);

  return (
    <div style={{ position: 'relative', minHeight: '100vh', paddingBottom: '80px' }}>
      {/* Environmental Studio / Stage Room Backdrop */}
      {backdropSrc && (
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '100vw',
            maxWidth: '1200px',
            height: '700px',
            pointerEvents: 'none',
            zIndex: 0,
            opacity: 0.48,
            overflow: 'hidden',
            maskImage: 'radial-gradient(ellipse at 50% 25%, black 65%, transparent 95%)',
            WebkitMaskImage: 'radial-gradient(ellipse at 50% 25%, black 65%, transparent 95%)',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={backdropSrc}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      )}

      {/* Header Bar */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <BackButton fallbackHref="/rig" label="Rig room" />
        <button
          type="button"
          onClick={openSettingsModal}
          title="Edit gear details"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(20,20,20,0.85)',
            border: '1px solid var(--ln)',
            color: 'var(--tx)',
            padding: '7px 14px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 700,
            backdropFilter: 'blur(8px)',
            cursor: 'pointer',
          }}
        >
          <span>⚙</span> Edit Item
        </button>
      </div>

      {/* 4:3 Hero Photo with Drag & Drop & Stock Fallback */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        <GearHeroPhoto
          itemId={item.id}
          initialImageUrl={item.image_url}
          brand={item.brand}
          model={item.model}
          category={item.category}
          rawText={item.raw_text}
          onImageUpdated={(newUrl) => {
            setItem((prev) => (prev ? { ...prev, image_url: newUrl } : null));
          }}
        />
      </div>

      {/* Title & Nickname Header */}
      <div style={{ position: 'relative', zIndex: 2, marginTop: '20px' }}>
        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span>{item.brand ? `${item.brand} ` : ''}{item.model || item.raw_text}</span>
          {item.nickname ? (
            <span style={{ color: 'var(--ac)' }}>&ldquo;{item.nickname}&rdquo;</span>
          ) : null}
        </h1>
        <p className="sub" style={{ margin: '4px 0 0' }}>
          {item.category || 'Gear'}
          {item.serial_number ? ` · #${item.serial_number}` : ''}
        </p>
      </div>

      {/* Toast Save Message */}
      {saveSuccessMsg && (
        <div
          style={{
            position: 'fixed',
            bottom: '80px',
            right: '24px',
            background: 'var(--ac)',
            color: '#000',
            fontWeight: 800,
            fontSize: '13px',
            padding: '10px 18px',
            borderRadius: '10px',
            boxShadow: '0 4px 18px rgba(0,0,0,0.5)',
            zIndex: 100,
            animation: 'fadeIn 0.2s',
          }}
        >
          ✓ {saveSuccessMsg}
        </div>
      )}

      {/* Status Card */}
      <div className="status" style={{ marginTop: '16px', position: 'relative', zIndex: 2 }}>
        <small>{(isGuitar || isBass) ? 'Last string change' : isAmp ? 'Last valve service' : 'Last log entry'}</small>
        <b style={{ color: stringHealth.warn ? '#f59e0b' : 'var(--tx)' }}>
          {(isGuitar || isBass)
            ? (item.last_restrung_at ? stringHealth.text : '—')
            : isAmp
            ? (item.last_valves_changed_at ? new Date(item.last_valves_changed_at).toLocaleDateString() : '—')
            : logs[0]
            ? `${logs[0].title} · ${logs[0].event_date}`
            : '—'}
        </b>
      </div>

      {/* QUICK AUDIO & NOTE VOICE LOGGER */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        <h2>Log something</h2>
        <div className="card" style={{ padding: '16px' }}>
          <p style={{ color: 'var(--mu)', fontSize: '12px', marginBottom: '12px' }}>
            Speak any maintenance, setup, tuning, or string swap. AI automatically logs it and updates specs.
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
                  placeholder="Or type e.g. Restrung with Ernie Ball 10-46 in Drop D..."
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
      </div>

      {/* DETAILED SPECIFICATIONS & PRESETS SECTION */}
      <div style={{ position: 'relative', zIndex: 2, marginTop: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <h2 style={{ margin: 0 }}>Instrument Specifications</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={handleCreateSnapshot}
              title="Save a timestamped snapshot of current setup"
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--tx)',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid var(--ln)',
                borderRadius: '8px',
                padding: '5px 10px',
                cursor: 'pointer',
              }}
            >
              📸 Save Snapshot
            </button>
            <button
              type="button"
              onClick={() => setIsEditingSpecs(!isEditingSpecs)}
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: isEditingSpecs ? 'var(--ac)' : 'var(--mu)',
                background: 'var(--sf)',
                border: '1px solid var(--ln)',
                borderRadius: '8px',
                padding: '5px 12px',
                cursor: 'pointer',
              }}
            >
              {isEditingSpecs ? 'Cancel' : 'Edit Specs'}
            </button>
          </div>
        </div>

        {/* GUITAR / BASS SPECIFICATIONS PANEL */}
        {(isGuitar || isBass) && (
          <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
            {isEditingSpecs ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: 'var(--mu)', fontWeight: 600 }}>
                    Strings Count
                    <select
                      value={stringsCountVal}
                      onChange={(e) => setStringsCountVal(e.target.value ? parseInt(e.target.value, 10) : '')}
                      style={{ background: '#0a0a0a', border: '1px solid var(--ln)', color: '#fff', padding: '8px 10px', borderRadius: '8px' }}
                    >
                      <option value="">Select strings count...</option>
                      {isBass ? (
                        <>
                          <option value={4}>4 Strings</option>
                          <option value={5}>5 Strings</option>
                          <option value={6}>6 Strings</option>
                        </>
                      ) : (
                        <>
                          <option value={6}>6 Strings</option>
                          <option value={7}>7 Strings</option>
                          <option value={8}>8 Strings</option>
                          <option value={12}>12 Strings</option>
                        </>
                      )}
                    </select>
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: 'var(--mu)', fontWeight: 600 }}>
                    Tuning
                    <select
                      value={tuningVal}
                      onChange={(e) => setTuningVal(e.target.value)}
                      style={{ background: '#0a0a0a', border: '1px solid var(--ln)', color: '#fff', padding: '8px 10px', borderRadius: '8px' }}
                    >
                      <option value="">Select tuning...</option>
                      {tuningOptions.map((t) => (
                        <option key={t.name} value={t.name}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: 'var(--mu)', fontWeight: 600 }}>
                    String Gauge
                    <select
                      value={gaugeVal}
                      onChange={(e) => setGaugeVal(e.target.value)}
                      style={{ background: '#0a0a0a', border: '1px solid var(--ln)', color: '#fff', padding: '8px 10px', borderRadius: '8px' }}
                    >
                      <option value="">Select gauge...</option>
                      {gaugeVal && !gaugeOptions.includes(gaugeVal) && (
                        <option value={gaugeVal}>{gaugeVal}</option>
                      )}
                      {gaugeOptions.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: 'var(--mu)', fontWeight: 600 }}>
                    String Manufacturer
                    <select
                      value={stringsBrandVal}
                      onChange={(e) => setStringsBrandVal(e.target.value)}
                      style={{ background: '#0a0a0a', border: '1px solid var(--ln)', color: '#fff', padding: '8px 10px', borderRadius: '8px' }}
                    >
                      <option value="">Select brand...</option>
                      {stringsBrandVal && !(STRING_MANUFACTURERS as readonly string[]).includes(stringsBrandVal) && (
                        <option value={stringsBrandVal}>{stringsBrandVal}</option>
                      )}
                      {STRING_MANUFACTURERS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div style={{ borderTop: '1px solid var(--ln)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--tx)' }}>Pickups Configuration</span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: 'var(--mu)' }}>
                      Bridge Pickup
                      <input
                        value={pickupBridgeVal}
                        onChange={(e) => setPickupBridgeVal(e.target.value)}
                        placeholder="e.g. Seymour Duncan JB"
                        list="pickup-manufacturers"
                        style={{ background: '#0a0a0a', border: '1px solid var(--ln)', color: '#fff', padding: '8px 10px', borderRadius: '8px', fontSize: '13px' }}
                      />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: 'var(--mu)' }}>
                      Middle Pickup
                      <input
                        value={pickupMiddleVal}
                        onChange={(e) => setPickupMiddleVal(e.target.value)}
                        placeholder="e.g. Fender Custom 69"
                        list="pickup-manufacturers"
                        style={{ background: '#0a0a0a', border: '1px solid var(--ln)', color: '#fff', padding: '8px 10px', borderRadius: '8px', fontSize: '13px' }}
                      />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: 'var(--mu)' }}>
                      Neck Pickup
                      <input
                        value={pickupNeckVal}
                        onChange={(e) => setPickupNeckVal(e.target.value)}
                        placeholder="e.g. Seymour Duncan '59"
                        list="pickup-manufacturers"
                        style={{ background: '#0a0a0a', border: '1px solid var(--ln)', color: '#fff', padding: '8px 10px', borderRadius: '8px', fontSize: '13px' }}
                      />
                    </label>
                  </div>
                  <datalist id="pickup-manufacturers">
                    {PICKUP_MANUFACTURERS.map((p) => (
                      <option key={p} value={p} />
                    ))}
                  </datalist>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setIsEditingSpecs(false)}
                    style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--ln)', fontSize: '12px', color: 'var(--mu)' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveSpecs}
                    disabled={isSavingSpecs}
                    style={{ background: 'var(--ac)', color: '#000', fontWeight: 800, padding: '8px 18px', borderRadius: '8px', fontSize: '12px' }}
                  >
                    {isSavingSpecs ? 'Saving...' : 'Save Specs'}
                  </button>
                </div>
              </div>
            ) : (
              (() => {
                const resolvedStrings = resolveStringSpecs(item.string_gauge, item.string_manufacturer, item.current_strings);
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                      <div style={{ background: '#0a0a0a', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--ln)' }}>
                        <small style={{ color: 'var(--mu)', fontSize: '11px', display: 'block' }}>Tuning</small>
                        <b style={{ fontSize: '13px', color: 'var(--tx)' }}>{item.tuning || ''}</b>
                      </div>
                      <div style={{ background: '#0a0a0a', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--ln)' }}>
                        <small style={{ color: 'var(--mu)', fontSize: '11px', display: 'block' }}>Gauge</small>
                        <b style={{ fontSize: '13px', color: 'var(--tx)' }}>{resolvedStrings.gauge || ''}</b>
                      </div>
                      <div style={{ background: '#0a0a0a', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--ln)' }}>
                        <small style={{ color: 'var(--mu)', fontSize: '11px', display: 'block' }}>Strings Brand</small>
                        <b style={{ fontSize: '13px', color: 'var(--tx)' }}>{resolvedStrings.manufacturer || ''}</b>
                      </div>
                      <div style={{ background: '#0a0a0a', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--ln)' }}>
                        <small style={{ color: 'var(--mu)', fontSize: '11px', display: 'block' }}>Strings Count</small>
                        <b style={{ fontSize: '13px', color: 'var(--tx)' }}>{item.number_of_strings ? `${item.number_of_strings} string` : ''}</b>
                      </div>
                    </div>

                {(item.pickup_bridge || item.pickup_middle || item.pickup_neck || item.pickups_summary) && (
                  <div style={{ marginTop: '4px', borderTop: '1px solid var(--ln)', paddingTop: '10px' }}>
                    <small style={{ color: 'var(--mu)', fontSize: '11px', display: 'block', marginBottom: '4px' }}>Pickups</small>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '12px' }}>
                      {item.pickup_bridge && (
                        <span style={{ background: '#181818', padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--ln)' }}>
                          <b style={{ color: 'var(--ac)' }}>Bridge:</b> {item.pickup_bridge}
                        </span>
                      )}
                      {item.pickup_middle && (
                        <span style={{ background: '#181818', padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--ln)' }}>
                          <b style={{ color: 'var(--ac)' }}>Middle:</b> {item.pickup_middle}
                        </span>
                      )}
                      {item.pickup_neck && (
                        <span style={{ background: '#181818', padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--ln)' }}>
                          <b style={{ color: 'var(--ac)' }}>Neck:</b> {item.pickup_neck}
                        </span>
                      )}
                      {!item.pickup_bridge && !item.pickup_middle && !item.pickup_neck && item.pickups_summary && (
                        <span>{item.pickups_summary}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })()
        )}
      </div>
        )}

        {/* AMPLIFIER / PEDAL SETTINGS PANEL */}
        {(isAmp || isPedal) && (
          <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
            <h3 style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: 800 }}>
              {isPedal ? 'Pedal & Tone Settings' : 'Amp & Tone Settings'}
            </h3>
            {isEditingSpecs ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: 'var(--mu)' }}>
                  Tone Notes / Knob Settings
                  <textarea
                    rows={3}
                    value={ampSettingsVal}
                    onChange={(e) => setAmpSettingsVal(e.target.value)}
                    placeholder="e.g. Gain 7, Bass 5, Mid 6.5, Treble 7, Master 4, Lead Channel on"
                    style={{ background: '#0a0a0a', border: '1px solid var(--ln)', color: '#fff', padding: '8px 10px', borderRadius: '8px', fontSize: '13px' }}
                  />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: 'var(--mu)' }}>
                  Digital Preset Link (Helix, Quad Cortex, Kemper, ToneX, Google Drive)
                  <input
                    value={presetUrlVal}
                    onChange={(e) => setPresetUrlVal(e.target.value)}
                    placeholder="https://..."
                    style={{ background: '#0a0a0a', border: '1px solid var(--ln)', color: '#fff', padding: '8px 10px', borderRadius: '8px', fontSize: '13px' }}
                  />
                </label>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleSaveSpecs}
                    disabled={isSavingSpecs}
                    style={{ background: 'var(--ac)', color: '#000', fontWeight: 800, padding: '8px 18px', borderRadius: '8px', fontSize: '12px' }}
                  >
                    Save Amp Settings
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p style={{ margin: 0, fontSize: '13px', color: item.amp_settings ? 'var(--tx)' : 'var(--mu)', whiteSpace: 'pre-wrap' }}>
                  {item.amp_settings || ''}
                </p>
                {item.settings_file_url && (
                  <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {detectedPreset && (
                      <span
                        style={{
                          background: detectedPreset.color,
                          color: '#000',
                          fontWeight: 900,
                          fontSize: '10px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {detectedPreset.badge}
                      </span>
                    )}
                    <a
                      href={item.settings_file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: '13px',
                        color: 'var(--ac)',
                        fontWeight: 700,
                        textDecoration: 'underline',
                      }}
                    >
                      Open Preset Link ↗
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* DRUM SETUP PANEL */}
        {isDrum && (
          <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
            <h3 style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: 800 }}>Drum Kit Configuration</h3>
            <p style={{ margin: 0, fontSize: '13px', color: item.drum_head_details ? 'var(--tx)' : 'var(--mu)' }}>
              {item.drum_head_details || ''}
            </p>
          </div>
        )}

        {/* HISTORICAL SNAPSHOTS DRAWER / CARD */}
        {item.snapshots && item.snapshots.length > 0 && (
          <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: 800 }}>Historical Setup Snapshots ({item.snapshots.length})</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {item.snapshots.map((snap, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#0a0a0a',
                    border: '1px solid var(--ln)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '12px',
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--ac)', fontWeight: 800, marginRight: '8px' }}>
                      Snapshot {snap.monthYear}
                    </span>
                    <span style={{ color: 'var(--mu)' }}>
                      {[snap.tuning, snap.stringGauge, snap.stringManufacturer].filter(Boolean).join(' · ') || 'Saved setup state'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSnapshot(snap);
                      setShowSnapshotModal(true);
                    }}
                    style={{
                      background: 'var(--sf)',
                      color: 'var(--tx)',
                      border: '1px solid var(--ln)',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}
                  >
                    View
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* History Timeline */}
      <div style={{ position: 'relative', zIndex: 2, marginTop: '24px' }}>
        <h2>Maintenance & Setup History</h2>
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
      </div>

      {/* In the News */}
      {news.length > 0 && (
        <div style={{ position: 'relative', zIndex: 2, marginTop: '24px' }}>
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
        </div>
      )}

      {/* SNAPSHOT INSPECTOR MODAL */}
      {showSnapshotModal && activeSnapshot && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(8px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              background: '#161616',
              border: '1px solid var(--ln)',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '480px',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--ac)' }}>
                Setup Snapshot ({activeSnapshot.monthYear})
              </h3>
              <button
                type="button"
                onClick={() => setShowSnapshotModal(false)}
                style={{ color: 'var(--mu)', fontSize: '18px', fontWeight: 800 }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px' }}>
              <div style={{ background: '#0a0a0a', padding: '10px', borderRadius: '8px' }}>
                <small style={{ color: 'var(--mu)', display: 'block' }}>Tuning</small>
                <b>{activeSnapshot.tuning || ''}</b>
              </div>
              <div style={{ background: '#0a0a0a', padding: '10px', borderRadius: '8px' }}>
                <small style={{ color: 'var(--mu)', display: 'block' }}>Gauge</small>
                <b>{activeSnapshot.stringGauge || ''}</b>
              </div>
              <div style={{ background: '#0a0a0a', padding: '10px', borderRadius: '8px' }}>
                <small style={{ color: 'var(--mu)', display: 'block' }}>Strings Brand</small>
                <b>{activeSnapshot.stringManufacturer || ''}</b>
              </div>
              <div style={{ background: '#0a0a0a', padding: '10px', borderRadius: '8px' }}>
                <small style={{ color: 'var(--mu)', display: 'block' }}>Bridge Pickup</small>
                <b>{activeSnapshot.pickupBridge || ''}</b>
              </div>
            </div>

            {activeSnapshot.ampSettings && (
              <div style={{ background: '#0a0a0a', padding: '10px', borderRadius: '8px', fontSize: '12px' }}>
                <small style={{ color: 'var(--mu)', display: 'block', marginBottom: '4px' }}>Amp Settings</small>
                <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{activeSnapshot.ampSettings}</p>
              </div>
            )}

            {activeSnapshot.notes && (
              <div style={{ background: '#0a0a0a', padding: '10px', borderRadius: '8px', fontSize: '12px' }}>
                <small style={{ color: 'var(--mu)', display: 'block', marginBottom: '4px' }}>Notes</small>
                <p style={{ margin: 0 }}>{activeSnapshot.notes}</p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowSnapshotModal(false)}
              style={{
                background: 'var(--sf)',
                border: '1px solid var(--ln)',
                color: 'var(--tx)',
                padding: '10px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '13px',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* QUICK SETTINGS & NICKNAME MODAL */}
      {showSettingsModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(8px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <form
            onSubmit={handleSaveSettingsModal}
            style={{
              background: '#161616',
              border: '1px solid var(--ln)',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '520px',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '18px' }}>Edit Gear Item</h3>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                style={{ color: 'var(--mu)', fontSize: '18px', fontWeight: 800 }}
              >
                ✕
              </button>
            </div>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: 'var(--mu)', fontWeight: 600 }}>
              Nickname (e.g. &ldquo;Lucille&rdquo;, &ldquo;Old Black&rdquo;)
              <input
                value={nicknameVal}
                onChange={(e) => setNicknameVal(e.target.value)}
                placeholder="Give your instrument a nickname..."
                style={{ background: '#0a0a0a', border: '1px solid var(--ln)', color: '#fff', padding: '10px', borderRadius: '8px', fontSize: '14px' }}
              />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: 'var(--mu)', fontWeight: 600 }}>
                Brand
                <input
                  value={editBrand}
                  onChange={(e) => setEditBrand(e.target.value)}
                  style={{ background: '#0a0a0a', border: '1px solid var(--ln)', color: '#fff', padding: '8px 10px', borderRadius: '8px' }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: 'var(--mu)', fontWeight: 600 }}>
                Model
                <input
                  value={editModel}
                  onChange={(e) => setEditModel(e.target.value)}
                  style={{ background: '#0a0a0a', border: '1px solid var(--ln)', color: '#fff', padding: '8px 10px', borderRadius: '8px' }}
                />
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: 'var(--mu)', fontWeight: 600 }}>
                Classification (Category)
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  style={{ background: '#0a0a0a', border: '1px solid var(--ln)', color: '#fff', padding: '8px 10px', borderRadius: '8px' }}
                >
                  <option value="guitar">Guitar</option>
                  <option value="bass">Bass</option>
                  <option value="amp">Amplifier</option>
                  <option value="pedal">Pedal / Effects</option>
                  <option value="drums">Drums</option>
                  <option value="keyboard-synth-sampler">Synthesizer / Keyboard</option>
                  <option value="decks-dj">Decks / DJ</option>
                  <option value="vocals-microphone">Vocals / Microphone</option>
                  <option value="studio-sound">Studio Sound / Interface</option>
                  <option value="strings">Orchestral Strings</option>
                  <option value="brass">Brass / Woodwind</option>
                  <option value="accessories">Accessories</option>
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: 'var(--mu)', fontWeight: 600 }}>
                Serial Number
                <input
                  value={editSerial}
                  onChange={(e) => setEditSerial(e.target.value)}
                  placeholder="Optional serial..."
                  style={{ background: '#0a0a0a', border: '1px solid var(--ln)', color: '#fff', padding: '8px 10px', borderRadius: '8px' }}
                />
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: 'var(--mu)', fontWeight: 600 }}>
                Year
                <input
                  value={editYear}
                  onChange={(e) => setEditYear(e.target.value)}
                  placeholder="e.g. 1994"
                  style={{ background: '#0a0a0a', border: '1px solid var(--ln)', color: '#fff', padding: '8px 10px', borderRadius: '8px' }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: 'var(--mu)', fontWeight: 600 }}>
                Color / Finish
                <input
                  value={editColor}
                  onChange={(e) => setEditColor(e.target.value)}
                  placeholder="e.g. Olympic White"
                  style={{ background: '#0a0a0a', border: '1px solid var(--ln)', color: '#fff', padding: '8px 10px', borderRadius: '8px' }}
                />
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: 'var(--mu)', fontWeight: 600 }}>
                Purchase Price
                <input
                  value={editPurchasePrice}
                  onChange={(e) => setEditPurchasePrice(e.target.value)}
                  placeholder="e.g. £850"
                  style={{ background: '#0a0a0a', border: '1px solid var(--ln)', color: '#fff', padding: '8px 10px', borderRadius: '8px' }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: 'var(--mu)', fontWeight: 600 }}>
                Purchase Date
                <input
                  value={editPurchaseDate}
                  onChange={(e) => setEditPurchaseDate(autocompleteDate(e.target.value))}
                  placeholder="DD/MM/YYYY"
                  style={{ background: '#0a0a0a', border: '1px solid var(--ln)', color: '#fff', padding: '8px 10px', borderRadius: '8px' }}
                />
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--ln)', fontSize: '12px', color: 'var(--mu)' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingSpecs}
                style={{ background: 'var(--ac)', color: '#000', fontWeight: 800, padding: '8px 18px', borderRadius: '8px', fontSize: '12px' }}
              >
                {isSavingSpecs ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
