/* global self */
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: self?.env?.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: self?.env?.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: self?.env?.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: self?.env?.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: self?.env?.NEXT_PUBLIC_FIREBASE_APP_ID
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage(function(payload) {
  const notificationTitle = payload.notification?.title || 'ハチカイ'
  const notificationOptions = { body: payload.notification?.body || '' }
  self.registration.showNotification(notificationTitle, notificationOptions)
})

