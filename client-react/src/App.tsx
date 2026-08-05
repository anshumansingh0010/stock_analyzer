import { useState, useEffect } from 'react';
import { AppProvider } from './context/AppContext';
import Header       from './components/Header';
import Toast        from './components/Toast';
import ChatTab      from './tabs/ChatTab/ChatTab';
import MarketTab    from './tabs/MarketTab/MarketTab';
import StocksTab    from './tabs/StocksTab/StocksTab';
import NewsTab      from './tabs/NewsTab/NewsTab';
import PortfolioTab from './tabs/PortfolioTab/PortfolioTab';
import { TabType } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [newsAlertCount, setNewsAlertCount] = useState<number>(0);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeTab]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    if (tab === 'news') setNewsAlertCount(0);
  };

  return (
    <AppProvider>
      <Header activeTab={activeTab} setActiveTab={handleTabChange} newsAlertCount={newsAlertCount} />
      <main className="main">
        {activeTab === 'chat'      && <ChatTab />}
        {activeTab === 'market'    && <MarketTab />}
        {activeTab === 'stocks'    && <StocksTab />}
        {activeTab === 'news'      && <NewsTab onAlertCount={setNewsAlertCount} />}
        {activeTab === 'portfolio' && <PortfolioTab />}
      </main>
      <Toast />
    </AppProvider>
  );
}
