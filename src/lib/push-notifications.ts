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
      if (Notification.permission !== 'granted') {
        console.log("🔔 Requesting notification permission...");
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          throw new Error("Notification permission was not granted.");
        }
      }
    }

    // 1. Wait for the Service Worker to be READY with a timeout
    let registration: ServiceWorkerRegistration | undefined;

    // TRY A QUICK CHECK FIRST: See if we ALREADY have an active registration
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      registration = registrations.find(r => r.active || r.waiting || r.installing);
      if (registration) {
        console.log("♻️ Existing Service Worker found:", registration.scope);
      }
    } catch (regErr) {
      console.warn("⚠️ getRegistrations check failed:", regErr);
    }

    // IF NO REGISTRATION OR NOT ACTIVE, ATTEMPT REGISTRATION IMMEDIATELY
    if (!registration || !registration.active) {
      console.log("🛠️ Registering/Activating Service Worker (/sw.js)...");
      try {
        registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        console.log("✅ Registration object obtained.");
      } catch (regErr) {
        console.error("❌ Registration failed:", regErr);
        throw new Error("Failed to register Service Worker. Ensure you are not in Incognito mode.");
      }
    }

    // CRITICAL: If the worker is already active, we DON'T need to wait for .ready (which can hang)
    if (registration?.active?.state === 'activated') {
      console.log("⚡ Service Worker is already ACTIVE. Bypassing .ready wait.");
    } else {
      console.log("⏳ Waiting for .ready with 30s timeout...");
      const swTimeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Setup Timeout (30s). This usually happens on Android (Redmi/Realme) if 'Battery Saver' is on or 'Background Data' is restricted for your browser.")), 30000);
      });

      try {
        registration = await Promise.race([
          navigator.serviceWorker.ready,
          swTimeout
        ]) as ServiceWorkerRegistration;
      } catch (timeoutErr) {
        console.error("❌ SW Ready timeout:", timeoutErr);
        throw timeoutErr;
      }
    }

    if (!registration || !registration.active) {
      console.warn("⚠️ Registration found but not active. Waiting for activation...");
      await new Promise(resolve => setTimeout(resolve, 2000));
      if (!registration?.active) {
        throw new Error("Service Worker failed to activate. If you are on a Redmi phone, please disable 'Battery Saver' for this browser.");
      }
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
