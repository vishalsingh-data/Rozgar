'use client';

import React, { useState, useEffect } from 'react';
import { Timer, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SLATimerProps {
  deadline: string;
}

export default function SLATimer({ deadline }: SLATimerProps) {
  const [timeLeft, setTimeLeft] = useState<{ mins: number; secs: number } | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [totalSeconds, setTotalSeconds] = useState<number>(0);

  useEffect(() => {
    const target = new Date(deadline).getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ mins: 0, secs: 0 });
        setTotalSeconds(0);
        setIsExpired(true);
        return true; // Stop
      }

      const totalSecs = Math.floor(diff / 1000);
      const mins = Math.floor(totalSecs / 60);
      const secs = totalSecs % 60;
      
      setTimeLeft({ mins, secs });
      setTotalSeconds(totalSecs);
      setIsExpired(false);
      return false;
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [deadline]);

  if (!timeLeft) return null;

  // Color Logic
  // > 5 mins: Green
  // 1-5 mins: Yellow
  // Expired: Red
  let statusClasses = "bg-emerald-50 text-emerald-600 border-emerald-100";
  if (isExpired) {
    statusClasses = "bg-red-50 text-red-600 border-red-100";
  } else if (totalSeconds <= 300) { // 5 minutes or less
    statusClasses = "bg-amber-50 text-amber-600 border-amber-100";
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className={cn(
        "flex items-center gap-2 rounded-xl border-2 px-4 py-2 font-black tabular-nums transition-colors duration-500",
        statusClasses
      )}>
        <Timer className={cn("size-4", !isExpired && "animate-pulse")} />
        <span className="text-lg">
          {String(timeLeft.mins).padStart(2, '0')}:{String(timeLeft.secs).padStart(2, '0')}
        </span>
      </div>
      
      {isExpired && (
        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-red-500 animate-in fade-in slide-in-from-top-1">
          <AlertCircle className="size-3" />
          Time expired — you can now reassign
        </div>
      )}
    </div>
  );
}
