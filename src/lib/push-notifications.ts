const VAPID_KEY_CACHE = new Map<string, Uint8Array>();

function urlBase64ToUint8Array(base64String: string) {
  if (VAPID_KEY_CACHE.has(base64String)) return VAPID_KEY_CACHE.get(base64String)!;

  try {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replaceAll('-', '+').replaceAll('_', '/');
    const rawData = window.atob(base64);
    
    // Optimized for speed on older devices
    const outputArray = Uint8Array.from(rawData, (c) => c.codePointAt(0)!);
    
    VAPID_KEY_CACHE.set(base64String, outputArray);
    return outputArray;
  } catch (error) {
    console.error("VAPID Key Conversion Error:", error);
    throw new Error("Failed to parse push notification key.");
  }
}

function checkBrowserSupport() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.warn("⚠️ Push notifications not supported: No Service Worker in navigator");
    throw new Error("Push notifications are not supported on this browser.");
  }

  if (!('PushManager' in window)) {
    console.warn("⚠️ PushManager not available");
    throw new Error("Your browser does not support receiving push messages.");
  }
}

async function requestNotificationPermission() {
  if (!('Notification' in window) || Notification.permission === 'granted') {
    return Notification.permission;
  }

  console.log("🔔 Asking for permission...");
  return await new Promise<NotificationPermission>((resolve) => {
    const promise = Notification.requestPermission((result) => resolve(result));
    if (typeof promise !== 'undefined') {
      promise.then(resolve);
    }
  });
}

async function waitForServiceWorkerActive(reg: ServiceWorkerRegistration): Promise<ServiceWorkerRegistration> {
  console.log("⏳ Waiting for Service Worker to be fully ACTIVE...");
  
  // Update to ensure no stale worker
  try { await reg.update(); } catch (e) { console.warn("SW Update failed (ignored)", e); }

  if (reg.active) return reg;

  return new Promise((resolve, reject) => {
    let hasResolved = false;
    const timeout = setTimeout(() => {
      if (hasResolved) return;
      clearInterval(interval);
      reject(new Error("Service Worker took too long to activate. Please refresh the page."));
    }, 15000);

    const finish = (r: ServiceWorkerRegistration) => {
      if (hasResolved) return;
      hasResolved = true;
      clearInterval(interval);
      clearTimeout(timeout);
      resolve(r);
    };

    const interval = setInterval(() => {
      if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      if (reg.active) finish(reg);
    }, 250);

    navigator.serviceWorker.ready.then(r => r.active && finish(r)).catch(() => {});
  });
}

async function getOrCreateSubscription(reg: ServiceWorkerRegistration): Promise<PushSubscription> {
  if (!reg.pushManager) {
    throw new Error("Push notifications are not supported by your browser's current configuration.");
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) {
    console.error("❌ Push Sub Error: NEXT_PUBLIC_VAPID_PUBLIC_KEY is missing.");
    throw new Error("VAPID Public Key missing from environment");
  }

  let subscription = await reg.pushManager.getSubscription();
  if (subscription) {
    console.log("♻️ Existing subscription found.");
    return subscription;
  }

  console.log("🛰️ Requesting new push subscription...");
  try {
    const convertedVapidKey = urlBase64ToUint8Array(publicKey);
    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      applicationServerKey: convertedVapidKey as any
    });
    console.log("✅ New Subscription successfully created");
    return subscription!;
  } catch (subErr: unknown) {
    const msg = subErr instanceof Error ? subErr.message : String(subErr);
    console.error("❌ Failed to create new subscription:", subErr);
    throw new Error(`Browser subscription failed: ${msg}`);
  }
}

function syncSubscriptionWithServer(subscription: PushSubscription) {
  console.log("📡 Triggering server synchronization (background)...");
  fetch('/api/notifications/subscribe', {
    method: 'POST',
    body: JSON.stringify(subscription),
    headers: { 'Content-Type': 'application/json' },
  }).then(async (res) => {
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      console.error("❌ Server sync failed:", res.status, data);
    } else {
      console.log("📡 Server sync complete.");
    }
  }).catch(err => console.error("❌ Network error during sync:", err));
}

function handlePushError(err: unknown): never {
  if (err instanceof Error) {
    console.error("❌ subscribeUserToPush Critical Failure:", err.message);
    throw err;
  }
  const msg = typeof err === 'string' ? err : JSON.stringify(err);
  console.error("❌ subscribeUserToPush Unknown Failure:", msg);
  throw new Error(`Unknown Push Error: ${msg}`);
}

export async function subscribeUserToPush() {
  checkBrowserSupport();

  try {
    console.log("🛠️ Registering Service Worker...");
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

    // Activation management
    if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    if (reg.installing) {
      reg.installing.addEventListener('statechange', (e) => {
        if ((e.target as ServiceWorker).state === 'installed') {
          (e.target as ServiceWorker).postMessage({ type: 'SKIP_WAITING' });
        }
      });
    }

    const [permission, readyReg] = await Promise.all([
      requestNotificationPermission(),
      waitForServiceWorkerActive(reg)
    ]);

    if (permission !== 'granted') {
      throw new Error("Notification permission was not granted.");
    }

    const subscription = await getOrCreateSubscription(readyReg);
    syncSubscriptionWithServer(subscription);

    console.log("🎉 Push Subscription logic triggered.");
    return true;
  } catch (err) {
    return handlePushError(err);
  }
}

