import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';

export async function POST(req: Request) {
  try {
    const { job_id, amount } = await req.json();

    if (!job_id || !amount) {
      return NextResponse.json({ error: 'Job ID and amount are required' }, { status: 400 });
    }

    // 1. Initialize Razorpay
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    // 2. Create the Order
    // Note: amount is in paise (Rupees * 100)
    const options = {
      amount: Math.round(amount * 100), 
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
