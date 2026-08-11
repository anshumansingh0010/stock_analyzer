import { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Header       from './components/Header';
import Toast        from './components/Toast';
import AuthModal    from './components/AuthModal';
import ShortcutsModal from './components/ShortcutsModal';
import ChatTab      from './tabs/ChatTab/ChatTab';
import MarketTab    from './tabs/MarketTab/MarketTab';
import StocksTab    from './tabs/StocksTab/StocksTab';
import NewsTab      from './tabs/NewsTab/NewsTab';
import PortfolioTab from './tabs/PortfolioTab/PortfolioTab';
import { TabType } from './types';
import { matchesKeyCombination } from './utils/shortcuts';

const TAB_ORDER: Record<TabType, number> = {
  chat: 0,
  market: 1,
  stocks: 2,
  news: 3,
  portfolio: 4,
};

function MainApp() {
  const { customShortcuts } = useApp();
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const saved = localStorage.getItem('stock_sense_default_view');
    const validTabs: TabType[] = ['chat', 'market', 'stocks', 'news', 'portfolio'];
    if (saved && validTabs.includes(saved as TabType)) {
      return saved as TabType;
    }
    return 'chat';
  });
  const [slideDir, setSlideDir] = useState<'right' | 'left'>('right');
  const [newsAlertCount, setNewsAlertCount] = useState<number>(0);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState<boolean>(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeTab]);

  const handleTabChange = (newTab: TabType) => {
    if (newTab !== activeTab) {
      const prevIdx = TAB_ORDER[activeTab] ?? 0;
      const nextIdx = TAB_ORDER[newTab] ?? 0;
      setSlideDir(nextIdx >= prevIdx ? 'right' : 'left');
      setActiveTab(newTab);
      if (newTab === 'news') setNewsAlertCount(0);
    }
  };

  // Global Keyboard Shortcuts (Custom shortcuts + Direct 1..5, Alt+1..5, Ctrl+Shift+1..5, Cmd+K, ?)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isInput = target && (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.tagName === 'SELECT' || 
        target.isContentEditable
      );

      const code = e.code;
      const key = e.key;
      const keyLower = key ? key.toLowerCase() : '';

      // Escape key closes shortcuts modal
      if (key === 'Escape' || code === 'Escape') {
        if (shortcutsModalOpen) {
          e.preventDefault();
          setShortcutsModalOpen(false);
          return;
        }
      }

      // 1. Check User Custom Shortcuts
      if (customShortcuts.chat && matchesKeyCombination(e, customShortcuts.chat)) {
        e.preventDefault(); handleTabChange('chat'); setShortcutsModalOpen(false); return;
      }
      if (customShortcuts.market && matchesKeyCombination(e, customShortcuts.market)) {
        e.preventDefault(); handleTabChange('market'); setShortcutsModalOpen(false); return;
      }
      if (customShortcuts.stocks && matchesKeyCombination(e, customShortcuts.stocks)) {
        e.preventDefault(); handleTabChange('stocks'); setShortcutsModalOpen(false); return;
      }
      if (customShortcuts.news && matchesKeyCombination(e, customShortcuts.news)) {
        e.preventDefault(); handleTabChange('news'); setShortcutsModalOpen(false); return;
      }
      if (customShortcuts.portfolio && matchesKeyCombination(e, customShortcuts.portfolio)) {
        e.preventDefault(); handleTabChange('portfolio'); setShortcutsModalOpen(false); return;
      }
      if (customShortcuts.overlay && matchesKeyCombination(e, customShortcuts.overlay)) {
        e.preventDefault(); setShortcutsModalOpen(p => !p); return;
      }

      // 2. Standard Default Fallback Shortcuts
      const isNum1 = key === '1' || code === 'Digit1' || code === 'Numpad1';
      const isNum2 = key === '2' || code === 'Digit2' || code === 'Numpad2';
      const isNum3 = key === '3' || code === 'Digit3' || code === 'Numpad3';
      const isNum4 = key === '4' || code === 'Digit4' || code === 'Numpad4';
      const isNum5 = key === '5' || code === 'Digit5' || code === 'Numpad5';

      // If shortcuts modal is open: numbers 1..5 switch tab & close modal
      if (shortcutsModalOpen) {
        if (isNum1) { e.preventDefault(); handleTabChange('chat'); setShortcutsModalOpen(false); return; }
        if (isNum2) { e.preventDefault(); handleTabChange('market'); setShortcutsModalOpen(false); return; }
        if (isNum3) { e.preventDefault(); handleTabChange('stocks'); setShortcutsModalOpen(false); return; }
        if (isNum4) { e.preventDefault(); handleTabChange('news'); setShortcutsModalOpen(false); return; }
        if (isNum5) { e.preventDefault(); handleTabChange('portfolio'); setShortcutsModalOpen(false); return; }
      }

      // Modifier key combos: Alt+1..5 or Ctrl/Cmd+Shift+1..5
      const isAltCombo = e.altKey && !e.ctrlKey && !e.metaKey;
      const isCtrlShiftCombo = (e.ctrlKey || e.metaKey) && e.shiftKey;

      if (isAltCombo || isCtrlShiftCombo) {
        if (isNum1) { e.preventDefault(); handleTabChange('chat'); setShortcutsModalOpen(false); return; }
        if (isNum2) { e.preventDefault(); handleTabChange('market'); setShortcutsModalOpen(false); return; }
        if (isNum3) { e.preventDefault(); handleTabChange('stocks'); setShortcutsModalOpen(false); return; }
        if (isNum4) { e.preventDefault(); handleTabChange('news'); setShortcutsModalOpen(false); return; }
        if (isNum5) { e.preventDefault(); handleTabChange('portfolio'); setShortcutsModalOpen(false); return; }
        if (keyLower === 'k' || code === 'KeyK') { e.preventDefault(); setShortcutsModalOpen(p => !p); return; }
      }

      // Direct number keys 1..5 (outside text input fields)
      if (!isInput && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (isNum1) { e.preventDefault(); handleTabChange('chat'); return; }
        if (isNum2) { e.preventDefault(); handleTabChange('market'); return; }
        if (isNum3) { e.preventDefault(); handleTabChange('stocks'); return; }
        if (isNum4) { e.preventDefault(); handleTabChange('news'); return; }
        if (isNum5) { e.preventDefault(); handleTabChange('portfolio'); return; }
      }

      // Cmd+K or Ctrl+K (Toggle Shortcuts Cheat Sheet)
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && (keyLower === 'k' || code === 'KeyK')) {
        e.preventDefault();
        setShortcutsModalOpen(p => !p);
        return;
      }

      // ? key (outside text input fields)
      if (!isInput && (key === '?' || (e.shiftKey && code === 'Slash'))) {
        e.preventDefault();
        setShortcutsModalOpen(p => !p);
        return;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, shortcutsModalOpen, customShortcuts]);

  return (
    <>
      <Header 
        activeTab={activeTab} 
        setActiveTab={handleTabChange} 
        newsAlertCount={newsAlertCount} 
        onOpenShortcuts={() => setShortcutsModalOpen(true)}
      />
      <main className={`main slide-${slideDir}`}>
        <div style={{ display: activeTab === 'chat' ? 'contents' : 'none' }}>
          <ChatTab />
        </div>
        <div style={{ display: activeTab === 'market' ? 'contents' : 'none' }}>
          <MarketTab />
        </div>
        <div style={{ display: activeTab === 'stocks' ? 'contents' : 'none' }}>
          <StocksTab />
        </div>
        <div style={{ display: activeTab === 'news' ? 'contents' : 'none' }}>
          <NewsTab onAlertCount={setNewsAlertCount} />
        </div>
        <div style={{ display: activeTab === 'portfolio' ? 'contents' : 'none' }}>
          <PortfolioTab />
        </div>
      </main>
      <AuthModal />
      <ShortcutsModal 
        isOpen={shortcutsModalOpen} 
        onClose={() => setShortcutsModalOpen(false)} 
        onSelectTab={handleTabChange}
      />
      <Toast />
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}
