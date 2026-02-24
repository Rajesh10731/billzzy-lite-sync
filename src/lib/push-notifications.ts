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
    // 1. Register and Wait for Service Worker Activation
    console.log("🛠️ Preparing background worker...");
    const registration = await (async () => {
      try {
        console.log("🛠️ Registering Service Worker (/sw.js)...");
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

        // If it's already active, return immediately
        if (reg.active) {
          console.log("✅ Worker is already ACTIVE.");
          return reg;
        }

        // If there's a worker waiting, force activation
        if (reg.waiting) {
          console.log("⏳ Worker is WAITING. Forcing activation...");
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }

        // Increased timeout (15s) and added a polling fallback to catch activation
        const swTimeout = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("The background system is taking too long to wake up. Please ensure your browser has 'Auto-start' enabled in system settings and try again.")), 15000);
        });

        console.log("⏳ Waiting for activation...");

        // Polling fallback in parallel with native .ready
        const pollingCheck = new Promise<ServiceWorkerRegistration>((resolve) => {
          const interval = setInterval(() => {
            if (reg.active) {
              clearInterval(interval);
              console.log("✅ Worker is ACTIVE (Caught by poll).");
              resolve(reg);
            }
          }, 500);

          // Cleanup interval after timeout
          setTimeout(() => clearInterval(interval), 15000);
        });

        return await Promise.race([navigator.serviceWorker.ready, swTimeout, pollingCheck]) as ServiceWorkerRegistration;
      } catch (err) {
        console.error("❌ Worker setup failed:", err);
        throw err;
      }
    })();

    // 2. WHILE worker is waking up, ask for permission (User Interaction path)
    if ('Notification' in window) {
      if (Notification.permission !== 'granted') {
        console.log("🔔 Requesting notification permission...");
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          throw new Error("Notification permission was not granted.");
        }
      }
    }

    if (!registration || !registration.active) {
      throw new Error("Service Worker failed to activate. If you are on a restricted device, please ensure battery optimizations are disabled for this browser.");
    }

    console.log("✅ Service Worker active and ready.");

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
