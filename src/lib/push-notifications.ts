// src/lib/push-notifications.ts

// 1. Helper function to convert the VAPID key
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

// 2. Main subscription function
export async function subscribeUserToPush() {
  if (typeof window === 'undefined') return;
  
  // Alert 1
  alert("1. Script started on phone");

  if (!('serviceWorker' in navigator)) {
    alert("Error: No Service Worker support");
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    alert("2. Service Worker is Ready");

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      alert("Error: VAPID Public Key is NULL (Check Vercel Env)");
      return;
    }

    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      alert("3. Creating new subscription...");
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });
    }

    alert("4. Sending to Server...");

    const res = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      body: JSON.stringify(subscription),
      headers: { 'Content-Type': 'application/json' },
    });

    if (res.ok) {
      alert("5. ✅ SUCCESS! Phone registered in DB");
    } else {
      alert("Error: Server rejected with status " + res.status);
    }
  } catch (err: unknown) {
    // FIX: Type-safe error handling to satisfy ESLint
    let message = "Unknown Error";
    if (err instanceof Error) message = err.message;
    alert("❌ CRASH: " + message);
  }
}