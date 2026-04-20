'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Loader2, 
  ChevronRight,
  Smartphone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [cooldown, setCooldown] = useState(0);
  
  const otpRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // ── Cooldown Timer ────────────────────────────────────────────────────────
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // ── Handle Phone Submission ────────────────────────────────────────────────
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
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

      setStep('OTP');
      setCooldown(30);
      toast.success('OTP sent successfully!');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ── Handle OTP Input ───────────────────────────────────────────────────────
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-advance
    if (value && index < 5) {
      otpRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs[index - 1].current?.focus();
    }
  };

  // ── Handle OTP Verification ────────────────────────────────────────────────
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

      toast.success('Login successful!');
      
      // Redirect based on role
      if (data.role === 'new_user') router.push('/onboarding');
      else if (data.role === 'customer') router.push('/customer/dashboard');
      else if (data.role === 'worker') router.push('/worker/dashboard');
      else if (data.role === 'partner_node') router.push('/partner/dashboard');
      else router.push('/');
      
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full flex-col items-center bg-[#fdfdfb] dark:bg-black">
      <div className="flex w-full max-w-[430px] flex-col px-8 pt-20">
        
        {/* Logo Section */}
        <div className="mb-10 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-[#022c22] text-white shadow-lg">
            <Smartphone className="size-6" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-[#022c22] dark:text-white">Rozgar</span>
        </div>

        {/* Heading Section */}
        <div className="mb-10">
          <h1 className="text-4xl font-black leading-tight text-[#022c22] dark:text-white">
            Welcome to <br /> Rozgar
          </h1>
          <p className="mt-3 text-lg font-medium text-zinc-500">
            {step === 'PHONE' 
              ? 'Enter your phone number to continue' 
              : `OTP sent to +91 ${phone.slice(0,5)} ${phone.slice(5)}`}
          </p>
        </div>

        {/* Form Section */}
        {step === 'PHONE' ? (
          <form onSubmit={handleSendOtp} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-bold uppercase tracking-wider text-zinc-400">Phone Number</Label>
              <div className="flex h-16 items-center rounded-2xl border-2 border-zinc-100 bg-zinc-50/50 px-4 focus-within:border-[#22c55e] transition-all dark:bg-zinc-900 dark:border-zinc-800">
                <span className="mr-3 text-lg font-bold text-zinc-400">+91</span>
                <input 
                  id="phone"
                  type="tel"
                  placeholder="00000 00000"
                  className="w-full bg-transparent text-xl font-bold tracking-widest outline-none placeholder:text-zinc-300"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  autoFocus
                />
              </div>
            </div>
            <Button 
              className="h-16 w-full rounded-2xl bg-[#22c55e] text-lg font-bold text-white shadow-xl shadow-[#22c55e]/20 hover:bg-[#16a34a]"
              disabled={loading || phone.length !== 10}
            >
              {loading ? <Loader2 className="size-6 animate-spin" /> : 'Send OTP'}
              {!loading && <ChevronRight className="ml-2 size-5" />}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-8">
            <div className="flex justify-between gap-2">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={otpRefs[i]}
                  type="tel"
                  maxLength={1}
                  className="flex size-14 items-center justify-center rounded-xl border-2 border-zinc-100 bg-zinc-50 text-center text-2xl font-bold focus:border-[#22c55e] outline-none dark:bg-zinc-900 dark:border-zinc-800"
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  autoFocus={i === 0}
                />
              ))}
            </div>

            <div className="space-y-4">
              <Button 
                className="h-16 w-full rounded-2xl bg-[#22c55e] text-lg font-bold text-white shadow-xl shadow-[#22c55e]/20 hover:bg-[#16a34a]"
                disabled={loading || otp.join('').length !== 6}
              >
                {loading ? <Loader2 className="size-6 animate-spin" /> : 'Verify Code'}
              </Button>
              
              <div className="text-center">
                {cooldown > 0 ? (
                  <p className="text-sm font-medium text-zinc-400">Resend OTP in {cooldown}s</p>
                ) : (
                  <button 
                    type="button"
                    onClick={handleSendOtp}
                    className="text-sm font-bold text-[#22c55e] underline underline-offset-4"
                  >
                    Resend OTP
                  </button>
                )}
              </div>
            </div>
          </form>
        )}

        <p className="mt-20 text-center text-[10px] uppercase tracking-widest text-zinc-400">
          Secure Login by Supabase Auth
        </p>
      </div>
    </div>
  );
}
