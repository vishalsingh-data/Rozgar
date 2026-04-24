'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import {
  Wrench, Search, ArrowRight, ChevronDown,
  MapPin, Zap, Shield, Users, Star, TrendingUp,
  Sun, Moon
} from 'lucide-react';

const MapBackground = dynamic(() => import('@/components/MapBackground'), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-[#0d0d0d]" />,
});

// ── Dark/Light Mode Toggle ──────────────────────────────────────────────────
function ThemeToggle({ className = '' }: { className?: string }) {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('rozgar-theme');
    const isDark = saved ? saved === 'dark' : true;
    setDark(isDark);
    document.documentElement.classList.toggle('dark', isDark);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('rozgar-theme', next ? 'dark' : 'light');
  };

  return (
    <button
      onClick={toggle}
      className={`relative flex items-center justify-center size-9 rounded-full border transition-all duration-300 ${
        dark
          ? 'border-zinc-700 bg-zinc-900/60 text-zinc-300 hover:border-zinc-500 hover:text-white'
          : 'border-zinc-200 bg-white/80 text-zinc-600 hover:border-zinc-400 hover:text-zinc-900'
      } backdrop-blur-sm ${className}`}
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}

export { ThemeToggle };

// ── Stats Ticker ──────────────────────────────────────────────────────────────
const TICKER_ITEMS = [
  '50,000+ Workers',
  '2,00,000+ Jobs Done',
  '500+ Cities',
  '4.9 ★ Rating',
  '98% Success Rate',
  'AI-Powered Pricing',
  'KYC Verified',
  'Instant Matching',
];

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="bg-[#0d0d0d] min-h-screen text-white overflow-x-hidden">

      {/* ── Full-Screen Hero with Map ──────────────────────────────────────── */}
      <section ref={heroRef} className="relative h-screen min-h-[600px] flex flex-col overflow-hidden">

        {/* Map Background */}
        {mounted && <MapBackground />}

        {/* Vignette overlay */}
        <div
          className="absolute inset-0 z-[1] pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 20%, rgba(13,13,13,0.55) 60%, rgba(13,13,13,0.92) 100%)',
          }}
        />
        {/* Top fade */}
        <div className="absolute top-0 left-0 right-0 h-32 z-[1] pointer-events-none bg-gradient-to-b from-[#0d0d0d] to-transparent" />
        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-40 z-[1] pointer-events-none bg-gradient-to-t from-[#0d0d0d] to-transparent" />

        {/* ── Navbar ─────────────────────────────────────────────────────── */}
        <nav className={`relative z-10 flex items-center justify-between px-6 sm:px-10 py-5 max-w-7xl mx-auto w-full transition-all duration-300 ${scrolled ? 'opacity-80' : ''}`}>
          {/* Logo */}
          <div className="flex items-center gap-0">
            <span
              className="text-2xl font-black italic tracking-tight text-white select-none"
              style={{ fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em' }}
            >
              ROZGAR
            </span>
          </div>

          {/* Nav Links — hidden on mobile */}
          <div className="hidden md:flex items-center gap-8">
            {['Marketplace', 'Network', 'Logistics', 'Infrastructure'].map((item) => (
              <button
                key={item}
                className="text-sm font-medium text-zinc-400 hover:text-white transition-colors duration-200 hover:scale-105 active:scale-95"
              >
                {item}
              </button>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/login">
              <button className="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold text-white border border-zinc-700 bg-black/40 backdrop-blur-md hover:border-zinc-500 hover:bg-black/60 transition-all duration-200 active:scale-95">
                Post a Job
              </button>
            </Link>
            <Link href="/login">
              <button
                className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-black text-black transition-all duration-200 active:scale-95 hover:scale-[1.04] shadow-lg"
                style={{ background: '#6efa96', boxShadow: '0 0 20px rgba(110,250,150,0.35)' }}
              >
                Find Work
              </button>
            </Link>
          </div>
        </nav>

        {/* ── Hero Content ───────────────────────────────────────────────── */}
        <div className="relative z-[2] flex flex-1 flex-col items-center justify-center px-6 text-center -mt-8">

          {/* Headline */}
          <h1
            className="text-[clamp(3rem,9vw,6rem)] font-black leading-[1.0] tracking-tight mb-8 animate-in fade-in slide-in-from-bottom-6 duration-700"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            <span className="text-white block">Empowering the</span>
            <span
              className="italic block"
              style={{
                color: '#6efa96',
                textShadow: '0 0 40px rgba(110,250,150,0.4), 0 0 80px rgba(110,250,150,0.15)',
              }}
            >
              City&apos;s Pulse.
            </span>
          </h1>

          {/* Pill Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
            <Link href="/login">
              <button className="group flex items-center gap-2.5 px-8 py-3.5 rounded-full text-base font-bold text-white border border-zinc-700 bg-black/50 backdrop-blur-md hover:border-zinc-500 hover:bg-black/70 transition-all duration-200 active:scale-95 hover:scale-[1.03]">
                <Wrench className="size-4 text-zinc-400 group-hover:text-white transition-colors" />
                Post a Job
              </button>
            </Link>
            <Link href="/login">
              <button className="group flex items-center gap-2.5 px-8 py-3.5 rounded-full text-base font-bold text-white border border-zinc-700 bg-black/50 backdrop-blur-md hover:border-zinc-500 hover:bg-black/70 transition-all duration-200 active:scale-95 hover:scale-[1.03]">
                <Search className="size-4 text-zinc-400 group-hover:text-white transition-colors" />
                Find Work
              </button>
            </Link>
          </div>

          {/* Subtext */}
          <Link href="/login">
            <button className="mt-5 flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors animate-in fade-in duration-700 delay-300 group">
              Get started instantly
              <ArrowRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </Link>
        </div>

        {/* ── Footer: INITIATE ZOOM ──────────────────────────────────────── */}
        <div className="relative z-[2] flex flex-col items-center pb-6 gap-3 animate-in fade-in duration-1000 delay-500">
          <span
            className="text-[10px] font-mono font-medium tracking-[0.3em] uppercase text-zinc-500"
          >
            INITIATE ZOOM
          </span>
          <div
            className="w-px h-10"
            style={{
              background: 'linear-gradient(to bottom, rgba(161,161,170,0.5), transparent)',
            }}
          />
        </div>
      </section>

      {/* ── Stats Ticker ──────────────────────────────────────────────────────── */}
      <div className="overflow-hidden border-y border-white/5 bg-black/60 backdrop-blur-sm py-3.5">
        <div className="flex animate-ticker whitespace-nowrap">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <div key={i} className="flex items-center gap-4 mx-8">
              <span className="text-sm font-semibold text-zinc-300">{item}</span>
              <span className="text-zinc-600 text-xs">◆</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── How It Works ──────────────────────────────────────────────────────── */}
      <section className="px-6 py-24 sm:px-12 max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-[#6efa96]/70 mb-3">How It Works</p>
          <h2
            className="text-4xl sm:text-5xl font-black text-white leading-tight"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Three steps.
            <br />
            <span className="text-zinc-400">Infinite possibilities.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              num: '01',
              title: 'Post a Job',
              desc: 'Describe your need in Hindi, English, or any regional language. Our AI understands everything.',
              icon: Wrench,
              accent: '#6efa96',
            },
            {
              num: '02',
              title: 'Get Matched',
              desc: 'Verified local workers bid on your job. AI-powered fair pricing. No surprises.',
              icon: MapPin,
              accent: '#60a5fa',
            },
            {
              num: '03',
              title: 'Job Done',
              desc: 'Worker arrives, completes the task. Pay only after you\'re satisfied.',
              icon: Shield,
              accent: '#f59e0b',
            },
          ].map(({ num, title, desc, icon: Icon, accent }) => (
            <div
              key={num}
              className="relative group rounded-2xl border border-white/8 bg-white/3 backdrop-blur-sm p-7 hover:border-white/15 hover:bg-white/5 transition-all duration-300"
            >
              <div
                className="text-6xl font-black mb-5 opacity-15 select-none"
                style={{ fontFamily: 'var(--font-heading)', color: accent }}
              >
                {num}
              </div>
              <div
                className="flex size-10 items-center justify-center rounded-xl mb-4"
                style={{ background: `${accent}18` }}
              >
                <Icon className="size-5" style={{ color: accent }} />
              </div>
              <h3 className="text-lg font-black text-white mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
                {title}
              </h3>
              <p className="text-sm leading-relaxed text-zinc-400">{desc}</p>
              <div
                className="absolute bottom-0 left-6 right-6 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: `linear-gradient(to right, transparent, ${accent}60, transparent)` }}
              />
            </div>
          ))}
        </div>
      </section>

      {/* ── Live City Grid ────────────────────────────────────────────────────── */}
      <section className="px-6 py-16 sm:px-12 bg-black/40 border-y border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-[#6efa96]/70 mb-3">Live Activity</p>
            <h2 className="text-3xl font-black text-white" style={{ fontFamily: 'var(--font-heading)' }}>
              The network is <span style={{ color: '#6efa96' }}>alive.</span>
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { value: '2,341', label: 'Active Jobs', icon: Zap, color: '#6efa96' },
              { value: '18,420', label: 'Online Workers', icon: Users, color: '#60a5fa' },
              { value: '₹4.2Cr', label: 'Paid Today', icon: TrendingUp, color: '#f59e0b' },
              { value: '4.9 ★', label: 'Avg Rating', icon: Star, color: '#c084fc' },
            ].map(({ value, label, icon: Icon, color }) => (
              <div
                key={label}
                className="rounded-2xl border border-white/8 bg-white/3 p-5 text-center hover:border-white/15 transition-all duration-300 group"
              >
                <Icon className="size-5 mx-auto mb-3 opacity-60 group-hover:opacity-100 transition-opacity" style={{ color }} />
                <div className="text-2xl font-black text-white" style={{ fontFamily: 'var(--font-heading)' }}>
                  {value}
                </div>
                <div className="text-xs text-zinc-500 mt-1 font-medium">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Services ──────────────────────────────────────────────────────────── */}
      <section className="px-6 py-24 sm:px-12 max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-[#6efa96]/70 mb-3">What We Cover</p>
          <h2 className="text-3xl font-black text-white" style={{ fontFamily: 'var(--font-heading)' }}>
            Any service. <span className="text-zinc-400">Any city.</span>
          </h2>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {[
            { emoji: '⚡', label: 'Electrician' },
            { emoji: '🔧', label: 'Plumber' },
            { emoji: '🪚', label: 'Carpenter' },
            { emoji: '🎨', label: 'Painter' },
            { emoji: '❄️', label: 'AC Repair' },
            { emoji: '🧹', label: 'Cleaning' },
            { emoji: '🏗️', label: 'Mason' },
            { emoji: '🚗', label: 'Driver' },
            { emoji: '🌿', label: 'Gardener' },
            { emoji: '🍳', label: 'Cook' },
            { emoji: '🔒', label: 'Security' },
            { emoji: '🏠', label: 'Labour' },
          ].map(({ emoji, label }) => (
            <Link href="/login" key={label}>
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-white/8 bg-white/3 p-4 hover:border-[#6efa96]/30 hover:bg-[#6efa96]/5 transition-all duration-200 active:scale-95 cursor-pointer group">
                <span className="text-2xl">{emoji}</span>
                <span className="text-[11px] font-bold text-zinc-400 group-hover:text-zinc-200 transition-colors text-center">{label}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────────────── */}
      <section className="px-6 py-20 sm:px-12 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-96 rounded-full opacity-10 blur-3xl" style={{ background: '#6efa96' }} />
        </div>
        <div className="relative max-w-xl mx-auto text-center">
          <h2
            className="text-4xl sm:text-5xl font-black text-white leading-tight mb-6"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Ready to join
            <br />
            <span style={{ color: '#6efa96' }}>the movement?</span>
          </h2>
          <p className="text-zinc-400 mb-10 leading-relaxed">
            2 lakh+ families trust Rozgar every day. Verified workers, instant matching, and fair AI-powered pricing — all in your pocket.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/login">
              <button
                className="flex items-center gap-2.5 px-8 py-4 rounded-full text-base font-black text-black transition-all duration-200 active:scale-95 hover:scale-[1.04] shadow-xl"
                style={{ background: '#6efa96', boxShadow: '0 0 40px rgba(110,250,150,0.3)' }}
              >
                Post a Job Now
                <ArrowRight className="size-4" />
              </button>
            </Link>
            <Link href="/login">
              <button className="flex items-center gap-2.5 px-8 py-4 rounded-full text-base font-bold text-white border border-zinc-700 bg-white/5 backdrop-blur-md hover:border-zinc-500 hover:bg-white/10 transition-all duration-200 active:scale-95">
                I&apos;m a Worker →
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span
            className="text-lg font-black italic tracking-tight text-white"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            ROZGAR
          </span>
          <p className="text-xs text-zinc-600 text-center">
            © 2026 Rozgar Technologies · Built for the next billion.
          </p>
          <div className="flex items-center gap-6">
            {['Terms', 'Privacy', 'Contact'].map(l => (
              <button key={l} className="text-xs text-zinc-600 hover:text-zinc-300 transition-colors">{l}</button>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
