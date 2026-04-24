import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';

export async function POST(req: Request) {
  try {
    const { job_id, amount } = await req.json();

    if (!job_id || amount === undefined || amount === null) {
      return NextResponse.json({ error: 'Job ID and amount are required' }, { status: 400 });
    }

    // Validate amount is a finite positive number before multiplying
    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 });
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    const options = {
      amount: Math.round(amountNum * 100), // paise
      currency: 'INR',
      receipt: job_id,
    };

    const order = await razorpay.orders.create(options);

    if (!order) {
      throw new Error('Failed to create Razorpay order');
    }

    return NextResponse.json(order);

  } catch (err: any) {
    console.error('Razorpay Order API Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
