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
  Sparkles,
  RefreshCcw,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import ImageUpload from '@/components/ImageUpload';

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

  // Renegotiation State
  const [showRenegotiate, setShowRenegotiate] = useState(false);
  const [newPrice, setNewPrice] = useState<string>('');
  const [reason, setReason] = useState('');
  const [newPhotoUrl, setNewPhotoUrl] = useState('');

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
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/login');
        return;
      }
      setWorkerId(session.user.id);
      fetchJobDetails(session.user.id);

      // Remove any stale channel from a previous StrictMode mount before subscribing
      const channelName = `worker-job-${jobId}`;
      const existing = supabase.getChannels().find(c => c.topic === `realtime:${channelName}`);
      if (existing) await supabase.removeChannel(existing);

      channel = supabase
        .channel(channelName)
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
    }

    init();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
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
      toast.success('Interest registered!');
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
      toast.success(`Status updated: ${newStatus.replace('_', ' ')}`);
      fetchJobDetails(workerId);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRenegotiate = async () => {
    if (!workerId || !newPrice || !reason) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/jobs/renegotiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: jobId,
          worker_id: workerId,
          new_price: parseInt(newPrice),
          reason,
          new_photo_url: newPhotoUrl
        })
      });
      if (!res.ok) throw new Error('Failed to submit renegotiation');
      toast.success('Price change request sent to customer');
      setShowRenegotiate(false);
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
      
      {/* Header */}
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
          <Badge className={cn(
            "font-black uppercase text-[9px] px-3 py-1 rounded-lg border-none",
            job.status === 'renegotiating' ? "bg-amber-500 text-white animate-pulse" : "bg-[#40C057] text-[#1B4332]"
          )}>
            {job.status.replace('_', ' ')}
          </Badge>
        </div>
      </header>

      <main className="px-6 space-y-10">
        
        {/* Renegotiation Waiting View */}
        {job.status === 'renegotiating' && (
          <div className="flex flex-col items-center py-12 text-center bg-white rounded-[40px] border-2 border-dashed border-amber-100 shadow-xl shadow-amber-500/5 animate-in zoom-in-95 duration-500">
            <div className="size-20 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 mb-6">
              <RefreshCcw className="size-10 animate-spin" />
            </div>
            <h3 className={cn(sora.className, "text-xl text-[#1B4332]")}>Price Change Pending</h3>
            <p className="text-sm font-medium text-zinc-400 px-12 mt-2 leading-relaxed">
              We've notified the customer about the price change. Please wait for their approval before continuing work.
            </p>
          </div>
        )}

        {/* Job Visuals & Details */}
        {job.status !== 'renegotiating' && (
          <Card className="rounded-[40px] border-none bg-white shadow-2xl shadow-[#1B4332]/5 overflow-hidden">
            <CardContent className="p-0">
              {job.photo_url ? (
                <div className="relative aspect-[4/3] w-full bg-zinc-50 border-b border-zinc-50">
                  <img src={job.photo_url} alt="Job" className="size-full object-cover" />
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
                    <span className="text-[9px] font-black uppercase text-zinc-400">Current Rate</span>
                    <p className="text-2xl font-black text-[#1B4332] flex items-center">
                      <IndianRupee className="size-4 mr-0.5" />
                      {job.final_price || job.ai_base_price}
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
        )}

        {/* Action Center */}
        <div className="space-y-6">
          
          {/* BIDDING PHASE */}
          {job.status === 'bidding' && !hasBid && (
            <Button 
              disabled={actionLoading}
              onClick={handleSubmitBid}
              className="h-20 w-full rounded-[32px] bg-[#40C057] text-xl font-black text-[#1B4332] shadow-2xl shadow-[#40C057]/20 active:scale-95 transition-all"
            >
              {actionLoading ? <Loader2 className="animate-spin" /> : 'Express Interest'}
            </Button>
          )}

          {/* FULFILLMENT PHASE (Assigned to me) */}
          {isAssignedToMe && job.status !== 'renegotiating' && (
            <div className="space-y-6">
              {/* Customer Contact Card */}
              <Card className="rounded-[40px] border-none bg-[#1B4332] text-white p-8 shadow-2xl shadow-[#1B4332]/30">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-2xl font-black">{job.customer?.name}</p>
                    <p className="text-xs text-white/50 font-bold uppercase tracking-widest">{job.pincode}</p>
                  </div>
                  <a href={`tel:${job.customer?.phone}`} className="size-16 rounded-[24px] bg-[#40C057] flex items-center justify-center text-[#1B4332] shadow-xl">
                    <Phone className="size-7" fill="currentColor" />
                  </a>
                </div>
              </Card>

              {/* Status Actions */}
              <div className="space-y-4">
                {job.status === 'assigned' && (
                  <Button 
                    disabled={actionLoading}
                    onClick={() => updateStatus('in_transit')}
                    className="h-20 w-full rounded-[32px] bg-[#1B4332] text-xl font-black text-white shadow-2xl shadow-[#1B4332]/20"
                  >
                    {actionLoading ? <Loader2 className="animate-spin" /> : 'Start Journey'}
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
                      className="h-24 w-full rounded-[40px] bg-[#40C057] text-2xl font-black text-[#1B4332] shadow-2xl shadow-[#40C057]/20"
                    >
                      {actionLoading ? <Loader2 className="animate-spin" /> : 'Finish Job'}
                    </Button>

                    {/* Renegotiation Trigger */}
                    <Dialog open={showRenegotiate} onOpenChange={setShowRenegotiate}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" className="w-full text-zinc-400 font-bold text-xs uppercase tracking-widest">
                          Request Price Change?
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="rounded-[40px] border-none bg-white p-8 max-w-[400px]">
                        <DialogHeader>
                          <DialogTitle className={cn(sora.className, "text-2xl text-[#1B4332]")}>New Estimate</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-6 py-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-zinc-400">New Price (₹)</label>
                            <Input 
                              type="number" 
                              placeholder="e.g. 1200" 
                              value={newPrice}
                              onChange={(e) => setNewPrice(e.target.value)}
                              className="h-14 rounded-2xl border-zinc-100 bg-zinc-50 font-bold"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-zinc-400">Reason for increase</label>
                            <Textarea 
                              placeholder="Describe the hidden damage..." 
                              value={reason}
                              onChange={(e) => setReason(e.target.value)}
                              className="rounded-2xl border-zinc-100 bg-zinc-50 font-medium resize-none h-32"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-zinc-400">Evidence Photo</label>
                            <ImageUpload 
                              bucket="rozgar-uploads" 
                              path={`renegotiation-photos/${jobId}`}
                              onUpload={setNewPhotoUrl}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button 
                            disabled={actionLoading || !newPrice || !reason || !newPhotoUrl}
                            onClick={handleRenegotiate}
                            className="w-full h-16 rounded-2xl bg-[#1B4332] text-white font-black text-lg"
                          >
                            {actionLoading ? <Loader2 className="animate-spin" /> : 'Send Request'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-center gap-2 pt-8 opacity-20">
            <ShieldCheck className="size-4" />
            <span className="text-[8px] font-black uppercase tracking-widest">Rozgar Secure Session</span>
          </div>
        </div>
      </main>
    </div>
  );
}
