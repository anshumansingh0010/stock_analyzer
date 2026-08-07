import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {  Trash2,  CheckCircle2, Circle } from 'lucide-react';

interface ChatSidebarProps {
  onQuickPrompt: (prompt: string) => void;
  onClear: () => void;
}

const CATEGORIZED_PROMPTS = [
  {
    category: ' Market Pulse',
    items: [
      'Why is Nifty moving today?',
      'Explain RBI policy impact',
      'Sector performance summary',
    ]
  },
  {
    category: ' Stock Deep Dives',
    items: [
      'Should I buy TCS?',
      'Why is Reliance falling?',
      'Compare HDFC vs ICICI Bank',
    ]
  },
  {
    category: ' F&O & Derivatives',
    items: [
      'Nifty Put-Call Ratio & Max Pain',
      'Top volume & delivery stocks',
    ]
  },
  {
    category: ' Portfolio Audit',
    items: [
      "What's my portfolio risk?",
      'Suggest rebalancing for my holdings',
    ]
  }
];

export default function ChatSidebar({ 
  onQuickPrompt, 
  onClear 
}: ChatSidebarProps) {
  const { aiContext } = useApp();
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const ctxItems = [
    { id: 'market', label: 'Live Market Data', active: !!aiContext.marketData },
    { id: 'stock', label: 'Active Stock Data', active: !!aiContext.stockData },
    { id: 'news', label: 'News Feed Stream', active: (aiContext.news || []).length > 0 },
    { id: 'portfolio', label: 'Portfolio Context', active: (aiContext.portfolio || []).length > 0 },
  ];

  return (
    <aside className="chat-sidebar-v2">
      <div className="sidebar-header-v2">
        <div className="sh-title flex items-center gap-2">
          <div className="sh-icon-wrap">
          </div>
          <span className="font-bold text-sm">Intelligence Hub</span>
        </div>
      </div>

      {/* Category Pills Filter */}
      <div className="sidebar-category-pills">
        <button 
          className={`cat-pill ${activeCategory === 'all' ? 'active' : ''}`} 
          onClick={() => setActiveCategory('all')}
        >
          All Prompts
        </button>
        {CATEGORIZED_PROMPTS.map(c => (
          <button 
            key={c.category} 
            className={`cat-pill ${activeCategory === c.category ? 'active' : ''}`}
            onClick={() => setActiveCategory(c.category)}
          >
            {c.category.split(' ')[0]} {c.category.split(' ')[1]}
          </button>
        ))}
      </div>

      {/* Categorized Quick Prompts */}
      <div className="sidebar-prompts-scroll">
        {CATEGORIZED_PROMPTS.filter(c => activeCategory === 'all' || activeCategory === c.category).map(cat => (
          <div key={cat.category} className="prompt-group">
            <div className="group-title flex items-center gap-1.5">
              <span>{cat.category}</span>
            </div>
            <div className="group-items">
              {cat.items.map(prompt => (
                <button 
                  key={prompt} 
                  className="prompt-chip-btn"
                  onClick={() => onQuickPrompt(prompt)}
                >
                  <span className="pc-text">{prompt}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="sidebar-divider" />

      {/* Live Context Connection Card */}
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

      {/* Clear Chat Button */}
      <button className="clear-chat-btn-v2" onClick={onClear}>
        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
        <span>Clear Conversation</span>
      </button>
    </aside>
  );
}
