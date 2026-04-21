'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sora, DM_Sans } from 'next/font/google';
import { 
  Check, 
  ChevronRight, 
  Loader2, 
  Upload, 
  MapPin, 
  Calendar, 
  IndianRupee, 
  Sparkles,
  ArrowLeft,
  Shield,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import ImageUpload from '@/components/ImageUpload';

const sora = Sora({ subsets: ['latin'], weight: ['700', '800'] });
const dmSans = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '700'] });

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function WorkerRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    raw_description: '',
    primary_skill: '',
    skill_tags: [] as string[],
    searchable_as: [] as string[],
    worker_type: '',
    pincode: '',
    include_adjacent: true,
    availability_days: [] as string[],
    rate_type: 'per_job',
    daily_rate: '',
    photo_url: ''
  });

  const [aiState, setAiState] = useState<'idle' | 'parsing' | 'review'>('idle');

  useEffect(() => {
    async function getSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
      } else {
        toast.error('Session expired. Please login again.');
        router.push('/login');
      }
    }
    getSession();
  }, [router]);

  // Step 1 Logic: AI Parsing
  const handleAiParse = async () => {
    if (!formData.raw_description.trim()) {
      toast.error('Please describe your work first');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/ai/parse-skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_description: formData.raw_description })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'AI parsing failed');
      }

      const data = await res.json();
      setFormData(prev => ({
        ...prev,
        primary_skill: data.primary_skill,
        skill_tags: data.skill_tags,
        searchable_as: data.searchable_as,
        worker_type: data.worker_type
      }));
      setAiState('review');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 4 Logic: Final Registration
  const handleFinalSubmit = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/workers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          raw_description: formData.raw_description,
          skill_tags: formData.skill_tags,
          searchable_as: formData.searchable_as,
          worker_type: formData.worker_type,
          pincode: formData.pincode,
          include_adjacent: formData.include_adjacent,
          rate_preference: formData.rate_type === 'daily' ? `₹${formData.daily_rate}/day` : 'Per job',
          availability_days: formData.availability_days,
          photo_url: formData.photo_url
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Registration failed');
      }

      toast.success('You are now live on Rozgar!');
      router.push('/worker/dashboard');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (day: string) => {
    setFormData(prev => ({
      ...prev,
      availability_days: prev.availability_days.includes(day)
        ? prev.availability_days.filter(d => d !== day)
        : [...prev.availability_days, day]
    }));
  };

  return (
    <div className={`flex min-h-screen w-full flex-col items-center bg-[#F8F9F0] ${dmSans.className}`}>
      <div className="flex w-full max-w-[430px] flex-col px-6 py-8">
        
        {/* Progress Header */}
        <div className="mb-10 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => step > 1 && setStep(step - 1)}
              className="flex items-center text-zinc-400 hover:text-zinc-600"
            >
              <ArrowLeft className="mr-1 size-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Back</span>
            </button>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1B4332]/40">Step {step} of 4</span>
          </div>
          <Progress value={step * 25} className="h-2 bg-[#1B4332]/10" indicatorClassName="bg-[#40C057]" />
        </div>

        {/* Step 1: Skills */}
        {step === 1 && (
          <div className="space-y-6">
            <h1 className={`${sora.className} text-3xl text-[#1B4332]`}>What work <br />do you do?</h1>
            
            {aiState === 'review' ? (
              <div className="space-y-6">
                <Card className="border-2 border-[#40C057]/20 bg-white shadow-sm">
                  <CardContent className="p-6">
                    <div className="mb-4 flex items-center gap-2 text-[#40C057]">
                      <Sparkles className="size-5" />
                      <span className="text-sm font-bold uppercase tracking-wider">AI Analysis Complete</span>
                    </div>
                    <p className="text-sm text-zinc-500">We think you do:</p>
                    <h2 className="mt-1 text-2xl font-black text-[#1B4332]">{formData.primary_skill}</h2>
                    
                    <div className="mt-4 flex flex-wrap gap-2">
                      {formData.skill_tags.map(tag => (
                        <Badge key={tag} className="bg-[#F8F9F0] text-[#1B4332] hover:bg-[#F8F9F0] border-zinc-100">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    className="flex-1 rounded-2xl border-2 border-zinc-200 h-14 font-bold"
                    onClick={() => setAiState('idle')}
                  >
                    Edit
                  </Button>
                  <Button 
                    className="flex-[2] rounded-2xl bg-[#40C057] h-14 font-bold text-white"
                    onClick={() => setStep(2)}
                  >
                    This is correct
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-zinc-400">Describe your skills</Label>
                  <Textarea 
                    value={formData.raw_description}
                    onChange={(e) => setFormData({...formData, raw_description: e.target.value})}
                    placeholder="Example: I do electrical work, fan repair, switch replacement, ceiling fan installation"
                    className="min-h-[180px] rounded-2xl border-2 border-zinc-100 bg-white p-5 text-lg placeholder:text-zinc-300 focus-visible:border-[#40C057]"
                  />
                </div>
                <Button 
                  disabled={loading}
                  onClick={handleAiParse}
                  className="h-16 w-full rounded-2xl bg-[#1B4332] text-lg font-bold text-white shadow-xl shadow-[#1B4332]/20"
                >
                  {loading ? <Loader2 className="mr-2 animate-spin" /> : <Sparkles className="mr-2 size-5" />}
                  Analyse My Skills
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Area & Availability */}
        {step === 2 && (
          <div className="space-y-8">
            <h1 className={`${sora.className} text-3xl text-[#1B4332]`}>Your work <br />area</h1>
            
            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                  <MapPin className="size-3" /> Home Pincode
                </Label>
                <Input 
                  type="number"
                  maxLength={6}
                  value={formData.pincode}
                  onChange={(e) => setFormData({...formData, pincode: e.target.value.slice(0,6)})}
                  placeholder="560XXX"
                  className="h-14 rounded-2xl border-2 border-zinc-100 bg-white px-5 text-xl font-bold focus-visible:border-[#40C057]"
                />
              </div>

              <button 
                onClick={() => setFormData({...formData, include_adjacent: !formData.include_adjacent})}
                className="flex w-full items-center justify-between rounded-2xl border-2 border-zinc-100 bg-white p-5 transition-all active:scale-[0.98]"
              >
                <div className="flex flex-col items-start">
                  <span className="font-bold text-[#1B4332]">Work in nearby areas?</span>
                  <span className="text-xs text-zinc-400">Increase job alerts by 3x</span>
                </div>
                <div className={`size-6 rounded-full border-2 flex items-center justify-center transition-colors ${formData.include_adjacent ? 'bg-[#40C057] border-[#40C057]' : 'border-zinc-200'}`}>
                  {formData.include_adjacent && <Check className="size-4 text-white" />}
                </div>
              </button>

              <div className="space-y-4">
                <Label className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                  <Calendar className="size-3" /> Available Days
                </Label>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map(day => {
                    const isSelected = formData.availability_days.includes(day);
                    return (
                      <button
                        key={day}
                        onClick={() => toggleDay(day)}
                        className={`h-12 flex-1 min-w-[70px] rounded-xl border-2 font-bold transition-all ${
                          isSelected ? 'bg-[#1B4332] border-[#1B4332] text-white' : 'bg-white border-zinc-100 text-zinc-400'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                  <IndianRupee className="size-3" /> Rate Preference
                </Label>
                <RadioGroup 
                  value={formData.rate_type}
                  onValueChange={(val) => setFormData({...formData, rate_type: val})}
                  className="grid grid-cols-1 gap-3"
                >
                  <div className={`flex items-center space-x-3 rounded-2xl border-2 p-5 transition-all ${formData.rate_type === 'per_job' ? 'border-[#40C057] bg-[#40C057]/5' : 'border-zinc-100 bg-white'}`}>
                    <RadioGroupItem value="per_job" id="per_job" className="border-[#1B4332]" />
                    <Label htmlFor="per_job" className="font-bold text-[#1B4332]">Per job (negotiate each time)</Label>
                  </div>
                  <div className={`flex flex-col space-y-3 rounded-2xl border-2 p-5 transition-all ${formData.rate_type === 'daily' ? 'border-[#40C057] bg-[#40C057]/5' : 'border-zinc-100 bg-white'}`}>
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="daily" id="daily" className="border-[#1B4332]" />
                      <Label htmlFor="daily" className="font-bold text-[#1B4332]">Daily rate</Label>
                    </div>
                    {formData.rate_type === 'daily' && (
                      <div className="relative pl-7">
                        <IndianRupee className="absolute left-9 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
                        <Input 
                          type="number"
                          value={formData.daily_rate}
                          onChange={(e) => setFormData({...formData, daily_rate: e.target.value})}
                          placeholder="Ex: 500"
                          className="h-12 rounded-xl border-zinc-200 pl-10 font-bold"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">/ day</span>
                      </div>
                    )}
                  </div>
                </RadioGroup>
              </div>
            </div>

            <Button 
              className="h-16 w-full rounded-2xl bg-[#1B4332] text-lg font-bold text-white"
              onClick={() => setStep(3)}
            >
              Continue
              <ChevronRight className="ml-2 size-5" />
            </Button>
          </div>
        )}

        {/* Step 3: Photo */}
        {step === 3 && (
          <div className="space-y-8">
            <h1 className={`${sora.className} text-3xl text-[#1B4332]`}>Profile photo <br />(optional)</h1>
            <p className="text-zinc-500">Profiles with photos get 2x more job offers from customers.</p>
            
            <div className="flex justify-center py-8">
              {userId && (
                <ImageUpload 
                  bucket="rozgar-uploads"
                  path={`worker-photos/${userId}`}
                  onUploadComplete={(url) => setFormData({...formData, photo_url: url})}
                />
              )}
            </div>

            <div className="space-y-4">
              <Button 
                disabled={!formData.photo_url}
                className="h-16 w-full rounded-2xl bg-[#1B4332] text-lg font-bold text-white disabled:opacity-50"
                onClick={() => setStep(4)}
              >
                Continue
              </Button>
              <Button 
                variant="ghost"
                className="w-full text-zinc-400 font-bold"
                onClick={() => setStep(4)}
              >
                Skip for now
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Summary & Go Live */}
        {step === 4 && (
          <div className="space-y-8">
            <h1 className={`${sora.className} text-3xl text-[#1B4332]`}>You're <br />almost live!</h1>
            
            <Card className="rounded-3xl border-none bg-white shadow-xl shadow-[#1B4332]/5 overflow-hidden">
              <CardContent className="p-0">
                <div className="bg-[#1B4332] p-6 text-white">
                  <div className="flex items-center gap-4">
                    <div className="size-16 rounded-2xl bg-white/10 flex items-center justify-center overflow-hidden">
                      {formData.photo_url ? (
                        <img src={formData.photo_url} alt="Profile" className="size-full object-cover" />
                      ) : (
                        <span className="text-2xl font-black">{formData.primary_skill.charAt(0)}</span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">{formData.primary_skill}</h3>
                      <div className="flex items-center gap-1 text-[#40C057] text-xs font-bold uppercase">
                        <Shield className="size-3" />
                        Aadhar Verified Soon
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-black text-zinc-400">Area</span>
                      <p className="font-bold text-[#1B4332] flex items-center gap-1">
                        <MapPin className="size-3" /> {formData.pincode}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-black text-zinc-400">Rate</span>
                      <p className="font-bold text-[#1B4332]">
                        {formData.rate_type === 'daily' ? `₹${formData.daily_rate}/day` : 'Per job'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-black text-zinc-400">Availability</span>
                    <div className="flex flex-wrap gap-1">
                      {formData.availability_days.map(d => (
                        <span key={d} className="text-xs font-bold text-[#1B4332] bg-zinc-50 px-2 py-1 rounded-md">{d}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="rounded-2xl bg-[#40C057]/10 p-5 flex items-start gap-4">
              <div className="size-8 rounded-full bg-[#40C057] flex items-center justify-center text-white shrink-0">
                <Check className="size-5" />
              </div>
              <p className="text-sm text-[#1B4332] font-medium leading-relaxed">
                By clicking "Go Live", you agree to follow Rozgar's safety and pricing standards.
              </p>
            </div>

            <Button 
              disabled={loading}
              onClick={handleFinalSubmit}
              className="h-20 w-full rounded-2xl bg-[#1B4332] text-xl font-black text-white shadow-2xl shadow-[#1B4332]/30"
            >
              {loading ? <Loader2 className="mr-2 animate-spin" /> : 'Go Live Now'}
            </Button>
          </div>
        )}

      </div>
    </div>
  );
}
