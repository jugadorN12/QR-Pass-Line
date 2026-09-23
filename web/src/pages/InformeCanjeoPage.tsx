import { useState, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { StaffHeader } from '../components/StaffHeader'
import {
  getTodayDateString,
  formatDateLabel,
  getTicketActivitySummary,
} from '../lib/dateUtils'

export function InformeCanjeoPage() {
  const { tickets, users, qrCatalog } = useApp()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialDate = searchParams.get('dia') || getTodayDateString()

  const [selectedDate, setSelectedDate] = useState<string>(initialDate)
  const [searchTerm, setSearchTerm] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'table' | 'cards' | 'agrupado'>('table')
  const [selectedRedeemer, setSelectedRedeemer] = useState<string>('all')
  const [selectedCoupon, setSelectedCoupon] = useState<string>('all')

  function shiftDate(days: number) {
    const parts = selectedDate.split('-').map(Number)
    const base = new Date(parts[0], parts[1] - 1, parts[2])
    base.setDate(base.getDate() + days)
    const y = base.getFullYear()
    const m = String(base.getMonth() + 1).padStart(2, '0')
    const d = String(base.getDate()).padStart(2, '0')
    const nextDate = `${y}-${m}-${d}`
    setSelectedDate(nextDate)
    setSearchParams({ dia: nextDate })
  }

  function resetToToday() {
    const today = getTodayDateString()
    setSelectedDate(today)
    setSearchParams({ dia: today })
  }

  // Summary for selectedDate (daily or weekly if Saturday)
  const summary = useMemo(() => {
    return getTicketActivitySummary(tickets, selectedDate)
  }, [tickets, selectedDate])

  const dateLabel = formatDateLabel(selectedDate)

  // Group redeemed tickets by Redeemer and Coupon
  const canjeoData = useMemo(() => {
    const filtered = summary.redeemedTickets.filter((t) => {
      const redeemer = users.find((u) => u.id === t.redeemedBy)
      const coupon = qrCatalog.find((c) => c.id === t.couponId)
      const redeemerName = redeemer?.name || redeemer?.email?.split('@')[0] || 'Puerta / Canjeador'
      const couponName = coupon?.name || 'Ingreso General'

      if (selectedRedeemer !== 'all' && t.redeemedBy !== selectedRedeemer) return false
      if (selectedCoupon !== 'all' && t.couponId !== selectedCoupon) return false

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase()
        const match =
          redeemerName.toLowerCase().includes(query) ||
          couponName.toLowerCase().includes(query) ||
          t.code.toLowerCase().includes(query) ||
          t.holderName.toLowerCase().includes(query)
        if (!match) return false
      }

      return true
    })

    const map = new Map<string, {
      redeemerId: string
      redeemerName: string
      couponId: string
      couponName: string
      count: number
    }>()

    for (const t of filtered) {
      const redeemer = users.find((u) => u.id === t.redeemedBy)
      const coupon = qrCatalog.find((c) => c.id === t.couponId)
      const redeemerName = redeemer?.name || redeemer?.email?.split('@')[0] || 'Puerta / Canjeador'
      const couponName = coupon?.name || 'Ingreso General'
      const key = `${t.redeemedBy || 'unknown'}_${t.couponId || 'general'}`

      const current = map.get(key) || {
        redeemerId: t.redeemedBy || '',
        redeemerName,
        couponId: t.couponId || '',
        couponName,
        count: 0,
      }

      current.count += 1
      map.set(key, current)
    }

    return Array.from(map.values())
  }, [summary.redeemedTickets, users, qrCatalog, selectedRedeemer, selectedCoupon, searchTerm])

  const totalCanjeados = canjeoData.reduce((acc, row) => acc + row.count, 0)

  function exportCsv() {
    if (!canjeoData.length) return
    const headers = 'Canjeador,Cupón,Canjeados'
    const rows = canjeoData.map(
      (r) => `"${r.redeemerName}","${r.couponName}",${r.count}`
    )
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `informe-canjeos-${selectedDate}.csv`)
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  return (
    <div className="staff-page">
      <StaffHeader />
      <div className="staff-layout">
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
          <a href="https://api.whatsapp.com/send?phone=5491131245112&text=Hola%2C%20necesito%20soporte%20con%20QR%20Pass%20Line" target="_blank" rel="noopener noreferrer" title="Soporte WhatsApp">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>
          </a>
        </aside>

        <main className="sellers-main doors-report-page">
          {/* Header Titlebar */}
          <div className="doors-report-header-row">
            <div className="doors-report-header-left">
              <Link to="/encargado" className="doors-back-btn" aria-label="Volver">‹</Link>
              <h1 className="doors-report-main-title">Canjeo</h1>
              <button type="button" className="doors-info-icon" title="Información del reporte">ⓘ</button>
            </div>
            <div className="doors-report-header-right">
              <button
                type="button"
                className="doors-export-icon-btn"
                onClick={exportCsv}
                title="Exportar a Excel / CSV"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="8" y1="13" x2="16" y2="13" />
                  <line x1="8" y1="17" x2="16" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </button>
            </div>
          </div>

          {/* Date Navigator Bar */}
          <div className="doors-date-nav-bar">
            <button type="button" className="doors-date-arrow" onClick={() => shiftDate(-1)} aria-label="Día anterior">‹</button>
            <div className="doors-date-pill">{dateLabel}</div>
            <button type="button" className="doors-date-arrow" onClick={() => shiftDate(1)} aria-label="Día siguiente">›</button>
            <button type="button" className="doors-date-reset-btn" onClick={resetToToday} title="Restablecer a hoy">↻</button>
          </div>

          {/* 1 Large Full-Width Green KPI Card */}
          <section className="doors-kpi-cards-grid doors-kpi-1">
            <article className="doors-kpi-banner doors-kpi-green doors-kpi-fullwidth">
              <div className="doors-kpi-banner-icon">
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div className="doors-kpi-banner-content">
                <strong>{totalCanjeados}</strong>
                <small>CANJEADOS</small>
              </div>
            </article>
          </section>

          {/* Search bar */}
          <div className="doors-search-bar-wrap">
            <input
              type="text"
              className="doors-search-input"
              placeholder="🔍 Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filtros collapsible */}
          <div className="doors-filter-section">
            <button
              type="button"
              className="doors-filter-header"
              onClick={() => setFiltersOpen(!filtersOpen)}
            >
              <span>Filtros</span>
              <span className="doors-chevron">{filtersOpen ? '⌃' : '⌄'}</span>
            </button>
            {filtersOpen && (
              <div className="doors-filter-body">
                <div className="doors-filter-row">
                  <label>
                    <span>Canjeador:</span>
                    <select value={selectedRedeemer} onChange={(e) => setSelectedRedeemer(e.target.value)}>
                      <option value="all">Todos los canjeadores</option>
                      {users.filter((u) => u.role === 'canjeador' || u.roles?.includes('canjeador') || u.role === 'validador').map((u) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Cupón:</span>
                    <select value={selectedCoupon} onChange={(e) => setSelectedCoupon(e.target.value)}>
                      <option value="all">Todos los cupones</option>
                      {qrCatalog.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* View mode switchers: + Tabla | Cards | Agrupado */}
          <div className="doors-view-modes">
            <button
              type="button"
              className={`doors-view-mode-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
            >
              + Tabla
            </button>
            <button
              type="button"
              className={`doors-view-mode-btn ${viewMode === 'cards' ? 'active' : ''}`}
              onClick={() => setViewMode('cards')}
            >
              Cards
            </button>
            <button
              type="button"
              className={`doors-view-mode-btn ${viewMode === 'agrupado' ? 'active' : ''}`}
              onClick={() => setViewMode('agrupado')}
            >
              Agrupado
            </button>
          </div>

          {/* Table / Cards / Agrupado view */}
          {viewMode === 'table' ? (
            <div className="doors-table-container">
              <table className="doors-data-table">
                <thead>
                  <tr>
                    <th>Canjeador</th>
                    <th>Cupón</th>
                    <th style={{ textAlign: 'center' }}>Canjeados</th>
                  </tr>
                </thead>
                <tbody>
                  {canjeoData.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="doors-empty-cell">
                        No hay datos para mostrar
                      </td>
                    </tr>
                  ) : (
                    canjeoData.map((row) => (
                      <tr key={`${row.redeemerId}_${row.couponId}`}>
                        <td><strong>{row.redeemerName}</strong></td>
                        <td>{row.couponName}</td>
                        <td style={{ textAlign: 'center' }}><strong>{row.count}</strong></td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2}><strong>Totales</strong></td>
                    <td style={{ textAlign: 'center' }}><strong>{totalCanjeados}</strong></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : viewMode === 'cards' ? (
            <div className="doors-cards-view-grid">
              {canjeoData.length === 0 ? (
                <div className="doors-empty-box">No hay datos para mostrar</div>
              ) : (
                canjeoData.map((row) => (
                  <div className="doors-item-card" key={`${row.redeemerId}_${row.couponId}`}>
                    <h3>{row.redeemerName}</h3>
                    <p className="doors-card-sub">{row.couponName}</p>
                    <div className="doors-card-stats-row">
                      <div><span>Total Canjeados:</span> <b>{row.count}</b></div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            /* Agrupado View */
            <div className="doors-grouped-view">
              {canjeoData.length === 0 ? (
                <div className="doors-empty-box">No hay datos para mostrar</div>
              ) : (
                Object.entries(
                  canjeoData.reduce((acc, row) => {
                    if (!acc[row.redeemerName]) acc[row.redeemerName] = []
                    acc[row.redeemerName].push(row)
                    return acc
                  }, {} as Record<string, typeof canjeoData>)
                ).map(([redeemerName, items]) => (
                  <div className="doors-group-panel" key={redeemerName}>
                    <h3 className="doors-group-title">{redeemerName}</h3>
                    <table className="doors-data-table">
                      <thead>
                        <tr>
                          <th>Cupón</th>
                          <th style={{ textAlign: 'center' }}>Canjeados</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item) => (
                          <tr key={`${item.redeemerId}_${item.couponId}`}>
                            <td>{item.couponName}</td>
                            <td style={{ textAlign: 'center' }}><strong>{item.count}</strong></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
