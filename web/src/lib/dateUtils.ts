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

/**
 * Retorna la fecha operativa actual en formato YYYY-MM-DD.
 * Regla de corte nocturno:
 * Si la hora actual es antes de las 06:00 AM (00:00:00 a 05:59:59),
 * la jornada operativa pertenece a la noche anterior (día - 1).
 * Aplica para cualquier día de la semana:
 * - Domingo 03:00 AM pertenece a la noche del Sábado.
 * - Lunes 04:30 AM pertenece a la noche del Domingo.
 * - Sábado 02:00 AM pertenece a la noche del Viernes.
 */
export function getOperationalDateString(now: Date = new Date()): string {
  const d = new Date(now)
  if (d.getHours() < 6) {
    d.setDate(d.getDate() - 1)
  }
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseDate(dateStr: string): Date {
  if (!dateStr) return new Date()
  const clean = String(dateStr).trim().split(/[T\s]/)[0]
  const parts = clean.split(/[-/]/).map(Number)
  if (parts.length >= 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    // Si viene como YYYY-MM-DD o YYYY/MM/DD
    if (parts[0] > 1000) {
      return new Date(parts[0], parts[1] - 1, parts[2])
    }
    // Si viene como DD-MM-YYYY o DD/MM/YYYY
    return new Date(parts[2], parts[1] - 1, parts[0])
  }
  const fallback = new Date(dateStr)
  return isNaN(fallback.getTime()) ? new Date() : fallback
}

export function parseDMY(dmyStr: string): Date {
  if (!dmyStr) return new Date()
  const clean = String(dmyStr).trim().split(/[T\s]/)[0]
  const parts = clean.split(/[-/]/).map(Number)
  if (parts.length >= 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    // If format is YYYY-MM-DD
    if (parts[0] > 1000) {
      return new Date(parts[0], parts[1] - 1, parts[2])
    }
    // Format is DD-MM-YYYY or DD/MM/YYYY
    return new Date(parts[2], parts[1] - 1, parts[0])
  }
  const fallback = new Date(dmyStr)
  return isNaN(fallback.getTime()) ? new Date() : fallback
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

export const DAY_CODE_TO_INDEX: Record<string, number> = {
  D: 0,
  DOM: 0,
  DOMINGO: 0,
  L: 1,
  LUN: 1,
  LUNES: 1,
  M: 2,
  MAR: 2,
  MARTES: 2,
  X: 3,
  MIE: 3,
  MIERCOLES: 3,
  MIÉRCOLES: 3,
  J: 4,
  JUE: 4,
  JUEVES: 4,
  V: 5,
  VIE: 5,
  VIERNES: 5,
  S: 6,
  SAB: 6,
  SABADO: 6,
  SÁBADO: 6,
}

export function getCouponBaseDate(event?: ClubEvent, coupon?: any, referenceDate: Date = new Date()): Date {
  // 1. Si el evento tiene una fecha definida y válida
  if (event?.date) {
    const parsed = parseDate(event.date)
    if (!isNaN(parsed.getTime())) {
      const rawDays: string[] = Array.isArray(coupon?.days) ? coupon.days : []
      if (rawDays.length === 0 || rawDays.length === 7) {
        return parsed
      }
      const eventDayIndex = parsed.getDay()
      const matchesEventDay = rawDays.some(
        (d) => DAY_CODE_TO_INDEX[String(d).trim().toUpperCase()] === eventDayIndex
      )
      if (matchesEventDay) {
        return parsed
      }
    }
  }

  // 2. Si el cupón especifica días de vigencia propios (ej: ['S'] para Sábado, ['V'] para Viernes)
  const days: string[] = Array.isArray(coupon?.days) ? coupon.days : []
  const cleanDays = days
    .map((d) => DAY_CODE_TO_INDEX[String(d).trim().toUpperCase()])
    .filter((d): d is number => typeof d === 'number' && !isNaN(d))

  if (cleanDays.length > 0 && cleanDays.length < 7) {
    const currentDay = referenceDate.getDay() // 0 = Sun, 6 = Sat
    const currentHour = referenceDate.getHours()

    // Manejo de madrugada en eventos nocturnos (00:00 a 06:00 hs):
    // La jornada operativa comenzó la noche anterior.
    // Ej: Domingo a las 03:00 hs corresponde a la noche de Sábado.
    if (currentHour < 6) {
      const prevDay = (currentDay - 1 + 7) % 7
      if (cleanDays.includes(prevDay)) {
        const prevTarget = new Date(referenceDate)
        prevTarget.setDate(referenceDate.getDate() - 1)
        return new Date(prevTarget.getFullYear(), prevTarget.getMonth(), prevTarget.getDate())
      }
    }

    // Si hoy coincide exactamente con el día de validez del cupón
    if (cleanDays.includes(currentDay)) {
      return new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate())
    }

    // Buscar el próximo día objetivo dentro de la semana
    let minDiff = 7
    for (const targetDay of cleanDays) {
      let diff = (targetDay - currentDay + 7) % 7
      if (diff === 0) diff = 7
      if (diff < minDiff) {
        minDiff = diff
      }
    }

    const target = new Date(referenceDate)
    target.setDate(referenceDate.getDate() + minDiff)
    return new Date(target.getFullYear(), target.getMonth(), target.getDate())
  }

  // 3. Si hay fecha de evento general
  if (event?.date) {
    const parsed = parseDate(event.date)
    if (!isNaN(parsed.getTime())) return parsed
  }

  return new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate())
}

export function formatCouponSchedule(event?: ClubEvent, coupon?: any): string {
  if (!coupon) return 'Válido para el evento'
  
  const mode = coupon.scheduleMode || 'full'
  if (mode === 'hidden') {
    return 'Sin restricción horaria'
  }

  // 1. Obtener fecha base del cupón/evento (según sus días configurados)
  const baseDate = getCouponBaseDate(event, coupon)

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

  if (mode === 'end') {
    return `Válido hasta las ${cleanDuration} hs`
  }

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

  // Formato requerido: "Del 03/10 23:59 al 04/10 02:00"
  return `Del ${startDateStr} ${cleanFrom} al ${endDateStr} ${cleanDuration}`
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

  // 1. Obtener fecha base del cupón/evento
  const baseDate = getCouponBaseDate(event, coupon, now)

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


export function getTicketEventDate(
  ticket: Ticket,
  events?: ClubEvent[],
  qrCatalog?: any[]
): string {
  // 1. Si el ticket ya tiene su eventDate explícito grabado
  if ((ticket as any).eventDate) {
    const d = String((ticket as any).eventDate).split('T')[0].trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d
  }

  // 2. Buscar cupón y evento asociados
  const coupon = qrCatalog && ticket.couponId ? qrCatalog.find((q: any) => q.id === ticket.couponId) : undefined
  const event = events && ticket.eventId ? events.find((e: any) => e.id === ticket.eventId) : undefined

  // Verificar si el cupón tiene días específicos asignados (ej: solo Domingo ['D'], solo Sábado ['S'])
  const couponDays: string[] = Array.isArray(coupon?.days) ? coupon.days : []
  const hasSpecificDays = couponDays.length > 0 && couponDays.length < 7

  if (hasSpecificDays) {
    // Si el evento asignado coincide con uno de los días válidos del cupón, usar la fecha de ese evento
    if (event?.date) {
      const eventD = parseDate(event.date)
      const eventDayIndex = eventD.getDay()
      const matchesEvent = couponDays.some(
        (d) => DAY_CODE_TO_INDEX[String(d).trim().toUpperCase()] === eventDayIndex
      )
      if (matchesEvent) {
        const y = eventD.getFullYear()
        const m = String(eventD.getMonth() + 1).padStart(2, '0')
        const day = String(eventD.getDate()).padStart(2, '0')
        return `${y}-${m}-${day}`
      }
    }

    // De lo contrario, calcular la fecha destino del cupón relativa a la fecha de emisión
    const refDate = ticket.issuedAt ? parseDate(ticket.issuedAt) : new Date()
    const targetDate = getCouponBaseDate(undefined, coupon, refDate)
    const y = targetDate.getFullYear()
    const m = String(targetDate.getMonth() + 1).padStart(2, '0')
    const day = String(targetDate.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  // 3. Si tiene un evento asociado, usar la fecha del evento
  if (event?.date) {
    const eventD = parseDate(event.date)
    const y = eventD.getFullYear()
    const m = String(eventD.getMonth() + 1).padStart(2, '0')
    const day = String(eventD.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  // 4. Fallback: fecha de emisión del ticket
  if (ticket.issuedAt) {
    const raw = String(ticket.issuedAt).split('T')[0].trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  }

  return getTodayDateString()
}

export function getTicketActivitySummary(
  tickets: Ticket[],
  selectedDate: string,
  events?: ClubEvent[],
  qrCatalog?: any[]
) {
  const targetDateStr = selectedDate.split('T')[0]

  // Filtrar los tickets cuyo día de evento/cupón corresponda a la fecha seleccionada
  const dayIssued = tickets.filter((t) => {
    const ticketDate = getTicketEventDate(t, events, qrCatalog)
    return ticketDate === targetDateStr
  })

  // Canjeados correspondientes a este evento
  const dayRedeemed = dayIssued.filter((t) => Boolean(t.redeemedAt))

  const sales = dayIssued.reduce((sum, t) => sum + (Number((t as any).price) || 0), 0)
  const issuedCount = dayIssued.reduce(
    (sum, t) => sum + (typeof t.quantity === 'number' && t.quantity > 0 ? t.quantity : 1),
    0
  )
  const redeemedCount = dayRedeemed.reduce(
    (sum, t) => sum + (typeof t.quantity === 'number' && t.quantity > 0 ? t.quantity : 1),
    0
  )
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

/**
 * Calcula la fecha y hora de corte final de una limitación teniendo en cuenta
 * la regla de jornada nocturna (el evento continúa hasta las 06:00 AM del día siguiente).
 * - Si es sábado, finaliza el domingo a las 06:00:00 AM.
 * - Si es domingo, finaliza el lunes a las 06:00:00 AM.
 * - Para cualquier día D, finaliza el día (D+1) a las 06:00:00 AM.
 */
export function getLimitationCutoffDate(
  limitation: { period?: string; days?: string[] }
): Date | null {
  if (!limitation || !limitation.period || limitation.period === 'Ilimitado') return null

  const parts = limitation.period.split('-').map((s) => s.trim())
  const start = parseDMY(parts[0])
  const end = parseDMY(parts[1] || parts[0])
  if (isNaN(end.getTime())) return null

  // Si tiene días específicos asignados (ej: ['S'] para Sábado)
  const rawDays = limitation.days || []
  const cleanDays = rawDays
    .map((d) => DAY_CODE_TO_INDEX[String(d).trim().toUpperCase()])
    .filter((d): d is number => typeof d === 'number' && !isNaN(d))

  let lastActiveDate = new Date(end)

  if (cleanDays.length > 0 && cleanDays.length < 7 && !isNaN(start.getTime())) {
    // Buscar la última fecha dentro del rango [start, end] que coincida con alguno de los días asignados
    let curr = new Date(end)
    let found = false
    while (curr.getTime() >= start.getTime()) {
      if (cleanDays.includes(curr.getDay())) {
        lastActiveDate = new Date(curr)
        found = true
        break
      }
      curr.setDate(curr.getDate() - 1)
    }
    if (!found) {
      lastActiveDate = new Date(end)
    }
  }

  // Corte final a las 06:00:00 AM de la mañana siguiente al último día activo
  return new Date(
    lastActiveDate.getFullYear(),
    lastActiveDate.getMonth(),
    lastActiveDate.getDate() + 1,
    6,
    0,
    0,
    0
  )
}

/**
 * Comprueba si una limitación ya venció/expiró.
 * Retorna true si ya pasó el horario de corte de las 06:00 AM del día posterior al evento.
 */
export function isLimitationExpired(
  limitation: { period?: string; days?: string[] },
  now: Date = new Date()
): boolean {
  const cutoff = getLimitationCutoffDate(limitation)
  if (!cutoff) return false
  return now.getTime() >= cutoff.getTime()
}

/**
 * Comprueba si una limitación corresponde/aplica a una fecha específica de evento (ej: '2026-10-24').
 */
export function isLimitationMatchingDate(
  limitation: { period?: string; days?: string[] },
  dateStr: string
): boolean {
  if (!limitation) return false
  if (limitation.period === 'Ilimitado') return true

  const targetDate = parseDate(dateStr)
  if (isNaN(targetDate.getTime())) return true

  // 1. Verificar si coincide con los días asignados
  const rawDays = limitation.days || []
  const cleanDays = rawDays
    .map((d) => DAY_CODE_TO_INDEX[String(d).trim().toUpperCase()])
    .filter((d): d is number => typeof d === 'number' && !isNaN(d))

  if (cleanDays.length > 0 && cleanDays.length < 7) {
    if (!cleanDays.includes(targetDate.getDay())) {
      return false
    }
  }

  // 2. Verificar si cae dentro del rango [start, end]
  if (limitation.period && limitation.period.includes('-')) {
    const parts = limitation.period.split('-').map((s) => s.trim())
    const start = parseDMY(parts[0])
    const end = parseDMY(parts[1] || parts[0])
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      const startTime = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime()
      const endTime = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime()
      const t = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()).getTime()
      if (t < startTime || t > endTime) {
        return false
      }
    }
  }

  return true
}

/**
 * Comprueba si un ticket emitido corresponde a una limitación determinada,
 * garantizando que tickets de semanas pasadas no descuenten cupos de la nueva semana.
 */
export function isTicketForLimitation(
  ticket: Ticket,
  limitation: { period?: string; days?: string[]; couponId?: string },
  events?: ClubEvent[],
  qrCatalog?: any[]
): boolean {
  if (limitation.couponId && ticket.couponId && ticket.couponId !== limitation.couponId) {
    return false
  }

  if (!limitation.period || limitation.period === 'Ilimitado') {
    return true
  }

  const ticketDateStr = getTicketEventDate(ticket, events, qrCatalog)
  return isLimitationMatchingDate(limitation, ticketDateStr)
}

