import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, Circle, Settings, CircleHelp, SquarePen, PanelLeftClose, Menu, Trash2 } from 'lucide-react';

interface ChatSidebarProps {
  onQuickPrompt: (prompt: string) => void;
  onClear?: () => void;
  onOpenSettings?: () => void;
  onOpenHelp?: () => void;
}

export default function ChatSidebar({
  onClear,
  onOpenSettings,
  onOpenHelp
}: ChatSidebarProps) {
  const { aiContext, showToast, chatSessions, currentSessionId, setCurrentSessionId, setChatSessions } = useApp();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isCloseHovered, setIsCloseHovered] = useState(false);

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
      <div className="sidebar-top-actions">
        {isCollapsed && (
          <>
            <button 
              type="button"
              className="sidebar-toggle-btn mx-auto"
              onClick={(e) => { e.stopPropagation(); setIsCollapsed(false); }}
              title="Expand Sidebar"
              style={{ margin: '0 auto' }}
            >
              <Menu className="w-[22px] h-[22px]" />
            </button>
            <div className="sidebar-divider" style={{ margin: '0 auto', width: '30px', background: 'var(--border-subtle)' }} />
          </>
        )}

        <button 
          type="button"
          className="sidebar-new-chat-btn sm-save-btn"
          onClick={onClear}
          title="New Chat"
          style={!isCollapsed ? { flex: 1 } : undefined}
        >
          <SquarePen className="w-5 h-5" />
          <span className="snc-text">New Chat</span>
        </button>

        {!isCollapsed && (
          <button 
            type="button"
            className="sidebar-toggle-btn"
            onClick={(e) => { e.stopPropagation(); setIsCollapsed(true); }}
            title="Collapse Sidebar"
          >
            <PanelLeftClose className="w-[20px] h-[20px]" />
          </button>
        )}
      </div>

      {!isCollapsed && <div className="sidebar-divider" />}

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
