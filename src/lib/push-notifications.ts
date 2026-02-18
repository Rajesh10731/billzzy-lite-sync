// src/lib/push-notifications.ts

/**
 * Helper function to convert the VAPID string into a format
 * the browser's background engine (Service Worker) understands.
 */
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * This function registers your phone in your database.
 * Think of it like WhatsApp registering your phone number.
 */
export async function subscribeUserToPush() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  try {
    // 1. Wake up the background engine
    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    // 2. Get your VAPID Public Key from Vercel/Environment
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      console.error("VAPID Public Key is missing! Check Vercel Dashboard.");
      return;
    }

    // 3. Get the unique address (Token) for this device
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // If no address exists, create a new one
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });
    }

    // 4. Send this unique address to MongoDB so the Admin can find it
    const res = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      body: JSON.stringify(subscription),
      headers: { 'Content-Type': 'application/json' },
    });

    if (res.ok) {
      console.log("✅ SUCCESS: This device is now registered in MongoDB.");
    } else {
      console.error("❌ FAILED: Server rejected the registration.");
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown Error";
    console.error("❌ PUSH ERROR:", message);
  }
}