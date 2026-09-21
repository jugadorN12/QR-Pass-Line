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
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { auth, db, secondaryAuth } from '../lib/firebase'
import { ticketCode } from '../lib/ids'
import { defaultQrCatalog } from '../lib/qrCatalog'
import type { AppData, ClubEvent, EventStatus, Limitation, QrCatalogItem, Role, Ticket, TicketKind, User, Venue } from '../types'

type AppContextValue = AppData & {
  loading: boolean
  currentUser: User | null
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  updateName: (name: string) => Promise<void>
  updateUserPassword: (password: string) => Promise<void>
  addMember: (input: { name: string; email: string; password: string; role?: Role; roles?: Role[] }) => Promise<void>
  createEvent: (input: Omit<ClubEvent, 'id' | 'createdAt' | 'createdBy' | 'status'> & { status?: EventStatus }) => Promise<ClubEvent>
  updateEventStatus: (id: string, status: EventStatus) => Promise<void>
  issueTicket: (input: { eventId: string; kind: TicketKind; holderName: string; dni?: string }) => Promise<Ticket>
  redeemTicket: (code: string) => Promise<{ ok: true; ticket: Ticket } | { ok: false; message: string }>
  saveQrItem: (item: QrCatalogItem) => Promise<void>
  deleteQrItem: (id: string) => Promise<void>
  saveLimitation: (limitation: Limitation) => Promise<void>
  deleteLimitation: (id: string) => Promise<void>
  updateUserRole: (userId: string, role?: Role, venueId?: string, roles?: Role[]) => Promise<void>
  resetUserPasswordByEmail: (email: string) => Promise<void>
  createVenue: (input: Omit<Venue, 'id' | 'createdAt'>) => Promise<Venue>
  deleteVenue: (id: string) => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)
const emptyData: AppData = { users: [], events: [], tickets: [], qrCatalog: [], limitations: [], venues: [], session: null }

const ADMIN_EMAIL = 'simplemente_anibal@hotmail.com'

function asUser(id: string, value: Record<string, unknown>): User {
  let role = (value.role as Role) ?? 'pendiente'
  if (String(value.email).toLowerCase() === ADMIN_EMAIL) {
    role = 'admin'
  }
  return {
    id,
    name: String(value.name ?? ''),
    email: String(value.email ?? ''),
    role,
    venueId: String(value.venueId ?? ''),
    createdAt: String(value.createdAt ?? new Date().toISOString()),
  }
}

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3 // metros
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c // en metros
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(emptyData)
  const [loading, setLoading] = useState(true)

  useEffect(() => onAuthStateChanged(auth, async (firebaseUser) => {
    if (!firebaseUser) {
      setData(emptyData)
      setLoading(false)
      return
    }
    try {
      const userDocRef = doc(db, 'users', firebaseUser.uid)
      const profile = await getDoc(userDocRef)

      let currentUserObj: User
      if (!profile.exists()) {
        const usersSnap = await getDocs(collection(db, 'users'))
        const isFirst = usersSnap.empty
        const email = firebaseUser.email ? firebaseUser.email.toLowerCase() : ''
        const assignedRole: Role = (isFirst || email === ADMIN_EMAIL) ? 'admin' : 'pendiente'
        currentUserObj = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || (email ? email.split('@')[0] : 'Usuario'),
          email,
          role: assignedRole,
          createdAt: new Date().toISOString(),
        }
        await setDoc(userDocRef, currentUserObj)
      } else {
        currentUserObj = asUser(firebaseUser.uid, profile.data())
        // Forzar admin si es el mail configurado aunque el doc diga otra cosa
        if (currentUserObj.email.toLowerCase() === ADMIN_EMAIL && currentUserObj.role !== 'admin') {
          currentUserObj.role = 'admin'
          await updateDoc(userDocRef, { role: 'admin' })
        }
      }

      const [usersSnapshot, eventsSnapshot, ticketsSnapshot, qrSnapshot, limitationsSnapshot, venuesSnapshot] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'events')),
        getDocs(query(collection(db, 'tickets'), where('issuedBy', '!=', ''))),
        getDocs(collection(db, 'qrCatalog')),
        getDocs(collection(db, 'limitations')),
        getDocs(collection(db, 'venues')),
      ])

      const allUsers = usersSnapshot.docs.map((item) => asUser(item.id, item.data()))
      if (!allUsers.some((u) => u.id === currentUserObj.id)) {
        allUsers.push(currentUserObj)
      }

      let qrCatalog = qrSnapshot.docs.map((item) => ({ id: item.id, ...item.data() } as QrCatalogItem))
      if (!qrCatalog.length) {
        const defaults = defaultQrCatalog()
        for (const item of defaults) {
          await setDoc(doc(db, 'qrCatalog', item.id), item)
        }
        qrCatalog = defaults
      }

      const limitations = limitationsSnapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Limitation))
      const venues = venuesSnapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Venue))

      setData({
        users: allUsers,
        events: eventsSnapshot.docs.map((item) => ({ id: item.id, ...item.data() } as ClubEvent)),
        tickets: ticketsSnapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Ticket)),
        qrCatalog,
        limitations,
        venues,
        session: { userId: currentUserObj.id },
      })
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
        session: { userId: fallbackUser.id },
      })
    } finally {
      setLoading(false)
    }
  }), [])

  const currentUser = useMemo(
    () => data.users.find((user) => user.id === data.session?.userId) ?? null,
    [data.users, data.session],
  )

  const value: AppContextValue = {
    ...data,
    loading,
    currentUser,
    async login(email, password) {
      await signInWithEmailAndPassword(auth, email.trim(), password)
    },
    async register(name, email, password) {
      const usersSnapshot = await getDocs(collection(db, 'users'))
      const cleanEmail = email.trim().toLowerCase()
      const assignedRole: Role = (usersSnapshot.empty || cleanEmail === ADMIN_EMAIL) ? 'admin' : 'pendiente'

      const credentials = await createUserWithEmailAndPassword(auth, cleanEmail, password)
      await updateProfile(credentials.user, { displayName: name.trim() })
      const profile: User = {
        id: credentials.user.uid,
        name: name.trim(),
        email: cleanEmail,
        role: assignedRole,
        createdAt: new Date().toISOString(),
      }
      await setDoc(doc(db, 'users', profile.id), profile)
      setData((prev) => ({ ...prev, users: [profile, ...prev.users.filter((user) => user.id !== profile.id)], session: { userId: profile.id } }))
    },
    async logout() {
      await signOut(auth)
    },
    async updateName(name) {
      const cleanName = name.trim()
      if (!auth.currentUser || !currentUser || !cleanName) throw new Error('Ingresá un nombre válido.')
      await updateProfile(auth.currentUser, { displayName: cleanName })
      await updateDoc(doc(db, 'users', currentUser.id), { name: cleanName })
      setData((prev) => ({ ...prev, users: prev.users.map((user) => user.id === currentUser.id ? { ...user, name: cleanName } : user) }))
    },
    async updateUserPassword(password) {
      if (!auth.currentUser) throw new Error('Sesión vencida.')
      if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.')
      await updatePassword(auth.currentUser, password)
    },
    async addMember({ name, email, password, role, roles }) {
      if (currentUser?.role !== 'organizador' && currentUser?.role !== 'admin') {
        throw new Error('Sin permisos para registrar personal.')
      }
      const venueId = currentUser.venueId || ''
      const cleanEmail = email.trim().toLowerCase()
      const cleanName = name.trim() || cleanEmail.split('@')[0]
      const cleanPassword = password || 'Password123!'

      const assignedRoles: Role[] = roles && roles.length ? roles : (role ? [role] : ['vendedor'])
      const primaryRole: Role = assignedRoles[0] || 'vendedor'

      try {
        const credentials = await createUserWithEmailAndPassword(secondaryAuth, cleanEmail, cleanPassword)
        await updateProfile(credentials.user, { displayName: cleanName })
        const user: User = {
          id: credentials.user.uid,
          name: cleanName,
          email: cleanEmail,
          role: primaryRole,
          roles: assignedRoles,
          venueId,
          createdAt: new Date().toISOString()
        }
        await setDoc(doc(db, 'users', user.id), user)
        await signOut(secondaryAuth).catch(() => {})
        setData((prev) => ({
          ...prev,
          users: [user, ...prev.users.filter((u) => u.id !== user.id)]
        }))
      } catch (err: any) {
        console.error('Error in addMember:', err)
        const msg = err?.code === 'auth/email-already-in-use'
          ? 'El correo electrónico ya está registrado.'
          : err?.code === 'auth/weak-password'
          ? 'La contraseña es demasiado débil.'
          : err?.message || 'No se pudo registrar el usuario.'
        throw new Error(msg)
      }
    },
    async createEvent(input) {
      if (!currentUser) throw new Error('Sesión vencida.')
      const event = { ...input, name: input.name.trim(), venue: input.venue.trim(), notes: input.notes.trim(), status: input.status ?? 'activo', createdBy: currentUser.id, createdAt: new Date().toISOString() }
      const created = await addDoc(collection(db, 'events'), { ...event, createdAt: serverTimestamp() })
      const result = { id: created.id, ...event }
      setData((prev) => ({ ...prev, events: [result, ...prev.events] }))
      return result
    },
    async updateEventStatus(id, status) {
      await updateDoc(doc(db, 'events', id), { status })
      setData((prev) => ({ ...prev, events: prev.events.map((event) => event.id === id ? { ...event, status } : event) }))
    },
    async saveQrItem(item) {
      await setDoc(doc(db, 'qrCatalog', item.id), item)
      setData((prev) => ({
        ...prev,
        qrCatalog: [item, ...prev.qrCatalog.filter((q) => q.id !== item.id)],
      }))
    },
    async deleteQrItem(id) {
      await deleteDoc(doc(db, 'qrCatalog', id))
      setData((prev) => ({
        ...prev,
        qrCatalog: prev.qrCatalog.filter((q) => q.id !== id),
      }))
    },
    async saveLimitation(limitation) {
      await setDoc(doc(db, 'limitations', limitation.id), limitation)
      setData((prev) => ({
        ...prev,
        limitations: [limitation, ...prev.limitations.filter((l) => l.id !== limitation.id)],
      }))
    },
    async deleteLimitation(id) {
      await deleteDoc(doc(db, 'limitations', id))
      setData((prev) => ({
        ...prev,
        limitations: prev.limitations.filter((l) => l.id !== id),
      }))
    },
    async issueTicket({ eventId, kind, holderName, dni }) {
      if (!currentUser) throw new Error('Sesión vencida.')
      const event = data.events.find((item) => item.id === eventId)
      if (!event || event.status !== 'activo') throw new Error('La fecha no está activa.')
      if (currentUser.role === 'canjeador') throw new Error('El canjeador no emite accesos.')
      const ticket: Omit<Ticket, 'id'> = { eventId, kind, code: ticketCode(), holderName: holderName.trim(), dni: (dni ?? '').replace(/\D/g, ''), issuedBy: currentUser.id, issuedAt: new Date().toISOString(), redeemedAt: null, redeemedBy: null }
      const created = await addDoc(collection(db, 'tickets'), ticket)
      const result = { id: created.id, ...ticket }
      setData((prev) => ({ ...prev, tickets: [result, ...prev.tickets] }))
      return result
    },
    async redeemTicket(code) {
      if (!currentUser) return { ok: false, message: 'Sesión vencida.' }
      if (currentUser.role === 'vendedor') return { ok: false, message: 'El vendedor no canjea en puerta.' }

      // Validación Geográfica
      if (currentUser.venueId) {
        const venue = data.venues.find(v => v.id === currentUser.venueId)
        if (venue && venue.radius > 0) {
          try {
            const pos: any = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 }))
            const dist = getDistance(pos.coords.latitude, pos.coords.longitude, venue.latitude, venue.longitude)
            if (dist > venue.radius) {
              return { ok: false, message: `Estás fuera del radio permitido para canjear (${Math.round(dist)}m de distancia).` }
            }
          } catch {
            return { ok: false, message: 'No se pudo obtener tu ubicación GPS necesaria para el canje.' }
          }
        }
      }

      const normalized = code.trim().toUpperCase()
      const match = data.tickets.find((ticket) => ticket.code === normalized)
      if (!match) return { ok: false, message: 'Ese código no existe.' }
      const event = data.events.find((item) => item.id === match.eventId)
      if (event?.status !== 'activo') return { ok: false, message: 'La fecha de este acceso no está activa.' }
      if (match.redeemedAt) return { ok: false, message: 'Ya fue canjeado.' }
      const redeemed = { ...match, redeemedAt: new Date().toISOString(), redeemedBy: currentUser.id }
      await updateDoc(doc(db, 'tickets', match.id), { redeemedAt: redeemed.redeemedAt, redeemedBy: redeemed.redeemedBy })
      setData((prev) => ({ ...prev, tickets: prev.tickets.map((ticket) => ticket.id === match.id ? redeemed : ticket) }))
      return { ok: true, ticket: redeemed }
    },
    async updateUserRole(userId, role, venueId, roles) {
      if (currentUser?.role !== 'admin' && currentUser?.role !== 'organizador') throw new Error('Sin permisos para asignar roles.')
      const updates: any = {}
      if (role !== undefined) {
        updates.role = role
        updates.roles = [role]
      }
      if (roles !== undefined) {
        updates.roles = roles
        if (roles.length > 0) updates.role = roles[0]
      }
      if (venueId !== undefined) updates.venueId = venueId
      await updateDoc(doc(db, 'users', userId), updates)
      setData((prev) => ({
        ...prev,
        users: prev.users.map((u) => u.id === userId ? { ...u, ...updates } : u),
      }))
    },
    async resetUserPasswordByEmail(email) {
      if (currentUser?.role !== 'admin') throw new Error('Solo el superusuario puede blanquear contraseñas.')
      await sendPasswordResetEmail(auth, email.trim().toLowerCase())
    },
    async createVenue(input) {
      if (currentUser?.role !== 'admin') throw new Error('Solo el superusuario puede registrar locales.')
      const venue = { ...input, name: input.name.trim(), address: input.address.trim(), createdAt: new Date().toISOString() }
      const created = await addDoc(collection(db, 'venues'), { ...venue, createdAt: serverTimestamp() })
      const result = { id: created.id, ...venue }
      setData((prev) => ({ ...prev, venues: [result, ...prev.venues] }))
      return result
    },
    async deleteVenue(id) {
      if (currentUser?.role !== 'admin') throw new Error('Solo el superusuario puede eliminar locales.')
      await deleteDoc(doc(db, 'venues', id))
      setData((prev) => ({ ...prev, venues: prev.venues.filter((v) => v.id !== id) }))
    },
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp fuera de AppProvider')
  return context
}
