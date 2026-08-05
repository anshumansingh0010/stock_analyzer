import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { useApp } from '../../context/AppContext';
import { formatResponse } from '../../utils/format';
import { API_BASE } from '../../utils/api';
import ChatSidebar from './ChatSidebar';
import { ChatMessage } from '../../types';

const QUICK_PROMPTS = [
  'Should I buy TCS?',
  'Why is Reliance falling?',
  'Explain RBI policy.',
  'Compare HDFC vs ICICI.',
  'Why is Nifty moving today?',
  "What's my portfolio risk?",
  'Top volume & delivery stocks',
  'Sector performance summary',
];

export default function ChatTab() {
  const { aiContext, chatHistory, setChatHistory, showToast, backendOnline } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput]       = useState<string>('');
  const [loading, setLoading]   = useState<boolean>(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const chatMessagesRef = useRef<HTMLDivElement | null>(null);

  const scrollBottom = () => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTo({
        top: chatMessagesRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };
  useEffect(scrollBottom, [messages]);

  async function sendMessage(query?: string) {
    const q = (query ?? input).trim();
    if (!q || loading) return;
    setInput('');

    const userMsg: ChatMessage = { role: 'user', content: q };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    setWarnings([]);

    // Typing indicator id
    const typingId = Date.now();
    setMessages(prev => [...prev, { role: 'typing', id: typingId, content: '' }]);

    try {
      const res  = await fetch(`${API_BASE}/chat`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          query:   q,
          context: aiContext,
          history: chatHistory.slice(-10),
        }),
      });
      const data = await res.json();

      // Remove typing indicator
      setMessages(prev => prev.filter(m => m.id !== typingId));

      if (!res.ok) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.error || data.message || 'Unknown error' }]);
        return;
      }

      if (data.warnings?.length) setWarnings(data.warnings);

      const assistantMsg: ChatMessage = { role: 'assistant', content: data.answer };
      setMessages(prev => [...prev, assistantMsg]);
      setChatHistory(prev => [...prev, userMsg, assistantMsg]);
    } catch (err: any) {
      setMessages(prev => prev.filter(m => m.id !== typingId));
      const msg = !backendOnline
        ? '⚠️ Cannot reach the backend server. Start it with `npm run dev`.'
        : `⚠️ Network error: ${err.message || 'Failed to connect'}`;
      setMessages(prev => [...prev, { role: 'assistant', content: msg }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  }

  return (
    <section className="tab-section active">
      <div className="chat-layout">
        <ChatSidebar
          onQuickPrompt={sendMessage}
          quickPrompts={QUICK_PROMPTS}
          onClear={() => { setMessages([]); setChatHistory([]); showToast('Chat cleared', 'success'); }}
        />

        <div className="chat-container">
          <div className="chat-messages" ref={chatMessagesRef}>
            {/* Welcome */}
            <WelcomeMessage />

            {messages.map((m, i) => {
              if (m.role === 'typing') return <TypingIndicator key={m.id || i} />;
              if (m.role === 'user')   return <UserBubble key={i} content={m.content} />;
              return <AssistantBubble key={i} content={m.content} isError={m.content.startsWith('⚠️')} />;
            })}
          </div>

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="warnings-bar">{warnings.join(' · ')}</div>
          )}

          {/* Input */}
          <div className="chat-input-area">
            <div className="input-row">
              <div className="input-wrapper">
                <textarea
                  id="chat-input"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about Nifty 50, a specific stock, or your portfolio..."
                  rows={1}
                  disabled={loading}
                  style={{ height: 'auto' }}
                  onInput={e => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = Math.min(target.scrollHeight, 160) + 'px';
                  }}
                />
              </div>
              <button className="send-btn" onClick={() => sendMessage(input)} disabled={loading}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
            <p className="input-hint">Press <kbd>Enter</kbd> to send · <kbd>Shift+Enter</kbd> for new line</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function WelcomeMessage() {
  return (
    <div className="message assistant welcome-msg">
      <div className="msg-avatar">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M4 20 L8 14 L12 17 L16 9 L20 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <div className="msg-content">
        <div className="msg-header">
          <span className="msg-name">Nifty50GPT</span>
          <span className="msg-badge">Layer 1 + 2 Active</span>
        </div>
        <div className="msg-body">
          <p>Namaste! 🙏 I'm <strong>Nifty50GPT</strong>, your AI financial intelligence assistant for the Indian stock market.</p>
          <p>I can help you with:</p>
          <ul>
            <li>📊 <strong>Market Movements</strong> — Why is Nifty up or down?</li>
            <li>📈 <strong>Stock Analysis</strong> — Trends, RSI, MACD, news impact</li>
            <li>📰 <strong>News Interpretation</strong> — What does this news mean for your portfolio?</li>
            <li>💼 <strong>Portfolio Insights</strong> — Sector concentration, risk alerts</li>
          </ul>
          <p className="disclaimer">⚠️ I provide <strong>analysis, not investment advice</strong>.</p>
        </div>
      </div>
    </div>
  );
}

function UserBubble({ content }: { content: string }) {
  return (
    <div className="message user">
      <div className="msg-avatar" style={{ fontSize: '0.72rem' }}>You</div>
      <div className="msg-content">
        <div className="msg-body">{content}</div>
      </div>
    </div>
  );
}

function AssistantBubble({ content, isError }: { content: string; isError?: boolean }) {
  return (
    <div className="message assistant">
      <div className="msg-avatar">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M4 20 L8 14 L12 17 L16 9 L20 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <div className="msg-content">
        <div className="msg-header">
          <span className="msg-name">Nifty50GPT</span>
          <span className="msg-badge">Layer 1</span>
        </div>
        <div
          className="msg-body"
          style={isError ? { borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)' } : {}}
          dangerouslySetInnerHTML={{ __html: formatResponse(content) }}
        />
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="message assistant typing-indicator">
      <div className="msg-avatar">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M4 20 L8 14 L12 17 L16 9 L20 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <div className="msg-content">
        <div className="msg-body">
          <div className="typing-dot"/><div className="typing-dot"/><div className="typing-dot"/>
        </div>
      </div>
    </div>
  );
}
