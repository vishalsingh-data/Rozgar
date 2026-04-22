'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Sora, DM_Sans } from 'next/font/google';
import { 
  ArrowLeft,
  MapPin, 
  Clock, 
  Phone, 
  Navigation,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  IndianRupee,
  ShieldCheck,
  Camera,
  MessageSquare,
  Wrench,
  Info,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

const sora = Sora({ subsets: ['latin'], weight: ['700', '800'] });
const dmSans = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '700'] });

export default function WorkerJobDetailsPage() {
  const { id: jobId } = useParams();
  const router = useRouter();
  const [job, setJob] = useState<any>(null);
  const [workerId, setWorkerId] = useState<string | null>(null);
  const [hasBid, setHasBid] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchJobDetails = useCallback(async (uid: string) => {
    try {
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select(`
          *,
          customer:users!customer_id(name, phone)
        `)
        .eq('id', jobId)
        .single();

      if (jobError) throw jobError;
      setJob(jobData);

      const { data: bidData } = await supabase
        .from('bids')
        .select('id')
        .eq('job_id', jobId)
        .eq('worker_id', uid)
        .maybeSingle();
      
      setHasBid(!!bidData);
    } catch (err: any) {
      toast.error('Failed to load job details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/login');
        return;
      }
      setWorkerId(session.user.id);
      fetchJobDetails(session.user.id);

      const channel = supabase
        .channel(`worker-job-${jobId}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'jobs',
          filter: `id=eq.${jobId}`
        }, (payload) => {
          setJob((prev: any) => ({ ...prev, ...payload.new }));
          toast.success(`Job status updated!`, { icon: '🔄' });
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
    init();
  }, [jobId, router, fetchJobDetails]);

  const handleSubmitBid = async () => {
    if (!workerId) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/bids/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId, worker_id: workerId })
      });
      if (!res.ok) throw new Error('Failed to submit bid');
      setHasBid(true);
      toast.success('Interest registered! Checking for customer selection.');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const updateStatus = async (newStatus: string, apiEndpoint?: string) => {
    if (!workerId) return;
    setActionLoading(true);
    try {
      if (apiEndpoint) {
        const res = await fetch(apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ job_id: jobId, worker_id: workerId })
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Operation failed');
        }
      } else {
        const { error } = await supabase
          .from('jobs')
          .update({ status: newStatus })
          .eq('id', jobId);
        if (error) throw error;
      }
      toast.success(`Status: ${newStatus.replace('_', ' ').toUpperCase()}`);
      fetchJobDetails(workerId);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8F9F0]">
      <Loader2 className="size-8 animate-spin text-[#1B4332]" />
    </div>
  );

  const isAssignedToMe = job.accepted_worker_id === workerId;

  return (
    <div className={cn("flex min-h-screen w-full flex-col bg-[#F8F9F0] pb-32", dmSans.className)}>
      
      {/* Dynamic Header */}
      <header className="px-6 py-10 space-y-6">
        <button onClick={() => router.back()} className="flex items-center text-zinc-400 group">
          <ArrowLeft className="mr-1 size-4 transition-transform group-hover:-translate-x-1" />
          <span className="text-[10px] font-black uppercase tracking-widest">Back to Radar</span>
        </button>

        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className={cn(sora.className, "text-2xl text-[#1B4332] leading-tight")}>{job.interpreted_category}</h1>
            <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest flex items-center gap-2">
              <MapPin className="size-3 text-[#40C057]" /> {job.pincode}
            </p>
          </div>
          <Badge className="bg-[#40C057] text-[#1B4332] font-black uppercase text-[9px] px-3 py-1 rounded-lg border-none">
            {job.status.replace('_', ' ')}
          </Badge>
        </div>
      </header>

      <main className="px-6 space-y-10">
        
        {/* Job Visuals & Details */}
        <Card className="rounded-[40px] border-none bg-white shadow-2xl shadow-[#1B4332]/5 overflow-hidden">
          <CardContent className="p-0">
            {job.photo_url ? (
              <div className="relative aspect-[4/3] w-full bg-zinc-50 border-b border-zinc-50">
                <img src={job.photo_url} alt="Job" className="size-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              </div>
            ) : (
              <div className="p-8 flex flex-col items-center justify-center bg-[#1B4332]/5 h-48 border-b border-[#1B4332]/5">
                <Camera className="size-10 text-[#1B4332]/20 mb-2" />
                <p className="text-xs font-black text-[#1B4332]/40 uppercase tracking-widest">No Job Photos</p>
              </div>
            )}
            
            <div className="p-8 space-y-8">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[#40C057]">
                  <Sparkles className="size-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Job Brief</span>
                </div>
                <p className="text-xl font-bold text-[#1B4332] leading-relaxed">{job.raw_description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#F8F9F0] rounded-[24px] p-5 space-y-1">
                  <span className="text-[9px] font-black uppercase text-zinc-400">Potential Earnings</span>
                  <p className="text-2xl font-black text-[#1B4332] flex items-center">
                    <IndianRupee className="size-4 mr-0.5" />
                    {job.ai_base_price}
                  </p>
                </div>
                <div className="bg-[#F8F9F0] rounded-[24px] p-5 space-y-1">
                  <span className="text-[9px] font-black uppercase text-zinc-400">Job Type</span>
                  <p className="text-xs font-black text-[#1B4332] uppercase tracking-wide">
                    {job.is_inspection ? 'Inspection' : 'Standard Fix'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Center */}
        <div className="space-y-6">
          
          {/* STATE: BIDDING & NO BID */}
          {job.status === 'bidding' && !hasBid && (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2 py-4">
                <div className="size-2 rounded-full bg-[#40C057] animate-ping" />
                <span className="text-xs font-bold text-[#40C057]">Hiring Opportunity Active</span>
              </div>
              <Button 
                disabled={actionLoading}
                onClick={handleSubmitBid}
                className="h-20 w-full rounded-[32px] bg-[#40C057] text-xl font-black text-[#1B4332] shadow-2xl shadow-[#40C057]/20 active:scale-95 transition-all"
              >
                {actionLoading ? <Loader2 className="animate-spin" /> : 'Express Interest'}
              </Button>
            </div>
          )}

          {/* STATE: BID SUBMITTED */}
          {job.status === 'bidding' && hasBid && (
            <div className="flex flex-col items-center py-12 text-center bg-white rounded-[40px] border-2 border-dashed border-emerald-100 shadow-sm">
              <div className="size-16 rounded-full bg-emerald-50 flex items-center justify-center text-[#40C057] mb-4">
                <CheckCircle2 className="size-8" />
              </div>
              <p className="text-xl font-black text-[#1B4332]">Bidding Complete!</p>
              <p className="text-sm font-medium text-zinc-400 px-12 mt-2">Waiting for customer to confirm. You'll be notified instantly.</p>
            </div>
          )}

          {/* STATE: ASSIGNED TO ME */}
          {isAssignedToMe && (
            <div className="space-y-10">
              {/* Customer Contact Card */}
              <div className="space-y-4">
                <h3 className={cn(sora.className, "text-sm font-black uppercase tracking-widest text-zinc-400")}>Customer Intel</h3>
                <Card className="rounded-[40px] border-none bg-[#1B4332] text-white p-8 shadow-2xl shadow-[#1B4332]/30">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <p className="text-2xl font-black">{job.customer?.name}</p>
                      <Badge className="bg-white/10 text-[#40C057] border-none text-[9px] font-black uppercase px-2 py-1">
                        Verified Area: {job.pincode}
                      </Badge>
                    </div>
                    <div className="flex gap-4">
                      <a href={`tel:${job.customer?.phone}`} className="size-16 rounded-[24px] bg-[#40C057] flex items-center justify-center text-[#1B4332] shadow-xl active:scale-90 transition-all">
                        <Phone className="size-7" fill="currentColor" />
                      </a>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Status Action Button */}
              <div className="pt-4">
                {job.status === 'assigned' && (
                  <Button 
                    disabled={actionLoading}
                    onClick={() => updateStatus('in_transit')}
                    className="h-20 w-full rounded-[32px] bg-[#1B4332] text-xl font-black text-white shadow-2xl shadow-[#1B4332]/20 flex gap-4"
                  >
                    {actionLoading ? <Loader2 className="animate-spin" /> : (
                      <>
                        <Navigation className="size-6 text-[#40C057]" fill="currentColor" />
                        Start My Journey
                      </>
                    )}
                  </Button>
                )}

                {job.status === 'in_transit' && (
                  <Button 
                    disabled={actionLoading}
                    onClick={() => updateStatus('on_site', '/api/jobs/arrive')}
                    className="h-20 w-full rounded-[32px] bg-[#40C057] text-xl font-black text-[#1B4332] shadow-2xl shadow-[#40C057]/20"
                  >
                    {actionLoading ? <Loader2 className="animate-spin" /> : 'Confirm Arrival'}
                  </Button>
                )}

                {job.status === 'on_site' && (
                  <div className="space-y-4">
                    <Button 
                      disabled={actionLoading}
                      onClick={() => updateStatus('complete', '/api/jobs/complete')}
                      className="h-24 w-full rounded-[40px] bg-[#40C057] text-2xl font-black text-[#1B4332] shadow-2xl shadow-[#40C057]/20 flex flex-col gap-0.5"
                    >
                      {actionLoading ? <Loader2 className="animate-spin" /> : (
                        <>
                          <span>Finish Job</span>
                          <span className="text-[10px] opacity-60 font-bold uppercase tracking-widest">Record Payout</span>
                        </>
                      )}
                    </Button>
                    <button className="w-full text-zinc-400 font-bold text-xs uppercase tracking-widest py-2">
                      Need Help? Dispute Job
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STATE: NOT ASSIGNED & CLOSED */}
          {!isAssignedToMe && job.status !== 'bidding' && (
            <div className="flex flex-col items-center py-16 text-center bg-zinc-50 rounded-[40px] border-2 border-dashed border-zinc-200">
              <AlertTriangle className="size-10 text-amber-500 mb-4" />
              <p className="text-sm font-black text-zinc-400 px-12">This job was assigned to another pro.</p>
              <Button onClick={() => router.push('/worker/dashboard')} variant="link" className="text-[#40C057] font-black underline mt-2 uppercase text-[10px] tracking-widest">Back to Radar</Button>
            </div>
          )}

          {/* Secure Marker */}
          <div className="flex items-center justify-center gap-2 pt-8 opacity-20">
            <ShieldCheck className="size-4" />
            <span className="text-[8px] font-black uppercase tracking-widest">Rozgar Secured Session</span>
          </div>
        </div>
      </main>
    </div>
  );
}
