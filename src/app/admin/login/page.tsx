'use client';

import { useState } from 'react';
import { Loader2, Lock, User, ShieldCheck } from 'lucide-react';
import { loginAdmin } from '../actions';

export default function AdminLogin() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsPending(true);
    setError(null);
    const result = await loginAdmin(formData);
    if (result?.error) {
      setError(result.error);
      setIsPending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-6">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="size-96 rounded-full bg-[#40C057]/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-[#1B4332] shadow-2xl shadow-[#1B4332]/50">
            <ShieldCheck className="size-8 text-[#40C057]" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-black text-white" style={{ fontFamily: 'var(--font-heading)' }}>
              Admin Console
            </h1>
            <p className="mt-1 text-sm text-neutral-400">Restricted Access · Rozgar HQ</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-neutral-800 bg-neutral-900 p-8 shadow-2xl">
          <form action={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2.5 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                <span className="size-1.5 rounded-full bg-red-500 shrink-0" />
                {error}
              </div>
            )}

            {/* Username */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500" htmlFor="username">
                Username
              </label>
              <div className="flex h-12 items-center rounded-xl border border-neutral-800 bg-neutral-950 px-4 focus-within:border-[#40C057]/50 transition-colors">
                <User className="mr-3 size-4 shrink-0 text-neutral-600" />
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  autoComplete="username"
                  className="w-full bg-transparent text-sm font-semibold text-neutral-100 placeholder:text-neutral-700 outline-none"
                  placeholder="admin"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500" htmlFor="password">
                Password
              </label>
              <div className="flex h-12 items-center rounded-xl border border-neutral-800 bg-neutral-950 px-4 focus-within:border-[#40C057]/50 transition-colors">
                <Lock className="mr-3 size-4 shrink-0 text-neutral-600" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  className="w-full bg-transparent text-sm font-semibold text-neutral-100 placeholder:text-neutral-700 outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1B4332] font-black text-sm text-white shadow-lg shadow-[#1B4332]/30 transition-all hover:bg-[#1B4332]/90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                'Access Dashboard'
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-[10px] font-bold uppercase tracking-widest text-neutral-700">
          Unauthorised access is monitored
        </p>
      </div>
    </div>
  );
}
