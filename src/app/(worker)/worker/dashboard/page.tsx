'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Sora, DM_Sans } from 'next/font/google';
import { 
  Trophy, 
  Target, 
  AlertTriangle, 
  Clock, 
  MapPin, 
  Navigation,
  ChevronRight,
  Loader2,
  Bell,
  CheckCircle2,
  XCircle,
  Wrench,
  IndianRupee,
  Activity,
  History,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

const sora = Sora({ subsets: ['latin'], weight: ['700', '800'] });
const dmSans = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '700'] });

export default function WorkerDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [worker, setWorker] = useState<any>(null);
  const [pings, setPings] = useState<any[]>([]);
  const [activeJob, setActiveJob] = useState<any>(null);
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  const fetchDashboardData = useCallback(async (uid: string) => {
    try {
      // 1. Worker Profile & Stats
      const { data: workerData } = await supabase
        .from('workers')
        .select('*, user:users(name)')
        .eq('user_id', uid)
        .single();
      setWorker(workerData);

      // 2. Active Job Pings (Pending)
      const { data: pingsData } = await supabase
        .from('job_pings')
        .select('*, job:jobs(*)')
        .eq('worker_id', uid)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('sent_at', { ascending: false });
      setPings(pingsData || []);

      // 3. Current Active Job
      const { data: activeJobData } = await supabase
        .from('jobs')
        .select('*')
        .eq('accepted_worker_id', uid)
        .in('status', ['assigned', 'in_transit', 'on_site'])
        .maybeSingle();
      setActiveJob(activeJobData);

      // 4. Recent Jobs (Last 10 Completed)
      const { data: recentData } = await supabase
        .from('jobs')
        .select('*')
        .eq('accepted_worker_id', uid)
        .eq('status', 'complete')
        .order('created_at', { ascending: false })
        .limit(10);
      setRecentJobs(recentData || []);

    } catch (err: any) {
      console.error('Worker Dashboard Load Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/login');
        return;
      }
      setUserId(session.user.id);
      fetchDashboardData(session.user.id);

      // Real-time for Pings
      const pingChannel = supabase
        .channel(`worker-pings-${session.user.id}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'job_pings',
          filter: `worker_id=eq.${session.user.id}`
        }, () => fetchDashboardData(session.user.id))
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'jobs',
          filter: `accepted_worker_id=eq.${session.user.id}`
        }, () => fetchDashboardData(session.user.id))
        .subscribe();

      return () => { supabase.removeChannel(pingChannel); };
    }
    init();
  }, [router, fetchDashboardData]);

  const handleIgnorePing = async (pingId: string) => {
    try {
      const { error } = await supabase
        .from('job_pings')
        .update({ status: 'ignored' })
        .eq('id', pingId);
      if (error) throw error;
      setPings(prev => prev.filter(p => p.id !== pingId));
      toast.success('Alert ignored');
    } catch (err) {
      toast.error('Action failed');
    }
  };

  if (loading) return <DashboardSkeleton />;

  return (
    <div className={cn("flex min-h-screen w-full flex-col bg-[#F8F9F0] pb-24", dmSans.className)}>
      
      {/* Header with Online Status */}
      <header className="px-6 pt-10 pb-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Welcome Back</p>
            <h1 className={cn(sora.className, "text-2xl text-[#1B4332]")}>{worker?.user?.name?.split(' ')[0]}</h1>
          </div>
          <button 
            onClick={() => setIsOnline(!isOnline)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full font-black text-[10px] uppercase tracking-widest transition-all duration-500",
              isOnline ? "bg-[#40C057]/10 text-[#40C057] shadow-lg shadow-[#40C057]/10" : "bg-zinc-100 text-zinc-400"
            )}
          >
            <div className={cn("size-2 rounded-full", isOnline ? "bg-[#40C057] animate-pulse" : "bg-zinc-300")} />
            {isOnline ? 'Online' : 'Offline'}
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl p-4 flex flex-col items-center gap-1 shadow-sm border border-zinc-100/50">
            <Target className="size-4 text-emerald-500" />
            <span className="text-lg font-black text-[#1B4332]">{worker?.completion_rate || 0}%</span>
            <span className="text-[8px] font-black uppercase text-zinc-400">Success</span>
          </div>
          <div className="bg-white rounded-2xl p-4 flex flex-col items-center gap-1 shadow-sm border border-zinc-100/50">
            <Trophy className="size-4 text-amber-500" />
            <span className="text-lg font-black text-[#1B4332]">{worker?.total_jobs || 0}</span>
            <span className="text-[8px] font-black uppercase text-zinc-400">Jobs</span>
          </div>
          <div className="bg-white rounded-2xl p-4 flex flex-col items-center gap-1 shadow-sm border border-zinc-100/50">
            <AlertTriangle className={cn("size-4", worker?.strike_count > 0 ? "text-red-500" : "text-zinc-200")} />
            <span className={cn("text-lg font-black", worker?.strike_count > 0 ? "text-red-500" : "text-[#1B4332]")}>{worker?.strike_count || 0}</span>
            <span className="text-[8px] font-black uppercase text-zinc-400">Strikes</span>
          </div>
        </div>
      </header>

      <main className="px-6 space-y-10">
        
        {/* Active Mission - Highest Priority */}
        {activeJob && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-[#1B4332]">
              <Activity className="size-4" />
              <h2 className={cn(sora.className, "text-sm font-black uppercase tracking-widest")}>Active Mission</h2>
            </div>
            <Card className="rounded-[32px] border-none bg-[#1B4332] text-white shadow-2xl shadow-[#1B4332]/20 overflow-hidden group">
              <CardContent className="p-8 space-y-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40">In Progress</p>
                    <h4 className="text-2xl font-black leading-tight">{activeJob.interpreted_category}</h4>
                  </div>
                  <Badge className="bg-[#40C057] text-[#1B4332] font-black uppercase text-[10px] border-none">
                    {activeJob.status.replace('_', ' ')}
                  </Badge>
                </div>
                <Button 
                  onClick={() => router.push(`/worker/job/${activeJob.id}`)}
                  className="w-full h-14 rounded-2xl bg-white text-[#1B4332] font-black shadow-lg active:scale-95 transition-all"
                >
                  Manage Workflow
                  <ChevronRight className="ml-2 size-4" />
                </Button>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Live Radar / New Job Pings */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#1B4332]">
              <Zap className="size-4 text-[#40C057]" />
              <h2 className={cn(sora.className, "text-sm font-black uppercase tracking-widest")}>Job Radar</h2>
            </div>
            {pings.length > 0 && <Badge variant="secondary" className="bg-[#40C057]/10 text-[#40C057] border-none px-2">{pings.length} Live</Badge>}
          </div>

          {!isOnline ? (
            <div className="flex flex-col items-center py-12 text-center bg-zinc-50 rounded-[32px] border-2 border-dashed border-zinc-200">
              <p className="text-sm font-bold text-zinc-400">You're currently offline.</p>
              <Button variant="link" onClick={() => setIsOnline(true)} className="text-[#40C057] font-black underline">Go Online to see jobs</Button>
            </div>
          ) : pings.length > 0 ? (
            <div className="space-y-4">
              {pings.map(ping => (
                <PingCard 
                  key={ping.id} 
                  ping={ping} 
                  onIgnore={() => handleIgnorePing(ping.id)}
                  onView={() => router.push(`/worker/job/${ping.job_id}`)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-16 text-center bg-white rounded-[32px] border-2 border-dashed border-zinc-100">
              <div className="size-16 rounded-full bg-[#F8F9F0] flex items-center justify-center text-zinc-200 mb-4">
                <Navigation className="size-8 animate-pulse" />
              </div>
              <p className="text-sm font-bold text-zinc-400 px-12 leading-relaxed">Scanning for new jobs in your area...</p>
            </div>
          )}
        </section>

        {/* History Section */}
        <section className="space-y-6 pb-12">
          <div className="flex items-center gap-2 text-[#1B4332]">
            <History className="size-4" />
            <h2 className={cn(sora.className, "text-sm font-black uppercase tracking-widest text-zinc-400")}>Recent History</h2>
          </div>
          {recentJobs.length > 0 ? (
            <div className="space-y-3">
              {recentJobs.map(job => (
                <div key={job.id} className="flex items-center justify-between p-5 bg-white rounded-2xl shadow-sm border border-zinc-100/50">
                  <div className="space-y-1">
                    <p className="text-sm font-black text-[#1B4332]">{job.interpreted_category}</p>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase">{formatDistanceToNow(new Date(job.created_at))} ago</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-[#40C057]">₹{job.final_price || job.ai_base_price}</p>
                    <p className="text-[8px] text-zinc-300 font-black uppercase">Earned</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-400 italic text-center py-8">Complete your first job to see history!</p>
          )}
        </section>

      </main>
    </div>
  );
}

function PingCard({ ping, onIgnore, onView }: { ping: any, onIgnore: () => void, onView: () => void }) {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const expires = new Date(ping.expires_at);
      const diff = expires.getTime() - now.getTime();
      if (diff <= 0) {
        setTimeLeft('Expired');
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${mins}:${String(secs).padStart(2, '0')}`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [ping.expires_at]);

  return (
    <Card className="rounded-[36px] border-none bg-white shadow-xl shadow-[#1B4332]/5 overflow-hidden animate-in slide-in-from-bottom-4">
      <CardContent className="p-0">
        <div className="p-8 space-y-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <h4 className="text-2xl font-black text-[#1B4332] leading-tight">{ping.job?.interpreted_category}</h4>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-[9px] font-black uppercase border-zinc-100 text-zinc-400">
                  <MapPin className="size-3 mr-1 text-[#40C057]" />
                  {ping.job?.pincode}
                </Badge>
                <Badge variant="outline" className="text-[9px] font-black uppercase border-zinc-100 text-zinc-400">
                  <IndianRupee className="size-3 mr-1 text-[#40C057]" />
                  Est. ₹{ping.job?.ai_base_price}
                </Badge>
              </div>
            </div>
            <div className={cn(
              "rounded-xl px-3 py-2 text-xs font-black tabular-nums transition-colors",
              timeLeft === 'Expired' ? "bg-red-50 text-red-500" : "bg-emerald-50 text-emerald-600 border border-emerald-100/50"
            )}>
              {timeLeft}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button 
              onClick={onIgnore}
              variant="ghost" 
              className="flex-1 h-14 rounded-2xl bg-zinc-50 text-zinc-400 font-bold hover:bg-zinc-100"
            >
              Skip
            </Button>
            <Button 
              onClick={onView}
              className="flex-[2] h-14 rounded-2xl bg-[#40C057] text-[#1B4332] font-black shadow-lg shadow-[#40C057]/20"
            >
              See Full Job
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-[#F8F9F0] px-6 py-12 space-y-10">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-40 rounded-2xl" />
        <Skeleton className="size-10 rounded-full" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>
      <Skeleton className="h-40 w-full rounded-[32px]" />
      <Skeleton className="h-72 w-full rounded-[32px]" />
    </div>
  );
}
