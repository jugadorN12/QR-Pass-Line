export type Role = 'organizador' | 'vendedor' | 'canjeador' | 'supervisor' | 'validador'

export type EventStatus = 'borrador' | 'activo' | 'cerrado'

export type TicketKind = 'qr' | 'dni'

export type User = {
  id: string
  name: string
  email: string
  role: Role
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

export type AppData = {
  users: User[]
  events: ClubEvent[]
  tickets: Ticket[]
  session: Session | null
}
