import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, Circle, Settings, CircleHelp, MessageSquarePlus, Clock, PanelLeftClose, PanelLeftOpen, MoreHorizontal, Trash2 } from 'lucide-react';

interface ChatSidebarProps {
  onQuickPrompt: (prompt: string) => void;
  onClear?: () => void;
  onOpenSettings?: () => void;
  onOpenHelp?: () => void;
}

export default function ChatSidebar({ 
  onQuickPrompt,
  onClear,
  onOpenSettings,
  onOpenHelp
}: ChatSidebarProps) {
  const { aiContext, showToast, chatSessions, currentSessionId, setCurrentSessionId, setChatSessions } = useApp();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const ctxItems = [
    { id: 'market', label: 'Live Market Data', active: !!aiContext.marketData },
    { id: 'stock', label: 'Active Stock Data', active: !!aiContext.stockData },
    { id: 'news', label: 'News Feed Stream', active: (aiContext.news || []).length > 0 },
    { id: 'portfolio', label: 'Portfolio Context', active: (aiContext.portfolio || []).length > 0 },
  ];

  const now = new Date();
  const todaySessions: typeof chatSessions = [];
  const weekSessions: typeof chatSessions = [];
  const olderSessions: typeof chatSessions = [];

  chatSessions.forEach(session => {
    const d = new Date(session.updatedAt);
    const diffTime = now.getTime() - d.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    if (diffDays <= 1 && now.getDate() === d.getDate()) {
       todaySessions.push(session);
    } else if (diffDays <= 7) {
       weekSessions.push(session);
    } else {
       olderSessions.push(session);
    }
  });

  const handleDeleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setChatSessions(prev => prev.filter(s => s.id !== id));
    if (currentSessionId === id) {
       setCurrentSessionId(null);
       if (onClear) onClear();
    }
  };

  const renderGroup = (title: string, sessions: typeof chatSessions) => {
    if (sessions.length === 0) return null;
    return (
      <div className="history-group">
        <div className="sh-title flex items-center justify-between text-[var(--text-muted)] mb-2 px-1 mt-3">
          <span className="font-medium text-xs">{title}</span>
        </div>
        <div className="sidebar-history-list">
          {sessions.map(s => (
            <button 
              key={s.id}
              className={`history-item-btn ${currentSessionId === s.id ? 'active' : ''}`} 
              onClick={() => setCurrentSessionId(s.id)}
            >
              <span className="history-title">{s.title || 'New Chat'}</span>
              <Trash2 className="w-4 h-4 history-more-icon hover:text-red-400" onClick={(e) => handleDeleteSession(e, s.id)} />
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <aside className={`chat-sidebar-v2 ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Brand Section */}
      <div 
        className="sidebar-brand-section"
        onClick={() => { if (isCollapsed) setIsCollapsed(false); }}
      >
        <div className="sidebar-logo-icon">
          <svg viewBox="0 0 32 32" fill="none">
            <path d="M4 24 L10 16 L16 20 L22 10 L28 14" stroke="url(#g1)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="28" cy="14" r="2.5" fill="#00d4a8"/>
            <defs>
              <linearGradient id="g1" x1="4" y1="24" x2="28" y2="10" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#6366f1"/>
                <stop offset="100%" stopColor="#00d4a8"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
        {!isCollapsed && (
          <span className="sidebar-logo-text">
            StockSense<span className="sidebar-logo-accent">AI</span>
          </span>
        )}
        {!isCollapsed && (
          <button 
            type="button"
            className="sidebar-toggle-btn"
            onClick={(e) => { e.stopPropagation(); setIsCollapsed(true); }}
            title="Collapse Sidebar"
          >
            <PanelLeftClose className="w-[18px] h-[18px]" />
          </button>
        )}
      </div>

      <div className="sidebar-top-actions">
        <button 
          type="button"
          className="sidebar-new-chat-btn sm-save-btn"
          onClick={onClear}
          title="New Chat"
        >
          <MessageSquarePlus className="w-5 h-5" />
          <span className="snc-text">New Chat</span>
        </button>

        {isCollapsed && (
          <button
            type="button"
            className="sidebar-collapsed-history-btn"
            onClick={() => setIsCollapsed(false)}
            title="Recent Chats"
          >
            <Clock className="w-[18px] h-[18px]" />
          </button>
        )}
      </div>

      {!isCollapsed && (
        <div className="sidebar-history-section">
          {renderGroup('Today', todaySessions)}
          {renderGroup('Previous 7 Days', weekSessions)}
          {renderGroup('Older', olderSessions)}
          {chatSessions.length === 0 && (
            <div className="text-xs text-[var(--text-muted)] text-center mt-6 px-4">
              No recent chats found. Start a new conversation!
            </div>
          )}
        </div>
      )}

      <div className="sidebar-divider" />

      {/* Live Context Connection Card */}
      {!isCollapsed && (
        <div className="context-card-v2">
          <div className="cc-title flex items-center gap-1.5">
            <span>Active Data Feeds</span>
          </div>
          <div className="cc-items">
            {ctxItems.map(c => (
              <div key={c.id} className="cc-row flex items-center justify-between">
                <span className="cc-label">{c.label}</span>
                {c.active ? (
                  <span className="flex items-center gap-1 text-emerald-400 text-[0.7rem] font-medium">
                    <CheckCircle2 className="w-3 h-3" /> Ready
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-slate-400 text-[0.7rem]">
                    <Circle className="w-2.5 h-2.5 opacity-40" /> Standby
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer Actions: Settings and Help & Feedback */}
      <div className="sidebar-footer-actions">
        <button 
          type="button" 
          className="sidebar-footer-btn" 
          onClick={onOpenSettings}
          title="Settings"
        >
          <Settings className="w-[18px] h-[18px]" strokeWidth={1.8} />
          <span className="footer-btn-text">Settings</span>
        </button>
        <button 
          type="button" 
          className="sidebar-footer-btn" 
          onClick={onOpenHelp}
          title="Help & Feedback"
        >
          <CircleHelp className="w-[18px] h-[18px]" strokeWidth={1.8} />
          <span className="footer-btn-text">Help & Feedback</span>
        </button>
      </div>
    </aside>
  );
}
