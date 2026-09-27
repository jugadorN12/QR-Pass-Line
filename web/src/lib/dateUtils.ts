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
  
  const mode = coupon.scheduleMode || 'full'
  if (mode === 'hidden') {
    return 'Sin restricción horaria'
  }

  // 1. Obtener fecha base del evento (o fecha actual)
  const baseDate = event?.date ? parseDate(event.date) : new Date()

  // 2. Extraer y limpiar horario de inicio ("from")
  const rawFrom = String(coupon.from || event?.doorsOpen || '23:59').trim()
  const fromMatch = rawFrom.match(/(\d{1,2}:\d{2})/)
  const cleanFrom = fromMatch ? fromMatch[1] : '23:59'
  const isFromNextDay = rawFrom.toLowerCase().includes('siguiente')

  const startDate = isFromNextDay ? new Date(baseDate.getTime() + 86400000) : new Date(baseDate)
  const startDay = String(startDate.getDate()).padStart(2, '0')
  const startMonth = String(startDate.getMonth() + 1).padStart(2, '0')
  const startDateStr = `${startDay}/${startMonth}`

  // 3. Extraer y limpiar horario de fin ("duration")
  const rawDuration = String(coupon.duration || '02:00').trim()
  const durMatch = rawDuration.match(/(\d{1,2}:\d{2})/)
  const cleanDuration = durMatch ? durMatch[1] : '02:00'

  // 4. Calcular si el horario de fin pasa al día siguiente
  const [fromH, fromM] = cleanFrom.split(':').map(Number)
  const [durH, durM] = cleanDuration.split(':').map(Number)

  const isDurationNextDay =
    rawDuration.toLowerCase().includes('siguiente') ||
    durH < fromH ||
    (durH === fromH && durM < fromM) ||
    (fromH >= 18 && durH <= 12)

  const endDate = isDurationNextDay ? new Date(startDate.getTime() + 86400000) : new Date(startDate)
  const endDay = String(endDate.getDate()).padStart(2, '0')
  const endMonth = String(endDate.getMonth() + 1).padStart(2, '0')
  const endDateStr = `${endDay}/${endMonth}`

  const fromDaySuffix = isFromNextDay ? 'del día siguiente' : 'del día corriente'

  // Formato requerido: "Del 26/09 23:59 del día corriente al 27/09 02:00"
  return `Del ${startDateStr} ${cleanFrom} ${fromDaySuffix} al ${endDateStr} ${cleanDuration}`
}

export function checkCouponScheduleValidity(
  event?: ClubEvent,
  coupon?: any,
  now: Date = new Date()
): { ok: true } | { ok: false; reason: 'expired_schedule'; message: string; limitTime: string } {
  if (!coupon) return { ok: true }

  const mode = coupon.scheduleMode || 'full'
  if (mode === 'hidden') {
    return { ok: true }
  }

  // 1. Obtener fecha base del evento (o fecha actual si no hay fecha definida)
  const baseDate = event?.date ? parseDate(event.date) : new Date()

  // 2. Extraer y limpiar horario límite tope ("duration")
  const rawDuration = String(coupon.duration || '02:00').trim()
  const durMatch = rawDuration.match(/(\d{1,2}):(\d{2})/)
  const durH = durMatch ? Number(durMatch[1]) : 2
  const durM = durMatch ? Number(durMatch[2]) : 0

  // 3. Extraer horario de inicio referencial para evaluar si el tope cruza medianoche
  const rawFrom = String(coupon.from || event?.doorsOpen || '23:59').trim()
  const fromMatch = rawFrom.match(/(\d{1,2}):(\d{2})/)
  const fromH = fromMatch ? Number(fromMatch[1]) : 23
  const fromM = fromMatch ? Number(fromMatch[2]) : 59

  const isDurationNextDay =
    rawDuration.toLowerCase().includes('siguiente') ||
    durH < fromH ||
    (durH === fromH && durM < fromM) ||
    (fromH >= 18 && durH <= 14) ||
    (durH <= 12)

  const endDate = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate() + (isDurationNextDay ? 1 : 0),
    durH,
    durM,
    59, // permitimos hasta el último segundo del minuto límite (ej: 02:00:59)
    999
  )

  const limitTimeStr = `${String(durH).padStart(2, '0')}:${String(durM).padStart(2, '0')}`
  const scannedTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  // Si se escanea después del horario límite de corte
  if (now.getTime() > endDate.getTime()) {
    return {
      ok: false,
      reason: 'expired_schedule',
      message: `El horario límite para este cupón venció a las ${limitTimeStr} hs (escaneado a las ${scannedTimeStr} hs).`,
      limitTime: limitTimeStr,
    }
  }

  // Solo es limitante el horario tope; el horario inicial NO restringe el ingreso
  return { ok: true }
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
