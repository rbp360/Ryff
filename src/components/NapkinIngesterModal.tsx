'use client';

import { useState, useRef } from 'react';
import { IngestBatchSummary, IngestCandidate } from '@/lib/command/ingest';

interface NapkinIngesterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
}

export function NapkinIngesterModal({ isOpen, onClose, onImportComplete }: NapkinIngesterModalProps) {
  const [tab, setTab] = useState<'paste' | 'file'>('paste');
  const [notesText, setNotesText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Flow states
  const [step, setStep] = useState<'input' | 'analyzing' | 'review' | 'saving'>('input');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [batchSummary, setBatchSummary] = useState<IngestBatchSummary | null>(null);

  // Review states
  const [reviewFilter, setReviewFilter] = useState<'all' | 'high' | 'needs_help'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [candidateEdits, setCandidateEdits] = useState<Record<string, Partial<IngestCandidate>>>({});

  // Success & Undo state
  const [undoBatchId, setUndoBatchId] = useState<string | null>(null);
  const [isUndoing, setIsUndoing] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{ items: number; logs: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  async function handleAnalyze() {
    setErrorMsg(null);
    setStep('analyzing');

    try {
      let res: Response;
      if (tab === 'file' && selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        res = await fetch('/api/command/import', {
          method: 'POST',
          body: formData,
        });
      } else {
        if (!notesText.trim()) {
          throw new Error('Please paste your notes text before analyzing.');
        }
        res = await fetch('/api/command/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: notesText }),
        });
      }

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to analyze notes.');
      }

      setBatchSummary(data);

      // Pre-select non-duplicate high confidence candidates
      const preselected = new Set<string>();
      data.candidates.forEach((c: IngestCandidate) => {
        if (c.confidence === 'high' && !c.is_duplicate) {
          preselected.add(c.id);
        }
      });
      setSelectedIds(preselected);
      setStep('review');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error analyzing notes');
      setStep('input');
    }
  }

  async function handleConfirmImport(acceptAllHigh = false) {
    if (!batchSummary) return;
    setStep('saving');
    setErrorMsg(null);

    try {
      const confirmedIds = acceptAllHigh
        ? batchSummary.candidates.filter((c) => c.confidence === 'high' && !c.is_duplicate).map((c) => c.id)
        : Array.from(selectedIds);

      if (confirmedIds.length === 0) {
        throw new Error('No items selected to import.');
      }

      const res = await fetch('/api/command/import/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId: batchSummary.batchId,
          confirmedCandidateIds: confirmedIds,
          edits: candidateEdits,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to save imported items.');
      }

      setSuccessInfo({ items: data.importedItems, logs: data.importedLogs });
      setUndoBatchId(batchSummary.batchId);
      if (onImportComplete) onImportComplete();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to confirm import.');
      setStep('review');
    }
  }

  async function handleUndo() {
    if (!undoBatchId || isUndoing) return;
    setIsUndoing(true);
    try {
      const res = await fetch('/api/command/import/undo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId: undoBatchId }),
      });
      if (res.ok) {
        setUndoBatchId(null);
        setSuccessInfo(null);
        if (onImportComplete) onImportComplete();
      }
    } finally {
      setIsUndoing(false);
    }
  }

  function toggleCandidateSelection(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function updateCandidateField(id: string, field: keyof IngestCandidate, val: unknown) {
    setCandidateEdits((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        [field]: val,
      },
    }));
  }

  const filteredCandidates = (batchSummary?.candidates || []).filter((c) => {
    if (reviewFilter === 'high') return c.confidence === 'high';
    if (reviewFilter === 'needs_help') return c.confidence !== 'high' || c.is_date_ambiguous || c.is_new_gear;
    return true;
  });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '740px',
          maxHeight: '90vh',
          background: 'var(--sf)',
          border: '1px solid var(--ln)',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--ln)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#0d0d0d',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>📥</span>
            <div>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800, textTransform: 'uppercase' }}>
                Napkin Ingester
              </h2>
              <span style={{ fontSize: '11px', color: 'var(--mu)' }}>
                Import notes, receipts, and spreadsheets directly into your Rig Passport
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--mu)',
              fontSize: '22px',
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {errorMsg && (
            <div
              style={{
                padding: '12px 14px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                color: '#f87171',
                fontSize: '13px',
                marginBottom: '16px',
              }}
            >
              ⚠️ {errorMsg}
            </div>
          )}

          {/* STEP 1: INPUT SCREEN */}
          {step === 'input' && (
            <>
              {/* Tab Selector */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <button
                  type="button"
                  onClick={() => setTab('paste')}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: tab === 'paste' ? 'var(--ac)' : 'var(--ln)',
                    background: tab === 'paste' ? 'rgba(34, 197, 94, 0.08)' : 'transparent',
                    color: tab === 'paste' ? 'var(--ac)' : 'var(--tx)',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  📝 Paste Notes
                </button>
                <button
                  type="button"
                  onClick={() => setTab('file')}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: tab === 'file' ? 'var(--ac)' : 'var(--ln)',
                    background: tab === 'file' ? 'rgba(34, 197, 94, 0.08)' : 'transparent',
                    color: tab === 'file' ? 'var(--ac)' : 'var(--tx)',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  📊 Upload CSV / Spreadsheets
                </button>
              </div>

              {tab === 'paste' ? (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--mu)', marginBottom: '6px' }}>
                    Paste your phone notes, receipt transcripts, or gear list:
                  </label>
                  <textarea
                    value={notesText}
                    onChange={(e) => setNotesText(e.target.value)}
                    placeholder={`e.g.\nWashburn N2 strings 01/01/26\nPRS Custom 24 setup May 2025\nBoss Katana 50w - bought used for £180 on 12/10/2024\nCharvel 750XL - restrung with Ernie Ball 10-46 on 15/09/2026`}
                    rows={8}
                    style={{
                      width: '100%',
                      padding: '14px',
                      background: '#080808',
                      border: '1px solid var(--ln)',
                      borderRadius: '8px',
                      color: 'var(--tx)',
                      fontSize: '13px',
                      fontFamily: 'monospace',
                      resize: 'vertical',
                      boxSizing: 'border-box',
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '11px', color: 'var(--mu)' }}>
                    <span>Max 20,000 characters (approx 200 rows)</span>
                    <span>{notesText.length} / 20,000 chars</span>
                  </div>
                </div>
              ) : (
                <div>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      padding: '36px 20px',
                      border: '2px dashed var(--ln)',
                      borderRadius: '12px',
                      textAlign: 'center',
                      background: '#080808',
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>📄</span>
                    <b style={{ fontSize: '14px', display: 'block', color: 'var(--tx)' }}>
                      {selectedFile ? selectedFile.name : 'Click to select CSV or spreadsheet file'}
                    </b>
                    <span style={{ fontSize: '12px', color: 'var(--mu)', marginTop: '4px', display: 'block' }}>
                      {selectedFile
                        ? `${(selectedFile.size / 1024).toFixed(1)} KB`
                        : 'Supports .csv and plain text files with comma/tab delimiters'}
                    </span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.txt,.tsv"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setSelectedFile(file);
                      }}
                    />
                  </div>

                  <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: 'var(--mu)' }}>
                      Need a starting template?
                    </span>
                    <a
                      href="/api/command/import/template"
                      download="ryff_gear_passport_template.csv"
                      style={{
                        fontSize: '12px',
                        color: 'var(--ac)',
                        textDecoration: 'none',
                        fontWeight: 700,
                      }}
                    >
                      📥 Download Sample CSV Template
                    </a>
                  </div>
                </div>
              )}

              {/* Privacy Notice */}
              <div
                style={{
                  marginTop: '20px',
                  padding: '12px',
                  background: '#0a0a0a',
                  border: '1px solid var(--ln)',
                  borderRadius: '8px',
                  fontSize: '11.5px',
                  color: 'var(--mu)',
                  lineHeight: 1.5,
                }}
              >
                🔒 <strong style={{ color: 'var(--tx)' }}>Privacy & Safety Guarantee:</strong> Uploaded text is
                scanned using Gemini Flash with strict prompt-injection defenses. Nothing is written to your database
                until you review and confirm the extracted entries.
              </div>

              {/* Bottom Action */}
              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    border: '1px solid var(--ln)',
                    background: 'transparent',
                    color: 'var(--tx)',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={tab === 'paste' ? !notesText.trim() : !selectedFile}
                  style={{
                    padding: '10px 22px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'var(--ac)',
                    color: '#000',
                    fontWeight: 800,
                    cursor: 'pointer',
                    opacity: (tab === 'paste' ? !notesText.trim() : !selectedFile) ? 0.5 : 1,
                  }}
                >
                  Analyze Notes ›
                </button>
              </div>
            </>
          )}

          {/* STEP 2: ANALYZING STATE */}
          {step === 'analyzing' && (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  border: '3px solid var(--ln)',
                  borderTopColor: 'var(--ac)',
                  borderRadius: '50%',
                  margin: '0 auto 20px',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
              <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
              <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 800 }}>
                Extracting Gear & Maintenance History...
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--mu)' }}>
                Matching instruments, detecting dates, and checking for duplicates.
              </p>
            </div>
          )}

          {/* STEP 3: REVIEW SCREEN */}
          {(step === 'review' || step === 'saving') && batchSummary && (
            <div>
              {/* Summary Metrics Bar */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: '8px',
                  padding: '12px',
                  background: '#0a0a0a',
                  border: '1px solid var(--ln)',
                  borderRadius: '10px',
                  marginBottom: '16px',
                }}
              >
                <div>
                  <span style={{ fontSize: '10px', color: 'var(--mu)', textTransform: 'uppercase', fontWeight: 700 }}>
                    Extracted
                  </span>
                  <div style={{ fontSize: '18px', fontWeight: 900 }}>{batchSummary.totalCandidates}</div>
                </div>
                <div>
                  <span style={{ fontSize: '10px', color: '#4ade80', textTransform: 'uppercase', fontWeight: 700 }}>
                    High Confidence
                  </span>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: '#4ade80' }}>
                    {batchSummary.highConfidenceCount}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '10px', color: '#fbbf24', textTransform: 'uppercase', fontWeight: 700 }}>
                    Needs Review
                  </span>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: '#fbbf24' }}>
                    {batchSummary.needsHelpCount}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '10px', color: '#60a5fa', textTransform: 'uppercase', fontWeight: 700 }}>
                    New Instruments
                  </span>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: '#60a5fa' }}>
                    {batchSummary.newGearCount}
                  </div>
                </div>
              </div>

              {/* Quick Actions Header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px',
                  marginBottom: '14px',
                }}
              >
                {/* Filter Pills */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setReviewFilter('all')}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '14px',
                      border: '1px solid var(--ln)',
                      background: reviewFilter === 'all' ? 'var(--tx)' : 'transparent',
                      color: reviewFilter === 'all' ? '#000' : 'var(--mu)',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    All ({batchSummary.candidates.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewFilter('high')}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '14px',
                      border: '1px solid var(--ln)',
                      background: reviewFilter === 'high' ? '#4ade80' : 'transparent',
                      color: reviewFilter === 'high' ? '#000' : 'var(--mu)',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    High Confidence ({batchSummary.highConfidenceCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewFilter('needs_help')}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '14px',
                      border: '1px solid var(--ln)',
                      background: reviewFilter === 'needs_help' ? '#fbbf24' : 'transparent',
                      color: reviewFilter === 'needs_help' ? '#000' : 'var(--mu)',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Needs Review ({batchSummary.needsHelpCount})
                  </button>
                </div>

                {/* 1-Tap Accept All High-Confidence Shortcut */}
                {batchSummary.highConfidenceCount > 0 && (
                  <button
                    type="button"
                    onClick={() => handleConfirmImport(true)}
                    disabled={step === 'saving'}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--ac)',
                      background: 'rgba(34, 197, 94, 0.12)',
                      color: 'var(--ac)',
                      fontSize: '12px',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    ✨ Accept All High-Confidence ({batchSummary.highConfidenceCount})
                  </button>
                )}
              </div>

              {/* Candidates List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {filteredCandidates.map((cand) => {
                  const isSelected = selectedIds.has(cand.id);
                  const candEdit = candidateEdits[cand.id] || {};
                  const effectiveDate = (candEdit.event_date ?? cand.event_date) ?? '';
                  const effectiveNotes = (candEdit.notes ?? cand.notes) ?? '';

                  return (
                    <div
                      key={cand.id}
                      style={{
                        padding: '14px',
                        background: isSelected ? '#121212' : '#090909',
                        border: '1px solid',
                        borderColor: isSelected ? 'rgba(34, 197, 94, 0.4)' : 'var(--ln)',
                        borderRadius: '10px',
                        opacity: cand.is_duplicate ? 0.6 : 1,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={cand.is_duplicate || step === 'saving'}
                            onChange={() => toggleCandidateSelection(cand.id)}
                            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                          />
                          <span style={{ fontWeight: 800, fontSize: '14px', color: 'var(--tx)' }}>
                            {candEdit.gear_text || cand.gear_text}
                          </span>

                          {cand.is_new_gear ? (
                            <span
                              style={{
                                fontSize: '10px',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: 'rgba(96, 165, 250, 0.15)',
                                color: '#60a5fa',
                                fontWeight: 800,
                                textTransform: 'uppercase',
                              }}
                            >
                              ✨ New Gear ({cand.gear_category || 'guitar'})
                            </span>
                          ) : (
                            <span
                              style={{
                                fontSize: '10px',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: 'rgba(34, 197, 94, 0.15)',
                                color: 'var(--ac)',
                                fontWeight: 800,
                              }}
                            >
                              🎸 Matched to {cand.matched_gear_name}
                            </span>
                          )}

                          {cand.is_duplicate && (
                            <span
                              style={{
                                fontSize: '10px',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: 'rgba(239, 68, 68, 0.15)',
                                color: '#f87171',
                                fontWeight: 800,
                              }}
                            >
                              ⚠️ Duplicate (Already in passport)
                            </span>
                          )}
                        </div>

                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            color: cand.confidence === 'high' ? '#4ade80' : '#fbbf24',
                            textTransform: 'uppercase',
                          }}
                        >
                          {cand.confidence}
                        </span>
                      </div>

                      {/* Event & Date Details */}
                      <div
                        style={{
                          marginTop: '10px',
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                          gap: '10px',
                        }}
                      >
                        <div>
                          <label style={{ display: 'block', fontSize: '10px', color: 'var(--mu)', fontWeight: 700 }}>
                            EVENT TYPE
                          </label>
                          <select
                            value={candEdit.event_type || cand.event_type}
                            onChange={(e) => updateCandidateField(cand.id, 'event_type', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              background: '#1a1a1a',
                              border: '1px solid var(--ln)',
                              borderRadius: '6px',
                              color: 'var(--tx)',
                              fontSize: '12px',
                            }}
                          >
                            <option value="strings">String change</option>
                            <option value="setup">Setup & intonation</option>
                            <option value="fret_work">Fret work</option>
                            <option value="electronics">Electronics / wiring</option>
                            <option value="pickups">Pickups</option>
                            <option value="hardware">Hardware / Bridge</option>
                            <option value="repair">Repair</option>
                            <option value="purchase">Purchase</option>
                            <option value="note">Note / log</option>
                          </select>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '10px', color: 'var(--mu)', fontWeight: 700 }}>
                            DATE
                          </label>
                          <input
                            type="date"
                            value={effectiveDate}
                            onChange={(e) => updateCandidateField(cand.id, 'event_date', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '5px 8px',
                              background: '#1a1a1a',
                              border: '1px solid var(--ln)',
                              borderRadius: '6px',
                              color: 'var(--tx)',
                              fontSize: '12px',
                              boxSizing: 'border-box',
                            }}
                          />
                        </div>
                      </div>

                      {/* Ambiguous Date Flag */}
                      {cand.is_date_ambiguous && cand.ambiguous_date_options && (
                        <div
                          style={{
                            marginTop: '8px',
                            padding: '8px 10px',
                            background: 'rgba(251, 191, 36, 0.1)',
                            border: '1px solid rgba(251, 191, 36, 0.25)',
                            borderRadius: '6px',
                            fontSize: '11px',
                            color: '#fbbf24',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '6px',
                          }}
                        >
                          <span>⚠️ Ambiguous date ({cand.raw_date}). Pick one:</span>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {cand.ambiguous_date_options.map((opt) => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => updateCandidateField(cand.id, 'event_date', opt)}
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  border: '1px solid',
                                  borderColor: effectiveDate === opt ? '#fbbf24' : 'var(--ln)',
                                  background: effectiveDate === opt ? '#fbbf24' : '#1e1e1e',
                                  color: effectiveDate === opt ? '#000' : '#fbbf24',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Notes input */}
                      <div style={{ marginTop: '8px' }}>
                        <input
                          type="text"
                          placeholder="Maintenance notes..."
                          value={effectiveNotes}
                          onChange={(e) => updateCandidateField(cand.id, 'notes', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            background: '#161616',
                            border: '1px solid var(--ln)',
                            borderRadius: '6px',
                            color: 'var(--tx)',
                            fontSize: '12px',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>

                      {/* Original Line snippet */}
                      <div style={{ marginTop: '6px', fontSize: '10.5px', color: '#555', fontFamily: 'monospace' }}>
                        Source: &ldquo;{cand.raw_line}&rdquo;
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Actions Bar */}
              <div
                style={{
                  marginTop: '20px',
                  paddingTop: '16px',
                  borderTop: '1px solid var(--ln)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setStep('input')}
                  disabled={step === 'saving'}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--ln)',
                    background: 'transparent',
                    color: 'var(--mu)',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  ← Edit Notes Text
                </button>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={onClose}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: '1px solid var(--ln)',
                      background: 'transparent',
                      color: 'var(--tx)',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConfirmImport(false)}
                    disabled={selectedIds.size === 0 || step === 'saving'}
                    style={{
                      padding: '8px 20px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'var(--ac)',
                      color: '#000',
                      fontSize: '13px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      opacity: selectedIds.size === 0 || step === 'saving' ? 0.5 : 1,
                    }}
                  >
                    {step === 'saving'
                      ? 'Saving to Passport...'
                      : `Save Selected (${selectedIds.size}) to Passport`}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SUCCESS SCREEN WITH 1-TAP UNDO */}
          {successInfo && (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 20px',
                background: 'rgba(34, 197, 94, 0.05)',
                border: '1px solid rgba(34, 197, 94, 0.2)',
                borderRadius: '12px',
                marginTop: '16px',
              }}
            >
              <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>🎉</span>
              <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 800, color: 'var(--ac)' }}>
                Import Confirmed!
              </h3>
              <p style={{ margin: '0 0 20px', fontSize: '13px', color: 'var(--mu)' }}>
                Successfully imported {successInfo.items} new instrument{successInfo.items === 1 ? '' : 's'} and{' '}
                {successInfo.logs} maintenance log{successInfo.logs === 1 ? '' : 's'}. Marked as{' '}
                <code style={{ color: 'var(--ac)' }}>source = &apos;imported&apos;</code>.
              </p>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                {undoBatchId && (
                  <button
                    type="button"
                    onClick={handleUndo}
                    disabled={isUndoing}
                    style={{
                      padding: '9px 18px',
                      borderRadius: '8px',
                      border: '1px solid #f87171',
                      background: 'rgba(239, 68, 68, 0.1)',
                      color: '#f87171',
                      fontSize: '13px',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    {isUndoing ? 'Reversing...' : '↩️ 1-Tap Undo Import'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '9px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'var(--ac)',
                    color: '#000',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
