export type Role = 'organizador' | 'vendedor' | 'canjeador' | 'supervisor' | 'validador' | 'admin' | 'pendiente' | ''

export type EventStatus = 'borrador' | 'activo' | 'cerrado'

export type TicketKind = 'qr' | 'dni'

export type User = {
  id: string
  name: string
  email: string
  role: Role
  roles?: Role[]
  venueId?: string
  avatar?: string
  createdAt: string
}

export type Venue = {
  id: string
  name: string
  address: string
  latitude: number
  longitude: number
  radius: number // en metros
  createdAt: string
}

export type ClubEvent = {
  id: string
  name: string
  venue: string
  date: string
  doorsOpen: string
  status: EventStatus
  notes: string
  createdBy: string
  createdAt: string
}

export type Ticket = {
  id: string
  eventId: string
  couponId?: string
  kind: TicketKind
  code: string
  holderName: string
  dni: string
  issuedBy: string
  issuedAt: string
  redeemedAt: string | null
  redeemedBy: string | null
}

export type Session = {
  userId: string
}

export type QrCatalogItem = {
  id: string
  name: string
  description: string
  kind: 'viral' | 'consumible'
  from: string
  duration: string
  icon?: string
  publicAccess?: boolean
  active?: boolean
  days?: string[]
  scheduleMode?: 'full' | 'end' | 'hidden'
  backgroundImage?: string
}

export type Limitation = {
  id: string
  personId: string
  couponId: string
  quantity: number
  period: string
  days?: string[]
}

export type CouponTemplateConfig = {
  qrY: number
  qrSize: number
  qrRadius: number
  tableY?: number
  brightness: number
  shadow: boolean
  bgZoom?: number
  bgPosX?: number
  bgPosY?: number
}

export const defaultCouponTemplate: CouponTemplateConfig = {
  qrY: 180,
  qrSize: 180,
  qrRadius: 24,
  brightness: 1,
  shadow: true,
  bgZoom: 100,
  bgPosX: 0,
  bgPosY: 0,
}

export type AppData = {
  users: User[]
  events: ClubEvent[]
  tickets: Ticket[]
  qrCatalog: QrCatalogItem[]
  limitations: Limitation[]
  venues: Venue[]
  couponTemplate?: CouponTemplateConfig
  session: Session | null
}

