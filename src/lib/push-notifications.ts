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
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  try {
    console.log("🛠️ Starting Push Subscription setup...");

    // 1. Get current registration or register immediately
    let registration = await navigator.serviceWorker.getRegistration();

    if (!registration) {
      console.log("🛰️ No registration found. Registering /sw.js manually...");
      registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      // Wait a bit for it to start installing
      await new Promise(r => setTimeout(r, 500));
    }

    console.log("🔍 SW State:", registration.active ? "Active" : registration.installing ? "Installing" : "Waiting");

    // 2. Ensure the Service Worker is ACTIVE before subscribing
    const waitForActive = (reg: ServiceWorkerRegistration): Promise<ServiceWorkerRegistration> => {
      if (reg.active) return Promise.resolve(reg);
      return new Promise((resolve) => {
        const worker = reg.installing || reg.waiting;
        if (worker) {
          worker.addEventListener('statechange', (e) => {
            if ((e.target as ServiceWorker).state === 'activated') resolve(reg);
          });
        } else {
          // If no worker is even installing, just wait for ready which usually works
          navigator.serviceWorker.ready.then(resolve);
        }
      });
    };

    const timeout = (ms: number) => new Promise((_, rej) => setTimeout(() => rej(new Error("SW_TIMEOUT")), ms));

    try {
      // Wait for either .ready OR our manual active check
      registration = (await Promise.race([
        navigator.serviceWorker.ready,
        waitForActive(registration),
        timeout(5000)
      ])) as ServiceWorkerRegistration;
    } catch (_e) {
      console.warn("⚠️ SW Activation took too long, proceeding with current handle.");
    }

    if (!registration.active) {
      console.warn("🕒 SW still not active. Waiting one more second...");
      await new Promise(r => setTimeout(r, 1000));
    }

    if (!registration) throw new Error("Service Worker registration not available.");
    console.log("✅ Using Registration Scope:", registration.scope, "Active:", !!registration.active);

    // Cast to unknown then type to avoid 'any' lint error
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || (window as unknown as { NEXT_PUBLIC_VAPID_PUBLIC_KEY?: string }).NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    console.log("🔑 VAPID Key Present:", !!publicKey, publicKey ? (publicKey.substring(0, 10) + "...") : "MISSING");

    if (!publicKey) {
      console.error("❌ Push Sub Error: NEXT_PUBLIC_VAPID_PUBLIC_KEY is missing in environment variables.");
      throw new Error("VAPID Public Key missing");
    }

    let subscription = await registration.pushManager.getSubscription();
    console.log("📦 Existing Subscription:", subscription ? "Yes" : "No");

    if (!subscription) {
      console.log("🛰️ Creating new subscription...");
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });
      console.log("✅ New Subscription Created");
    }

    console.log("📡 Sending subscription to server...");
    const response = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      body: JSON.stringify(subscription),
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("❌ Server rejected subscription:", errorData);
      throw new Error(`Server error: ${response.status}`);
    }

    console.log("✅ Push Subscription Updated for this device.");
    return true;
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error("❌ Push Sub Error:", err.message);
      throw err;
    }
    throw new Error("Unknown Push Error");
  }
}