import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function POST(req: Request) {
  try {
    const { job_id, reviewer_id, rating, comment } = await req.json();

    if (!job_id || !reviewer_id || !rating) {
      return NextResponse.json({ error: 'job_id, reviewer_id, and rating are required' }, { status: 400 });
    }
    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
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
    let reviewee_id: string;

    if (reviewer_id === job.customer_id) {
      reviewer_role = 'customer';
      reviewee_id = job.accepted_worker_id;
    } else if (reviewer_id === job.accepted_worker_id) {
      reviewer_role = 'worker';
      reviewee_id = job.customer_id;
    } else {
      return NextResponse.json({ error: 'You are not a participant in this job' }, { status: 403 });
    }

    if (!reviewee_id) {
      return NextResponse.json({ error: 'No reviewee found for this job' }, { status: 400 });
    }

    // Insert review (unique index prevents duplicates)
    const { data: review, error: insertError } = await supabaseAdmin
      .from('reviews')
      .insert({ job_id, reviewer_id, reviewee_id, reviewer_role, rating, comment: comment?.trim() || null })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json({ error: 'You have already reviewed this job' }, { status: 409 });
      }
      throw insertError;
    }

    // Update worker's avg_rating when customer reviews the worker
    if (reviewer_role === 'customer') {
      const { data: allRatings } = await supabaseAdmin
        .from('reviews')
        .select('rating')
        .eq('reviewee_id', reviewee_id)
        .eq('reviewer_role', 'customer');

      if (allRatings && allRatings.length > 0) {
        const avg = allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length;
        await supabaseAdmin
          .from('workers')
          .update({ avg_rating: Math.round(avg * 10) / 10, review_count: allRatings.length })
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

  const { data } = await supabaseAdmin
    .from('reviews')
    .select('id, rating, comment')
    .eq('job_id', job_id)
    .eq('reviewer_id', reviewer_id)
    .maybeSingle();

  return NextResponse.json({ review: data });
}
