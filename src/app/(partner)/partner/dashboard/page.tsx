'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  IndianRupee, 
  AlertCircle, 
  Activity, 
  ChevronRight, 
  Plus, 
  Wallet, 
  TrendingUp,
  Briefcase,
  Loader2,
  CheckCircle2,
  UserPlus,
  ShieldAlert,
  ArrowUpRight,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { format, startOfWeek, startOfMonth } from 'date-fns';


export default function PartnerDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [partnerNode, setPartnerNode] = useState<any>(null);
  const [earnings, setEarnings] = useState({ week: 0, month: 0, pending: 0 });
  const [workers, setWorkers] = useState<any[]>([]);
  const [activeJobs, setActiveJobs] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);

  const fetchPartnerData = useCallback(async (userId: string) => {
    try {
      // 1. Fetch Partner Node
      const { data: nodeData } = await supabase
        .from('partner_nodes')
        .select('*')
        .eq('owner_id', userId)
        .single();
      
      if (!nodeData) {
        toast.error('Partner node not found');
        return;
      }
      setPartnerNode(nodeData);

      // 2. Fetch Earnings from Ledger
      const { data: ledgerData } = await supabase
        .from('partner_ledger')
        .select('*')
        .eq('partner_node_id', nodeData.id);

      if (ledgerData) {
        const now = new Date();
        const weekStart = startOfWeek(now);
        const monthStart = startOfMonth(now);

        const weekSum = ledgerData
          .filter(item => new Date(item.created_at) >= weekStart)
          .reduce((acc, curr) => acc + curr.amount, 0);
        
        const monthSum = ledgerData
          .filter(item => new Date(item.created_at) >= monthStart)
          .reduce((acc, curr) => acc + curr.amount, 0);

        const pendingSum = ledgerData
          .filter(item => item.status === 'pending')
          .reduce((acc, curr) => acc + curr.amount, 0);

        setEarnings({ week: weekSum, month: monthSum, pending: pendingSum });
      }

      // 3. Fetch My Workers
      const { data: workersData } = await supabase
        .from('workers')
        .select('*, user:users!workers_user_id_fkey(name, is_active)')
        .eq('partner_node_id', nodeData.id);
      
      setWorkers(workersData || []);
      const workerIds = (workersData || []).map(w => w.user_id);

      // 4. Fetch Active Jobs for these workers
      if (workerIds.length > 0) {
        const { data: jobsData } = await supabase
          .from('jobs')
          .select('*')
          .in('accepted_worker_id', workerIds)
          .in('status', ['assigned', 'in_transit', 'on_site']);
        setActiveJobs(jobsData || []);

        // 5. Fetch Disputes
        const { data: disputesData } = await supabase
          .from('jobs')
          .select('*')
          .in('accepted_worker_id', workerIds)
          .eq('status', 'disputed');
        setDisputes(disputesData || []);
      }

    } catch (err: any) {
      console.error('Partner Dashboard Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      // Guard: if partner is not yet approved by Rozgar, show pending page
      const { data: profile } = await supabase
        .from('users')
        .select('is_active')
        .eq('id', session.user.id)
        .single();

      if (profile && !profile.is_active) {
        router.replace('/partner/pending');
        return;
      }

      fetchPartnerData(session.user.id);
    }
    init();
  }, [router, fetchPartnerData]);

  if (loading) return <DashboardSkeleton />;

  return (
    <div className={cn("flex min-h-screen w-full flex-col bg-[#F8F9F0] pb-32")}>
      
      {/* Header */}
      <header className="px-6 pt-10 pb-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Node Management</p>
            <h1 className={cn("[font-family:var(--font-heading)] text-2xl text-[#1B4332]")}>{partnerNode?.name || 'My Node'}</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              onClick={() => router.push('/profile')}
              variant="ghost"
              className="size-12 rounded-2xl bg-white border-2 border-zinc-100 shadow-sm hover:border-[#1B4332]/20 active:scale-95 transition-all"
              title="Edit Profile"
            >
              <span className={cn("[font-family:var(--font-heading)] text-base font-black text-[#1B4332]")}>
                {(partnerNode?.name || 'P').charAt(0)}
              </span>
            </Button>
            <Button 
              onClick={() => router.push('/partner/register-worker')}
              className="size-12 rounded-2xl bg-[#1B4332] text-white shadow-lg active:scale-95 transition-all"
            >
              <UserPlus className="size-6" />
            </Button>
          </div>
        </div>

        {/* Earnings Overview Card */}
        <Card className="rounded-[40px] border-none bg-[#1B4332] text-white shadow-2xl shadow-[#1B4332]/20 overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
            <Wallet className="size-24 -rotate-12" />
          </div>
          <CardContent className="p-8 space-y-8 relative z-10">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/50">Total Earnings (Pending)</p>
              <h2 className="text-4xl font-black flex items-center">
                <IndianRupee className="size-7" />
                {earnings.pending}
              </h2>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 rounded-2xl p-4 space-y-1">
                <p className="text-[8px] font-black uppercase tracking-widest text-white/40">This Week</p>
                <p className="text-lg font-bold">₹{earnings.week}</p>
              </div>
              <div className="bg-white/10 rounded-2xl p-4 space-y-1">
                <p className="text-[8px] font-black uppercase tracking-widest text-white/40">This Month</p>
                <p className="text-lg font-bold">₹{earnings.month}</p>
              </div>
            </div>

            <Button 
              onClick={() => toast.success('Payout requested — processed every Monday')}
              className="w-full h-14 rounded-2xl bg-[#40C057] text-[#1B4332] font-black shadow-lg shadow-[#40C057]/20"
            >
              Request Payout via UPI
              <ArrowUpRight className="ml-2 size-4" />
            </Button>
          </CardContent>
        </Card>
      </header>

      <main className="px-6 space-y-12">
        
        {/* Disputes Section - High Alert */}
        {disputes.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-red-500">
              <ShieldAlert className="size-5" />
              <h3 className={cn("[font-family:var(--font-heading)] text-sm font-black uppercase tracking-widest")}>Urgent Disputes</h3>
            </div>
            <div className="space-y-3">
              {disputes.map(job => (
                <Card key={job.id} className="rounded-3xl border-2 border-red-50 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-black text-[#1B4332]">{job.interpreted_category}</p>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase">Worker: {workers.find(w => w.user_id === job.accepted_worker_id)?.user?.name}</p>
                    </div>
                    <Button 
                      onClick={() => router.push(`/partner/dispute/${job.id}`)}
                      size="sm" 
                      className="rounded-xl bg-red-50 text-red-500 font-bold hover:bg-red-100"
                    >
                      Handle
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Active Ops Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#1B4332]">
              <Activity className="size-5 text-[#40C057]" />
              <h3 className={cn("[font-family:var(--font-heading)] text-sm font-black uppercase tracking-widest")}>Active Ops</h3>
            </div>
            <Badge variant="secondary" className="bg-[#40C057]/10 text-[#40C057] border-none px-3 font-black">{activeJobs.length} Live</Badge>
          </div>
          
          {activeJobs.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {activeJobs.map(job => (
                <div key={job.id} className="bg-white rounded-3xl p-6 shadow-sm border border-zinc-100/50 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-black text-[#1B4332]">{job.interpreted_category}</p>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-[#1B4332] text-white text-[8px] font-black uppercase px-2 py-0.5">{job.status.replace('_', ' ')}</Badge>
                      <span className="text-[10px] text-zinc-300 font-bold">• {workers.find(w => w.user_id === job.accepted_worker_id)?.user?.name}</span>
                    </div>
                  </div>
                  <ChevronRight className="size-5 text-zinc-200" />
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 bg-white rounded-[32px] border-2 border-dashed border-zinc-100 flex flex-col items-center text-center px-12">
              <Briefcase className="size-8 text-zinc-100 mb-2" />
              <p className="text-xs font-bold text-zinc-300">No jobs currently in progress across your fleet.</p>
            </div>
          )}
        </section>

        {/* My Fleet Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#1B4332]">
              <Users className="size-5 text-[#40C057]" />
              <h3 className={cn("[font-family:var(--font-heading)] text-sm font-black uppercase tracking-widest")}>My Fleet</h3>
            </div>
            <Button variant="ghost" size="sm" className="text-zinc-400 font-bold text-xs uppercase tracking-widest">
              <Filter className="size-3 mr-2" />
              Filter
            </Button>
          </div>

          <div className="space-y-4">
            {workers.map(worker => (
              <Card key={worker.id} className="rounded-[32px] border-none bg-white shadow-sm overflow-hidden group">
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="size-14 rounded-2xl bg-[#F8F9F0] flex items-center justify-center text-zinc-300 relative">
                      {worker.photo_url ? (
                        <img src={worker.photo_url} className="size-full object-cover rounded-2xl" alt="" />
                      ) : (
                        <Users className="size-6" />
                      )}
                      {worker.user?.is_active ? (
                        <div className="absolute -top-1 -right-1 size-4 bg-[#40C057] rounded-full border-2 border-white flex items-center justify-center">
                          <CheckCircle2 className="size-2.5 text-white" />
                        </div>
                      ) : (
                        <div className="absolute -top-1 -right-1 size-4 bg-red-500 rounded-full border-2 border-white" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-black text-[#1B4332]">{worker.user?.name}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[8px] font-black uppercase text-zinc-400 border-zinc-100">
                          {worker.searchable_as}
                        </Badge>
                        <span className="text-[10px] font-bold text-[#40C057]">{worker.completion_rate}% Success</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <p className="text-[10px] font-black text-[#1B4332]">{worker.total_jobs} Jobs</p>
                    {worker.strike_count > 0 && (
                      <Badge className="bg-red-50 text-red-500 border-none text-[8px] font-black px-2">{worker.strike_count} Strikes</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-[#F8F9F0] px-6 py-12 space-y-10">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-40 rounded-2xl" />
        <Skeleton className="size-12 rounded-2xl" />
      </div>
      <Skeleton className="h-64 w-full rounded-[40px]" />
      <div className="space-y-4">
        <Skeleton className="h-6 w-32 rounded-lg" />
        <Skeleton className="h-24 w-full rounded-3xl" />
        <Skeleton className="h-24 w-full rounded-3xl" />
      </div>
    </div>
  );
}
