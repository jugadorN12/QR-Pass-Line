import { getApp, getApps, initializeApp } from 'firebase/app'
import { getAuth, indexedDBLocalPersistence, setPersistence } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyCEBMURnLR9qHpCstt-E4xlsUNWMTpMYdU',
  authDomain: 'qr-pass-line.firebaseapp.com',
  projectId: 'qr-pass-line',
  storageBucket: 'qr-pass-line.firebasestorage.app',
  messagingSenderId: '812800113571',
  appId: '1:812800113571:web:5829b2e63e1d8d763eb816',
}

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig)
export const auth = getAuth(firebaseApp)
export const db = getFirestore(firebaseApp)
void setPersistence(auth, indexedDBLocalPersistence)

export const secondaryApp = getApps().some((app) => app.name === 'member-creation')
  ? getApp('member-creation')
  : initializeApp(firebaseConfig, 'member-creation')
export const secondaryAuth = getAuth(secondaryApp)
