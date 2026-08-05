import { useApp } from '../../context/AppContext';

interface ChatSidebarProps {
  onQuickPrompt: (prompt: string) => void;
  quickPrompts: string[];
  onClear: () => void;
}

export default function ChatSidebar({ onQuickPrompt, quickPrompts, onClear }: ChatSidebarProps) {
  const { aiContext } = useApp();

  const ctxItems = [
    { id: 'market',    label: 'Market Data',  active: !!aiContext.marketData },
    { id: 'stock',     label: 'Stock Data',   active: !!aiContext.stockData },
    { id: 'news',      label: 'News Feed',    active: (aiContext.news || []).length > 0 },
    { id: 'portfolio', label: 'Portfolio',    active: (aiContext.portfolio || []).length > 0 },
  ];

  return (
    <aside className="sidebar">
      <h3 className="sidebar-title">AI Suggestions</h3>
      <div className="quick-prompts">
        {quickPrompts.map(p => (
          <button key={p} className="quick-btn" onClick={() => onQuickPrompt(p)}>{p}</button>
        ))}
      </div>

      <div className="sidebar-divider" />

      <h3 className="sidebar-title">Context Active</h3>
      <div className="context-indicators">
        {ctxItems.map(c => (
          <div key={c.id} className="ctx-item">
            <span className={`ctx-dot ${c.active ? 'on' : 'off'}`} />
            <span>{c.label}</span>
          </div>
        ))}
      </div>

      <div className="sidebar-divider" />

      <button className="clear-btn" onClick={onClear}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>
        </svg>
        Clear Chat
      </button>
    </aside>
  );
}
