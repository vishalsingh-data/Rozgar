'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ChevronLeft, 
  MapPin, 
  IndianRupee, 
  Clock, 
  Image as ImageIcon,
  Loader2,
  Sparkles,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import BidCard from '@/components/BidCard';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import Image from 'next/image';

export default function JobDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [job, setJob] = useState<any>(null);
  const [bids, setBids] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!id) return;

    // 1. Initial Fetch
    async function fetchData() {
      try {
        const { data: jobData, error: jobError } = await supabase
          .from('jobs')
          .select('*')
          .eq('id', id)
          .single();

        if (jobError) throw jobError;
        setJob(jobData);

        const { data: bidsData, error: bidsError } = await supabase
          .from('bids')
          .select('*, worker:users!worker_id(name, phone, workers!user_id(total_jobs, completion_rate, photo_url))')
          .eq('job_id', id)
          .order('created_at', { ascending: false });

        if (bidsError) throw bidsError;
        
        // Flatten worker data
        const flattenedBids = bidsData.map((b: any) => ({
          ...b,
          worker: {
            name: b.worker.name,
            total_jobs: b.worker.workers[0]?.total_jobs || 0,
            completion_rate: b.worker.workers[0]?.completion_rate,
            photo_url: b.worker.workers[0]?.photo_url,
          }
        }));
        setBids(flattenedBids);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load job details');
      } finally {
        setLoading(false);
      }
    }

    fetchData();

    // 2. Real-time Subscription for Bids
    const subscription = supabase
      .channel(`job_bids_${id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'bids', 
        filter: `job_id=eq.${id}` 
      }, async (payload) => {
        // Fetch full bid with worker details for the new bid
        const { data: newBid } = await supabase
          .from('bids')
          .select('*, worker:users!worker_id(name, phone, workers!user_id(total_jobs, completion_rate, photo_url))')
          .eq('id', payload.new.id)
          .single();
        
        if (newBid) {
          const flattened = {
            ...newBid,
            worker: {
              name: newBid.worker.name,
              total_jobs: newBid.worker.workers[0]?.total_jobs || 0,
              completion_rate: newBid.worker.workers[0]?.completion_rate,
              photo_url: newBid.worker.workers[0]?.photo_url,
            }
          };
          setBids(prev => [flattened, ...prev]);
          toast.success('New bid received!');
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [id]);

  async function handleAcceptBid(bidId: string) {
    const bid = bids.find(b => b.id === bidId);
    if (!bid) return;

    setAccepting(true);
    try {
      const { error } = await supabase
        .from('jobs')
        .update({
          accepted_worker_id: bid.worker_id,
          status: 'assigned'
        })
        .eq('id', id);

      if (error) throw error;

      toast.success(`Job assigned to ${bid.worker.name}!`);
      setJob({ ...job, status: 'assigned', accepted_worker_id: bid.worker_id });
    } catch (err) {
      console.error(err);
      toast.error('Failed to accept bid');
    } finally {
      setAccepting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 dark:bg-black">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm text-zinc-500">Loading job details...</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
        <h2 className="text-xl font-bold">Job not found</h2>
        <Button variant="link" onClick={() => router.push('/customer/dashboard')}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 pb-10 dark:bg-black">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-white/80 px-4 py-4 backdrop-blur-md dark:bg-black/80">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ChevronLeft className="size-6" />
          </Button>
          <div className="flex flex-col items-center">
            <h1 className="text-base font-bold">{job.interpreted_category}</h1>
            <p className="text-[10px] uppercase tracking-widest text-zinc-400">#{job.id.slice(0, 8)}</p>
          </div>
          <Badge className="bg-primary text-white capitalize">{job.status}</Badge>
        </div>
      </header>

      <main className="mx-auto max-w-lg p-6 space-y-6">
        
        {/* Job Summary */}
        <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
          <div className="mb-4 flex items-start justify-between">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
              {job.raw_description}
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800">
              <MapPin className="size-4 text-zinc-400" />
              <div>
                <p className="text-[10px] text-zinc-500">Pincode</p>
                <p className="text-sm font-bold">{job.pincode}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-primary/5 p-3 dark:bg-primary/10">
              <IndianRupee className="size-4 text-primary" />
              <div>
                <p className="text-[10px] text-primary/70">Est. Cost</p>
                <p className="text-sm font-bold text-primary">₹{job.ai_base_price || 'N/A'}</p>
              </div>
            </div>
          </div>

          {job.photo_url && (
            <div className="relative mt-4 aspect-video overflow-hidden rounded-xl bg-zinc-100">
              <Image 
                src={job.photo_url} 
                alt="Job photo" 
                fill 
                className="object-cover"
                unoptimized
              />
            </div>
          )}
        </div>

        {/* AI Insight Badge */}
        {job.ai_confidence > 0 && (
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Sparkles className="size-3 text-primary" />
            AI Categorized this as <span className="font-bold text-zinc-600 dark:text-zinc-300">{job.interpreted_category}</span>
          </div>
        )}

        <Separator />

        {/* Bids Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-zinc-900 dark:text-white">Worker Bids</h3>
            <Badge variant="secondary">{bids.length}</Badge>
          </div>

          {job.status === 'pending' || job.status === 'bidding' ? (
            bids.length > 0 ? (
              <div className="space-y-4">
                {bids.map((bid) => (
                  <BidCard 
                    key={bid.id} 
                    bid={bid} 
                    onAccept={handleAcceptBid}
                    disabled={accepting}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 py-12 dark:border-zinc-800">
                <Search className="mb-3 size-10 text-zinc-300 animate-pulse" />
                <p className="text-sm text-zinc-500 font-medium">Finding workers near you...</p>
                <p className="text-[10px] text-zinc-400">Bids usually appear in 2-5 minutes</p>
              </div>
            )
          ) : (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center dark:border-emerald-900/30 dark:bg-emerald-900/10">
              <CheckCircle2 className="mx-auto mb-2 size-8 text-emerald-500" />
              <p className="font-bold text-emerald-700 dark:text-emerald-400">Job Assigned</p>
              <p className="text-sm text-emerald-600/80">Check worker profile for contact details.</p>
            </div>
          )}
        </section>

      </main>
    </div>
  );
}

function CheckCircle2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
