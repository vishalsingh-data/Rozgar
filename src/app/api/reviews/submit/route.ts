import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function POST(req: Request) {
  try {
    const { job_id, reviewer_id, rating, comment } = await req.json();

    if (!job_id || !reviewer_id || !rating) {
      return NextResponse.json({ error: 'job_id, reviewer_id, and rating are required' }, { status: 400 });
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be an integer between 1 and 5' }, { status: 400 });
    }

    // Verify job is complete and reviewer is a participant
    const { data: job, error: jobError } = await supabaseAdmin
      .from('jobs')
      .select('id, status, customer_id, accepted_worker_id')
      .eq('id', job_id)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    if (job.status !== 'complete') {
      return NextResponse.json({ error: 'Reviews can only be submitted for completed jobs' }, { status: 400 });
    }

    let reviewer_role: string;
    let reviewee_id: string | null = null;

    if (reviewer_id === job.customer_id) {
      reviewer_role = 'customer';
      reviewee_id = job.accepted_worker_id;
    } else if (reviewer_id === job.accepted_worker_id) {
      reviewer_role = 'worker';
      reviewee_id = job.customer_id;
    } else {
      return NextResponse.json({ error: 'You are not a participant in this job' }, { status: 403 });
    }

    if (reviewee_id === null || reviewee_id === undefined) {
      return NextResponse.json({ error: 'No reviewee found for this job' }, { status: 400 });
    }

    // Insert review (unique index prevents duplicates)
    const { data: review, error: insertError } = await supabaseAdmin
      .from('reviews')
      .insert({
        job_id,
        reviewer_id,
        reviewee_id,
        reviewer_role,
        rating,
        comment: comment?.trim() || null
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json({ error: 'You have already reviewed this job' }, { status: 409 });
      }
      throw insertError;
    }

    // Update worker avg_rating incrementally when customer reviews the worker
    // Uses stored review_count + avg_rating to avoid re-fetching all rows (O(1) instead of O(n))
    if (reviewer_role === 'customer') {
      const { data: workerRow } = await supabaseAdmin
        .from('workers')
        .select('avg_rating, review_count')
        .eq('user_id', reviewee_id)
        .single();

      if (workerRow) {
        const oldCount = workerRow.review_count || 0;
        const oldAvg = workerRow.avg_rating || 0;
        const newCount = oldCount + 1;
        const newAvg = Math.round(((oldAvg * oldCount) + rating) / newCount * 10) / 10;

        await supabaseAdmin
          .from('workers')
          .update({ avg_rating: newAvg, review_count: newCount })
          .eq('user_id', reviewee_id);
      }
    }

    return NextResponse.json(review);

  } catch (err: any) {
    console.error('Review submit error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const job_id = searchParams.get('job_id');
  const reviewer_id = searchParams.get('reviewer_id');

  if (!job_id || !reviewer_id) {
    return NextResponse.json({ error: 'job_id and reviewer_id required' }, { status: 400 });
  }

  // Verify the caller is actually asking about their own review (not snooping)
  // In a session-auth model this would check session user == reviewer_id
  // For this MVP we validate the reviewer is a participant in the job
  const { data: job } = await supabaseAdmin
    .from('jobs')
    .select('customer_id, accepted_worker_id')
    .eq('id', job_id)
    .maybeSingle();

  if (!job) {
    return NextResponse.json({ review: null });
  }

  if (reviewer_id !== job.customer_id && reviewer_id !== job.accepted_worker_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { data } = await supabaseAdmin
    .from('reviews')
    .select('id, rating, comment')
    .eq('job_id', job_id)
    .eq('reviewer_id', reviewer_id)
    .maybeSingle();

  return NextResponse.json({ review: data });
}
