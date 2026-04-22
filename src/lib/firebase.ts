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

  try {
    const messaging = getMessaging(app);

    // 1. Request Permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission not granted');
      return;
    }

    // 2. Get Token
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    });

    if (token) {
      console.log('FCM Token generated:', token);
      
      // 3. Save Token to Backend
      await fetch('/api/workers/save-fcm-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ worker_id: workerId, fcm_token: token }),
      });
    } else {
      console.warn('No registration token available. Request permission to generate one.');
    }

    // 4. Handle Foreground Messages
    onMessage(messaging, (payload) => {
      console.log('Foreground Message received:', payload);
      // We can use Sonner or browser notification here
    });

  } catch (error) {
    console.error('Error initializing Firebase Messaging:', error);
  }
};

export { app };
