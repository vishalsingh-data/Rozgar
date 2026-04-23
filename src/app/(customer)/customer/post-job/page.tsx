'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Sora, DM_Sans } from 'next/font/google';
import { 
  CheckCircle2, 
  AlertCircle,
  ArrowLeft,
  Loader2,
  ChevronRight,
  ShieldCheck,
  Info,
  Clock,
  MapPin,
  Camera
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import ImageUpload from '@/components/ImageUpload';
import { cn } from '@/lib/utils';

const sora = Sora({ subsets: ['latin'], weight: ['700', '800'] });
const dmSans = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '700'] });

type EstimateResult = {
  interpreted_category: string;
  ai_base_price: number | null;
  confidence: number;
  time_estimate: string;
  damage_summary: string;
  worker_tags_required: string[];
  is_inspection: boolean;
};

export default function PostJobPage() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1: Input, 2: Result, 3: Loading
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);

  // Form State
  const [description, setDescription] = useState('');
  const [pincode, setPincode] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [estimate, setEstimate] = useState<EstimateResult | null>(null);
  
  // Background AI fetching
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function getSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) setCustomerId(session.user.id);
      else {
        toast.error('Session expired. Please login again.');
        router.push('/login');
      }
    }
    getSession();
  }, [router]);

  // Background Estimation Logic
  useEffect(() => {
    if (description.length < 20) {
      setEstimate(null);
      return;
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/ai/estimate-job', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description })
        });
        if (res.ok) {
          const data = await res.json();
          setEstimate(data);
        } else {
          const errData = await res.json();
          console.error('Background AI failed:', errData.error);
        }
      } catch (err: any) {
        console.error('Background AI failed:', err);
      }
    }, 500);

    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [description]);

  const handleNext = () => {
    if (description.length < 20) return;
    if (!pincode || pincode.length < 6) {
      toast.error('Please enter a valid 6-digit pincode');
      return;
    }

    if (!estimate) {
      // If AI hasn't finished, show loading and wait
      setIsAnalysing(true);
      const pollTimer = setInterval(async () => {
        if (estimate) {
          clearInterval(pollTimer);
          setIsAnalysing(false);
          setStep(2);
        }
      }, 500);
      
      // Safety timeout
      setTimeout(() => {
        if (!estimate) {
          clearInterval(pollTimer);
          setIsAnalysing(false);
          toast.error('AI is taking longer than usual. Please try again.');
        }
      }, 5000);
    } else {
      setStep(2);
    }
  };

  const handleCreateJob = async () => {
    if (!customerId || !estimate || !pincode) return;

    setLoading(true);
    try {
      const res = await fetch('/api/jobs/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: customerId,
          raw_description: description,
          interpreted_category: estimate.interpreted_category,
          worker_tags_required: estimate.worker_tags_required,
          ai_base_price: estimate.ai_base_price,
          ai_confidence: estimate.confidence,
          is_inspection: estimate.is_inspection,
          photo_url: photoUrl,
          pincode: pincode
        })
      });

      if (!res.ok) throw new Error('Job creation failed');

      const job = await res.json();
      toast.success('Job broadcasted!');
      router.push(`/customer/job/${job.id}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (isAnalysing) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F8F9F0] px-10 text-center">
        <div className="flex gap-2 mb-6">
          <div className="size-3 rounded-full bg-[#1B4332] animate-bounce [animation-delay:-0.3s]"></div>
          <div className="size-3 rounded-full bg-[#40C057] animate-bounce [animation-delay:-0.15s]"></div>
          <div className="size-3 rounded-full bg-[#1B4332] animate-bounce"></div>
        </div>
        <h2 className={`${sora.className} text-2xl text-[#1B4332]`}>Analysing your job...</h2>
        <p className="mt-2 text-sm text-zinc-400">Comparing with 10,000+ local market rates</p>
      </div>
    );
  }

  return (
    <div className={cn("flex min-h-screen w-full flex-col items-center bg-[#F8F9F0] px-6", dmSans.className)}>
      <div className="w-full max-w-[430px] flex flex-col min-h-screen">
        
        {/* Step 1: Input */}
        {step === 1 && (
          <div className="flex flex-col flex-1 justify-center py-12">
            <h1 className={cn(sora.className, "text-4xl text-[#1B4332] leading-tight text-center mb-10")}>
              What do you <br /> need done?
            </h1>
            
            <div className="space-y-6">
              <div className="relative">
                <Textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Be as specific as you can. Example: Ceiling fan makes clicking noise and stopped spinning."
                  className="min-h-[200px] rounded-3xl border-none bg-white p-8 text-lg shadow-sm focus-visible:ring-2 focus-visible:ring-[#40C057] transition-all"
                />
                <p className="mt-3 text-center text-xs text-zinc-400 font-medium">
                  Repair, cleaning, labour, cooking, driving — anything.
                </p>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow-sm border border-zinc-100/50">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 block">Your area pincode (6 digits)</Label>
                <div className="relative">
                  <MapPin className="absolute left-0 top-1/2 -translate-y-1/2 size-5 text-[#40C057]" />
                  <Input 
                    type="number"
                    maxLength={6}
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.slice(0,6))}
                    placeholder="560XXX"
                    className="h-10 border-none bg-transparent pl-8 text-xl font-black text-[#1B4332] focus-visible:ring-0"
                  />
                </div>
              </div>
            </div>

            <div className="mt-12">
              <Button 
                disabled={description.length < 20 || pincode.length < 6 || isAnalysing}
                onClick={handleNext}
                className="h-20 w-full rounded-full bg-[#1B4332] text-xl font-bold text-white shadow-2xl shadow-[#1B4332]/20 transition-all active:scale-95 disabled:opacity-30"
              >
                {isAnalysing ? <Loader2 className="animate-spin size-6" /> : (
                  <>
                    Next
                    <ChevronRight className="ml-2 size-6" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Result */}
        {step === 2 && estimate && (
          <div className="py-12 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <button onClick={() => setStep(1)} className="flex items-center text-zinc-400 hover:text-[#1B4332]">
              <ArrowLeft className="mr-2 size-4" />
              <span className="text-xs font-bold uppercase tracking-widest">Edit Description</span>
            </button>

            <Card className="rounded-[40px] border-none bg-white shadow-2xl shadow-[#1B4332]/10 overflow-hidden">
              <CardContent className="p-0">
                <div className="bg-[#1B4332] p-10 text-white">
                  <div className="mb-6 flex justify-between items-start">
                    <Badge className={cn(
                      "rounded-full px-4 py-1.5 text-[10px] font-black uppercase tracking-widest border-none",
                      estimate.confidence >= 0.70 ? "bg-[#40C057] text-[#1B4332]" : "bg-amber-400 text-[#1B4332]"
                    )}>
                      {estimate.confidence >= 0.70 ? (
                        <span className="flex items-center gap-1"><CheckCircle2 className="size-3" /> High Confidence</span>
                      ) : (
                        <span className="flex items-center gap-1"><AlertCircle className="size-3" /> Inspection Mode</span>
                      )}
                    </Badge>
                  </div>
                  <h2 className={cn(sora.className, "text-3xl leading-tight mb-2")}>{estimate.interpreted_category}</h2>
                  <p className="text-sm opacity-60 font-medium leading-relaxed">{estimate.damage_summary}</p>
                </div>

                <div className="p-10 space-y-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Fair Price Estimate</span>
                      <p className="text-5xl font-black text-[#1B4332] tracking-tighter mt-1">
                        {estimate.is_inspection ? '₹100' : `₹${estimate.ai_base_price}`}
                      </p>
                      {estimate.is_inspection && (
                        <p className="text-[10px] font-bold text-amber-600 uppercase mt-1">Initial Visit Fee</p>
                      )}
                    </div>
                    <div className="text-right">
                      <Clock className="ml-auto mb-1 size-5 text-[#40C057]" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Duration</span>
                      <p className="font-bold text-[#1B4332]">{estimate.time_estimate}</p>
                    </div>
                  </div>

                  <div className="h-px bg-zinc-100 w-full" />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-zinc-500">
                      <span className="text-sm font-medium">Platform Fee</span>
                      <span className="text-sm font-bold">FREE</span>
                    </div>
                    <div className="flex items-center justify-between text-[#1B4332]">
                      <span className="text-sm font-bold">Total Estimate</span>
                      <span className="text-xl font-black">
                        {estimate.is_inspection ? '₹100' : `₹${estimate.ai_base_price}`}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <div className="rounded-[32px] bg-white p-8 shadow-sm border border-zinc-100/50">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Camera className="size-5 text-[#40C057]" />
                    <span className="text-sm font-bold text-[#1B4332]">Add Photo (Optional)</span>
                  </div>
                  {photoUrl && <CheckCircle2 className="size-5 text-[#40C057]" />}
                </div>
                <p className="text-xs text-zinc-400 mb-6">A photo helps workers quote accurately.</p>
                <div className="flex justify-center">
                  <ImageUpload 
                    bucket="rozgar-uploads"
                    path={`job-photos/${customerId}`}
                    onUpload={(url) => setPhotoUrl(url)}
                  />
                </div>
              </div>

              <div className="flex flex-col items-center gap-4">
                <Button 
                  disabled={loading}
                  onClick={handleCreateJob}
                  className={cn(
                    "h-24 w-full rounded-[40px] text-2xl font-black text-white shadow-2xl transition-all active:scale-95",
                    estimate.is_inspection ? "bg-amber-500 shadow-amber-500/20" : "bg-[#40C057] shadow-[#40C057]/20"
                  )}
                >
                  {loading ? <Loader2 className="animate-spin" /> : (
                    estimate.is_inspection ? 'Book Inspection — ₹100' : 'Find Workers — Free'
                  )}
                </Button>
                <div className="flex items-center gap-1.5 opacity-40">
                  <ShieldCheck className="size-3" />
                  <span className="text-[10px] font-black uppercase tracking-widest">No Hidden Charges</span>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
