// Scripts for firebase and firebase-messaging
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker
// IMPORTANT: Replace these placeholders with your actual Firebase config
firebase.initializeApp({
  apiKey: "AIzaSyBo8MrZw68cmhuwH9G3pBX6o_FjrE2iwU0",
  authDomain: "rozgar-a05c6.firebaseapp.com",
  projectId: "rozgar-a05c6",
  storageBucket: "rozgar-a05c6.firebasestorage.app",
  messagingSenderId: "479828673863",
  appId: "1:479828673863:web:0fb487607523d63892b862"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon-192.png',
    data: payload.data, // This contains the job URL and other metadata
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click to open specific job pages
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open at that URL, focus it
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise, open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
