'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Home, 
  Wrench, 
  Store, 
  Loader2,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function handleSelection(role: 'customer' | 'worker' | 'partner_node') {
    setLoading(role);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.phone) {
        throw new Error('No valid session found. Please login again.');
      }

      const phone = session.user.phone.replace(/^\+91/, '');

      const { error } = await supabase.from('users').insert({
        role,
        phone: phone,
        name: '', // User will set this later in profile
        language_pref: 'english',
        is_active: true
      });

      if (error) throw error;

      toast.success('Welcome to Rozgar!');
      
      // Redirection logic
      if (role === 'customer') router.push('/customer/dashboard');
      else if (role === 'worker') router.push('/worker/register');
      else if (role === 'partner_node') router.push('/partner/dashboard');
      
      router.refresh();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to create profile');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex min-h-screen w-full flex-col items-center bg-[#fdfdfb] dark:bg-black">
      <div className="flex w-full max-w-[430px] flex-col px-6 pt-16">
        
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-black leading-tight text-[#022c22] dark:text-white">
            How will you <br /> use Rozgar?
          </h1>
          <p className="mt-3 text-lg font-medium text-zinc-500">
            Select an option to continue
          </p>
        </div>

        {/* Options Feed */}
        <div className="space-y-4">
          <OnboardingCard 
            title="I need work done"
            subtext="Post jobs and hire workers"
            icon={<Home className="size-8" />}
            onClick={() => handleSelection('customer')}
            isLoading={loading === 'customer'}
          />

          <OnboardingCard 
            title="I want to find work"
            subtext="Receive job alerts and earn"
            icon={<Wrench className="size-8" />}
            onClick={() => handleSelection('worker')}
            isLoading={loading === 'worker'}
          />

          <OnboardingCard 
            title="I run a local shop"
            subtext="Onboard workers and earn income"
            icon={<Store className="size-8" />}
            onClick={() => handleSelection('partner_node')}
            isLoading={loading === 'partner_node'}
          />
        </div>

        <p className="mt-20 text-center text-[10px] uppercase tracking-widest text-zinc-400">
          You can change your role later in settings
        </p>
      </div>
    </div>
  );
}

interface OnboardingCardProps {
  title: string;
  subtext: string;
  icon: React.ReactNode;
  onClick: () => void;
  isLoading: boolean;
}

function OnboardingCard({ title, subtext, icon, onClick, isLoading }: OnboardingCardProps) {
  return (
    <button 
      onClick={onClick}
      disabled={isLoading}
      className="group relative w-full text-left outline-none transition-all active:scale-[0.98]"
    >
      <Card className="overflow-hidden border-2 border-zinc-100 bg-white shadow-sm transition-all group-hover:border-[#22c55e] group-hover:shadow-md dark:bg-zinc-900 dark:border-zinc-800">
        <CardContent className="flex items-center p-6">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-zinc-50 text-[#022c22] transition-colors group-hover:bg-[#22c55e]/10 group-hover:text-[#22c55e] dark:bg-zinc-800 dark:text-white">
            {isLoading ? <Loader2 className="size-8 animate-spin" /> : icon}
          </div>
          
          <div className="ml-5 flex-1">
            <h3 className="text-lg font-bold text-[#022c22] dark:text-white">{title}</h3>
            <p className="text-sm text-zinc-500">{subtext}</p>
          </div>

          <ChevronRight className="size-5 text-zinc-300 transition-colors group-hover:text-[#22c55e]" />
        </CardContent>
      </Card>
    </button>
  );
}
