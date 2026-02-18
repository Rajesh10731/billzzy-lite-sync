import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import PushSubscription from '@/models/PushSubscription';
import User from '@/models/User';
import webpush from 'web-push';

// 1. Setup VAPID Keys
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:support@billzzy.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(req: Request) {
  try {
    const { title, message, url, category, targetUserId, icon } = await req.json();
    await dbConnect();

    let query: { userId?: string | { $in: string[] } } = {};

    // 2. Determine who to send to
    if (targetUserId && targetUserId.trim() !== "") {
      query.userId = targetUserId;
    } else if (category === 'onboarded') {
      // Find all onboarded users (Removing Admin check temporarily so you can test on yourself)
      const onboardedUsers = await User.find({ onboarded: true }).select('_id');
      const onboardedIds = onboardedUsers.map(u => u._id.toString());
      query.userId = { $in: onboardedIds };
    } else if (category === 'all') {
      query = {}; // Empty query finds everyone in PushSubscription collection
    }

    const subscriptions = await PushSubscription.find(query);

    console.log(`Targeting: ${category || 'Direct'}. Found: ${subscriptions.length} matching devices.`);

    if (subscriptions.length === 0) {
      return NextResponse.json({
        success: false,
        message: "No subscribers found. Ensure the user has 'Allowed' notifications on their device."
      });
    }

    // 3. Prepare the Notification Payload
    const payload = JSON.stringify({
      title: title || "Billzzy Lite Update",
      body: message || "You have a new update.",
      url: url || "/dashboard",
      icon: icon || "/assets/icon-192.png",
      badge: "/assets/icon-192.png",
    });

    // 4. Send the Notifications
    await Promise.all(
      subscriptions.map(sub =>
        webpush.sendNotification(sub.subscription, payload)
          .catch(async (err) => {
            console.error(`Push failed for ${sub.userId}:`, err.statusCode);
            // If the subscription is no longer valid (expired), delete it from DB
            if (err.statusCode === 410 || err.statusCode === 404) {
              await PushSubscription.deleteOne({ _id: sub._id });
            }
          })
      )
    );

    // 5. Return success with the count for the UI
    return NextResponse.json({
      success: true,
      sentCount: subscriptions.length
    });

  } catch (error) {
    console.error("Notification API Error:", error);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}