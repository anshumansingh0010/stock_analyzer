import { useState, useEffect } from 'react';
import { AppProvider } from './context/AppContext';
import Header       from './components/Header';
import Toast        from './components/Toast';
import AuthModal    from './components/AuthModal';
import ChatTab      from './tabs/ChatTab/ChatTab';
import MarketTab    from './tabs/MarketTab/MarketTab';
import StocksTab    from './tabs/StocksTab/StocksTab';
import NewsTab      from './tabs/NewsTab/NewsTab';
import PortfolioTab from './tabs/PortfolioTab/PortfolioTab';
import { TabType } from './types';

const TAB_ORDER: Record<TabType, number> = {
  chat: 0,
  market: 1,
  stocks: 2,
  news: 3,
  portfolio: 4,
};

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [slideDir, setSlideDir] = useState<'right' | 'left'>('right');
  const [newsAlertCount, setNewsAlertCount] = useState<number>(0);

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

  return (
    <AppProvider>
      <Header activeTab={activeTab} setActiveTab={handleTabChange} newsAlertCount={newsAlertCount} />
      <main className={`main slide-${slideDir}`}>
        {activeTab === 'chat'      && <ChatTab />}
        {activeTab === 'market'    && <MarketTab />}
        {activeTab === 'stocks'    && <StocksTab />}
        {activeTab === 'news'      && <NewsTab onAlertCount={setNewsAlertCount} />}
        {activeTab === 'portfolio' && <PortfolioTab />}
      </main>
      <AuthModal />
      <Toast />
    </AppProvider>
  );
}
