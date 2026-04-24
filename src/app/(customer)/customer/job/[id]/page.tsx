'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Star, 
  MapPin, 
  ShieldCheck, 
  UserCheck, 
  Phone, 
  ChevronRight,
  Loader2,
  Radio,
  CheckCircle2,
  Clock,
  Navigation,
  RefreshCcw,
  AlertCircle,
  Info,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import SLATimer from '@/components/SLATimer';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';


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
      avg_rating: number | null;
      review_count: number;
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

  const [renegotiation, setRenegotiation] = useState<any>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);

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
            workers!workers_user_id_fkey(photo_url, completion_rate)
          )
        `)
        .eq('id', jobId)
        .single();

      if (jobError) throw jobError;
      setJob(jobData);

      // 2. If renegotiating, fetch the record
      if (jobData.status === 'renegotiating') {
        const { data: renData } = await supabase
          .from('renegotiations')
          .select('*')
          .eq('job_id', jobId)
          .eq('customer_decision', 'pending')
          .maybeSingle();
        setRenegotiation(renData);
      }

      // 3. Fetch Bids
      const { data: bidsData } = await supabase
        .from('bids')
        .select(`
          *,
          worker_profile:users!worker_id(
            name,
            workers!workers_user_id_fkey(
              searchable_as,
              is_new,
              aadhar_verified,
              total_jobs,
              completion_rate,
              avg_rating,
              review_count,
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
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id) setCustomerId(session.user.id);
    });
  }, []);

  useEffect(() => {
    fetchJobData();

    // Real-time subscription
    const channel = supabase
      .channel(`job-updates-${jobId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'jobs',
        filter: `id=eq.${jobId}`
      }, () => fetchJobData())
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'bids',
        filter: `job_id=eq.${jobId}`
      }, () => fetchJobData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [jobId, fetchJobData]);

  async function handleDecision(decision: 'accepted' | 'rejected') {
    setLoading(true);
    try {
      const res = await fetch('/api/jobs/renegotiate-decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          renegotiation_id: renegotiation.id,
          customer_id: job.customer_id,
          decision
        })
      });

      if (!res.ok) throw new Error('Failed to submit decision');
      
      toast.success(decision === 'accepted' ? 'Price increase accepted' : 'Job cancelled');
      fetchJobData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

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
          } else {
            const errData = await res.json();
            toast.error('Auto-broadcast failed: ' + errData.error);
          }
        } catch (err: any) {
          console.error('Auto-broadcast failed:', err);
          toast.error('Connectivity issue. Retrying broadcast...');
        } finally {
          setBroadcasting(false);
        }
      };
      runBroadcast();
    }
  }, [job, jobId, broadcasting, fetchJobData]);

  if (loading || !job) return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8F9F0]">
      <Loader2 className="size-8 animate-spin text-[#1B4332]" />
    </div>
  );

  const isTracking = ['assigned', 'in_transit', 'on_site', 'complete'].includes(job.status);

  return (
    <div className={cn("flex min-h-screen w-full flex-col bg-[#F8F9F0] pb-32")}>
      
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
              <Radio className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-10 text-[#1B4332]" />
            </div>
            <h1 className={cn("[font-family:var(--font-heading)] text-2xl text-[#1B4332]")}>Broadcasting your job...</h1>
            <p className="text-zinc-500 max-w-[280px]">We're notifying verified workers in {job.pincode} right now.</p>
          </div>
        )}

        {job.status !== 'pending' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h1 className={cn("[font-family:var(--font-heading)] text-2xl text-[#1B4332]")}>{job.interpreted_category}</h1>
              <Badge className="bg-[#40C057] text-[#1B4332] font-black uppercase text-[10px]">
                {job.status.replace('_', ' ')}
              </Badge>
            </div>
            <p className="text-sm text-zinc-500 line-clamp-2">{job.raw_description}</p>
          </div>
        )}
      </header>

      {/* Renegotiation Banner */}
      {job.status === 'renegotiating' && renegotiation && (
        <div className="bg-amber-50 border-b border-amber-200 animate-in slide-in-from-top duration-500">
          <div className="mx-auto max-w-lg p-6 space-y-6">
            <div className="flex items-start gap-4">
              <div className="size-12 rounded-2xl bg-amber-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-amber-500/20">
                <AlertCircle className="size-6" />
              </div>
              <div className="space-y-1">
                <h3 className={cn("[font-family:var(--font-heading)] text-lg text-amber-900")}>Price Change Requested</h3>
                <p className="text-xs text-amber-700/70 font-medium">Worker found hidden damage on-site</p>
              </div>
            </div>

            <Card className="rounded-[32px] border-none bg-white p-6 shadow-xl shadow-amber-900/5 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-zinc-400">Old Price</span>
                  <p className="text-xl font-bold text-zinc-400 line-through">₹{renegotiation.old_price}</p>
                </div>
                <div className="space-y-1 text-right">
                  <span className="text-[10px] font-black uppercase text-amber-500">New Price</span>
                  <p className="text-2xl font-black text-amber-600">₹{renegotiation.new_price}</p>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase text-zinc-400">Worker's Reason</span>
                <p className="text-sm font-medium text-zinc-600 leading-relaxed italic">"{renegotiation.reason}"</p>
              </div>

              {/* AI Verification Result */}
              <div className={cn(
                "rounded-2xl p-4 flex gap-3 items-start",
                renegotiation.ai_verified ? "bg-emerald-50 text-emerald-700" : "bg-zinc-50 text-zinc-500"
              )}>
                {renegotiation.ai_verified ? <CheckCircle2 className="size-5 shrink-0" /> : <Info className="size-5 shrink-0" />}
                <div className="space-y-1">
                  <p className="text-xs font-black uppercase tracking-widest">AI Audit Result</p>
                  <p className="text-[10px] leading-relaxed font-medium">{renegotiation.ai_note}</p>
                </div>
              </div>

              {renegotiation.new_photo_url && (
                <div className="relative aspect-video rounded-2xl overflow-hidden border border-zinc-100">
                  <img src={renegotiation.new_photo_url} alt="Damage evidence" className="size-full object-cover" />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button 
                  disabled={loading}
                  onClick={() => handleDecision('rejected')}
                  variant="outline" 
                  className="flex-1 h-14 rounded-2xl border-zinc-200 text-zinc-400 font-bold"
                >
                  {loading ? <Loader2 className="animate-spin" /> : 'Reject & Cancel'}
                </Button>
                <Button 
                  disabled={loading}
                  onClick={() => handleDecision('accepted')}
                  className="flex-[1.5] h-14 rounded-2xl bg-amber-500 text-white font-black shadow-lg shadow-amber-500/20"
                >
                  {loading ? <Loader2 className="animate-spin" /> : `Accept ₹${renegotiation.new_price}`}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      <main className="px-6">
        {/* State: Bidding */}
        {job.status === 'bidding' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className={cn("[font-family:var(--font-heading)] text-lg text-[#1B4332]")}>Worker Bids</h2>
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
                    loading={loading}
                    isExpanded={expandedBid === bid.id}
                    onToggle={() => setExpandedBid(expandedBid === bid.id ? null : bid.id)}
                    onSelect={() => handleSelectWorker(bid.worker_id, bid.worker_profile.name)}
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
            <TrackingView job={job} customerId={customerId || ''} />
          </div>
        )}
      </main>
    </div>
  );

  async function handleSelectWorker(workerId: string, workerName: string) {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const customerPhone = session?.user?.phone || '';

      // 1. Calculate convenience fee
      const feeAmount = (job.ai_base_price <= 300 || job.is_inspection) ? 25 : 49;

      // 2. Create Razorpay Order
      const orderRes = await fetch('/api/jobs/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId, amount: feeAmount })
      });

      if (!orderRes.ok) throw new Error('Failed to initiate payment');
      const order = await orderRes.json();

      // 3. Load Razorpay Script
      const loadScript = () => {
        return new Promise((resolve) => {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = () => resolve(true);
          script.onerror = () => resolve(false);
          document.head.appendChild(script);
        });
      };

      const isLoaded = await loadScript();
      if (!isLoaded) throw new Error('Failed to load payment gateway');

      // 4. Open Checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: 'Rozgar',
        description: 'Platform convenience fee',
        order_id: order.id,
        prefill: {
          contact: customerPhone,
        },
        theme: {
          color: '#1B4332',
        },
        handler: async function (response: any) {
          // 5. Verify & Finalize on Success
          try {
            setLoading(true);
            const verifyRes = await fetch('/api/jobs/select-worker', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                job_id: jobId,
                worker_id: workerId,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              })
            });

            if (!verifyRes.ok) throw new Error('Payment verification failed');
            
            toast.success(`Worker ${workerName} selected! They are on their way.`);
            // Page re-renders via Supabase real-time status change
          } catch (verifyErr: any) {
            toast.error(verifyErr.message);
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: function() {
            setLoading(false);
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();

    } catch (err: any) {
      toast.error(err.message);
      console.error(err);
      setLoading(false);
    }
  }
}

function BidCard({ bid, loading, isExpanded, onToggle, onSelect }: { bid: Bid, loading: boolean, isExpanded: boolean, onToggle: () => void, onSelect: () => void }) {
  const profile = bid.worker_profile?.workers?.[0] ?? {
    photo_url: null,
    is_new: true,
    aadhar_verified: false,
    total_jobs: 0,
    completion_rate: 100,
    avg_rating: null,
    review_count: 0,
    searchable_as: [],
    pincode: '',
  };
  
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
              {profile.avg_rating ? (
                <div className="flex items-center gap-1 text-[#40C057] font-bold text-xs">
                  <Star className="size-3 fill-[#40C057]" />
                  {profile.avg_rating.toFixed(1)}
                </div>
              ) : profile.is_new ? null : (
                <div className="flex items-center gap-1 text-zinc-300 font-bold text-xs">
                  <Star className="size-3" />
                  <span>New</span>
                </div>
              )}
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
              disabled={loading}
              onClick={onSelect}
              className="h-16 w-full rounded-2xl bg-[#1B4332] text-lg font-black text-white shadow-2xl shadow-[#1B4332]/20"
            >
              {loading ? <Loader2 className="animate-spin" /> : `Select ${bid.worker_profile.name.split(' ')[0]}`}
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

function ReviewSection({ job, customerId }: { job: any; customerId: string }) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    fetch(`/api/reviews/submit?job_id=${job.id}&reviewer_id=${customerId}`)
      .then(r => r.json())
      .then(d => { if (d.review) setSubmitted(true); })
      .finally(() => setChecked(true));
  }, [job.id, customerId]);

  if (!checked) return null;

  if (submitted) return (
    <div className="rounded-[32px] bg-[#40C057]/10 p-6 flex items-center gap-4">
      <CheckCircle2 className="size-6 text-[#40C057] shrink-0" />
      <p className="text-sm font-bold text-[#1B4332]">Thanks! Your review has been submitted.</p>
    </div>
  );

  const handleSubmit = async () => {
    if (!rating) return;
    setLoading(true);
    try {
      const res = await fetch('/api/reviews/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: job.id, reviewer_id: customerId, rating, comment })
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error);
      }
      setSubmitted(true);
      toast.success('Review submitted!');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-[40px] bg-white border border-zinc-100 shadow-xl shadow-[#1B4332]/5 p-8 space-y-6">
      <div className="space-y-1">
        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Rate Your Pro</h3>
        <p className="text-lg font-black text-[#1B4332]">How was {job.assigned_worker?.name}?</p>
      </div>

      {/* Stars */}
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => setRating(star)}
            className="transition-transform active:scale-90"
          >
            <Star
              className="size-10"
              fill={(hovered || rating) >= star ? '#40C057' : 'transparent'}
              stroke={(hovered || rating) >= star ? '#40C057' : '#D1D5DB'}
              strokeWidth={1.5}
            />
          </button>
        ))}
      </div>

      {/* Comment */}
      <Textarea
        placeholder="Share your experience (optional)..."
        value={comment}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setComment(e.target.value)}
        className="rounded-2xl border-zinc-100 bg-[#F8F9F0] font-medium resize-none h-24"
      />

      <Button
        disabled={!rating || loading}
        onClick={handleSubmit}
        className="h-14 w-full rounded-2xl bg-[#1B4332] text-white font-black text-base shadow-xl shadow-[#1B4332]/20"
      >
        {loading ? <Loader2 className="animate-spin" /> : 'Submit Review'}
      </Button>
    </div>
  );
}

function TrackingView({ job, customerId }: { job: any; customerId: string }) {
  const router = useRouter();
  const worker = job.assigned_worker;
  const workerProfile = worker?.workers?.[0] ?? { photo_url: null, completion_rate: 100 };

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
            <h3 className={cn("[font-family:var(--font-heading)] text-2xl font-black")}>{worker.name}</h3>
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
        {job.status !== 'complete' && (
          <div className="rounded-2xl bg-white p-5 flex gap-4 border border-zinc-100">
            <AlertCircle className="size-5 text-[#40C057] shrink-0" />
            <p className="text-[10px] text-zinc-500 font-bold leading-relaxed uppercase tracking-wide">
              Your payment is held securely in escrow. Only release it once the work is complete.
            </p>
          </div>
        )}
      </div>

      {/* Review section — shown only after completion */}
      {job.status === 'complete' && (
        <ReviewSection job={job} customerId={customerId} />
      )}
    </div>
  );
}

function isAfter(date1: Date, date2: Date) {
  return date1.getTime() > date2.getTime();
}
