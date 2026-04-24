'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Scale, 
  User, 
  Wrench, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Camera,
  IndianRupee,
  ShieldCheck,
  Info,
  MessageCircle,
  HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';


export default function PartnerDisputePage() {
  const { id: jobId } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [job, setJob] = useState<any>(null);
  
  // Form State
  const [resolution, setResolution] = useState('complete');
  const [mediationNotes, setMediationNotes] = useState('');
  const [workerSideInput, setWorkerSideInput] = useState('');
  const [partialAmount, setPartialAmount] = useState<string>('');

  const fetchJobData = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          customer:users!customer_id(name, phone),
          worker:users!accepted_worker_id(name, phone)
        `)
        .eq('id', jobId)
        .single();
      
      if (error) throw error;
      setJob(data);
    } catch (err: any) {
      toast.error('Failed to load dispute data');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [jobId, router]);

  useEffect(() => { fetchJobData(); }, [fetchJobData]);

  const handleSubmit = async () => {
    if (!mediationNotes) {
      toast.error('Please provide mediation notes');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/partner/resolve-dispute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: jobId,
          resolution,
          mediation_notes: mediationNotes,
          worker_side_input: workerSideInput,
          partial_amount: resolution === 'partial' ? parseInt(partialAmount) : null
        })
      });

      if (!res.ok) throw new Error('Resolution failed');
      
      toast.success('Dispute resolved! Status updated.');
      router.push('/partner/dashboard');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <MediationSkeleton />;

  return (
    <div className={cn("flex min-h-screen w-full flex-col bg-[#F8F9F0] pb-32")}>
      
      {/* Header */}
      <header className="px-6 py-10 space-y-4">
        <button onClick={() => router.back()} className="flex items-center text-zinc-400 group">
          <ArrowLeft className="mr-1 size-4 transition-transform group-hover:-translate-x-1" />
          <span className="text-[10px] font-black uppercase tracking-widest">Dashboard</span>
        </button>
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-2xl bg-[#1B4332] flex items-center justify-center text-white shadow-lg">
            <Scale className="size-6" />
          </div>
          <h1 className={cn("[font-family:var(--font-heading)] text-2xl text-[#1B4332]")}>Mediation Center</h1>
        </div>
      </header>

      <main className="px-6 space-y-10">
        
        {/* Job Overview */}
        <Card className="rounded-[40px] border-none bg-white p-8 shadow-xl shadow-[#1B4332]/5 space-y-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Case Subject</p>
              <h2 className="text-xl font-black text-[#1B4332]">{job.interpreted_category}</h2>
            </div>
            <Badge className="bg-red-50 text-red-500 border-none font-black text-[9px] uppercase px-3 py-1">Disputed</Badge>
          </div>
          <div className="flex items-center gap-6">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total Price</p>
              <p className="text-lg font-black text-[#1B4332]">₹{job.final_price || job.ai_base_price}</p>
            </div>
            <div className="h-10 w-px bg-zinc-100" />
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Status</p>
              <p className="text-sm font-bold text-zinc-400 italic">Held in Escrow</p>
            </div>
          </div>
        </Card>

        {/* Dual Perspectives */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Customer Column */}
          <section className="space-y-4">
            <h3 className={cn("[font-family:var(--font-heading)] text-sm font-black uppercase tracking-widest text-[#1B4332] flex items-center gap-2")}>
              <User className="size-4" /> Customer's Claim
            </h3>
            <Card className="rounded-[32px] border-none bg-white p-6 shadow-sm min-h-[200px] border border-zinc-50">
              <div className="space-y-4">
                <div className="p-4 bg-[#F8F9F0] rounded-2xl">
                  <p className="text-sm font-medium text-zinc-600 leading-relaxed italic">
                    "The worker arrived late and didn't finish the cleaning properly. There is still dust behind the sofa."
                  </p>
                </div>
                {job.photo_url && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase text-zinc-400">Customer Evidence</p>
                    <div className="relative aspect-video rounded-2xl overflow-hidden border border-zinc-100">
                      <img src={job.photo_url} alt="Evidence" className="size-full object-cover" />
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </section>

          {/* Worker Column */}
          <section className="space-y-4">
            <h3 className={cn("[font-family:var(--font-heading)] text-sm font-black uppercase tracking-widest text-[#1B4332] flex items-center gap-2")}>
              <Wrench className="size-4" /> Worker's Side
            </h3>
            <Card className="rounded-[32px] border-none bg-white p-6 shadow-sm min-h-[200px] border border-zinc-50">
              <div className="space-y-4">
                <Textarea 
                  placeholder="Ask the worker for their side and record it here..." 
                  value={workerSideInput}
                  onChange={(e) => setWorkerSideInput(e.target.value)}
                  className="rounded-2xl border-zinc-100 bg-[#F8F9F0] font-medium min-h-[160px] p-4 text-[#1B4332] placeholder:text-zinc-300"
                />
              </div>
            </Card>
          </section>

        </div>

        {/* Mediation Decision */}
        <section className="space-y-6 pt-10 border-t border-zinc-100">
          <h3 className={cn("[font-family:var(--font-heading)] text-lg text-[#1B4332] flex items-center gap-2")}>
            <Scale className="size-5 text-[#40C057]" /> Resolution Verdict
          </h3>

          <div className="space-y-8">
            <RadioGroup value={resolution} onValueChange={setResolution} className="grid grid-cols-1 gap-4">
              <div className={cn("flex items-start gap-4 p-6 rounded-[24px] transition-all cursor-pointer", resolution === 'complete' ? "bg-[#1B4332] text-white shadow-xl" : "bg-white border border-zinc-100")}>
                <RadioGroupItem value="complete" id="complete" className="mt-1" />
                <Label htmlFor="complete" className="flex-1 cursor-pointer">
                  <p className="font-black text-base">Job was complete</p>
                  <p className={cn("text-[10px] mt-1 font-medium", resolution === 'complete' ? "text-white/60" : "text-zinc-400")}>Customer must pay the full amount.</p>
                </Label>
              </div>

              <div className={cn("flex items-start gap-4 p-6 rounded-[24px] transition-all cursor-pointer", resolution === 'incomplete' ? "bg-red-500 text-white shadow-xl" : "bg-white border border-zinc-100")}>
                <RadioGroupItem value="incomplete" id="incomplete" className="mt-1" />
                <Label htmlFor="incomplete" className="flex-1 cursor-pointer">
                  <p className="font-black text-base">Job was incomplete</p>
                  <p className={cn("text-[10px] mt-1 font-medium", resolution === 'incomplete' ? "text-white/60" : "text-zinc-400")}>Cancel job. No payment will be released.</p>
                </Label>
              </div>

              <div className={cn("flex items-start gap-4 p-6 rounded-[24px] transition-all cursor-pointer", resolution === 'partial' ? "bg-amber-500 text-white shadow-xl" : "bg-white border border-zinc-100")}>
                <RadioGroupItem value="partial" id="partial" className="mt-1" />
                <Label htmlFor="partial" className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <p className="font-black text-base">Partial Payment</p>
                    {resolution === 'partial' && (
                      <Input 
                        type="number" 
                        placeholder="₹ Amount" 
                        value={partialAmount}
                        onChange={(e) => setPartialAmount(e.target.value)}
                        className="w-24 h-8 bg-white/20 border-white/40 text-white font-black rounded-lg placeholder:text-white/50"
                      />
                    )}
                  </div>
                  <p className={cn("text-[10px] mt-1 font-medium", resolution === 'partial' ? "text-white/60" : "text-zinc-400")}>Suggest a fair settlement amount.</p>
                </Label>
              </div>

              <div className={cn("flex items-start gap-4 p-6 rounded-[24px] transition-all cursor-pointer", resolution === 'escalate' ? "bg-zinc-800 text-white shadow-xl" : "bg-white border border-zinc-100")}>
                <RadioGroupItem value="escalate" id="escalate" className="mt-1" />
                <Label htmlFor="escalate" className="flex-1 cursor-pointer">
                  <p className="font-black text-base">Escalate to Rozgar Support</p>
                  <p className={cn("text-[10px] mt-1 font-medium", resolution === 'escalate' ? "text-white/60" : "text-zinc-400")}>Cannot resolve. Handover to central team.</p>
                </Label>
              </div>
            </RadioGroup>

            <div className="space-y-4">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Final Mediation Notes</Label>
              <Textarea 
                placeholder="Explain the reason for this verdict. This is permanent." 
                value={mediationNotes}
                onChange={(e) => setMediationNotes(e.target.value)}
                className="rounded-3xl border-zinc-100 bg-white font-medium min-h-[120px] p-6 text-[#1B4332] shadow-sm"
              />
            </div>

            <Button 
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full h-20 rounded-[32px] bg-[#1B4332] text-xl font-black text-white shadow-2xl shadow-[#1B4332]/20 active:scale-95 transition-all"
            >
              {submitting ? <Loader2 className="animate-spin" /> : 'Confirm Final Verdict'}
            </Button>
          </div>
        </section>

      </main>
    </div>
  );
}

function MediationSkeleton() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-[#F8F9F0] px-6 py-12 space-y-10">
      <Skeleton className="h-10 w-40 rounded-2xl" />
      <Skeleton className="h-48 w-full rounded-[40px]" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="h-64 w-full rounded-[32px]" />
        <Skeleton className="h-64 w-full rounded-[32px]" />
      </div>
    </div>
  );
}
