'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Loader2,
  ChevronRight,
  Smartphone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

// ─── Types ───────────────────────────────────────────────────────────────────
type AuthTab = 'PHONE' | 'EMAIL';
type PhoneStep = 'PHONE' | 'OTP';
type EmailMode = 'signin' | 'signup';

// ─── Google SVG Icon ──────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

// ─── Inner component (needs useSearchParams, must be inside Suspense) ─────────
function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Tab state
  const [activeTab, setActiveTab] = useState<AuthTab>('PHONE');

  // Phone auth state
  const [phoneStep, setPhoneStep] = useState<PhoneStep>('PHONE');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [cooldown, setCooldown] = useState(0);

  // Email auth state
  const [emailMode, setEmailMode] = useState<EmailMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  // Common
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // OTP input refs
  const otpRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // Show error from OAuth redirect (?error=...)
  useEffect(() => {
    const error = searchParams.get('error');
    if (error) {
      const messages: Record<string, string> = {
        oauth_failed: 'Google sign-in failed. Please try again.',
        missing_code: 'Invalid OAuth callback. Please try again.',
        server_error: 'Server error during sign-in. Please try again.',
      };
      toast.error(messages[error] ?? 'Authentication failed. Please try again.');
    }
  }, [searchParams]);

  // Cooldown timer for OTP resend
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // ── Phone: Send OTP ──────────────────────────────────────────────────────────
  async function handleSendOtp(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (phone.length !== 10) {
      toast.error('Please enter a 10-digit phone number');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/otp-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: `+91${phone}` }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP');
      setPhoneStep('OTP');
      setCooldown(30);
      toast.success('OTP sent!');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ── Phone: OTP input handlers ────────────────────────────────────────────────
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) otpRefs[index + 1].current?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs[index - 1].current?.focus();
    }
  };

  // ── Phone: Verify OTP ────────────────────────────────────────────────────────
  async function handleVerifyOtp(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const otpValue = otp.join('');
    if (otpValue.length !== 6) {
      toast.error('Please enter the 6-digit code');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/otp-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: `+91${phone}`, otp: otpValue }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid OTP');
      if (data.session) await supabase.auth.setSession(data.session);
      toast.success('Login successful!');
      router.push(data.redirect ?? '/');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ── Email: Sign in / Sign up ─────────────────────────────────────────────────
  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, mode: emailMode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');

      if (data.needsVerification) {
        setVerificationSent(true);
        toast.success(data.message ?? 'Check your email!');
        return;
      }

      if (data.session) await supabase.auth.setSession(data.session);
      toast.success(emailMode === 'signup' ? 'Account created!' : 'Welcome back!');
      router.push(data.redirect ?? '/');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ── Google OAuth ─────────────────────────────────────────────────────────────
  async function handleGoogleAuth() {
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });
      if (error) throw error;
      // Browser will redirect — no need to setLoading(false)
    } catch (err: any) {
      toast.error(err.message ?? 'Google sign-in failed');
      setGoogleLoading(false);
    }
  }

  // ── Switch tab: reset per-tab state ─────────────────────────────────────────
  function switchTab(tab: AuthTab) {
    setActiveTab(tab);
    setPhoneStep('PHONE');
    setOtp(['', '', '', '', '', '']);
    setVerificationSent(false);
    setPassword('');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen w-full flex-col items-center bg-[#fafaf8] dark:bg-zinc-950">
      <div className="flex w-full max-w-[420px] flex-col px-6 pt-16 pb-12">

        {/* ── Logo ─────────────────────────────────────────────────────────── */}
        <div className="mb-10 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-[#022c22] text-white shadow-lg shadow-[#022c22]/20">
            <Smartphone className="size-5" />
          </div>
          <span className="text-2xl font-black tracking-tight text-[#022c22] dark:text-white">
            Rozgar
          </span>
        </div>

        {/* ── Heading ──────────────────────────────────────────────────────── */}
        <div className="mb-8">
          <h1 className="text-[2.4rem] font-black leading-tight tracking-tight text-[#022c22] dark:text-white">
            {activeTab === 'PHONE' && phoneStep === 'OTP'
              ? 'Verify your\nnumber'
              : 'Welcome\nback'}
          </h1>
          <p className="mt-2 text-base font-medium text-zinc-400">
            {activeTab === 'PHONE' && phoneStep === 'PHONE' && 'Sign in with your phone number'}
            {activeTab === 'PHONE' && phoneStep === 'OTP' && `OTP sent to +91 ${phone.slice(0, 5)} ${phone.slice(5)}`}
            {activeTab === 'EMAIL' && !verificationSent && (emailMode === 'signin' ? 'Sign in with email & password' : 'Create a new account')}
            {activeTab === 'EMAIL' && verificationSent && 'Verification email sent'}
          </p>
        </div>

        {/* ── Tab Switcher ─────────────────────────────────────────────────── */}
        {phoneStep === 'PHONE' && !verificationSent && (
          <div className="mb-7 flex gap-2 rounded-2xl bg-zinc-100 p-1 dark:bg-zinc-900">
            {(['PHONE', 'EMAIL'] as AuthTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => switchTab(tab)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-all ${
                  activeTab === tab
                    ? 'bg-white text-[#022c22] shadow-sm dark:bg-zinc-800 dark:text-white'
                    : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
                }`}
              >
                {tab === 'PHONE' ? <Smartphone className="size-4" /> : <Mail className="size-4" />}
                {tab === 'PHONE' ? 'Phone' : 'Email'}
              </button>
            ))}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            PHONE TAB
        ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'PHONE' && (
          <>
            {phoneStep === 'PHONE' ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">
                    Phone Number
                  </Label>
                  <div className="flex h-14 items-center rounded-2xl border-2 border-zinc-100 bg-white px-4 focus-within:border-[#22c55e] transition-colors dark:bg-zinc-900 dark:border-zinc-800">
                    <span className="mr-3 font-bold text-zinc-400 text-base">+91</span>
                    <input
                      id="phone"
                      type="tel"
                      placeholder="00000 00000"
                      className="w-full bg-transparent text-lg font-bold tracking-widest outline-none placeholder:text-zinc-300 dark:text-white"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      autoFocus
                    />
                  </div>
                </div>
                <Button
                  className="h-14 w-full rounded-2xl bg-[#22c55e] text-base font-bold text-white shadow-lg shadow-[#22c55e]/25 hover:bg-[#16a34a] transition-all active:scale-[0.98]"
                  disabled={loading || phone.length !== 10}
                >
                  {loading ? <Loader2 className="size-5 animate-spin" /> : <>Send OTP <ChevronRight className="ml-1 size-4" /></>}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <button
                  type="button"
                  onClick={() => { setPhoneStep('PHONE'); setOtp(['', '', '', '', '', '']); }}
                  className="flex items-center gap-1.5 text-sm font-bold text-zinc-400 hover:text-[#022c22] transition-colors group"
                >
                  <ArrowLeft className="size-4 group-hover:-translate-x-0.5 transition-transform" />
                  Change number
                </button>

                <div className="flex justify-between gap-2">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={otpRefs[i]}
                      type="tel"
                      maxLength={1}
                      className="flex size-13 w-full items-center justify-center rounded-xl border-2 border-zinc-100 bg-white text-center text-2xl font-black focus:border-[#22c55e] outline-none dark:bg-zinc-900 dark:border-zinc-800 dark:text-white transition-colors"
                      style={{ height: '3.25rem' }}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(i, e)}
                      autoFocus={i === 0}
                    />
                  ))}
                </div>

                <div className="space-y-3">
                  <Button
                    className="h-14 w-full rounded-2xl bg-[#22c55e] text-base font-bold text-white shadow-lg shadow-[#22c55e]/25 hover:bg-[#16a34a] active:scale-[0.98]"
                    disabled={loading || otp.join('').length !== 6}
                  >
                    {loading ? <Loader2 className="size-5 animate-spin" /> : 'Verify Code'}
                  </Button>
                  <div className="text-center">
                    {cooldown > 0 ? (
                      <p className="text-sm font-medium text-zinc-400">Resend in {cooldown}s</p>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSendOtp()}
                        className="text-sm font-bold text-[#22c55e] underline underline-offset-4 hover:text-[#16a34a]"
                      >
                        Resend OTP
                      </button>
                    )}
                  </div>
                </div>
              </form>
            )}
          </>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            EMAIL TAB
        ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'EMAIL' && (
          <>
            {verificationSent ? (
              /* Verification sent state */
              <div className="flex flex-col items-center gap-4 py-6 text-center">
                <div className="flex size-16 items-center justify-center rounded-full bg-emerald-50">
                  <CheckCircle2 className="size-8 text-[#22c55e]" />
                </div>
                <div>
                  <p className="font-bold text-[#022c22] dark:text-white">Check your inbox</p>
                  <p className="mt-1 text-sm text-zinc-400">
                    We sent a confirmation link to <span className="font-semibold text-zinc-600">{email}</span>.
                    Click it to activate your account, then sign in.
                  </p>
                </div>
                <button
                  onClick={() => { setVerificationSent(false); setEmailMode('signin'); }}
                  className="mt-2 text-sm font-bold text-[#22c55e] underline underline-offset-4"
                >
                  Back to sign in
                </button>
              </div>
            ) : (
              <form onSubmit={handleEmailAuth} className="space-y-4">
                {/* Email */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">
                    Email Address
                  </Label>
                  <div className="flex h-14 items-center rounded-2xl border-2 border-zinc-100 bg-white px-4 focus-within:border-[#22c55e] transition-colors dark:bg-zinc-900 dark:border-zinc-800">
                    <Mail className="mr-3 size-5 shrink-0 text-zinc-300" />
                    <input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      className="w-full bg-transparent text-base font-semibold outline-none placeholder:text-zinc-300 dark:text-white"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoFocus
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">
                    Password
                  </Label>
                  <div className="flex h-14 items-center rounded-2xl border-2 border-zinc-100 bg-white px-4 focus-within:border-[#22c55e] transition-colors dark:bg-zinc-900 dark:border-zinc-800">
                    <Lock className="mr-3 size-5 shrink-0 text-zinc-300" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder={emailMode === 'signup' ? 'Min. 6 characters' : '••••••••'}
                      className="w-full bg-transparent text-base font-semibold outline-none placeholder:text-zinc-300 dark:text-white"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="ml-2 shrink-0 text-zinc-300 hover:text-zinc-500 transition-colors"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="h-14 w-full rounded-2xl bg-[#22c55e] text-base font-bold text-white shadow-lg shadow-[#22c55e]/25 hover:bg-[#16a34a] transition-all active:scale-[0.98]"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : emailMode === 'signin' ? (
                    <>Sign In <ChevronRight className="ml-1 size-4" /></>
                  ) : (
                    <>Create Account <ChevronRight className="ml-1 size-4" /></>
                  )}
                </Button>

                {/* Toggle mode */}
                <p className="text-center text-sm text-zinc-400">
                  {emailMode === 'signin' ? (
                    <>
                      Don&apos;t have an account?{' '}
                      <button
                        type="button"
                        onClick={() => { setEmailMode('signup'); setPassword(''); }}
                        className="font-bold text-[#022c22] hover:text-[#22c55e] transition-colors dark:text-white"
                      >
                        Sign up
                      </button>
                    </>
                  ) : (
                    <>
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => { setEmailMode('signin'); setPassword(''); }}
                        className="font-bold text-[#022c22] hover:text-[#22c55e] transition-colors dark:text-white"
                      >
                        Sign in
                      </button>
                    </>
                  )}
                </p>
              </form>
            )}
          </>
        )}

        {/* ── Divider + Google ─────────────────────────────────────────────── */}
        {phoneStep === 'PHONE' && !verificationSent && (
          <div className="mt-7 space-y-4">
            <div className="relative flex items-center gap-3">
              <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-800" />
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-300">or</span>
              <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-800" />
            </div>

            <button
              onClick={handleGoogleAuth}
              disabled={googleLoading}
              className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl border-2 border-zinc-100 bg-white font-bold text-zinc-700 shadow-sm transition-all hover:border-zinc-200 hover:shadow-md active:scale-[0.98] disabled:opacity-60 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-200"
            >
              {googleLoading ? (
                <Loader2 className="size-5 animate-spin text-zinc-400" />
              ) : (
                <>
                  <GoogleIcon />
                  Continue with Google
                </>
              )}
            </button>
          </div>
        )}

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <p className="mt-12 text-center text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300">
          Secure Auth by Supabase
        </p>
      </div>
    </div>
  );
}

// Wrap in Suspense so useSearchParams works with Next.js static rendering
export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageInner />
    </Suspense>
  );
}
