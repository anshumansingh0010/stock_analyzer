import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode, useRef } from 'react';
import { API_BASE } from '../utils/api';
import { AppContextType, AiContextState, BadgeData, ToastState, ChatMessage } from '../types';

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  // ── Shared AI context (injected into every LLM call) ──────
  const [aiContext, setAiContext] = useState<AiContextState>({
    marketData: null,
    stockData:  null,
    news:       [],
    portfolio:  [],
  });

  // ── Multi-turn chat history ────────────────────────────────
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  // ── Nifty header badge ─────────────────────────────────────
  const [niftyBadge, setNiftyBadge] = useState<BadgeData>({ value: '—', change: '—', dir: '' });

  // ── Backend health ─────────────────────────────────────────
  const [backendOnline, setBackendOnline] = useState<boolean>(false);
  const [backendProvider, setBackendProvider] = useState<string>('');

  // ── Toast notification ─────────────────────────────────────
  const [toast, setToast] = useState<ToastState>({ msg: '', type: '', visible: false });
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string, type: ToastState['type'] = 'success') => {
    setToast({ msg, type, visible: true });
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => setToast(t => ({ ...t, visible: false })), 3000);
  }, []);

  // ── Update a specific AI context field ────────────────────
  const updateContext = useCallback((field: keyof AiContextState, value: any) => {
    setAiContext(prev => ({ ...prev, [field]: value }));
  }, []);

  // ── Health check ──────────────────────────────────────────
  const checkHealth = useCallback(async () => {
    try {
      const res  = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(4000) });
      const data = await res.json();
      if (data.status === 'ok') {
        setBackendOnline(true);
        setBackendProvider(data.provider || '');
      } else {
        setBackendOnline(false);
      }
    } catch {
      setBackendOnline(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const id = setInterval(checkHealth, 30_000);
    return () => clearInterval(id);
  }, [checkHealth]);

  return (
    <AppContext.Provider value={{
      aiContext, updateContext, setAiContext,
      chatHistory, setChatHistory,
      niftyBadge, setNiftyBadge,
      backendOnline, backendProvider,
      showToast, toast,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}
