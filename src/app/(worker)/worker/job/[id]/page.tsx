'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ChevronLeft, 
  MapPin, 
  IndianRupee, 
  Clock, 
  CheckCircle2, 
  Loader2,
  AlertCircle,
  PhoneCall,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import Image from 'next/image';

export default function WorkerJobDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bidding, setBidding] = useState(false);
  const [hasBid, setHasBid] = useState(false);

  useEffect(() => {
    if (!id) return;

    async function fetchData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Fetch Job
        const { data: jobData, error: jobError } = await supabase
          .from('jobs')
          .select('*')
          .eq('id', id)
          .single();

        if (jobError) throw jobError;
        setJob(jobData);

        // 2. Check if already bid
        const { data: bidData } = await supabase
          .from('bids')
          .select('id')
          .eq('job_id', id)
          .eq('worker_id', user.id)
          .single();

        if (bidData) setHasBid(true);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load job details');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id]);

  async function handlePlaceBid() {
    setBidding(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      const { error } = await supabase.from('bids').insert({
        job_id: id,
        worker_id: user.id,
        source: 'app',
        status: 'pending'
      });

      if (error) throw error;

      toast.success('Bid placed successfully!');
      setHasBid(true);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to place bid');
    } finally {
      setBidding(false);
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

  if (!job) return <div>Job not found</div>;

  const isAssignedToMe = job.accepted_worker_id && job.status === 'assigned'; // Simplified check

  return (
    <div className="min-h-screen bg-zinc-50 pb-24 dark:bg-black">
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
          <Badge className="bg-zinc-100 text-zinc-600 capitalize">{job.status}</Badge>
        </div>
      </header>

      <main className="mx-auto max-w-lg p-6 space-y-6">
        
        {/* Job Content */}
        <div className="rounded-3xl bg-white p-6 shadow-sm dark:bg-zinc-900">
          <h2 className="text-2xl font-bold leading-tight text-zinc-900 dark:text-white">
            {job.raw_description}
          </h2>

          <div className="mt-6 flex items-center gap-4">
            <div className="flex flex-1 items-center gap-3 rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-800">
              <div className="flex size-10 items-center justify-center rounded-full bg-white shadow-sm dark:bg-zinc-700">
                <IndianRupee className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Customer Budget</p>
                <p className="text-xl font-black text-zinc-900 dark:text-white">₹{job.ai_base_price || 'Negotiable'}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-4 border-t pt-4">
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <MapPin className="size-4" />
              {job.pincode}
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Clock className="size-4" />
              Posted today
            </div>
          </div>
        </div>

        {/* Photos */}
        {job.photo_url && (
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-bold text-zinc-500">
              <Info className="size-4" />
              Job Photos
            </h3>
            <div className="relative aspect-square w-full overflow-hidden rounded-3xl bg-zinc-200">
              <Image 
                src={job.photo_url} 
                alt="Job reference" 
                fill 
                className="object-cover"
                unoptimized
              />
            </div>
          </div>
        )}

        {/* Instructions Card */}
        <div className="rounded-2xl bg-blue-50 p-5 border border-blue-100 dark:bg-blue-900/10 dark:border-blue-900/30">
          <p className="text-xs font-bold text-blue-800 dark:text-blue-400 mb-1 uppercase tracking-wider">How Bidding Works</p>
          <p className="text-sm text-blue-700/80 dark:text-blue-300/80">
            Clicking "Express Interest" will send your profile and phone number to the customer. They will contact you if they accept your bid.
          </p>
        </div>

      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-white p-4 backdrop-blur-md dark:bg-zinc-900/80 sm:p-6">
        <div className="mx-auto max-w-lg">
          {hasBid ? (
            <Button className="h-14 w-full gap-2 rounded-2xl bg-zinc-100 text-lg font-bold text-zinc-400" disabled>
              <CheckCircle2 className="size-6" />
              Interest Expressed
            </Button>
          ) : job.status !== 'pending' && job.status !== 'bidding' ? (
            <Button className="h-14 w-full gap-2 rounded-2xl bg-zinc-100 text-lg font-bold text-zinc-400" disabled>
              Job No Longer Available
            </Button>
          ) : (
            <Button 
              className="h-14 w-full gap-2 rounded-2xl text-lg font-bold shadow-xl shadow-primary/20"
              onClick={handlePlaceBid}
              disabled={bidding}
            >
              {bidding ? <Loader2 className="size-6 animate-spin" /> : <PhoneCall className="size-6" />}
              Express Interest & Bid
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
