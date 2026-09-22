import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { StaffHeader } from '../components/StaffHeader'
import { DoorsDateRangePicker } from '../components/DoorsDateRangePicker'

export function SellerLimitationsPage() {
  const params = useParams()
  const personId = params.sellerId ?? params.redeemerId ?? ''
  const isRedeemer = Boolean(params.redeemerId)
  const navigate = useNavigate()
  const { users, limitations, deleteLimitation, qrCatalog } = useApp()

  const personUser = users.find((u) => u.id === personId)
  const sellerName = personUser?.name || (isRedeemer ? 'Canjeador' : 'Vendedor')

  const personLimitations = limitations.filter((item) => item.personId === personId)

  function removeAll() {
    if (!window.confirm('¿Estás seguro de eliminar todas las limitaciones?')) return
    personLimitations.forEach((item) => void deleteLimitation(item.id))
  }

  function exportLimitations() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(personLimitations, null, 2))
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute("href", dataStr)
    downloadAnchor.setAttribute("download", `limitaciones-${sellerName.toLowerCase().replace(/\s+/g, '-')}.json`)
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
  }

  const newPath = isRedeemer
    ? `/canjeadores/${personId}/limitaciones/nueva`
    : `/vendedores/${personId}/limitaciones/nueva`

  const backPath = isRedeemer ? '/canjeadores' : '/vendedores'

  return (
    <StaffFrame isRedeemer={isRedeemer}>
      <main className="sellers-main doors-limitation-main">
        {/* Title Bar with < Limitaciones Name + Button */}
        <div className="sellers-titlebar doors-limit-titlebar">
          <Link to={backPath} className="back-link">‹</Link>
          <h1 className="doors-limit-heading">
            Limitaciones {sellerName}
            <button
              className="doors-add-limit-circle-btn"
              type="button"
              aria-label="Nueva limitación"
              onClick={() => navigate(newPath)}
              title="Nueva limitación"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </h1>
        </div>

        {/* Action buttons bar */}
        <div className="doors-limit-action-bar">
          <button className="doors-export-btn" type="button" onClick={exportLimitations}>
            Exportar limitaciones
          </button>
          <button className="doors-delete-all-btn" type="button" onClick={removeAll}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            Eliminar todas
          </button>
        </div>

        {/* Main QR Limitations List Panel */}
        <section className="sellers-panel doors-limit-panel">
          <div className="doors-limit-panel-head">
            <strong>QR's</strong>
            <span>{personLimitations.length} limitaciones</span>
          </div>

          <div className="doors-limit-list">
            {personLimitations.length === 0 ? (
              <div className="doors-limit-empty">
                <p>No hay limitaciones asignadas.</p>
                <button className="btn btn-primary" type="button" onClick={() => navigate(newPath)}>
                  Crear primera limitación
                </button>
              </div>
            ) : (
              personLimitations.map((row) => {
                const coupon = qrCatalog.find((item) => item.id === row.couponId)
                const daysText = row.days && row.days.length ? row.days.join(' ') : 'S'
                const editPath = isRedeemer
                  ? `/canjeadores/${personId}/limitaciones/${row.id}/editar`
                  : `/vendedores/${personId}/limitaciones/${row.id}/editar`

                return (
                  <div className="doors-limit-row" key={row.id}>
                    <div className="doors-limit-row-info">
                      <div className="doors-limit-row-title">
                        <span className="doors-limit-checkbox"></span>
                        <svg className="doors-limit-ticket-icon" width="18" height="13" viewBox="0 0 24 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <rect x="1.5" y="1.5" width="21" height="13" rx="2.5" />
                          <rect x="6" y="4.5" width="12" height="7" rx="1" />
                        </svg>
                        <strong>{coupon?.name?.toUpperCase() ?? 'INGRESO GENERAL'}</strong>
                      </div>
                      <div className="doors-limit-row-sub">
                        <span className="doors-day-badge">{daysText}</span>
                        <span className="doors-period-text">
                          {coupon?.from && coupon?.duration ? `${coupon.from} | de ${coupon.duration}` : (row.period || '01/02/2000 - 31/01/2051')}
                        </span>
                      </div>
                    </div>

                    <div className="doors-limit-row-qty">
                      <b>{row.quantity}</b>
                    </div>

                    <div className="doors-limit-row-buttons">
                      <button
                        type="button"
                        className="doors-edit-btn"
                        aria-label={`Editar ${coupon?.name ?? 'limitación'}`}
                        onClick={() => navigate(editPath)}
                        title="Editar limitación"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="doors-del-btn"
                        aria-label={`Eliminar ${coupon?.name ?? 'limitación'}`}
                        onClick={() => void deleteLimitation(row.id)}
                        title="Eliminar limitación"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </section>
      </main>
    </StaffFrame>
  )
}

function getDefaultWeekPeriod(): string {
  const now = new Date()
  const monday = new Date(now)
  const day = monday.getDay()
  const diffToMonday = (day === 0 ? -6 : 1) - day
  monday.setDate(monday.getDate() + diffToMonday)

  const sunday = new Date(monday)
  sunday.setDate(sunday.getDate() + 6)

  const fmt = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
  return `${fmt(monday)} - ${fmt(sunday)}`
}

export function NewSellerLimitationPage() {
  const params = useParams()
  const sellerId = params.sellerId ?? params.redeemerId ?? ''
  const isRedeemer = Boolean(params.redeemerId)
  const navigate = useNavigate()
  const { qrCatalog, saveLimitation } = useApp()

  const coupons = qrCatalog.filter((c) => c.active !== false)
  const [selectedCouponId, setSelectedCouponId] = useState(coupons[0]?.id || '')
  const [isUnlimited, setIsUnlimited] = useState(false)
  const [period, setPeriod] = useState(getDefaultWeekPeriod)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [quantity, setQuantity] = useState('1')
  const [days, setDays] = useState<string[]>(['S'])

  const backPath = isRedeemer ? `/canjeadores/${sellerId}/limitaciones` : `/vendedores/${sellerId}/limitaciones`

  function toggleDay(day: string) {
    setDays((current) => current.includes(day) ? current.filter((item) => item !== day) : [...current, day])
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedCouponId) return

    await saveLimitation({
      id: `limit-${crypto.randomUUID().slice(0, 8)}`,
      personId: sellerId,
      couponId: selectedCouponId,
      quantity: Math.max(1, Number(quantity) || 1),
      period: isUnlimited ? 'Ilimitado' : period,
      days: days.length ? days : ['S'],
    })
    navigate(backPath)
  }

  return (
    <StaffFrame isRedeemer={isRedeemer}>
      <main className="sellers-main doors-form-main">
        {/* Back Link & Title */}
        <div className="doors-form-top">
          <Link to={backPath} className="doors-back-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>Atrás</span>
          </Link>
          <h1 className="doors-form-title">Nueva Limitación</h1>
        </div>

        {/* Form Formatted as in Image 4 */}
        <form className="doors-limitation-form" onSubmit={handleSubmit}>
          {/* 1. Periodo ilimitado */}
          <div className="doors-field-group">
            <label className="doors-field-label">Período ilimitado</label>
            <div className="doors-toggle-container">
              <button
                type="button"
                className={`doors-toggle-btn ${isUnlimited ? 'active-yes' : ''}`}
                onClick={() => setIsUnlimited(true)}
              >
                Sí
              </button>
              <button
                type="button"
                className={`doors-toggle-btn ${!isUnlimited ? 'active-no' : ''}`}
                onClick={() => setIsUnlimited(false)}
              >
                No
              </button>
            </div>
          </div>

          {/* 2. Periodo */}
          <div className="doors-field-group">
            <label className="doors-field-label">Período</label>
            <div
              className={`doors-input-wrapper doors-calendar-input ${!isUnlimited ? 'doors-clickable-input' : ''}`}
              onClick={() => {
                if (!isUnlimited) setCalendarOpen(true)
              }}
            >
              <svg className="doors-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.8">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <input
                type="text"
                value={isUnlimited ? 'Ilimitado' : period}
                disabled={isUnlimited}
                readOnly
                placeholder="22/09/2026 - 26/09/2026"
                style={{ cursor: isUnlimited ? 'not-allowed' : 'pointer' }}
              />
            </div>
          </div>

          {/* 3. Cupón */}
          <div className="doors-field-group">
            <label className="doors-field-label">Cupón</label>
            <div className="doors-input-wrapper doors-select-wrapper">
              <svg className="doors-input-icon" width="18" height="14" viewBox="0 0 24 16" fill="none" stroke="#64748b" strokeWidth="1.8">
                <rect x="1.5" y="1.5" width="21" height="13" rx="2.5" />
                <rect x="6" y="4.5" width="12" height="7" rx="1" />
              </svg>
              <select
                value={selectedCouponId}
                onChange={(e) => setSelectedCouponId(e.target.value)}
                required
              >
                {coupons.map((coupon) => (
                  <option key={coupon.id} value={coupon.id}>
                    {coupon.name}
                  </option>
                ))}
              </select>
              <span className="doors-select-arrow">⌄</span>
            </div>
          </div>

          {/* 4. Cantidad */}
          <div className="doors-field-group">
            <label className="doors-field-label">Cantidad</label>
            <div className="doors-input-wrapper">
              <svg className="doors-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.8">
                <line x1="4" y1="9" x2="20" y2="9" />
                <line x1="4" y1="15" x2="20" y2="15" />
                <line x1="10" y1="3" x2="8" y2="21" />
                <line x1="16" y1="3" x2="14" y2="21" />
              </svg>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </div>
          </div>

          {/* 5. Días habilitados */}
          <div className="doors-field-group">
            <label className="doors-field-label">Días habilitados:</label>
            <div className="doors-days-row">
              {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day) => {
                const isSelected = days.includes(day)
                return (
                  <button
                    key={day}
                    type="button"
                    className={`doors-day-box ${isSelected ? 'doors-day-active' : ''}`}
                    onClick={() => toggleDay(day)}
                  >
                    {day}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Submit button */}
          <button className="doors-submit-btn" type="submit">
            CREAR LIMITACIÓN
          </button>
        </form>

        {calendarOpen && (
          <DoorsDateRangePicker
            initialRange={period}
            onClose={() => setCalendarOpen(false)}
            onSelectRange={(newRange, newDays) => {
              setPeriod(newRange)
              if (newDays && newDays.length) {
                setDays(newDays)
              }
            }}
          />
        )}
      </main>
    </StaffFrame>
  )
}

export function EditSellerLimitationPage() {
  const params = useParams()
  const sellerId = params.sellerId ?? params.redeemerId ?? ''
  const isRedeemer = Boolean(params.redeemerId)
  const limitationId = params.limitId ?? ''
  const navigate = useNavigate()
  const { qrCatalog, limitations, saveLimitation, deleteLimitation } = useApp()

  const limitation = limitations.find((item) => item.id === limitationId)
  const coupons = qrCatalog.filter((c) => c.active !== false)

  const [selectedCouponId, setSelectedCouponId] = useState(limitation?.couponId ?? coupons[0]?.id ?? '')
  const [isUnlimited, setIsUnlimited] = useState(limitation?.period === 'Ilimitado')
  const [period, setPeriod] = useState(limitation?.period ?? getDefaultWeekPeriod())
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [quantity, setQuantity] = useState(String(limitation?.quantity ?? 1))
  const [days, setDays] = useState<string[]>(limitation?.days ?? ['S'])

  const backPath = isRedeemer ? `/canjeadores/${sellerId}/limitaciones` : `/vendedores/${sellerId}/limitaciones`

  function toggleDay(day: string) {
    setDays((current) => current.includes(day) ? current.filter((item) => item !== day) : [...current, day])
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!limitation || !selectedCouponId) return

    await saveLimitation({
      ...limitation,
      couponId: selectedCouponId,
      quantity: Math.max(1, Number(quantity) || 1),
      period: isUnlimited ? 'Ilimitado' : period,
      days: days.length ? days : ['S'],
    })
    navigate(backPath)
  }

  async function handleDelete() {
    if (!limitation || !window.confirm('¿Eliminar esta limitación?')) return
    await deleteLimitation(limitation.id)
    navigate(backPath)
  }

  return (
    <StaffFrame isRedeemer={isRedeemer}>
      <main className="sellers-main doors-form-main">
        <div className="doors-form-top">
          <Link to={backPath} className="doors-back-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>Atrás</span>
          </Link>
          <h1 className="doors-form-title">Modificar Limitación</h1>
        </div>

        <form className="doors-limitation-form" onSubmit={handleSubmit}>
          {/* 1. Periodo ilimitado */}
          <div className="doors-field-group">
            <label className="doors-field-label">Período ilimitado</label>
            <div className="doors-toggle-container">
              <button
                type="button"
                className={`doors-toggle-btn ${isUnlimited ? 'active-yes' : ''}`}
                onClick={() => setIsUnlimited(true)}
              >
                Sí
              </button>
              <button
                type="button"
                className={`doors-toggle-btn ${!isUnlimited ? 'active-no' : ''}`}
                onClick={() => setIsUnlimited(false)}
              >
                No
              </button>
            </div>
          </div>

          {/* 2. Periodo */}
          <div className="doors-field-group">
            <label className="doors-field-label">Período</label>
            <div
              className={`doors-input-wrapper doors-calendar-input ${!isUnlimited ? 'doors-clickable-input' : ''}`}
              onClick={() => {
                if (!isUnlimited) setCalendarOpen(true)
              }}
            >
              <svg className="doors-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.8">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <input
                type="text"
                value={isUnlimited ? 'Ilimitado' : period}
                disabled={isUnlimited}
                readOnly
                placeholder="22/09/2026 - 26/09/2026"
                style={{ cursor: isUnlimited ? 'not-allowed' : 'pointer' }}
              />
            </div>
          </div>

          {/* 3. Cupón */}
          <div className="doors-field-group">
            <label className="doors-field-label">Cupón</label>
            <div className="doors-input-wrapper doors-select-wrapper">
              <svg className="doors-input-icon" width="18" height="14" viewBox="0 0 24 16" fill="none" stroke="#64748b" strokeWidth="1.8">
                <rect x="1.5" y="1.5" width="21" height="13" rx="2.5" />
                <rect x="6" y="4.5" width="12" height="7" rx="1" />
              </svg>
              <select
                value={selectedCouponId}
                onChange={(e) => setSelectedCouponId(e.target.value)}
                required
              >
                {coupons.map((coupon) => (
                  <option key={coupon.id} value={coupon.id}>
                    {coupon.name}
                  </option>
                ))}
              </select>
              <span className="doors-select-arrow">⌄</span>
            </div>
          </div>

          {/* 4. Cantidad */}
          <div className="doors-field-group">
            <label className="doors-field-label">Cantidad</label>
            <div className="doors-input-wrapper">
              <svg className="doors-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.8">
                <line x1="4" y1="9" x2="20" y2="9" />
                <line x1="4" y1="15" x2="20" y2="15" />
                <line x1="10" y1="3" x2="8" y2="21" />
                <line x1="16" y1="3" x2="14" y2="21" />
              </svg>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </div>
          </div>

          {/* 5. Días habilitados */}
          <div className="doors-field-group">
            <label className="doors-field-label">Días habilitados:</label>
            <div className="doors-days-row">
              {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day) => {
                const isSelected = days.includes(day)
                return (
                  <button
                    key={day}
                    type="button"
                    className={`doors-day-box ${isSelected ? 'doors-day-active' : ''}`}
                    onClick={() => toggleDay(day)}
                  >
                    {day}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Submit & Delete buttons */}
          <button className="doors-submit-btn" type="submit">
            MODIFICAR LIMITACIÓN
          </button>
          <button className="doors-delete-limit-btn" type="button" onClick={handleDelete}>
            ELIMINAR LIMITACIÓN
          </button>
        </form>

        {calendarOpen && (
          <DoorsDateRangePicker
            initialRange={period}
            onClose={() => setCalendarOpen(false)}
            onSelectRange={(newRange, newDays) => {
              setPeriod(newRange)
              if (newDays && newDays.length) {
                setDays(newDays)
              }
            }}
          />
        )}
      </main>
    </StaffFrame>
  )
}

function StaffFrame({ children, isRedeemer }: { children: ReactNode; isRedeemer?: boolean }) {
  return (
    <div className="staff-page">
      <StaffHeader />
      <div className="staff-layout">
        <aside className="staff-sidebar">
          <Link className="staff-sidebar-control" to="/encargado">‹</Link>
          <Link to="/encargado" title="Inicio">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </Link>
          <Link className={!isRedeemer ? 'active' : ''} to="/vendedores" title="Vendedores">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </Link>
          <Link className={isRedeemer ? 'active' : ''} to="/canjeadores" title="Canjeadores">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/></svg>
          </Link>
          <Link to="/informes" title="Informes">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          </Link>
          <Link to="/qr" title="QRs">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="22" height="18" rx="2"/><line x1="1" y1="9" x2="23" y2="9"/><line x1="1" y1="15" x2="23" y2="15"/></svg>
          </Link>
          <Link to="/fechas" title="Fechas">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </Link>
          <Link to="/links-publicos" title="Links Públicos">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
          </Link>
          <Link to="/baneos" title="Baneos">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
          </Link>
          <Link to="/equipo" title="Equipo">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </Link>
          <Link to="/puerta" title="Puerta">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </Link>
          <a href="https://api.whatsapp.com/send?phone=5491131245112&text=Hola%2C%20necesito%20soporte%20con%20QR%20Pass%20Line" target="_blank" rel="noopener noreferrer" title="Soporte WhatsApp">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>
          </a>
        </aside>
        {children}
      </div>
    </div>
  )
}

