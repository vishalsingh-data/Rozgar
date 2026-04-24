'use client';

import Link from 'next/link';
import { ArrowRight, Zap, Shield, MapPin, Star, IndianRupee, Wrench, Phone, Users, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const STATS = [
  { value: '50K+', label: 'Workers' },
  { value: '2L+', label: 'Jobs Done' },
  { value: '4.9★', label: 'Rating' },
  { value: '98%', label: 'Success' },
];

const SERVICES = [
  { icon: Wrench, label: 'Plumber', color: 'bg-blue-50 text-blue-600' },
  { icon: Zap, label: 'Electrician', color: 'bg-amber-50 text-amber-600' },
  { icon: Shield, label: 'Carpenter', color: 'bg-orange-50 text-orange-600' },
  { icon: MapPin, label: 'Painter', color: 'bg-purple-50 text-purple-600' },
  { icon: Users, label: 'Labourer', color: 'bg-cyan-50 text-cyan-600' },
  { icon: Phone, label: 'AC Repair', color: 'bg-rose-50 text-rose-600' },
];

const STEPS = [
  { num: '01', title: 'Post a Job', desc: 'Describe what you need in your language. AI understands Hindi, English & more.' },
  { num: '02', title: 'Get Bids', desc: 'Verified local workers bid on your job. See ratings, skills, and fair AI-powered pricing.' },
  { num: '03', title: 'Job Done', desc: 'Worker arrives, completes the job, and you pay only after you\'re satisfied.' },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-[#F8F9F0] overflow-hidden">

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 sm:px-12 glass border-b border-[#1B4332]/5">
        <div className="flex items-center gap-2.5">
          <div className="size-9 rounded-xl bg-[#1B4332] flex items-center justify-center shadow-lg shadow-[#1B4332]/30">
            <span className="text-white font-black text-lg" style={{ fontFamily: 'var(--font-heading)' }}>R</span>
          </div>
          <span className="text-xl font-black tracking-tight text-[#1B4332]" style={{ fontFamily: 'var(--font-heading)' }}>
            Rozgar
          </span>
        </div>
        <Link href="/login">
          <Button
            variant="ghost"
            className="font-bold text-[#1B4332] hover:bg-[#1B4332]/5 rounded-full px-6 transition-all"
          >
            Login
          </Button>
        </Link>
      </nav>

      <main className="flex flex-1 flex-col">

        {/* ── Hero Section ───────────────────────────────────────────────────── */}
        <section className="relative flex flex-col items-center justify-center px-6 pt-16 pb-12 sm:pt-24 sm:pb-20 text-center overflow-hidden">

          {/* Decorative blobs */}
          <div className="pointer-events-none absolute -top-20 -left-20 size-96 rounded-full bg-[#40C057]/10 blur-3xl" />
          <div className="pointer-events-none absolute top-40 -right-20 size-80 rounded-full bg-[#1B4332]/8 blur-3xl" />

          {/* Badge */}
          <div
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#40C057]/30 bg-[#40C057]/10 px-4 py-1.5 text-xs font-bold text-[#1B4332] animate-slide-up"
          >
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#40C057] opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-[#40C057]" />
            </span>
            Live in 500+ Cities across Bharat
          </div>

          {/* Headline */}
          <h1
            className="max-w-3xl text-[2.8rem] font-black leading-[1.05] tracking-tight text-[#1B4332] sm:text-7xl animate-slide-up delay-100"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Hire Local Help{' '}
            <span className="relative">
              <span className="text-gradient">in Seconds.</span>
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-[#1B4332]/60 sm:text-xl animate-slide-up delay-200">
            India&apos;s most trusted hyperlocal gig network. Verified workers, AI-powered pricing, and instant job matching — right in your neighborhood.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex w-full flex-col gap-3 sm:flex-row sm:justify-center animate-slide-up delay-300">
            <Link href="/login" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="h-14 w-full rounded-2xl bg-[#1B4332] px-10 text-base font-black text-white shadow-2xl shadow-[#1B4332]/30 hover:bg-[#1B4332]/90 hover:scale-[1.02] active:scale-[0.98] transition-all sm:w-auto"
              >
                Get Started Free
                <ArrowRight className="ml-2 size-5" />
              </Button>
            </Link>
            <Link href="/login" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="h-14 w-full rounded-2xl border-2 border-[#1B4332]/20 bg-white px-10 text-base font-bold text-[#1B4332] hover:border-[#40C057]/50 hover:bg-[#40C057]/5 transition-all sm:w-auto"
              >
                I&apos;m a Worker
              </Button>
            </Link>
          </div>

          {/* Trust row */}
          <div className="mt-8 flex items-center gap-1.5 animate-slide-up delay-400">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="size-4 fill-amber-400 text-amber-400" />
            ))}
            <span className="ml-2 text-sm font-semibold text-[#1B4332]/60">
              Trusted by <strong className="text-[#1B4332]">2 lakh+</strong> families
            </span>
          </div>
        </section>

        {/* ── Stats Ticker ───────────────────────────────────────────────────── */}
        <div className="overflow-hidden border-y border-[#1B4332]/8 bg-[#1B4332] py-4">
          <div className="flex animate-ticker whitespace-nowrap">
            {[...STATS, ...STATS].map((s, i) => (
              <div key={i} className="flex items-center gap-2 mx-10">
                <span className="text-2xl font-black text-[#40C057]" style={{ fontFamily: 'var(--font-heading)' }}>{s.value}</span>
                <span className="text-sm font-medium text-white/60">{s.label}</span>
                <span className="ml-10 text-white/20">•</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Services Grid ──────────────────────────────────────────────────── */}
        <section className="px-6 py-16 sm:px-12">
          <div className="mx-auto max-w-2xl">
            <p className="text-center text-xs font-black uppercase tracking-widest text-[#1B4332]/40 mb-3">
              What We Fix
            </p>
            <h2
              className="text-center text-3xl font-black text-[#1B4332] mb-10"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Any Service, Anywhere
            </h2>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              {SERVICES.map(({ icon: Icon, label, color }) => (
                <Link href="/login" key={label}>
                  <div className="flex flex-col items-center gap-2.5 rounded-2xl bg-white p-4 shadow-sm border border-zinc-100/50 hover:border-[#40C057]/30 hover:shadow-md hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer">
                    <div className={cn('flex size-12 items-center justify-center rounded-xl', color)}>
                      <Icon className="size-5" />
                    </div>
                    <span className="text-[11px] font-bold text-[#1B4332] text-center leading-tight">{label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── How It Works ───────────────────────────────────────────────────── */}
        <section className="px-6 py-16 sm:px-12 bg-[#1B4332] relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 size-80 rounded-full bg-[#40C057] blur-3xl translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 left-0 size-60 rounded-full bg-[#40C057] blur-3xl -translate-x-1/2 translate-y-1/2" />
          </div>
          <div className="relative mx-auto max-w-2xl">
            <p className="text-center text-xs font-black uppercase tracking-widest text-[#40C057]/70 mb-3">How It Works</p>
            <h2
              className="text-center text-3xl font-black text-white mb-12"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Done in 3 steps
            </h2>
            <div className="space-y-6">
              {STEPS.map((step, i) => (
                <div key={step.num} className="flex gap-5">
                  <div className="flex flex-col items-center">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#40C057] text-[#1B4332] font-black text-sm">
                      {step.num}
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className="mt-2 w-0.5 flex-1 bg-[#40C057]/20 min-h-[2rem]" />
                    )}
                  </div>
                  <div className="pb-6">
                    <h3 className="text-lg font-black text-white" style={{ fontFamily: 'var(--font-heading)' }}>{step.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-white/60">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Value Props ────────────────────────────────────────────────────── */}
        <section className="px-6 py-16 sm:px-12">
          <div className="mx-auto max-w-2xl">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { icon: Zap, title: 'AI Pricing', desc: 'Gemini AI estimates fair prices instantly. No surprises.' },
                { icon: Shield, title: 'Verified Workers', desc: 'Every worker is KYC-verified by a trusted local partner.' },
                { icon: MapPin, title: 'Hyperlocal', desc: 'Workers from your own pincode — faster than you expect.' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex flex-col gap-3 rounded-3xl bg-white p-6 shadow-sm border border-zinc-100/50 hover:shadow-md hover:-translate-y-0.5 transition-all">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-[#40C057]/10">
                    <Icon className="size-6 text-[#40C057]" />
                  </div>
                  <h3 className="text-base font-black text-[#1B4332]" style={{ fontFamily: 'var(--font-heading)' }}>{title}</h3>
                  <p className="text-sm leading-relaxed text-[#1B4332]/60">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Final CTA ──────────────────────────────────────────────────────── */}
        <section className="px-6 py-16 sm:px-12">
          <div className="mx-auto max-w-lg">
            <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#40C057] via-[#2f9e44] to-[#1B4332] p-8 text-center shadow-2xl shadow-[#1B4332]/30">
              <div className="pointer-events-none absolute inset-0 opacity-20">
                <div className="absolute -top-10 -right-10 size-40 rounded-full bg-white blur-2xl" />
                <div className="absolute -bottom-10 -left-10 size-32 rounded-full bg-white blur-2xl" />
              </div>
              <div className="relative">
                <CheckCircle className="mx-auto mb-4 size-12 text-white/80" />
                <h2
                  className="text-3xl font-black text-white"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  Ready to get started?
                </h2>
                <p className="mt-3 text-base text-white/80">
                  Join 2 lakh+ families who rely on Rozgar every day.
                </p>
                <Link href="/login" className="mt-8 block">
                  <Button
                    size="lg"
                    className="h-14 w-full rounded-2xl bg-white text-[#1B4332] font-black text-base hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg"
                  >
                    Book Your First Job Free
                    <ArrowRight className="ml-2 size-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-[#1B4332]/8 py-8 text-center text-sm text-[#1B4332]/40">
        © 2026 Rozgar Technologies · Built for the next billion.
      </footer>
    </div>
  );
}
