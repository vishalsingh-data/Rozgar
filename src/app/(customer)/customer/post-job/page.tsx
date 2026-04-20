'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Sparkles, 
  MapPin, 
  IndianRupee, 
  Wand2, 
  ArrowRight,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import ImageUpload from '@/components/ImageUpload';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export default function PostJobPage() {
  const router = useRouter();
  const [description, setDescription] = useState('');
  const [pincode, setPincode] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  
  const [aiResult, setAiResult] = useState<{
    category: string;
    tags: string[];
    estimated_price: number;
    confidence: number;
  } | null>(null);

  // ── AI Parsing ─────────────────────────────────────────────────────────────
  async function handleParse() {
    if (!description || description.length < 10) {
      toast.error('Please provide a bit more detail first');
      return;
    }

    setParsing(true);
    try {
      const res = await fetch('/api/jobs/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      });
      
      if (!res.ok) throw new Error('Failed to parse');
      
      const data = await res.json();
      setAiResult(data);
      toast.success('AI analyzed your request!');
    } catch (error) {
      console.error(error);
      toast.error('AI analysis failed, but you can still post.');
    } finally {
      setParsing(false);
    }
  }

  // ── Final Submit ───────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!description || !pincode) {
      toast.error('Description and pincode are required');
      return;
    }

    setLoading(true);
    try {
      // 1. Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // For demo/seed testing, if no user, we'll use Priya's ID from seed
      // (Normally redirect to login, but let's be robust for the first test)
      const customerId = user?.id || 'd0fed3ab-e144-4578-be09-af81ebab5b0a';

      const { data, error } = await supabase.from('jobs').insert({
        customer_id: customerId,
        raw_description: description,
        interpreted_category: aiResult?.category || 'General',
        worker_tags_required: aiResult?.tags || [],
        ai_base_price: aiResult?.estimated_price || null,
        ai_confidence: aiResult?.confidence || 0,
        photo_url: photoUrl || null,
        pincode: pincode,
        status: 'pending'
      }).select().single();

      if (error) throw error;

      toast.success('Job posted successfully!');
      router.push(`/customer/job/${data.id}`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to post job');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 pb-20 dark:bg-black">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-white/80 px-6 py-4 backdrop-blur-md dark:bg-black/80">
        <h1 className="text-xl font-bold tracking-tight">Post a New Job</h1>
      </header>

      <main className="mx-auto max-w-lg space-y-8 p-6">
        
        {/* Step 1: Description */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-500">
            <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs text-white">1</span>
            What do you need help with?
          </div>
          <Textarea 
            placeholder="e.g., My ceiling fan is making a clicking sound and needs repair. Also one switch in the bedroom is loose."
            className="min-h-[120px] rounded-xl border-zinc-200 bg-white text-lg shadow-sm focus:ring-primary/20"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => !aiResult && handleParse()}
          />
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full gap-2 rounded-full border-primary/20 bg-primary/5 text-primary hover:bg-primary/10"
            onClick={handleParse}
            disabled={parsing}
          >
            {parsing ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
            {aiResult ? 'Re-analyze with AI' : 'Analyze with AI'}
          </Button>
        </section>

        {/* AI Insight Card */}
        {aiResult && (
          <div className="animate-in fade-in slide-in-from-top-4 rounded-2xl border border-primary/20 bg-primary/5 p-5 duration-500">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                <Sparkles className="size-4" />
                AI Analysis
              </div>
              {aiResult.confidence > 0.8 && (
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30">
                  High Confidence
                </Badge>
              )}
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-xs text-zinc-500">Detected Category</p>
                <p className="text-lg font-bold">{aiResult.category}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {aiResult.tags.map(tag => (
                  <Badge key={tag} variant="outline" className="rounded-full bg-white capitalize">
                    {tag}
                  </Badge>
                ))}
              </div>

              <div className="flex items-center gap-4 rounded-xl bg-white p-3 shadow-sm">
                <div className="flex size-10 items-center justify-center rounded-full bg-zinc-100">
                  <IndianRupee className="size-5 text-zinc-600" />
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Estimated Labor Cost</p>
                  <p className="text-lg font-bold">₹{aiResult.estimated_price}</p>
                </div>
                <AlertCircle className="ml-auto size-4 text-zinc-300" />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Photo */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-500">
            <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs text-white">2</span>
            Add a photo (recommended)
          </div>
          <ImageUpload 
            bucket="jobs"
            path="requests"
            label=""
            optional
            onUpload={(url) => setPhotoUrl(url)}
          />
        </section>

        {/* Step 3: Location */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-500">
            <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs text-white">3</span>
            Where is the work?
          </div>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-zinc-400" />
            <Input 
              placeholder="Enter Pincode (e.g. 560068)"
              className="h-12 pl-10 rounded-xl border-zinc-200 bg-white shadow-sm"
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              maxLength={6}
            />
          </div>
        </section>

        {/* Footer CTA */}
        <div className="pt-6">
          <Button 
            className="h-14 w-full gap-2 rounded-2xl text-lg font-bold shadow-lg shadow-primary/20"
            disabled={loading || !description || !pincode}
            onClick={handleSubmit}
          >
            {loading ? <Loader2 className="size-5 animate-spin" /> : 'Post Job Now'}
            {!loading && <ArrowRight className="size-5" />}
          </Button>
          <p className="mt-4 text-center text-xs text-zinc-400">
            By posting, you agree to our Terms of Service.
          </p>
        </div>

      </main>
    </div>
  );
}
