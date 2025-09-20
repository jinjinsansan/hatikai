import { initializeApp, getApps } from 'firebase/app'
import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
}

export function getFirebaseApp() {
  if (!getApps().length) initializeApp(firebaseConfig)
  return getApps()[0]
}

export async function initMessaging(): Promise<{ token: string | null }> {
  const supported = await isSupported().catch(() => false)
  if (!supported) return { token: null }
  const app = getFirebaseApp()
  const messaging = getMessaging(app)
  const vapidKey = process.env.NEXT_PUBLIC_FCM_VAPID_KEY
  try {
    const token = await getToken(messaging, { vapidKey })
    return { token }
  } catch (e) {
    return { token: null }
  }
}

