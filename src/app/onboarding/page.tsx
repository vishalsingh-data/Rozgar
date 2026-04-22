'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Home, 
  Wrench, 
  Store, 
  Loader2,
  ChevronRight,
  ArrowLeft,
  User,
  MapPin,
  Briefcase,
  Languages
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Step = 'SELECT' | 'DETAILS';
type Role = 'customer' | 'worker' | 'partner_node';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('SELECT');
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    pincode: '',
    language: 'english',
    workerType: 'skilled',
    bio: '',
    nodeName: ''
  });

  useEffect(() => {
    async function checkUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUserId(session.user.id);
    }
    checkUser();
  }, [router]);

  const handleRoleSelect = (selected: Role) => {
    setRole(selected);
    setStep('DETAILS');
  };

  const handleBack = () => {
    setStep('SELECT');
    setRole(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !role) return;

    if (!formData.name) {
      toast.error('Please enter your name');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          role,
          name: formData.name,
          language: formData.language,
          pincode: formData.pincode,
          workerType: formData.workerType,
          bio: formData.bio,
          nodeName: formData.nodeName
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save profile');

      toast.success('Profile created successfully!');
      
      // Redirect to Dashboard
      if (role === 'customer') router.push('/customer/dashboard');
      else if (role === 'worker') router.push('/worker/dashboard');
      else if (role === 'partner_node') router.push('/partner/dashboard');
      
      router.refresh();
    } catch (err: any) {
      console.error('Onboarding Finalize Error Details:', {
        message: err.message,
        details: err.details,
        hint: err.hint,
        code: err.code,
        full: err
      });
      toast.error(err.message || 'Failed to complete onboarding. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center bg-[#F8F9F0] dark:bg-black font-sans">
      <div className="flex w-full max-w-[480px] flex-col px-6 py-12 md:py-20">
        
        {/* Header Section */}
        <div className="mb-12 space-y-4">
          {step === 'DETAILS' && (
            <button 
              onClick={handleBack}
              className="flex items-center text-sm font-bold text-zinc-400 hover:text-[#1B4332] transition-colors group"
            >
              <ArrowLeft className="mr-2 size-4 group-hover:-translate-x-1 transition-transform" />
              BACK
            </button>
          )}
          <h1 className="text-4xl font-black leading-tight text-[#1B4332] dark:text-white">
            {step === 'SELECT' ? (
              <>Tell us, <br /> who are you?</>
            ) : (
              <>Complete your <br /> profile</>
            )}
          </h1>
          <p className="text-lg font-medium text-zinc-500">
            {step === 'SELECT' 
              ? 'Choose your role to get started with Rozgar'
              : `Set up your ${role?.replace('_', ' ')} account details`}
          </p>
        </div>

        {/* Step 1: Role Selection */}
        {step === 'SELECT' ? (
          <div className="grid gap-4">
            <RoleCard 
              title="I need work done"
              subtext="Hire verified pros for repairs and tasks"
              icon={<Home className="size-8" />}
              onClick={() => handleRoleSelect('customer')}
              color="bg-emerald-50 text-emerald-600 border-emerald-100"
            />
            <RoleCard 
              title="I want to find work"
              subtext="Get job alerts and earn with your skills"
              icon={<Wrench className="size-8" />}
              onClick={() => handleRoleSelect('worker')}
              color="bg-blue-50 text-blue-600 border-blue-100"
            />
            <RoleCard 
              title="I run a local agency"
              subtext="Onboard workers and manage fleet operations"
              icon={<Store className="size-8" />}
              onClick={() => handleRoleSelect('partner_node')}
              color="bg-amber-50 text-amber-600 border-amber-100"
            />
          </div>
        ) : (
          /* Step 2: Detail Capture */
          <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Common Fields */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-zinc-300" />
                  <Input 
                    id="name"
                    placeholder="e.g. Rahul Sharma"
                    className="h-14 pl-12 rounded-2xl border-2 border-zinc-100 bg-white focus:border-[#40C057] transition-all font-bold"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="language" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Language Preference</Label>
                <div className="relative">
                  <Languages className="absolute left-4 top-1/2 -translate-y-1/2 z-10 size-5 text-zinc-300" />
                  <Select 
                    value={formData.language} 
                    onValueChange={(val) => setFormData({...formData, language: val})}
                  >
                    <SelectTrigger className="h-14 pl-12 rounded-2xl border-2 border-zinc-100 bg-white font-bold">
                      <SelectValue placeholder="Select Language" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-zinc-100">
                      <SelectItem value="english">English</SelectItem>
                      <SelectItem value="hindi">Hindi</SelectItem>
                      <SelectItem value="kannada">Kannada</SelectItem>
                      <SelectItem value="tamil">Tamil</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Role Specific Fields */}
            {role === 'customer' && (
              <div className="space-y-2">
                <Label htmlFor="pincode" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Primary Pincode</Label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-zinc-300" />
                  <Input 
                    id="pincode"
                    placeholder="e.g. 560001"
                    maxLength={6}
                    className="h-14 pl-12 rounded-2xl border-2 border-zinc-100 bg-white focus:border-[#40C057] font-bold"
                    value={formData.pincode}
                    onChange={(e) => setFormData({...formData, pincode: e.target.value.replace(/\D/g, '')})}
                  />
                </div>
              </div>
            )}

            {role === 'worker' && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="workerType" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Primary Trade</Label>
                  <div className="relative">
                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 z-10 size-5 text-zinc-300" />
                    <Select 
                      value={formData.workerType} 
                      onValueChange={(val) => setFormData({...formData, workerType: val})}
                    >
                      <SelectTrigger className="h-14 pl-12 rounded-2xl border-2 border-zinc-100 bg-white font-bold">
                        <SelectValue placeholder="Select Trade" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-zinc-100">
                        <SelectItem value="skilled">Skilled (Electrician/Plumber)</SelectItem>
                        <SelectItem value="domestic">Domestic (Cleaning/Cook)</SelectItem>
                        <SelectItem value="daily_wage">Daily Wage Labor</SelectItem>
                        <SelectItem value="driver">Professional Driver</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Short Bio</Label>
                  <Textarea 
                    id="bio"
                    placeholder="Tell customers about your experience..."
                    className="min-h-[120px] rounded-2xl border-2 border-zinc-100 bg-white focus:border-[#40C057] p-4 font-medium"
                    value={formData.bio}
                    onChange={(e) => setFormData({...formData, bio: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pincode" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Work Location (Pincode)</Label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-zinc-300" />
                    <Input 
                      id="pincode"
                      placeholder="e.g. 560001"
                      maxLength={6}
                      className="h-14 pl-12 rounded-2xl border-2 border-zinc-100 bg-white focus:border-[#40C057] font-bold"
                      value={formData.pincode}
                      onChange={(e) => setFormData({...formData, pincode: e.target.value.replace(/\D/g, '')})}
                    />
                  </div>
                </div>
              </div>
            )}

            {role === 'partner_node' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nodeName" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Agency/Shop Name</Label>
                  <div className="relative">
                    <Store className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-zinc-300" />
                    <Input 
                      id="nodeName"
                      placeholder="e.g. Shiv Agencies"
                      className="h-14 pl-12 rounded-2xl border-2 border-zinc-100 bg-white focus:border-[#40C057] font-bold"
                      value={formData.nodeName}
                      onChange={(e) => setFormData({...formData, nodeName: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pincode" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Management Area (Pincode)</Label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-zinc-300" />
                    <Input 
                      id="pincode"
                      placeholder="e.g. 560001"
                      maxLength={6}
                      className="h-14 pl-12 rounded-2xl border-2 border-zinc-100 bg-white focus:border-[#40C057] font-bold"
                      value={formData.pincode}
                      onChange={(e) => setFormData({...formData, pincode: e.target.value.replace(/\D/g, '')})}
                    />
                  </div>
                </div>
              </div>
            )}

            <Button 
              type="submit"
              disabled={loading}
              className="h-16 w-full rounded-2xl bg-[#1B4332] text-lg font-black text-white shadow-xl shadow-[#1B4332]/20 hover:bg-[#022c22] active:scale-95 transition-all"
            >
              {loading ? <Loader2 className="animate-spin" /> : 'Complete Setup'}
              {!loading && <ChevronRight className="ml-2 size-5" />}
            </Button>
          </form>
        )}

        <p className="mt-16 text-center text-[10px] uppercase font-black tracking-[0.2em] text-zinc-300">
          Secure Identity by Rozgar HQ
        </p>
      </div>
    </div>
  );
}

function RoleCard({ title, subtext, icon, onClick, color }: { 
  title: string, 
  subtext: string, 
  icon: React.ReactNode, 
  onClick: () => void,
  color: string 
}) {
  return (
    <button 
      onClick={onClick}
      className="w-full text-left outline-none group active:scale-[0.98] transition-all"
    >
      <Card className={cn("overflow-hidden border-2 border-zinc-100 bg-white shadow-sm transition-all group-hover:border-[#1B4332]/20 group-hover:shadow-lg dark:bg-zinc-900")}>
        <CardContent className="flex items-center p-6">
          <div className={cn("flex size-16 items-center justify-center rounded-2xl transition-colors", color)}>
            {icon}
          </div>
          <div className="ml-5 flex-1">
            <h3 className="text-lg font-black text-[#1B4332] dark:text-white leading-tight">{title}</h3>
            <p className="text-xs font-medium text-zinc-500 mt-1">{subtext}</p>
          </div>
          <ChevronRight className="size-5 text-zinc-200 group-hover:text-[#1B4332] group-hover:translate-x-1 transition-all" />
        </CardContent>
      </Card>
    </button>
  );
}
