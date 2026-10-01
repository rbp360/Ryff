'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface ChatMessage {
  id?: string | number;
  role: 'user' | 'assistant';
  content: string;
  flagged?: boolean;
  costUsd?: number;
}

interface UsageInfo {
  msgsToday: number;
  dailyCap: number;
  costMonthUsd?: number;
  monthlyBudgetUsd?: number;
}

const EVAL_QUESTIONS = [
  "What's going on with Fender?",
  "Anything interesting from Boss this week?",
  "I have a Tele and a Katana 50 — what would you add?",
  "Any good used deals for my wants?",
  "Hank, is modelling ever going to sound as good as a real amp?",
  "Vee, defend the Katana against a tube-amp snob.",
  "I've got £300, what's the smartest upgrade for my rig?",
  "Tell me about an obscure brand not in today's news",
  "What's a good first overdrive pedal?",
  "Which of you two is right about today's top story?"
];

export default function ChatPage() {
  const [bot, setBot] = useState<'hank' | 'vee'>('hank');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [usage, setUsage] = useState<UsageInfo>({ msgsToday: 0, dailyCap: 10 });
  const [flaggedIds, setFlaggedIds] = useState<Set<string | number>>(new Set());
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadChatHistory();
  }, [bot]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function loadChatHistory() {
    try {
      const res = await fetch(`/api/chat?bot=${bot}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        if (data.usage) {
          setUsage(data.usage);
        }
      }
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
  }

  async function sendMessage(textToSend?: string) {
    const messageText = textToSend || input;
    if (!messageText.trim() || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: messageText };
    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bot, message: messageText }),
      });

      const data = await res.json();

      if (data.usage) {
        setUsage(data.usage);
      }

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data.text || data.error || 'Unable to complete message.',
          },
        ]);
        return;
      }

      const assistantMsg: ChatMessage = {
        id: data.messageId,
        role: 'assistant',
        content: data.text,
        costUsd: data.costUsd,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: err instanceof Error ? err.message : 'Network error occurred.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleFlagMessage(id: string | number) {
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId: id, kind: 'bad_answer' }),
      });

      if (res.ok) {
        setFlaggedIds((prev) => new Set(prev).add(id));
        setFeedbackSuccess(id);
        setTimeout(() => setFeedbackSuccess(null), 3000);
      }
    } catch (err) {
      console.error('Flag error:', err);
    }
  }

  // Extract all links from content for dedicated source pills
  function extractLinks(content: string) {
    const links: Array<{ label: string; url: string; isDeal: boolean }> = [];
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    while ((match = linkRegex.exec(content)) !== null) {
      const label = match[1];
      const url = match[2];
      const isDeal = url.includes('type=deal') || label.toLowerCase().includes('reverb') || label.includes('£') || label.includes('$');
      links.push({ label, url, isDeal });
    }
    return links;
  }

  // Parses markdown links like [Title](url) safely with highlighted pill badges
  function renderFormattedContent(content: string) {
    const parts = [];
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(content.substring(lastIndex, match.index));
      }
      const label = match[1];
      const url = match[2];
      const isDeal = url.includes('type=deal') || label.includes('£') || label.includes('$');

      parts.push(
        <a
          key={`${match.index}-${url}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-1.5 font-semibold text-xs px-2.5 py-1 my-1 rounded-lg border shadow-sm transition ${
            isDeal
              ? 'bg-amber-950/80 hover:bg-amber-900 border-amber-500/60 text-amber-300 hover:text-amber-100'
              : 'bg-cyan-950/80 hover:bg-cyan-900 border-cyan-500/60 text-cyan-300 hover:text-cyan-100'
          }`}
        >
          <span>{isDeal ? '🏷️' : '🔗'}</span>
          <span className="underline underline-offset-2">{label}</span>
          <span className="text-[10px] opacity-70">↗</span>
        </a>
      );
      lastIndex = linkRegex.lastIndex;
    }

    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }

    return parts;
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link href="/" className="font-bold text-lg text-white flex items-center gap-1.5 hover:text-cyan-400 transition">
            <span>🎸</span>
            <span>GuitarBot</span>
          </Link>
          <span className="text-slate-600">/</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Private Rig Chat
          </span>
        </div>

        {/* Persona Switcher Tabs */}
        <div className="flex items-center bg-slate-950 border border-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setBot('hank')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-2 ${
              bot === 'hank'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>🧔</span>
            <span>Hank (Luthier)</span>
          </button>
          <button
            onClick={() => setBot('vee')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-2 ${
              bot === 'vee'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>⚡</span>
            <span>Vee (Deal Hunter)</span>
          </button>
        </div>

        {/* Cap Tracker & Navigation Links */}
        <div className="flex items-center gap-4 text-xs">
          <div className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg text-slate-400 font-mono">
            Daily Chats: <span className="text-white font-bold">{usage.msgsToday}</span> / {usage.dailyCap}
          </div>
          <Link
            href="/rig"
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg transition border border-slate-700 flex items-center gap-1.5"
          >
            <span>🎛️</span>
            <span>My Rig & Wants</span>
          </Link>
        </div>
      </header>

      {/* Main Grid: Chat Area + Testing Questions Sidebar */}
      <div className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left/Main Column: Chat Stream */}
        <div className="lg:col-span-8 flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl h-[78vh]">
          {/* Persona Banner */}
          <div className={`p-4 border-b border-slate-800 flex items-center justify-between ${
            bot === 'hank' ? 'bg-amber-950/20' : 'bg-cyan-950/20'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl border ${
                bot === 'hank'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
              }`}>
                {bot === 'hank' ? '🧔' : '⚡'}
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">
                  {bot === 'hank' ? 'Hank (The Grumpy Luthier)' : 'Vee (Modern Modeller & Deals)'}
                </h2>
                <p className="text-xs text-slate-400">
                  {bot === 'hank'
                    ? 'Values tonewoods, repairability, vintage bargains. Distrusts hype.'
                    : 'Values modelling tech, modern value, rig compatibility, and deals.'}
                </p>
              </div>
            </div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">
              AI Persona
            </span>
          </div>

          {/* Messages Scroll View */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-3">
                <div className="text-3xl">{bot === 'hank' ? '🛠️' : '🎸'}</div>
                <p className="text-sm text-slate-400 max-w-sm">
                  Ask {bot === 'hank' ? 'Hank' : 'Vee'} about today&apos;s gear news, your rig, or pick a test question on the right!
                </p>
              </div>
            ) : (
              messages.map((m, idx) => {
                const citedLinks = m.role === 'assistant' ? extractLinks(m.content) : [];

                return (
                  <div
                    key={idx}
                    className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[88%] rounded-2xl px-4 py-3.5 text-sm leading-relaxed ${
                        m.role === 'user'
                          ? 'bg-cyan-600 text-white rounded-br-none shadow-md'
                          : bot === 'hank'
                          ? 'bg-slate-950 border border-slate-800 text-slate-200 rounded-bl-none shadow'
                          : 'bg-slate-950 border border-cyan-950 text-slate-200 rounded-bl-none shadow'
                      }`}
                    >
                      <div className="whitespace-pre-wrap leading-relaxed">
                        {m.role === 'assistant' ? renderFormattedContent(m.content) : m.content}
                      </div>

                      {/* Prominent Sourced Links / Deal Cards Box */}
                      {m.role === 'assistant' && citedLinks.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-1.5">
                          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <span>📌</span>
                            <span>Cited Sources & Listings:</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {citedLinks.map((link, lIdx) => (
                              <a
                                key={lIdx}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition border shadow ${
                                  link.isDeal
                                    ? 'bg-amber-950/90 hover:bg-amber-900 border-amber-500/70 text-amber-200 hover:text-white'
                                    : 'bg-cyan-950/90 hover:bg-cyan-900 border-cyan-500/70 text-cyan-200 hover:text-white'
                                }`}
                              >
                                <span>{link.isDeal ? '🏷️' : '🔗'}</span>
                                <span className="max-w-[280px] truncate">{link.label}</span>
                                <span className="text-[10px] opacity-80">↗</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Assistant Metadata & Feedback Action */}
                      {m.role === 'assistant' && (
                        <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                          <span>
                            {m.costUsd ? `$${m.costUsd.toFixed(5)}` : 'Sourced & Capped'}
                          </span>

                          {m.id && (
                            <div className="flex items-center gap-2">
                              {feedbackSuccess === m.id ? (
                                <span className="text-emerald-400">Flagged for review ✓</span>
                              ) : (
                                <button
                                  onClick={() => handleFlagMessage(m.id!)}
                                  disabled={flaggedIds.has(m.id)}
                                  className="hover:text-red-400 text-slate-500 transition cursor-pointer"
                                >
                                  {flaggedIds.has(m.id) ? '🚩 Flagged' : '👎 Bad answer?'}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {loading && (
              <div className="flex items-start">
                <div className="bg-slate-950 border border-slate-800 rounded-2xl rounded-bl-none px-4 py-3 text-xs text-slate-400 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span>{bot === 'hank' ? 'Hank is pondering at the bench...' : 'Vee is scouring the listings...'}</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="p-3 border-t border-slate-800 bg-slate-950 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask ${bot === 'hank' ? 'Hank' : 'Vee'} anything about today's gear or your rig...`}
              disabled={loading}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white px-5 py-2.5 rounded-xl font-medium text-xs transition shadow cursor-pointer"
            >
              Send
            </button>
          </form>
        </div>

        {/* Right Column: Testing Output Suite & Eval Prompts */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>🧪</span>
                <span>Testing & Eval Prompts</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Click any prompt to test questions & see live sourced replies.
              </p>
            </div>

            <div className="space-y-2">
              {EVAL_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => sendMessage(q)}
                  disabled={loading}
                  className="w-full text-left p-2.5 bg-slate-950 hover:bg-slate-800/80 border border-slate-800/80 rounded-xl text-xs text-slate-300 hover:text-cyan-300 transition cursor-pointer leading-snug flex items-start justify-between gap-2"
                >
                  <span>{q}</span>
                  <span className="text-slate-600 text-[10px]">▶</span>
                </button>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-500 leading-relaxed">
              <p>
                <strong>Affiliate Disclosure:</strong> Links to Reverb may earn us a commission. Ranking is never influenced by commission.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
