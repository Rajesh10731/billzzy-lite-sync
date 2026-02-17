// import { NextResponse } from 'next/server';
// import dbConnect from '@/lib/mongodb';
// import PushSubscription from '@/models/PushSubscription';
// import { getServerSession } from 'next-auth';
// import { authOptions } from '@/lib/auth';

// export async function POST(req: Request) {
//   const session = await getServerSession(authOptions);
//   if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

//   const subscription = await req.json();
//   await dbConnect();

//   // Save or Update subscription
//   await PushSubscription.findOneAndUpdate(
//     { userId: session.user.id, 'subscription.endpoint': subscription.endpoint },
//     { userId: session.user.id, subscription },
//     { upsert: true }
//   );

//   return NextResponse.json({ success: true });
// }

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import PushSubscription from '@/models/PushSubscription';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const subscription = await req.json();
    await dbConnect();

    // Use session.user.id (this is the MongoDB _id from your authOptions)
    const saved = await PushSubscription.findOneAndUpdate(
      { userId: session.user.id }, 
      { userId: session.user.id, subscription },
      { upsert: true, new: true }
    );

    console.log(`✅ Push Token Saved for User: ${session.user.id} (${session.user.email})`);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}