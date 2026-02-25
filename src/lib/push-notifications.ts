const VAPID_KEY_CACHE = new Map<string, Uint8Array>();

function urlBase64ToUint8Array(base64String: string) {
  if (VAPID_KEY_CACHE.has(base64String)) return VAPID_KEY_CACHE.get(base64String)!;

  try {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    VAPID_KEY_CACHE.set(base64String, outputArray);
    return outputArray;
  } catch (error) {
    console.error("VAPID Key Conversion Error:", error);
    throw new Error("Failed to parse push notification key.");
  }
}

export async function subscribeUserToPush() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.warn("⚠️ Push notifications not supported: No Service Worker in navigator");
    throw new Error("Push notifications are not supported on this browser.");
  }

  if (!('PushManager' in window)) {
    console.warn("⚠️ PushManager not available");
    throw new Error("Your browser does not support receiving push messages.");
  }

  try {
    console.log("🛠️ Registering/Waking Service Worker...");
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

    // Aggressively force any waiting or installing worker to become active
    if (reg.waiting) {
      console.log("⏳ Forcing waiting Service Worker to activate...");
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    }

    if (reg.installing) {
      console.log("⏳ Worker is installing. Waiting for it to finish and forcing activation...");
      reg.installing.addEventListener('statechange', (e) => {
        if ((e.target as ServiceWorker).state === 'installed') {
          (e.target as ServiceWorker).postMessage({ type: 'SKIP_WAITING' });
        }
      });
    }

    // While worker prepares, ask for permission (Parallel)
    if ('Notification' in window && Notification.permission !== 'granted') {
      console.log("🔔 Asking for permission...");
      // Wrap requestPermission to handle both Promise (modern) and Callback (legacy Safari) APIs
      const permission = await new Promise<NotificationPermission>((resolve) => {
        const promise = Notification.requestPermission((result) => resolve(result));
        if (promise) {
          promise.then(resolve);
        }
      });
      if (permission !== 'granted') {
        throw new Error("Notification permission was not granted.");
      }
    }

    // Wait for the worker to be truly ACTIVE
    console.log("⏳ Waiting for Service Worker to be fully ACTIVE...");

    // We update the registration to ensure we aren't stuck on a stale worker
    try { await reg.update(); } catch (e) { console.warn("SW Update failed (ignored)", e); }

    const readyRegistration = await new Promise<ServiceWorkerRegistration>((resolve, reject) => {
      // 1. Fast path: already active
      if (reg.active) {
        return resolve(reg);
      }

      let hasResolved = false;

      // 2. Setup a clear timeout
      const timeout = setTimeout(() => {
        if (hasResolved) return;
        clearInterval(interval);
        reject(new Error("Service Worker took too long to activate. Please refresh the page and try again."));
      }, 15000);

      const finish = (r: ServiceWorkerRegistration) => {
        if (hasResolved) return;
        hasResolved = true;
        clearInterval(interval);
        clearTimeout(timeout);
        resolve(r);
      };

      // 3. Aggressively poll for activation
      const interval = setInterval(() => {
        // Kick any waiting worker to skip waiting
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }

        if (reg.active) {
          finish(reg);
        }
      }, 250);

      // 4. Also listen to native ready as a fallback
      navigator.serviceWorker.ready.then((r) => {
        if (r.active) {
          finish(r);
        }
      }).catch(() => { });
    });

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
        const convertedVapidKey = urlBase64ToUint8Array(publicKey);
        subscription = await readyRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          applicationServerKey: convertedVapidKey as any
        });
        console.log("✅ New Subscription successfully created");
      } catch (subErr: unknown) {
        let subMessage = "Unknown reason";
        if (subErr instanceof Error) {
          subMessage = subErr.message;
        } else if (typeof subErr === 'string') {
          subMessage = subErr;
        }
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
    const unknownErrorMsg = typeof err === 'string' ? err : JSON.stringify(err);
    console.error("❌ subscribeUserToPush Unknown Failure:", unknownErrorMsg);
    throw new Error(`Unknown Push Error: ${unknownErrorMsg}`);
  }
}
