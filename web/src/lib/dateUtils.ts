import type { ClubEvent, QrCatalogItem } from '../types'

export function formatCouponSchedule(event?: ClubEvent, coupon?: Partial<QrCatalogItem> | { name?: string; duration?: string; scheduleMode?: string; [key: string]: any }): string {
  let startDay = '19'
  let startMonth = '09'
  let nextDay = '20'
  let nextMonth = '09'
  let startTime = '23:59'

  if (event?.date) {
    const eventDateStr = event.date.includes('T') ? event.date.split('T')[0] : event.date
    const parts = eventDateStr.split('-').map(Number)
    if (parts.length >= 3 && parts[0] && parts[1] && parts[2]) {
      const startDate = new Date(parts[0], parts[1] - 1, parts[2])
      const nextDate = new Date(startDate)
      nextDate.setDate(nextDate.getDate() + 1)

      startDay = String(startDate.getDate()).padStart(2, '0')
      startMonth = String(startDate.getMonth() + 1).padStart(2, '0')
      nextDay = String(nextDate.getDate()).padStart(2, '0')
      nextMonth = String(nextDate.getMonth() + 1).padStart(2, '0')
    }
    startTime = event.doorsOpen || (event.date.includes('T') ? event.date.split('T')[1].slice(0, 5) : '23:59')
  }

  // Extraer el horario límite del cupón (ej: "02:30", "2AM", "04:00")
  let limitTime = '02:00'
  if (coupon?.duration) {
    const match = coupon.duration.match(/(\d{1,2}:\d{2})/)
    if (match) limitTime = match[1]
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
