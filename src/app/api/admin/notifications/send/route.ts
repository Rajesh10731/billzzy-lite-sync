// import { NextResponse } from 'next/server';
// import dbConnect from '@/lib/mongodb';
// import PushSubscription from '@/models/PushSubscription';
// import User from '@/models/User';
// import webpush from 'web-push';

// // Define a proper interface for the query to avoid 'any'
// interface PushQuery {
//   userId?: string | { $in: string[] };
// }
// export async function POST(req: Request) {
//   try {
//     const { title, message, url, category, targetUserId } = await req.json();
//     await dbConnect();

//     const subject = process.env.VAPID_SUBJECT || 'mailto:support@billzzy.com';
//     const pubKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
//     const privKey = process.env.VAPID_PRIVATE_KEY;

//     if (!pubKey || !privKey) {
//       return NextResponse.json({ success: false, message: "VAPID keys missing." }, { status: 500 });
//     }

//     webpush.setVapidDetails(subject, pubKey, privKey);

//     const query: PushQuery = {};
//     if (targetUserId && targetUserId.trim() !== "") {
//       query.userId = targetUserId;
//     } else if (category === 'onboarded') {
//       const onboardedUsers = await User.find({ onboarded: true }).select('_id');
//       query.userId = { $in: onboardedUsers.map(u => u._id.toString()) };
//     }

//     // ADD .lean() HERE to fix the "endpoint" error
//     const subscriptions = await PushSubscription.find(query).lean();

//     if (subscriptions.length === 0) {
//       return NextResponse.json({ success: false, message: "No subscribers found." });
//     }

//     const payload = JSON.stringify({
//       title: title || "New Message",
//       body: message || "You have a new update",
//       url: url || "/dashboard",
//       icon: "/assets/icon-192.png"
//     });

//     await Promise.all(
//       subscriptions.map((sub: any) => 
//         // sub.subscription is now a plain object because of .lean()
//         webpush.sendNotification(sub.subscription, payload)
//           .catch(async (err: { statusCode?: number; message?: string }) => {
//             console.error(`Push Error for ${sub.userId}:`, err.message || err.statusCode);
//             if (err.statusCode === 410 || err.statusCode === 404) {
//               await PushSubscription.deleteOne({ _id: sub._id });
//             }
//           })
//       )
//     );

//     return NextResponse.json({ success: true, sentCount: subscriptions.length });
//   } catch (error: unknown) {
//     const errorMessage = error instanceof Error ? error.message : "Unknown Error";
//     console.error("Critical Send Error:", errorMessage);
//     return NextResponse.json({ error: 'Server Error' }, { status: 500 });
//   }
// }


import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import PushSubscription from '@/models/PushSubscription';
import User from '@/models/User';
import webpush from 'web-push';

// 1. Define Interfaces to satisfy TypeScript
interface PushQuery {
  userId?: string | { $in: string[] };
}

interface SubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface SubscriptionDocument {
  _id: unknown;
  userId: string;
  subscription: SubscriptionData;
}

export async function POST(req: Request) {
  try {
    const { title, message, url, category, targetUserId } = await req.json();
    await dbConnect();

    const subject = process.env.VAPID_SUBJECT || 'mailto:support@billzzy.com';
    const pubKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privKey = process.env.VAPID_PRIVATE_KEY;

    if (!pubKey || !privKey) {
      return NextResponse.json({ success: false, message: "VAPID keys missing." }, { status: 500 });
    }

    webpush.setVapidDetails(subject, pubKey, privKey);

    // 2. Query Logic
    const query: PushQuery = {};
    if (targetUserId && targetUserId.trim() !== "") {
      query.userId = targetUserId;
    } else if (category === 'onboarded') {
      const onboardedUsers = await User.find({ onboarded: true }).select('_id');
      query.userId = { $in: onboardedUsers.map(u => u._id.toString()) };
    }

    // Use .lean<SubscriptionDocument[]>() to get plain objects with correct types
    console.log(`[Push Send] Querying for subscribers:`, JSON.stringify(query));
    const subscriptions = await PushSubscription.find(query).lean<SubscriptionDocument[]>();
    console.log(`[Push Send] Found ${subscriptions.length} subscribers.`);

    if (subscriptions.length === 0) {
      return NextResponse.json({ success: false, message: "No subscribers found." });
    }

    const payload = JSON.stringify({
      title: title || "New Message",
      body: message || "You have a new update",
      url: url || "/dashboard",
      icon: "/assets/icon-192.png"
    });

    // 3. Send Notifications
    await Promise.all(
      subscriptions.map((sub: SubscriptionDocument) =>
        webpush.sendNotification(sub.subscription as webpush.PushSubscription, payload)
          .catch(async (err: { statusCode?: number; message?: string }) => {
            console.error(`Push Error for ${sub.userId}:`, err.message || err.statusCode);
            if (err.statusCode === 410 || err.statusCode === 404) {
              await PushSubscription.deleteOne({ _id: sub._id });
            }
          })
      )
    );

    return NextResponse.json({
      success: true,
      sentCount: subscriptions.length
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown Error";
    console.error("Critical Send Error:", errorMessage);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}