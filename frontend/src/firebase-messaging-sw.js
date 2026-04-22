importScripts('https://www.gstatic.com/firebasejs/9.6.11/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.6.11/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCBII2E72DiTXfMWyRLoQ2JGtz9EZ1TXks",
  authDomain: "gens-7d05d.firebaseapp.com",
  projectId: "gens-7d05d",
  storageBucket: "gens-7d05d.firebasestorage.app",
  messagingSenderId: "683749483987",
  appId: "1:683749483987:web:57fc25532aa7a7030efb26",
  measurementId: "G-DC6RY4EE0K"
});

const messaging = firebase.messaging();
messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification.title;
  const notificationOptions = { body: payload.notification.body };
  self.registration.showNotification(notificationTitle, notificationOptions);
});
