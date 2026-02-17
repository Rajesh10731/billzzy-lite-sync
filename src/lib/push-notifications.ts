// export async function subscribeUserToPush() {
//   if ('serviceWorker' in navigator) {
//     const registration = await navigator.serviceWorker.ready;

//     // Check if subscription already exists
//     const existingSubscription = await registration.pushManager.getSubscription();
//     if (existingSubscription) return;

//     const response = await registration.pushManager.subscribe({
//       userVisibleOnly: true,
//       applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!)
//     });

//     await fetch('/api/notifications/subscribe', {
//       method: 'POST',
//       body: JSON.stringify(response),
//       headers: { 'Content-Type': 'application/json' }
//     });
//   }
// }

// function urlBase64ToUint8Array(base64String: string) {
//   const padding = '='.repeat((4 - base64String.length % 4) % 4);
//   const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
//   const rawData = window.atob(base64);
//   const outputArray = new Uint8Array(rawData.length);
//   for (let i = 0; i < rawData.length; ++i) {
//     outputArray[i] = rawData.charCodeAt(i);
//   }
//   return outputArray;
// }

// src/lib/push-notifications.ts

export async function subscribeUserToPush() {
  if (!('serviceWorker' in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) throw new Error("VAPID Public Key missing");

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });
    }

    // This POSTs to /api/notifications/subscribe
    const res = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      body: JSON.stringify(subscription),
      headers: { 'Content-Type': 'application/json' },
    });

    if (res.ok) console.log("✅ Push subscription synced with server");
  } catch (err) {
    console.error("❌ Push registration failed:", err);
  }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}