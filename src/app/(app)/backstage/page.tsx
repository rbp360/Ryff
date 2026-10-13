'use client';

import { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { BackButton } from '@/components/BackButton';
import { getAllBots, getBot, DEFAULT_BOT_ID } from '@/lib/bots';

interface ChatMessage {
  id?: string | number;
  role: 'user' | 'assistant';
  content: string;
}

interface UsageInfo {
  msgsToday: number;
  dailyCap: number;
}

const BOT_THEMES: Record<string, { accent: string; bg: string; badge: string; gradient: string }> = {
  robbpaul: {
    accent: '#22c55e',
    bg: 'rgba(34, 197, 94, 0.15)',
    badge: 'Companion',
    gradient: 'linear-gradient(135deg, #15803d, #14532d)',
  },
  stevie: {
    accent: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.15)',
    badge: 'Purist',
    gradient: 'linear-gradient(135deg, #b45309, #78350f)',
  },
  tim: {
    accent: '#38bdf8',
    bg: 'rgba(56, 189, 248, 0.15)',
    badge: 'DSP Tech',
    gradient: 'linear-gradient(135deg, #0284c7, #075985)',
  },
  hank: {
    accent: '#ea580c',
    bg: 'rgba(234, 88, 12, 0.15)',
    badge: 'Luthier',
    gradient: 'linear-gradient(135deg, #c2410c, #7c2d12)',
  },
  mcgee: {
    accent: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.15)',
    badge: 'High-Gain',
    gradient: 'linear-gradient(135deg, #b91c1c, #7f1d1d)',
  },
};

const BOT_STARTER_PROMPTS: Record<string, string[]> = {
  robbpaul: [
    "Is a £2k guitar really 4x better than a £500 one?",
    "What's the smartest £300 upgrade for a gigging rig?",
    "Are in-ear monitors actually ruining live stage vibe?",
    "Should I buy new gear or stick to the used market?",
  ],
  stevie: [
    "Stevie, is digital modelling ever going to capture true tube sag?",
    "Does nitro lacquer actually let the tonewood breathe?",
    "Defend heavy strings (11s+) against slinky 9s.",
    "What's the secret to dynamic picking touch and volume roll-off?",
  ],
  tim: [
    "Tim, pitch me the Quad Cortex over carrying a 100W valve head.",
    "How do I properly gain-stage and low-pass my IRs?",
    "Can anyone actually hear Brazilian rosewood in a dense multitrack mix?",
    "Why switch to a headless multi-scale ergonomic guitar?",
  ],
  hank: [
    "Hank, is digital modelling just disposable consumer rubbish?",
    "What's the most common amateur truss rod mistake?",
    "Why charge £350 for an overdrive with 3 pence worth of silicon?",
    "Point-to-point wiring vs PCB: is handwired really more reliable?",
  ],
  mcgee: [
    "McGee, how do I make a cheap pawnshop beater chug?",
    "Peavey 5150 vs modern digital amps: which hits harder?",
    "What hot bridge pickup should I drop into my project guitar?",
    "Is modding cheap guitars actually worth the trouble?",
  ],
};

function getLoadingText(botId: string): string {
  switch (botId) {
    case 'robbpaul':
      return 'Rob is sizing up your rig...';
    case 'stevie':
      return 'Stevie is checking the tube sag...';
    case 'tim':
      return 'Tim is crunching the DSP curves...';
    case 'hank':
      return 'Hank is wiping down the workbench...';
    case 'mcgee':
      return 'McGee is cranking the gain...';
    default:
      return 'Thinking...';
  }
}

function renderParagraphContent(paraText: string, isUser: boolean, activeAccent: string) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  // Matches markdown links where label can contain inner brackets like [News] or [Review]
  const linkRegex = /\[((?:[^[\]]|\[[^[\]]*\])*)\]\(((\/api\/out|https?:\/\/)[^)]+)\)/g;

  while ((match = linkRegex.exec(paraText)) !== null) {
    const [fullMatch, rawLabel, rawUrl] = match;
    const matchStart = match.index;

    if (matchStart > lastIndex) {
      parts.push(paraText.slice(lastIndex, matchStart));
    }

    // Determine clean label:
    // If the label is long (like a full article title from historical messages) or already says "link",
    // clean it up to "link ↗". If it's a deal with price, format neatly like "deal (£450) ↗" or "link ↗".
    let label = rawLabel.trim();
    const tooltipTitle = label;

    if (label.toLowerCase() !== 'link' && !/^deal\s*\(/i.test(label) && label.length > 15) {
      label = 'link';
    }

    parts.push(
      <a
        key={`${matchStart}-${rawUrl}`}
        href={rawUrl}
        target="_blank"
        rel="noopener noreferrer"
        title={tooltipTitle}
        className="chat-link"
        style={
          isUser
            ? undefined
            : {
                color: activeAccent,
                borderColor: `${activeAccent}44`,
                backgroundColor: `${activeAccent}18`,
              }
        }
        onClick={(e) => e.stopPropagation()}
      >
        {label} ↗
      </a>
    );

    lastIndex = matchStart + fullMatch.length;
  }

  if (lastIndex < paraText.length) {
    parts.push(paraText.slice(lastIndex));
  }

  return parts.length > 0 ? parts : paraText;
}

function renderMessageContent(content: string, isUser: boolean, activeAccent: string) {
  if (!content) return null;
  const trimmed = content.trim();

  // Split on double newlines for distinct paragraphs
  const paragraphs = trimmed.split(/\n{2,}/);

  return (
    <div className="txt">
      {paragraphs.map((para, pIdx) => {
        const cleanPara = para.trim();
        if (!cleanPara) return null;
        return (
          <p key={pIdx} className="msg-para">
            {renderParagraphContent(cleanPara, isUser, activeAccent)}
          </p>
        );
      })}
    </div>
  );
}

function BackstageChatInner() {
  const searchParams = useSearchParams();
  const requestedBotParam = searchParams.get('bot');
  const allBots = useMemo(() => getAllBots(), []);

  const [activeBotId, setActiveBotId] = useState<string>(() => {
    if (requestedBotParam) {
      return getBot(requestedBotParam).id;
    }
    return DEFAULT_BOT_ID;
  });

  const activeBot = useMemo(() => getBot(activeBotId), [activeBotId]);
  const activeTheme = BOT_THEMES[activeBot.id] || BOT_THEMES.robbpaul;
  const [showRosterPreview, setShowRosterPreview] = useState(false);

  // Sync if URL search parameter changes
  useEffect(() => {
    if (requestedBotParam) {
      const resolved = getBot(requestedBotParam).id;
      setActiveBotId(resolved);
    }
  }, [requestedBotParam]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [historyCache, setHistoryCache] = useState<Record<string, ChatMessage[]>>({});
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [usage, setUsage] = useState<UsageInfo>({ msgsToday: 0, dailyCap: 10 });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ignore = false;
    async function fetchHistory() {
      // If cached locally, display immediately without flicker
      if (historyCache[activeBotId]) {
        setMessages(historyCache[activeBotId]);
      } else {
        setMessages([]);
      }

      setLoadingHistory(true);
      try {
        const res = await fetch(`/api/chat?bot=${activeBotId}`);
        if (res.ok && !ignore) {
          const data = await res.json();
          const loadedMsgs = data.messages || [];
          setMessages(loadedMsgs);
          setHistoryCache((prev) => ({ ...prev, [activeBotId]: loadedMsgs }));
          if (data.usage) {
            setUsage(data.usage);
          }
        }
      } catch (err) {
        console.error('Failed to load chat history:', err);
      } finally {
        if (!ignore) setLoadingHistory(false);
      }
    }

    fetchHistory();
    return () => {
      ignore = true;
    };
  }, [activeBotId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function sendMessage(textToSend?: string) {
    const messageText = textToSend || input;
    if (!messageText.trim() || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: messageText };
    setMessages((prev) => {
      const updated = [...prev, userMsg];
      setHistoryCache((cache) => ({ ...cache, [activeBotId]: updated }));
      return updated;
    });
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bot: activeBotId, message: messageText }),
      });

      const data = await res.json();
      if (data.usage) {
        setUsage(data.usage);
      }

      const replyContent = !res.ok
        ? data.text || data.error || 'Unable to complete message.'
        : data.text || '';

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: replyContent,
      };

      setMessages((prev) => {
        const updated = [...prev, assistantMsg];
        setHistoryCache((cache) => ({ ...cache, [activeBotId]: updated }));
        return updated;
      });
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Network error. Please try again.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="top" style={{ marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <BackButton fallbackHref="/" />
          <h1 style={{ marginBottom: 0 }}>Backstage</h1>
        </div>
        <Link href="/setup" className="gearbtn" aria-label="Setup">
          ⚙
        </Link>
      </div>
      <p className="sub">
        1-on-1 private debate and gear sparring. Active: <b style={{ color: activeTheme.accent }}>{activeBot.name}</b>
      </p>

      {/* 5-Bot Master Roster Showcase Banner */}
      <div
        className="card"
        style={{
          marginTop: '12px',
          padding: 0,
          overflow: 'hidden',
          border: '1px solid var(--ln)',
          borderRadius: 'var(--r)',
          background: '#0d0d0d',
          position: 'relative',
        }}
      >
        <div
          style={{ position: 'relative', width: '100%', cursor: 'pointer' }}
          onClick={() => setShowRosterPreview((v) => !v)}
          title="Click to expand/collapse full roster photo"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/5xbots.jpg"
            alt="Ryff 5-Bot Roster Lineup"
            style={{
              width: '100%',
              height: showRosterPreview ? 'auto' : '105px',
              maxHeight: showRosterPreview ? '520px' : '105px',
              objectFit: 'cover',
              objectPosition: 'center 20%',
              display: 'block',
              transition: 'all 0.3s ease',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: showRosterPreview
                ? 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 40%)'
                : 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.3) 60%, transparent 100%)',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              padding: '10px 14px',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '10.5px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  color: 'var(--ac)',
                  letterSpacing: '0.08em',
                }}
              >
                The Ryff Roster
              </div>
              <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#fff' }}>
                5 Opposing Gear Philosophies
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowRosterPreview((v) => !v);
              }}
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#fff',
                background: 'rgba(0,0,0,0.6)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '6px',
                padding: '4px 9px',
                cursor: 'pointer',
                backdropFilter: 'blur(4px)',
              }}
            >
              {showRosterPreview ? '▲ Collapse' : '▼ Full Lineup'}
            </button>
          </div>
        </div>
      </div>

      {/* Bot Persona Switcher Carousel / Tab Row */}
      <div className="card" style={{ marginTop: '12px', padding: '14px' }}>
        <div
          style={{
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            paddingBottom: '4px',
            scrollbarWidth: 'none',
          }}
        >
          {allBots.map((b) => {
            const isSelected = b.id === activeBotId;
            const theme = BOT_THEMES[b.id] || BOT_THEMES.robbpaul;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => setActiveBotId(b.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '7px 11px',
                  borderRadius: '10px',
                  border: isSelected ? `1.5px solid ${theme.accent}` : '1px solid var(--ln)',
                  background: isSelected ? theme.bg : 'rgba(255, 255, 255, 0.02)',
                  color: isSelected ? '#fff' : 'var(--mu)',
                  fontWeight: 700,
                  fontSize: '12px',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                  boxShadow: isSelected ? `0 0 12px ${theme.accent}33` : 'none',
                }}
              >
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    background: theme.gradient,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 800,
                    border: `1.5px solid ${theme.accent}`,
                    flexShrink: 0,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={b.avatarImage || `/images/bots/${b.id}.jpg`}
                    alt={b.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                </div>
                <span>{b.name}</span>
                <span
                  style={{
                    fontSize: '9px',
                    padding: '1px 5px',
                    borderRadius: '4px',
                    background: isSelected ? theme.accent : 'rgba(255, 255, 255, 0.06)',
                    color: isSelected ? '#000' : 'var(--mu)',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                  }}
                >
                  {theme.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected Bot Profile Header */}
        <div
          className="bhead"
          style={{
            marginTop: '12px',
            borderTop: '1px solid var(--ln)',
            paddingTop: '12px',
            alignItems: 'flex-start',
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              minWidth: 52,
              borderRadius: '50%',
              overflow: 'hidden',
              background: activeTheme.gradient,
              border: `2px solid ${activeTheme.accent}`,
              boxShadow: `0 0 14px ${activeTheme.accent}44`,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activeBot.avatarImage || `/images/bots/${activeBot.id}.jpg`}
              alt={activeBot.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <b style={{ fontSize: '15px', color: '#fff' }}>{activeBot.name}</b>
              {activeBot.isUserProxy ? (
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    background: 'rgba(34, 197, 94, 0.2)',
                    color: 'var(--ac)',
                    border: '1px solid var(--ac)',
                    borderRadius: '12px',
                    padding: '1px 7px',
                  }}
                >
                  ★ Companion Bot
                </span>
              ) : (
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    background: 'rgba(255, 255, 255, 0.06)',
                    color: 'var(--mu)',
                    border: '1px solid var(--ln)',
                    borderRadius: '12px',
                    padding: '1px 7px',
                  }}
                >
                  Sparring Partner
                </span>
              )}
            </div>
            <small style={{ color: 'var(--mu)', fontSize: '12px', marginTop: '2px', lineHeight: 1.35 }}>
              {activeBot.archetype}
            </small>

            {activeBot.irrational_hill_to_die_on && (
              <div
                style={{
                  marginTop: '8px',
                  padding: '6px 10px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '6px',
                  fontSize: '11.5px',
                  color: '#cbd5e1',
                  borderLeft: `3px solid ${activeTheme.accent}`,
                }}
              >
                <span style={{ color: activeTheme.accent, fontWeight: 700 }}>Hill to die on: </span>
                <span>&ldquo;{activeBot.irrational_hill_to_die_on}&rdquo;</span>
              </div>
            )}
          </div>

          <div style={{ textAlign: 'right', flexShrink: 0, paddingLeft: '8px' }}>
            <span style={{ fontSize: '10px', color: 'var(--mu)', fontWeight: 600, display: 'block' }}>
              Queries today:
            </span>
            <div style={{ fontSize: '13px', fontWeight: 800, color: activeTheme.accent }}>
              {usage.msgsToday} / {usage.dailyCap}
            </div>
          </div>
        </div>
      </div>

      {/* Message Stream */}
      <div className="thread" style={{ minHeight: '300px', marginBottom: '24px' }}>
        {loadingHistory && messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--mu)', fontSize: '13px' }}>
            Loading conversation with {activeBot.name}...
          </div>
        )}

        {!loadingHistory && messages.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: '24px 16px' }}>
            <p style={{ color: 'var(--mu)', fontSize: '13px', marginBottom: '14px' }}>
              No messages yet with <b>{activeBot.name}</b>. Spark a debate with one of these:
            </p>
            <div className="chips" style={{ justifyContent: 'center' }}>
              {(BOT_STARTER_PROMPTS[activeBot.id] || BOT_STARTER_PROMPTS.robbpaul).map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="chip"
                  onClick={() => sendMessage(prompt)}
                  style={{
                    borderColor: 'rgba(255, 255, 255, 0.12)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, idx) => {
          const isUser = m.role === 'user';
          return (
            <div key={idx} className={`msg ${isUser ? 'me' : ''}`}>
              {!isUser && (
                <div
                  style={{
                    width: 36,
                    height: 36,
                    minWidth: 36,
                    borderRadius: '50%',
                    overflow: 'hidden',
                    background: activeTheme.gradient,
                    border: `1.5px solid ${activeTheme.accent}`,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={activeBot.avatarImage || `/images/bots/${activeBot.id}.jpg`}
                    alt={activeBot.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                </div>
              )}
              <div>
                <div className="who">
                  {isUser ? 'You' : activeBot.name}
                </div>
                {renderMessageContent(m.content, isUser, activeTheme.accent)}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="msg">
            <div
              style={{
                width: 36,
                height: 36,
                minWidth: 36,
                borderRadius: '50%',
                overflow: 'hidden',
                background: activeTheme.gradient,
                border: `1.5px solid ${activeTheme.accent}`,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeBot.avatarImage || `/images/bots/${activeBot.id}.jpg`}
                alt={activeBot.name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            </div>
            <div>
              <div className="who">{activeBot.name}</div>
              <div className="txt" style={{ color: 'var(--mu)', fontStyle: 'italic' }}>
                {getLoadingText(activeBot.id)}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Sticky Bottom Reply Box */}
      <div className="comp" style={{ position: 'sticky', bottom: '66px', zIndex: 40 }}>
        <input
          id="in"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Debate with ${activeBot.name}...`}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              sendMessage();
            }
          }}
          disabled={loading}
        />
        <button
          type="button"
          onClick={() => sendMessage()}
          disabled={loading}
          style={{ background: activeTheme.accent }}
        >
          Send
        </button>
      </div>
    </>
  );
}

export default function BackstagePage() {
  return (
    <Suspense
      fallback={
        <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--mu)' }}>
          Loading Backstage...
        </div>
      }
    >
      <BackstageChatInner />
    </Suspense>
  );
}
