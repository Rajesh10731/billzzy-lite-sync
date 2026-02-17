// import { NextResponse } from 'next/server';
// import dbConnect from '@/lib/mongodb';
// import PushSubscription from '@/models/PushSubscription';
// import { getServerSession } from 'next-auth';
// import { authOptions } from '@/lib/auth';
// import webpush from 'web-push';

// // Configure web-push (Make sure these match your .env)
// webpush.setVapidDetails(
//   process.env.VAPID_SUBJECT!,
//   process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
//   process.env.VAPID_PRIVATE_KEY!
// );

// export async function POST(req: Request) {
//   const session = await getServerSession(authOptions);

//   // 1. Security Check: Only admins allowed
//   // Adjust this check based on how you identify admins in your session
//   if (!session || session.user.role !== 'admin') {
//     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//   }

//   const { title, message, url, targetUserId } = await req.json();

//   await dbConnect();

//   // 2. Find subscriptions
//   // If targetUserId is provided, send to one user. Otherwise, send to ALL.
//   const query = targetUserId ? { userId: targetUserId } : {};
//   const subscriptions = await PushSubscription.find(query);

//   if (subscriptions.length === 0) {
//     return NextResponse.json({ message: 'No active subscriptions found' });
//   }

//   // 3. Send notifications in parallel
//   const notifications = subscriptions.map((sub) => {
//     return webpush.sendNotification(
//       sub.subscription,
//       JSON.stringify({
//         title: title || "Admin Update",
//         body: message,
//         url: url || "/dashboard",
//       })
//     ).catch(async (err) => {
//       // Cleanup expired subscriptions (410 Gone or 404 Not Found)
//       if (err.statusCode === 410 || err.statusCode === 404) {
//         await PushSubscription.deleteOne({ _id: sub._id });
//       }
//     });
//   });

//   await Promise.all(notifications);

//   return NextResponse.json({ 
//     success: true, 
//     sentCount: subscriptions.length 
//   });
// }


import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import PushSubscription from '@/models/PushSubscription';
import webpush from 'web-push';

webpush.setVapidDetails(
  'mailto:support@billzzy.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(req: Request) {
  try {
    const { title, message, targetUserId } = await req.json();
    console.log("Admin Sending To User ID:", targetUserId);

    await dbConnect();

    // 1. Find the subscription using the ID passed from the dropdown
    const subscriptions = await PushSubscription.find({ userId: targetUserId });

    if (subscriptions.length === 0) {
      console.log("❌ No subscription found in DB for ID:", targetUserId);
      return NextResponse.json({ 
        success: false, 
        message: 'Client has not enabled browser notifications yet.' 
      }, { status: 200 }); // Return 200 so the UI can show the message nicely
    }

    const payload = JSON.stringify({
      title: title || "New Update",
      body: message,
      url: "/dashboard",
    });

    await Promise.all(
      subscriptions.map(sub => 
        webpush.sendNotification(sub.subscription, payload)
          .catch(err => console.error("Push delivery failed for one device"))
      )
    );

    return NextResponse.json({ success: true, sentCount: subscriptions.length });
  } catch (error) {
    console.error("Critical Send Error:", error);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}