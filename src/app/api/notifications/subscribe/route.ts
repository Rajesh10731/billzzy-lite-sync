import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import PushSubscription from '@/models/PushSubscription';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions) as { user?: { id?: string | null; email?: string | null } } | null;
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const subscription = await req.json();
    await dbConnect();

    // Use session.user.id (this is the MongoDB _id from your authOptions)
    await PushSubscription.findOneAndUpdate(
      { userId: session.user.id },
      { userId: session.user.id, subscription },
      { upsert: true, new: true }
    );

    console.log(`✅ Push Subscription Saved for User: ${session.user.id} (${session.user.email})`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Push Subscribe API Error:', error);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}
