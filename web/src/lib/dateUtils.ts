import type { ClubEvent, Ticket } from '../types'

export const SPANISH_DAY_NAMES = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
]

export function getTodayDateString(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseDate(dateStr: string): Date {
  if (!dateStr) return new Date()
  const parts = dateStr.split('-').map(Number)
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return new Date()
  }
  return new Date(parts[0], parts[1] - 1, parts[2])
}

export function parseDMY(dmyStr: string): Date {
  if (!dmyStr) return new Date()
  const parts = dmyStr.split(/[\/-]/).map(Number)
  if (parts.length >= 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    // If format is DD/MM/YYYY or YYYY-MM-DD
    if (parts[0] > 1000) {
      return new Date(parts[0], parts[1] - 1, parts[2])
    }
    return new Date(parts[2], parts[1] - 1, parts[0])
  }
  return new Date()
}

export function formatDateLabel(dateStr: string): string {
  const d = parseDate(dateStr)
  const weekdays = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab']
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic']
  const w = weekdays[d.getDay()]
  const dayNum = d.getDate()
  const m = months[d.getMonth()]
  return `${w}, ${dayNum} ${m}`
}

export function formatDateDmy(dateStr: string): string {
  const d = parseDate(dateStr)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}-${month}-${year}`
}

export function isSaturday(dateStr: string): boolean {
  const d = parseDate(dateStr)
  return d.getDay() === 6
}

export function getWeeklyDateRange(dateStr: string): { startStr: string; endStr: string; label: string } {
  const target = parseDate(dateStr)
  const dayOfWeek = target.getDay() // 0 = Sun, 6 = Sat
  
  // Calculate Sunday of the current week (or Monday depending on cycle)
  const sunday = new Date(target)
  sunday.setDate(target.getDate() - dayOfWeek)
  
  const saturday = new Date(sunday)
  saturday.setDate(sunday.getDate() + 6)
  
  const toIso = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const startStr = toIso(sunday)
  const endStr = toIso(saturday)
  const label = `${formatDateDmy(startStr)} - ${formatDateDmy(endStr)}`

  return { startStr, endStr, label }
}

export function getTargetDateFromPeriod(period?: string, daysOrDate?: string[] | string): Date {
  if (typeof daysOrDate === 'string' && daysOrDate) {
    return parseDate(daysOrDate)
  }
  if (!period || period.toLowerCase() === 'hoy' || period.toLowerCase() === 'ilimitado') {
    return new Date()
  }
  return new Date()
}

export function formatCouponSchedule(event?: ClubEvent, coupon?: any): string {
  if (!coupon) return 'Válido para el evento'
  
  const mode = coupon.scheduleMode || 'end'
  const from = coupon.from || event?.doorsOpen || '23:59'
  const duration = coupon.duration || '02:00'

  if (mode === 'hidden') {
    return 'Sin restricción horaria'
  }
  if (mode === 'full') {
    return `Válido de ${from} a ${duration} hs`
  }
  return `Válido hasta las ${duration || from || '02:00'} hs`
}

export function getTicketActivitySummary(tickets: Ticket[], selectedDate: string) {
  const sat = isSaturday(selectedDate)
  
  if (sat) {
    // Sábados: Resumen semanal total
    const { startStr, endStr } = getWeeklyDateRange(selectedDate)
    const weekStart = new Date(startStr + 'T00:00:00').getTime()
    const weekEnd = new Date(endStr + 'T23:59:59').getTime()

    const weekIssued = tickets.filter((t) => {
      const time = new Date(t.issuedAt).getTime()
      if (isNaN(time)) return t.issuedAt?.startsWith(selectedDate)
      return time >= weekStart && time <= weekEnd
    })

    const weekRedeemed = tickets.filter((t) => {
      if (!t.redeemedAt) return false
      const time = new Date(t.redeemedAt).getTime()
      if (isNaN(time)) return t.redeemedAt?.startsWith(selectedDate)
      return time >= weekStart && time <= weekEnd
    })

    const sales = weekIssued.reduce((sum, t) => sum + (Number((t as any).price) || 0), 0)
    const issuedCount = weekIssued.length
    const redeemedCount = weekRedeemed.length
    const pendingCount = Math.max(0, issuedCount - redeemedCount)

    return {
      isWeeklySummary: true,
      issuedTickets: weekIssued,
      redeemedTickets: weekRedeemed,
      sales,
      issuedCount,
      redeemedCount,
      pendingCount,
    }
  } else {
    // Días Domingo a Viernes: Actividad exclusiva del día
    const dayIssued = tickets.filter((t) => t.issuedAt?.startsWith(selectedDate))
    const dayRedeemed = tickets.filter((t) => t.redeemedAt?.startsWith(selectedDate))

    const sales = dayIssued.reduce((sum, t) => sum + (Number((t as any).price) || 0), 0)
    const issuedCount = dayIssued.length
    const redeemedCount = dayRedeemed.length
    const pendingCount = Math.max(0, issuedCount - redeemedCount)

    return {
      isWeeklySummary: false,
      issuedTickets: dayIssued,
      redeemedTickets: dayRedeemed,
      sales,
      issuedCount,
      redeemedCount,
      pendingCount,
    }
  }
}
