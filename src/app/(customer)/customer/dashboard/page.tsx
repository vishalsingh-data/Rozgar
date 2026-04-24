'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Clock,
  ShieldCheck,
  History,
  MapPin,
  ChevronRight,
  Loader2,
  AlertCircle,
  Bell,
  Search,
  CheckCircle2,
  Wrench,
  Navigation
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow, isAfter } from 'date-fns';
import { cn } from '@/lib/utils';
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

type Job = {
  id: string;
  created_at: string;
  interpreted_category: string;
  status: string;
  ai_base_price: number | null;
  warranty_expires_at: string | null;
  worker?: { name: string };
};

export default function CustomerDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    async function initDashboard() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          router.push('/login');
          return;
        }

        // Fetch User Profile
        const { data: profile } = await supabase
          .from('users')
          .select('name')
          .eq('id', session.user.id)
          .single();
        
        if (profile) setUserName(profile.name);

        // Fetch All Jobs
        const { data: jobsData, error } = await supabase
          .from('jobs')
          .select('*, worker:users!accepted_worker_id(name)')
          .eq('customer_id', session.user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setJobs(jobsData || []);
      } catch (err: any) {
        console.error('Customer Dashboard Load Error:', err);
        toast.error(err.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    }

    initDashboard();
  }, [router]);

  const activeJobs = jobs.filter(j => 
    ['pending', 'bidding', 'assigned', 'in_transit', 'on_site'].includes(j.status)
  );

  const warranties = jobs.filter(j => 
    j.warranty_expires_at && isAfter(new Date(j.warranty_expires_at), new Date())
  );

  const pastJobs = jobs.filter(j => 
    !activeJobs.find(aj => aj.id === j.id) && !warranties.find(wj => wj.id === j.id)
  );

  if (loading) return <DashboardSkeleton />;

  return (
    <div className={"flex min-h-screen w-full flex-col bg-[#F8F9F0] pb-24"}>
      
      {/* Navbar */}
      <nav className="sticky top-0 z-20 bg-[#F8F9F0]/80 backdrop-blur-md px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-10 rounded-2xl bg-[#1B4332] flex items-center justify-center text-white font-black text-xl shadow-lg shadow-[#1B4332]/20">R</div>
          <h2 className={cn("[font-family:var(--font-heading)]","text-xl text-[#1B4332] tracking-tight")}>Rozgar</h2>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button variant="ghost" size="icon" className="rounded-full bg-white dark:bg-zinc-800 shadow-sm">
            <Bell className="size-5 text-[#1B4332] dark:text-[#40C057]" />
          </Button>
          <button
            onClick={() => router.push('/profile')}
            className="size-10 rounded-full bg-[#40C057]/10 border-2 border-white flex items-center justify-center hover:bg-[#40C057]/20 active:scale-95 transition-all shadow-sm"
            title="Edit Profile"
          >
            <span className="text-sm font-black text-[#1B4332]">{userName.charAt(0)}</span>
          </button>
        </div>
      </nav>

      <main className="px-6 space-y-10">
        {/* Greeting & CTA */}
        <div className="space-y-6">
          <div>
            <h1 className={cn("[font-family:var(--font-heading)]","text-3xl text-[#1B4332] leading-tight")}>
              Hello, <br />{userName.split(' ')[0]}!
            </h1>
            <p className="mt-2 text-zinc-500 font-medium italic">What can we fix for you today?</p>
          </div>

          <Button 
            onClick={() => router.push('/customer/post-job')}
            className="h-20 w-full rounded-[32px] bg-[#1B4332] text-xl font-black text-white shadow-2xl shadow-[#1B4332]/30 group transition-all active:scale-95"
          >
            <div className="size-10 rounded-full bg-[#40C057] flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
              <Plus className="size-6 text-[#1B4332]" strokeWidth={3} />
            </div>
            Post a New Job
          </Button>
        </div>

        {/* Active Jobs */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className={cn("[font-family:var(--font-heading)]","text-lg text-[#1B4332] flex items-center gap-2")}>
              <Navigation className="size-5 text-[#40C057]" />
              Active Jobs
            </h3>
            {activeJobs.length > 0 && <span className="text-xs font-black text-[#40C057] uppercase tracking-widest">{activeJobs.length} Active</span>}
          </div>

          {activeJobs.length > 0 ? (
            <div className="space-y-4">
              {activeJobs.map(job => (
                <JobDashboardCard key={job.id} job={job} onClick={() => router.push(`/customer/job/${job.id}`)} />
              ))}
            </div>
          ) : (
            <EmptyState 
              icon={<Search className="size-10" />} 
              message="No jobs currently active. Need help with a repair?" 
            />
          )}
        </section>

        {/* Active Warranties */}
        {warranties.length > 0 && (
          <section className="space-y-6">
            <h3 className={cn("[font-family:var(--font-heading)]","text-lg text-[#1B4332] flex items-center gap-2")}>
              <ShieldCheck className="size-5 text-[#40C057]" />
              Active Warranties
            </h3>
            <div className="space-y-4">
              {warranties.map(job => (
                <WarrantyCard key={job.id} job={job} />
              ))}
            </div>
          </section>
        )}

        {/* Past Jobs */}
        <section className="space-y-6">
          <h3 className={cn("[font-family:var(--font-heading)]","text-lg text-[#1B4332] flex items-center gap-2")}>
            <History className="size-5 text-zinc-400" />
            Past Jobs
          </h3>
          {pastJobs.length > 0 ? (
            <div className="space-y-3">
              {pastJobs.map(job => (
                <div key={job.id} className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-zinc-100/50">
                  <div className="flex items-center gap-4">
                    <div className="size-10 rounded-xl bg-zinc-50 flex items-center justify-center text-zinc-400">
                      <CheckCircle2 className="size-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#1B4332]">{job.interpreted_category}</p>
                      <p className="text-[10px] text-zinc-400 uppercase font-black">{formatDistanceToNow(new Date(job.created_at))} ago</p>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-zinc-300" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-400 italic text-center py-4">No completed jobs yet.</p>
          )}
        </section>
      </main>
    </div>
  );
}

function JobDashboardCard({ job, onClick }: { job: Job, onClick: () => void }) {
  const statusColors: any = {
    pending: 'bg-amber-100 text-amber-700',
    bidding: 'bg-emerald-100 text-emerald-700',
    assigned: 'bg-blue-100 text-blue-700',
    on_site: 'bg-purple-100 text-purple-700',
  };

  return (
    <Card onClick={onClick} className="rounded-3xl border-none bg-white shadow-xl shadow-[#1B4332]/5 overflow-hidden active:scale-95 transition-all cursor-pointer">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-1">
            <h4 className="text-xl font-black text-[#1B4332] leading-tight">{job.interpreted_category}</h4>
            <div className="flex items-center gap-2 text-xs text-zinc-400 font-medium">
              <Clock className="size-3" />
              {formatDistanceToNow(new Date(job.created_at))} ago
            </div>
          </div>
          <Badge className={cn("rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest border-none", statusColors[job.status] || 'bg-zinc-100')}>
            {job.status.replace('_', ' ')}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between pt-4 border-t border-zinc-50">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-full bg-zinc-50 flex items-center justify-center">
              <Wrench className="size-4 text-zinc-400" />
            </div>
            <span className="text-xs font-bold text-zinc-500">
              {job.status === 'pending' ? 'Finding workers...' : 'Active Job'}
            </span>
          </div>
          <ChevronRight className="size-5 text-zinc-300" />
        </div>
      </CardContent>
    </Card>
  );
}


function WarrantyCard({ job, onClaimSuccess }: { job: Job, onClaimSuccess?: () => void }) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitClaim = async () => {
    if (!description) {
      toast.error('Please describe the issue');
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Not authenticated');

      const res = await fetch('/api/warranty/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: job.id,
          customer_id: session.user.id,
          description
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to file claim');
      }

      toast.success('Warranty claim filed! We have notified the worker.');
      setOpen(false);
      onClaimSuccess?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="rounded-3xl border-2 border-dashed border-[#40C057]/30 bg-white p-6">
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-xl bg-[#40C057]/10 flex items-center justify-center text-[#40C057]">
              <ShieldCheck className="size-5" />
            </div>
            <p className="text-sm font-black text-[#1B4332]">{job.interpreted_category}</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Worker</p>
              <p className="text-xs font-bold text-[#1B4332]">{job.worker?.name || 'Verified Pro'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Expires</p>
              <p className="text-xs font-bold text-emerald-600">{new Date(job.warranty_expires_at!).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="rounded-xl border-zinc-200 text-xs font-bold h-10 px-4">
              File Claim
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-[40px] border-none bg-white p-8 max-w-[400px]">
            <DialogHeader>
              <DialogTitle className={cn("[font-family:var(--font-heading)]","text-2xl text-[#1B4332]")}>Warranty Claim</DialogTitle>
              <DialogDescription className="text-xs font-medium text-zinc-400 pt-1">
                Tell us what happened with the repair for <b>{job.interpreted_category}</b>.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-zinc-400 ml-2">Describe the issue</label>
                <Textarea 
                  placeholder="e.g. The leak has started again in the same pipe..." 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="rounded-2xl border-zinc-100 bg-zinc-50 font-medium min-h-[140px] p-4 text-[#1B4332] resize-none"
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                disabled={submitting}
                onClick={handleSubmitClaim}
                className="w-full h-16 rounded-2xl bg-[#1B4332] text-white font-black text-lg shadow-xl shadow-[#1B4332]/20"
              >
                {submitting ? <Loader2 className="animate-spin" /> : 'Submit Claim'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Card>
  );
}

function EmptyState({ icon, message }: { icon: React.ReactNode, message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-10 bg-white rounded-[32px] border-2 border-dashed border-zinc-100 text-center">
      <div className="mb-4 text-zinc-200">{icon}</div>
      <p className="text-sm font-medium text-zinc-400 leading-relaxed">{message}</p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-[#F8F9F0] px-6 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <Skeleton className="size-10 rounded-2xl" />
        <div className="flex gap-2">
          <Skeleton className="size-10 rounded-full" />
          <Skeleton className="size-10 rounded-full" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Skeleton className="h-20 w-full rounded-[32px]" />
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-32 w-full rounded-[32px]" />
      </div>
    </div>
  );
}
