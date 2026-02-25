const VAPID_KEY_CACHE = new Map<string, Uint8Array>();

function urlBase64ToUint8Array(base64String: string) {
  if (VAPID_KEY_CACHE.has(base64String)) return VAPID_KEY_CACHE.get(base64String)!;

  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  VAPID_KEY_CACHE.set(base64String, outputArray);
  return outputArray;
}

export async function subscribeUserToPush() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.warn("⚠️ Push notifications not supported: No Service Worker in navigator");
    return;
  }

  try {
    console.log("🛠️ Registering/Waking Service Worker...");
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

    if (reg.waiting) {
      console.log("⏳ Forcing waiting Service Worker to activate...");
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    }

    // While worker prepares, ask for permission (Parallel)
    if ('Notification' in window && Notification.permission !== 'granted') {
      console.log("🔔 Asking for permission...");
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error("Notification permission was not granted.");
      }
    }

    // Wait for the worker to be ready (which means active)
    console.log("⏳ Waiting for Service Worker to be ready...");

    // Instead of complex polling, we simply wait for the worker to be ready
    // We add a tiny safety race in case `ready` never resolves, but mostly trust it
    const readyPromise = navigator.serviceWorker.ready;
    const fallbackRegistration = reg;

    // Give it a generous 10 seconds. If not, use the fallback registration.
    const readyRegistration = await Promise.race([
      readyPromise,
      new Promise<ServiceWorkerRegistration>(resolve => setTimeout(() => resolve(fallbackRegistration), 10000))
    ]);

    if (!readyRegistration.pushManager) {
      throw new Error("Push notifications are not supported by your browser's current configuration.");
    }

    console.log("✅ Worker prepared. Checking VAPID key...");

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      console.error("❌ Push Sub Error: NEXT_PUBLIC_VAPID_PUBLIC_KEY is missing.");
      throw new Error("VAPID Public Key missing from environment");
    }

    // Subscription Management
    let subscription = await readyRegistration.pushManager.getSubscription();
    console.log("📦 Existing Subscription check:", subscription ? "Found" : "None");

    if (!subscription) {
      console.log("🛰️ Requesting new push subscription...");
      try {
        subscription = await readyRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          applicationServerKey: urlBase64ToUint8Array(publicKey) as any
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

    // Server Sync (NON-BLOCKING for UI speed)
    console.log("📡 Triggering server synchronization (background)...");
    fetch('/api/notifications/subscribe', {
      method: 'POST',
      body: JSON.stringify(subscription),
      headers: { 'Content-Type': 'application/json' },
    }).then(async (response) => {
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("❌ Server sync failed in background:", response.status, errorData);
      } else {
        console.log("📡 Server sync complete.");
      }
    }).catch(err => {
      console.error("❌ Network error during background sync:", err);
    });

    console.log("🎉 Push Subscription logic triggered.");
    return true;
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error("❌ subscribeUserToPush Critical Failure:", err.message);
      throw err;
    }
    throw new Error("Unknown Push Error occurred during subscription sequence");
  }
}
