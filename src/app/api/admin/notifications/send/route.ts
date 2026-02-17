import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import PushSubscription from '@/models/PushSubscription';
import User from '@/models/User';
import webpush from 'web-push';

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:support@billzzy.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(req: Request) {
  try {
    const { title, message, url, icon, image, targetUserId, category } = await req.json();
    console.log("Admin Sending Notification. Target:", targetUserId || category || "All Users");

    await dbConnect();

    // 1. Determine the target query
    const query: { userId?: string | { $in: string[] } } = {};

    if (targetUserId) {
      // Single specific user
      query.userId = targetUserId;
    } else if (category === 'onboarded') {
      // All onboarded clients
      const users = await User.find({ onboarded: true, role: { $ne: 'admin' } }).select('_id');
      const userIds = users.map(u => u._id.toString());
      query.userId = { $in: userIds };
    } else if (category === 'unonboarded') {
      // Clients who haven't finished onboarding
      const users = await User.find({ onboarded: false, role: { $ne: 'admin' } }).select('_id');
      const userIds = users.map(u => u._id.toString());
      query.userId = { $in: userIds };
    }
    // else if category is 'all' or empty, query remains {} (all subscribers)

    const subscriptions = await PushSubscription.find(query);

    if (subscriptions.length === 0) {
      console.log("❌ No subscriptions found for target:", targetUserId || category || "All Users");
      return NextResponse.json({
        success: false,
        message: 'No matching clients have enabled notifications yet.'
      }, { status: 200 });
    }

    const payload = JSON.stringify({
      title: title || "New Update",
      body: message,
      url: url || "/dashboard",
      icon: icon || "/assets/icon-192.png",
      image: image || null
    });

    await Promise.all(
      subscriptions.map(sub =>
        webpush.sendNotification(sub.subscription, payload)
          .catch(err => {
            console.error("Push delivery failed for one device", err.statusCode);
          })
      )
    );

    return NextResponse.json({ success: true, sentCount: subscriptions.length });
  } catch (error) {
    console.error("Critical Send Error:", error);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}