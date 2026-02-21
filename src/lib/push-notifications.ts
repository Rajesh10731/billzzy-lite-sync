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

export async function subscribeUserToPush() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.warn("⚠️ Push notifications not supported: No Service Worker in navigator");
    return;
  }

  try {
    console.log("🛠️ Starting Push Subscription phase...");

    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        console.log("🔔 Requesting notification permission...");
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          throw new Error("Notification permission was not granted.");
        }
      } else if (Notification.permission === 'denied') {
        throw new Error("Notifications are blocked in browser settings.");
      }
    }

    // 1. Wait for the Service Worker to be READY with a timeout
    // Mobile browsers can sometimes hang on .ready if the SW is in a weird state
    const swTimeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Service Worker registration timed out (10s)")), 10000);
    });

    const registration = await Promise.race([
      navigator.serviceWorker.ready,
      swTimeout
    ]) as ServiceWorkerRegistration;

    if (!registration.active) {
      console.error("❌ SW Error: Registration ready but No Active worker found.");
      throw new Error("Service Worker not active - try reloading the app");
    }

    console.log("✅ Service Worker active and ready at scope:", registration.scope);

    // 2. VAPID Key validation
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    console.log("🔑 VAPID Key Present:", !!publicKey, publicKey ? (publicKey.substring(0, 10) + "...") : "MISSING");

    if (!publicKey) {
      console.error("❌ Push Sub Error: NEXT_PUBLIC_VAPID_PUBLIC_KEY is missing.");
      throw new Error("VAPID Public Key missing from environment");
    }

    // 3. Subscription Management
    let subscription = await registration.pushManager.getSubscription();
    console.log("📦 Existing Subscription check:", subscription ? "Found" : "None");

    if (!subscription) {
      console.log("🛰️ Requesting new push subscription...");
      try {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey)
        });
        console.log("✅ New Subscription successfully created");
      } catch (subErr: unknown) {
        const subMessage = subErr instanceof Error ? subErr.message : 'Unknown reason';
        console.error("❌ Failed to create new subscription:", subErr);
        throw new Error(`Browser subscription failed: ${subMessage}`);
      }
    } else {
      console.log("♻️ User already has a subscription. Synchronizing with server...");
    }

    // 4. Server Sync
    console.log("📡 Sending subscription snapshot to server...");
    const response = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      body: JSON.stringify(subscription),
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("❌ Server sync failed:", response.status, errorData);
      throw new Error(`Server failed to save subscription (Status: ${response.status})`);
    }

    console.log("🎉 Push Subscription workflow complete.");
    return true;
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error("❌ subscribeUserToPush Critical Failure:", err.message);
      throw err;
    }
    throw new Error("Unknown Push Error occurred during subscription sequence");
  }
}
