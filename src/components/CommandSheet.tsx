'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';

interface CommandSheetProps {
  initialCommandMode?: 'text_and_voice' | 'text_only' | 'off';
}

export function CommandSheet({ initialCommandMode = 'text_and_voice' }: CommandSheetProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [commandMode, setCommandMode] = useState<'text_and_voice' | 'text_only' | 'off'>(initialCommandMode);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcribingNotice, setTranscribingNotice] = useState(false);
  const [commandResult, setCommandResult] = useState<{
    text: string;
    status: string;
    intent?: string;
    tool?: string;
    answer?: string;
    proposals?: Array<{
      id?: number | string;
      tool: string;
      title: string;
      summary: string;
      arguments?: Record<string, string | number | undefined>;
      targetGear?: { id: number; name: string };
    }>;
    ambiguous?: Array<{
      ref: string;
      candidates: Array<{ id: number; name: string }>;
    }>;
    unresolved?: string[];
    message?: string;
    gearContext?: string;
  } | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  // Step 3 Confirmation & Undo states
  const [savedActionIds, setSavedActionIds] = useState<number[]>([]);
  const [undoneActionIds, setUndoneActionIds] = useState<number[]>([]);
  const [skippedActionIds, setSkippedActionIds] = useState<number[]>([]);
  const [editingActionId, setEditingActionId] = useState<number | null>(null);
  const [actionEdits, setActionEdits] = useState<Record<number, Record<string, string | number | undefined>>>({});
  const [undoToast, setUndoToast] = useState<{ actionId: number; title: string; visible: boolean } | null>(null);

  const textInputRef = useRef<HTMLInputElement>(null);

  // Audio recording hook
  const {
    isRecording,
    recordingSeconds,
    maxSeconds,
    startRecording,
    stopRecording,
    cancelRecording,
    error: recorderError,
  } = useAudioRecorder(30);

  // Extract gearId if active screen is a Gear Passport page
  const gearIdMatch = pathname.match(/^\/rig\/(\d+)/);
  const gearId = gearIdMatch ? gearIdMatch[1] : undefined;

  // Listen for preference updates from Setup screen
  useEffect(() => {
    function handleModeChange(e: Event) {
      const customEvent = e as CustomEvent<'text_and_voice' | 'text_only' | 'off'>;
      if (customEvent.detail) {
        setCommandMode(customEvent.detail);
      }
    }
    window.addEventListener('ryff_command_mode_changed', handleModeChange);
    return () => window.removeEventListener('ryff_command_mode_changed', handleModeChange);
  }, []);

  // Global hotkey: Ctrl+K or Cmd+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        if (commandMode !== 'off') {
          e.preventDefault();
          setIsOpen((prev) => !prev);
        }
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandMode, isOpen]);

  // Adjust state when sheet opens
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setApiError(null);
      setCommandResult(null);
    }
  }

  // Focus input when sheet opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => textInputRef.current?.focus(), 150);
      return () => clearTimeout(timer);
    } else {
      cancelRecording();
    }
  }, [isOpen, cancelRecording]);

  // Handle voice recording stop and transcription
  async function handleToggleMic() {
    if (isRecording) {
      setTranscribingNotice(true);
      setApiError(null);
      const recordResult = await stopRecording();
      if (!recordResult || !recordResult.audioBase64) {
        setTranscribingNotice(false);
        return;
      }

      try {
        const res = await fetch('/api/command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioBase64: recordResult.audioBase64,
            audioMimeType: recordResult.audioMimeType,
            context: {
              screen: pathname,
              gearId,
            },
          }),
        });

        const data = await res.json();
        if (res.ok && data.text) {
          setInputText(data.text);
          // Focus text input so the user can easily review or correct before sending
          textInputRef.current?.focus();
        } else {
          setApiError(data.error || 'Transcription failed. Please try speaking again.');
        }
      } catch {
        setApiError('Network error transcribing audio.');
      } finally {
        setTranscribingNotice(false);
      }
    } else {
      setApiError(null);
      await startRecording();
    }
  }

  // Handle text command submission
  async function handleSendCommand(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const clean = inputText.trim();
    if (!clean || isProcessing) return;

    setIsProcessing(true);
    setApiError(null);
    setCommandResult(null);

    try {
      const res = await fetch('/api/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: clean,
          context: {
            screen: pathname,
            gearId,
          },
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setCommandResult({
          text: data.text,
          status: data.status,
          intent: data.intent,
          tool: data.tool,
          answer: data.answer,
          proposals: data.proposals || [],
          ambiguous: data.ambiguous,
          unresolved: data.unresolved,
          message: data.message,
          gearContext: data.context?.gearContext,
        });
        setSavedActionIds([]);
        setUndoneActionIds([]);
        setSkippedActionIds([]);
        setEditingActionId(null);
        setActionEdits({});
        setInputText('');
      } else {
        setApiError(data.error || 'Failed to process command.');
      }
    } catch {
      setApiError('Network error sending command.');
    } finally {
      setIsProcessing(false);
    }
  }

  // Confirm single proposed action
  async function handleConfirmAction(actionId: number, title?: string) {
    try {
      const edit = actionEdits[actionId];
      const res = await fetch('/api/command/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionId,
          edits: edit ? { [actionId]: edit } : undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSavedActionIds((prev) => [...prev, actionId]);
        setUndoneActionIds((prev) => prev.filter((id) => id !== actionId));
        setEditingActionId(null);
        setUndoToast({
          actionId,
          title: title || 'Action saved to Passport',
          visible: true,
        });
      } else {
        setApiError(data.error || 'Failed to save action.');
      }
    } catch {
      setApiError('Network error saving action.');
    }
  }

  // Confirm all pending actions
  async function handleConfirmAll() {
    if (!commandResult?.proposals) return;
    const pendingIds = commandResult.proposals
      .map((p) => Number(p.id))
      .filter((id) => !savedActionIds.includes(id) && !skippedActionIds.includes(id));

    if (pendingIds.length === 0) return;

    try {
      const res = await fetch('/api/command/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionIds: pendingIds,
          edits: actionEdits,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSavedActionIds((prev) => [...prev, ...pendingIds]);
        setEditingActionId(null);
        setUndoToast({
          actionId: pendingIds[pendingIds.length - 1],
          title: `${pendingIds.length} actions saved to Passport`,
          visible: true,
        });
      } else {
        setApiError(data.error || 'Failed to save all actions.');
      }
    } catch {
      setApiError('Network error saving actions.');
    }
  }

  // Undo confirmed action
  async function handleUndoAction(actionId: number) {
    try {
      const res = await fetch('/api/command/undo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionId }),
      });

      const data = await res.json();
      if (res.ok) {
        setUndoneActionIds((prev) => [...prev, actionId]);
        setSavedActionIds((prev) => prev.filter((id) => id !== actionId));
        setUndoToast(null);
      } else {
        setApiError(data.error || 'Failed to undo action.');
      }
    } catch {
      setApiError('Network error undoing action.');
    }
  }

  // Skip proposed action
  async function handleSkipAction(actionId: number) {
    try {
      await fetch('/api/command/skip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionId }),
      });
      setSkippedActionIds((prev) => [...prev, actionId]);
      if (editingActionId === actionId) setEditingActionId(null);
    } catch {
      setSkippedActionIds((prev) => [...prev, actionId]);
    }
  }

  function handleEditField(actionId: number, field: string, val: string | number | undefined) {
    setActionEdits((prev) => ({
      ...prev,
      [actionId]: {
        ...(prev[actionId] || {}),
        [field]: val,
      },
    }));
  }

  // If user turned command input off in Setup, do not render trigger or sheet
  if (commandMode === 'off') {
    return null;
  }

  return (
    <>
      {/* Floating Entry Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open Ryff Command"
        style={{
          position: 'fixed',
          bottom: '80px',
          right: '18px',
          zIndex: 90,
          background: 'rgba(18, 18, 18, 0.92)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          boxShadow: '0 6px 24px rgba(0, 0, 0, 0.65), 0 0 14px rgba(229, 57, 53, 0.25)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          color: '#fff',
          padding: '10px 16px',
          borderRadius: '30px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '13px',
          fontWeight: 800,
          cursor: 'pointer',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--ac)';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.18)';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        <span style={{ color: 'var(--ac)', fontSize: '15px' }}>⚡</span>
        <span>Tell Ryff</span>
        <span
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '10px',
            color: 'var(--mu)',
            fontWeight: 700,
          }}
        >
          ⌘K
        </span>
      </button>

      {/* Command Sheet Backdrop & Modal */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="command-sheet-title"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 110,
            background: 'rgba(0, 0, 0, 0.78)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            padding: '0 12px 18px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          <div
            style={{
              background: '#121212',
              border: '1px solid var(--ln)',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '640px',
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.85)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              animation: 'slideUp 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
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
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '18px', color: 'var(--ac)' }}>⚡</span>
                <div>
                  <h2
                    id="command-sheet-title"
                    style={{
                      margin: 0,
                      fontSize: '15px',
                      fontWeight: 900,
                      letterSpacing: '-0.01em',
                      color: 'var(--tx)',
                      textTransform: 'none',
                    }}
                  >
                    Ryff Command
                  </h2>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--mu)' }}>
                    Tell Ryff something or ask a question.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {gearId && (
                  <span
                    style={{
                      background: 'rgba(229, 57, 53, 0.15)',
                      border: '1px solid var(--ac)',
                      color: 'var(--ac)',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 800,
                    }}
                  >
                    Target: Gear #{gearId}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  style={{
                    color: 'var(--mu)',
                    fontSize: '18px',
                    fontWeight: 700,
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.05)',
                  }}
                  aria-label="Close Command Sheet"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Audio Recording Live State Banner */}
              {isRecording && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(229, 57, 53, 0.12)',
                    border: '1px solid var(--ac)',
                    borderRadius: '10px',
                    padding: '10px 14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: 'var(--ac)',
                        animation: 'pulse 1s infinite',
                      }}
                    />
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#fff' }}>
                      Listening... Speak your command or question
                    </span>
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--ac)' }}>
                    0:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds} / 0:{maxSeconds}
                  </span>
                </div>
              )}

              {/* Transcribing In-Progress Spinner */}
              {transcribingNotice && (
                <div
                  style={{
                    background: '#1a1a1a',
                    border: '1px solid var(--ln)',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '13px',
                    color: 'var(--ac)',
                    fontWeight: 700,
                  }}
                >
                  <span>⏳</span>
                  <span>Transcribing your speech with Gemini...</span>
                </div>
              )}

              {/* Error Alert */}
              {(apiError || recorderError) && (
                <div
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid #ef4444',
                    color: '#f87171',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                  }}
                >
                  {apiError || recorderError}
                </div>
              )}

              {/* Proposal Cards & Disambiguation */}
              {commandResult && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Summary Header */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '12px',
                      color: 'var(--mu)',
                      padding: '0 4px',
                    }}
                  >
                    <span>Command: &ldquo;{commandResult.text}&rdquo;</span>
                    {commandResult.gearContext && (
                      <span style={{ color: 'var(--ac2)', fontWeight: 700 }}>
                        Context: {commandResult.gearContext}
                      </span>
                    )}
                  </div>

                  {/* Ambiguous Reference Candidates Picker */}
                  {commandResult.ambiguous && commandResult.ambiguous.length > 0 && (
                    <div
                      style={{
                        background: 'rgba(245, 158, 11, 0.1)',
                        border: '1px solid #f59e0b',
                        borderRadius: '12px',
                        padding: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                      }}
                    >
                      {commandResult.ambiguous.map((amb, idx) => (
                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 800, color: '#fbbf24' }}>
                            Which instrument did you mean by &ldquo;{amb.ref || 'gear'}&rdquo;?
                          </span>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {amb.candidates.map((cand) => (
                              <button
                                key={cand.id}
                                type="button"
                                onClick={() => {
                                  setInputText(`${commandResult.text} on the ${cand.name}`);
                                  textInputRef.current?.focus();
                                }}
                                style={{
                                  background: 'rgba(255, 255, 255, 0.08)',
                                  border: '1px solid var(--ln)',
                                  color: '#fff',
                                  padding: '6px 12px',
                                  borderRadius: '8px',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                {cand.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Unresolved References Notice */}
                  {commandResult.unresolved && commandResult.unresolved.length > 0 && (
                    <div
                      style={{
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid var(--ln)',
                        borderRadius: '10px',
                        padding: '10px 14px',
                        fontSize: '12px',
                        color: 'var(--mu)',
                      }}
                    >
                      Could not match &ldquo;{commandResult.unresolved.join(', ')}&rdquo; to any owned gear in your Rig Passport.
                    </div>
                  )}

                  {/* Valid Proposals List */}
                  {commandResult.proposals && commandResult.proposals.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {/* Batch Save All header if multiple pending actions */}
                      {commandResult.proposals.filter(
                        (p) => !savedActionIds.includes(Number(p.id)) && !skippedActionIds.includes(Number(p.id))
                      ).length >= 2 && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px dashed var(--ln)',
                            borderRadius: '10px',
                            padding: '8px 12px',
                          }}
                        >
                          <span style={{ fontSize: '12px', color: 'var(--mu)', fontWeight: 600 }}>
                            {
                              commandResult.proposals.filter(
                                (p) => !savedActionIds.includes(Number(p.id)) && !skippedActionIds.includes(Number(p.id))
                              ).length
                            }{' '}
                            actions ready for review
                          </span>
                          <button
                            type="button"
                            onClick={handleConfirmAll}
                            style={{
                              background: '#10b981',
                              border: 'none',
                              color: '#fff',
                              borderRadius: '8px',
                              padding: '6px 14px',
                              fontSize: '12px',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <span>✓</span>
                            <span>Save All</span>
                          </button>
                        </div>
                      )}

                      {commandResult.proposals.map((prop, idx) => {
                        const actionId = Number(prop.id || idx);
                        const isSaved = savedActionIds.includes(actionId);
                        const isUndone = undoneActionIds.includes(actionId);
                        const isSkipped = skippedActionIds.includes(actionId);
                        const isEditing = editingActionId === actionId;
                        const currentEdit: Record<string, string | number | undefined> = actionEdits[actionId] || {};

                        if (isSkipped) {
                          return (
                            <div
                              key={actionId}
                              style={{
                                background: 'rgba(255, 255, 255, 0.02)',
                                border: '1px solid rgba(255, 255, 255, 0.06)',
                                borderRadius: '10px',
                                padding: '8px 12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                opacity: 0.6,
                              }}
                            >
                              <span style={{ fontSize: '12px', color: 'var(--mu)', textDecoration: 'line-through' }}>
                                {prop.title}
                              </span>
                              <button
                                type="button"
                                onClick={() => setSkippedActionIds((prev) => prev.filter((id) => id !== actionId))}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--mu)',
                                  fontSize: '11px',
                                  cursor: 'pointer',
                                  textDecoration: 'underline',
                                }}
                              >
                                Restore
                              </button>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={actionId}
                            style={{
                              background: isSaved
                                ? 'rgba(16, 185, 129, 0.06)'
                                : isUndone
                                ? 'rgba(245, 158, 11, 0.06)'
                                : 'rgba(255, 255, 255, 0.04)',
                              border: `1px solid ${
                                isSaved ? '#10b981' : isUndone ? '#f59e0b' : 'var(--ln)'
                              }`,
                              borderRadius: '12px',
                              padding: '14px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px',
                              transition: 'all 0.2s ease',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 900,
                                  color: isSaved
                                    ? '#34d399'
                                    : isUndone
                                    ? '#fbbf24'
                                    : prop.tool === 'log_maintenance'
                                    ? 'var(--ac)'
                                    : 'var(--ac2)',
                                  letterSpacing: '0.04em',
                                }}
                              >
                                {isSaved
                                  ? '✓ SAVED TO PASSPORT'
                                  : isUndone
                                  ? '↺ REVERSED (UNDONE)'
                                  : prop.tool === 'log_maintenance'
                                  ? '🔧 PROPOSED MAINTENANCE'
                                  : '🛒 PROPOSED WANT'}
                              </span>
                              <span
                                style={{
                                  fontSize: '10px',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  background: 'rgba(255, 255, 255, 0.08)',
                                  color: 'var(--mu)',
                                  fontWeight: 700,
                                }}
                              >
                                Action #{actionId}
                              </span>
                            </div>

                            <b style={{ fontSize: '14px', color: '#fff' }}>{prop.title}</b>
                            <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--mu)', lineHeight: 1.4 }}>
                              {prop.summary}
                            </p>

                            {/* Inline Editing Form */}
                            {isEditing && (
                              <div
                                style={{
                                  marginTop: '6px',
                                  padding: '10px',
                                  background: 'rgba(0, 0, 0, 0.4)',
                                  border: '1px solid var(--ln)',
                                  borderRadius: '8px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '8px',
                                }}
                              >
                                <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--tx)' }}>
                                  Edit action details:
                                </span>
                                {prop.tool === 'log_maintenance' ? (
                                  <>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                      <input
                                        type="date"
                                        value={
                                          currentEdit.event_date ??
                                          prop.arguments?.event_date ??
                                          new Date().toISOString().split('T')[0]
                                        }
                                        onChange={(e) => handleEditField(actionId, 'event_date', e.target.value)}
                                        style={{
                                          background: 'rgba(255, 255, 255, 0.08)',
                                          border: '1px solid var(--ln)',
                                          borderRadius: '6px',
                                          color: '#fff',
                                          padding: '4px 8px',
                                          fontSize: '12px',
                                        }}
                                      />
                                      <input
                                        type="text"
                                        placeholder="Component (e.g. Strings, Pickups)"
                                        value={currentEdit.component ?? prop.arguments?.component ?? ''}
                                        onChange={(e) => handleEditField(actionId, 'component', e.target.value)}
                                        style={{
                                          flex: 1,
                                          background: 'rgba(255, 255, 255, 0.08)',
                                          border: '1px solid var(--ln)',
                                          borderRadius: '6px',
                                          color: '#fff',
                                          padding: '4px 8px',
                                          fontSize: '12px',
                                        }}
                                      />
                                    </div>
                                    <input
                                      type="text"
                                      placeholder="Notes / description..."
                                      value={currentEdit.notes ?? prop.arguments?.notes ?? ''}
                                      onChange={(e) => handleEditField(actionId, 'notes', e.target.value)}
                                      style={{
                                        background: 'rgba(255, 255, 255, 0.08)',
                                        border: '1px solid var(--ln)',
                                        borderRadius: '6px',
                                        color: '#fff',
                                        padding: '4px 8px',
                                        fontSize: '12px',
                                      }}
                                    />
                                  </>
                                ) : (
                                  <>
                                    <input
                                      type="text"
                                      placeholder="Wanted gear item..."
                                      value={currentEdit.item_text ?? prop.arguments?.item_text ?? ''}
                                      onChange={(e) => handleEditField(actionId, 'item_text', e.target.value)}
                                      style={{
                                        background: 'rgba(255, 255, 255, 0.08)',
                                        border: '1px solid var(--ln)',
                                        borderRadius: '6px',
                                        color: '#fff',
                                        padding: '4px 8px',
                                        fontSize: '12px',
                                      }}
                                    />
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                      <input
                                        type="number"
                                        placeholder="Max price (GBP)"
                                        value={currentEdit.max_price ?? prop.arguments?.max_price ?? ''}
                                        onChange={(e) =>
                                          handleEditField(
                                            actionId,
                                            'max_price',
                                            e.target.value ? Number(e.target.value) : undefined
                                          )
                                        }
                                        style={{
                                          flex: 1,
                                          background: 'rgba(255, 255, 255, 0.08)',
                                          border: '1px solid var(--ln)',
                                          borderRadius: '6px',
                                          color: '#fff',
                                          padding: '4px 8px',
                                          fontSize: '12px',
                                        }}
                                      />
                                    </div>
                                  </>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2px' }}>
                                  <button
                                    type="button"
                                    onClick={() => setEditingActionId(null)}
                                    style={{
                                      background: 'rgba(255, 255, 255, 0.1)',
                                      border: '1px solid var(--ln)',
                                      color: '#fff',
                                      borderRadius: '6px',
                                      padding: '4px 10px',
                                      fontSize: '11px',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Done Editing
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Card Action Buttons */}
                            <div style={{ display: 'flex', gap: '8px', marginTop: '4px', alignItems: 'center' }}>
                              {!isSaved && (
                                <button
                                  type="button"
                                  onClick={() => handleConfirmAction(actionId, prop.title)}
                                  style={{
                                    background: isUndone ? 'rgba(245, 158, 11, 0.8)' : '#10b981',
                                    border: 'none',
                                    color: '#fff',
                                    borderRadius: '8px',
                                    padding: '6px 14px',
                                    fontSize: '12px',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                  }}
                                >
                                  {isUndone ? '↺ Re-save' : 'Save'}
                                </button>
                              )}

                              {isSaved && (
                                <button
                                  type="button"
                                  onClick={() => handleUndoAction(actionId)}
                                  style={{
                                    background: 'rgba(239, 68, 68, 0.15)',
                                    border: '1px solid #ef4444',
                                    color: '#f87171',
                                    borderRadius: '8px',
                                    padding: '6px 14px',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                  }}
                                >
                                  Undo
                                </button>
                              )}

                              {!isSaved && !isUndone && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setEditingActionId(isEditing ? null : actionId)}
                                    style={{
                                      background: isEditing ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                                      border: '1px solid var(--ln)',
                                      color: '#fff',
                                      borderRadius: '8px',
                                      padding: '6px 12px',
                                      fontSize: '12px',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    {isEditing ? 'Hide Edit' : 'Edit'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSkipAction(actionId)}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: 'var(--mu)',
                                      fontSize: '12px',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                      padding: '6px 8px',
                                    }}
                                  >
                                    Skip
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : commandResult.answer ? (
                    /* Read-Only Answer Card (query_rig, query_deals, explain_app, chat) */
                    <div
                      style={{
                        background:
                          commandResult.intent === 'app_help'
                            ? 'rgba(59, 130, 246, 0.08)'
                            : commandResult.intent === 'query'
                            ? 'rgba(16, 185, 129, 0.08)'
                            : 'rgba(239, 68, 68, 0.08)',
                        border: `1px solid ${
                          commandResult.intent === 'app_help'
                            ? 'rgba(59, 130, 246, 0.3)'
                            : commandResult.intent === 'query'
                            ? 'rgba(16, 185, 129, 0.3)'
                            : 'rgba(239, 68, 68, 0.3)'
                        }`,
                        borderRadius: '14px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '16px' }}>
                            {commandResult.tool === 'explain_app'
                              ? '📖'
                              : commandResult.tool === 'query_deals'
                              ? '🏷️'
                              : commandResult.tool === 'chat'
                              ? '⚡'
                              : '🎸'}
                          </span>
                          <span
                            style={{
                              fontSize: '12px',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              color:
                                commandResult.intent === 'app_help'
                                  ? '#60a5fa'
                                  : commandResult.intent === 'query'
                                  ? '#34d399'
                                  : '#f87171',
                            }}
                          >
                            {commandResult.tool === 'explain_app'
                              ? 'Ryff Help Guide'
                              : commandResult.tool === 'query_deals'
                              ? 'Trader & Deals Radar'
                              : commandResult.tool === 'chat'
                              ? 'Backstage Bot Take'
                              : 'Rig Passport Intelligence'}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: 'rgba(255, 255, 255, 0.08)',
                            color: 'var(--mu)',
                          }}
                        >
                          READ-ONLY
                        </span>
                      </div>

                      <div
                        style={{
                          fontSize: '13.5px',
                          lineHeight: '1.55',
                          color: '#f1f5f9',
                          whiteSpace: 'pre-line',
                        }}
                      >
                        {commandResult.answer}
                      </div>

                      {commandResult.tool === 'chat' && (
                        <div style={{ marginTop: '4px' }}>
                          <a
                            href="/backstage"
                            onClick={() => setIsOpen(false)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '12px',
                              fontWeight: 700,
                              color: '#fff',
                              background: 'var(--ac)',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              textDecoration: 'none',
                            }}
                          >
                            <span>Debate Hank & Vee in Backstage</span>
                            <span>→</span>
                          </a>
                        </div>
                      )}
                    </div>
                  ) : commandResult.status === 'quota_exceeded' ? (
                    <div
                      style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid #ef4444',
                        borderRadius: '12px',
                        padding: '14px',
                        fontSize: '13px',
                        color: '#f87171',
                        fontWeight: 600,
                      }}
                    >
                      {commandResult.message || 'Daily command quota reached. Limits reset tomorrow morning.'}
                    </div>
                  ) : !commandResult.ambiguous && !commandResult.unresolved ? (
                    <div
                      style={{
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid var(--ln)',
                        borderRadius: '12px',
                        padding: '14px',
                        fontSize: '13px',
                        color: 'var(--mu)',
                      }}
                    >
                      {commandResult.message || 'No proposed actions identified.'}
                    </div>
                  ) : null}
                </div>
              )}

              {/* Undo Toast Banner */}
              {undoToast && undoToast.visible && (
                <div
                  role="status"
                  style={{
                    background: 'rgba(18, 18, 20, 0.95)',
                    border: '1px solid #10b981',
                    borderRadius: '12px',
                    padding: '10px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6), 0 0 16px rgba(16, 185, 129, 0.25)',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  <span style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>✓</span>
                    <span>{undoToast.title}</span>
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => handleUndoAction(undoToast.actionId)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.15)',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        color: '#fff',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '12px',
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      Undo
                    </button>
                    <button
                      type="button"
                      onClick={() => setUndoToast(null)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--mu)',
                        fontSize: '14px',
                        cursor: 'pointer',
                        padding: '2px 4px',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}

              {/* Command Input Form */}
              <form onSubmit={handleSendCommand} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <input
                    ref={textInputRef}
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={
                      gearId
                        ? 'Tell Ryff about this gear (e.g. Changed strings to 10-46 today)...'
                        : 'e.g. Put Elixir 9-42s on the PRS, or looking for a Soldano SLO under £2k...'
                    }
                    disabled={isProcessing || isRecording}
                    style={{
                      width: '100%',
                      background: '#0a0a0a',
                      border: '1px solid var(--ln)',
                      color: 'var(--tx)',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      fontSize: '13.5px',
                      outline: 'none',
                      transition: 'border-color 0.15s',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--ac)')}
                    onBlur={(e) => (e.target.style.borderColor = 'var(--ln)')}
                  />
                </div>

                {/* 🎙️ Quick-Mic Button (rendered when commandMode === 'text_and_voice') */}
                {commandMode === 'text_and_voice' && (
                  <button
                    type="button"
                    onClick={handleToggleMic}
                    disabled={isProcessing || transcribingNotice}
                    title={isRecording ? 'Stop and transcribe' : 'Record voice memo'}
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '12px',
                      background: isRecording ? 'var(--ac)' : 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid',
                      borderColor: isRecording ? 'var(--ac)' : 'var(--ln)',
                      color: isRecording ? '#000' : '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      cursor: 'pointer',
                      flexShrink: 0,
                      transition: 'all 0.15s',
                    }}
                  >
                    {isRecording ? '⏹' : '🎙️'}
                  </button>
                )}

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={!inputText.trim() || isProcessing || isRecording}
                  style={{
                    height: '46px',
                    padding: '0 18px',
                    borderRadius: '12px',
                    background: inputText.trim() ? 'var(--ac)' : 'rgba(255, 255, 255, 0.05)',
                    border: 'none',
                    color: inputText.trim() ? '#000' : 'var(--mu)',
                    fontWeight: 800,
                    fontSize: '13px',
                    cursor: inputText.trim() ? 'pointer' : 'default',
                    flexShrink: 0,
                    transition: 'all 0.15s',
                  }}
                >
                  {isProcessing ? 'Sending...' : 'Send'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
