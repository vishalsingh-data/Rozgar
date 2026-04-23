import { initializeApp, getApp, getApps } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const initializeMessaging = async (workerId: string) => {
  if (typeof window === 'undefined') return;
  if (!('Notification' in window)) return; // unsupported browser

  try {
    const messaging = getMessaging(app);

    // 1. Request Permission (non-blocking — don't fail dashboard if denied)
    let permission: NotificationPermission;
    try {
      permission = await Notification.requestPermission();
    } catch {
      permission = Notification.permission;
    }
    if (permission !== 'granted') {
      console.warn('[FCM] Notification permission not granted — push disabled');
      return;
    }

    // 2. Get Token — can fail if FCM push service is unreachable (network / firewall)
    let token: string | null = null;
    try {
      token = await Promise.race<string | null>([
        getToken(messaging, { vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000)), // 8 s timeout
      ]);
    } catch (tokenErr: any) {
      // AbortError = push service unreachable (network / dev environment)
      // Just warn — this is not fatal
      console.warn('[FCM] Push subscription failed (non-fatal):', tokenErr?.message ?? tokenErr);
      return;
    }

    if (!token) {
      console.warn('[FCM] No registration token — push service may be unreachable');
      return;
    }

    // 3. Save Token to Backend
    await fetch('/api/workers/save-fcm-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ worker_id: workerId, fcm_token: token }),
    });

    // 4. Handle Foreground Messages
    onMessage(messaging, (payload) => {
      console.log('[FCM] Foreground message:', payload);
    });

  } catch (error: any) {
    // Catch-all — never crash the dashboard for a notification failure
    console.warn('[FCM] Messaging init skipped:', error?.message ?? error);
  }
};

export { app };
