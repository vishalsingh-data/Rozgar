'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
  History as HistoryIcon,
  Zap,
  Scale
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow, differenceInHours } from 'date-fns';
import { cn } from '@/lib/utils';
import { initializeMessaging } from '@/lib/firebase';
import ImageUpload from '@/components/ImageUpload';

export default function WorkerDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [worker, setWorker] = useState<any>(null);
  const [pings, setPings] = useState<any[]>([]);
  const [activeJob, setActiveJob] = useState<any>(null);
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [strikes, setStrikes] = useState<any[]>([]);
  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  const fetchDashboardData = useCallback(async (uid: string) => {
    try {
      // 1. Worker Profile & Stats
      const { data: workerData } = await supabase
        .from('workers')
        .select('*, user:users!workers_user_id_fkey(name, is_active)')
        .eq('user_id', uid)
        .single();
      
      if (workerData) {
        setWorker(workerData);
        setIsOnline(workerData.user?.is_active ?? true);
      }

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

      // 5. Fetch Strikes
      const { data: strikesData } = await supabase
        .from('strikes')
        .select('*')
        .eq('worker_id', uid)
        .order('created_at', { ascending: false })
        .limit(5);
      setStrikes(strikesData || []);

      // 6. Fetch jobs this worker posted as a customer
      const { data: bookingsData } = await supabase
        .from('jobs')
        .select('*')
        .eq('customer_id', uid)
        .order('created_at', { ascending: false })
        .limit(10);
      setMyBookings(bookingsData || []);

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

      // Initialize FCM Notifications
      initializeMessaging(session.user.id);

      // Remove any stale channel from React StrictMode's double-invoke
      const channelName = `worker-dashboard-${session.user.id}`;
      const stale = supabase.getChannels().find(c => c.topic === `realtime:${channelName}`);
      if (stale) await supabase.removeChannel(stale);

      const channel = supabase
        .channel(channelName)
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

      return () => { supabase.removeChannel(channel); };
    }
    init();
  }, [router, fetchDashboardData]);

  const toggleOnlineStatus = async () => {
    const nextStatus = !isOnline;
    setIsOnline(nextStatus);
    
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: nextStatus })
        .eq('id', userId);
      
      if (error) throw error;
      toast.success(nextStatus ? "You're now Online" : "You're now Offline");
    } catch (err) {
      toast.error('Failed to update status');
      setIsOnline(!nextStatus); // Revert UI
    }
  };

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
    <div className={"flex min-h-screen w-full flex-col bg-[#F8F9F0] pb-24"}>
      
      {/* Header with Stats */}
      <header className="px-6 pt-10 pb-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Welcome Back</p>
            <h1 className={cn("[font-family:var(--font-heading)]","text-2xl text-[#1B4332]")}>{worker?.user?.name?.split(' ')[0]}</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/profile')}
              className="size-10 rounded-full bg-[#1B4332]/10 flex items-center justify-center hover:bg-[#1B4332]/20 active:scale-95 transition-all"
              title="Edit Profile"
            >
              <span className={cn("[font-family:var(--font-heading)]","text-sm font-black text-[#1B4332]")}>
                {worker?.user?.name?.charAt(0)}
              </span>
            </button>
            <button 
              onClick={toggleOnlineStatus}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full font-black text-[10px] uppercase tracking-widest transition-all duration-500",
                isOnline ? "bg-[#40C057]/10 text-[#40C057] shadow-lg shadow-[#40C057]/10" : "bg-zinc-100 text-zinc-400"
              )}
            >
              <div className={cn("size-2 rounded-full", isOnline ? "bg-[#40C057] animate-pulse" : "bg-zinc-300")} />
              {isOnline ? 'Online' : 'Offline'}
            </button>
          </div>
        </div>

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

        {/* Book a Service CTA */}
        <section>
          <button
            onClick={() => router.push('/customer/post-job')}
            className="w-full text-left group"
          >
            <div className="flex items-center gap-5 bg-white rounded-[32px] p-6 shadow-sm border-2 border-zinc-100 group-hover:border-[#40C057]/30 group-hover:shadow-lg active:scale-[0.98] transition-all">
              <div className="size-14 rounded-2xl bg-[#40C057]/10 flex items-center justify-center shrink-0 group-hover:bg-[#40C057]/20 transition-colors">
                <Wrench className="size-7 text-[#40C057]" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-black uppercase tracking-widest text-zinc-400">Need something fixed?</p>
                <h3 className={cn("[font-family:var(--font-heading)]","text-lg text-[#1B4332] leading-tight mt-0.5")}>Book a Service</h3>
                <p className="text-xs text-zinc-400 font-medium mt-1">Post a job and hire a verified pro for your home</p>
              </div>
              <ChevronRight className="size-5 text-zinc-200 group-hover:text-[#40C057] group-hover:translate-x-0.5 transition-all" />
            </div>
          </button>
        </section>

        {/* Active Mission */}
        {activeJob && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-[#1B4332]">
              <Activity className="size-4 text-[#40C057]" />
              <h2 className={cn("[font-family:var(--font-heading)]","text-sm font-black uppercase tracking-widest")}>Active Mission</h2>
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

        {/* Live Radar */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#1B4332]">
              <Zap className="size-4 text-[#40C057]" />
              <h2 className={cn("[font-family:var(--font-heading)]","text-sm font-black uppercase tracking-widest")}>Job Radar</h2>
            </div>
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
              <Navigation className="size-12 text-zinc-100 mb-4 animate-pulse" />
              <p className="text-sm font-bold text-zinc-300 px-12 leading-relaxed">Scanning for jobs in your area...</p>
            </div>
          )}
        </section>

        {/* Penalty Record Section */}
        {strikes.length > 0 && (
          <section className="space-y-6">
            <div className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="size-4" />
              <h2 className={cn("[font-family:var(--font-heading)]","text-sm font-black uppercase tracking-widest")}>Penalty Record</h2>
            </div>
            <div className="space-y-4">
              {strikes.map(strike => (
                <StrikeCard 
                  key={strike.id} 
                  strike={strike} 
                  onAppealSuccess={() => userId && fetchDashboardData(userId)} 
                />
              ))}
            </div>
          </section>
        )}

        {/* My Bookings Section */}
        {myBookings.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-[#1B4332]">
              <Wrench className="size-4 text-zinc-300" />
              <h2 className={cn("[font-family:var(--font-heading)]","text-sm font-black uppercase tracking-widest text-zinc-400")}>My Bookings</h2>
              <span className="ml-auto text-[10px] font-black uppercase text-zinc-300">{myBookings.length} job{myBookings.length > 1 ? 's' : ''}</span>
            </div>
            <div className="space-y-3">
              {myBookings.map(job => (
                <div
                  key={job.id}
                  onClick={() => router.push(`/customer/job/${job.id}`)}
                  className="flex items-center justify-between p-5 bg-white rounded-2xl shadow-sm border border-zinc-100/50 cursor-pointer active:scale-[0.98] transition-all hover:border-zinc-200"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-black text-[#1B4332]">{job.interpreted_category || 'Pending...'}</p>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase">{formatDistanceToNow(new Date(job.created_at))} ago</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-[10px] font-black uppercase px-2.5 py-1 rounded-full",
                      job.status === 'complete' ? 'bg-emerald-50 text-emerald-600' :
                      job.status === 'pending' ? 'bg-amber-50 text-amber-600' :
                      'bg-blue-50 text-blue-600'
                    )}>{job.status.replace('_', ' ')}</span>
                    <ChevronRight className="size-4 text-zinc-200" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* History Section */}
        <section className="space-y-6 pb-12">
          <div className="flex items-center gap-2 text-[#1B4332]">
            <HistoryIcon className="size-4 text-zinc-300" />
            <h2 className={cn("[font-family:var(--font-heading)]","text-sm font-black uppercase tracking-widest text-zinc-400")}>Recent History</h2>
          </div>
          <div className="space-y-3">
            {recentJobs.length > 0 ? recentJobs.map(job => (
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
            )) : (
              <p className="text-sm text-zinc-400 italic text-center py-4">No completed jobs yet.</p>
            )}
          </div>
        </section>

      </main>
    </div>
  );
}

function StrikeCard({ strike, onAppealSuccess }: { strike: any, onAppealSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const hoursSinceStrike = differenceInHours(new Date(), new Date(strike.created_at));
  const isAppealable = !strike.appealed && hoursSinceStrike <= 48;

  const handleSubmitAppeal = async () => {
    if (!reason) {
      toast.error('Please provide a reason');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/strikes/appeal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strike_id: strike.id, worker_id: strike.worker_id, reason, evidence_url: evidenceUrl })
      });
      if (!res.ok) throw new Error('Appeal failed');
      toast.success('Appeal submitted!');
      setOpen(false);
      onAppealSuccess();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="rounded-[32px] border-none bg-white p-6 shadow-sm border border-red-50 flex items-center justify-between">
      <div className="space-y-1 flex-1">
        <div className="flex items-center gap-2 text-zinc-400 font-bold uppercase text-[9px]">
          <Badge className="bg-red-50 text-red-500 border-none px-2 py-0.5">Strike</Badge>
          <span>{formatDistanceToNow(new Date(strike.created_at))} ago</span>
        </div>
        <p className="text-sm font-black text-[#1B4332]">{strike.reason}</p>
        {strike.appealed && (
          <Badge variant="outline" className="text-[8px] font-black uppercase border-emerald-100 text-emerald-600 mt-2">
            Appeal {strike.appeal_status}
          </Badge>
        )}
      </div>

      {isAppealable && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-xl bg-[#1B4332] text-white text-[10px] font-black uppercase px-4 h-10 shadow-lg shadow-[#1B4332]/10">
              Appeal
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-[40px] border-none bg-white p-8 max-w-[400px]">
            <DialogHeader>
              <DialogTitle className={cn("[font-family:var(--font-heading)]","text-2xl text-[#1B4332]")}>Strike Appeal</DialogTitle>
              <DialogDescription className="text-xs font-medium text-zinc-400 pt-1">
                Provide evidence to dispute this strike. Window closes in {48 - hoursSinceStrike}h.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-zinc-400 ml-2">Reason for appeal</label>
                <Textarea 
                  placeholder="Explain why this strike was unfair..." 
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="rounded-2xl border-zinc-100 bg-zinc-50 font-medium min-h-[140px] p-4 text-[#1B4332] resize-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-zinc-400 ml-2">Supportive Evidence</label>
                <ImageUpload 
                  bucket="rozgar-uploads" 
                  path={`appeals/${strike.id}`} 
                  onUpload={setEvidenceUrl}
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                disabled={submitting}
                onClick={handleSubmitAppeal}
                className="w-full h-16 rounded-2xl bg-[#1B4332] text-white font-black text-lg shadow-xl shadow-[#1B4332]/20"
              >
                {submitting ? <Loader2 className="animate-spin" /> : 'Submit Appeal'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Card>
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
    <Card className="rounded-[36px] border-none bg-white shadow-xl shadow-[#1B4332]/5 overflow-hidden">
      <CardContent className="p-8 space-y-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <h4 className="text-2xl font-black text-[#1B4332] leading-tight">{ping.job?.interpreted_category}</h4>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-[9px] font-black uppercase border-zinc-100 text-zinc-400">
                <MapPin className="size-3 mr-1 text-[#40C057]" strokeWidth={3} />
                {ping.job?.pincode}
              </Badge>
              <Badge variant="outline" className="text-[9px] font-black uppercase border-zinc-100 text-zinc-400">
                <IndianRupee className="size-3 mr-1 text-[#40C057]" strokeWidth={3} />
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
          <Button onClick={onIgnore} variant="ghost" className="flex-1 h-14 rounded-2xl bg-zinc-50 text-zinc-400 font-bold">Skip</Button>
          <Button onClick={onView} className="flex-[2] h-14 rounded-2xl bg-[#40C057] text-[#1B4332] font-black shadow-lg shadow-[#40C057]/20">See Full Job</Button>
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
