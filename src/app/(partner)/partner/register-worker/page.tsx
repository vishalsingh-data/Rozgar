'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  User, 
  Phone, 
  Wrench, 
  Languages, 
  Smartphone, 
  Camera, 
  CheckCircle2, 
  Loader2,
  Sparkles,
  Info,
  ShieldCheck,
  Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import ImageUpload from '@/components/ImageUpload';


export default function RegisterWorkerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [partnerNode, setPartnerNode] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    description: '',
    language: 'English',
    worker_type: 'Skilled',
    has_smartphone: true,
    aadhar_front_url: '',
    aadhar_back_url: ''
  });

  const [aiData, setAiData] = useState<{ tags: string[], category: string }>({ tags: [], category: '' });

  useEffect(() => {
    async function getPartner() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      const { data } = await supabase
        .from('partner_nodes')
        .select('*')
        .eq('owner_id', session.user.id)
        .single();
      setPartnerNode(data);
    }
    getPartner();
  }, [router]);

  const handleParseSkills = async () => {
    if (!formData.description || formData.description.length < 10) return;
    setParsing(true);
    try {
      const res = await fetch('/api/ai/parse-skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: formData.description })
      });
      const data = await res.json();
      setAiData(data);
      toast.success('AI extracted skills & category!', { icon: '✨' });
    } catch (err) {
      console.error(err);
    } finally {
      setParsing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.aadhar_front_url) {
      toast.error('Please fill all mandatory fields and upload Aadhar');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/partner/register-worker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          ...aiData,
          partner_node_id: partnerNode.id
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to register');
      
      setSuccess(true);
      toast.success('Worker registered successfully!');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className={cn("flex min-h-screen flex-col items-center justify-center bg-[#F8F9F0] px-6 text-center")}>
        <div className="size-24 rounded-[32px] bg-[#40C057] flex items-center justify-center text-white mb-8 shadow-2xl shadow-[#40C057]/20">
          <CheckCircle2 className="size-12" />
        </div>
        <h1 className={cn("[font-family:var(--font-heading)] text-3xl text-[#1B4332] mb-4")}>Onboarding Complete!</h1>
        <p className="text-zinc-500 max-w-[300px] mb-12">
          Worker <span className="font-black text-[#1B4332]">{formData.name}</span> is now live on Rozgar.
          {!formData.has_smartphone && " They will receive job alerts via missed calls."}
        </p>
        <div className="w-full space-y-3">
          <Button onClick={() => window.location.reload()} className="w-full h-14 rounded-2xl bg-[#1B4332] text-white font-black">Register Another</Button>
          <Button onClick={() => router.push('/partner/dashboard')} variant="ghost" className="w-full h-14 rounded-2xl text-[#1B4332] font-black">Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex min-h-screen w-full flex-col bg-[#F8F9F0] pb-24")}>
      
      {/* Header */}
      <header className="px-6 py-10 space-y-4">
        <button onClick={() => router.back()} className="flex items-center text-zinc-400 group">
          <ArrowLeft className="mr-1 size-4 transition-transform group-hover:-translate-x-1" />
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Back</span>
        </button>
        <h1 className={cn("[font-family:var(--font-heading)] text-3xl text-[#1B4332] leading-tight")}>Onboard New Pro</h1>
        <p className="text-sm text-zinc-400 font-medium">Add a new worker to your fleet. AI will help with skills.</p>
      </header>

      <main className="px-6">
        <form onSubmit={handleSubmit} className="space-y-10">
          
          {/* Section: Basic Info */}
          <div className="space-y-6">
            <h3 className={cn("[font-family:var(--font-heading)] text-sm font-black uppercase tracking-widest text-zinc-300")}>1. Personal Intel</h3>
            <div className="space-y-4">
              <div className="relative">
                <User className="absolute left-4 top-4 size-5 text-zinc-300" />
                <Input 
                  placeholder="Full Name" 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="h-14 pl-12 rounded-2xl border-zinc-100 bg-white font-bold text-[#1B4332]"
                />
              </div>
              <div className="relative">
                <Phone className="absolute left-4 top-4 size-5 text-zinc-300" />
                <Input 
                  placeholder="Phone Number (10 digits)" 
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="h-14 pl-12 rounded-2xl border-zinc-100 bg-white font-bold text-[#1B4332]"
                />
              </div>
            </div>
          </div>

          {/* Section: Skills & AI */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className={cn("[font-family:var(--font-heading)] text-sm font-black uppercase tracking-widest text-zinc-300")}>2. Work Profile</h3>
              <Sparkles className={cn("size-4", parsing ? "text-[#40C057] animate-spin" : "text-zinc-200")} />
            </div>
            <div className="space-y-4">
              <Textarea 
                placeholder="What can this worker do? e.g. 'Ramesh is an expert in AC repair, window cooling, and RO systems...'" 
                value={formData.description}
                onBlur={handleParseSkills}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="rounded-2xl border-zinc-100 bg-white font-medium min-h-[120px] p-4 text-[#1B4332]"
              />
              
              {aiData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 p-4 bg-white rounded-2xl border border-[#40C057]/10 animate-in fade-in duration-500">
                  {aiData.tags.map(tag => (
                    <Badge key={tag} className="bg-[#40C057]/10 text-[#40C057] border-none text-[10px] font-black uppercase">
                      <Tag className="size-3 mr-1" /> {tag}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <Select value={formData.language} onValueChange={(v) => setFormData({ ...formData, language: v })}>
                  <SelectTrigger className="h-14 rounded-2xl border-zinc-100 bg-white font-bold text-[#1B4332]">
                    <Languages className="size-4 mr-2 text-zinc-300" />
                    <SelectValue placeholder="Language" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-none shadow-xl">
                    {['English', 'Hindi', 'Kannada', 'Tamil', 'Telugu', 'Malayalam'].map(lang => (
                      <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={formData.worker_type} onValueChange={(v) => setFormData({ ...formData, worker_type: v })}>
                  <SelectTrigger className="h-14 rounded-2xl border-zinc-100 bg-white font-bold text-[#1B4332]">
                    <Wrench className="size-4 mr-2 text-zinc-300" />
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-none shadow-xl">
                    {['Skilled', 'Semi-skilled', 'Daily wage', 'Domestic', 'Driver', 'Other'].map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Section: Tech Level */}
          <Card className="rounded-[32px] border-none bg-white p-8 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-black text-[#1B4332] flex items-center gap-2">
                  <Smartphone className="size-4 text-[#40C057]" />
                  Has Smartphone?
                </p>
                <p className="text-[10px] text-zinc-400 font-medium">Turn off for voice-call bidding</p>
              </div>
              <Switch 
                checked={formData.has_smartphone} 
                onCheckedChange={(c) => setFormData({ ...formData, has_smartphone: c })}
              />
            </div>
            {!formData.has_smartphone && (
              <div className="mt-6 p-4 bg-amber-50 rounded-2xl flex gap-3 border border-amber-100 animate-in slide-in-from-top-2">
                <Info className="size-4 text-amber-500 shrink-0" />
                <p className="text-[10px] text-amber-700 leading-relaxed font-medium">
                  This worker will receive job alerts via automated voice calls and can bid via missed calls.
                </p>
              </div>
            )}
          </Card>

          {/* Section: KYC Verification */}
          <div className="space-y-6">
            <h3 className={cn("[font-family:var(--font-heading)] text-sm font-black uppercase tracking-widest text-zinc-300")}>3. KYC Verification</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase text-zinc-400 ml-2">Aadhar Front</p>
                <ImageUpload 
                  bucket="rozgar-uploads" 
                  path={`aadhar/${formData.phone}_front`} 
                  onUpload={(url) => setFormData({ ...formData, aadhar_front_url: url })}
                />
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase text-zinc-400 ml-2">Aadhar Back</p>
                <ImageUpload 
                  bucket="rozgar-uploads" 
                  path={`aadhar/${formData.phone}_back`} 
                  onUpload={(url) => setFormData({ ...formData, aadhar_back_url: url })}
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4 space-y-4">
            <Button 
              type="submit"
              disabled={loading || parsing}
              className="w-full h-20 rounded-[32px] bg-[#1B4332] text-xl font-black text-white shadow-2xl shadow-[#1B4332]/20 active:scale-95 transition-all"
            >
              {loading ? <Loader2 className="animate-spin" /> : 'Confirm & Onboard Pro'}
            </Button>
            <div className="flex items-center justify-center gap-2 opacity-30">
              <ShieldCheck className="size-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Aadhaar-Backed Trust</span>
            </div>
          </div>

        </form>
      </main>
    </div>
  );
}
