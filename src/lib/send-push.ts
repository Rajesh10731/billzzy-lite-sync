import webpush from 'web-push';
import PushSubscription from '@/models/PushSubscription';

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function sendPushNotification(userId: string, title: string, body: string, url: string = '/') {
  const subscriptions = await PushSubscription.find({ userId });

  const notifications = subscriptions.map((sub) => {
    return webpush.sendNotification(
      sub.subscription,
      JSON.stringify({ title, body, url })
    ).catch(async (err) => {
      if (err.statusCode === 404 || err.statusCode === 410) {
        // Remove expired subscriptions
        await PushSubscription.deleteOne({ _id: sub._id });
      }
    });
  });

  await Promise.all(notifications);
}