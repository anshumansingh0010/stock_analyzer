import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode, useRef } from 'react';
import { API_BASE } from '../utils/api';
import { AppContextType, AiContextState, BadgeData, ToastState, ChatMessage, UserProfile } from '../types';
import { validateIdentifier } from '../utils/validation';

const AppContext = createContext<AppContextType | null>(null);

const DEFAULT_USER: UserProfile = {
  id: 'usr_demo_1',
  name: 'Jay Patel',
  email: 'jay.trader@nifty50gpt.ai',
  handle: '@jay_trader',
  since: 'Apr 2025',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150',
  provider: 'email',
};

export function AppProvider({ children }: { children: ReactNode }) {
  // ── User Auth State ─────────────────────────────────────────
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const isLoggedOut = localStorage.getItem('stock_sense_logged_out') === 'true';
      if (isLoggedOut) return null;
      const saved = localStorage.getItem('stock_sense_user');
      return saved ? JSON.parse(saved) : DEFAULT_USER;
    } catch {
      return DEFAULT_USER;
    }
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

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

  // ── Auth Handlers ──────────────────────────────────────────
  const login = useCallback((email: string, name?: string, avatarUrl?: string, provider: 'email' | 'google' | 'otp' = 'email') => {
    const rawName = name || email.split('@')[0] || 'Trader';
    const formattedName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
    const handle = `@${rawName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

    const newUser: UserProfile = {
      id: `usr_${Date.now()}`,
      name: formattedName,
      email,
      handle,
      since: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(formattedName)}`,
      provider,
    };

    localStorage.removeItem('stock_sense_logged_out');
    localStorage.setItem('stock_sense_user', JSON.stringify(newUser));
    setUser(newUser);
    setIsAuthModalOpen(false);
    showToast(`Welcome back, ${newUser.name}!`, 'success');
  }, [showToast]);

  const loginWithGoogle = useCallback(async () => {
    return new Promise<void>((resolve) => {
      // Simulate interactive Google Sign-In
      setTimeout(() => {
        const googleUser: UserProfile = {
          id: `usr_google_${Date.now()}`,
          name: 'Alex Rivers',
          email: 'alex.rivers@gmail.com',
          handle: '@alex_trader',
          since: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150',
          provider: 'google',
        };

        localStorage.removeItem('stock_sense_logged_out');
        localStorage.setItem('stock_sense_user', JSON.stringify(googleUser));
        setUser(googleUser);
        setIsAuthModalOpen(false);
        showToast('Signed in with Google successfully!', 'success');
        resolve();
      }, 600);
    });
  }, [showToast]);

  // Local fallback OTP store if offline
  const localOtpMapRef = useRef<Map<string, string>>(new Map());

  const sendOtp = useCallback(async (identifier: string) => {
    const val = validateIdentifier(identifier);
    if (!val.isValid) {
      return { success: false, message: val.message || 'Invalid email or mobile phone number' };
    }

    try {
      const res = await fetch(`${API_BASE}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, otp: data.otp, message: data.message };
      }
      return { success: false, message: data.message || 'Failed to send OTP code' };
    } catch {
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      localOtpMapRef.current.set(identifier.trim().toLowerCase(), generatedOtp);
      return {
        success: true,
        otp: generatedOtp,
        message: `OTP sent to ${identifier}`,
      };
    }
  }, []);

  const verifyOtp = useCallback(async (identifier: string, otp: string, name?: string) => {
    const val = validateIdentifier(identifier);
    if (!val.isValid) {
      return { success: false, message: val.message || 'Invalid identifier format' };
    }

    try {
      const res = await fetch(`${API_BASE}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, otp, name }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.user) {
        localStorage.removeItem('stock_sense_logged_out');
        localStorage.setItem('stock_sense_user', JSON.stringify(data.user));
        setUser(data.user);
        setIsAuthModalOpen(false);
        showToast(`Welcome back, ${data.user.name}! Verified with OTP.`, 'success');
        return { success: true };
      }
      return { success: false, message: data.message || 'Invalid OTP code' };
    } catch {
      const cleanId = identifier.trim().toLowerCase();
      const storedOtp = localOtpMapRef.current.get(cleanId);
      if (otp === '123456' || (storedOtp && storedOtp === otp)) {
        const isEmail = val.type === 'email';
        const formattedName = name && name.trim() ? name.trim() : (isEmail ? cleanId.split('@')[0] : `Trader ${cleanId.slice(-4)}`);
        const fallbackUser: UserProfile = {
          id: `usr_otp_${Date.now()}`,
          name: formattedName.charAt(0).toUpperCase() + formattedName.slice(1),
          email: isEmail ? cleanId : `${cleanId.replace(/[^0-9]/g, '')}@otp.nifty50gpt.ai`,
          phone: !isEmail ? cleanId : undefined,
          handle: `@${formattedName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
          since: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(formattedName)}`,
          provider: isEmail ? 'otp' : 'phone',
        };
        localStorage.removeItem('stock_sense_logged_out');
        localStorage.setItem('stock_sense_user', JSON.stringify(fallbackUser));
        setUser(fallbackUser);
        setIsAuthModalOpen(false);
        showToast(`Welcome back, ${fallbackUser.name}! Verified with OTP.`, 'success');
        return { success: true };
      }
      return { success: false, message: "Invalid OTP code. Use '123456' or requested code." };
    }
  }, [showToast]);

  const logout = useCallback(() => {
    localStorage.removeItem('stock_sense_user');
    localStorage.setItem('stock_sense_logged_out', 'true');
    setUser(null);
    showToast('Logged out successfully', 'info');
  }, [showToast]);

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

  // ── Auto pre-fetch AI context on startup ───────────────────
  const inittedRef = useRef(false);
  const initAiContext = useCallback(async () => {
    if (inittedRef.current) return;
    inittedRef.current = true;
    try {
      const [mRes, sRes, nRes, pRes] = await Promise.allSettled([
        fetch(`${API_BASE}/marketdata/snapshot`).then((r) => r.json()),
        fetch(`${API_BASE}/stock/nifty50`).then((r) => r.json()),
        fetch(`${API_BASE}/news/results`).then((r) => r.json()),
        fetch(`${API_BASE}/portfolio/demoUser`).then((r) => r.json()),
      ]);

      const updates: Partial<AiContextState> = {};
      if (mRes.status === "fulfilled" && mRes.value?.success) {
        updates.marketData = mRes.value.snapshot || mRes.value;
      }
      if (sRes.status === "fulfilled" && sRes.value?.success) {
        updates.stockData = sRes.value.stocks || sRes.value;
      }
      if (nRes.status === "fulfilled" && nRes.value?.success) {
        updates.news = nRes.value.results || nRes.value.articles || [];
      }
      if (pRes.status === "fulfilled" && pRes.value?.success) {
        updates.portfolio = pRes.value.portfolio?.holdings || [];
      }

      setAiContext((prev) => ({ ...prev, ...updates }));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    checkHealth();
    initAiContext();
    const id = setInterval(checkHealth, 30_000);
    return () => clearInterval(id);
  }, [checkHealth, initAiContext]);

  return (
    <AppContext.Provider value={{
      aiContext, updateContext, setAiContext,
      chatHistory, setChatHistory,
      niftyBadge, setNiftyBadge,
      backendOnline, backendProvider,
      showToast, toast,
      user, setUser,
      login, loginWithGoogle, sendOtp, verifyOtp, logout,
      isAuthModalOpen, setIsAuthModalOpen,
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
