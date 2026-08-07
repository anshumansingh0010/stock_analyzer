import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { useApp } from '../../context/AppContext';
import { formatResponse } from '../../utils/format';
import { API_BASE } from '../../utils/api';
import ChatSidebar from './ChatSidebar';
import { ChatMessage } from '../../types';
import { 
  Sparkles, 
  Send, 
  Copy, 
  Check, 
  User, 
  TrendingUp, 
  Zap, 
  RefreshCw, 
  ArrowRight,
  Layers,
  LineChart,
  ShieldAlert,
  X,
  Sliders,
  CheckCircle2,
  Activity
} from 'lucide-react';

const QUICK_SHORTCUTS = [
  { label: 'FII/DII Net Flow', prompt: "What are today's FII and DII net cash flows?" },
  { label: 'RSI & Technicals', prompt: 'Which Nifty 50 stocks are in overbought or oversold RSI zones?' },
  { label: 'Breaking Market News', prompt: 'Summarize top Indian market news affecting stocks today.' },
  { label: 'Portfolio Risk Audit', prompt: 'Analyze my current portfolio holdings for risk & sector concentration.' },
];

export default function ChatTab() {
  const { aiContext, chatHistory, setChatHistory, showToast, backendOnline } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput]       = useState<string>('');
  const [loading, setLoading]   = useState<boolean>(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Settings State
  const [settings, setSettings] = useState({
    responseMode: 'detailed', // 'detailed' | 'concise'
    riskAlertLevel: 'balanced', // 'strict' | 'balanced' | 'minimal'
    streamFeed: true,
  });

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

    const typingId = Date.now();
    setMessages(prev => [...prev, { role: 'typing', id: typingId, content: '' }]);

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          context: { ...aiContext, settings },
          history: chatHistory.slice(-10),
        }),
      });
      const data = await res.json();

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
        ? '⚠️ Cannot reach the backend server. Please verify backend service on port 5000.'
        : `⚠️ Connection error: ${err.message || 'Failed to connect'}`;
      setMessages(prev => [...prev, { role: 'assistant', content: msg }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { 
      e.preventDefault(); 
      sendMessage(input); 
    }
  }

  return (
    <section className="tab-section active chat-tab-section">
      <div className="chat-layout-v2">
        <ChatSidebar
          onQuickPrompt={sendMessage}
          onClear={() => { setMessages([]); setChatHistory([]); showToast('Conversation cleared', 'success'); }}
        />

        <div className="chat-container-v2">
          {/* Top Chat Bar */}
          <div className="chat-topbar-v2 flex items-center justify-between">
            <div className="ct-brand flex items-center gap-3">
              <div className="ct-icon-glow">
                <Sparkles className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="ct-info">
                <span className="ct-name font-bold text-sm">StockSense AI Copilot</span>
                <span className="ct-status flex items-center gap-1.5 text-xs text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live Indian Market Engine
                </span>
              </div>
            </div>

            <div className="ct-actions flex items-center gap-2">
              <button 
                className="ct-settings-btn flex items-center gap-1.5"
                onClick={() => setIsSettingsOpen(true)}
                title="AI Copilot Preferences"
              >
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-xs font-semibold">Settings</span>
              </button>
            </div>
          </div>

          {/* Chat Messages / Hero Zero State */}
          <div className="chat-messages-v2" ref={chatMessagesRef}>
            {messages.length === 0 ? (
              <WelcomeHero onSelectPrompt={sendMessage} />
            ) : (
              messages.map((m, i) => {
                if (m.role === 'typing') return <TypingIndicator key={m.id || i} />;
                if (m.role === 'user')   return <UserBubble key={i} content={m.content} />;
                return (
                  <AssistantBubble 
                    key={i} 
                    content={m.content} 
                    isError={m.content.startsWith('⚠️')} 
                    onSuggestPrompt={sendMessage}
                  />
                );
              })
            )}
          </div>

          {/* Warnings Bar if any */}
          {warnings.length > 0 && (
            <div className="warnings-bar-v2">{warnings.join(' · ')}</div>
          )}

          {/* Input Area */}
          <div className="chat-input-container-v2">
            {/* Quick Action Shortcuts above input */}
            <div className="input-shortcut-chips">
              {QUICK_SHORTCUTS.map(sc => (
                <button key={sc.label} className="sc-chip-btn" onClick={() => sendMessage(sc.prompt)} disabled={loading}>
                  {sc.label}
                </button>
              ))}
            </div>

            <div className="input-row-v2">
              <div className="input-wrapper-v2">
                <textarea
                  id="chat-input"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask StockSense AI about Nifty, technicals (RSI/MACD), stock news, or your portfolio..."
                  rows={1}
                  disabled={loading}
                  onInput={e => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = Math.min(target.scrollHeight, 160) + 'px';
                  }}
                />
              </div>

              <button 
                className="send-btn-v2" 
                onClick={() => sendMessage(input)} 
                disabled={loading || !input.trim()}
                title="Send query"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin text-white" /> : <Send className="w-4 h-4 text-white" />}
              </button>
            </div>

            <div className="input-footer-v2 flex items-center justify-end text-[0.62rem] text-slate-400 mt-4 px-1">
              <span className="text-slate-500 ">Financial intelligence · Not SEBI registered investment advice</span>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal
          settings={settings}
          onSave={(newSettings) => {
            setSettings(newSettings);
            setIsSettingsOpen(false);
            showToast('AI Chat settings updated', 'success');
          }}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </section>
  );
}

function WelcomeHero({ onSelectPrompt }: { onSelectPrompt: (p: string) => void }) {
  const cards = [
    {
      icon: <LineChart className="w-5 h-5 text-indigo-400" />,
      title: 'Stock Deep Dive',
      desc: 'Technical indicators, support/resistance, RSI & trend direction',
      prompt: 'Should I buy TCS? Give a full technical breakdown.',
    },
    {
      icon: <TrendingUp className="w-5 h-5 text-emerald-400" />,
      title: 'Market Pulse & Drivers',
      desc: 'Why is Nifty moving today? FII/DII cash flows & macro cues',
      prompt: 'Why is Nifty moving today? Explain key institutional drivers.',
    },
    {
      icon: <Zap className="w-5 h-5 text-amber-400" />,
      title: 'Options & Derivatives',
      desc: 'Nifty Put-Call Ratio (PCR), Max Pain strikes & call/put OI',
      prompt: 'What is the current Nifty Put-Call Ratio and Max Pain level?',
    },
    {
      icon: <ShieldAlert className="w-5 h-5 text-rose-400" />,
      title: 'Portfolio Risk Audit',
      desc: 'Sector allocation risk, high volatility warnings & rebalancing',
      prompt: "What's my portfolio risk and sector concentration right now?",
    },
  ];

  return (
    <div className="welcome-hero-v2">
      <div className="hero-badge flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
        <span>Next-Gen Financial AI</span>
      </div>

      <h2 className="hero-title">What would you like to analyze today?</h2>
      <p className="hero-subtitle">
        Ask StockSense AI anything about live Indian equities, F&O derivatives, market news, or your active portfolio.
      </p>

      {/* Feature cards grid */}
      <div className="hero-cards-grid">
        {cards.map((c, i) => (
          <div key={i} className="hero-card" onClick={() => onSelectPrompt(c.prompt)}>
            <div className="hc-top flex items-center justify-between">
              <div className="hc-icon">{c.icon}</div>
              <ArrowRight className="w-4 h-4 text-slate-500 hc-arrow" />
            </div>
            <h4 className="hc-title">{c.title}</h4>
            <p className="hc-desc">{c.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function UserBubble({ content }: { content: string }) {
  return (
    <div className="message-v2 user-msg">
      <div className="msg-avatar-v2 user-av">
        <User className="w-4 h-4 text-white" />
      </div>
      <div className="msg-content-v2">
        <div className="msg-body-v2 user-body">{content}</div>
      </div>
    </div>
  );
}

function AssistantBubble({ 
  content, 
  isError,
  onSuggestPrompt 
}: { 
  content: string; 
  isError?: boolean;
  onSuggestPrompt: (p: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    const plainText = content.replace(/<[^>]+>/g, '');
    navigator.clipboard.writeText(plainText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="message-v2 assistant-msg">
      <div className="msg-avatar-v2 assistant-av flex items-center justify-center">
        <Sparkles className="w-4.5 h-4.5 text-indigo-400" />
      </div>

      <div className="msg-content-v2">
        <div className="msg-header-v2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="msg-name-v2 font-semibold text-sm">StockSense AI</span>
            <span className="msg-engine-badge">NSE Real-Time Intelligence</span>
          </div>
          <button 
            className="copy-btn-v2 flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200"
            onClick={copyToClipboard}
            title="Copy response text"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        <div
          className={`msg-body-v2 assistant-body ${isError ? 'error-body' : ''}`}
          dangerouslySetInnerHTML={{ __html: formatResponse(content) }}
        />

        {/* Action Suggestion Chips */}
        <div className="msg-actions-v2 flex items-center gap-2 mt-2">
          <button 
            className="ma-chip" 
            onClick={() => onSuggestPrompt('Summarize key takeaways in 3 bullet points')}
          >
            📌 Key Takeaways
          </button>
          <button 
            className="ma-chip" 
            onClick={() => onSuggestPrompt('What are the risks or downside scenarios?')}
          >
            ⚠️ Key Risks
          </button>
        </div>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="message-v2 assistant-msg typing-msg">
      <div className="msg-avatar-v2 assistant-av flex items-center justify-center">
        <Sparkles className="w-4 h-4 text-indigo-400 animate-spin" style={{ animationDuration: '3s' }} />
      </div>
      <div className="msg-content-v2">
        <div className="msg-body-v2 assistant-body flex items-center gap-3 py-3 px-4">
          <div className="flex items-center gap-1.5">
            <span className="typing-dot-v2 animate-bounce" style={{ animationDelay: '0s' }} />
            <span className="typing-dot-v2 animate-bounce" style={{ animationDelay: '0.2s' }} />
            <span className="typing-dot-v2 animate-bounce" style={{ animationDelay: '0.4s' }} />
          </div>
          <span className="text-xs text-indigo-300 font-medium">Analyzing real-time market data & financial streams...</span>
        </div>
      </div>
    </div>
  );
}

function SettingsModal({
  settings,
  onSave,
  onClose
}: {
  settings: { responseMode: string; riskAlertLevel: string; streamFeed: boolean };
  onSave: (s: { responseMode: string; riskAlertLevel: string; streamFeed: boolean }) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState(settings);

  return (
    <div className="settings-modal-backdrop" onClick={onClose}>
      <div className="settings-modal-card" onClick={e => e.stopPropagation()}>
        <div className="sm-header flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="sm-icon-badge">
              <Sliders className="w-4 h-4 sg-icon-primary" />
            </div>
            <div>
              <span className="font-bold text-sm block">Copilot Preferences</span>
              <span className="sm-subtext">Customize AI detail level & risk alerts</span>
            </div>
          </div>
          <button className="sm-close-btn" onClick={onClose}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="sm-body flex flex-col gap-5 mt-4">
          {/* Response Style */}
          <div className="setting-group">
            <label className="sg-label flex items-center gap-1.5 ">
              <span>AI Response Detail Level</span>
            </label>
            <div className="sg-options grid grid-cols-2 gap-2">
              <button
                type="button"
                className={`sg-opt-btn ${form.responseMode === 'detailed' ? 'active' : ''}`}
                onClick={() => setForm(f => ({ ...f, responseMode: 'detailed' }))}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">Detailed Analysis</span>
                  {form.responseMode === 'detailed' && <CheckCircle2 className="w-3.5 h-3.5 sg-icon-primary" />}
                </div>
                <span className="text-[0.7rem] opacity-75">Technical indicators, news & macro drivers</span>
              </button>

              <button
                type="button"
                className={`sg-opt-btn ${form.responseMode === 'concise' ? 'active' : ''}`}
                onClick={() => setForm(f => ({ ...f, responseMode: 'concise' }))}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">Executive Summary</span>
                  {form.responseMode === 'concise' && <CheckCircle2 className="w-3.5 h-3.5 sg-icon-primary" />}
                </div>
                <span className="text-[0.7rem] opacity-75">Fast 3-bullet takeaway summaries</span>
              </button>
            </div>
          </div>

          {/* Risk Alert Sensitivity */}
          <div className="setting-group">
            <label className="sg-label flex items-center gap-1.5">
              <span>Portfolio Risk Sensitivity</span>
            </label>
            <div className="sg-options grid grid-cols-3 gap-2">
              {[
                { id: 'strict', label: 'Strict Alerts', sub: 'High risk warnings' },
                { id: 'balanced', label: 'Balanced', sub: 'Standard warnings' },
                { id: 'minimal', label: 'Minimal', sub: 'Critical warnings only' },
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  className={`sg-opt-btn ${form.riskAlertLevel === opt.id ? 'active' : ''}`}
                  onClick={() => setForm(f => ({ ...f, riskAlertLevel: opt.id }))}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs">{opt.label}</span>
                    {form.riskAlertLevel === opt.id && <CheckCircle2 className="w-3 h-3 sg-icon-primary" />}
                  </div>
                  <span className="text-[0.68rem] opacity-75">{opt.sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Live SSE Stream Toggle */}
          <div className="setting-group-row">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 sg-icon-bull" />
              <div>
                <span className="font-bold text-xs block">Real-Time NSE Stream</span>
                <span className="sg-subtext">Stream live market data during chat queries</span>
              </div>
            </div>
            <button
              type="button"
              className={`toggle-switch ${form.streamFeed ? 'on' : 'off'}`}
              onClick={() => setForm(f => ({ ...f, streamFeed: !f.streamFeed }))}
            >
              <span className="ts-knob" />
            </button>
          </div>
        </div>

        <div className="sm-footer">
          <button className="sm-cancel-btn" onClick={onClose}>Cancel</button>
          <button className="sm-save-btn flex items-center gap-1.5 " onClick={() => onSave(form)}>
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Save Preferences</span>
          </button>
        </div>
      </div>
    </div>
  );
}
