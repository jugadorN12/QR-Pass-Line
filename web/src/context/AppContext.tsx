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
} from 'firebase/auth'
import {
  addDoc,
  collection,
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
import type { AppData, ClubEvent, EventStatus, Role, Ticket, TicketKind, User } from '../types'

type AppContextValue = AppData & {
  loading: boolean
  currentUser: User | null
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  updateName: (name: string) => Promise<void>
  updateUserPassword: (password: string) => Promise<void>
  addMember: (input: { name: string; email: string; password: string; role: Role }) => Promise<void>
  createEvent: (input: Omit<ClubEvent, 'id' | 'createdAt' | 'createdBy' | 'status'> & { status?: EventStatus }) => Promise<ClubEvent>
  updateEventStatus: (id: string, status: EventStatus) => Promise<void>
  issueTicket: (input: { eventId: string; kind: TicketKind; holderName: string; dni?: string }) => Promise<Ticket>
  redeemTicket: (code: string) => Promise<{ ok: true; ticket: Ticket } | { ok: false; message: string }>
}

const AppContext = createContext<AppContextValue | null>(null)
const emptyData: AppData = { users: [], events: [], tickets: [], session: null }

function asUser(id: string, value: Record<string, unknown>): User {
  return {
    id,
    name: String(value.name ?? ''),
    email: String(value.email ?? ''),
    role: (value.role as Role) ?? 'vendedor',
    createdAt: String(value.createdAt ?? new Date().toISOString()),
  }
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
      const [profile, usersSnapshot, eventsSnapshot, ticketsSnapshot] = await Promise.all([
        getDoc(doc(db, 'users', firebaseUser.uid)),
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'events')),
        getDocs(query(collection(db, 'tickets'), where('issuedBy', '!=', ''))),
      ])
      const current = profile.exists() ? asUser(firebaseUser.uid, profile.data()) : null
      setData({
        users: usersSnapshot.docs.map((item) => asUser(item.id, item.data())),
        events: eventsSnapshot.docs.map((item) => ({ id: item.id, ...item.data() } as ClubEvent)),
        tickets: ticketsSnapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Ticket)),
        session: current ? { userId: current.id } : null,
      })
    } catch (error) {
      console.error('No se pudieron cargar los datos de Firebase.', error)
      setData(emptyData)
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
      const credentials = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password)
      await updateProfile(credentials.user, { displayName: name.trim() })
      const profile: User = {
        id: credentials.user.uid,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role: 'organizador',
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
    async addMember({ name, email, password, role }) {
      if (currentUser?.role !== 'organizador') throw new Error('Solo el organizador puede cargar el equipo.')
      const credentials = await createUserWithEmailAndPassword(secondaryAuth, email.trim().toLowerCase(), password)
      await updateProfile(credentials.user, { displayName: name.trim() })
      const user: User = { id: credentials.user.uid, name: name.trim(), email: email.trim().toLowerCase(), role, createdAt: new Date().toISOString() }
      await setDoc(doc(db, 'users', user.id), user)
      await signOut(secondaryAuth)
      setData((prev) => ({ ...prev, users: [...prev.users, user] }))
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
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp fuera de AppProvider')
  return context
}
