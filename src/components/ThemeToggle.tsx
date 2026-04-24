'use client';

import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('rozgar-theme');
    // Default dark for landing, respect saved for other pages
    const isDark = saved ? saved === 'dark' : !document.documentElement.classList.contains('light');
    setDark(isDark);
    document.documentElement.classList.toggle('dark', isDark);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    document.documentElement.classList.toggle('light', !next);
    localStorage.setItem('rozgar-theme', next ? 'dark' : 'light');
  };

  if (dark === null) return <div className="size-9" />;

  return (
    <button
      onClick={toggle}
      className={`relative flex items-center justify-center size-9 rounded-full border transition-all duration-300 active:scale-90 ${
        dark
          ? 'border-zinc-700 bg-zinc-900/60 text-zinc-300 hover:border-[#6efa96]/50 hover:text-[#6efa96]'
          : 'border-zinc-200 bg-white/80 text-zinc-500 hover:border-[#1B4332]/40 hover:text-[#1B4332]'
      } backdrop-blur-sm ${className}`}
      title={dark ? 'Switch to light' : 'Switch to dark'}
    >
      {dark
        ? <Sun className="size-[15px]" />
        : <Moon className="size-[15px]" />
      }
    </button>
  );
}
