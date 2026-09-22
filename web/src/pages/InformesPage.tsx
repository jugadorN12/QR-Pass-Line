import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { StaffHeader } from '../components/StaffHeader'

type ReportType = 'LEC' | 'CANJEO' | 'CANJEABLES' | 'ESCANEO' | 'AFORO' | null

export function InformesPage() {
  const { tickets, users, qrCatalog, limitations, events, venues } = useApp()
  const [selectedReport, setSelectedReport] = useState<ReportType>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState<string>('')

  // Datos para LEC (Listado de Emisión de Cupones)
  const issuedTickets = useMemo(() => {
    return tickets.map((t) => {
      const seller = users.find((u) => u.id === t.issuedBy)
      const coupon = qrCatalog.find((q) => q.id === t.couponId)
      const event = events.find((e) => e.id === t.eventId)
      return {
        ...t,
        sellerName: seller?.name || seller?.email?.split('@')[0] || 'Vendedor',
        sellerAvatar: (seller as any)?.avatar || '',
        couponName: coupon?.name || 'INGRESO GENERAL',
        eventName: event?.name || 'Evento Activo',
      }
    }).sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime())
  }, [tickets, users, qrCatalog, events])

  // Datos para CANJEO (Canjeados / Puerta)
  const redeemedTickets = useMemo(() => {
    return issuedTickets.filter((t) => t.redeemedAt).map((t) => {
      const redeemer = users.find((u) => u.id === t.redeemedBy)
      return {
        ...t,
        redeemerName: redeemer?.name || redeemer?.email?.split('@')[0] || 'Puerta / Canjeador',
      }
    }).sort((a, b) => new Date(b.redeemedAt || 0).getTime() - new Date(a.redeemedAt || 0).getTime())
  }, [issuedTickets, users])

  // Datos para CANJEABLES (Resumen de cupos y emisión por tipo de QR)
  const couponStats = useMemo(() => {
    return qrCatalog.map((coupon) => {
      const totalIssued = tickets.filter((t) => t.couponId === coupon.id).length
      const totalRedeemed = tickets.filter((t) => t.couponId === coupon.id && t.redeemedAt).length
      const availableToRedeem = totalIssued - totalRedeemed
      const totalAssignedLimit = limitations
        .filter((l) => l.couponId === coupon.id)
        .reduce((sum, l) => sum + (Number(l.quantity) || 0), 0)

      return {
        id: coupon.id,
        name: coupon.name,
        kind: coupon.kind,
        totalAssignedLimit,
        totalIssued,
        totalRedeemed,
        availableToRedeem,
      }
    })
  }, [qrCatalog, tickets, limitations])

  // Datos para AFORO
  const activeVenue = venues[0]
  const maxCapacity = activeVenue?.radius ? activeVenue.radius * 20 : 1200 // Capacidad estimada
  const currentOccupancy = redeemedTickets.length
  const occupancyPercent = Math.min(100, Math.round((currentOccupancy / maxCapacity) * 100))

  // Filtros de búsqueda en LEC
  const filteredIssued = useMemo(() => {
    return issuedTickets.filter((t) => {
      const matchSearch = searchTerm
        ? t.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.sellerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.couponName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.holderName.toLowerCase().includes(searchTerm.toLowerCase())
        : true
      const matchDate = dateFilter ? t.issuedAt.startsWith(dateFilter) : true
      return matchSearch && matchDate
    })
  }, [issuedTickets, searchTerm, dateFilter])

  // Filtros de búsqueda en CANJEO
  const filteredRedeemed = useMemo(() => {
    return redeemedTickets.filter((t) => {
      const matchSearch = searchTerm
        ? t.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.redeemerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.couponName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.holderName.toLowerCase().includes(searchTerm.toLowerCase())
        : true
      const matchDate = dateFilter ? t.redeemedAt?.startsWith(dateFilter) : true
      return matchSearch && matchDate
    })
  }, [redeemedTickets, searchTerm, dateFilter])

  function exportToCsv(data: any[], filename: string) {
    if (!data.length) return
    const headers = Object.keys(data[0]).join(',')
    const rows = data.map((obj) => Object.values(obj).map((val) => `"${String(val).replace(/"/g, '""')}"`).join(','))
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `${filename}.csv`)
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  return (
    <div className="staff-page">
      <StaffHeader />
      <div className="staff-layout">
        {/* Sidebar */}
        <aside className="staff-sidebar">
          <Link className="staff-sidebar-control" to="/encargado">‹</Link>
          <Link to="/encargado" title="Inicio">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </Link>
          <Link to="/vendedores" title="Vendedores">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </Link>
          <Link to="/canjeadores" title="Canjeadores">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/></svg>
          </Link>
          <Link className="active" to="/informes" title="Informes">
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

        {/* Main Content Area */}
        <main className="sellers-main" style={{ padding: '14px 24px 100px' }}>
          {/* Titlebar */}
          <div className="sellers-titlebar" style={{ padding: 0, marginBottom: 20 }}>
            <Link to="/encargado" className="back-link">‹</Link>
            <h1 className="doors-title" style={{ fontSize: 24, fontWeight: 700, color: '#0860bd', margin: 0 }}>
              Informes {selectedReport ? `› ${selectedReport}` : ''}
            </h1>
          </div>

          {/* Grid de 5 Tarjetas como en la imagen */}
          <section className="doors-reports-grid">
            {/* 1. LEC */}
            <div
              className={`doors-report-card ${selectedReport === 'LEC' ? 'doors-report-card-active' : ''}`}
              onClick={() => setSelectedReport(selectedReport === 'LEC' ? null : 'LEC')}
              role="button"
              tabIndex={0}
            >
              <div className="doors-report-icon-box">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 3v18h18" />
                  <rect x="7" y="10" width="3" height="8" rx="1" />
                  <rect x="12" y="6" width="3" height="12" rx="1" />
                  <rect x="17" y="13" width="3" height="5" rx="1" />
                </svg>
              </div>
              <strong className="doors-report-card-label">LEC</strong>
            </div>

            {/* 2. CANJEO */}
            <div
              className={`doors-report-card ${selectedReport === 'CANJEO' ? 'doors-report-card-active' : ''}`}
              onClick={() => setSelectedReport(selectedReport === 'CANJEO' ? null : 'CANJEO')}
              role="button"
              tabIndex={0}
            >
              <div className="doors-report-icon-box">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                  <polyline points="10 17 15 12 10 7" />
                  <line x1="15" y1="12" x2="3" y2="12" />
                </svg>
              </div>
              <strong className="doors-report-card-label">CANJEO</strong>
            </div>

            {/* 3. CANJEABLES */}
            <div
              className={`doors-report-card ${selectedReport === 'CANJEABLES' ? 'doors-report-card-active' : ''}`}
              onClick={() => setSelectedReport(selectedReport === 'CANJEABLES' ? null : 'CANJEABLES')}
              role="button"
              tabIndex={0}
            >
              <div className="doors-report-icon-box">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="6" width="16" height="12" rx="2" />
                  <circle cx="2" cy="12" r="2" fill="#fff" />
                  <circle cx="18" cy="12" r="2" fill="#fff" />
                  <path d="M6 6v12" strokeDasharray="2 2" />
                  <path d="M7 3h13a2 2 0 0 1 2 2v10" />
                </svg>
              </div>
              <strong className="doors-report-card-label">CANJEABLES</strong>
            </div>

            {/* 4. ESCANEO */}
            <div
              className={`doors-report-card ${selectedReport === 'ESCANEO' ? 'doors-report-card-active' : ''}`}
              onClick={() => setSelectedReport(selectedReport === 'ESCANEO' ? null : 'ESCANEO')}
              role="button"
              tabIndex={0}
            >
              <div className="doors-report-icon-box">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="2" width="14" height="20" rx="3" />
                  <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="2.5" />
                  <path d="M9 7h6" />
                  <path d="M9 10h6" />
                  <path d="M9 13h4" />
                </svg>
              </div>
              <strong className="doors-report-card-label">ESCANEO</strong>
            </div>

            {/* 5. AFORO */}
            <div
              className={`doors-report-card ${selectedReport === 'AFORO' ? 'doors-report-card-active' : ''}`}
              onClick={() => setSelectedReport(selectedReport === 'AFORO' ? null : 'AFORO')}
              role="button"
              tabIndex={0}
            >
              <div className="doors-report-icon-box">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="7" r="3" />
                  <circle cx="5" cy="9" r="2" />
                  <circle cx="19" cy="9" r="2" />
                  <path d="M16 21v-2a4 4 0 0 0-8 0v2" />
                  <path d="M22 21v-2a3 3 0 0 0-3-3h-1" />
                  <path d="M6 16H5a3 3 0 0 0-3 3v2" />
                </svg>
              </div>
              <strong className="doors-report-card-label">AFORO</strong>
            </div>
          </section>

          {/* Detalle interactivo del informe seleccionado */}
          {selectedReport && (
            <section className="doors-report-detail-panel" style={{ marginTop: 24, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, boxShadow: '0 4px 14px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
              {/* Header del Reporte */}
              <div className="doors-report-detail-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #f1f5f9', background: '#fafbfc' }}>
                <div>
                  <h2 style={{ fontSize: 17, color: '#1e3a8a', margin: 0, fontWeight: 800 }}>
                    Informe de {selectedReport}
                  </h2>
                  <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 12 }}>
                    {selectedReport === 'LEC' && 'Listado de todas las emisiones de cupones por vendedor.'}
                    {selectedReport === 'CANJEO' && 'Registro histórico de canjes y validaciones en puerta.'}
                    {selectedReport === 'CANJEABLES' && 'Estado actual de cupones, límites asignados y disponibles.'}
                    {selectedReport === 'ESCANEO' && 'Registro de escaneo y flujo de ingresos por dispositivo.'}
                    {selectedReport === 'AFORO' && 'Métricas de aforo en vivo y capacidad del establecimiento.'}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  {selectedReport === 'LEC' && (
                    <button
                      type="button"
                      className="doors-export-btn"
                      onClick={() => exportToCsv(filteredIssued, 'informe-lec')}
                    >
                      Exportar CSV
                    </button>
                  )}
                  {selectedReport === 'CANJEO' && (
                    <button
                      type="button"
                      className="doors-export-btn"
                      onClick={() => exportToCsv(filteredRedeemed, 'informe-canjeos')}
                    >
                      Exportar CSV
                    </button>
                  )}
                  <button
                    type="button"
                    className="doors-edit-btn"
                    onClick={() => setSelectedReport(null)}
                    title="Cerrar detalle"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* 1. Vista LEC */}
              {selectedReport === 'LEC' && (
                <div style={{ padding: 18 }}>
                  <div className="doors-report-filters" style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                    <input
                      type="text"
                      placeholder="Buscar por vendedor, cupón, código..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{ flex: 1, height: 38, padding: '0 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13 }}
                    />
                    <input
                      type="date"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      style={{ height: 38, padding: '0 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13 }}
                    />
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table className="doors-report-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#64748b' }}>
                          <th style={{ padding: '10px 12px' }}>Código</th>
                          <th style={{ padding: '10px 12px' }}>Cupón</th>
                          <th style={{ padding: '10px 12px' }}>Vendedor</th>
                          <th style={{ padding: '10px 12px' }}>Fecha Emisión</th>
                          <th style={{ padding: '10px 12px' }}>Titular</th>
                          <th style={{ padding: '10px 12px' }}>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredIssued.length === 0 ? (
                          <tr>
                            <td colSpan={6} style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>
                              No hay registros de emisión encontrados.
                            </td>
                          </tr>
                        ) : (
                          filteredIssued.map((item) => (
                            <tr key={item.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                              <td style={{ padding: '10px 12px' }}><code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>{item.code}</code></td>
                              <td style={{ padding: '10px 12px' }}><strong>{item.couponName}</strong></td>
                              <td style={{ padding: '10px 12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  {item.sellerAvatar ? <img src={item.sellerAvatar} alt="" style={{ width: 22, height: 22, borderRadius: '50%' }} /> : null}
                                  <span>{item.sellerName}</span>
                                </div>
                              </td>
                              <td style={{ padding: '10px 12px', color: '#64748b', fontSize: 12 }}>{new Date(item.issuedAt).toLocaleString('es-AR')}</td>
                              <td style={{ padding: '10px 12px' }}>{item.holderName || '-'}</td>
                              <td style={{ padding: '10px 12px' }}>
                                {item.redeemedAt ? (
                                  <span className="pill pill-ok">Canjeado</span>
                                ) : (
                                  <span className="pill pill-warn">Pendiente</span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 2. Vista CANJEO */}
              {selectedReport === 'CANJEO' && (
                <div style={{ padding: 18 }}>
                  <div className="doors-report-filters" style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                    <input
                      type="text"
                      placeholder="Buscar por canjeador, código, titular..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{ flex: 1, height: 38, padding: '0 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13 }}
                    />
                    <input
                      type="date"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      style={{ height: 38, padding: '0 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13 }}
                    />
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table className="doors-report-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#64748b' }}>
                          <th style={{ padding: '10px 12px' }}>Código</th>
                          <th style={{ padding: '10px 12px' }}>Cupón</th>
                          <th style={{ padding: '10px 12px' }}>Titular</th>
                          <th style={{ padding: '10px 12px' }}>Canjeado Por</th>
                          <th style={{ padding: '10px 12px' }}>Fecha y Hora Canje</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRedeemed.length === 0 ? (
                          <tr>
                            <td colSpan={5} style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>
                              No hay registros de canjes encontrados.
                            </td>
                          </tr>
                        ) : (
                          filteredRedeemed.map((item) => (
                            <tr key={item.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                              <td style={{ padding: '10px 12px' }}><code style={{ background: '#ecfdf5', color: '#059669', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>{item.code}</code></td>
                              <td style={{ padding: '10px 12px' }}><strong>{item.couponName}</strong></td>
                              <td style={{ padding: '10px 12px' }}>{item.holderName || '-'}</td>
                              <td style={{ padding: '10px 12px' }}><strong>{item.redeemerName}</strong></td>
                              <td style={{ padding: '10px 12px', color: '#64748b', fontSize: 12 }}>{item.redeemedAt ? new Date(item.redeemedAt).toLocaleString('es-AR') : '-'}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 3. Vista CANJEABLES */}
              {selectedReport === 'CANJEABLES' && (
                <div style={{ padding: 18 }}>
                  <div className="doors-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                    {couponStats.map((item) => (
                      <div key={item.id} style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 12, background: '#fff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <strong style={{ fontSize: 14, color: '#0f172a' }}>{item.name}</strong>
                          <span className="pill pill-muted">{item.kind}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12, fontSize: 12 }}>
                          <div>
                            <span style={{ color: '#64748b' }}>Asignados:</span>
                            <b style={{ display: 'block', fontSize: 16, color: '#1e293b' }}>{item.totalAssignedLimit}</b>
                          </div>
                          <div>
                            <span style={{ color: '#64748b' }}>Emitidos:</span>
                            <b style={{ display: 'block', fontSize: 16, color: '#2563eb' }}>{item.totalIssued}</b>
                          </div>
                          <div>
                            <span style={{ color: '#64748b' }}>Canjeados:</span>
                            <b style={{ display: 'block', fontSize: 16, color: '#10b981' }}>{item.totalRedeemed}</b>
                          </div>
                          <div>
                            <span style={{ color: '#64748b' }}>Por Canjear:</span>
                            <b style={{ display: 'block', fontSize: 16, color: '#f59e0b' }}>{item.availableToRedeem}</b>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Vista ESCANEO */}
              {selectedReport === 'ESCANEO' && (
                <div style={{ padding: 18 }}>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 18 }}>
                    <div style={{ flex: 1, minWidth: 200, padding: 14, borderRadius: 12, background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                      <span style={{ color: '#1d4ed8', fontSize: 12, fontWeight: 700 }}>TOTAL LECTURAS QR</span>
                      <strong style={{ display: 'block', fontSize: 24, color: '#1e3a8a', marginTop: 4 }}>{tickets.length}</strong>
                    </div>
                    <div style={{ flex: 1, minWidth: 200, padding: 14, borderRadius: 12, background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
                      <span style={{ color: '#047857', fontSize: 12, fontWeight: 700 }}>CANJES EXITOSOS</span>
                      <strong style={{ display: 'block', fontSize: 24, color: '#065f46', marginTop: 4 }}>{redeemedTickets.length}</strong>
                    </div>
                    <div style={{ flex: 1, minWidth: 200, padding: 14, borderRadius: 12, background: '#fffbeb', border: '1px solid #fde68a' }}>
                      <span style={{ color: '#b45309', fontSize: 12, fontWeight: 700 }}>PENDIENTES</span>
                      <strong style={{ display: 'block', fontSize: 24, color: '#92400e', marginTop: 4 }}>{tickets.length - redeemedTickets.length}</strong>
                    </div>
                  </div>

                  <h3 style={{ fontSize: 14, color: '#1e293b', marginBottom: 10 }}>Últimos Escaneos Registrados</h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="doors-report-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#64748b' }}>
                          <th style={{ padding: '10px 12px' }}>Hora</th>
                          <th style={{ padding: '10px 12px' }}>Código QR</th>
                          <th style={{ padding: '10px 12px' }}>Cupón</th>
                          <th style={{ padding: '10px 12px' }}>Operador</th>
                          <th style={{ padding: '10px 12px' }}>Resultado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {redeemedTickets.slice(0, 20).map((t) => (
                          <tr key={t.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                            <td style={{ padding: '10px 12px', color: '#64748b', fontSize: 12 }}>{t.redeemedAt ? new Date(t.redeemedAt).toLocaleTimeString('es-AR') : '-'}</td>
                            <td style={{ padding: '10px 12px' }}><code>{t.code}</code></td>
                            <td style={{ padding: '10px 12px' }}><strong>{t.couponName}</strong></td>
                            <td style={{ padding: '10px 12px' }}>{t.redeemerName}</td>
                            <td style={{ padding: '10px 12px' }}><span className="pill pill-ok">VALIDADO OK</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 5. Vista AFORO */}
              {selectedReport === 'AFORO' && (
                <div style={{ padding: 18 }}>
                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 20, maxWidth: 600, margin: '0 auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div>
                        <strong style={{ fontSize: 18, color: '#0f172a' }}>Ocupación en Vivo</strong>
                        <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: 12 }}>{activeVenue?.name || 'Salón Principal'}</p>
                      </div>
                      <b style={{ fontSize: 28, color: occupancyPercent > 85 ? '#dc2626' : '#2563eb' }}>{occupancyPercent}%</b>
                    </div>

                    {/* Progress Bar */}
                    <div style={{ width: '100%', height: 16, background: '#f1f5f9', borderRadius: 8, overflow: 'hidden', margin: '14px 0' }}>
                      <div
                        style={{
                          width: `${occupancyPercent}%`,
                          height: '100%',
                          background: occupancyPercent > 85 ? 'linear-gradient(90deg, #f59e0b, #ef4444)' : 'linear-gradient(90deg, #3b82f6, #1d4ed8)',
                          borderRadius: 8,
                          transition: 'width 0.4s ease'
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#64748b', fontWeight: 600 }}>
                      <span>Ingresos Actuales: <b style={{ color: '#0f172a' }}>{currentOccupancy}</b></span>
                      <span>Capacidad Total: <b style={{ color: '#0f172a' }}>{maxCapacity}</b></span>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  )
}
