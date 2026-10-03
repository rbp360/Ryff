'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { BackButton } from '@/components/BackButton';


interface ChatMessage {
  id?: string | number;
  role: 'user' | 'assistant';
  content: string;
}

interface UsageInfo {
  msgsToday: number;
  dailyCap: number;
}

const STARTER_PROMPTS = [
  "Hank, is modelling ever going to sound as good as a tube amp?",
  "Vee, defend the Katana against a tube snob.",
  "What's the smartest £300 upgrade for my rig?",
  "Which overdrive pedal should I get next?",
];

export default function BackstagePage() {
  const [bot, setBot] = useState<'hank' | 'vee'>('hank');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [usage, setUsage] = useState<UsageInfo>({ msgsToday: 0, dailyCap: 10 });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ignore = false;
    async function fetchHistory() {
      try {
        const res = await fetch(`/api/chat?bot=${bot}`);
        if (res.ok && !ignore) {
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

    fetchHistory();
    return () => {
      ignore = true;
    };
  }, [bot]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

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
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data.text || '',
          },
        ]);
      }
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
        1-on-1 private debate and rig advice. <b>{bot === 'hank' ? 'Hank' : 'Vee'}</b> is active.
      </p>

      {/* Bot Persona Switcher */}
      <div className="card" style={{ marginTop: '14px', padding: '14px' }}>
        <div className="seg">
          <button
            type="button"
            className={bot === 'hank' ? 'on' : ''}
            onClick={() => setBot('hank')}
          >
            Hank (The Luthier)
          </button>
          <button
            type="button"
            className={bot === 'vee' ? 'on' : ''}
            onClick={() => setBot('vee')}
          >
            Vee (The Modeller)
          </button>
        </div>

        <div className="bhead" style={{ marginTop: '12px' }}>
          <div className="ph round" style={{ width: 44, height: 44, minWidth: 44 }}>
            {bot === 'hank' ? 'Hank' : 'Vee'}
          </div>
          <div>
            <b>{bot === 'hank' ? 'Hank' : 'Vee'}</b>
            <small>
              {bot === 'hank'
                ? 'Vintage craft purist · Values tonewoods & tube amps · Distrusts hype'
                : 'Digital gear enthusiast · Modeller advocate · Used market bargain hunter'}
            </small>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <span style={{ fontSize: '11px', color: 'var(--mu)', fontWeight: 600 }}>
              Queries today:
            </span>
            <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ac)' }}>
              {usage.msgsToday} / {usage.dailyCap}
            </div>
          </div>
        </div>
      </div>

      {/* Message Stream */}
      <div className="thread" style={{ minHeight: '300px', marginBottom: '24px' }}>
        {messages.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: '24px 16px' }}>
            <p style={{ color: 'var(--mu)', fontSize: '13px', marginBottom: '14px' }}>
              No messages yet with {bot === 'hank' ? 'Hank' : 'Vee'}. Try asking one of these:
            </p>
            <div className="chips" style={{ justifyContent: 'center' }}>
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="chip"
                  onClick={() => sendMessage(prompt)}
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
                  className="ph round"
                  style={{ width: 36, height: 36, minWidth: 36, fontSize: '10px' }}
                >
                  {bot === 'hank' ? 'Hank' : 'Vee'}
                </div>
              )}
              <div>
                <div className="who">
                  {isUser ? 'You' : bot === 'hank' ? 'Hank' : 'Vee'}
                </div>
                <div className="txt">{m.content}</div>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="msg">
            <div
              className="ph round"
              style={{ width: 36, height: 36, minWidth: 36, fontSize: '10px' }}
            >
              {bot === 'hank' ? 'Hank' : 'Vee'}
            </div>
            <div>
              <div className="who">{bot === 'hank' ? 'Hank' : 'Vee'}</div>
              <div className="txt" style={{ color: 'var(--mu)' }}>
                Thinking...
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
          placeholder={`Debate with ${bot === 'hank' ? 'Hank' : 'Vee'}...`}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              sendMessage();
            }
          }}
          disabled={loading}
        />
        <button type="button" onClick={() => sendMessage()} disabled={loading}>
          Send
        </button>
      </div>
    </>
  );
}
