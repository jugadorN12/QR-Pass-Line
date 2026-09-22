import { useState, useMemo } from 'react'

const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
]

const DAY_NAMES = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom']

interface DateRangePickerProps {
  initialRange?: string
  onClose: () => void
  onSelectRange: (rangeString: string, days?: string[]) => void
}

function parseDate(str: string): Date | null {
  if (!str) return null
  const parts = str.trim().split(/[/.-]/)
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10) - 1
    const year = parseInt(parts[2], 10)
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      return new Date(year, month, day)
    }
  }
  return null
}

function formatDate(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const y = date.getFullYear()
  return `${d}/${m}/${y}`
}

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  )
}

function isBetween(target: Date, start: Date, end: Date): boolean {
  const t = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime()
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime()
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime()
  return t > s && t < e
}

export function DoorsDateRangePicker({ initialRange = '', onClose, onSelectRange }: DateRangePickerProps) {
  // Parse initial dates if present (e.g. "22/09/2026 - 26/09/2026")
  const parsedRange = useMemo(() => {
    const parts = initialRange.split('-').map((s) => s.trim())
    const start = parts[0] ? parseDate(parts[0]) : null
    const end = parts[1] ? parseDate(parts[1]) : null
    return { start, end }
  }, [initialRange])

  const [startDate, setStartDate] = useState<Date | null>(() => parsedRange.start || new Date())
  const [endDate, setEndDate] = useState<Date | null>(() => parsedRange.end || null)

  const [currentYear, setCurrentYear] = useState<number>(() => (parsedRange.start ? parsedRange.start.getFullYear() : new Date().getFullYear()))
  const [currentMonth, setCurrentMonth] = useState<number>(() => (parsedRange.start ? parsedRange.start.getMonth() : new Date().getMonth()))

  function prevMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear((y) => y - 1)
    } else {
      setCurrentMonth((m) => m - 1)
    }
  }

  function nextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear((y) => y + 1)
    } else {
      setCurrentMonth((m) => m + 1)
    }
  }

  function prevYear() {
    setCurrentYear((y) => y - 1)
  }

  function nextYear() {
    setCurrentYear((y) => y + 1)
  }

  // Generate calendar days grid (Monday to Sunday)
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1)
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0)

    // In JS, Sunday is 0, Monday is 1, Saturday is 6.
    // We want Monday = 0, Sunday = 6.
    let startDayOfWeek = firstDayOfMonth.getDay() - 1
    if (startDayOfWeek === -1) startDayOfWeek = 6

    const days: { date: Date; isCurrentMonth: boolean }[] = []

    // Previous month days to fill first week
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate()
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(currentYear, currentMonth - 1, prevMonthLastDay - i),
        isCurrentMonth: false,
      })
    }

    // Current month days
    for (let d = 1; d <= lastDayOfMonth.getDate(); d++) {
      days.push({
        date: new Date(currentYear, currentMonth, d),
        isCurrentMonth: true,
      })
    }

    // Next month days to fill grid up to multiple of 7 (usually 35 or 42)
    const remaining = 7 - (days.length % 7)
    if (remaining < 7) {
      for (let d = 1; d <= remaining; d++) {
        days.push({
          date: new Date(currentYear, currentMonth + 1, d),
          isCurrentMonth: false,
        })
      }
    }

    return days
  }, [currentYear, currentMonth])

  function handleDayClick(dayDate: Date) {
    if (!startDate || (startDate && endDate)) {
      // Start a new range selection
      setStartDate(dayDate)
      setEndDate(null)
    } else {
      // We have a start date, setting the end date
      if (dayDate.getTime() < startDate.getTime()) {
        // Clicked before start date: make this the new start date
        setStartDate(dayDate)
        setEndDate(null)
      } else {
        setEndDate(dayDate)
      }
    }
  }

  function handleConfirm() {
    if (!startDate) {
      onClose()
      return
    }

    const startFormatted = formatDate(startDate)
    const endFormatted = endDate ? formatDate(endDate) : startFormatted
    const rangeResult = `${startFormatted} - ${endFormatted}`

    // Compute active days of week
    const activeDays: string[] = []
    const dayLetters = ['D', 'L', 'M', 'X', 'J', 'V', 'S'] // JS index 0=Dom, 1=Lun, 2=Mar, 3=Mie, 4=Jue, 5=Vie, 6=Sab
    if (endDate) {
      const cur = new Date(startDate)
      while (cur.getTime() <= endDate.getTime()) {
        const letter = dayLetters[cur.getDay()]
        if (!activeDays.includes(letter)) {
          activeDays.push(letter)
        }
        cur.setDate(cur.getDate() + 1)
      }
    } else {
      activeDays.push(dayLetters[startDate.getDay()])
    }

    onSelectRange(rangeResult, activeDays)
    onClose()
  }

  const rangeHeaderText = useMemo(() => {
    if (startDate && endDate) {
      return `${formatDate(startDate)} - ${formatDate(endDate)}`
    }
    if (startDate) {
      return `${formatDate(startDate)} - ${formatDate(startDate)}`
    }
    return 'Seleccionar período'
  }, [startDate, endDate])

  return (
    <div className="doors-calendar-backdrop" onClick={onClose}>
      <div
        className="doors-calendar-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Top Range Display */}
        <div className="doors-calendar-header">
          <strong>{rangeHeaderText}</strong>
        </div>

        {/* Navigation Bar */}
        <div className="doors-calendar-nav-row">
          {/* Month Controls */}
          <div className="doors-calendar-nav-group">
            <button type="button" className="doors-cal-nav-btn" onClick={prevMonth} aria-label="Mes anterior">
              ‹
            </button>
            <span className="doors-cal-nav-title">{MONTH_NAMES[currentMonth]}</span>
            <button type="button" className="doors-cal-nav-btn" onClick={nextMonth} aria-label="Mes siguiente">
              ›
            </button>
          </div>

          {/* Year Controls */}
          <div className="doors-calendar-nav-group">
            <button type="button" className="doors-cal-nav-btn" onClick={prevYear} aria-label="Año anterior">
              ‹
            </button>
            <span className="doors-cal-nav-title">{currentYear}</span>
            <button type="button" className="doors-cal-nav-btn" onClick={nextYear} aria-label="Año siguiente">
              ›
            </button>
          </div>
        </div>

        {/* Days of Week Header */}
        <div className="doors-cal-grid-head">
          {DAY_NAMES.map((name) => (
            <span key={name}>{name}</span>
          ))}
        </div>

        {/* Calendar Days Matrix */}
        <div className="doors-cal-grid-body">
          {calendarDays.map((item, index) => {
            const isStart = startDate && isSameDay(item.date, startDate)
            const isEnd = endDate && isSameDay(item.date, endDate)
            const isInRange = startDate && endDate && isBetween(item.date, startDate, endDate)

            let cellClass = 'doors-cal-day-cell'
            if (!item.isCurrentMonth) cellClass += ' doors-cal-day-other'
            if (isStart) cellClass += ' doors-cal-day-start'
            if (isEnd) cellClass += ' doors-cal-day-end'
            if (isInRange) cellClass += ' doors-cal-day-in-range'

            return (
              <div key={index} className={cellClass} onClick={() => handleDayClick(item.date)}>
                <button
                  type="button"
                  className={`doors-cal-day-btn ${isStart || isEnd ? 'doors-cal-selected-circle' : ''}`}
                >
                  {item.date.getDate()}
                </button>
              </div>
            )
          })}
        </div>

        {/* Bottom Footer with Listo Button */}
        <div className="doors-cal-footer">
          <button type="button" className="doors-cal-done-btn" onClick={handleConfirm}>
            Listo
          </button>
        </div>
      </div>
    </div>
  )
}
