import React, { useCallback, useRef, useState } from 'react';
import { displayChangePct, displayPrice } from '../utils/quoteDisplay';
import { getSymbolResearchContext } from '../utils/symbolResearch';

const QUICK_PROMPTS = [
  'Summarize bull and bear case in 5 bullets',
  'What should I verify in the fundamentals?',
  'Explain the key metrics vs a typical quality compounder',
  'Draft 3 journal-style questions to research next',
];

function buildContext({ symbol, quote, connection, research }) {
  const sym = (symbol || '').trim().toUpperCase();
  if (!sym) return { symbol: '' };

  const px = displayPrice(quote);
  const chg = displayChangePct(quote);
  const quoteParts = [];
  if (px != null) quoteParts.push(`last ~${px.toFixed(2)}`);
  if (chg != null) quoteParts.push(`day ${chg >= 0 ? '+' : ''}${chg.toFixed(2)}%`);
  if (quote?.refFromHistory) quoteParts.push('(reference close, market may be closed)');

  const watch = research?.watch;
  const sc = research?.scorecard;

  let scorecardSummary = '';
  if (sc?.ratingLabel || sc?.ratingShort) {
    scorecardSummary = sc.ratingLabel || sc.ratingShort;
    if (sc.sector) scorecardSummary += ` · sector ${sc.sector}`;
  }

  return {
    symbol: sym,
    listing: watch?.name || research?.scorecard?.name || '',
    quoteSummary: quoteParts.join(', ') || 'no live quote',
    watchlistNotes: watch?.notes || '',
    scorecardSummary,
    ibStatus: connection?.status || 'unknown',
  };
}

export default function AgentPanel({
  symbol,
  quote,
  connection,
  chat,
  enabled,
  isElectron,
  profileLabel,
  profileTier,
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef(null);

  const send = useCallback(
    async (text) => {
      const content = (text || input).trim();
      if (!content || busy) return;
      if (!isElectron) {
        setError('AI assistant requires Electron (npm run electron:dev).');
        return;
      }
      if (!enabled) {
        setError('Enable the agent in Settings → AI assistant.');
        return;
      }
      if (!symbol) {
        setError('Load a symbol on the Terminal first.');
        return;
      }

      setError('');
      setInput('');
      const research = getSymbolResearchContext(symbol);
      const context = buildContext({ symbol, quote, connection, research });
      const userMsg = { role: 'user', content };
      const nextMessages = [...messages, userMsg];
      setMessages(nextMessages);
      setBusy(true);

      try {
        const res = await chat({
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
          context,
        });
        if (res.error) {
          setError(res.error);
        } else {
          setMessages((prev) => [...prev, { role: 'assistant', content: res.content }]);
        }
      } catch (e) {
        setError(e.message || 'Chat failed');
      } finally {
        setBusy(false);
        requestAnimationFrame(() => {
          scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
        });
      }
    },
    [busy, chat, connection, enabled, input, isElectron, messages, quote, symbol],
  );

  const clear = () => {
    setMessages([]);
    setError('');
  };

  return (
    <div
      style={{
        background: '#0a0f1e',
        border: '1px solid #1a2035',
        borderRadius: 12,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        minHeight: 220,
        maxHeight: 420,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>
          AI research assistant
        </span>
        <span style={{ fontSize: 10, color: '#475569' }}>
          {profileLabel
            ? `${profileLabel}${profileTier === 'free' ? ' · Free' : profileTier === 'byok' ? ' · BYOK' : ''}`
            : 'Configure in Settings → AI assistant'}
        </span>
        <button type="button" onClick={clear} style={ghostBtn} disabled={!messages.length}>
          Clear
        </button>
      </div>

      {!isElectron && (
        <p style={{ margin: 0, fontSize: 12, color: '#f59e0b' }}>Run npm run electron:dev to use the assistant.</p>
      )}

      {isElectron && !enabled && (
        <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>
          Turn on in Settings → AI assistant, install{' '}
          <a href="https://ollama.com" style={{ color: '#818cf8' }}>
            Ollama
          </a>
          , then run <code style={{ color: '#cbd5e1' }}>ollama pull llama3.2</code>.
        </p>
      )}

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {QUICK_PROMPTS.map((p) => (
          <button key={p} type="button" style={chipBtn} disabled={busy || !symbol} onClick={() => send(p)}>
            {p.length > 42 ? `${p.slice(0, 40)}…` : p}
          </button>
        ))}
      </div>

      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          background: '#060b16',
          border: '1px solid #1a2035',
          borderRadius: 8,
          padding: 12,
          fontSize: 13,
          lineHeight: 1.55,
          color: '#cbd5e1',
        }}
      >
        {!messages.length && (
          <div style={{ color: '#475569' }}>
            Ask about {symbol || 'a ticker'} — uses your watchlist notes, scorecard, FMP metrics (if keyed), and quote
            context. Responses are not financial advice.
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: m.role === 'user' ? '#818cf8' : '#22c55e', marginBottom: 4, fontWeight: 700 }}>
              {m.role === 'user' ? 'You' : 'Assistant'}
            </div>
            <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
          </div>
        ))}
        {busy && <div style={{ color: '#64748b', fontSize: 12 }}>Thinking…</div>}
      </div>

      {error && <div style={{ fontSize: 12, color: '#f59e0b' }}>{error}</div>}

      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder={symbol ? `Ask about ${symbol}…` : 'Load a symbol first'}
          disabled={busy}
          style={{
            flex: 1,
            background: '#060b16',
            border: '1px solid #334155',
            borderRadius: 8,
            color: '#f8fafc',
            fontSize: 14,
            padding: '10px 12px',
            outline: 'none',
          }}
        />
        <button type="button" onClick={() => send()} disabled={busy || !input.trim()} style={primaryBtn}>
          Send
        </button>
      </div>
    </div>
  );
}

const ghostBtn = {
  marginLeft: 'auto',
  padding: '2px 8px',
  borderRadius: 6,
  border: '1px solid #1a2035',
  background: 'transparent',
  color: '#64748b',
  fontSize: 11,
  cursor: 'pointer',
};

const chipBtn = {
  padding: '4px 8px',
  borderRadius: 999,
  border: '1px solid #1a2035',
  background: '#060b16',
  color: '#94a3b8',
  fontSize: 10,
  cursor: 'pointer',
  maxWidth: 220,
};

const primaryBtn = {
  padding: '10px 16px',
  borderRadius: 8,
  border: 'none',
  background: '#6366f1',
  color: '#f8fafc',
  fontWeight: 600,
  fontSize: 13,
  cursor: 'pointer',
};
