import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import PushSubscription from '@/models/PushSubscription';
import User from '@/models/User';
import Notification from '@/models/Notification';
import { Types } from 'mongoose';
import webpush from 'web-push';

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
    const { title, message, url, category, targetUserId, icon, image } = await req.json();
    await dbConnect();

    const subject = process.env.VAPID_SUBJECT || 'mailto:support@billzzy.com';
    const pubKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privKey = process.env.VAPID_PRIVATE_KEY;

    if (!pubKey || !privKey) {
      console.error("❌ VAPID keys missing in environment.");
      return NextResponse.json({ success: false, message: "VAPID keys missing." }, { status: 500 });
    }

    webpush.setVapidDetails(subject, pubKey, privKey);

    // 2. Identify Target User IDs
    let targetUserIds: string[] = [];

    if (targetUserId && targetUserId.trim() !== "") {
      targetUserIds = [targetUserId];
      console.log(`[Push Send] Targeting specific user ID: ${targetUserId}`);
    } else {
      const userQuery: Record<string, boolean | { $ne: boolean } | { $in: string[] } | unknown> = {};
      if (category === 'onboarded') {
        userQuery.onboarded = true;
      } else if (category === 'unonboarded') {
        userQuery.onboarded = { $ne: true };
      }

      const finalQuery = { ...userQuery, role: { $ne: 'admin' } };
      const targetUsers = await User.find(finalQuery).select('_id').lean();
      targetUserIds = targetUsers.map(u => (u._id as Types.ObjectId).toString());
      console.log(`[Push Send] Broadcast mode. Category: ${category || 'all'}, Total matched users: ${targetUserIds.length}`);
    }

    // 3. Save Notification History
    if (targetUserIds.length > 0) {
      try {
        const historyData = targetUserIds.map(uid => ({
          userId: uid,
          title: title || "New Message",
          message: message || "You have a new update",
          url: url || "/dashboard",
          isRead: false
        }));
        await Notification.insertMany(historyData);
      } catch (histErr) {
        console.error("❌ Failed to bulk save notification history:", histErr);
      }
    }

    // 4. Send Push Notifications
    const pushQuery = { userId: { $in: targetUserIds } };
    const subscriptions = await PushSubscription.find(pushQuery).lean<SubscriptionDocument[]>();

    if (subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No subscriptions found for target users.",
        sentCount: 0
      });
    }

    const payload = JSON.stringify({
      title: title || "New Message",
      body: message || "You have a new update",
      url: url || "/dashboard",
      icon: icon || "/assets/icon-192.png",
      image: image || undefined
    });

    const results = await Promise.all(
      subscriptions.map((sub: SubscriptionDocument) =>
        webpush.sendNotification(sub.subscription as webpush.PushSubscription, payload)
          .then(() => ({ success: true, userId: sub.userId }))
          .catch(async (err: { statusCode?: number; message?: string }) => {
            console.error(`❌ Push Error for ${sub.userId}:`, err.message || err.statusCode);
            if (err.statusCode === 410 || err.statusCode === 404) {
              await PushSubscription.deleteOne({ _id: sub._id });
              return { success: false, userId: sub.userId, reason: 'Expired' };
            }
            return { success: false, userId: sub.userId, reason: err.message || err.statusCode };
          })
      )
    );

    const successful = results.filter(r => r.success).length;
    return NextResponse.json({
      success: true,
      sentCount: successful,
      totalSubscriptions: subscriptions.length
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown Error";
    console.error("Critical Send Error:", errorMessage);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}