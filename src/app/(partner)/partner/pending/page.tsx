'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Clock,
  CheckCircle2,
  ShieldCheck,
  Video,
  FileText,
  PhoneCall,
  ChevronRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';


const STEPS = [
  { label: 'Application submitted', done: true },
  { label: 'Document review', done: false, active: true },
  { label: 'Video KYC call', done: false },
  { label: 'Account activated', done: false },
];

export default function PartnerPendingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [nodeName, setNodeName] = useState('Your Agency');

  useEffect(() => {
    async function checkStatus() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      // Pull is_active from users table
      const { data: profile } = await supabase
        .from('users')
        .select('is_active, name')
        .eq('id', session.user.id)
        .single();

      if (!profile) {
        router.push('/login');
        return;
      }

      // If Rozgar has approved this partner, redirect to dashboard
      if (profile.is_active) {
        router.replace('/partner/dashboard');
        return;
      }

      // Fetch node name
      const { data: node } = await supabase
        .from('partner_nodes')
        .select('name')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (node?.name) setNodeName(node.name);
      setChecking(false);
    }

    checkStatus();
  }, [router]);

  const handleRefresh = async () => {
    setChecking(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: profile } = await supabase
      .from('users')
      .select('is_active')
      .eq('id', session.user.id)
      .single();

    if (profile?.is_active) {
      toast.success('Your account is approved! Redirecting...');
      router.replace('/partner/dashboard');
    } else {
      toast.info("Still under review. We'll notify you via SMS.");
      setChecking(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F9F0]">
        <Loader2 className="size-8 animate-spin text-[#1B4332]" />
      </div>
    );
  }

  return (
    <div className={cn('flex min-h-screen w-full flex-col items-center bg-[#F8F9F0] px-6 py-16')}>
      <div className="w-full max-w-[460px] space-y-8">

        {/* Status Badge */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 border-2 border-amber-100 px-5 py-2.5">
            <div className="size-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-widest text-amber-600">
              Under Review
            </span>
          </div>
        </div>

        {/* Hero */}
        <div className="text-center space-y-3">
          <div className="flex justify-center mb-6">
            <div className="size-24 rounded-[32px] bg-[#1B4332] flex items-center justify-center shadow-2xl shadow-[#1B4332]/20">
              <ShieldCheck className="size-12 text-[#40C057]" />
            </div>
          </div>
          <h1 className={cn('[font-family:var(--font-heading)] text-3xl text-[#1B4332] leading-tight')}>
            Application<br />Received!
          </h1>
          <p className={cn('text-zinc-500 font-medium max-w-sm mx-auto leading-relaxed')}>
            Thanks for applying,{' '}
            <span className="font-black text-[#1B4332]">{nodeName}</span>. Our team is
            reviewing your documents and will contact you within <strong>2–3 business days</strong>.
          </p>
        </div>

        {/* Progress Steps */}
        <Card className="rounded-[32px] border-none bg-white shadow-xl shadow-[#1B4332]/5">
          <CardContent className="p-6 space-y-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-5">
              Verification Progress
            </p>
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-start gap-4">
                {/* Icon + line */}
                <div className="flex flex-col items-center">
                  <div className={cn(
                    'size-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-all',
                    s.done
                      ? 'bg-[#40C057] border-[#40C057]'
                      : s.active
                        ? 'bg-white border-[#1B4332] shadow-md'
                        : 'bg-white border-zinc-100'
                  )}>
                    {s.done ? (
                      <CheckCircle2 className="size-4 text-white" />
                    ) : s.active ? (
                      <Clock className="size-4 text-[#1B4332] animate-pulse" />
                    ) : (
                      <div className="size-2 rounded-full bg-zinc-200" />
                    )}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={cn('w-0.5 h-8 my-1', s.done ? 'bg-[#40C057]' : 'bg-zinc-100')} />
                  )}
                </div>
                {/* Label */}
                <div className="pt-1 pb-8">
                  <p className={cn(
                    'text-sm font-bold',
                    s.done ? 'text-[#40C057]' : s.active ? 'text-[#1B4332]' : 'text-zinc-300'
                  )}>
                    {s.label}
                  </p>
                  {s.active && (
                    <p className="text-xs text-zinc-400 mt-0.5 font-medium">In progress — typically 2–3 days</p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Video KYC Section */}
        <Card className="rounded-[32px] border-2 border-dashed border-zinc-200 bg-white">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-2xl bg-violet-50 flex items-center justify-center">
                <Video className="size-5 text-violet-500" />
              </div>
              <div>
                <p className="text-sm font-black text-[#1B4332]">Video KYC</p>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Final verification step</p>
              </div>
            </div>
            <p className="text-sm text-zinc-500 leading-relaxed">
              After document review, a Rozgar team member will schedule a short video call to verify
              your identity and business premises. This usually takes under 10 minutes.
            </p>
            <Button
              disabled
              className="w-full h-12 rounded-2xl bg-violet-50 text-violet-400 font-black cursor-not-allowed"
            >
              <Video className="mr-2 size-4" />
              Schedule Video KYC
              <span className="ml-2 text-[9px] bg-violet-100 px-2 py-0.5 rounded-full">
                Available after doc review
              </span>
            </Button>
          </CardContent>
        </Card>

        {/* What to Expect */}
        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
            What happens next
          </p>
          {[
            {
              icon: <FileText className="size-4 text-emerald-500" />,
              color: 'bg-emerald-50',
              title: 'Document Review',
              text: 'We verify your GST, Aadhar and business registration details.',
            },
            {
              icon: <PhoneCall className="size-4 text-blue-500" />,
              color: 'bg-blue-50',
              title: 'Team Contact',
              text: "Our onboarding team calls you on the number you provided.",
            },
            {
              icon: <Video className="size-4 text-violet-500" />,
              color: 'bg-violet-50',
              title: 'Video KYC',
              text: 'Short video verification of you and your shop premises.',
            },
            {
              icon: <ShieldCheck className="size-4 text-amber-500" />,
              color: 'bg-amber-50',
              title: 'Activation',
              text: "Your partner node goes live. Start onboarding workers and earning!",
            },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-4 bg-white rounded-2xl p-4 shadow-sm border border-zinc-50">
              <div className={cn('size-8 rounded-xl flex items-center justify-center shrink-0', item.color)}>
                {item.icon}
              </div>
              <div>
                <p className="text-sm font-black text-[#1B4332]">{item.title}</p>
                <p className="text-xs text-zinc-400 font-medium mt-0.5">{item.text}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="space-y-3 pb-8">
          <Button
            onClick={handleRefresh}
            className="w-full h-14 rounded-2xl bg-[#1B4332] text-white font-black shadow-xl shadow-[#1B4332]/20"
          >
            <CheckCircle2 className="mr-2 size-4" />
            Check Approval Status
          </Button>
          <Button
            variant="ghost"
            onClick={async () => {
              await supabase.auth.signOut();
              router.push('/login');
            }}
            className="w-full h-12 rounded-2xl text-zinc-400 font-bold hover:text-zinc-600"
          >
            Sign Out
          </Button>
          <p className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300">
            Questions? Contact support@rozgar.in
          </p>
        </div>
      </div>
    </div>
  );
}
