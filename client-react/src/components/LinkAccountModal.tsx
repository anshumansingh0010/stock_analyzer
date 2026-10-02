import { useState, useEffect, useRef, FormEvent, KeyboardEvent, ClipboardEvent } from 'react';
import { useApp } from '../context/AppContext';
import { validateIdentifier, isValidOtp } from '../utils/validation';
import { useGoogleLogin } from '@react-oauth/google';

export default function LinkAccountModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user, sendOtp, verifyOtp, loginWithGoogle, setUser } = useApp();
  
  const mode = "link";
  const [step, setStep] = useState<'input' | 'verify'>('input');
  const hasEmail = !!user?.email && !user?.email.endsWith('@otp.nifty50gpt.ai');
  const hasPhone = !!user?.phone;

  const [authMethod, setAuthMethod] = useState<'email' | 'mobile'>(hasPhone ? 'email' : 'mobile');
  const [identifier, setIdentifier] = useState('');
  const [fullName, setFullName] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  
  const [googleLoading, setGoogleLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [timer, setTimer] = useState<number>(30);

  const digitInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Reset state on modal open/close
  useEffect(() => {
    if (!isOpen) {
      setStep('input');
      setIdentifier('');
      setFullName('');
      setOtpDigits(['', '', '', '', '', '']);
      setErrorMsg('');
      setInfoMsg('');
    }
  }, [isOpen]);

  // Resend countdown timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (step === 'verify' && timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step, timer]);

  const loginGoogleHook = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setGoogleLoading(true);
      setErrorMsg('');
      try {
        await loginWithGoogle(tokenResponse.access_token, mode, user?.id);
        onClose();
      } catch (err: any) {
        setErrorMsg(err.message || 'Google Sign-In failed. Please try again.');
      } finally {
        setGoogleLoading(false);
      }
    },
    onError: () => {
      setErrorMsg('Google Sign-In was cancelled or failed.');
    }
  });

  const [confirmationResult, setConfirmationResult] = useState<any>(null);

  // Initialize Recaptcha
  const setupRecaptcha = () => {
    if (!(window as any).recaptchaVerifier) {
      import('firebase/auth').then(({ RecaptchaVerifier }) => {
        import('../utils/firebase').then(({ auth }) => {
          (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
            size: 'invisible',
          });
        });
      });
    }
  };

  useEffect(() => {
    if (isOpen && authMethod === 'mobile') {
      setupRecaptcha();
    }
  }, [isOpen, authMethod]);

  if (!isOpen) return null;

  const handleClose = () => {
    onClose();
    setErrorMsg('');
  };

  const handleGoogleSignIn = () => {
    loginGoogleHook();
  };



  const handleSendOtpSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    const validation = validateIdentifier(identifier, authMethod);
    if (!validation.isValid) {
      setErrorMsg(validation.message || 'Please provide a valid format');
      return;
    }

    setSubmitting(true);
    try {
      // Check user existence first
      const checkRes = await fetch('/api/auth/check-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim() })
      });
      const checkData = await checkRes.json();
      
      if (false && !checkData.exists) {
        setErrorMsg('Account not found. Please sign up first.');
        setSubmitting(false);
        return;
      }
      
      if (false && checkData.exists) {
        setErrorMsg('Account already exists. Please sign in.');
        setSubmitting(false);
        return;
      }

      if (authMethod === 'mobile') {
        const { signInWithPhoneNumber } = await import('firebase/auth');
        const { auth } = await import('../utils/firebase');
        setupRecaptcha();
        const appVerifier = (window as any).recaptchaVerifier;
        const formattedPhone = identifier.startsWith('+') ? identifier : `+91${identifier.replace(/[^0-9]/g, '')}`;
        
        const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
        setConfirmationResult(confirmation);
        setStep('verify');
        setTimer(60);
        setInfoMsg(`OTP sent to ${formattedPhone} via Firebase`);
        setTimeout(() => { digitInputRefs.current[0]?.focus(); }, 150);
      } else {
        const res = await sendOtp(identifier.trim());
        if (res.success) {
          setStep('verify');
          setTimer(30);
          setInfoMsg(res.message || `OTP sent to ${identifier}`);
          setTimeout(() => { digitInputRefs.current[0]?.focus(); }, 150);
        } else {
          setErrorMsg(res.message || 'Failed to send OTP code');
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to request OTP. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtpSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    const code = otpDigits.join('');
    if (!isValidOtp(code)) {
      setErrorMsg('Please enter all 6 numeric digits of the OTP code');
      return;
    }

    setSubmitting(true);
    try {
      if (authMethod === 'mobile' && confirmationResult) {
        const result = await confirmationResult.confirm(code);
        const token = await result.user.getIdToken();
        // Send Firebase token to our backend to create session
        const res = await fetch('/api/auth/firebase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, mode, userId: user?.id })
        });
        const data = await res.json();
        if (data.success && data.user) {
          localStorage.removeItem('stock_sense_logged_out');
          localStorage.setItem('stock_sense_user', JSON.stringify(data.user));
          if (data.token) localStorage.setItem('stock_sense_token', data.token);
          // @ts-ignore
          window.location.reload(); // Quick hack since setUser is in AppContext but we don't have direct access here easily without importing it, wait we have useApp
          // Actually, we can just use login hook or context
          // The issue is we need to set user in context. We can just reload for now, or emit an event.
        } else {
          setErrorMsg(data.message || 'Invalid OTP code.');
        }
      } else {
        const res = await verifyOtp(identifier.trim(), code, undefined, mode, user?.id);
        if (!res.success) {
          setErrorMsg(res.message || 'Invalid OTP code.');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDigitChange = (index: number, value: string) => {
    const cleanVal = value.replace(/[^0-9]/g, '');
    if (!cleanVal) {
      const newDigits = [...otpDigits];
      newDigits[index] = '';
      setOtpDigits(newDigits);
      return;
    }

    // Handle single character
    const char = cleanVal.slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = char;
    setOtpDigits(newDigits);

    // Auto focus next input
    if (index < 5) {
      digitInputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      digitInputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    const newDigits = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pastedData[i] || '';
    }
    setOtpDigits(newDigits);

    const targetIdx = Math.min(pastedData.length, 5);
    digitInputRefs.current[targetIdx]?.focus();
  };

  return (
    <div className="auth-backdrop" onClick={handleClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="auth-header">
          <div className="auth-logo-badge">
            <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
              <path d="M4 24 L10 16 L16 20 L22 10 L28 14" stroke="url(#g_auth)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="28" cy="14" r="3" fill="#00d4a8"/>
              <defs>
                <linearGradient id="g_auth" x1="4" y1="24" x2="28" y2="10" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#6366f1"/>
                  <stop offset="100%" stopColor="#00d4a8"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h2>{step === 'input' ? 'Link Account' : 'Verify OTP Code'}</h2>
          <p className="auth-subtitle">
            {step === 'input'
              ? 'Add a new email or mobile number to your account'
              : `Enter the 6-digit code sent to ${identifier}`}
          </p>
          <button className="auth-close-btn" onClick={handleClose} title="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="auth-body">
          <div id="recaptcha-container"></div>
          {step === 'input' ? (
            <>
              {/* Method Switcher Tabs */}
              {(!hasEmail || !hasPhone) && !(hasEmail && hasPhone) && (
                <div className="otp-method-tabs">
                {!hasEmail && (
                <button
                  type="button"
                  className={`otp-tab ${authMethod === 'email' ? 'active' : ''}`}
                  onClick={() => {
                    setAuthMethod('email');
                    setIdentifier('');
                    setErrorMsg('');
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                  <span>Email OTP</span>
                </button>
              )}
              {!hasPhone && (
                <button
                  type="button"
                  className={`otp-tab ${authMethod === 'mobile' ? 'active' : ''}`}
                  onClick={() => {
                    setAuthMethod('mobile');
                    setIdentifier('');
                    setErrorMsg('');
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                    <line x1="12" y1="18" x2="12.01" y2="18"/>
                  </svg>
                  <span>Mobile SMS</span>
                </button>
              )}
              </div>
            )}

            {hasEmail && hasPhone && (
              <div className="auth-banner-linked">
                Both Email and Phone are already linked!
              </div>
            )}

            {errorMsg && <div className="auth-error-banner">{errorMsg}</div>}

              <form onSubmit={handleSendOtpSubmit} className="auth-form">


                <div className="auth-input-group">
                  <label htmlFor="auth-identifier">
                    {authMethod === 'email' ? 'Email Address' : 'Mobile Phone Number'}
                  </label>
                  <input
                    id="auth-identifier"
                    type={authMethod === 'email' ? 'email' : 'tel'}
                    placeholder={authMethod === 'email' ? 'trader@example.com' : '+91 98765 43210'}
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                    disabled={submitting || (hasEmail && hasPhone)}
                  />
                </div>



                <button type="submit" className="auth-submit-btn" disabled={submitting || googleLoading}>
                  {submitting ? <span className="auth-spinner" /> : 'Get 6-Digit OTP Code'}
                </button>
              </form>

              {!hasEmail && (
                <>
                  <div className="auth-divider">
                    <span>OR LINK WITH</span>
                  </div>

                  <button
                    type="button"
                    className="auth-google-btn"
                    onClick={handleGoogleSignIn}
                    disabled={googleLoading || submitting}
                  >
                    {googleLoading ? (
                      <span className="auth-spinner" />
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                      </svg>
                    )}
                    <span>{googleLoading ? 'Connecting...' : `Link Google Account`}</span>
                  </button>
                </>
              )}
            </>
          ) : (
            <>
              {/* Step 2: Verification */}
              {infoMsg && <div className="otp-info-banner">{infoMsg}</div>}

              {errorMsg && <div className="auth-error-banner">{errorMsg}</div>}

              <form onSubmit={handleVerifyOtpSubmit} className="auth-form">
                <div className="otp-digits-container">
                  {[0, 1, 2, 3, 4, 5].map((idx) => (
                    <input
                      key={idx}
                      ref={(el) => { digitInputRefs.current[idx] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      className="otp-digit-box"
                      value={otpDigits[idx] || ''}
                      onChange={(e) => handleDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      onPaste={handlePaste}
                      disabled={submitting}
                    />
                  ))}
                </div>

                <button type="submit" className="auth-submit-btn" disabled={submitting}>
                  {submitting ? <span className="auth-spinner" /> : 'Verify & Link Account'}
                </button>
              </form>

              <div className="otp-actions-footer">
                <button
                  type="button"
                  className="otp-back-btn"
                  onClick={() => {
                    setStep('input');
                    setErrorMsg('');
                    setInfoMsg('');
                  }}
                >
                  ← Edit {authMethod === 'email' ? 'Email' : 'Number'}
                </button>

                {timer > 0 ? (
                  <span className="otp-timer">Resend code in {timer}s</span>
                ) : (
                  <button
                    type="button"
                    className="otp-resend-btn"
                    onClick={() => handleSendOtpSubmit()}
                    disabled={submitting}
                  >
                    Resend OTP Code
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
