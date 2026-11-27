import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  updatePassword,
  sendPasswordResetEmail,
} from 'firebase/auth'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { auth, db, secondaryAuth } from '../lib/firebase'
import { ticketCode } from '../lib/ids'
import { defaultQrCatalog } from '../lib/qrCatalog'
import { formatCouponSchedule, checkCouponScheduleValidity, getCouponBaseDate } from '../lib/dateUtils'

import type { AppData, ClubEvent, CouponTemplateConfig, EventStatus, Limitation, QrCatalogItem, Role, Ticket, TicketItem, TicketKind, User, Venue } from '../types'
import { defaultCouponTemplate, defaultVenueVisibleButtons, isVenueEnabled } from '../types'

type AppContextValue = AppData & {
  loading: boolean
  currentUser: User | null
  activeVenue: Venue | null
  adminActiveVenueId?: string
  setAdminActiveVenue: (venueId: string) => void
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  updateName: (name: string) => Promise<void>
  updateUserPassword: (password: string) => Promise<void>
  addMember: (input: { name: string; email: string; password: string; role?: Role; roles?: Role[]; venueId?: string }) => Promise<void>
  createEvent: (input: Omit<ClubEvent, 'id' | 'createdAt' | 'createdBy' | 'status'> & { status?: EventStatus; venueId?: string }) => Promise<ClubEvent>

  updateEventStatus: (id: string, status: EventStatus) => Promise<void>
  deleteEvent: (id: string) => Promise<void>
  updateEvent: (id: string, updates: Partial<ClubEvent>) => Promise<void>
  issueTicket: (input: { eventId?: string; couponId?: string; kind: TicketKind; holderName: string; dni?: string; quantity?: number; menQuantity?: number; womenQuantity?: number; venueId?: string; eventDate?: string; items?: TicketItem[] }) => Promise<Ticket>

  redeemTicket: (code: string) => Promise<{ ok: true; ticket: Ticket;[key: string]: any } | { ok: false; message: string;[key: string]: any }>
  redeemTicketWithException: (code: string, customQuantity?: number, asException?: boolean) => Promise<{ ok: boolean; ticket?: Ticket; message?: string;[key: string]: any }>
  updateTicketQuantity: (ticketId: string, newQuantity: number) => Promise<{ ok: boolean; ticket?: Ticket; error?: string }>
  resetVenueTickets: (venueId: string) => Promise<number>

  saveQrItem: (item: QrCatalogItem) => Promise<void>
  deleteQrItem: (id: string) => Promise<void>
  saveLimitation: (limitation: Limitation) => Promise<void>
  deleteLimitation: (id: string) => Promise<void>
  updateUserRole: (userId: string, role?: Role, venueId?: string, roles?: Role[]) => Promise<void>
  deleteUser: (userId: string) => Promise<void>
  resetUserPasswordByEmail: (email: string) => Promise<void>
  adminResetPassword: (userId: string, newPassword: string) => Promise<void>
  createVenue: (input: Omit<Venue, 'id' | 'createdAt'>) => Promise<Venue>
  updateVenue: (id: string, updates: Partial<Venue>) => Promise<void>
  deleteVenue: (id: string) => Promise<void>
  replaceMember: (input: { oldUserId: string; name: string; email: string; password: string }) => Promise<User>
  createDemoVenue: (customLabel?: string) => Promise<{
    venue: Venue
    credentials: { roleLabel: string; name: string; email: string; password: string }[]
  }>
  saveCouponTemplate: (config: CouponTemplateConfig) => Promise<void>
  updateUserAvatar: (userId: string, avatarUrl: string) => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)
const emptyData: AppData = { users: [], events: [], tickets: [], qrCatalog: [], limitations: [], venues: [], couponTemplate: defaultCouponTemplate, session: null }

const ADMIN_EMAIL = 'simplemente_anibal@hotmail.com'

export function isMasterAdminEmail(email?: string | null): boolean {
  if (!email) return false
  return email.toLowerCase().trim() === ADMIN_EMAIL
}

function removeUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj
  if (Array.isArray(obj)) {
    return obj.map(removeUndefined) as unknown as T
  }
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const cleaned: Record<string, any> = {}
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = removeUndefined(value)
      }
    }
    return cleaned as T
  }
  return obj
}

function asUser(id: string, value: Record<string, unknown>): User {
  let role = (value.role as Role) ?? 'pendiente'
  if (role === ('validador' as any)) {
    role = 'canjeador'
  }
  if (String(value.email).toLowerCase() === 'gncesso@gmail.com' && role === 'admin') {
    role = 'organizador'
  }
  if (isMasterAdminEmail(String(value.email))) {
    role = 'admin'
  }
  const email = String(value.email ?? '')
  const name = String(value.name ?? (email ? email.split('@')[0] : 'Usuario'))
  const rawAvatar = String(value.avatar ?? '')
  const avatar = rawAvatar || (email ? `https://unavatar.io/${encodeURIComponent(email)}?fallback=https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=193659&color=fff` : '')

  let rawRoles = Array.isArray(value.roles) ? (value.roles as Role[]) : (role ? [role] : [])
  rawRoles = rawRoles.map((r) => (r === ('validador' as any) ? 'canjeador' : r)).filter(Boolean) as Role[]
  if (role && !rawRoles.includes(role)) {
    rawRoles.push(role)
  }

  return {
    id,
    name,
    email,
    role,
    roles: Array.from(new Set(rawRoles)),
    venueId: String(value.venueId ?? ''),
    avatar,
    mustChangePassword: false,
    tempPassword: '',
    createdAt: String(value.createdAt ?? new Date().toISOString()),
  }
}

export function isEntityForVenue(
  entityVenueId: string | undefined | null,
  targetVenueId: string | undefined | null,
  allVenues: Venue[]
): boolean {
  if (!targetVenueId) return true
  const cubanoVenue = allVenues.find((v) => (v.name || '').toLowerCase().includes('cubano')) || allVenues[0]
  const isTargetCubano = !cubanoVenue || targetVenueId === cubanoVenue.id

  if (!entityVenueId || entityVenueId.trim() === '') {
    return isTargetCubano
  }
  return entityVenueId === targetVenueId
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(emptyData)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let unsubscribeUsers: (() => void) | null = null
    let unsubscribeVenues: (() => void) | null = null
    let unsubscribeCouponTemplate: (() => void) | null = null
    let didLegacyCheck = false

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (unsubscribeUsers) {
        unsubscribeUsers()
        unsubscribeUsers = null
      }
      if (unsubscribeVenues) {
        unsubscribeVenues()
        unsubscribeVenues = null
      }
      if (unsubscribeCouponTemplate) {
        unsubscribeCouponTemplate()
        unsubscribeCouponTemplate = null
      }

      if (!firebaseUser) {
        localStorage.removeItem('qr-pass-line.cached-user')
        setData(emptyData)
        setLoading(false)
        return
      }

      // Visitante anónimo (página pública de invitaciones): no crear documento en /users ni cargar datos de staff
      if (firebaseUser.isAnonymous) {
        setLoading(false)
        return
      }

      try {
        const userDocRef = doc(db, 'users', firebaseUser.uid)
        const email = firebaseUser.email ? firebaseUser.email.toLowerCase() : ''

        // Check if we have a locally cached user profile to render instantly
        const cachedUserRaw = localStorage.getItem('qr-pass-line.cached-user')
        let initialUser: User | null = null
        if (cachedUserRaw) {
          try {
            const parsed = JSON.parse(cachedUserRaw)
            if (parsed && parsed.id === firebaseUser.uid) {
              initialUser = parsed
            }
          } catch { }
        }

        const cachedVenueKey = initialUser?.venueId || localStorage.getItem('qr-pass-line.admin-active-venue') || ''
        const readCachedArray = <T,>(baseKey: string): T[] => {
          if (!cachedVenueKey) return []
          try {
            const raw = localStorage.getItem(`${baseKey}.${cachedVenueKey}`)
            return raw ? (JSON.parse(raw) as T[]) : []
          } catch {
            return []
          }
        }

        const initialLimitations = readCachedArray<Limitation>('qr-pass-line.cached-limitations')
        const initialQrCatalog = readCachedArray<QrCatalogItem>('qr-pass-line.cached-qr-catalog')
        const initialEvents = readCachedArray<ClubEvent>('qr-pass-line.cached-events')

        let initialVenues: Venue[] = []
        try {
          const cachedVenuesRaw = localStorage.getItem('qr-pass-line.cached-venues')
          if (cachedVenuesRaw) initialVenues = JSON.parse(cachedVenuesRaw)
        } catch { }

        // Set quick initial state if cached to avoid any loading screen flicker
        if (initialUser) {
          setData((prev) => ({
            ...prev,
            users: prev.users.some((u) => u.id === initialUser!.id)
              ? prev.users
              : [initialUser!, ...prev.users],
            limitations: initialLimitations.length ? initialLimitations : prev.limitations,
            qrCatalog: initialQrCatalog.length ? initialQrCatalog : prev.qrCatalog,
            events: initialEvents.length ? initialEvents : prev.events,
            venues: initialVenues.length ? initialVenues : prev.venues,
            session: { userId: initialUser!.id },
          }))
          setLoading(false)
        }

        const profile = await getDoc(userDocRef)

        let currentUserObj: User
        if (!profile.exists()) {
          // Check if there was an existing user document by email (e.g. pre-created or alternate id)
          let existingUserDoc: any = null
          if (email) {
            try {
              const q = query(collection(db, 'users'), where('email', '==', email))
              const snap = await getDocs(q)
              if (!snap.empty) {
                existingUserDoc = snap.docs[0]
              }
            } catch { }
          }

          if (existingUserDoc) {
            const existingData = existingUserDoc.data()
            currentUserObj = {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || existingData.name || (email ? email.split('@')[0] : 'Usuario'),
              email,
              role: existingData.role || (isMasterAdminEmail(email) ? 'admin' : 'pendiente'),
              roles: existingData.roles || (existingData.role ? [existingData.role] : []),
              venueId: existingData.venueId || '',
              avatar: existingData.avatar || '',
              createdAt: existingData.createdAt || new Date().toISOString(),
            }
            await setDoc(userDocRef, currentUserObj)
            if (existingUserDoc.id !== firebaseUser.uid) {
              await deleteDoc(doc(db, 'users', existingUserDoc.id)).catch(() => { })
            }
          } else {
            const assignedRole: Role = isMasterAdminEmail(email) ? 'admin' : 'pendiente'
            currentUserObj = {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || (email ? email.split('@')[0] : 'Usuario'),
              email,
              role: assignedRole,
              roles: [assignedRole],
              createdAt: new Date().toISOString(),
            }
            await setDoc(userDocRef, currentUserObj)
          }
        } else {
          currentUserObj = asUser(firebaseUser.uid, profile.data())
          if (currentUserObj.email.toLowerCase() === 'gncesso@gmail.com' && currentUserObj.role === 'admin') {
            currentUserObj.role = 'organizador'
            const existingRoles = Array.isArray(currentUserObj.roles) ? currentUserObj.roles.filter(r => r !== 'admin') : []
            currentUserObj.roles = existingRoles.length ? existingRoles : ['organizador', 'vendedor', 'canjeador']
            await updateDoc(userDocRef, { role: 'organizador', roles: currentUserObj.roles }).catch(() => { })
          }
          // Forzar admin si es el mail configurado aunque el doc diga otra cosa
          if (isMasterAdminEmail(currentUserObj.email) && currentUserObj.role !== 'admin') {
            currentUserObj.role = 'admin'
            await updateDoc(userDocRef, { role: 'admin' })
          }
        }

        localStorage.setItem('qr-pass-line.cached-user', JSON.stringify(currentUserObj))

        const isMasterUser =
          isMasterAdminEmail(currentUserObj.email) ||
          currentUserObj.role === 'admin' ||
          Boolean(currentUserObj.roles?.includes('admin'))

        const myVenueId = currentUserObj.venueId || ''

        // Cargar locales y usuarios según nivel de acceso (Super Admin vs Local independiente)
        let venues: Venue[] = []
        let allUsers: User[] = [currentUserObj]

        if (isMasterUser) {
          const [usersSnapshot, venuesSnapshot, settingsSnapshot] = await Promise.all([
            getDocs(collection(db, 'users')),
            getDocs(collection(db, 'venues')),
            getDoc(doc(db, 'settings', 'couponTemplate')).catch(() => null),
          ])

          const userMap = new Map<string, User>()
          for (const rawUser of usersSnapshot.docs.map((item) => asUser(item.id, item.data()))) {
            const key = rawUser.email ? rawUser.email.toLowerCase() : rawUser.id
            if (!userMap.has(key)) {
              userMap.set(key, rawUser)
            } else {
              const existing = userMap.get(key)!
              if (rawUser.id === firebaseUser.uid || (rawUser.role !== 'pendiente' && existing.role === 'pendiente')) {
                userMap.set(key, rawUser)
              }
            }
          }
          if (!userMap.has(currentUserObj.email.toLowerCase())) {
            userMap.set(currentUserObj.email.toLowerCase(), currentUserObj)
          }
          allUsers = Array.from(userMap.values())

          // Limpieza de seguridad: eliminar contraseñas provisorias en texto plano de Firestore
          for (const docSnap of usersSnapshot.docs) {
            const uData = docSnap.data()
            if (uData.tempPassword || uData.mustChangePassword) {
              updateDoc(doc(db, 'users', docSnap.id), {
                tempPassword: '',
                mustChangePassword: false,
              }).catch(() => { })
            }
          }

          venues = venuesSnapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Venue))

          let couponTemplate: CouponTemplateConfig = defaultCouponTemplate
          if (settingsSnapshot && (settingsSnapshot as any).exists && (settingsSnapshot as any).exists()) {
            couponTemplate = { ...defaultCouponTemplate, ...(settingsSnapshot as any).data() }
          }
          localStorage.setItem('qr-pass-line.coupon-template', JSON.stringify(couponTemplate))

          try {
            localStorage.setItem('qr-pass-line.cached-venues', JSON.stringify(venues))
          } catch { }

          setData((prev) => ({
            ...prev,
            users: allUsers,
            venues,
            couponTemplate,
            session: { userId: currentUserObj.id },
          }))

          // Normalización única en segundo plano para asegurar que datos antiguos sin venueId pertenezcan a Cubano
          // y que Cubano / Joseo tengan su dirección base de Valentin Gomez 3085 (50m) si aún no tienen GPS
          if (!didLegacyCheck && venues.length > 0) {
            didLegacyCheck = true
            const cubanoVenue = venues.find((v) => (v.name || '').toLowerCase().includes('cubano')) || venues[0]
            if (cubanoVenue) {
              void (async () => {
                try {
                  for (const v of venues) {
                    const lowerName = (v.name || '').toLowerCase()
                    if ((lowerName.includes('cubano') || lowerName.includes('joseo')) && (!v.latitude || !v.longitude)) {
                      await updateDoc(doc(db, 'venues', v.id), {
                        address: v.address || 'Valentin Gomez 3085, Gregorio de Laferrere',
                        latitude: -34.7447619,
                        longitude: -58.5914687,
                        radius: v.radius || 50,
                        isActive: v.isActive ?? true,
                      }).catch(() => { })
                    }
                  }
                  const collectionsToNormalize = ['users', 'events', 'qrCatalog', 'limitations'] as const
                  for (const colName of collectionsToNormalize) {
                    const snap = await getDocs(collection(db, colName))
                    const docsWithoutVenue = snap.docs.filter((d) => {
                      const vId = d.data()?.venueId
                      const emailVal = String(d.data()?.email || '').toLowerCase()
                      if (colName === 'users' && isMasterAdminEmail(emailVal)) return false
                      return !vId || String(vId).trim() === ''
                    })
                    if (docsWithoutVenue.length > 0) {
                      for (let i = 0; i < docsWithoutVenue.length; i += 400) {
                        const batch = writeBatch(db)
                        docsWithoutVenue.slice(i, i + 400).forEach((d) => {
                          batch.update(d.ref, { venueId: cubanoVenue.id })
                        })
                        await batch.commit()
                      }
                    }
                  }
                } catch (err) {
                  console.warn('Aviso normalización venueId:', err)
                }
              })()
            }
          }

          unsubscribeUsers = onSnapshot(
            collection(db, 'users'),
            (snap) => {
              const liveUsers = snap.docs.map((item) => asUser(item.id, item.data()))
              const userMap = new Map<string, User>()
              for (const rawUser of liveUsers) {
                const key = rawUser.email ? rawUser.email.toLowerCase() : rawUser.id
                if (!userMap.has(key)) {
                  userMap.set(key, rawUser)
                } else {
                  const existing = userMap.get(key)!
                  if (rawUser.id === firebaseUser.uid || (rawUser.role !== 'pendiente' && existing.role === 'pendiente')) {
                    userMap.set(key, rawUser)
                  }
                }
              }
              const updatedUsers = Array.from(userMap.values())
              const updatedCurrentUser = updatedUsers.find((u) => u.id === firebaseUser.uid)
              if (updatedCurrentUser) {
                localStorage.setItem('qr-pass-line.cached-user', JSON.stringify(updatedCurrentUser))
              }
              setData((prev) => ({ ...prev, users: updatedUsers }))
            },
            (err) => {
              console.warn('Aviso sincronización de usuarios en vivo:', err)
            }
          )

          unsubscribeVenues = onSnapshot(
            collection(db, 'venues'),
            (snap) => {
              const liveVenues = snap.docs.map((item) => ({ id: item.id, ...item.data() } as Venue))
              try { localStorage.setItem('qr-pass-line.cached-venues', JSON.stringify(liveVenues)) } catch { }
              setData((prev) => ({ ...prev, venues: liveVenues }))
            },
            (err) => {
              console.warn('Aviso sincronización de locales:', err)
            }
          )

          unsubscribeCouponTemplate = onSnapshot(
            doc(db, 'settings', 'couponTemplate'),
            (docSnap) => {
              if (docSnap.exists()) {
                const liveTemplate: CouponTemplateConfig = { ...defaultCouponTemplate, ...docSnap.data() }
                localStorage.setItem('qr-pass-line.coupon-template', JSON.stringify(liveTemplate))
                setData((prev) => ({ ...prev, couponTemplate: liveTemplate }))
              }
            },
            (err) => {
              console.warn('Aviso sincronización de plantilla de cupón en vivo:', err)
            }
          )
        } else if (myVenueId) {
          // Usuario de un local específico: solo lee su local y los usuarios de SU local
          const [usersSnapshot, venueSnap] = await Promise.all([
            getDocs(query(collection(db, 'users'), where('venueId', '==', myVenueId))),
            getDoc(doc(db, 'venues', myVenueId)).catch(() => null),
          ])

          const userMap = new Map<string, User>()
          for (const rawUser of usersSnapshot.docs.map((item) => asUser(item.id, item.data()))) {
            const key = rawUser.email ? rawUser.email.toLowerCase() : rawUser.id
            if (!userMap.has(key)) {
              userMap.set(key, rawUser)
            }
          }
          userMap.set(currentUserObj.email.toLowerCase(), currentUserObj)
          allUsers = Array.from(userMap.values())

          if (venueSnap && venueSnap.exists()) {
            venues = [{ id: venueSnap.id, ...venueSnap.data() } as Venue]
            try { localStorage.setItem('qr-pass-line.cached-venues', JSON.stringify(venues)) } catch { }
          }

          setData((prev) => ({
            ...prev,
            users: allUsers,
            venues,
            session: { userId: currentUserObj.id },
          }))

          unsubscribeUsers = onSnapshot(
            query(collection(db, 'users'), where('venueId', '==', myVenueId)),
            (snap) => {
              const liveUsers = snap.docs.map((item) => asUser(item.id, item.data()))
              const userMap = new Map<string, User>()
              for (const rawUser of liveUsers) {
                const key = rawUser.email ? rawUser.email.toLowerCase() : rawUser.id
                if (!userMap.has(key)) userMap.set(key, rawUser)
              }
              const updatedUsers = Array.from(userMap.values())
              const updatedCurrentUser = updatedUsers.find((u) => u.id === firebaseUser.uid)
              if (updatedCurrentUser) {
                localStorage.setItem('qr-pass-line.cached-user', JSON.stringify(updatedCurrentUser))
              }
              setData((prev) => ({ ...prev, users: updatedUsers }))
            },
            (err) => {
              console.warn('Aviso sincronización de usuarios del local:', err)
            }
          )

          unsubscribeVenues = onSnapshot(
            doc(db, 'venues', myVenueId),
            (docSnap) => {
              if (docSnap.exists()) {
                const liveVenue = { id: docSnap.id, ...docSnap.data() } as Venue
                try { localStorage.setItem('qr-pass-line.cached-venues', JSON.stringify([liveVenue])) } catch { }
                setData((prev) => ({ ...prev, venues: [liveVenue] }))
              }
            },
            (err) => {
              console.warn('Aviso sincronización de local:', err)
            }
          )
        } else {
          // Usuario pendiente sin local asignado aún: solo escucha su propio documento
          setData((prev) => ({
            ...prev,
            users: [currentUserObj],
            events: [],
            tickets: [],
            limitations: [],
            qrCatalog: [],
            venues: [],
            session: { userId: currentUserObj.id },
          }))

          unsubscribeUsers = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
              const updatedMe = asUser(docSnap.id, docSnap.data())
              localStorage.setItem('qr-pass-line.cached-user', JSON.stringify(updatedMe))
              setData((prev) => ({ ...prev, users: [updatedMe] }))
            }
          })
        }
      } catch (error) {
        console.error('No se pudieron cargar los datos de Firebase.', error)
        const fallbackUser: User = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || 'Usuario',
          email: firebaseUser.email || '',
          role: 'pendiente',
          createdAt: new Date().toISOString(),
        }
        setData({
          users: [fallbackUser],
          events: [],
          tickets: [],
          qrCatalog: defaultQrCatalog(),
          limitations: [],
          venues: [],
          couponTemplate: defaultCouponTemplate,
          session: { userId: fallbackUser.id },
        })
      } finally {
        setLoading(false)
      }
    })

    return () => {
      if (unsubscribeUsers) unsubscribeUsers()
      if (unsubscribeVenues) unsubscribeVenues()
      if (unsubscribeCouponTemplate) unsubscribeCouponTemplate()
      unsubscribeAuth()
    }
  }, [])

  const currentUser = useMemo(
    () => data.users.find((user) => user.id === data.session?.userId) ?? null,
    [data.users, data.session],
  )

  const isMasterAdmin = isMasterAdminEmail(currentUser?.email) || currentUser?.role === 'admin' || currentUser?.roles?.includes('admin')

  const [adminSelectedVenueId, setAdminSelectedVenueId] = useState<string>(() => {
    return localStorage.getItem('qr-pass-line.admin-active-venue') || ''
  })

  const setAdminActiveVenue = (venueId: string) => {
    setAdminSelectedVenueId(venueId)
    if (venueId) {
      localStorage.setItem('qr-pass-line.admin-active-venue', venueId)
    } else {
      localStorage.removeItem('qr-pass-line.admin-active-venue')
    }
  }

  // Active venue for the logged in user
  const activeVenue = useMemo(() => {
    if (!currentUser) return null
    if (isMasterAdmin && adminSelectedVenueId) {
      const found = data.venues.find((v) => v.id === adminSelectedVenueId)
      if (found) return found
    }
    if (currentUser.venueId) {
      const found = data.venues.find((v) => v.id === currentUser.venueId)
      if (found) return found
    }
    if (isMasterAdmin) {
      const cubano = data.venues.find((v) => (v.name || '').toLowerCase().includes('cubano'))
      return cubano || data.venues[0] || null
    }
    return null
  }, [currentUser, data.venues, isMasterAdmin, adminSelectedVenueId])

  // Sincronización aislada por local activo (100% independiente entre clientes y escalable a 20+ locales)
  useEffect(() => {
    if (!currentUser) return
    const targetVenueId = activeVenue?.id || (!isMasterAdmin ? currentUser.venueId || '' : '')
    if (!targetVenueId) {
      setData((prev) => ({ ...prev, events: [], qrCatalog: [], limitations: [], tickets: [] }))
      return
    }

    // Cargar caché instantánea de este local si existe
    const readVenueCache = <T,>(baseKey: string): T[] => {
      try {
        const raw = localStorage.getItem(`${baseKey}.${targetVenueId}`)
        return raw ? (JSON.parse(raw) as T[]) : []
      } catch {
        return []
      }
    }
    const cachedEv = readVenueCache<ClubEvent>('qr-pass-line.cached-events')
    const cachedQr = readVenueCache<QrCatalogItem>('qr-pass-line.cached-qr-catalog')
    const cachedLim = readVenueCache<Limitation>('qr-pass-line.cached-limitations')
    if (cachedEv.length || cachedQr.length || cachedLim.length) {
      setData((prev) => ({
        ...prev,
        events: cachedEv,
        qrCatalog: cachedQr,
        limitations: cachedLim,
      }))
    } else {
      // Al cambiar de local (ej. Super Admin cambiando de boliche), limpiar estado anterior para evitar mezclas visuales
      setData((prev) => ({
        ...prev,
        events: [],
        qrCatalog: [],
        limitations: [],
        tickets: [],
      }))
    }

    const hasGlobalTicketAccess =
      Boolean(isMasterAdmin) ||
      currentUser.role === 'organizador' ||
      currentUser.role === 'supervisor' ||
      currentUser.role === 'canjeador' ||
      Boolean(currentUser.roles?.some((r) => r === 'admin' || r === 'organizador' || r === 'supervisor' || r === 'canjeador'))

    const recentCutoff = new Date()
    recentCutoff.setDate(recentCutoff.getDate() - 45)
    const recentCutoffIso = recentCutoff.toISOString()

    const eventsQuery = query(collection(db, 'events'), where('venueId', '==', targetVenueId))
    const qrQuery = query(collection(db, 'qrCatalog'), where('venueId', '==', targetVenueId))
    const limitationsQuery = query(collection(db, 'limitations'), where('venueId', '==', targetVenueId))
    const ticketsQuery = hasGlobalTicketAccess
      ? query(collection(db, 'tickets'), where('venueId', '==', targetVenueId), where('issuedAt', '>=', recentCutoffIso))
      : query(collection(db, 'tickets'), where('issuedBy', '==', currentUser.id), where('venueId', '==', targetVenueId))

    const unsubEvents = onSnapshot(
      eventsQuery,
      (snap) => {
        const liveEvents = snap.docs.map((item) => ({ id: item.id, ...item.data() } as ClubEvent))
        try { localStorage.setItem(`qr-pass-line.cached-events.${targetVenueId}`, JSON.stringify(liveEvents)) } catch { }
        setData((prev) => ({ ...prev, events: liveEvents }))
      },
      (err) => console.warn('Aviso sincronización de eventos del local:', err)
    )

    const unsubQr = onSnapshot(
      qrQuery,
      (snap) => {
        const liveCatalog = snap.docs.map((item) => ({ id: item.id, ...item.data() } as QrCatalogItem))
        try { localStorage.setItem(`qr-pass-line.cached-qr-catalog.${targetVenueId}`, JSON.stringify(liveCatalog)) } catch { }
        setData((prev) => ({ ...prev, qrCatalog: liveCatalog }))
      },
      (err) => console.warn('Aviso sincronización de cupones del local:', err)
    )

    const unsubLim = onSnapshot(
      limitationsQuery,
      (snap) => {
        const liveLim = snap.docs.map((item) => ({ id: item.id, ...item.data() } as Limitation))
        try { localStorage.setItem(`qr-pass-line.cached-limitations.${targetVenueId}`, JSON.stringify(liveLim)) } catch { }
        setData((prev) => ({ ...prev, limitations: liveLim }))
      },
      (err) => console.warn('Aviso sincronización de limitaciones del local:', err)
    )

    const unsubTickets = onSnapshot(
      ticketsQuery,
      (snap) => {
        const liveTickets = snap.docs.map((item) => ({ id: item.id, ...item.data() } as Ticket))
        setData((prev) => {
          const liveIds = new Set(liveTickets.map((t) => t.id))
          const extraTickets = prev.tickets.filter((t) => !liveIds.has(t.id) && t.venueId === targetVenueId)
          return { ...prev, tickets: [...liveTickets, ...extraTickets] }
        })
      },
      (err) => console.warn('Aviso sincronización de tickets del local:', err)
    )

    return () => {
      unsubEvents()
      unsubQr()
      unsubLim()
      unsubTickets()
    }
  }, [currentUser?.id, currentUser?.role, currentUser?.venueId, isMasterAdmin, activeVenue?.id])

  // Resolved coupon template (venue specific or global fallback)
  const resolvedCouponTemplate = useMemo(() => {
    if (activeVenue?.couponTemplate) return activeVenue.couponTemplate
    return data.couponTemplate || defaultCouponTemplate
  }, [activeVenue, data.couponTemplate])

  // Dynamic venue theme synchronization across CSS variables
  useEffect(() => {
    const root = document.documentElement
    if (activeVenue?.primaryColor) {
      const pColor = activeVenue.primaryColor
      const bStrong = activeVenue.brandStrongColor || '#180500'
      const bgGrad = activeVenue.backgroundColor && activeVenue.backgroundColor.includes('gradient')
        ? activeVenue.backgroundColor
        : `linear-gradient(135deg, ${bStrong} 0%, #3d1000 45%, ${pColor} 100%)`
      root.style.setProperty('--brand', pColor)
      root.style.setProperty('--brand-strong', bStrong)
      root.style.setProperty('--bg-gradient', bgGrad)
      root.style.setProperty('--brand-soft', `${pColor}20`)
      root.style.setProperty('--brand-glow', `${pColor}55`)
    } else {
      root.style.removeProperty('--brand')
      root.style.removeProperty('--brand-strong')
      root.style.removeProperty('--bg-gradient')
      root.style.removeProperty('--brand-soft')
      root.style.removeProperty('--brand-glow')
    }
  }, [activeVenue])

  const value: AppContextValue = {
    ...data,
    couponTemplate: resolvedCouponTemplate,
    loading,
    currentUser,
    activeVenue,
    adminActiveVenueId: adminSelectedVenueId,
    setAdminActiveVenue,
    async login(email, password) {
      await signInWithEmailAndPassword(auth, email.trim(), password)
    },
    async register(name, email, password) {
      const cleanEmail = email.trim().toLowerCase()
      const cleanName = name.trim()

      const credentials = await createUserWithEmailAndPassword(auth, cleanEmail, password)
      await updateProfile(credentials.user, { displayName: cleanName })

      const assignedRole: Role = isMasterAdminEmail(cleanEmail) ? 'admin' : 'pendiente'

      const profile: User = {
        id: credentials.user.uid,
        name: cleanName,
        email: cleanEmail,
        role: assignedRole,
        roles: [assignedRole],
        avatar: `https://unavatar.io/${encodeURIComponent(cleanEmail)}?fallback=https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=193659&color=fff`,
        createdAt: new Date().toISOString(),
      }
      await setDoc(doc(db, 'users', profile.id), profile)
      setData((prev) => ({ ...prev, users: [profile, ...prev.users.filter((user) => user.id !== profile.id)], session: { userId: profile.id } }))
    },
    async logout() {
      try {
        await signOut(auth)
      } catch (err) {
        console.error('Error al cerrar sesión:', err)
      } finally {
        try {
          Object.keys(localStorage).forEach((k) => {
            if (k.startsWith('qr-pass-line.cached-') || k === 'qr-pass-line.admin-active-venue') {
              localStorage.removeItem(k)
            }
          })
        } catch { }
        setAdminSelectedVenueId('')
        setData(emptyData)
      }
    },
    async updateName(name) {
      const cleanName = name.trim()
      if (!auth.currentUser || !currentUser || !cleanName) throw new Error('Ingresá un nombre válido.')
      await updateProfile(auth.currentUser, { displayName: cleanName })
      await updateDoc(doc(db, 'users', currentUser.id), { name: cleanName })
      setData((prev) => ({ ...prev, users: prev.users.map((user) => user.id === currentUser.id ? { ...user, name: cleanName } : user) }))
    },
    async updateUserPassword(password) {
      if (!auth.currentUser || !currentUser) throw new Error('Sesión vencida.')
      if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.')
      await updatePassword(auth.currentUser, password)
      await updateDoc(doc(db, 'users', currentUser.id), {
        tempPassword: '',
        mustChangePassword: false,
      })
      setData((prev) => ({
        ...prev,
        users: prev.users.map((u) => (u.id === currentUser.id ? { ...u, tempPassword: '', mustChangePassword: false } : u)),
      }))
    },
    async updateUserAvatar(userId, avatarUrl) {
      if (!currentUser) throw new Error('Sesión vencida.')
      await updateDoc(doc(db, 'users', userId), { avatar: avatarUrl })
      setData((prev) => ({
        ...prev,
        users: prev.users.map((user) => user.id === userId ? { ...user, avatar: avatarUrl } : user),
      }))
    },
    async addMember({ name, email, password, role, roles, venueId: customVenueId }) {
      const isMasterAdmin = isMasterAdminEmail(currentUser?.email) || currentUser?.role === 'admin' || currentUser?.roles?.includes('admin')
      const isOrgOrAdmin = isMasterAdmin || currentUser?.role === 'organizador' || currentUser?.roles?.includes('organizador')
      if (!isOrgOrAdmin) {
        throw new Error('Sin permisos para registrar personal.')
      }
      const venueId = customVenueId || activeVenue?.id || currentUser?.venueId || ''
      const cleanEmail = email.trim().toLowerCase()
      const cleanName = name.trim() || cleanEmail.split('@')[0]
      const cleanPassword = password || 'Password123!'

      const assignedRoles: Role[] = roles && roles.length ? roles : (role ? [role] : ['vendedor'])
      const primaryRole: Role = assignedRoles[0] || 'vendedor'

      // 1. If user is already in local state, assign role and update Firestore immediately
      const existingLocalUser = data.users.find((u) => u.email.toLowerCase() === cleanEmail)
      if (existingLocalUser) {
        const mergedRoles = Array.from(new Set([...(existingLocalUser.roles || [existingLocalUser.role]), ...assignedRoles])).filter(Boolean) as Role[]
        await updateDoc(doc(db, 'users', existingLocalUser.id), {
          role: primaryRole,
          roles: mergedRoles,
          venueId: venueId || existingLocalUser.venueId || '',
        })
        const updated: User = {
          ...existingLocalUser,
          role: primaryRole,
          roles: mergedRoles,
          venueId: venueId || existingLocalUser.venueId || '',
        }
        setData((prev) => ({
          ...prev,
          users: prev.users.map((u) => (u.id === updated.id ? updated : u)),
        }))
        return
      }

      // 2. If user exists in Firestore database (scoped by venueId for non-superadmin), update their role
      const q = isMasterAdmin
        ? query(collection(db, 'users'), where('email', '==', cleanEmail))
        : query(collection(db, 'users'), where('email', '==', cleanEmail), where('venueId', '==', venueId))
      const snap = await getDocs(q)
      if (!snap.empty) {
        const foundDoc = snap.docs[0]
        const docData = foundDoc.data()
        const mergedRoles = Array.from(new Set([...(docData.roles || [docData.role]), ...assignedRoles])).filter(Boolean) as Role[]
        await updateDoc(doc(db, 'users', foundDoc.id), {
          role: primaryRole,
          roles: mergedRoles,
          venueId: venueId || docData.venueId || '',
        })
        const updatedUser = asUser(foundDoc.id, {
          ...docData,
          role: primaryRole,
          roles: mergedRoles,
          venueId: venueId || docData.venueId || '',
        })
        setData((prev) => ({
          ...prev,
          users: [updatedUser, ...prev.users.filter((u) => u.id !== updatedUser.id)],
        }))
        return
      }

      // 3. If brand new user, create account via secondaryAuth
      try {
        const credentials = await createUserWithEmailAndPassword(secondaryAuth, cleanEmail, cleanPassword)
        await updateProfile(credentials.user, { displayName: cleanName })
        const defaultAvatar = `https://unavatar.io/${encodeURIComponent(cleanEmail)}?fallback=https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=193659&color=fff`
        const user: User = {
          id: credentials.user.uid,
          name: cleanName,
          email: cleanEmail,
          role: primaryRole,
          roles: assignedRoles,
          venueId,
          avatar: defaultAvatar,
          tempPassword: '',
          mustChangePassword: false,
          createdAt: new Date().toISOString(),
        }
        await setDoc(doc(db, 'users', user.id), user)
        setData((prev) => ({
          ...prev,
          users: [user, ...prev.users.filter((u) => u.id !== user.id && u.email.toLowerCase() !== cleanEmail)],
        }))
      } catch (err: any) {
        console.error('addMember creation notice:', err)
        if (err?.code === 'auth/email-already-in-use') {
          if (!isMasterAdmin) {
            throw new Error('Ese correo ya está registrado en el sistema. Usá un correo distinto para este local.')
          }
          const q2 = query(collection(db, 'users'), where('email', '==', cleanEmail))
          const snap2 = await getDocs(q2)
          if (!snap2.empty) {
            const foundDoc = snap2.docs[0]
            const docData = foundDoc.data()
            const mergedRoles = Array.from(new Set([...(docData.roles || [docData.role]), ...assignedRoles])).filter(Boolean) as Role[]
            await updateDoc(doc(db, 'users', foundDoc.id), {
              role: primaryRole,
              roles: mergedRoles,
              venueId: venueId || docData.venueId || '',
            })
            const updatedUser = asUser(foundDoc.id, {
              ...docData,
              role: primaryRole,
              roles: mergedRoles,
              venueId: venueId || docData.venueId || '',
            })
            setData((prev) => ({
              ...prev,
              users: [updatedUser, ...prev.users.filter((u) => u.id !== updatedUser.id)],
            }))
            return
          }
          throw new Error(`El email "${cleanEmail}" ya está registrado en el sistema. El usuario puede ingresar directamente con su contraseña.`)
        }
        const msg = err?.code === 'auth/weak-password'
          ? 'La contraseña es demasiado débil (mínimo 6 caracteres).'
          : err?.message || 'No se pudo registrar el usuario.'
        throw new Error(msg)
      } finally {
        await signOut(secondaryAuth).catch(() => { })
      }
    },
    async createEvent(input) {
      if (!currentUser) throw new Error('Sesión vencida.')
      const venueId = input.venueId || activeVenue?.id || currentUser.venueId || ''
      const event: Omit<ClubEvent, 'id'> = {
        ...input,
        venueId,
        name: input.name.trim(),
        venue: input.venue.trim(),
        notes: input.notes.trim(),
        status: input.status ?? 'activo',
        createdBy: currentUser.id,
        createdAt: new Date().toISOString()
      }
      const created = await addDoc(collection(db, 'events'), { ...event, createdAt: serverTimestamp() })
      const result: ClubEvent = { id: created.id, ...event }
      setData((prev) => ({ ...prev, events: [result, ...prev.events] }))
      return result
    },
    async updateEventStatus(id, status) {
      await updateDoc(doc(db, 'events', id), { status })
      setData((prev) => ({ ...prev, events: prev.events.map((event) => event.id === id ? { ...event, status } : event) }))
    },
    async deleteEvent(id) {
      await deleteDoc(doc(db, 'events', id))
      setData((prev) => ({
        ...prev,
        events: prev.events.filter((event) => event.id !== id),
      }))
    },
    async updateEvent(id, updates) {
      await updateDoc(doc(db, 'events', id), removeUndefined(updates))
      setData((prev) => ({
        ...prev,
        events: prev.events.map((event) => event.id === id ? { ...event, ...updates } : event),
      }))
    },
    async saveQrItem(item) {
      const venueId = item.venueId || activeVenue?.id || currentUser?.venueId || ''
      const itemToSave = { ...item, venueId }
      await setDoc(doc(db, 'qrCatalog', item.id), itemToSave)
      setData((prev) => {
        const updated = [itemToSave, ...prev.qrCatalog.filter((q) => q.id !== item.id)]
        if (venueId) {
          try { localStorage.setItem(`qr-pass-line.cached-qr-catalog.${venueId}`, JSON.stringify(updated)) } catch { }
        }
        return {
          ...prev,
          qrCatalog: updated,
        }
      })
    },
    async deleteQrItem(id) {
      const targetVenueId = activeVenue?.id || currentUser?.venueId || ''
      await deleteDoc(doc(db, 'qrCatalog', id))
      setData((prev) => {
        const updated = prev.qrCatalog.filter((q) => q.id !== id)
        if (targetVenueId) {
          try { localStorage.setItem(`qr-pass-line.cached-qr-catalog.${targetVenueId}`, JSON.stringify(updated)) } catch { }
        }
        return {
          ...prev,
          qrCatalog: updated,
        }
      })
    },
    async saveLimitation(limitation) {
      const venueId = limitation.venueId || activeVenue?.id || currentUser?.venueId || ''
      const limToSave = { ...limitation, venueId }
      await setDoc(doc(db, 'limitations', limitation.id), limToSave)
      setData((prev) => {
        const updated = [limToSave, ...prev.limitations.filter((l) => l.id !== limitation.id)]
        if (venueId) {
          try { localStorage.setItem(`qr-pass-line.cached-limitations.${venueId}`, JSON.stringify(updated)) } catch { }
        }
        return {
          ...prev,
          limitations: updated,
        }
      })
    },
    async deleteLimitation(id) {
      const targetVenueId = activeVenue?.id || currentUser?.venueId || ''
      await deleteDoc(doc(db, 'limitations', id))
      setData((prev) => {
        const updated = prev.limitations.filter((l) => l.id !== id)
        if (targetVenueId) {
          try { localStorage.setItem(`qr-pass-line.cached-limitations.${targetVenueId}`, JSON.stringify(updated)) } catch { }
        }
        return {
          ...prev,
          limitations: updated,
        }
      })
    },
    async issueTicket({ eventId, couponId, kind, holderName, dni, quantity, menQuantity, womenQuantity, venueId: customVenueId, eventDate, items }) {
      if (!currentUser) throw new Error('Sesión vencida.')
      const event = eventId ? data.events.find((item) => item.id === eventId) : undefined
      if (eventId && (!event || event.status !== 'activo')) throw new Error('La fecha no está activa.')
      if (currentUser.role === 'canjeador') throw new Error('El canjeador no emite accesos.')
      const computedQty = items && items.length > 0
        ? items.reduce((sum, it) => sum + (it.quantity || 0), 0)
        : (typeof quantity === 'number' && quantity > 0 ? quantity : 1)
      const ticketQty = computedQty > 0 ? computedQty : 1
      const venueId = customVenueId || event?.venueId || activeVenue?.id || currentUser.venueId || ''
      const targetVenueObj = data.venues.find((v) => v.id === venueId)
      if (targetVenueObj && !isVenueEnabled(targetVenueObj)) {
        throw new Error('El servicio de este local se encuentra desactivado o vencido. Contactá al administrador.')
      }
      const primaryCouponId = couponId || (items && items.length > 0 ? items[0].couponId : '')
      const primaryCoupon = primaryCouponId ? data.qrCatalog.find((q) => q.id === primaryCouponId) : undefined
      const baseDate = getCouponBaseDate(event, primaryCoupon)
      const defaultDateIso = `${baseDate.getFullYear()}-${String(baseDate.getMonth() + 1).padStart(2, '0')}-${String(baseDate.getDate()).padStart(2, '0')}`
      const computedEventDate = eventDate || (event?.date ? event.date.split('T')[0] : defaultDateIso)
      const ticket: Omit<Ticket, 'id'> = {
        eventId: event?.id || '',
        venueId,
        couponId: primaryCouponId,
        kind,
        code: ticketCode(),
        holderName: holderName.trim(),
        dni: (dni ?? '').replace(/\D/g, ''),
        quantity: ticketQty,
        ...(items && items.length > 0 ? { items } : {}),
        ...(typeof menQuantity === 'number' ? { menQuantity } : {}),
        ...(typeof womenQuantity === 'number' ? { womenQuantity } : {}),
        issuedBy: currentUser.id,
        issuedAt: new Date().toISOString(),
        ...(computedEventDate ? { eventDate: computedEventDate } : {}),
        redeemedAt: null,
        redeemedBy: null
      }
      const created = await addDoc(collection(db, 'tickets'), removeUndefined(ticket))
      const result = { id: created.id, ...ticket }
      setData((prev) => ({ ...prev, tickets: [result, ...prev.tickets] }))
      return result
    },
    async resetVenueTickets(venueId: string) {
      if (!venueId || venueId.trim() === '') {
        throw new Error('ID de local inválido.')
      }
      const targetVenue = data.venues.find((v) => v.id === venueId)
      if (!targetVenue) {
        throw new Error('Local no encontrado.')
      }
      // ONLY delete tickets strictly matching this venueId. Never touch Cubano!
      const ticketsToDelete = data.tickets.filter((t) => t.venueId === venueId)
      if (ticketsToDelete.length === 0) {
        return 0
      }
      const chunkSize = 50
      for (let i = 0; i < ticketsToDelete.length; i += chunkSize) {
        const chunk = ticketsToDelete.slice(i, i + chunkSize)
        await Promise.all(chunk.map((t) => deleteDoc(doc(db, 'tickets', t.id))))
      }
      setData((prev) => ({
        ...prev,
        tickets: prev.tickets.filter((t) => t.venueId !== venueId),
      }))
      return ticketsToDelete.length
    },
    async redeemTicket(code) {
      const normalizedCode = code.trim().toUpperCase()
      let ticket = data.tickets.find((t) => (t.code || '').trim().toUpperCase() === normalizedCode)

      // If not yet present in memory, try a direct query
      if (!ticket) {
        try {
          const lookupVenueId = !isMasterAdmin ? (currentUser?.venueId || '') : ''
          const q = lookupVenueId
            ? query(collection(db, 'tickets'), where('code', '==', normalizedCode), where('venueId', '==', lookupVenueId))
            : query(collection(db, 'tickets'), where('code', '==', normalizedCode))
          const snap = await getDocs(q)
          if (!snap.empty) {
            const d = snap.docs[0]
            ticket = { id: d.id, ...(d.data() as any) } as Ticket
          }
        } catch (e) {
          console.error('Error in live ticket lookup:', e)
        }
      }

      if (!ticket) {
        return {
          ok: false,
          reason: 'not_found',
          message: 'El código QR no existe o no se encuentra registrado en el sistema.'
        }
      }

      const ticketVenueObj = data.venues.find((v) => v.id === (ticket!.venueId || activeVenue?.id || ''))
      if (ticketVenueObj && !isVenueEnabled(ticketVenueObj)) {
        return {
          ok: false,
          reason: 'venue_suspended',
          message: 'El servicio de este local se encuentra desactivado o vencido. Contactá a administración.'
        }
      }

      const numBenefited = typeof ticket.quantity === 'number' && ticket.quantity > 0 ? ticket.quantity : 1
      const hasGenderCounts = typeof ticket.menQuantity === 'number' || typeof ticket.womenQuantity === 'number'
      const genderDetail = hasGenderCounts
        ? ` (${ticket.menQuantity ?? 0} ${ticket.menQuantity === 1 ? 'Caballero' : 'Caballeros'} · ${ticket.womenQuantity ?? 0} ${ticket.womenQuantity === 1 ? 'Dama' : 'Damas'})`
        : ''

      // Lookup Seller / RRPP Name
      const seller = data.users.find((u) => u.id === ticket.issuedBy)
      const sellerName = ticket.sellerName || (seller ? seller.name : 'Vendedor General')

      // Lookup Event & Venue & Coupon
      const event = data.events.find((e) => e.id === ticket.eventId)
      const coupon = data.qrCatalog.find((q) => q.id === ticket.couponId)
      const ticketVenue = event?.venue || ''
      const baseDate = getCouponBaseDate(event, coupon)
      const formattedDate = `${String(baseDate.getDate()).padStart(2, '0')}/${String(baseDate.getMonth() + 1).padStart(2, '0')}`

      // Check Schedule & Multi-Item Breakdown
      let schedule = formatCouponSchedule(event, coupon)
      let validity: any
      let itemsBreakdown: Array<{
        name: string
        quantity: number
        expired: boolean
        limitTime: string
        schedule: string
      }> | undefined = undefined

      let validQuantity = 0
      let expiredQuantity = 0
      let validItemsText = ''
      let expiredItemsText = ''

      if (ticket.items && ticket.items.length > 0) {
        const now = new Date()
        itemsBreakdown = ticket.items.map((it) => {
          const catalogCoupon = data.qrCatalog.find((q) => q.id === it.couponId)
          const targetCoupon = {
            ...catalogCoupon,
            from: it.from || catalogCoupon?.from || event?.doorsOpen || '23:59',
            duration: it.duration || catalogCoupon?.duration || '02:00',
            scheduleMode: it.scheduleMode || catalogCoupon?.scheduleMode,
            hasGenderSchedules: it.hasGenderSchedules ?? catalogCoupon?.hasGenderSchedules,
            menDuration: it.menDuration ?? catalogCoupon?.menDuration,
            womenDuration: it.womenDuration ?? catalogCoupon?.womenDuration
          }
          const itemVal = checkCouponScheduleValidity(event, targetCoupon, now)
          const isExpired = !itemVal.ok
          const rawDuration = targetCoupon.duration || '02:00'
          const limitTime = (itemVal as any).limitTime || rawDuration
          return {
            name: it.couponName,
            quantity: it.quantity,
            expired: isExpired,
            limitTime,
            schedule: it.schedule || formatCouponSchedule(event, targetCoupon)
          }
        })

        const allExpired = itemsBreakdown.every((it) => it.expired)
        const someExpired = itemsBreakdown.some((it) => it.expired)
        validQuantity = itemsBreakdown.filter((it) => !it.expired).reduce((s, it) => s + it.quantity, 0)
        expiredQuantity = itemsBreakdown.filter((it) => it.expired).reduce((s, it) => s + it.quantity, 0)
        validItemsText = itemsBreakdown.filter((it) => !it.expired).map((it) => it.name).join(' + ')
        expiredItemsText = itemsBreakdown.filter((it) => it.expired).map((it) => it.name).join(' + ')

        schedule = itemsBreakdown.map((it) => `${it.name}: hasta ${it.limitTime} hs`).join(' · ')

        if (allExpired) {
          validity = {
            ok: false,
            reason: 'expired_schedule',
            message: `Los horarios para los cupones de este QR vencieron.`,
            limitTime: itemsBreakdown.map((it) => `${it.name} ${it.limitTime}`).join(' / '),
            isMixed: true,
            itemsBreakdown
          }
        } else if (someExpired) {
          validity = {
            ok: false,
            reason: 'partial_schedule_expired',
            message: `Horario vencido para ${expiredItemsText} (${expiredQuantity} pers.). Vigente para ${validItemsText} (${validQuantity} pers.).`,
            limitTime: itemsBreakdown.map((it) => `${it.name} ${it.limitTime}`).join(' / '),
            isMixed: true,
            menExpired: itemsBreakdown.some((it) => it.expired && (it.name.toLowerCase().includes('caballero') || it.name.toLowerCase().includes('hombre'))),
            womenExpired: itemsBreakdown.some((it) => it.expired && (it.name.toLowerCase().includes('dama') || it.name.toLowerCase().includes('mujer'))),
            validQuantity,
            expiredQuantity,
            validItemsText,
            expiredItemsText,
            itemsBreakdown
          }
        } else {
          validity = {
            ok: true,
            isMixed: itemsBreakdown.length > 1,
            itemsBreakdown
          }
        }
      } else {
        validity = checkCouponScheduleValidity(event, coupon)
      }

      const ticketName = ticket.items && ticket.items.length > 1
        ? ticket.items.map((it) => it.couponName).join(' + ')
        : (coupon?.name || (ticket.kind === 'dni' ? 'Acceso por DNI' : 'Acceso QR'))

      const quantityText = ticket.items && ticket.items.length > 1
        ? `${numBenefited} personas (${ticket.items.map((it) => `${it.quantity} ${it.couponName}`).join(' · ')})`
        : ((numBenefited === 1 ? '1 persona beneficiada' : `${numBenefited} personas beneficiadas`) + genderDetail)

      // 1. Check Establishment / Venue Match (only if staff has a specific venueId assigned)
      const isMasterAdminUser = isMasterAdminEmail(currentUser?.email) || currentUser?.role === 'admin' || Boolean(currentUser?.roles?.includes('admin'))
      const targetStaffVenueId = currentUser?.venueId || (isMasterAdminUser ? activeVenue?.id : undefined)
      const currentVenueName = targetStaffVenueId
        ? (data.venues.find((v) => v.id === targetStaffVenueId)?.name || '')
        : ''

      if (targetStaffVenueId && !isEntityForVenue(ticket.venueId, targetStaffVenueId, data.venues)) {
        return {
          ok: false,
          reason: 'invalid_venue',
          message: `Acceso no válido para este establecimiento.`,
          ticket,
          sellerName,
          eventName: event?.name || 'Evento',
          venueName: ticketVenue || 'Otro Local',
          ticketName,
          date: formattedDate,
          schedule,
          quantity: quantityText
        }
      }

      // 2. Check Expiration
      if (!validity.ok) {
        return {
          ok: false,
          reason: validity.reason || 'expired',
          message: validity.message || 'El horario de validez del cupón expiró.',
          ticket,
          sellerName,
          eventName: event?.name || 'Evento',
          venueName: ticketVenue || currentVenueName || 'Local Principal',
          ticketName,
          date: formattedDate,
          schedule,
          quantity: quantityText,
          isMixed: validity.isMixed,
          menExpired: validity.menExpired,
          womenExpired: validity.womenExpired,
          menLimitTime: validity.menLimitTime,
          womenLimitTime: validity.womenLimitTime,
          menQuantity: ticket.menQuantity,
          womenQuantity: ticket.womenQuantity,
          itemsBreakdown: validity.itemsBreakdown,
          validQuantity: validity.validQuantity,
          expiredQuantity: validity.expiredQuantity,
          validItemsText: validity.validItemsText,
          expiredItemsText: validity.expiredItemsText,
        }
      }

      // 3. Check Already Redeemed
      if (ticket.redeemedAt) {
        const redeemer = data.users.find((u) => u.id === ticket.redeemedBy)
        const redeemerName = redeemer ? redeemer.name : 'Staff'
        return {
          ok: false,
          reason: 'already_redeemed',
          message: 'Código ya canjeado previamente.',
          ticket,
          redeemerName,
          sellerName,
          eventName: event?.name || 'Evento',
          venueName: ticketVenue || currentVenueName || 'Local Principal',
          ticketName,
          date: formattedDate,
          schedule,
          quantity: quantityText,
          isMixed: validity.isMixed,
          menLimitTime: validity.menLimitTime,
          womenLimitTime: validity.womenLimitTime,
          menQuantity: ticket.menQuantity,
          womenQuantity: ticket.womenQuantity,
          itemsBreakdown: validity.itemsBreakdown,
        }
      }

      // Mark as redeemed in Firestore and local state
      const redeemedAt = new Date().toISOString()
      const redeemedBy = currentUser?.id ?? 'staff'
      const updates = { redeemedAt, redeemedBy }
      await updateDoc(doc(db, 'tickets', ticket.id), updates)

      const redeemed: Ticket = { ...ticket, ...updates }
      setData((prev) => {
        const index = prev.tickets.findIndex((item) => item.id === ticket!.id || (item.code && item.code.trim().toUpperCase() === normalizedCode))
        const nextTickets = index >= 0
          ? prev.tickets.map((item, idx) => (idx === index ? redeemed : item))
          : [redeemed, ...prev.tickets]
        return {
          ...prev,
          tickets: nextTickets,
        }
      })

      return {
        ok: true,
        ticket: redeemed,
        sellerName,
        eventName: event?.name || 'Evento Activo',
        venueName: ticketVenue || currentVenueName || 'Local Principal',
        ticketName,
        date: formattedDate,
        schedule,
        quantity: quantityText,
        isMixed: validity.isMixed,
        menLimitTime: validity.menLimitTime,
        womenLimitTime: validity.womenLimitTime,
        menQuantity: ticket.menQuantity,
        womenQuantity: ticket.womenQuantity,
        itemsBreakdown: validity.itemsBreakdown,
        validQuantity,
        expiredQuantity,
        validItemsText,
        expiredItemsText,
      }
    },

    async redeemTicketWithException(code: string, customQuantity?: number, asException: boolean = true) {
      const normalizedCode = code.trim().toUpperCase()
      let ticket = data.tickets.find((t) => (t.code || '').trim().toUpperCase() === normalizedCode)

      if (!ticket) {
        try {
          const lookupVenueId = !isMasterAdmin ? (currentUser?.venueId || '') : ''
          const q = lookupVenueId
            ? query(collection(db, 'tickets'), where('code', '==', normalizedCode), where('venueId', '==', lookupVenueId))
            : query(collection(db, 'tickets'), where('code', '==', normalizedCode))
          const snap = await getDocs(q)
          if (!snap.empty) {
            const d = snap.docs[0]
            ticket = { id: d.id, ...(d.data() as any) } as Ticket
          }
        } catch (e) {
          console.error('Error in live ticket lookup for exception:', e)
        }
      }

      if (!ticket) {
        return {
          ok: false,
          reason: 'not_found',
          message: 'El código QR no existe o no se encuentra registrado en el sistema.'
        }
      }

      const ticketVenueObj = data.venues.find((v) => v.id === (ticket!.venueId || activeVenue?.id || ''))
      if (ticketVenueObj && !isVenueEnabled(ticketVenueObj)) {
        return {
          ok: false,
          reason: 'venue_suspended',
          message: 'El servicio de este local se encuentra desactivado o vencido. Contactá a administración.'
        }
      }

      // Check Already Redeemed - Strictly cannot redeem if already used
      if (ticket.redeemedAt) {
        const redeemer = data.users.find((u) => u.id === ticket.redeemedBy)
        const redeemerName = redeemer ? redeemer.name : 'Staff'
        return {
          ok: false,
          reason: 'already_redeemed',
          message: 'Código ya canjeado previamente. No se permite duplicar el ingreso.',
          ticket,
          redeemerName
        }
      }

      const finalQuantity = typeof customQuantity === 'number' && customQuantity > 0
        ? Math.floor(customQuantity)
        : (typeof ticket.quantity === 'number' && ticket.quantity > 0 ? ticket.quantity : 1)
      const quantityText = finalQuantity === 1 ? '1 persona beneficiada' : `${finalQuantity} personas beneficiadas`

      const seller = data.users.find((u) => u.id === ticket.issuedBy)
      const sellerName = ticket.sellerName || (seller ? seller.name : 'Vendedor General')
      const event = data.events.find((e) => e.id === ticket.eventId)
      const coupon = data.qrCatalog.find((q) => q.id === ticket.couponId)
      const ticketVenue = event?.venue || ''
      const currentVenueName = currentUser?.venueId
        ? (data.venues.find((v) => v.id === currentUser.venueId)?.name || '')
        : ''
      const ticketName = coupon?.name || (ticket.kind === 'dni' ? 'Acceso por DNI' : 'Acceso QR')
      const baseDate = getCouponBaseDate(event, coupon)
      const formattedDate = `${String(baseDate.getDate()).padStart(2, '0')}/${String(baseDate.getMonth() + 1).padStart(2, '0')}`
      const schedule = formatCouponSchedule(event, coupon)

      const redeemedAt = new Date().toISOString()
      const redeemedBy = currentUser?.id ?? 'staff'
      const updates: Partial<Ticket> = {
        redeemedAt,
        redeemedBy,
        ...(asException ? {
          isException: true,
          exceptionBy: redeemedBy,
          exceptionAt: redeemedAt,
        } : {}),
        quantity: finalQuantity,
        ...(ticket.quantity !== finalQuantity ? {
          originalQuantity: ticket.quantity || 1,
          adjustedBy: redeemedBy,
          adjustedAt: redeemedAt
        } : {})
      }

      await updateDoc(doc(db, 'tickets', ticket.id), updates)
      const redeemed: Ticket = { ...ticket, ...updates }
      setData((prev) => ({
        ...prev,
        tickets: prev.tickets.map((item) => (item.id === ticket!.id ? redeemed : item)),
      }))

      return {
        ok: true,
        isException: asException,
        ticket: redeemed,
        sellerName,
        eventName: event?.name || 'Evento Activo',
        venueName: ticketVenue || currentVenueName || 'Local Principal',
        ticketName,
        date: formattedDate,
        schedule,
        quantity: quantityText
      }
    },

    async updateTicketQuantity(ticketId: string, newQuantity: number) {
      if (!ticketId || newQuantity < 1) {
        return { ok: false, error: 'Cantidad inválida (mínimo 1 persona).' }
      }
      let ticket = data.tickets.find((t) => t.id === ticketId)
      if (!ticket) {
        try {
          const snap = await getDoc(doc(db, 'tickets', ticketId))
          if (snap.exists()) {
            ticket = { id: snap.id, ...(snap.data() as any) } as Ticket
          }
        } catch (e) {
          console.error('Error fetching ticket for quantity update:', e)
        }
      }
      if (!ticket) {
        return { ok: false, error: 'Ticket no encontrado.' }
      }

      const cleanQty = Math.max(1, Math.floor(newQuantity))
      const updates: Partial<Ticket> = {
        quantity: cleanQty,
        originalQuantity: ticket.originalQuantity ?? ticket.quantity ?? 1,
        adjustedBy: currentUser?.id ?? 'staff',
        adjustedAt: new Date().toISOString()
      }

      await updateDoc(doc(db, 'tickets', ticketId), updates)
      const updated: Ticket = { ...ticket, ...updates }

      setData((prev) => ({
        ...prev,
        tickets: prev.tickets.map((item) => (item.id === ticketId ? updated : item)),
      }))

      return { ok: true, ticket: updated }
    },

    async updateUserRole(userId, role, venueId, roles) {
      const isMasterAdmin = isMasterAdminEmail(currentUser?.email) || currentUser?.role === 'admin' || currentUser?.roles?.includes('admin')
      const isOrgOrAdmin = isMasterAdmin || currentUser?.role === 'organizador' || currentUser?.roles?.includes('organizador')
      if (!isOrgOrAdmin) throw new Error('Sin permisos para asignar roles.')
      const updates: any = {}
      if (role !== undefined) {
        updates.role = role
        updates.roles = [role]
      }
      if (roles !== undefined) {
        updates.roles = roles
        if (roles.length > 0) updates.role = roles[0]
      }
      if (venueId !== undefined) {
        updates.venueId = venueId
      } else if (!isMasterAdmin && currentUser?.venueId) {
        updates.venueId = currentUser.venueId
      }
      await updateDoc(doc(db, 'users', userId), updates)
      setData((prev) => ({
        ...prev,
        users: prev.users.map((u) => u.id === userId ? { ...u, ...updates } : u),
      }))
    },
    async deleteUser(userId) {
      const isMasterAdmin = isMasterAdminEmail(currentUser?.email) || currentUser?.role === 'admin' || currentUser?.roles?.includes('admin')
      const isOrgOrAdmin = isMasterAdmin || currentUser?.role === 'organizador' || currentUser?.roles?.includes('organizador')
      if (!isOrgOrAdmin) throw new Error('Solo el superusuario o encargado puede eliminar usuarios.')
      const targetUser = data.users.find((u) => u.id === userId)
      if (targetUser && isMasterAdminEmail(targetUser.email)) {
        throw new Error('No se puede eliminar la cuenta del administrador principal.')
      }
      await deleteDoc(doc(db, 'users', userId))

      const userLimits = data.limitations.filter((l) => l.personId === userId)
      for (const lim of userLimits) {
        await deleteDoc(doc(db, 'limitations', lim.id)).catch(() => { })
      }

      setData((prev) => ({
        ...prev,
        users: prev.users.filter((u) => u.id !== userId),
        limitations: prev.limitations.filter((l) => l.personId !== userId),
      }))
    },
    async resetUserPasswordByEmail(email) {
      const isMasterAdmin = isMasterAdminEmail(currentUser?.email) || currentUser?.role === 'admin' || currentUser?.roles?.includes('admin')
      if (!isMasterAdmin) throw new Error('Solo el superusuario puede blanquear contraseñas.')
      await sendPasswordResetEmail(auth, email.trim().toLowerCase())
    },
    async adminResetPassword(userId, newPassword) {
      const isMasterAdmin = isMasterAdminEmail(currentUser?.email) || currentUser?.role === 'admin' || currentUser?.roles?.includes('admin')
      const isOrgOrAdmin = isMasterAdmin || currentUser?.role === 'organizador' || currentUser?.roles?.includes('organizador')
      if (!isOrgOrAdmin) throw new Error('Sin permisos para resetear contraseñas.')
      if (newPassword.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.')

      const targetUser = data.users.find((u) => u.id === userId)
      if (!targetUser) throw new Error('Usuario no encontrado.')

      // Update in secondaryAuth if possible by trying known/stored passwords
      const passwordsToTry = Array.from(new Set([
        targetUser.tempPassword,
        '123456',
        'Password123!',
        'password',
        '12345678',
      ])).filter(Boolean) as string[]

      for (const pass of passwordsToTry) {
        try {
          const cred = await signInWithEmailAndPassword(secondaryAuth, targetUser.email, pass)
          if (cred && cred.user) {
            await updatePassword(cred.user, newPassword)
            await signOut(secondaryAuth).catch(() => { })
            break
          }
        } catch {
          // Continue to next fallback
        }
      }

      await updateDoc(doc(db, 'users', userId), {
        tempPassword: '',
        mustChangePassword: false,
      })

      setData((prev) => ({
        ...prev,
        users: prev.users.map((u) => (u.id === userId ? { ...u, tempPassword: '', mustChangePassword: false } : u)),
      }))
    },
    async createVenue(input) {
      const isMaster = isMasterAdminEmail(currentUser?.email) || currentUser?.role === 'admin' || currentUser?.roles?.includes('admin')
      if (!isMaster) throw new Error('Solo el Super Admin puede registrar locales nuevos.')
      const venue = {
        ...input,
        name: input.name.trim(),
        address: input.address.trim(),
        isActive: input.isActive ?? true,
        createdAt: new Date().toISOString(),
      }
      const created = await addDoc(collection(db, 'venues'), { ...venue, createdAt: serverTimestamp() })
      const result: Venue = { id: created.id, ...venue }
      setData((prev) => ({ ...prev, venues: [result, ...prev.venues] }))
      return result
    },
    async replaceMember({ oldUserId, name, email, password }) {
      const isMaster = isMasterAdminEmail(currentUser?.email) || currentUser?.role === 'admin' || currentUser?.roles?.includes('admin')
      const isOrg = isMaster || currentUser?.role === 'organizador' || currentUser?.roles?.includes('organizador')
      if (!isOrg) throw new Error('Sin permisos para reemplazar personal.')

      const oldUser = data.users.find((u) => u.id === oldUserId)
      if (!oldUser) throw new Error('Usuario a reemplazar no encontrado.')
      const targetVenueId = oldUser.venueId || activeVenue?.id || currentUser?.venueId || ''
      const cleanEmail = email.trim().toLowerCase()
      const cleanName = name.trim() || cleanEmail.split('@')[0]
      const cleanPassword = password.trim() || '123456'
      if (!cleanEmail) throw new Error('Ingresá un correo válido para el usuario real.')
      if (cleanPassword.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.')

      const credentials = await createUserWithEmailAndPassword(secondaryAuth, cleanEmail, cleanPassword)
      await updateProfile(credentials.user, { displayName: cleanName })
      const assignedRoles = oldUser.roles && oldUser.roles.length ? oldUser.roles : [oldUser.role]
      const primaryRole = assignedRoles[0] || oldUser.role
      const newUser: User = {
        id: credentials.user.uid,
        name: cleanName,
        email: cleanEmail,
        role: primaryRole,
        roles: assignedRoles,
        venueId: targetVenueId,
        avatar: `https://unavatar.io/${encodeURIComponent(cleanEmail)}?fallback=https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=193659&color=fff`,
        tempPassword: '',
        mustChangePassword: false,
        createdAt: new Date().toISOString(),
      }
      await setDoc(doc(db, 'users', newUser.id), newUser)
      await signOut(secondaryAuth).catch(() => { })

      // Migrar limitaciones del usuario ficticio al usuario real
      const limSnap = await getDocs(query(collection(db, 'limitations'), where('venueId', '==', targetVenueId)))
      const oldLimits = limSnap.docs.filter((d) => d.data()?.personId === oldUserId)
      for (const limDoc of oldLimits) {
        await updateDoc(limDoc.ref, { personId: newUser.id }).catch(() => { })
      }

      await deleteDoc(doc(db, 'users', oldUserId)).catch(() => { })

      setData((prev) => ({
        ...prev,
        users: [newUser, ...prev.users.filter((u) => u.id !== oldUserId && u.id !== newUser.id)],
        limitations: prev.limitations.map((l) => (l.personId === oldUserId ? { ...l, personId: newUser.id } : l)),
      }))
      return newUser
    },
    async createDemoVenue(customLabel) {
      const isMaster = isMasterAdminEmail(currentUser?.email) || currentUser?.role === 'admin' || currentUser?.roles?.includes('admin')
      if (!isMaster) throw new Error('Solo el Super Admin puede crear locales DEMO.')

      const existingDemoCount = data.venues.filter((v) => v.isDemo || (v.name || '').toUpperCase().startsWith('DEMO')).length
      const suffix = existingDemoCount + 1
      const demoName = (customLabel || '').trim() || (existingDemoCount === 0 ? 'DEMO' : `DEMO ${suffix}`)
      const slug = `demo${suffix}_${Date.now().toString(36).slice(-4)}`

      const createdVenueData = {
        name: demoName,
        address: '',
        crossStreets: '',
        latitude: 0,
        longitude: 0,
        radius: 0,
        isActive: true,
        isDemo: true,
        serviceType: 'FULL' as const,
        serviceNotes: 'Versión DEMO completa para prueba de cliente (sin límite de zona hasta asignar dirección real).',
        monthlyFee: 0,
        visibleButtons: defaultVenueVisibleButtons,
        createdAt: new Date().toISOString(),
      }
      const createdRef = await addDoc(collection(db, 'venues'), { ...createdVenueData, createdAt: serverTimestamp() })
      const venue: Venue = { id: createdRef.id, ...createdVenueData }

      const demoPass = 'demo1234'
      const demoAccounts: Array<{ roleLabel: string; name: string; email: string; role: Role; roles: Role[] }> = [
        { roleLabel: 'Encargado / Organizador', name: `Encargado ${demoName}`, email: `encargado.${slug}@qrpassline.demo`, role: 'organizador', roles: ['organizador', 'vendedor', 'canjeador'] },
        { roleLabel: 'Vendedor / RR.PP', name: `Vendedor ${demoName}`, email: `vendedor.${slug}@qrpassline.demo`, role: 'vendedor', roles: ['vendedor'] },
        { roleLabel: 'Canjeador (Puerta)', name: `Canjeador ${demoName}`, email: `canjeador.${slug}@qrpassline.demo`, role: 'canjeador', roles: ['canjeador'] },
      ]

      const createdUsers: User[] = []
      for (const acc of demoAccounts) {
        const cred = await createUserWithEmailAndPassword(secondaryAuth, acc.email, demoPass)
        await updateProfile(cred.user, { displayName: acc.name })
        const u: User = {
          id: cred.user.uid,
          name: acc.name,
          email: acc.email,
          role: acc.role,
          roles: acc.roles,
          venueId: venue.id,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(acc.name)}&background=193659&color=fff`,
          createdAt: new Date().toISOString(),
        }
        await setDoc(doc(db, 'users', u.id), u)
        createdUsers.push(u)
      }
      await signOut(secondaryAuth).catch(() => { })

      // Crear evento de prueba activo + 2 cupones + limitaciones para el vendedor demo
      const todayIso = new Date().toISOString().split('T')[0]
      const demoEventData = {
        name: `Fiesta Prueba ${demoName}`,
        venue: demoName,
        venueId: venue.id,
        date: todayIso,
        doorsOpen: '23:59',
        notes: 'Evento de demostración listo para emitir y escanear QRs.',
        status: 'activo' as const,
        createdBy: currentUser?.id || '',
        createdAt: new Date().toISOString(),
      }
      const evRef = await addDoc(collection(db, 'events'), { ...demoEventData, createdAt: serverTimestamp() })

      const qr1: QrCatalogItem = {
        id: `${venue.id}-free-2am`,
        venueId: venue.id,
        name: 'INGRESO SIN CARGO 2AM',
        description: 'Acceso promocional de prueba hasta las 02:00 hs.',
        kind: 'consumible',
        icon: 'Ticket',
        publicAccess: true,
        active: true,
        schedule: 'Entrada 23:59 hs · Límite 02:00 hs',
        scheduleMode: 'full',
        from: '23:59 del día corriente',
        duration: '02:00',
        days: ['L', 'M', 'X', 'J', 'V', 'S', 'D'],
      }
      const qr2: QrCatalogItem = {
        id: `${venue.id}-vip`,
        venueId: venue.id,
        name: 'ACCESO VIP DEMO',
        description: 'Acceso VIP de demostración hasta las 04:00 hs.',
        kind: 'consumible',
        icon: 'Estrella',
        publicAccess: false,
        active: true,
        schedule: 'Entrada 23:59 hs · Límite 04:00 hs',
        scheduleMode: 'full',
        from: '23:59 del día corriente',
        duration: '04:00',
        days: ['L', 'M', 'X', 'J', 'V', 'S', 'D'],
      }
      await setDoc(doc(db, 'qrCatalog', qr1.id), qr1)
      await setDoc(doc(db, 'qrCatalog', qr2.id), qr2)

      const sellerUser = createdUsers.find((u) => u.role === 'vendedor') || createdUsers[0]
      if (sellerUser) {
        const lim1: Limitation = {
          id: `${venue.id}-lim-1`,
          venueId: venue.id,
          personId: sellerUser.id,
          couponId: qr1.id,
          quantity: 100,
          period: 'DEMO',
        }
        const lim2: Limitation = {
          id: `${venue.id}-lim-2`,
          venueId: venue.id,
          personId: sellerUser.id,
          couponId: qr2.id,
          quantity: 50,
          period: 'DEMO',
        }
        await setDoc(doc(db, 'limitations', lim1.id), lim1)
        await setDoc(doc(db, 'limitations', lim2.id), lim2)
      }

      setData((prev) => ({
        ...prev,
        venues: [venue, ...prev.venues],
        users: [...createdUsers, ...prev.users],
        events: activeVenue?.id === venue.id ? [{ id: evRef.id, ...demoEventData }, ...prev.events] : prev.events,
      }))

      return {
        venue,
        credentials: demoAccounts.map((a) => ({
          roleLabel: a.roleLabel,
          name: a.name,
          email: a.email,
          password: demoPass,
        })),
      }
    },
    async updateVenue(id, updates) {
      const isMaster = isMasterAdminEmail(currentUser?.email) || currentUser?.role === 'admin' || currentUser?.roles?.includes('admin')
      const isOrgOfVenue = (currentUser?.role === 'organizador' || currentUser?.roles?.includes('organizador')) && currentUser?.venueId === id
      if (!isMaster && !isOrgOfVenue) {
        throw new Error('Sin permisos para editar este establecimiento.')
      }
      await updateDoc(doc(db, 'venues', id), updates)
      setData((prev) => ({
        ...prev,
        venues: prev.venues.map((v) => (v.id === id ? { ...v, ...updates } : v)),
      }))
    },
    async deleteVenue(id) {
      const isMaster = isMasterAdminEmail(currentUser?.email) || currentUser?.role === 'admin' || currentUser?.roles?.includes('admin')
      if (!isMaster) throw new Error('Solo el Super Admin puede eliminar locales.')
      await deleteDoc(doc(db, 'venues', id))
      setData((prev) => ({ ...prev, venues: prev.venues.filter((v) => v.id !== id) }))
    },
    async saveCouponTemplate(config: CouponTemplateConfig) {
      const targetVenueId = activeVenue?.id || currentUser?.venueId || ''
      if (targetVenueId) {
        await updateDoc(doc(db, 'venues', targetVenueId), { couponTemplate: config }).catch(() => { })
        setData((prev) => ({
          ...prev,
          venues: prev.venues.map((v) => (v.id === targetVenueId ? { ...v, couponTemplate: config } : v)),
          couponTemplate: config,
        }))
      } else {
        localStorage.setItem('qr-pass-line.coupon-template', JSON.stringify(config))
        await setDoc(doc(db, 'settings', 'couponTemplate'), config)
        setData((prev) => ({ ...prev, couponTemplate: config }))
      }
    },
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp debe usarse dentro de AppProvider.')
  }
  return context
}
