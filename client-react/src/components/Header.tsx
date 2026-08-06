import { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { TabType } from '../types';

interface HeaderProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  newsAlertCount: number;
}

function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

export default function Header({ activeTab, setActiveTab, newsAlertCount }: HeaderProps) {
  const { niftyBadge, backendOnline, backendProvider, user, logout, setIsAuthModalOpen, aiContext } = useApp();
  const [profileOpen, setProfileOpen] = useState<boolean>(false);
  const [isDark, setIsDark]           = useState<boolean>(true);
  const drawerRef = useRef<HTMLElement | null>(null);

  const tabs: { id: TabType; label: string; badge?: number }[] = [
    { id: 'chat',      label: 'Chat' },
    { id: 'market',    label: 'Market' },
    { id: 'stocks',    label: 'Stocks' },
    { id: 'news',      label: 'News', badge: newsAlertCount },
    { id: 'portfolio', label: 'Portfolio' },
  ];

  const userStats = [
    { label: 'Holdings',  value: (aiContext.portfolio || []).length || '5' },
    { label: 'Watchlist', value: '12' },
    { label: 'Alerts',    value: '3' },
  ];

  // Apply theme to <html>
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Close drawer on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    if (profileOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileOpen]);

  const toggleTheme = () => setIsDark(d => !d);

  return (
    <>
      <header className="header">
        <div className="header-inner">
          {/* Logo */}
          <div className="logo">
            <div className="logo-icon">
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
            <span className="logo-text">Nifty<span className="logo-accent">50</span>GPT</span>
          </div>

          {/* Nav */}
          <nav className="nav-pills">
            {tabs.map(t => (
              <button
                key={t.id}
                className={`nav-pill ${activeTab === t.id ? 'active' : ''}`}
                onClick={() => setActiveTab(t.id)}
              >
                {t.label}
                {!!t.badge && t.badge > 0 && <span className="nav-pill-badge">{t.badge}</span>}
              </button>
            ))}
          </nav>

          {/* Right */}
          <div className="header-right">
            <div className="market-badge">
              <span className="badge-label">NIFTY 50</span>
              <span className="badge-value">{niftyBadge.value}</span>
              <span className={`badge-change ${niftyBadge.dir}`}>{niftyBadge.change}</span>
            </div>

            {/* Theme toggle */}
            <button className="theme-toggle-btn" onClick={toggleTheme} title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
              <span className={`theme-toggle-track ${isDark ? 'dark' : 'light'}`}>
                <span className="theme-toggle-thumb">
                  {isDark ? <MoonIcon /> : <SunIcon />}
                </span>
              </span>
            </button>

            {user ? (
              <button
                className={`profile-icon ${profileOpen ? 'active' : ''}`}
                title="User Profile"
                onClick={() => setProfileOpen(o => !o)}
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="header-avatar-img" />
                ) : (
                  <span className="header-avatar-initial">{user.name.charAt(0).toUpperCase()}</span>
                )}
              </button>
            ) : (
              <button
                className="header-signin-btn"
                onClick={() => setIsAuthModalOpen(true)}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                  <polyline points="10 17 15 12 10 7"/>
                  <line x1="15" y1="12" x2="3" y2="12"/>
                </svg>
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Overlay */}
      {profileOpen && <div className="profile-overlay" onClick={() => setProfileOpen(false)} />}

      {/* Profile Drawer */}
      {user && (
        <aside className={`profile-drawer ${profileOpen ? 'open' : ''}`} ref={drawerRef}>
          {/* Header */}
          <div className="pd-header">
            <div className="pd-avatar">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="pd-avatar-img" />
              ) : (
                <span className="pd-avatar-initial">{user.name.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="pd-identity">
              <span className="pd-name">{user.name}</span>
              <span className="pd-handle">{user.handle}</span>
            </div>
            <button className="pd-close" onClick={() => setProfileOpen(false)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {/* Stats */}
          <div className="pd-stats">
            {userStats.map(s => (
              <div key={s.label} className="pd-stat">
                <span className="pd-stat-value">{s.value}</span>
                <span className="pd-stat-label">{s.label}</span>
              </div>
            ))}
          </div>

          <div className="pd-divider" />

          {/* Theme */}
          <div className="pd-section-title">Appearance</div>
          <div className="pd-theme-row">
            <button
              className={`pd-theme-btn ${isDark ? 'active' : ''}`}
              onClick={() => setIsDark(true)}
            >
              <MoonIcon />
              <span>Dark</span>
            </button>
            <button
              className={`pd-theme-btn ${!isDark ? 'active' : ''}`}
              onClick={() => setIsDark(false)}
            >
              <SunIcon />
              <span>Light</span>
            </button>
          </div>

          <div className="pd-divider" />

          {/* Connection */}
          <div className="pd-section-title">Connection</div>
          <div className="pd-connection">
            <span className={`pd-conn-dot ${backendOnline ? 'on' : 'off'}`} />
            <span className="pd-conn-label">{backendOnline ? `Live · ${backendProvider}` : 'Backend Offline'}</span>
          </div>

          <div className="pd-divider" />

          {/* Preferences */}
          <div className="pd-section-title">Preferences</div>
          <div className="pd-prefs">
            {[
              { icon: '🔔', label: 'Price Alerts',  value: 'On' },
              { icon: '📊', label: 'Default View',  value: 'Chat' },
              { icon: '🌐', label: 'Market',         value: 'NSE / BSE' },
            ].map(p => (
              <div key={p.label} className="pd-pref-row">
                <span className="pd-pref-icon">{p.icon}</span>
                <span className="pd-pref-label">{p.label}</span>
                <span className="pd-pref-value">{p.value}</span>
              </div>
            ))}
          </div>

          <div className="pd-divider" />

          {/* Footer */}
          <div className="pd-footer">
            <span className="pd-since">Member since {user.since}</span>
            <button
              className="pd-signout"
              onClick={() => {
                setProfileOpen(false);
                logout();
              }}
            >
              Sign Out
            </button>
          </div>
        </aside>
      )}
    </>
  );
}
