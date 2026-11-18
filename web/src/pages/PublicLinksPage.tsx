import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useApp, isEntityForVenue } from '../context/AppContext'
import { StaffHeader } from '../components/StaffHeader'
import { DoorsDateRangePicker } from '../components/DoorsDateRangePicker'

export function PublicLinksPage() {
  const { events, qrCatalog, limitations, currentUser, activeVenue, venues } = useApp()
  const [isDynamic, setIsDynamic] = useState(true)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const targetVenueId = activeVenue?.id || currentUser?.venueId
  const venueEvents = events.filter((e) => isEntityForVenue(e.venueId, targetVenueId, venues))
  const venueQrCatalog = qrCatalog.filter((q) => isEntityForVenue(q.venueId, targetVenueId, venues))
  const activeEvent = venueEvents.find((e) => e.status === 'activo') || venueEvents[0]
  const businessName = activeVenue?.name || 'Local'

  // Limitations assigned to the current user (Anibal / Encargado)
  const targetUserId = currentUser?.id
  const userLimitations = limitations.filter((l) => l.personId === targetUserId)

  // Opciones de cupones / tipos de entrada disponibles para asignar al link público
  const availableOptions = useMemo(() => {
    if (userLimitations.length > 0) {
      return userLimitations.map((lim) => {
        const catItem = venueQrCatalog.find((q) => q.id === lim.couponId)
        return {
          couponId: lim.couponId,
          name: catItem?.name || 'Entrada',
          quantity: lim.quantity || 0,
        }
      })
    }

    // Si no tiene limitaciones específicas, mostrar el catálogo general del local
    return venueQrCatalog.map((item) => ({
      couponId: item.id,
      name: item.name || 'Entrada General',
      quantity: 2000,
    }))
  }, [userLimitations, venueQrCatalog])

  const [selectedCouponId, setSelectedCouponId] = useState<string>('')

  // Cupones específicos para Sábado y Domingo cuando se usa Doble Fecha
  const [selectedCouponSatId, setSelectedCouponSatId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('qr-pass-line.public-links-config')
      if (saved && JSON.parse(saved).selectedCouponSatId) return JSON.parse(saved).selectedCouponSatId
    } catch {}
    return ''
  })

  const [selectedCouponSunId, setSelectedCouponSunId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('qr-pass-line.public-links-config')
      if (saved && JSON.parse(saved).selectedCouponSunId) return JSON.parse(saved).selectedCouponSunId
    } catch {}
    return ''
  })

  // Opciones de configuración del link público
  const [dateMode, setDateMode] = useState<'doble' | 'simple'>(() => {
    try {
      const saved = localStorage.getItem('qr-pass-line.public-links-config')
      if (saved) return JSON.parse(saved).dateMode || 'doble'
    } catch {}
    return 'doble'
  })

  const [allowBothDays, setAllowBothDays] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('qr-pass-line.public-links-config')
      if (saved) return JSON.parse(saved).allowBothDays ?? true
    } catch {}
    return true
  })

  const [singleDay, setSingleDay] = useState<'sabado' | 'domingo' | 'evento'>(() => {
    try {
      const saved = localStorage.getItem('qr-pass-line.public-links-config')
      if (saved) return JSON.parse(saved).singleDay || 'sabado'
    } catch {}
    return 'sabado'
  })

  const [maxPersons, setMaxPersons] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('qr-pass-line.public-links-config')
      if (saved) return JSON.parse(saved).maxPersons || 6
    } catch {}
    return 6
  })

  // Date selection state in ISO format (YYYY-MM-DD)
  const [selectedDateIso, setSelectedDateIso] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('qr-pass-line.public-links-config')
      if (saved && JSON.parse(saved).selectedDateIso) return JSON.parse(saved).selectedDateIso
    } catch {}
    if (activeEvent?.date) return activeEvent.date.split('T')[0]
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  })

  // Sincronizar selección inicial de cupones
  useEffect(() => {
    if (availableOptions.length > 0) {
      if (!selectedCouponId) setSelectedCouponId(availableOptions[0].couponId)
      if (!selectedCouponSatId) setSelectedCouponSatId(availableOptions[0].couponId)
      if (!selectedCouponSunId) setSelectedCouponSunId(availableOptions[0].couponId)
    }
  }, [availableOptions, selectedCouponId, selectedCouponSatId, selectedCouponSunId])

  // Guardar configuración en LocalStorage cuando cambia
  useEffect(() => {
    try {
      localStorage.setItem(
        'qr-pass-line.public-links-config',
        JSON.stringify({
          dateMode,
          allowBothDays,
          singleDay,
          maxPersons,
          selectedDateIso,
          selectedCouponId,
          selectedCouponSatId,
          selectedCouponSunId
        })
      )
    } catch {}
  }, [dateMode, allowBothDays, singleDay, maxPersons, selectedDateIso, selectedCouponId, selectedCouponSatId, selectedCouponSunId])

  // Cálculo de las fechas del fin de semana (Sábado y Domingo) basado en la fecha seleccionada
  const weekendDays = useMemo(() => {
    const parts = (selectedDateIso || '').split('-')
    let base = new Date()
    if (parts.length === 3) {
      base = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 12, 0, 0)
    }
    const day = base.getDay() // 0 = Domingo, 6 = Sábado
    let satDate = new Date(base)
    let sunDate = new Date(base)

    if (day === 6) {
      satDate = new Date(base)
      sunDate = new Date(base)
      sunDate.setDate(sunDate.getDate() + 1)
    } else if (day === 0) {
      sunDate = new Date(base)
      satDate = new Date(base)
      satDate.setDate(satDate.getDate() - 1)
    } else {
      const daysUntilSat = (6 - day + 7) % 7
      satDate = new Date(base)
      satDate.setDate(satDate.getDate() + daysUntilSat)
      sunDate = new Date(satDate)
      sunDate.setDate(sunDate.getDate() + 1)
    }

    const months = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ]

    const satFormatted = `Sábado ${satDate.getDate()} de ${months[satDate.getMonth()]}`
    const sunFormatted = `Domingo ${sunDate.getDate()} de ${months[sunDate.getMonth()]}`
    const satIso = `${satDate.getFullYear()}-${String(satDate.getMonth() + 1).padStart(2, '0')}-${String(satDate.getDate()).padStart(2, '0')}`
    const sunIso = `${sunDate.getFullYear()}-${String(sunDate.getMonth() + 1).padStart(2, '0')}-${String(sunDate.getDate()).padStart(2, '0')}`

    return { satFormatted, sunFormatted, satIso, sunIso }
  }, [selectedDateIso])

  // Formato legible de la fecha seleccionada (un solo día)
  const selectedDateFormatted = useMemo(() => {
    if (!selectedDateIso) return 'Fecha no seleccionada'
    const parts = selectedDateIso.split('-')
    if (parts.length === 3) {
      const [y, m, d] = parts
      const dateObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10), 12, 0, 0)
      const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
      const months = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
      ]
      const dayName = days[dateObj.getDay()]
      const monthName = months[dateObj.getMonth()]
      return `${dayName} ${parseInt(d, 10)} de ${monthName} ${y}`
    }
    return selectedDateIso
  }, [selectedDateIso])

  // URL del link público con el cupón / tipo de entrada y parámetros seleccionados
  const baseUrl = window.location.origin
  const currentCouponId = selectedCouponId || availableOptions[0]?.couponId || ''
  const currentCouponSatId = selectedCouponSatId || availableOptions[0]?.couponId || ''
  const currentCouponSunId = selectedCouponSunId || availableOptions[0]?.couponId || ''

  const params = new URLSearchParams()
  params.set('mode', isDynamic ? 'dinamico' : 'estatico')
  params.set('dias', dateMode)

  if (dateMode === 'doble') {
    params.set('couponSat', currentCouponSatId)
    params.set('couponSun', currentCouponSunId)
    params.set('ambos', allowBothDays ? '1' : '0')
    params.set('fecha', weekendDays.satIso)
  } else {
    params.set('coupon', currentCouponId)
    params.set('dia', singleDay)
    params.set('fecha', selectedDateIso)
  }

  if (maxPersons !== 6) {
    params.set('max', String(maxPersons))
  }
  if (targetVenueId) {
    params.set('venue', targetVenueId)
  }

  const publicLink = `${baseUrl}/invitacion/${activeEvent?.id || 'evento'}?${params.toString()}`

  const selectedOptionInfo = availableOptions.find((o) => o.couponId === (dateMode === 'doble' ? currentCouponSatId : currentCouponId)) || availableOptions[0]

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Link Público de Acceso - ${businessName}`,
          text: `Generá tu pase QR para ${selectedOptionInfo?.name || 'Ingreso'} (${selectedDateFormatted}):`,
          url: publicLink,
        })
        return
      } catch { }
    }

    try {
      await navigator.clipboard.writeText(publicLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch {
      alert(`Link público copiado: ${publicLink}`)
    }
  }

  return (
    <div className="staff-page">
      <StaffHeader />
      <div className="staff-layout">
        {/* Sidebar */}
        <aside className="staff-sidebar">
          <Link className="staff-sidebar-control" to="/encargado">‹</Link>
          <Link to="/encargado" title="Inicio">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
          </Link>
          <Link to="/vendedores" title="Vendedores">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
          </Link>
          <Link to="/canjeadores" title="Canjeadores">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="10" rx="2" /><circle cx="12" cy="5" r="2" /><path d="M12 7v4" /><line x1="8" y1="16" x2="8" y2="16" /><line x1="16" y1="16" x2="16" y2="16" /></svg>
          </Link>
          <Link to="/informes" title="Informes">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
          </Link>
          <Link to="/fechas" title="Fechas">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
          </Link>
          <Link to="/qr" title="QRs">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="22" height="18" rx="2" /><line x1="1" y1="9" x2="23" y2="9" /><line x1="1" y1="15" x2="23" y2="15" /></svg>
          </Link>
          <Link className="active" to="/links-publicos" title="Links Públicos">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" /></svg>
          </Link>
          <Link to="/baneos" title="Baneos">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>
          </Link>
          <Link to="/puerta" title="Puerta">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
          </Link>
          <a href="https://api.whatsapp.com/send?phone=5491131245112&text=Hola%2C%20necesito%20soporte%20con%20QR%20Pass%20Line" target="_blank" rel="noopener noreferrer" title="Soporte WhatsApp">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 18v-6a9 9 0 0 1 18 0v6" /><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" /></svg>
          </a>
        </aside>

        {/* Main Content Area */}
        <main className="sellers-main" style={{ padding: '14px 24px 100px' }}>
          {/* Titlebar con < Links Publicos */}
          <div className="sellers-titlebar" style={{ padding: 0, marginBottom: 24 }}>
            <Link to="/encargado" className="back-link">‹</Link>
            <h1 className="doors-title" style={{ fontSize: 24, fontWeight: 700, color: 'var(--brand)', margin: 0 }}>
              Links Públicos de Autogestión
            </h1>
          </div>

          <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* 1. Modalidad de Fechas */}
            <div style={{ background: '#ffffff', borderRadius: 16, padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <label style={{ display: 'block', color: '#1e293b', fontSize: 13, fontWeight: 800, marginBottom: 10 }}>
                🗓️ Modalidad del Link de Invitación:
              </label>

              {/* Botones de Selección Doble vs Un Solo Día */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setDateMode('doble')}
                  style={{
                    padding: '12px 10px',
                    borderRadius: 12,
                    border: dateMode === 'doble' ? '2px solid #0860bd' : '1px solid #cbd5e1',
                    background: dateMode === 'doble' ? '#eff6ff' : '#f8fafc',
                    color: dateMode === 'doble' ? '#0860bd' : '#475569',
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  ✨ Fin de semana (2 días)
                </button>

                <button
                  type="button"
                  onClick={() => setDateMode('simple')}
                  style={{
                    padding: '12px 10px',
                    borderRadius: 12,
                    border: dateMode === 'simple' ? '2px solid #0860bd' : '1px solid #cbd5e1',
                    background: dateMode === 'simple' ? '#eff6ff' : '#f8fafc',
                    color: dateMode === 'simple' ? '#0860bd' : '#475569',
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  📅 Un solo día
                </button>
              </div>
            </div>

            {/* SECCIÓN DOBLE FECHA */}
            {dateMode === 'doble' ? (
              <>
                {/* 2A. Fechas del Fin de Semana */}
                <div style={{ background: '#ffffff', borderRadius: 16, padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <label style={{ color: '#1e293b', fontSize: 13, fontWeight: 800 }}>
                      📅 Fechas del Fin de Semana:
                    </label>
                    <button
                      type="button"
                      onClick={() => setCalendarOpen(true)}
                      style={{
                        background: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        color: '#1d4ed8',
                        padding: '6px 12px',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      📅 Cambiar fin de semana
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div style={{ background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: 12, padding: '12px 14px' }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Día 1</span>
                      <strong style={{ display: 'block', fontSize: 14, color: '#0f172a', fontWeight: 900, marginTop: 2 }}>
                        {weekendDays.satFormatted}
                      </strong>
                    </div>

                    <div style={{ background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: 12, padding: '12px 14px' }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Día 2</span>
                      <strong style={{ display: 'block', fontSize: 14, color: '#0f172a', fontWeight: 900, marginTop: 2 }}>
                        {weekendDays.sunFormatted}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* 2B. Asignación de Cupones por Día */}
                <div style={{ background: '#ffffff', borderRadius: 16, padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <label style={{ color: '#1e293b', fontSize: 13, fontWeight: 800 }}>
                    🎟️ Asignación de Entradas / Cupones por Día:
                  </label>

                  {/* Cupón Sábado */}
                  <div>
                    <label style={{ display: 'block', color: '#475569', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                      Cupón a emitir para el SÁBADO:
                    </label>
                    <select
                      value={currentCouponSatId}
                      onChange={(e) => setSelectedCouponSatId(e.target.value)}
                      style={{
                        width: '100%',
                        height: 46,
                        borderRadius: 12,
                        border: '1.5px solid #cbd5e1',
                        background: '#f8fafc',
                        padding: '0 14px',
                        fontSize: 14,
                        fontWeight: 800,
                        color: '#0f172a',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      {availableOptions.map((opt) => (
                        <option key={opt.couponId} value={opt.couponId}>
                          {opt.name} — ({opt.quantity} QRs en tu cuenta)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Cupón Domingo */}
                  <div>
                    <label style={{ display: 'block', color: '#475569', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                      Cupón a emitir para el DOMINGO:
                    </label>
                    <select
                      value={currentCouponSunId}
                      onChange={(e) => setSelectedCouponSunId(e.target.value)}
                      style={{
                        width: '100%',
                        height: 46,
                        borderRadius: 12,
                        border: '1.5px solid #cbd5e1',
                        background: '#f8fafc',
                        padding: '0 14px',
                        fontSize: 14,
                        fontWeight: 800,
                        color: '#0f172a',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      {availableOptions.map((opt) => (
                        <option key={opt.couponId} value={opt.couponId}>
                          {opt.name} — ({opt.quantity} QRs en tu cuenta)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Toggle Permitir Ambos Días */}
                  <div style={{ background: '#f8fafc', borderRadius: 12, padding: '12px 14px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                    <div>
                      <strong style={{ fontSize: 13, color: '#1e293b', display: 'block' }}>
                        Permitir opción "Válido para ambos días"
                      </strong>
                      <small style={{ color: '#64748b', fontSize: 11, display: 'block', marginTop: 2 }}>
                        {allowBothDays ? 'Genera 2 QRs separados (1 con el cupón del sábado y 1 con el del domingo)' : 'Solo permite elegir uno de los dos días'}
                      </small>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={allowBothDays}
                      onClick={() => setAllowBothDays(!allowBothDays)}
                      style={{
                        width: 48,
                        height: 26,
                        borderRadius: 9999,
                        background: allowBothDays ? '#0860bd' : '#cbd5e1',
                        border: 'none',
                        padding: 3,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: allowBothDays ? 'flex-end' : 'flex-start',
                        transition: 'background 0.2s ease'
                      }}
                    >
                      <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', display: 'block' }} />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* SECCIÓN UN SOLO DÍA */
              <>
                {/* 2. Selector de Cupón Único */}
                <div style={{ background: '#ffffff', borderRadius: 16, padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <label style={{ display: 'block', color: '#1e293b', fontSize: 13, fontWeight: 800, marginBottom: 8 }}>
                    🎟️ Tipo de Entrada / Cupón a Habilitar en el Link:
                  </label>
                  <select
                    value={currentCouponId}
                    onChange={(e) => setSelectedCouponId(e.target.value)}
                    style={{
                      width: '100%',
                      height: 48,
                      borderRadius: 12,
                      border: '1.5px solid #cbd5e1',
                      background: '#f8fafc',
                      padding: '0 14px',
                      fontSize: 15,
                      fontWeight: 800,
                      color: '#0f172a',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {availableOptions.map((opt) => (
                      <option key={opt.couponId} value={opt.couponId}>
                        {opt.name} — ({opt.quantity} QRs asignados en tu cuenta)
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Selección de Día Específico */}
                <div style={{ background: '#ffffff', borderRadius: 16, padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 8 }}>
                    ¿Para qué día querés que sea el pase?
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => setSingleDay('sabado')}
                      style={{
                        padding: '10px 8px',
                        borderRadius: 10,
                        border: singleDay === 'sabado' ? '2px solid #0860bd' : '1px solid #cbd5e1',
                        background: singleDay === 'sabado' ? '#eff6ff' : '#ffffff',
                        color: singleDay === 'sabado' ? '#0860bd' : '#475569',
                        fontSize: 13,
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      Sábado
                    </button>
                    <button
                      type="button"
                      onClick={() => setSingleDay('domingo')}
                      style={{
                        padding: '10px 8px',
                        borderRadius: 10,
                        border: singleDay === 'domingo' ? '2px solid #0860bd' : '1px solid #cbd5e1',
                        background: singleDay === 'domingo' ? '#eff6ff' : '#ffffff',
                        color: singleDay === 'domingo' ? '#0860bd' : '#475569',
                        fontSize: 13,
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      Domingo
                    </button>
                    <button
                      type="button"
                      onClick={() => setSingleDay('evento')}
                      style={{
                        padding: '10px 8px',
                        borderRadius: 10,
                        border: singleDay === 'evento' ? '2px solid #0860bd' : '1px solid #cbd5e1',
                        background: singleDay === 'evento' ? '#eff6ff' : '#ffffff',
                        color: singleDay === 'evento' ? '#0860bd' : '#475569',
                        fontSize: 13,
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      Fecha exacta
                    </button>
                  </div>
                </div>

                {/* 4. Selector de Fecha en Calendario */}
                <div
                  onClick={() => setCalendarOpen(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '14px 18px',
                    background: '#e9ecef',
                    borderRadius: 12,
                    cursor: 'pointer',
                    border: '1px solid #dee2e6',
                    userSelect: 'none'
                  }}
                >
                  <div style={{ color: '#495057', display: 'grid', placeItems: 'center' }}>
                    <svg width="24" height="24" viewBox="0 0 24 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <rect x="1.5" y="1.5" width="21" height="13" rx="2.5" />
                      <rect x="6" y="4.5" width="12" height="7" rx="1" />
                    </svg>
                  </div>

                  <div>
                    <small style={{ display: 'block', color: '#6c757d', fontSize: 11 }}>Seleccionar fecha del evento en calendario</small>
                    <strong style={{ display: 'block', color: '#212529', fontSize: 14, fontWeight: 700 }}>
                      {selectedDateFormatted}
                    </strong>
                  </div>
                </div>
              </>
            )}

            {/* Selector de Cantidad Máxima de Personas por Pase (1 a 6) */}
            <div style={{ background: '#ffffff', borderRadius: 12, padding: '14px 16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <label style={{ color: '#1e293b', fontSize: 13, fontWeight: 800 }}>
                  👥 Cantidad Máxima de Personas por Pase QR:
                </label>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#0860bd', background: '#eff6ff', padding: '2px 8px', borderRadius: 8 }}>
                  {maxPersons === 1 ? '1 persona (Individual)' : `Hasta ${maxPersons} personas`}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
                {[1, 2, 3, 4, 5, 6].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setMaxPersons(num)}
                    style={{
                      padding: '10px 0',
                      borderRadius: 10,
                      border: maxPersons === num ? '2px solid #0860bd' : '1px solid #cbd5e1',
                      background: maxPersons === num ? '#0860bd' : '#f8fafc',
                      color: maxPersons === num ? '#ffffff' : '#334155',
                      fontSize: 14,
                      fontWeight: 900,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {num}
                  </button>
                ))}
              </div>
              <small style={{ display: 'block', color: '#64748b', fontSize: 12, marginTop: 8, lineHeight: 1.4 }}>
                {maxPersons === 1
                  ? '🔒 Modo individual: La persona solo podrá generar un QR para sí misma.'
                  : `👥 Modo grupal: La persona podrá elegir desde 1 hasta ${maxPersons} personas por QR.`}
              </small>
            </div>

            {/* 3. Fila ESTÁTICO | DINÁMICO con Switch Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 4px' }}>
              <div>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', letterSpacing: '0.02em', display: 'block' }}>
                  ESTÁTICO | DINÁMICO
                </span>
                <small style={{ color: '#64748b', fontSize: 11 }}>
                  {isDynamic ? 'El link se adapta automáticamente al evento activo' : 'El link apunta fijo a la fecha seleccionada'}
                </small>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={isDynamic}
                onClick={() => setIsDynamic(!isDynamic)}
                style={{
                  width: 52,
                  height: 28,
                  borderRadius: 9999,
                  background: isDynamic ? '#193659' : '#cbd5e1',
                  border: 'none',
                  padding: 3,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: isDynamic ? 'flex-end' : 'flex-start',
                  transition: 'background 0.2s ease'
                }}
              >
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: '#ffffff',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    display: 'block'
                  }}
                />
              </button>
            </div>

            {/* 4. Previsualización del Link Generado */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '12px 14px' }}>
              <small style={{ color: '#64748b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                Link para WhatsApp / Instagram / Facebook:
              </small>
              <div style={{ wordBreak: 'break-all', fontSize: 13, color: '#1e3a8a', fontWeight: 600, fontFamily: 'monospace' }}>
                {publicLink}
              </div>
            </div>

            {/* 5. Botón COMPARTIR LINK PÚBLICO */}
            <button
              type="button"
              onClick={handleShare}
              style={{
                width: '100%',
                height: 50,
                background: '#193659',
                color: '#ffffff',
                border: 'none',
                borderRadius: 14,
                fontSize: 15,
                fontWeight: 900,
                letterSpacing: '0.04em',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 4px 12px rgba(25, 54, 89, 0.25)',
                transition: 'transform 0.15s, background 0.15s'
              }}
            >
              <span>🔗</span>
              <span>{copied ? '¡LINK COPIADO AL PORTAPAPELES!' : 'COMPARTIR O COPIAR LINK PÚBLICO'}</span>
            </button>
          </div>
        </main>
      </div>

      {calendarOpen && (
        <DoorsDateRangePicker
          initialRange={
            selectedDateIso
              ? `${selectedDateIso.split('-')[2]}/${selectedDateIso.split('-')[1]}/${selectedDateIso.split('-')[0]} - ${selectedDateIso.split('-')[2]}/${selectedDateIso.split('-')[1]}/${selectedDateIso.split('-')[0]}`
              : '26/09/2026 - 26/09/2026'
          }
          onClose={() => setCalendarOpen(false)}
          onSelectRange={(newRange) => {
            if (newRange) {
              const startPart = newRange.split('-')[0].trim()
              const [d, m, y] = startPart.split('/')
              if (d && m && y) {
                const iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
                setSelectedDateIso(iso)
              }
            }
          }}
        />
      )}
    </div>
  )
}
