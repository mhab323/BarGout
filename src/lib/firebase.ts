import { initializeApp, type FirebaseOptions } from 'firebase/app'
import { browserLocalPersistence, connectAuthEmulator, indexedDBLocalPersistence, initializeAuth } from 'firebase/auth'
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'

export const useEmulators = import.meta.env.VITE_USE_EMULATORS === 'true'

const CONFIG_CACHE_KEY = 'bargout.firebaseConfig'

/**
 * Firebase web config. These values are public by design (they identify the project,
 * they do not grant access) - security comes from firestore.rules. Still, they are not
 * kept in this public repo:
 *  - local development: from .env.local (see .env.example), or the emulators
 *  - live on Firebase Hosting: Hosting serves the project's config at /__/firebase/init.json
 *    (cached on the device so the app also starts without internet)
 */
async function loadConfig(): Promise<FirebaseOptions> {
  if (useEmulators || import.meta.env.VITE_FIREBASE_API_KEY) {
    return {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? 'demo-key',
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'demo-bargout',
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    }
  }
  try {
    const res = await fetch('/__/firebase/init.json', { cache: 'no-cache' })
    if (!res.ok) throw new Error(`init.json ${res.status}`)
    const config = (await res.json()) as FirebaseOptions
    try {
      localStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify(config))
    } catch {
      /* private mode: fine, just not cached */
    }
    return config
  } catch (error) {
    try {
      const cached = localStorage.getItem(CONFIG_CACHE_KEY)
      if (cached) return JSON.parse(cached) as FirebaseOptions
    } catch {
      /* ignore */
    }
    throw error
  }
}

const firebaseConfig = await loadConfig()

export const app = initializeApp(firebaseConfig)

/**
 * Sessions stay on the device (tablets stay signed in). No popup/redirect helper here:
 * it would load Google's sign-in script on every page, including the guest page.
 * Google sign-in passes it only when the owner taps that button (see authState.ts).
 */
export const auth = initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence] })

/** Offline cache so the tablets keep working through short Wi-Fi drops. */
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
})

if (useEmulators) {
  // Same machine that serves the app, so a tablet on the Wi-Fi can test against the computer's emulators.
  const host = window.location.hostname
  connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true })
  connectFirestoreEmulator(db, host, 8080)
}
