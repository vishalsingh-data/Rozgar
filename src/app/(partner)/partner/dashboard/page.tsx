'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  IndianRupee, 
  TrendingUp, 
  Plus, 
  ChevronRight,
  Loader2,
  ShieldCheck,
  Search,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export default function PartnerDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [workers, setWorkers] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalWorkers: 0,
    activeJobs: 0,
    pendingLedger: 0
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Fetch Workers registered by this partner
        const { data: workersData, error: workersError } = await supabase
          .from('workers')
          .select('*, user:users(name, phone)')
          .eq('partner_node_id', user.id);

        if (workersError) throw workersError;
        setWorkers(workersData);

        // 2. Fetch Stats (Simplified for demo)
        const { data: ledgerData } = await supabase
          .from('partner_ledger')
          .select('amount')
          .eq('partner_id', user.id)
          .eq('status', 'pending');

        const pendingAmount = ledgerData?.reduce((acc, curr) => acc + curr.amount, 0) || 0;

        setStats({
          totalWorkers: workersData.length,
          activeJobs: 0, // Would query jobs table in real app
          pendingLedger: pendingAmount
        });
      } catch (err) {
        console.error(err);
        toast.error('Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 pb-20 dark:bg-black">
      {/* Header */}
      <header className="border-b bg-white px-6 py-8 dark:bg-zinc-900">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Partner Node</h1>
            <p className="text-sm text-zinc-500 font-medium">Manage your local worker network</p>
          </div>
          <Button className="rounded-full gap-2" onClick={() => router.push('/partner/register-worker')}>
            <Plus className="size-4" />
            Add Worker
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-6 space-y-8">
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <StatCard 
            title="Total Workers" 
            value={stats.totalWorkers} 
            icon={<Users className="size-5" />} 
            color="bg-blue-500" 
          />
          <StatCard 
            title="Active Jobs" 
            value={stats.activeJobs} 
            icon={<TrendingUp className="size-5" />} 
            color="bg-emerald-500" 
          />
          <StatCard 
            title="Pending Commissions" 
            value={`₹${stats.pendingLedger}`} 
            icon={<IndianRupee className="size-5" />} 
            color="bg-amber-500" 
          />
        </div>

        {/* Workers List */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Your Network</h2>
            <div className="flex items-center gap-2">
              <Search className="size-4 text-zinc-400" />
              <span className="text-xs text-zinc-400 font-medium">Search workers...</span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {workers.map((worker) => (
              <Card key={worker.id} className="overflow-hidden border-zinc-200 shadow-sm hover:shadow-md transition-all dark:border-zinc-800">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="size-12 rounded-xl bg-zinc-100 flex items-center justify-center font-bold text-zinc-500 dark:bg-zinc-800">
                        {worker.user?.name?.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-zinc-900 dark:text-white">{worker.user?.name}</h3>
                        <p className="text-xs text-zinc-500 font-medium">{worker.user?.phone}</p>
                      </div>
                    </div>
                    {worker.aadhar_verified ? (
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Verified</Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-600 border-amber-200">New</Badge>
                    )}
                  </div>
                  
                  <div className="mt-6 flex items-center justify-between border-t pt-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-zinc-400">Category</span>
                      <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 capitalize">{worker.type.replace('_', ' ')}</span>
                    </div>
                    <Button variant="ghost" size="sm" className="gap-1 h-8 text-xs font-bold hover:bg-primary/5 hover:text-primary">
                      Manage
                      <ChevronRight className="size-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {workers.length === 0 && (
              <div className="col-span-full py-12 text-center rounded-3xl border-2 border-dashed border-zinc-200 dark:border-zinc-800">
                <Users className="mx-auto size-12 text-zinc-300 mb-4" />
                <p className="text-zinc-500 font-medium">You haven't registered any workers yet.</p>
                <Button variant="link" className="mt-2 text-primary" onClick={() => router.push('/partner/register-worker')}>
                  Add your first worker
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* Recent Activity */}
        <section className="rounded-3xl bg-zinc-900 p-8 text-white shadow-xl shadow-zinc-200/50">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold">Recent Ledger Activity</h2>
            <Button variant="outline" size="sm" className="border-zinc-700 bg-transparent text-white hover:bg-zinc-800">
              View All
              <ExternalLink className="ml-2 size-3" />
            </Button>
          </div>
          <div className="space-y-4">
            <p className="text-sm text-zinc-400 text-center py-4">No recent transactions recorded.</p>
          </div>
        </section>

      </main>
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string, value: any, icon: React.ReactNode, color: string }) {
  return (
    <Card className="border-none shadow-sm dark:bg-zinc-900">
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className={`flex size-12 items-center justify-center rounded-2xl ${color} text-white shadow-lg shadow-zinc-200/20`}>
            {icon}
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">{title}</p>
            <p className="text-2xl font-black text-zinc-900 dark:text-white">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
