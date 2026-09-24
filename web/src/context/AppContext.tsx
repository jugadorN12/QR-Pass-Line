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
import { formatCouponSchedule } from '../lib/dateUtils'
import type { AppData, ClubEvent, CouponTemplateConfig, EventStatus, Limitation, QrCatalogItem, Role, Ticket, TicketKind, User, Venue } from '../types'
import { defaultCouponTemplate } from '../types'

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
  issueTicket: (input: { eventId: string; couponId?: string; kind: TicketKind; holderName: string; dni?: string }) => Promise<Ticket>
  redeemTicket: (code: string) => Promise<{ ok: true; ticket: Ticket; [key: string]: any } | { ok: false; message: string; [key: string]: any }>
  saveQrItem: (item: QrCatalogItem) => Promise<void>
  deleteQrItem: (id: string) => Promise<void>
  saveLimitation: (limitation: Limitation) => Promise<void>
  deleteLimitation: (id: string) => Promise<void>
  updateUserRole: (userId: string, role?: Role, venueId?: string, roles?: Role[]) => Promise<void>
  deleteUser: (userId: string) => Promise<void>
  resetUserPasswordByEmail: (email: string) => Promise<void>
  createVenue: (input: Omit<Venue, 'id' | 'createdAt'>) => Promise<Venue>
  deleteVenue: (id: string) => Promise<void>
  saveCouponTemplate: (config: CouponTemplateConfig) => Promise<void>
  updateUserAvatar: (userId: string, avatarUrl: string) => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)
const emptyData: AppData = { users: [], events: [], tickets: [], qrCatalog: [], limitations: [], venues: [], couponTemplate: defaultCouponTemplate, session: null }

const ADMIN_EMAIL = 'simplemente_anibal@hotmail.com'

function asUser(id: string, value: Record<string, unknown>): User {
  let role = (value.role as Role) ?? 'pendiente'
  if (String(value.email).toLowerCase() === ADMIN_EMAIL) {
    role = 'admin'
  }
  const email = String(value.email ?? '')
  const name = String(value.name ?? (email ? email.split('@')[0] : 'Usuario'))
  const rawAvatar = String(value.avatar ?? '')
  const avatar = rawAvatar || (email ? `https://unavatar.io/${encodeURIComponent(email)}?fallback=https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=193659&color=fff` : '')

  return {
    id,
    name,
    email,
    role,
    roles: Array.isArray(value.roles) ? (value.roles as Role[]) : (role ? [role] : []),
    venueId: String(value.venueId ?? ''),
    avatar,
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
      const userDocRef = doc(db, 'users', firebaseUser.uid)
      const profile = await getDoc(userDocRef)

      let currentUserObj: User
      const email = firebaseUser.email ? firebaseUser.email.toLowerCase() : ''
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
          } catch {}
        }

        if (existingUserDoc) {
          const existingData = existingUserDoc.data()
          currentUserObj = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || existingData.name || (email ? email.split('@')[0] : 'Usuario'),
            email,
            role: existingData.role || ((email === ADMIN_EMAIL) ? 'admin' : 'pendiente'),
            roles: existingData.roles || (existingData.role ? [existingData.role] : []),
            venueId: existingData.venueId || '',
            avatar: existingData.avatar || '',
            createdAt: existingData.createdAt || new Date().toISOString(),
          }
          await setDoc(userDocRef, currentUserObj)
          if (existingUserDoc.id !== firebaseUser.uid) {
            await deleteDoc(doc(db, 'users', existingUserDoc.id)).catch(() => {})
          }
        } else {
          const usersSnap = await getDocs(collection(db, 'users'))
          const isFirst = usersSnap.empty
          const assignedRole: Role = (isFirst || email === ADMIN_EMAIL) ? 'admin' : 'pendiente'
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
        // Forzar admin si es el mail configurado aunque el doc diga otra cosa
        if (currentUserObj.email.toLowerCase() === ADMIN_EMAIL && currentUserObj.role !== 'admin') {
          currentUserObj.role = 'admin'
          await updateDoc(userDocRef, { role: 'admin' })
        }
      }

      const [usersSnapshot, eventsSnapshot, ticketsSnapshot, qrSnapshot, limitationsSnapshot, venuesSnapshot, settingsSnapshot] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'events')),
        getDocs(collection(db, 'tickets')),
        getDocs(collection(db, 'qrCatalog')),
        getDocs(collection(db, 'limitations')),
        getDocs(collection(db, 'venues')),
        getDoc(doc(db, 'settings', 'couponTemplate')).catch(() => null),
      ])

      // Deduplicate users list by email so UI never shows duplicate rows
      const userMap = new Map<string, User>()
      for (const rawUser of usersSnapshot.docs.map((item) => asUser(item.id, item.data()))) {
        const key = rawUser.email ? rawUser.email.toLowerCase() : rawUser.id
        if (!userMap.has(key)) {
          userMap.set(key, rawUser)
        } else {
          const existing = userMap.get(key)!
          // Prefer the document that has active roles or matches current user
          if (rawUser.id === firebaseUser.uid || (rawUser.role !== 'pendiente' && existing.role === 'pendiente')) {
            userMap.set(key, rawUser)
          }
        }
      }
      if (!userMap.has(currentUserObj.email.toLowerCase())) {
        userMap.set(currentUserObj.email.toLowerCase(), currentUserObj)
      }
      const allUsers = Array.from(userMap.values())

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

      let couponTemplate: CouponTemplateConfig = defaultCouponTemplate
      if (settingsSnapshot && (settingsSnapshot as any).exists && (settingsSnapshot as any).exists()) {
        couponTemplate = { ...defaultCouponTemplate, ...(settingsSnapshot as any).data() }
      } else {
        const localSaved = localStorage.getItem('qr-pass-line.coupon-template')
        if (localSaved) {
          try { couponTemplate = { ...defaultCouponTemplate, ...JSON.parse(localSaved) } } catch {}
        }
      }
      localStorage.setItem('qr-pass-line.coupon-template', JSON.stringify(couponTemplate))

      setData({
        users: allUsers,
        events: eventsSnapshot.docs.map((item) => ({ id: item.id, ...item.data() } as ClubEvent)),
        tickets: ticketsSnapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Ticket)),
        qrCatalog,
        limitations,
        venues,
        couponTemplate,
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
      const cleanEmail = email.trim().toLowerCase()
      const cleanName = name.trim()

      const credentials = await createUserWithEmailAndPassword(auth, cleanEmail, password)
      await updateProfile(credentials.user, { displayName: cleanName })

      const assignedRole: Role = cleanEmail === ADMIN_EMAIL ? 'admin' : 'pendiente'

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
      if (!auth.currentUser) throw new Error('Sesión vencida.')
      if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.')
      await updatePassword(auth.currentUser, password)
    },
    async updateUserAvatar(userId, avatarUrl) {
      if (!currentUser) throw new Error('Sesión vencida.')
      await updateDoc(doc(db, 'users', userId), { avatar: avatarUrl })
      setData((prev) => ({
        ...prev,
        users: prev.users.map((user) => user.id === userId ? { ...user, avatar: avatarUrl } : user),
      }))
    },
    async addMember({ name, email, password, role, roles }) {
      const isMasterAdmin = currentUser?.email?.toLowerCase() === ADMIN_EMAIL || currentUser?.role === 'admin' || currentUser?.roles?.includes('admin')
      const isOrgOrAdmin = isMasterAdmin || currentUser?.role === 'organizador' || currentUser?.roles?.includes('organizador')
      if (!isOrgOrAdmin) {
        throw new Error('Sin permisos para registrar personal.')
      }
      const venueId = currentUser?.venueId || ''
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

      // 2. If user exists in Firestore database (e.g. registered on login page), update their role
      const q = query(collection(db, 'users'), where('email', '==', cleanEmail))
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
          // If already in Auth, look up existing Firestore user by email and sync roles
          const q = query(collection(db, 'users'), where('email', '==', cleanEmail))
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
          throw new Error(`El email "${cleanEmail}" ya está registrado en el sistema. El usuario puede ingresar directamente con su contraseña.`)
        }
        const msg = err?.code === 'auth/weak-password'
          ? 'La contraseña es demasiado débil (mínimo 6 caracteres).'
          : err?.message || 'No se pudo registrar el usuario.'
        throw new Error(msg)
      } finally {
        await signOut(secondaryAuth).catch(() => {})
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
    async issueTicket({ eventId, couponId, kind, holderName, dni }) {
      if (!currentUser) throw new Error('Sesión vencida.')
      const event = data.events.find((item) => item.id === eventId)
      if (!event || event.status !== 'activo') throw new Error('La fecha no está activa.')
      if (currentUser.role === 'canjeador') throw new Error('El canjeador no emite accesos.')
      const ticket: Omit<Ticket, 'id'> = { eventId, couponId: couponId || '', kind, code: ticketCode(), holderName: holderName.trim(), dni: (dni ?? '').replace(/\D/g, ''), issuedBy: currentUser.id, issuedAt: new Date().toISOString(), redeemedAt: null, redeemedBy: null }
      const created = await addDoc(collection(db, 'tickets'), ticket)
      const result = { id: created.id, ...ticket }
      setData((prev) => ({ ...prev, tickets: [result, ...prev.tickets] }))
      return result
    },
    async redeemTicket(code) {
      const normalizedCode = code.trim().toUpperCase()
      let ticket = data.tickets.find((t) => (t.code || '').trim().toUpperCase() === normalizedCode)

      // Always fetch latest live status from Firestore
      try {
        const q = query(collection(db, 'tickets'), where('code', '==', normalizedCode))
        const snap = await getDocs(q)
        if (!snap.empty) {
          const d = snap.docs[0]
          ticket = { id: d.id, ...(d.data() as any) } as Ticket
        }
      } catch (e) {
        console.error('Error in live ticket lookup:', e)
      }

      if (!ticket) {
        return {
          ok: false,
          reason: 'not_found',
          message: 'El código QR no existe o no se encuentra registrado en el sistema.'
        }
      }

      // Lookup Seller / RRPP Name
      const seller = data.users.find((u) => u.id === ticket.issuedBy)
      const sellerName = seller ? seller.name : 'Vendedor General'

      // Lookup Event & Venue & Coupon
      const event = data.events.find((e) => e.id === ticket.eventId)
      const coupon = data.qrCatalog.find((q) => q.id === ticket.couponId)
      const ticketVenue = event?.venue || ''
      const ticketName = coupon?.name || 'INGRESO GENERAL'
      const schedule = formatCouponSchedule(event, coupon)
      let formattedDate = 'Fecha de hoy'
      if (event?.date) {
        try {
          const parts = event.date.split('-')
          if (parts.length === 3) {
            formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`
          } else {
            formattedDate = event.date
          }
        } catch {
          formattedDate = event.date
        }
      }

      // 1. Check Establishment / Venue Match (only if staff has a specific venueId assigned)
      const currentVenueName = currentUser?.venueId
        ? (data.venues.find((v) => v.id === currentUser.venueId)?.name || '')
        : ''

      if (currentVenueName && ticketVenue && !ticketVenue.toLowerCase().includes(currentVenueName.toLowerCase()) && !currentVenueName.toLowerCase().includes(ticketVenue.toLowerCase())) {
        return {
          ok: false,
          reason: 'wrong_venue',
          message: `Este cupón pertenece al local "${ticketVenue}" y estás operando en "${currentVenueName}".`,
          sellerName,
          ticketName,
          date: formattedDate,
          schedule,
          quantity: '1 persona beneficiada',
          ticketVenue
        }
      }

      // 2. Check Event Status / Active Date
      if (event && event.status !== 'activo') {
        return {
          ok: false,
          reason: 'inactive_event',
          message: `La fecha de este acceso ("${event.name}") no está activa hoy.`,
          sellerName,
          eventName: event.name,
          ticketName,
          date: formattedDate,
          schedule,
          quantity: '1 persona beneficiada'
        }
      }

      // 3. Check Single Use / Already Redeemed (Bloqueo estricto para que un QR no pueda canjearse 2 veces)
      if (ticket.redeemedAt) {
        const redeemer = data.users.find((u) => u.id === ticket.redeemedBy)
        const redeemerName = redeemer ? redeemer.name : 'Personal de Puerta'
        const redeemedDate = new Date(ticket.redeemedAt)
        const formattedTime = !isNaN(redeemedDate.getTime())
          ? redeemedDate.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
          : ticket.redeemedAt

        return {
          ok: false,
          reason: 'already_used',
          message: `Este código QR ya fue canjeado e ingresado anteriormente.`,
          sellerName,
          redeemedAtFormatted: formattedTime,
          redeemerName,
          holderName: ticket.holderName || 'Portador',
          ticketName,
          date: formattedDate,
          schedule,
          quantity: '1 persona beneficiada'
        }
      }

      // 4. Mark Ticket as Redeemed in Firestore & Local State
      const redeemed = {
        ...ticket,
        redeemedAt: new Date().toISOString(),
        redeemedBy: currentUser?.id || 'staff_puerta'
      }

      try {
        await updateDoc(doc(db, 'tickets', ticket.id), {
          redeemedAt: redeemed.redeemedAt,
          redeemedBy: redeemed.redeemedBy
        })
      } catch (e) {
        console.error('Error updating ticket redemption in Firestore:', e)
      }

      setData((prev) => ({
        ...prev,
        tickets: prev.tickets.some((t) => t.id === ticket.id)
          ? prev.tickets.map((t) => (t.id === ticket.id ? redeemed : t))
          : [redeemed, ...prev.tickets]
      }))

      return {
        ok: true,
        ticket: redeemed,
        sellerName,
        eventName: event?.name || 'Evento Activo',
        venueName: ticketVenue || currentVenueName || 'Local Principal',
        ticketName,
        date: formattedDate,
        schedule,
        quantity: '1 persona beneficiada'
      }
    },
    async updateUserRole(userId, role, venueId, roles) {
      const isMasterAdmin = currentUser?.email?.toLowerCase() === ADMIN_EMAIL || currentUser?.role === 'admin' || currentUser?.roles?.includes('admin')
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
      if (venueId !== undefined) updates.venueId = venueId
      await updateDoc(doc(db, 'users', userId), updates)
      setData((prev) => ({
        ...prev,
        users: prev.users.map((u) => u.id === userId ? { ...u, ...updates } : u),
      }))
    },
    async deleteUser(userId) {
      const isMasterAdmin = currentUser?.email?.toLowerCase() === ADMIN_EMAIL || currentUser?.role === 'admin' || currentUser?.roles?.includes('admin')
      const isOrgOrAdmin = isMasterAdmin || currentUser?.role === 'organizador' || currentUser?.roles?.includes('organizador')
      if (!isOrgOrAdmin) throw new Error('Solo el superusuario o encargado puede eliminar usuarios.')
      const targetUser = data.users.find((u) => u.id === userId)
      if (targetUser && targetUser.email.toLowerCase() === ADMIN_EMAIL) {
        throw new Error('No se puede eliminar la cuenta del administrador principal.')
      }
      // 1. Eliminar usuario de Firestore
      await deleteDoc(doc(db, 'users', userId))

      // 2. Eliminar limitaciones asociadas
      const userLimits = data.limitations.filter((l) => l.personId === userId)
      for (const lim of userLimits) {
        await deleteDoc(doc(db, 'limitations', lim.id)).catch(() => {})
      }

      // 3. Actualizar estado local
      setData((prev) => ({
        ...prev,
        users: prev.users.filter((u) => u.id !== userId),
        limitations: prev.limitations.filter((l) => l.personId !== userId),
      }))
    },
    async resetUserPasswordByEmail(email) {
      const isMasterAdmin = currentUser?.email?.toLowerCase() === ADMIN_EMAIL || currentUser?.role === 'admin' || currentUser?.roles?.includes('admin')
      if (!isMasterAdmin) throw new Error('Solo el superusuario puede blanquear contraseñas.')
      await sendPasswordResetEmail(auth, email.trim().toLowerCase())
    },
    async createVenue(input) {
      const isMasterAdmin = currentUser?.email?.toLowerCase() === ADMIN_EMAIL || currentUser?.role === 'admin' || currentUser?.roles?.includes('admin')
      const isOrgOrAdmin = isMasterAdmin || currentUser?.role === 'organizador' || currentUser?.roles?.includes('organizador')
      if (!isOrgOrAdmin) throw new Error('Solo administradores pueden registrar locales.')
      const venue = { ...input, name: input.name.trim(), address: input.address.trim(), createdAt: new Date().toISOString() }
      const created = await addDoc(collection(db, 'venues'), { ...venue, createdAt: serverTimestamp() })
      const result = { id: created.id, ...venue }
      setData((prev) => ({ ...prev, venues: [result, ...prev.venues] }))
      return result
    },
    async deleteVenue(id) {
      const isMasterAdmin = currentUser?.email?.toLowerCase() === ADMIN_EMAIL || currentUser?.role === 'admin' || currentUser?.roles?.includes('admin')
      const isOrgOrAdmin = isMasterAdmin || currentUser?.role === 'organizador' || currentUser?.roles?.includes('organizador')
      if (!isOrgOrAdmin) throw new Error('Solo administradores pueden eliminar locales.')
      await deleteDoc(doc(db, 'venues', id))
      setData((prev) => ({ ...prev, venues: prev.venues.filter((v) => v.id !== id) }))
    },
    async saveCouponTemplate(config: CouponTemplateConfig) {
      localStorage.setItem('qr-pass-line.coupon-template', JSON.stringify(config))
      await setDoc(doc(db, 'settings', 'couponTemplate'), config)
      setData((prev) => ({ ...prev, couponTemplate: config }))
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
