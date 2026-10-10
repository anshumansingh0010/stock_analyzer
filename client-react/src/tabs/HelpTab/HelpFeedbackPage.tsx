import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { apiFetch } from '../../utils/api';
import { 
  ArrowLeft, 
  Search, 
  MessageSquare, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  Send, 
  CheckCircle2, 
  BookOpen, 
  Sliders, 
  Keyboard, 
  Star,
  Mail
} from 'lucide-react';

interface HelpFeedbackPageProps {
  onBack: () => void;
  onOpenShortcuts?: () => void;
}

interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
}

const FAQS: FAQItem[] = [
  {
    id: 'ai-accuracy',
    category: 'AI Copilot',
    question: 'How does StockSense AI analyze market trends and stocks?',
    answer: 'StockSense AI combines real-time NSE market indices, company fundamentals, technical indicators (RSI, moving averages, Bollinger Bands), and curated financial news streams. It synthesizes this multi-layer context through advanced LLMs to provide structured institutional-grade intelligence.'
  },
  {
    id: 'sebi-disclaimer',
    category: 'Regulatory',
    question: 'Are stock suggestions considered SEBI registered financial advice?',
    answer: 'No. StockSense AI is strictly an analytical and educational intelligence assistant. It does not provide SEBI-registered investment advisory or portfolio management services. Always conduct your own research or consult an authorized financial advisor before deploying capital.'
  },
  {
    id: 'fo-derivatives',
    category: 'F&O Analysis',
    question: 'Can I analyze Options (PCR, Max Pain, Open Interest)?',
    answer: 'Yes! You can query Option chain metrics like Nifty/BankNifty Put-Call Ratio (PCR), Max Pain strike calculations, and institutional call/put open interest accumulation directly in the AI Chat tab or by selecting prompts from the sidebar.'
  },
  {
    id: 'settings-preferences',
    category: 'AI Copilot',
    question: 'How do the Copilot Preferences (Detailed vs Executive) work?',
    answer: 'Click the Settings icon at the bottom of the Chat sidebar to configure your AI response style. "Detailed Analysis" delivers full technical breakdowns, support/resistance levels, and macro news context. "Executive Summary" produces concise 3-bullet decision summaries.'
  },
  {
    id: 'data-standby',
    category: 'Live Feeds',
    question: 'What does "Standby" vs "Ready" mean in the sidebar data feeds?',
    answer: '"Ready" indicates that the respective context stream (Live Market Data, Active Stock Data, News Stream, or Portfolio Holdings) is loaded and actively injected into your AI queries. "Standby" means that feed is currently idle or awaiting your interaction in that section.'
  },
  {
    id: 'security-privacy',
    category: 'Security',
    question: 'How is my portfolio data secured?',
    answer: 'All portfolio holdings and user settings are protected with bank-grade encryption, authenticated via secure JWT session tokens, and never shared with third parties or external data brokers.'
  }
];

export default function HelpFeedbackPage({ onBack, onOpenShortcuts }: HelpFeedbackPageProps) {
  const { user, showToast } = useApp();
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  
  // FAQ accordion open/close state
  const [expandedFaq, setExpandedFaq] = useState<string | null>('ai-accuracy');

  // Feedback form state
  const [feedbackType, setFeedbackType] = useState<'feature' | 'bug' | 'accuracy' | 'general'>('general');
  const [rating, setRating] = useState<number>(5);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Filtered FAQs based on search
  const filteredFaqs = useMemo(() => {
    if (!searchQuery.trim()) return FAQS;
    const q = searchQuery.toLowerCase();
    return FAQS.filter(
      f => f.question.toLowerCase().includes(q) || 
           f.answer.toLowerCase().includes(q) ||
           f.category.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const handleToggleFaq = (id: string) => {
    setExpandedFaq(prev => (prev === id ? null : id));
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      showToast('Please provide a subject and message', 'warn');
      return;
    }
    if (!email.trim()) {
      showToast('Please provide your email address', 'warn');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await apiFetch('/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedbackType,
          rating,
          email: email.trim(),
          subject: subject.trim(),
          message: message.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit feedback');
      }

      setIsSubmitted(true);
      if (data.emailSent) {
        showToast('Feedback submitted and email sent successfully!', 'success');
      } else {
        showToast('Feedback recorded successfully! Thank you.', 'success');
      }
      setSubject('');
      setMessage('');
    } catch (err: any) {
      showToast(err.message || 'Failed to submit feedback. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="tab-section active help-page-container">
      <div className="help-page-content">
        
        {/* Top Navigation & Return */}
        <div className="help-top-nav">
          <button 
            type="button" 
            className="help-back-btn" 
            onClick={onBack}
            title="Return to Chat"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Chat</span>
          </button>
          
          <div className="flex items-center gap-2">
            <span className="help-badge flex items-center gap-1.5">
              <LifeBuoyIcon className="w-3.5 h-3.5" /> Support & Help Center
            </span>
          </div>
        </div>

        {/* Hero Header */}
        <div className="help-header-hero">
          <div className="help-title-row">
            <h1 className="help-page-title">Help & Feedback</h1>
          </div>
          <p className="help-page-subtitle">
            Find answers to frequently asked questions, learn how to get the most out of StockSense AI, or submit feedback to help us improve.
          </p>
        </div>

        {/* Search Bar */}
        <div className="help-search-wrapper">
          <Search className="w-4 h-4 help-search-icon" />
          <input
            type="text"
            className="help-search-input"
            placeholder="Search guides, topics, and FAQs (e.g. PCR, Settings, SEBI, Live Feeds)..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Quick Resource Cards */}
        <div className="help-cards-grid">
          <div className="help-feature-card">
            <div className="help-card-icon-wrap">
              <Sparkles className="w-5 h-5" />
            </div>
            <h2 className="help-card-title">Copilot Intelligence</h2>
            <p className="help-card-desc">
              Ask deep technical questions about Nifty 50 stocks, break down quarterly results, or check sector rotations in conversational natural language.
            </p>
          </div>

          <div className="help-feature-card">
            <div className="help-card-icon-wrap">
              <Sliders className="w-5 h-5" />
            </div>
            <h2 className="help-card-title">Customizable Settings</h2>
            <p className="help-card-desc">
              Tailor the AI detail depth (Detailed vs Executive), adjust risk sensitivity levels, and toggle real-time market data streaming in the Chat settings.
            </p>
          </div>

          <div className="help-feature-card">
            <div className="help-card-icon-wrap">
              <Keyboard className="w-5 h-5" />
            </div>
            <h2 className="help-card-title">Keyboard Shortcuts</h2>
            <p className="help-card-desc">
              Press <strong>Cmd+K</strong> or <strong>Alt+1..5</strong> to jump between Chat, Market, Stocks, News, and Portfolio views with lightning speed.
            </p>
          </div>
        </div>

        {/* Frequently Asked Questions */}
        <div className="help-section">
          <h2 className="help-section-title">
            <BookOpen className="w-4 h-4 text-emerald-400" />
            Frequently Asked Questions
          </h2>

          <div className="faq-accordion-list">
            {filteredFaqs.length === 0 ? (
              <div className="p-6 text-center text-sm text-[var(--text-muted)] bg-[var(--bg-card)] rounded-lg border border-[var(--border-subtle)]">
                No matching questions found for "{searchQuery}". Try a different keyword or submit a question below.
              </div>
            ) : (
              filteredFaqs.map(faq => {
                const isOpen = expandedFaq === faq.id;
                return (
                  <div key={faq.id} className="faq-accordion-item">
                    <button
                      type="button"
                      className="faq-header-btn"
                      onClick={() => handleToggleFaq(faq.id)}
                    >
                      <span>{faq.question}</span>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="faq-content-body">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Feedback & Support Submission Form */}
        <div className="help-section">
          <div className="feedback-card-wrapper">
            <div className="feedback-card-header">
              <h2 className="feedback-card-title flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-amber-400" />
                Submit Feedback or Report an Issue
              </h2>
              <p className="feedback-card-sub">
                Help us make StockSense better. We actively review all suggestions, bug reports, and data inquiries.
              </p>
            </div>

            {isSubmitted ? (
              <div className="feedback-success-card">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                <h4>Thank You For Your Feedback!</h4>
                <p>
                  Your feedback has been received and routed to our product engineering team. We appreciate your contribution to improving StockSense.
                </p>
                <button
                  type="button"
                  className="help-back-btn mt-2"
                  onClick={() => setIsSubmitted(false)}
                >
                  Submit Another Note
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitFeedback} className="flex flex-col gap-4">
                
                {/* Category Chips */}
                <div className="form-group-custom">
                  <label className="form-label-custom">Feedback Category</label>
                  <div className="feedback-chips">
                    {[
                      { id: 'general', label: 'General Feedback' },
                      { id: 'feature', label: 'Feature Request' },
                      { id: 'bug', label: 'Bug Report' },
                      { id: 'accuracy', label: 'Market Data Issue' },
                    ].map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        className={`feedback-chip ${feedbackType === cat.id ? 'active' : ''}`}
                        onClick={() => setFeedbackType(cat.id as any)}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rating */}
                <div className="form-group-custom">
                  <label className="form-label-custom">Overall Experience</label>
                  <div className="rating-stars-row">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        className={`star-btn ${rating >= star ? 'active' : ''}`}
                        onClick={() => setRating(star)}
                        title={`Rate ${star} / 5`}
                      >
                        <Star className="w-5 h-5 fill-current" />
                      </button>
                    ))}
                    <span className="text-xs text-[var(--text-muted)] ml-2">
                      {rating === 5 ? 'Excellent' : rating === 4 ? 'Good' : rating === 3 ? 'Average' : 'Needs Improvement'}
                    </span>
                  </div>
                </div>

                {/* Inputs Grid */}
                <div className="feedback-form-grid">
                  <div className="form-group-custom">
                    <label className="form-label-custom">Your Email (for response)</label>
                    <input
                      type="email"
                      className="form-input-custom"
                      placeholder="you@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group-custom">
                    <label className="form-label-custom">Subject</label>
                    <input
                      type="text"
                      className="form-input-custom"
                      placeholder="e.g. Suggestion for Option Greeks display"
                      value={subject}
                      onChange={e => setSubject(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Message */}
                <div className="form-group-custom">
                  <label className="form-label-custom">Detailed Feedback or Description</label>
                  <textarea
                    className="form-textarea-custom"
                    rows={4}
                    placeholder="Describe your idea or what issue occurred in detail..."
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    required
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="feedback-submit-btn"
                  disabled={isSubmitting}
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? 'Sending...' : 'Send Feedback'}</span>
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Footer Status and Support Contact */}
        <div className="help-footer-status">
          <div className="flex items-center gap-4">
            <span className="status-pill">
              <span className="status-dot" />
              <span>NSE Live Feed & AI Engine Operational</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <a 
              href="mailto:anshumansingh0010@gmail.com" 
              className="flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>support@stocksense.ai</span>
            </a>
          </div>
        </div>

      </div>
    </section>
  );
}

function LifeBuoyIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      {...props} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="4" />
      <line x1="4.93" y1="4.93" x2="9.17" y2="9.17" />
      <line x1="14.83" y1="14.83" x2="19.07" y2="19.07" />
      <line x1="14.83" y1="9.17" x2="19.07" y2="4.93" />
      <line x1="4.93" y1="19.07" x2="9.17" y2="14.83" />
    </svg>
  );
}
