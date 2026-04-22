import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function POST(req: Request) {
  try {
    const { job_id, worker_id } = await req.json();

    if (!job_id || !worker_id) {
      return NextResponse.json({ error: 'Job ID and Worker ID are required' }, { status: 400 });
    }

    // 1. Fetch Job and Verify Worker
    const { data: job, error: jobError } = await supabaseAdmin
      .from('jobs')
      .select('*')
      .eq('id', job_id)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.accepted_worker_id !== worker_id) {
      return NextResponse.json({ error: 'Unauthorized: You are not assigned to this job' }, { status: 403 });
    }

    // 2. Update Job: Status and Warranty (7 Days)
    const warrantyExpires = new Date();
    warrantyExpires.setDate(warrantyExpires.getDate() + 7);

    const { data: updatedJob, error: updateError } = await supabaseAdmin
      .from('jobs')
      .update({ 
        status: 'complete',
        warranty_expires_at: warrantyExpires.toISOString()
      })
      .eq('id', job_id)
      .select()
      .single();

    if (updateError) throw updateError;

    // 3. Update Worker Statistics
    // Get count of all completed jobs for this worker
    const { count: completedCount } = await supabaseAdmin
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('accepted_worker_id', worker_id)
      .eq('status', 'complete');

    // Get count of all assigned jobs to calculate completion rate
    const { count: totalAssigned } = await supabaseAdmin
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('accepted_worker_id', worker_id);

    const completionRate = totalAssigned && totalAssigned > 0 
      ? Math.round(((completedCount || 0) / totalAssigned) * 100) 
      : 0;

    // Fetch current worker profile to check partner_node_id
    const { data: workerProfile } = await supabaseAdmin
      .from('workers')
      .select('*')
      .eq('user_id', worker_id)
      .single();

    if (workerProfile) {
      const newTotalJobs = (workerProfile.total_jobs || 0) + 1;
      
      await supabaseAdmin
        .from('workers')
        .update({
          total_jobs: newTotalJobs,
          completion_rate: completionRate,
          is_new: newTotalJobs < 3 // Graduate from 'New Pro' after 3 jobs
        })
        .eq('user_id', worker_id);

      // 4. Handle Partner Commission (40% of Platform Fee)
      if (workerProfile.partner_node_id) {
        // Calculate original convenience fee (based on our business logic)
        const convenienceFee = (job.final_price || 0) <= 300 ? 25 : 49;
        const partnerAmount = Math.floor(convenienceFee * 0.4);

        await supabaseAdmin
          .from('partner_ledger')
          .insert({
            partner_node_id: workerProfile.partner_node_id,
            job_id: job_id,
            worker_id: worker_id,
            amount: partnerAmount,
            status: 'pending'
          });
          
        console.log(`[LEDGER] Recorded commission of ₹${partnerAmount} for partner ${workerProfile.partner_node_id}`);
      }
    }

    return NextResponse.json(updatedJob);

  } catch (err: any) {
    console.error('Complete API Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
