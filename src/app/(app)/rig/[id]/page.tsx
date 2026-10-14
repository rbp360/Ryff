'use client';

import { use, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BackButton } from '@/components/BackButton';
import { GearHeroPhoto } from '@/components/GearHeroPhoto';
import {
  GUITAR_TUNINGS,
  BASS_TUNINGS,
  GUITAR_STRING_GAUGES,
  BASS_STRING_GAUGES,
  STRING_MANUFACTURERS,
  STRING_TYPES_BY_BRAND,
  COMMON_STRING_TYPES,
  DEFAULT_STRING_GAUGES,
  PICKUP_MANUFACTURERS,
  detectSettingsProvider,
  getBackdropForCategory,
  autocompleteDate,
  resolveStringSpecs,
  formatCustomGauges,
  parseIndividualGauges,
  getStringNoteLabels,
  type DetectedProvider,
} from '@/lib/gear-specs';

interface GearSetupSnapshot {
  savedAt: number;
  monthYear: string;
  tuning?: string;
  stringGauge?: string;
  stringManufacturer?: string;
  stringType?: string;
  numberOfStrings?: number;
  pickupBridge?: string;
  pickupBridgeSerial?: string;
  pickupMiddle?: string;
  pickupMiddleSerial?: string;
  pickupNeck?: string;
  pickupNeckSerial?: string;
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
  serial_visible?: boolean;
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
  string_type?: string | null;
  pickup_bridge?: string | null;
  pickup_bridge_serial?: string | null;
  pickup_middle?: string | null;
  pickup_middle_serial?: string | null;
  pickup_neck?: string | null;
  pickup_neck_serial?: string | null;
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
  restring_interval_days?: number | null;
  restring_interval_basis?: string | null;
}

interface RigItemLog {
  id: number;
  event_type: string;
  title: string;
  description: string | null;
  component: string | null;
  original_part: string | null;
  event_date: string;
  is_voided?: boolean;
  voided_reason?: string | null;
  voided_at?: string | null;
}

interface MatchingNewsItem {
  id: number;
  title: string;
  headline?: string;
  source_name: string;
  url: string;
}

function getStringHealthText(
  dateStr?: string | null,
  intervalDays?: number | null,
  basis?: string | null
): { text: string; warn: boolean } {
  if (!dateStr) return { text: 'Not logged yet', warn: false };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { text: dateStr, warn: false };

  const diffDays = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  const effectiveInterval = intervalDays && intervalDays > 0 ? intervalDays : 60;
  const isOverdue = diffDays >= effectiveInterval;
  const basisText = basis ? ` · ${basis}` : '';

  if (diffDays === 0) return { text: 'Today', warn: false };
  if (diffDays < 7) return { text: `${diffDays} days ago`, warn: false };

  const weeks = Math.floor(diffDays / 7);
  if (!isOverdue) {
    return {
      text: `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} (${weeks} wks ago${basisText})`,
      warn: false,
    };
  }

  return {
    text: `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} (${diffDays} days ago · Restring due!${basisText})`,
    warn: true,
  };
}

export default function GearDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const itemId = resolvedParams.id;
  const router = useRouter();

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
  const [stringTypeVal, setStringTypeVal] = useState('');
  const [stringsCountVal, setStringsCountVal] = useState<number | ''>('');
  const [isCustomGaugeMode, setIsCustomGaugeMode] = useState(false);
  const [individualGaugesVal, setIndividualGaugesVal] = useState<string[]>([]);
  const [pickupBridgeVal, setPickupBridgeVal] = useState('');
  const [pickupBridgeSerialVal, setPickupBridgeSerialVal] = useState('');
  const [pickupMiddleVal, setPickupMiddleVal] = useState('');
  const [pickupMiddleSerialVal, setPickupMiddleSerialVal] = useState('');
  const [pickupNeckVal, setPickupNeckVal] = useState('');
  const [pickupNeckSerialVal, setPickupNeckSerialVal] = useState('');
  const [ampSettingsVal, setAmpSettingsVal] = useState('');
  const [presetUrlVal, setPresetUrlVal] = useState('');
  const [notesVal, setNotesVal] = useState('');
  const [nicknameVal, setNicknameVal] = useState('');

  // Settings Modal fields
  const [editBrand, setEditBrand] = useState('');
  const [editModel, setEditModel] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editSerial, setEditSerial] = useState('');
  const [editSerialVisible, setEditSerialVisible] = useState(false);
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
          const resolved = resolveStringSpecs(it.string_gauge, it.string_manufacturer, it.current_strings, it.string_type);
          setTuningVal(it.tuning || '');
          const initialGauge = it.string_gauge || resolved.normalizedGauge || resolved.gauge || '';
          setGaugeVal(initialGauge);
          setStringsBrandVal(it.string_manufacturer || resolved.manufacturer || '');
          setStringTypeVal(it.string_type || resolved.stringType || '');
          setStringsCountVal(it.number_of_strings ?? '');
          setPickupBridgeVal(it.pickup_bridge || '');
          setPickupBridgeSerialVal(it.pickup_bridge_serial || '');
          setPickupMiddleVal(it.pickup_middle || '');
          setPickupMiddleSerialVal(it.pickup_middle_serial || '');
          setPickupNeckVal(it.pickup_neck || '');
          setPickupNeckSerialVal(it.pickup_neck_serial || '');
          setAmpSettingsVal(it.amp_settings || '');
          setPresetUrlVal(it.settings_file_url || '');
          setNotesVal(it.notes || '');
          setNicknameVal(it.nickname || '');

          const parsedIndiv = parseIndividualGauges(initialGauge);
          if (parsedIndiv.length > 0) {
            setIndividualGaugesVal(parsedIndiv);
            setIsCustomGaugeMode(initialGauge.includes('(') || initialGauge.toLowerCase().includes('custom'));
          } else {
            setIndividualGaugesVal(['9', '11', '16', '24', '32', '42']);
            setIsCustomGaugeMode(false);
          }

          setEditBrand(it.brand || '');
          setEditModel(it.model || '');
          setEditCategory(it.category || 'guitar');
          setEditSerial(it.serial_number || '');
          setEditSerialVisible(it.serial_visible ?? false);
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
    const finalGauge = isCustomGaugeMode && individualGaugesVal.length > 0
      ? formatCustomGauges(individualGaugesVal)
      : (gaugeVal || null);

    await updateGear({
      tuning: tuningVal || null,
      string_gauge: finalGauge,
      string_manufacturer: stringsBrandVal || null,
      string_type: stringTypeVal || null,
      number_of_strings: stringsCountVal || null,
      pickup_bridge: pickupBridgeVal || null,
      pickup_bridge_serial: pickupBridgeSerialVal || null,
      pickup_middle: pickupMiddleVal || null,
      pickup_middle_serial: pickupMiddleSerialVal || null,
      pickup_neck: pickupNeckVal || null,
      pickup_neck_serial: pickupNeckSerialVal || null,
      amp_settings: ampSettingsVal || null,
      settings_file_url: presetUrlVal || null,
      notes: notesVal || null,
      nickname: nicknameVal || null,
    });
    setIsSavingSpecs(false);
    setIsEditingSpecs(false);
  }

  async function handleToggleVoidLog(logId: number, currentVoid: boolean) {
    const actionLabel = currentVoid ? 'restore' : 'strike through';
    const reason = !currentVoid ? 'Accidental/hallucinated entry struck through by user' : undefined;

    try {
      const res = await fetch(`/api/rig/${itemId}/log`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logId,
          is_voided: !currentVoid,
          voided_reason: reason,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.item) {
          setItem(data.item);
          const resolved = resolveStringSpecs(data.item.string_gauge, data.item.string_manufacturer, data.item.current_strings, data.item.string_type);
          setGaugeVal(data.item.string_gauge || resolved.normalizedGauge || resolved.gauge || '');
          setStringsBrandVal(data.item.string_manufacturer || resolved.manufacturer || '');
          setStringTypeVal(data.item.string_type || resolved.stringType || '');
        }
        if (data.logs) setLogs(data.logs);
        setSaveSuccessMsg(currentVoid ? 'Log entry restored' : 'Log entry struck through');
        setTimeout(() => setSaveSuccessMsg(null), 3000);
      } else {
        setError(data.error || `Failed to ${actionLabel} log`);
      }
    } catch {
      setError(`Network error trying to ${actionLabel} log`);
    }
  }

  function openSettingsModal() {
    if (item) {
      setNicknameVal(item.nickname || '');
      setEditBrand(item.brand || '');
      setEditModel(item.model || '');
      setEditCategory(item.category || 'guitar');
      setEditSerial(item.serial_number || '');
      setEditSerialVisible(item.serial_visible ?? false);
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
      serial_visible: editSerialVisible,
      year_manufacture: editYear || null,
      color: editColor || null,
      purchase_price: editPurchasePrice || null,
      purchase_date: editPurchaseDate || null,
    });
    setIsSavingSpecs(false);
    setShowSettingsModal(false);
  }

  async function handleDeleteGear() {
    if (!item) return;
    const confirmDelete = window.confirm(`Are you sure you want to remove "${item.brand ? `${item.brand} ` : ''}${item.model || item.raw_text}" from your Rig Passport?`);
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/rig/${itemId}`, { method: 'DELETE' });
      if (res.ok) {
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem(`ryff_gear_photo_${itemId}`);
          } catch {}
        }
        router.push('/rig');
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to delete gear item');
      }
    } catch {
      setError('Network error deleting item');
    }
  }

  async function handleCreateSnapshot() {
    if (!item) return;
    const now = new Date();
    const monthYear = `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getFullYear()).slice(-2)}`;
    const finalGauge = isCustomGaugeMode && individualGaugesVal.length > 0
      ? formatCustomGauges(individualGaugesVal)
      : (item.string_gauge || gaugeVal || undefined);

    const newSnapshot: GearSetupSnapshot = {
      savedAt: Date.now(),
      monthYear,
      tuning: item.tuning || tuningVal || undefined,
      stringGauge: finalGauge,
      stringManufacturer: item.string_manufacturer || stringsBrandVal || undefined,
      stringType: item.string_type || stringTypeVal || undefined,
      numberOfStrings: item.number_of_strings || (stringsCountVal ? Number(stringsCountVal) : undefined),
      pickupBridge: item.pickup_bridge || pickupBridgeVal || undefined,
      pickupBridgeSerial: item.pickup_bridge_serial || pickupBridgeSerialVal || undefined,
      pickupMiddle: item.pickup_middle || pickupMiddleVal || undefined,
      pickupMiddleSerial: item.pickup_middle_serial || pickupMiddleSerialVal || undefined,
      pickupNeck: item.pickup_neck || pickupNeckVal || undefined,
      pickupNeckSerial: item.pickup_neck_serial || pickupNeckSerialVal || undefined,
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
          ‹ Back to Rig Passport
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
  const stringHealth = getStringHealthText(
    item.last_restrung_at,
    item.restring_interval_days,
    item.restring_interval_basis
  );

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
        <BackButton fallbackHref="/rig" label="Rig Passport" />
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
          {item.serial_number && item.serial_visible && (
            <span style={{ marginLeft: '6px', fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.08)', color: 'var(--ac)' }}>Public</span>
          )}
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
                    String Manufacturer / Brand
                    <input
                      value={stringsBrandVal}
                      onChange={(e) => setStringsBrandVal(e.target.value)}
                      placeholder="e.g. Elixir, Ernie Ball, D'Addario, Curt Mangan..."
                      list="string-manufacturers-list"
                      style={{ background: '#0a0a0a', border: '1px solid var(--ln)', color: '#fff', padding: '8px 10px', borderRadius: '8px', fontSize: '13px' }}
                    />
                    <datalist id="string-manufacturers-list">
                      {STRING_MANUFACTURERS.map((m) => (
                        <option key={m} value={m} />
                      ))}
                    </datalist>
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: 'var(--mu)', fontWeight: 600 }}>
                    Exact String Type / Coating / Model Line
                    <input
                      value={stringTypeVal}
                      onChange={(e) => setStringTypeVal(e.target.value)}
                      placeholder="e.g. Polyweb, Nanoweb, NYXL, Paradigm, Flatwound..."
                      list="string-types-list"
                      style={{ background: '#0a0a0a', border: '1px solid var(--ln)', color: '#fff', padding: '8px 10px', borderRadius: '8px', fontSize: '13px' }}
                    />
                    <datalist id="string-types-list">
                      {(STRING_TYPES_BY_BRAND[stringsBrandVal] || COMMON_STRING_TYPES).map((t) => (
                        <option key={t} value={t} />
                      ))}
                    </datalist>
                  </label>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--ln)', paddingTop: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--mu)', fontWeight: 700 }}>
                      String Gauge Configuration
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const nextMode = !isCustomGaugeMode;
                        setIsCustomGaugeMode(nextMode);
                        if (nextMode) {
                          const activeCount = typeof stringsCountVal === 'number' && stringsCountVal > 0 ? stringsCountVal : (isBass ? 4 : 6);
                          let initialArr = parseIndividualGauges(gaugeVal);
                          if (initialArr.length === 0) {
                            initialArr = isBass
                              ? ['45', '65', '85', '105']
                              : ['9', '11', '16', '24', '32', '42'];
                          }
                          while (initialArr.length < activeCount) initialArr.push('42');
                          initialArr = initialArr.slice(0, activeCount);
                          setIndividualGaugesVal(initialArr);
                          setGaugeVal(formatCustomGauges(initialArr));
                        }
                      }}
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: isCustomGaugeMode ? 'var(--ac)' : 'var(--mu)',
                        background: isCustomGaugeMode ? 'rgba(34, 197, 94, 0.12)' : 'var(--sf)',
                        border: isCustomGaugeMode ? '1px solid var(--ac)' : '1px solid var(--ln)',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      {isCustomGaugeMode ? '✓ Custom String Gauges Active' : '✏️ Customise Individual Strings (e.g. 8-42)'}
                    </button>
                  </div>

                  {!isCustomGaugeMode ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                      <select
                        value={gaugeVal}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === 'CUSTOM') {
                            setIsCustomGaugeMode(true);
                            const activeCount = typeof stringsCountVal === 'number' && stringsCountVal > 0 ? stringsCountVal : (isBass ? 4 : 6);
                            const initialArr = isBass ? ['45', '65', '85', '105'] : ['8', '11', '16', '22', '32', '42'];
                            setIndividualGaugesVal(initialArr.slice(0, activeCount));
                            setGaugeVal(formatCustomGauges(initialArr.slice(0, activeCount)));
                          } else {
                            setGaugeVal(v);
                          }
                        }}
                        style={{ background: '#0a0a0a', border: '1px solid var(--ln)', color: '#fff', padding: '8px 10px', borderRadius: '8px', fontSize: '13px' }}
                      >
                        <option value="">Select gauge preset...</option>
                        {gaugeVal && !gaugeOptions.includes(gaugeVal) && gaugeVal !== 'CUSTOM' && (
                          <option value={gaugeVal}>{gaugeVal}</option>
                        )}
                        {gaugeOptions.map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                        <option value="CUSTOM">Custom (Configure Individual Strings per string)...</option>
                      </select>
                    </div>
                  ) : (
                    (() => {
                      const activeCount = typeof stringsCountVal === 'number' && stringsCountVal > 0 ? stringsCountVal : (isBass ? 4 : 6);
                      const noteLabels = getStringNoteLabels(activeCount, isBass);
                      return (
                        <div style={{ background: '#0a0a0a', border: '1px dashed var(--ac)', borderRadius: '10px', padding: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '4px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--ac)' }}>
                              Forensic Per-String Gauges ({activeCount} Strings)
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--mu)' }}>
                              Current: <b style={{ color: '#fff' }}>{formatCustomGauges(individualGaugesVal) || 'Set values below'}</b>
                            </span>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(75px, 1fr))`, gap: '8px' }}>
                            {Array.from({ length: activeCount }).map((_, idx) => (
                              <label key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '11px', color: 'var(--mu)', textAlign: 'center' }}>
                                <span style={{ fontWeight: 600 }}>{noteLabels[idx] || `String ${idx + 1}`}</span>
                                <input
                                  type="text"
                                  value={individualGaugesVal[idx] || ''}
                                  placeholder={String((idx + 1) * 7)}
                                  onChange={(e) => {
                                    const digits = e.target.value.replace(/[^\d]/g, '');
                                    const nextArr = [...individualGaugesVal];
                                    while (nextArr.length < activeCount) nextArr.push('');
                                    nextArr[idx] = digits;
                                    setIndividualGaugesVal(nextArr);
                                    setGaugeVal(formatCustomGauges(nextArr));
                                  }}
                                  style={{
                                    background: '#141414',
                                    border: '1px solid var(--ln)',
                                    color: '#fff',
                                    padding: '7px 4px',
                                    borderRadius: '6px',
                                    textAlign: 'center',
                                    fontSize: '13px',
                                    fontWeight: 800,
                                  }}
                                />
                              </label>
                            ))}
                          </div>

                          <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: 'var(--mu)', marginRight: '2px' }}>Presets:</span>
                            <button
                              type="button"
                              onClick={() => {
                                const preset = ['8', '11', '16', '22', '32', '42'];
                                setIndividualGaugesVal(preset);
                                setGaugeVal(formatCustomGauges(preset));
                              }}
                              style={{ fontSize: '11px', padding: '3px 8px', background: 'var(--sf)', border: '1px solid var(--ln)', borderRadius: '6px', color: 'var(--tx)', cursor: 'pointer' }}
                            >
                              Rob Marcello (8-42)
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const preset = ['9', '11', '16', '24', '32', '42'];
                                setIndividualGaugesVal(preset);
                                setGaugeVal(formatCustomGauges(preset));
                              }}
                              style={{ fontSize: '11px', padding: '3px 8px', background: 'var(--sf)', border: '1px solid var(--ln)', borderRadius: '6px', color: 'var(--tx)', cursor: 'pointer' }}
                            >
                              Super Light 9s (9-42)
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const preset = ['9', '11', '16', '26', '36', '46'];
                                setIndividualGaugesVal(preset);
                                setGaugeVal(formatCustomGauges(preset));
                              }}
                              style={{ fontSize: '11px', padding: '3px 8px', background: 'var(--sf)', border: '1px solid var(--ln)', borderRadius: '6px', color: 'var(--tx)', cursor: 'pointer' }}
                            >
                              Hybrid Slinky (9-46)
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const preset = ['10', '13', '17', '26', '36', '46'];
                                setIndividualGaugesVal(preset);
                                setGaugeVal(formatCustomGauges(preset));
                              }}
                              style={{ fontSize: '11px', padding: '3px 8px', background: 'var(--sf)', border: '1px solid var(--ln)', borderRadius: '6px', color: 'var(--tx)', cursor: 'pointer' }}
                            >
                              Regular 10s (10-46)
                            </button>
                          </div>
                        </div>
                      );
                    })()
                  )}
                </div>

                <div style={{ borderTop: '1px solid var(--ln)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--tx)' }}>Pickups Configuration & Serial Numbers</span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '10px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: '#0a0a0a', padding: '10px', borderRadius: '8px', border: '1px solid var(--ln)' }}>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: 'var(--mu)', fontWeight: 700 }}>
                        Bridge Pickup Model
                        <input
                          value={pickupBridgeVal}
                          onChange={(e) => setPickupBridgeVal(e.target.value)}
                          placeholder="e.g. Seymour Duncan JB / J90"
                          list="pickup-manufacturers"
                          style={{ background: '#141414', border: '1px solid var(--ln)', color: '#fff', padding: '7px 9px', borderRadius: '6px', fontSize: '12px' }}
                        />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: 'var(--mu)' }}>
                        Bridge Serial # / Specs
                        <input
                          value={pickupBridgeSerialVal}
                          onChange={(e) => setPickupBridgeSerialVal(e.target.value)}
                          placeholder="e.g. S/N: 202410-08 / 16.4k DCR"
                          style={{ background: '#141414', border: '1px solid var(--ln)', color: '#fff', padding: '7px 9px', borderRadius: '6px', fontSize: '12px' }}
                        />
                      </label>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: '#0a0a0a', padding: '10px', borderRadius: '8px', border: '1px solid var(--ln)' }}>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: 'var(--mu)', fontWeight: 700 }}>
                        Middle Pickup Model
                        <input
                          value={pickupMiddleVal}
                          onChange={(e) => setPickupMiddleVal(e.target.value)}
                          placeholder="e.g. Fender Custom 69 / stock"
                          list="pickup-manufacturers"
                          style={{ background: '#141414', border: '1px solid var(--ln)', color: '#fff', padding: '7px 9px', borderRadius: '6px', fontSize: '12px' }}
                        />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: 'var(--mu)' }}>
                        Middle Serial # / Specs
                        <input
                          value={pickupMiddleSerialVal}
                          onChange={(e) => setPickupMiddleSerialVal(e.target.value)}
                          placeholder="e.g. S/N: 202410-09"
                          style={{ background: '#141414', border: '1px solid var(--ln)', color: '#fff', padding: '7px 9px', borderRadius: '6px', fontSize: '12px' }}
                        />
                      </label>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: '#0a0a0a', padding: '10px', borderRadius: '8px', border: '1px solid var(--ln)' }}>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: 'var(--mu)', fontWeight: 700 }}>
                        Neck Pickup Model
                        <input
                          value={pickupNeckVal}
                          onChange={(e) => setPickupNeckVal(e.target.value)}
                          placeholder="e.g. Seymour Duncan '59 / stock"
                          list="pickup-manufacturers"
                          style={{ background: '#141414', border: '1px solid var(--ln)', color: '#fff', padding: '7px 9px', borderRadius: '6px', fontSize: '12px' }}
                        />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: 'var(--mu)' }}>
                        Neck Serial # / Specs
                        <input
                          value={pickupNeckSerialVal}
                          onChange={(e) => setPickupNeckSerialVal(e.target.value)}
                          placeholder="e.g. S/N: 202410-10"
                          style={{ background: '#141414', border: '1px solid var(--ln)', color: '#fff', padding: '7px 9px', borderRadius: '6px', fontSize: '12px' }}
                        />
                      </label>
                    </div>
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
                const resolvedStrings = resolveStringSpecs(item.string_gauge, item.string_manufacturer, item.current_strings, item.string_type);
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                      <div style={{ background: '#0a0a0a', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--ln)' }}>
                        <small style={{ color: 'var(--mu)', fontSize: '11px', display: 'block' }}>Tuning</small>
                        <b style={{ fontSize: '13px', color: 'var(--tx)' }}>{item.tuning || 'Standard'}</b>
                      </div>
                      <div style={{ background: '#0a0a0a', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--ln)' }}>
                        <small style={{ color: 'var(--mu)', fontSize: '11px', display: 'block' }}>Gauge</small>
                        <b style={{ fontSize: '13px', color: 'var(--tx)' }}>{resolvedStrings.gauge || 'Not set'}</b>
                      </div>
                      <div style={{ background: '#0a0a0a', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--ln)' }}>
                        <small style={{ color: 'var(--mu)', fontSize: '11px', display: 'block' }}>Strings Brand & Line</small>
                        <b style={{ fontSize: '13px', color: 'var(--tx)' }}>
                          {[resolvedStrings.manufacturer, resolvedStrings.stringType].filter(Boolean).join(' ') || 'Not set'}
                        </b>
                      </div>
                      <div style={{ background: '#0a0a0a', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--ln)' }}>
                        <small style={{ color: 'var(--mu)', fontSize: '11px', display: 'block' }}>Strings Count</small>
                        <b style={{ fontSize: '13px', color: 'var(--tx)' }}>{item.number_of_strings ? `${item.number_of_strings} string` : (isBass ? '4 string' : '6 string')}</b>
                      </div>
                    </div>

                {(item.pickup_bridge || item.pickup_middle || item.pickup_neck || item.pickups_summary) && (
                  <div style={{ marginTop: '4px', borderTop: '1px solid var(--ln)', paddingTop: '10px' }}>
                    <small style={{ color: 'var(--mu)', fontSize: '11px', display: 'block', marginBottom: '6px' }}>Pickups & Serials</small>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '12px' }}>
                      {item.pickup_bridge && (
                        <span style={{ background: '#181818', padding: '5px 12px', borderRadius: '6px', border: '1px solid var(--ln)' }}>
                          <b style={{ color: 'var(--ac)' }}>Bridge:</b> {item.pickup_bridge}
                          {item.pickup_bridge_serial && (
                            <small style={{ color: 'var(--mu)', marginLeft: '6px', fontWeight: 600 }}>
                              (S/N: {item.pickup_bridge_serial})
                            </small>
                          )}
                        </span>
                      )}
                      {item.pickup_middle && (
                        <span style={{ background: '#181818', padding: '5px 12px', borderRadius: '6px', border: '1px solid var(--ln)' }}>
                          <b style={{ color: 'var(--ac)' }}>Middle:</b> {item.pickup_middle}
                          {item.pickup_middle_serial && (
                            <small style={{ color: 'var(--mu)', marginLeft: '6px', fontWeight: 600 }}>
                              (S/N: {item.pickup_middle_serial})
                            </small>
                          )}
                        </span>
                      )}
                      {item.pickup_neck && (
                        <span style={{ background: '#181818', padding: '5px 12px', borderRadius: '6px', border: '1px solid var(--ln)' }}>
                          <b style={{ color: 'var(--ac)' }}>Neck:</b> {item.pickup_neck}
                          {item.pickup_neck_serial && (
                            <small style={{ color: 'var(--mu)', marginLeft: '6px', fontWeight: 600 }}>
                              (S/N: {item.pickup_neck_serial})
                            </small>
                          )}
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
        <h2>Passport history</h2>
        {logs.length === 0 ? (
          <p className="sub">Nothing logged yet.</p>
        ) : (
          <div className="tl">
            {logs.map((log) => (
              <div
                key={log.id}
                className={log.is_voided ? 'voided' : ''}
                style={{
                  opacity: log.is_voided ? 0.45 : 1,
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                  <b
                    style={{
                      textDecoration: log.is_voided ? 'line-through 2px #ef4444' : 'none',
                      color: log.is_voided ? '#9ca3af' : 'var(--tx)',
                    }}
                  >
                    {log.title}
                    <span
                      className="ltag"
                      style={{
                        borderColor: log.is_voided ? '#6b7280' : undefined,
                        color: log.is_voided ? '#9ca3af' : undefined,
                        textDecoration: log.is_voided ? 'line-through' : 'none',
                      }}
                    >
                      {log.event_type}
                    </span>
                    {log.is_voided && (
                      <span
                        title={log.voided_reason || 'Marked as void / hallucinated'}
                        style={{
                          background: 'rgba(239, 68, 68, 0.15)',
                          border: '1px solid rgba(239, 68, 68, 0.4)',
                          color: '#f87171',
                          borderRadius: '4px',
                          padding: '1px 6px',
                          fontSize: '10px',
                          fontWeight: 800,
                          marginLeft: '8px',
                          letterSpacing: '0.04em',
                          textDecoration: 'none',
                          display: 'inline-block',
                        }}
                      >
                        VOIDED · STRUCK THROUGH
                      </span>
                    )}
                  </b>
                  <button
                    type="button"
                    onClick={() => handleToggleVoidLog(log.id, Boolean(log.is_voided))}
                    title={log.is_voided ? 'Restore this log entry' : 'Strike through this log entry'}
                    style={{
                      background: log.is_voided ? 'rgba(34, 197, 94, 0.1)' : 'transparent',
                      border: '1px solid var(--ln)',
                      borderRadius: '6px',
                      color: log.is_voided ? 'var(--ac)' : 'var(--mu)',
                      padding: '3px 8px',
                      fontSize: '11px',
                      cursor: 'pointer',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {log.is_voided ? '↩ Restore' : '✕ Strike through'}
                  </button>
                </div>
                <small
                  style={{
                    textDecoration: log.is_voided ? 'line-through' : 'none',
                    color: log.is_voided ? '#6b7280' : 'var(--mu)',
                  }}
                >
                  {new Date(log.event_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  {log.description ? ` · ${log.description}` : ''}
                  {log.is_voided && log.voided_reason ? ` (${log.voided_reason})` : ''}
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
                <span style={{ fontSize: '11px', color: 'var(--mu)', fontWeight: 400, marginTop: '2px' }}>
                  Optional. Used to identify this instrument. Hidden from others unless you choose to share it.
                </span>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', fontSize: '12px', color: 'var(--tx)', cursor: 'pointer', fontWeight: 500 }}>
                  <input
                    type="checkbox"
                    checked={editSerialVisible}
                    onChange={(e) => setEditSerialVisible(e.target.checked)}
                    style={{ accentColor: 'var(--ac)', width: '14px', height: '14px', cursor: 'pointer' }}
                  />
                  <span>Show serial number on public passport</span>
                </label>
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

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--ln)' }}>
              <button
                type="button"
                onClick={handleDeleteGear}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  background: 'rgba(239, 68, 68, 0.08)',
                  fontSize: '12px',
                  color: '#ef4444',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>🗑️</span> Remove from Rig
              </button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--ln)', fontSize: '12px', color: 'var(--mu)', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingSpecs}
                  style={{ background: 'var(--ac)', color: '#000', fontWeight: 800, padding: '8px 18px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}
                >
                  {isSavingSpecs ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
