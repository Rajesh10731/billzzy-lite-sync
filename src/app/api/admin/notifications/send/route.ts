import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import PushSubscription from '@/models/PushSubscription';
import User from '@/models/User';
import webpush from 'web-push';

// Define a proper interface for the query to avoid 'any'
interface PushQuery {
  userId?: string | { $in: string[] };
}

export async function POST(req: Request) {
  try {
    const { title, message, url, category, targetUserId } = await req.json();
    await dbConnect();

    // 1. VAPID Configuration Check
    const subject = process.env.VAPID_SUBJECT || 'mailto:support@billzzy.com';
    const pubKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privKey = process.env.VAPID_PRIVATE_KEY;

    if (!pubKey || !privKey) {
      return NextResponse.json({ 
        success: false, 
        message: "Server configuration error (VAPID keys missing)." 
      }, { status: 500 });
    }

    webpush.setVapidDetails(subject, pubKey, privKey);

    // 2. Query Logic (Properly Typed)
    const query: PushQuery = {};

    if (targetUserId && targetUserId.trim() !== "") {
      query.userId = targetUserId;
    } else if (category === 'onboarded') {
      const onboardedUsers = await User.find({ onboarded: true }).select('_id');
      query.userId = { $in: onboardedUsers.map(u => u._id.toString()) };
    }
    // If category is 'all', query remains empty {} to target everyone

    const subscriptions = await PushSubscription.find(query);

    if (subscriptions.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: "No subscribers found in database." 
      });
    }

    const payload = JSON.stringify({
      title: title || "New Message",
      body: message || "You have a new update",
      url: url || "/dashboard",
      icon: "/assets/icon-192.png"
    });

    // 3. Send Notifications (Fixed unused 'results' warning)
    await Promise.all(
      subscriptions.map((sub) => 
        webpush.sendNotification(sub.subscription, payload)
          .catch(async (err: { statusCode?: number; message?: string }) => {
            console.error(`Push Error for ${sub.userId}:`, err.message || err.statusCode);
            if (err.statusCode === 410 || err.statusCode === 404) {
              await PushSubscription.deleteOne({ _id: sub._id });
            }
          })
      )
    );

    return NextResponse.json({ success: true, sentCount: subscriptions.length });
  } catch (error: unknown) {
    // 4. Handle catch error safely to avoid 'any'
    const errorMessage = error instanceof Error ? error.message : "Unknown Error";
    console.error("Critical Send Error:", errorMessage);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}