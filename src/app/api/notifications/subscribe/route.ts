import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import PushSubscription from '@/models/PushSubscription';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const subscription = await req.json();
  await dbConnect();

  // Save or Update subscription
  await PushSubscription.findOneAndUpdate(
    { userId: session.user.id, 'subscription.endpoint': subscription.endpoint },
    { userId: session.user.id, subscription },
    { upsert: true }
  );

  return NextResponse.json({ success: true });
}