'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Briefcase, 
  MapPin, 
  Filter, 
  Bell, 
  User,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import JobCard from '@/components/JobCard';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export default function WorkerDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [workerProfile, setWorkerProfile] = useState<any>(null);
  const [availableJobs, setAvailableJobs] = useState<any[]>([]);

  useEffect(() => {
    const channelName = `jobs-nearby-${Math.random()}`; // Unique name to prevent collisions
    const channel = supabase.channel(channelName);

    async function initDashboard() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile, error: profileError } = await supabase
          .from('workers')
          .select('*, user:users!user_id(name, phone)')
          .eq('user_id', user.id)
          .single();

        if (profileError) {
          console.error('Worker Profile Fetch Error:', profileError);
          throw new Error(profileError.message || 'Profile not found');
        }
        setWorkerProfile(profile);

        const targetPincodes = [profile.pincode, ...(profile.adjacent_pincodes || [])];
        
        const { data: jobs, error: jobsError } = await supabase
          .from('jobs')
          .select('*')
          .in('pincode', targetPincodes)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });

        if (jobsError) throw jobsError;
        setAvailableJobs(jobs);

        // Setup Real-time listener
        channel
          .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'jobs'
          }, (payload) => {
            const newJob = payload.new;
            if (targetPincodes.includes(newJob.pincode) && newJob.status === 'pending') {
              setAvailableJobs(prev => [newJob, ...prev]);
              toast.info('New job posted nearby!', {
                description: newJob.interpreted_category,
              });
            }
          })
          .subscribe();

      } catch (err: any) {
        console.error('Dashboard Initialization Error:', err);
        toast.error(err.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    }

    initDashboard();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 dark:bg-black">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm text-zinc-500">Scanning for jobs nearby...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 pb-24 dark:bg-black">
      {/* Top Header */}
      <header className="sticky top-0 z-20 border-b bg-white/80 px-6 py-5 backdrop-blur-md dark:bg-black/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
              {workerProfile?.user?.name?.charAt(0) || <User className="size-5" />}
            </div>
            <div>
              <h1 className="text-sm font-bold leading-none">{workerProfile?.user?.name}</h1>
              <div className="mt-1 flex items-center gap-1 text-[10px] text-zinc-500">
                <MapPin className="size-3" />
                {workerProfile?.pincode}
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="size-5" />
            <span className="absolute right-2 top-2 size-2 rounded-full bg-red-500" />
          </Button>
        </div>
      </header>

      <main className="p-6">
        {/* Stats Banner */}
        <div className="mb-8 grid grid-cols-2 gap-4">
          <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-900">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total Jobs</p>
            <p className="text-2xl font-black text-zinc-900 dark:text-white">{workerProfile?.total_jobs || 0}</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-900">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Success Rate</p>
            <p className="text-2xl font-black text-emerald-500">{workerProfile?.completion_rate || 0}%</p>
          </div>
        </div>

        {/* Job Feed */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">Available Gigs</h2>
            <Button variant="ghost" size="sm" className="gap-2 text-zinc-500">
              <Filter className="size-4" />
              Filter
            </Button>
          </div>

          {availableJobs.length > 0 ? (
            <div className="grid gap-4">
              {availableJobs.map((job) => (
                <JobCard 
                  key={job.id} 
                  job={job} 
                  isAdjacent={job.pincode !== workerProfile.pincode}
                  onClick={(id) => router.push(`/worker/job/${id}`)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-zinc-200 py-16 dark:border-zinc-800">
              <Briefcase className="mb-4 size-12 text-zinc-300" />
              <h3 className="font-bold text-zinc-900 dark:text-white">No jobs found nearby</h3>
              <p className="mt-1 text-center text-sm text-zinc-500 px-10">
                We'll notify you as soon as someone posts a job in {workerProfile?.pincode} or nearby areas.
              </p>
            </div>
          )}
        </section>
      </main>

      {/* Verification Warning for New Workers */}
      {workerProfile?.is_new && (
        <div className="mx-6 mb-6 rounded-2xl bg-amber-50 p-4 border border-amber-100 dark:bg-amber-900/10 dark:border-amber-900/30">
          <div className="flex gap-3">
            <AlertCircle className="size-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-xs font-bold text-amber-800 dark:text-amber-400">Verification Pending</p>
              <p className="text-[10px] text-amber-700/80 dark:text-amber-500/80">
                You can still bid on jobs, but verified workers are 3x more likely to be hired. Talk to your partner node to verify your Aadhar.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
