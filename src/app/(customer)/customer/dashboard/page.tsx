'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Clock, 
  CheckCircle2, 
  MapPin, 
  Briefcase,
  ChevronRight,
  Loader2,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export default function CustomerDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<any[]>([]);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }

        // Fetch user profile
        const { data: profile } = await supabase
          .from('users')
          .select('name')
          .eq('id', user.id)
          .single();
        
        setUserName(profile?.name || 'Customer');

        // Fetch customer's jobs
        const { data: jobsData, error: jobsError } = await supabase
          .from('jobs')
          .select('*')
          .eq('customer_id', user.id)
          .order('created_at', { ascending: false });

        if (jobsError) throw jobsError;
        setJobs(jobsData || []);
      } catch (err: any) {
        console.error('Dashboard Load Error:', err);
        toast.error('Failed to load jobs');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fdfdfb]">
        <Loader2 className="size-8 animate-spin text-[#22c55e]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdfdfb] pb-24 dark:bg-black">
      {/* Header */}
      <div className="bg-white px-6 pb-10 pt-16 shadow-sm dark:bg-zinc-900">
        <div className="mx-auto max-w-[430px]">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-[#022c22] flex items-center justify-center text-white font-bold">R</div>
              <span className="font-bold text-[#022c22] dark:text-white">Rozgar</span>
            </div>
            <div className="size-10 rounded-full bg-zinc-100 flex items-center justify-center dark:bg-zinc-800">
              <span className="text-xs font-bold text-zinc-500">{userName.charAt(0)}</span>
            </div>
          </div>
          
          <h1 className="text-3xl font-black text-[#022c22] dark:text-white">Namaste, {userName.split(' ')[0]}</h1>
          <p className="mt-1 text-zinc-500 font-medium">What help do you need today?</p>
          
          <Button 
            className="mt-8 h-14 w-full rounded-2xl bg-[#22c55e] text-lg font-bold text-white shadow-lg shadow-[#22c55e]/20 hover:bg-[#16a34a]"
            onClick={() => router.push('/customer/post-job')}
          >
            <Plus className="mr-2 size-5" />
            Post a New Job
          </Button>
        </div>
      </div>

      {/* Content */}
      <main className="mx-auto max-w-[430px] px-6 pt-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[#022c22] dark:text-white">Your Recent Jobs</h2>
          <Badge variant="outline" className="rounded-full border-zinc-200 text-zinc-400">{jobs.length}</Badge>
        </div>

        {jobs.length > 0 ? (
          <div className="space-y-4">
            {jobs.map((job) => (
              <Card key={job.id} className="overflow-hidden border-zinc-100 bg-white shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <Badge className={`rounded-full px-3 py-1 text-[10px] uppercase font-black ${getStatusColor(job.status)}`}>
                      {job.status}
                    </Badge>
                    <span className="text-[10px] font-bold text-zinc-400">{new Date(job.created_at).toLocaleDateString()}</span>
                  </div>
                  
                  <h3 className="font-bold text-zinc-900 dark:text-white line-clamp-1">{job.raw_description}</h3>
                  
                  <div className="mt-4 flex items-center gap-4 text-xs text-zinc-500 font-medium">
                    <div className="flex items-center gap-1">
                      <MapPin className="size-3" />
                      {job.pincode || 'Location N/A'}
                    </div>
                    <div className="flex items-center gap-1">
                      <Briefcase className="size-3" />
                      {job.interpreted_category || 'General'}
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t pt-4">
                    <p className="text-lg font-black text-[#022c22] dark:text-white">
                      ₹{job.final_price || job.ai_base_price || '--'}
                    </p>
                    <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs font-bold text-[#22c55e]">
                      View Details
                      <ChevronRight className="size-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="py-16 text-center rounded-3xl bg-zinc-50/50 border-2 border-dashed border-zinc-100 dark:bg-zinc-900/20 dark:border-zinc-800">
            <div className="mx-auto size-16 rounded-full bg-white flex items-center justify-center shadow-sm mb-4 dark:bg-zinc-800">
              <Shield className="size-8 text-zinc-200" />
            </div>
            <h3 className="font-bold text-zinc-900 dark:text-white">No jobs yet</h3>
            <p className="mt-1 text-sm text-zinc-500 px-10">Post your first job and find verified workers in seconds.</p>
          </div>
        )}
      </main>

      {/* Mobile Nav Placeholder */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-white/80 backdrop-blur-md px-10 py-4 flex justify-between dark:bg-zinc-900/80 dark:border-zinc-800">
        <NavIcon icon={<Briefcase className="size-6" />} label="Jobs" active />
        <NavIcon icon={<Clock className="size-6" />} label="History" />
        <NavIcon icon={<CheckCircle2 className="size-6" />} label="Safety" />
      </div>
    </div>
  );
}

function NavIcon({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <div className={`flex flex-col items-center gap-1 ${active ? 'text-[#22c55e]' : 'text-zinc-300'}`}>
      {icon}
      <span className="text-[10px] font-bold uppercase">{label}</span>
    </div>
  );
}

function getStatusColor(status: string) {
  switch (status) {
    case 'pending': return 'bg-amber-100 text-amber-700';
    case 'assigned': return 'bg-blue-100 text-blue-700';
    case 'complete': return 'bg-emerald-100 text-emerald-700';
    default: return 'bg-zinc-100 text-zinc-700';
  }
}
