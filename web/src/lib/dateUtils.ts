import type { ClubEvent, QrCatalogItem } from '../types'

const DAY_LETTERS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'] // 0=Dom, 1=Lun, 2=Mar, 3=Mie, 4=Jue, 5=Vie, 6=Sab
export const SPANISH_DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export function parseDMY(str: string): Date | null {
  if (!str) return null
  const clean = str.trim()
  if (clean.includes('-') && clean.length === 10 && clean[4] === '-' && clean[7] === '-') {
    const [y, m, d] = clean.split('-').map(Number)
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return new Date(y, m - 1, d)
    }
  }
  const parts = clean.split(/[/.-]/).map(Number)
  if (parts.length === 3) {
    if (parts[0] > 1000) {
      return new Date(parts[0], parts[1] - 1, parts[2])
    }
    const d = parts[0]
    const m = parts[1] - 1
    const y = parts[2]
    if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
      return new Date(y, m, d)
    }
  }
  return null
}

export function getTargetDateFromPeriod(period?: string, days?: string[]): Date {
  const now = new Date()
  if (!period || period === 'Ilimitado') {
    return now
  }

  const parts = period.split('-').map((s) => s.trim())
  const startDate = parseDMY(parts[0]) || now
  const endDate = parts[1] ? parseDMY(parts[1]) || startDate : startDate

  if (days && days.length > 0 && days.length < 7) {
    const cur = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
    const endLimit = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate())
    let matchedDate: Date | null = null

    // Si hoy está en rango y coincide con uno de los días habilitados, priorizar hoy
    const todayLetter = DAY_LETTERS[now.getDay()]
    if (now >= cur && now <= endLimit && days.includes(todayLetter)) {
      return now
    }

    while (cur.getTime() <= endLimit.getTime()) {
      const letter = DAY_LETTERS[cur.getDay()]
      if (days.includes(letter)) {
        matchedDate = new Date(cur)
        break
      }
      cur.setDate(cur.getDate() + 1)
    }
    if (matchedDate) return matchedDate
  }

  if (now >= startDate && now <= endDate) {
    return now
  }

  return startDate
}

export type CouponScheduleInput = Partial<QrCatalogItem> & {
  period?: string
  days?: string[]
  from?: string
  duration?: string
  scheduleMode?: 'full' | 'end' | 'hidden'
  name?: string
  [key: string]: any
}

export function formatCouponSchedule(
  event?: ClubEvent,
  coupon?: CouponScheduleInput
): string {
  let targetDate = new Date()

  if (coupon?.period && coupon.period !== 'Ilimitado') {
    targetDate = getTargetDateFromPeriod(coupon.period, coupon.days)
  } else if (event?.date) {
    const parsed = parseDMY(event.date)
    if (parsed) targetDate = parsed
  }

  const startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate())
  const nextDate = new Date(startDate)
  nextDate.setDate(nextDate.getDate() + 1)

  const startDay = String(startDate.getDate()).padStart(2, '0')
  const startMonth = String(startDate.getMonth() + 1).padStart(2, '0')
  const nextDay = String(nextDate.getDate()).padStart(2, '0')
  const nextMonth = String(nextDate.getMonth() + 1).padStart(2, '0')

  let startTime = coupon?.from || event?.doorsOpen || '23:59'
  if (startTime.length === 5 && !startTime.includes(':')) {
    startTime = '23:59'
  }

  // Extraer el horario límite del cupón (ej: "02:30", "2AM", "04:00")
  let limitTime = '02:00'
  if (coupon?.duration) {
    const match = coupon.duration.match(/(\d{1,2}:\d{2})/)
    if (match) limitTime = match[1]
    else {
      const singleMatch = coupon.duration.match(/(\d{1,2})\s*(?:AM|am|PM|pm|hs|HS)/)
      if (singleMatch) limitTime = `${singleMatch[1].padStart(2, '0')}:00`
    }
  } else if (coupon?.name) {
    const match = coupon.name.match(/(\d{1,2}:\d{2})/) || coupon.name.match(/(\d{1,2})\s*(?:AM|am|PM|pm|hs|HS)/)
    if (match) {
      if (match[1].includes(':')) limitTime = match[1]
      else limitTime = `${match[1].padStart(2, '0')}:00`
    }
  }

  const [limitH] = limitTime.split(':').map(Number)
  const isNextDay = isNaN(limitH) || limitH < 18

  if (coupon?.scheduleMode === 'end') {
    return `Válido hasta las ${limitTime} hs (${isNextDay ? `${nextDay}/${nextMonth}` : `${startDay}/${startMonth}`})`
  }

  if (coupon?.scheduleMode === 'hidden') {
    return `Válido para la fecha ${startDay}/${startMonth}`
  }

  return `Del ${startDay}/${startMonth} ${startTime} al ${isNextDay ? `${nextDay}/${nextMonth}` : `${startDay}/${startMonth}`} ${limitTime}`
}

