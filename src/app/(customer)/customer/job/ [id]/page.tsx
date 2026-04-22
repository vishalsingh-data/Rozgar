'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Sora, DM_Sans } from 'next/font/google';
import { 
  Star, 
  MapPin, 
  ShieldCheck, 
  UserCheck, 
  Phone, 
  ChevronRight,
  Loader2,
  Broadcast,
  CheckCircle2,
  Clock,
  Navigation,
  RefreshCcw,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import SLATimer from '@/components/SLATimer';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

const sora = Sora({ subsets: ['latin'], weight: ['700', '800'] });
const dmSans = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '700'] });

type Bid = {
  id: string;
  worker_id: string;
  status: string;
  created_at: string;
  worker_profile: {
    name: string;
    workers: {
      searchable_as: string[];
      is_new: boolean;
      aadhar_verified: boolean;
      total_jobs: number;
      completion_rate: number;
      photo_url: string;
      pincode: string;
    }[]
  }
};

export default function JobDetailsPage() {
  const { id: jobId } = useParams();
  const router = useRouter();
  const [job, setJob] = useState<any>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [broadcasting, setBroadcasting] = useState(false);
  const [expandedBid, setExpandedBid] = useState<string | null>(null);

  const fetchJobData = useCallback(async () => {
    try {
      // 1. Fetch Job
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select(`
          *,
          assigned_worker:users!accepted_worker_id(
            name,
            phone,
            workers(photo_url, completion_rate)
          )
        `)
        .eq('id', jobId)
        .single();

      if (jobError) throw jobError;
      setJob(jobData);

      // 2. Fetch Bids
      const { data: bidsData } = await supabase
        .from('bids')
        .select(`
          *,
          worker_profile:users!worker_id(
            name,
            workers(
              searchable_as,
              is_new,
              aadhar_verified,
              total_jobs,
              completion_rate,
              photo_url,
              pincode
            )
          )
        `)
        .eq('job_id', jobId)
        .order('created_at', { ascending: false });

      setBids(bidsData as any || []);
    } catch (err: any) {
      toast.error('Failed to load job details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchJobData();

    // Real-time subscription for BIDS
    const channel = supabase
      .channel(`job-bids-${jobId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'bids',
        filter: `job_id=eq.${jobId}`
      }, () => {
        fetchJobData(); // Re-fetch on new bid
        toast.success('New worker bid received!', { icon: '🔔' });
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'jobs',
        filter: `id=eq.${jobId}`
      }, (payload) => {
        setJob((prev: any) => ({ ...prev, ...payload.new }));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [jobId, fetchJobData]);

  // Handle Auto-Broadcast
  useEffect(() => {
    if (job?.status === 'pending' && !broadcasting) {
      const runBroadcast = async () => {
        setBroadcasting(true);
        try {
          const res = await fetch('/api/jobs/broadcast', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ job_id: jobId })
          });
          if (res.ok) {
            fetchJobData();
          }
        } catch (err) {
          console.error('Auto-broadcast failed:', err);
        } finally {
          setBroadcasting(false);
        }
      };
      runBroadcast();
    }
  }, [job, jobId, broadcasting, fetchJobData]);

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8F9F0]">
      <Loader2 className="size-8 animate-spin text-[#1B4332]" />
    </div>
  );

  const isTracking = ['assigned', 'in_transit', 'on_site', 'complete'].includes(job.status);

  return (
    <div className={cn("flex min-h-screen w-full flex-col bg-[#F8F9F0] pb-32", dmSans.className)}>
      
      {/* Header */}
      <header className="px-6 py-8 space-y-4">
        <button onClick={() => router.back()} className="flex items-center text-zinc-400">
          <ArrowLeft className="mr-1 size-4" />
          <span className="text-xs font-bold uppercase tracking-widest">Dashboard</span>
        </button>

        {job.status === 'pending' && (
          <div className="flex flex-col items-center py-12 text-center space-y-6">
            <div className="relative">
              <div className="size-24 rounded-full border-4 border-dashed border-[#1B4332]/20 animate-spin" />
              <Broadcast className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-10 text-[#1B4332]" />
            </div>
            <h1 className={cn(sora.className, "text-2xl text-[#1B4332]")}>Broadcasting your job...</h1>
            <p className="text-zinc-500 max-w-[280px]">We're notifying verified workers in {job.pincode} right now.</p>
          </div>
        )}

        {job.status !== 'pending' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h1 className={cn(sora.className, "text-2xl text-[#1B4332]")}>{job.interpreted_category}</h1>
              <Badge className="bg-[#40C057] text-[#1B4332] font-black uppercase text-[10px]">
                {job.status.replace('_', ' ')}
              </Badge>
            </div>
            <p className="text-sm text-zinc-500 line-clamp-2">{job.raw_description}</p>
          </div>
        )}
      </header>

      <main className="px-6">
        {/* State: Bidding */}
        {job.status === 'bidding' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className={cn(sora.className, "text-lg text-[#1B4332]")}>Worker Bids</h2>
              <div className="flex items-center gap-2 text-xs font-bold text-[#40C057]">
                <div className="size-2 rounded-full bg-[#40C057] animate-ping" />
                {bids.length} workers interested
              </div>
            </div>

            {bids.length > 0 ? (
              <div className="space-y-4">
                {bids.map(bid => (
                  <BidCard 
                    key={bid.id} 
                    bid={bid} 
                    isExpanded={expandedBid === bid.id}
                    onToggle={() => setExpandedBid(expandedBid === bid.id ? null : bid.id)}
                    onSelect={() => handleSelectWorker(bid.worker_id)}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center py-20 text-center bg-white rounded-[40px] border-2 border-dashed border-zinc-100">
                <Navigation className="size-12 text-zinc-200 mb-4 animate-pulse" />
                <p className="text-sm font-bold text-zinc-400 px-10">Searching for available workers nearby. Sit tight!</p>
              </div>
            )}
          </div>
        )}

        {/* State: Tracking */}
        {isTracking && (
          <div className="space-y-8">
            <TrackingView job={job} />
          </div>
        )}
      </main>
    </div>
  );

  async function handleSelectWorker(workerId: string) {
    setLoading(true);
    try {
      // Logic: Update job with assigned_worker_id and status
      const slaDeadline = new Date(Date.now() + 45 * 60 * 1000).toISOString(); // 45 mins from now
      const { error } = await supabase
        .from('jobs')
        .update({
          accepted_worker_id: workerId,
          status: 'assigned',
          sla_deadline: slaDeadline
        })
        .eq('id', jobId);

      if (error) throw error;
      toast.success('Worker assigned!');
      fetchJobData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }
}

function BidCard({ bid, isExpanded, onToggle, onSelect }: { bid: Bid, isExpanded: boolean, onToggle: () => void, onSelect: () => void }) {
  const profile = bid.worker_profile.workers[0];
  
  return (
    <Card className="rounded-[32px] border-none bg-white shadow-xl shadow-[#1B4332]/5 overflow-hidden transition-all duration-300">
      <CardContent className="p-0">
        <div className="p-6 flex items-start gap-4">
          <div className="size-16 rounded-2xl bg-zinc-50 flex items-center justify-center overflow-hidden shrink-0 border border-zinc-100">
            {profile.photo_url ? (
              <img src={profile.photo_url} alt={bid.worker_profile.name} className="size-full object-cover" />
            ) : (
              <span className="text-xl font-black text-[#1B4332]">{bid.worker_profile.name.charAt(0)}</span>
            )}
          </div>
          
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-[#1B4332] text-lg leading-none">{bid.worker_profile.name}</h3>
              <div className="flex items-center gap-1 text-[#40C057] font-bold text-xs">
                <Star className="size-3 fill-[#40C057]" />
                4.8
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {profile.aadhar_verified && (
                <Badge className="bg-blue-50 text-blue-600 border-none text-[8px] font-black uppercase py-0.5">Verified</Badge>
              )}
              {profile.is_new && (
                <Badge className="bg-amber-50 text-amber-600 border-none text-[8px] font-black uppercase py-0.5">New Pro</Badge>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-zinc-400 font-bold">
              <span className="flex items-center gap-1"><CheckCircle2 className="size-3" /> {profile.total_jobs} Jobs</span>
              <span className="flex items-center gap-1"><MapPin className="size-3" /> {profile.pincode}</span>
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="px-6 pb-6 pt-2 space-y-6 animate-in slide-in-from-top-2">
            <div className="h-px bg-zinc-50 w-full" />
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-black text-zinc-400">Success Rate</span>
                <p className="font-bold text-[#1B4332]">{profile.completion_rate}%</p>
              </div>
              <div className="space-y-1 text-right">
                <span className="text-[10px] uppercase font-black text-zinc-400">Response</span>
                <p className="font-bold text-[#1B4332]">Instant</p>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] uppercase font-black text-zinc-400">Skills</span>
              <div className="flex flex-wrap gap-1">
                {profile.searchable_as.slice(0, 5).map(s => (
                  <Badge key={s} variant="outline" className="text-[9px] font-bold text-[#1B4332] rounded-md">{s}</Badge>
                ))}
              </div>
            </div>

            <Button 
              onClick={onSelect}
              className="h-16 w-full rounded-2xl bg-[#1B4332] text-lg font-black text-white shadow-2xl shadow-[#1B4332]/20"
            >
              Select {bid.worker_profile.name.split(' ')[0]}
            </Button>
          </div>
        )}

        <button 
          onClick={onToggle}
          className="w-full h-10 bg-zinc-50/50 flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-[#1B4332] transition-colors"
        >
          {isExpanded ? 'Show less' : 'View full profile & Select'}
        </button>
      </CardContent>
    </Card>
  );
}

function TrackingView({ job }: { job: any }) {
  const router = useRouter();
  const worker = job.assigned_worker;
  const workerProfile = worker.workers[0];

  const steps = [
    { label: 'Assigned', active: true },
    { label: 'On the way', active: ['in_transit', 'on_site', 'complete'].includes(job.status) },
    { label: 'Arrived', active: ['on_site', 'complete'].includes(job.status) },
    { label: 'Working', active: ['on_site', 'complete'].includes(job.status) },
    { label: 'Done', active: job.status === 'complete' },
  ];

  const currentStepIndex = steps.filter(s => s.active).length - 1;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* SLA Counter */}
      {job.status !== 'complete' && job.sla_deadline && (
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-zinc-400">Arrival Deadline</span>
            <p className="text-sm font-medium text-[#1B4332]">Pro will arrive within</p>
          </div>
          <SLATimer deadline={job.sla_deadline} />
        </div>
      )}

      {/* Worker Card */}
      <Card className="rounded-[40px] bg-[#1B4332] p-8 text-white shadow-2xl shadow-[#1B4332]/30">
        <div className="flex items-center gap-6">
          <div className="size-20 rounded-3xl bg-white/10 flex items-center justify-center overflow-hidden border-2 border-white/20">
            {workerProfile.photo_url ? (
              <img src={workerProfile.photo_url} alt={worker.name} className="size-full object-cover" />
            ) : (
              <span className="text-3xl font-black">{worker.name.charAt(0)}</span>
            )}
          </div>
          <div className="flex-1 space-y-2">
            <h3 className={cn(sora.className, "text-2xl font-black")}>{worker.name}</h3>
            <div className="flex items-center gap-4">
              <a href={`tel:${worker.phone}`} className="flex items-center gap-2 bg-[#40C057] text-[#1B4332] px-4 py-2 rounded-full font-black text-xs transition-transform active:scale-95">
                <Phone className="size-3" fill="currentColor" />
                Call Pro
              </a>
            </div>
          </div>
        </div>
      </Card>

      {/* Stepper */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400">Progress Tracker</h4>
          <span className="text-[10px] font-bold text-[#40C057] bg-[#40C057]/10 px-2 py-0.5 rounded-full">{steps[currentStepIndex].label}</span>
        </div>
        
        <div className="relative flex justify-between px-2">
          {/* Connector Line */}
          <div className="absolute left-0 top-3 h-1 w-full bg-zinc-100 -z-10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#40C057] transition-all duration-1000" 
              style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
            />
          </div>
          
          {steps.map((s, idx) => (
            <div key={idx} className="flex flex-col items-center gap-3">
              <div className={cn(
                "size-6 rounded-full border-4 transition-all duration-500 flex items-center justify-center",
                s.active ? "bg-[#40C057] border-[#F8F9F0] shadow-lg shadow-[#40C057]/20" : "bg-white border-zinc-50"
              )}>
                {s.active && <CheckCircle2 className="size-3 text-[#1B4332]" />}
              </div>
              <span className={cn(
                "text-[8px] font-black uppercase tracking-tighter",
                s.active ? "text-[#1B4332]" : "text-zinc-300"
              )}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="pt-8 space-y-4">
        {job.status === 'assigned' && isAfter(new Date(), new Date(job.sla_deadline)) && (
          <Button variant="outline" className="w-full h-14 rounded-2xl border-red-100 text-red-600 font-bold gap-2">
            <RefreshCcw className="size-4" />
            Pro is late? Reassign
          </Button>
        )}
        <div className="rounded-2xl bg-white p-5 flex gap-4 border border-zinc-100">
          <AlertCircle className="size-5 text-[#40C057] shrink-0" />
          <p className="text-[10px] text-zinc-500 font-bold leading-relaxed uppercase tracking-wide">
            Your payment is held securely in escrow. Only release it once the work is complete.
          </p>
        </div>
      </div>
    </div>
  );
}

function ArrowLeft(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
  )
}

function isAfter(date1: Date, date2: Date) {
  return date1.getTime() > date2.getTime();
}
