'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  PhoneMissed, 
  User, 
  Clock, 
  MapPin, 
  RefreshCw, 
  ShieldAlert,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

type WorkerWithPings = {
  user_id: string;
  caller_id: string;
  user: { name: string };
  pings: any[];
};

export default function MockTelephonyPage() {
  const [workers, setWorkers] = useState<WorkerWithPings[]>([]);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState<string | null>(null);
  const [isEnabled, setIsEnabled] = useState<boolean | null>(null);

  const fetchData = useCallback(async () => {
    try {
      // 1. Fetch Workers with caller_id
      const { data: workersData, error: workerError } = await supabase
        .from('workers')
        .select('user_id, caller_id, user:users(name)')
        .not('caller_id', 'is', null);

      if (workerError) throw workerError;

      // 2. For each worker, fetch active pending pings
      const workersWithPings = await Promise.all(
        (workersData || []).map(async (w: any) => {
          const { data: pings } = await supabase
            .from('job_pings')
            .select('*, job:jobs(raw_description, interpreted_category)')
            .eq('worker_id', w.user_id)
            .eq('status', 'pending')
            .gt('expires_at', new Date().toISOString());
          
          return { ...w, pings: pings || [] };
        })
      );

      setWorkers(workersWithPings);
    } catch (err: any) {
      toast.error('Failed to fetch simulator data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Check if mock telephony is enabled (via a quick fetch or just assuming since we are on dev page)
    // For now, we'll just fetch data. If MOCK_TELEPHONY=false, the API will fail anyway.
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const simulateMissedCall = async (callerId: string, pingId: string) => {
    setSimulating(pingId);
    try {
      const res = await fetch('/api/telephony/missed-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          caller_id: callerId,
          dialed_number: 'MOCK_VIRTUAL_NUMBER'
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Simulation failed');
      }

      toast.success('Missed call simulated successfully!');
      fetchData(); // Refresh list
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSimulating(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <Loader2 className="size-8 animate-spin text-[#40C057]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-8 text-zinc-100 selection:bg-[#40C057]/30">
      <div className="mx-auto max-w-4xl space-y-12">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <PhoneMissed className="size-8 text-[#40C057]" />
              Telephony Simulator
            </h1>
            <p className="text-zinc-500 font-medium italic">Test the missed-call bidding flow in real-time</p>
          </div>
          <Badge variant="outline" className="border-[#40C057] text-[#40C057] font-black uppercase tracking-widest px-4 py-1.5 bg-[#40C057]/5">
            MOCK_TELEPHONY: ENABLED
          </Badge>
        </div>

        {/* Workers List */}
        <div className="grid gap-6">
          {workers.length > 0 ? (
            workers.map(worker => (
              <Card key={worker.user_id} className="border-zinc-800 bg-zinc-900 shadow-2xl">
                <CardHeader className="border-b border-zinc-800 pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="size-12 rounded-2xl bg-[#40C057]/10 flex items-center justify-center text-[#40C057]">
                        <User className="size-6" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-bold text-white">{worker.user?.name || 'Anonymous Worker'}</CardTitle>
                        <p className="font-mono text-sm text-zinc-500">{worker.caller_id}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-zinc-800 text-zinc-400">
                      {worker.pings.length} Active Alerts
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  {worker.pings.length > 0 ? (
                    <div className="space-y-4">
                      {worker.pings.map(ping => (
                        <div key={ping.id} className="group relative rounded-2xl bg-zinc-950 p-6 border border-zinc-800 hover:border-[#40C057]/50 transition-all">
                          <div className="flex items-start justify-between">
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <Badge className="bg-[#40C057] text-zinc-950 font-black uppercase text-[10px]">NEW ALERT</Badge>
                                <span className="text-xs text-zinc-500 flex items-center gap-1">
                                  <Clock className="size-3" />
                                  Expires {formatDistanceToNow(new Date(ping.expires_at), { addSuffix: true })}
                                </span>
                              </div>
                              <h3 className="text-lg font-black text-white">{ping.job.interpreted_category}</h3>
                              <p className="text-sm text-zinc-500 leading-relaxed max-w-lg">{ping.job.raw_description}</p>
                            </div>
                            
                            <Button 
                              disabled={simulating === ping.id}
                              onClick={() => simulateMissedCall(worker.caller_id, ping.id)}
                              className="h-14 rounded-xl bg-[#40C057] px-8 font-black text-zinc-950 shadow-xl shadow-[#40C057]/20 hover:bg-[#40C057]/90 active:scale-95 transition-all"
                            >
                              {simulating === ping.id ? (
                                <Loader2 className="animate-spin" />
                              ) : (
                                <span className="flex items-center gap-2">
                                  <PhoneMissed className="size-5" />
                                  Simulate Missed Call
                                </span>
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 rounded-2xl bg-zinc-950/50 border-2 border-dashed border-zinc-800">
                      <ShieldAlert className="size-8 text-zinc-700 mb-2" />
                      <p className="text-sm font-bold text-zinc-600">No pending job pings for this worker</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-20 bg-zinc-900 rounded-[40px] border-2 border-dashed border-zinc-800">
              <User className="mx-auto size-12 text-zinc-800 mb-4" />
              <h3 className="text-xl font-bold text-zinc-400">No Registered Workers</h3>
              <p className="text-zinc-600 mt-2">Workers must have a caller_id to appear here.</p>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-center gap-2 text-zinc-600 text-xs font-black uppercase tracking-widest">
          <RefreshCw className="size-3 animate-spin [animation-duration:5s]" />
          Auto-refreshing every 15 seconds
        </div>
      </div>
    </div>
  );
}
