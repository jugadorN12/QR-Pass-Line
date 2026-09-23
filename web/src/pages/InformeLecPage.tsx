import { useState, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { StaffHeader } from '../components/StaffHeader'
import {
  getTodayDateString,
  formatDateLabel,
  getTicketActivitySummary,
} from '../lib/dateUtils'

export function InformeLecPage() {
  const { tickets, users, qrCatalog, limitations } = useApp()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialDate = searchParams.get('dia') || getTodayDateString()
  const initialVer = searchParams.get('ver')?.toLowerCase() === 'no' ? 'no' : 'si'

  const [selectedDate, setSelectedDate] = useState<string>(initialDate)
  const [verEmitidos, setVerEmitidos] = useState<'si' | 'no'>(initialVer)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'table' | 'cards' | 'agrupado'>('table')
  const [selectedSeller, setSelectedSeller] = useState<string>('all')
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
    setSearchParams({ ver: verEmitidos, dia: nextDate })
  }

  function resetToToday() {
    const today = getTodayDateString()
    setSelectedDate(today)
    setSearchParams({ ver: verEmitidos, dia: today })
  }

  function handleVerChange(mode: 'si' | 'no') {
    setVerEmitidos(mode)
    setSearchParams({ ver: mode, dia: selectedDate })
  }

  // Summary for selectedDate (daily or weekly if Saturday)
  const summary = useMemo(() => {
    return getTicketActivitySummary(tickets, selectedDate)
  }, [tickets, selectedDate])

  const dateLabel = formatDateLabel(selectedDate)

  // Calculate LEC Rows: Vendedor + Cupón -> L (Limitados), E (Emitidos), C (Canjeados), N (No cargados)
  const lecData = useMemo(() => {
    const sellers = users.filter((u) => u.role === 'vendedor' || u.roles?.includes('vendedor'))
    const rows: Array<{
      id: string
      sellerId: string
      sellerName: string
      couponId: string
      couponName: string
      limit: number
      emitted: number
      redeemed: number
      notLoaded: number
    }> = []

    for (const seller of sellers) {
      if (selectedSeller !== 'all' && seller.id !== selectedSeller) continue

      for (const coupon of qrCatalog) {
        if (selectedCoupon !== 'all' && coupon.id !== selectedCoupon) continue

        // Limitation assigned
        const limitObj = limitations.find(
          (l) => l.personId === seller.id && l.couponId === coupon.id
        )
        const limit = Number(limitObj?.quantity) || 0

        // Emitted tickets by this seller for this coupon in selected time window
        const emittedTickets = summary.issuedTickets.filter(
          (t) => t.issuedBy === seller.id && t.couponId === coupon.id
        )
        const emitted = emittedTickets.length

        // Redeemed tickets
        const redeemed = emittedTickets.filter((t) => t.redeemedAt).length
        const notLoaded = Math.max(0, limit - emitted)

        // Filter based on "Ver emitidos: SI / No"
        if (verEmitidos === 'si') {
          // If 'si', show all where limit > 0 or emitted > 0
          if (limit > 0 || emitted > 0) {
            rows.push({
              id: `${seller.id}_${coupon.id}`,
              sellerId: seller.id,
              sellerName: seller.name,
              couponId: coupon.id,
              couponName: coupon.name,
              limit,
              emitted,
              redeemed,
              notLoaded,
            })
          }
        } else {
          // If 'no' (Por Canjear / no emitidos / no canjeados)
          if (notLoaded > 0 || (emitted > 0 && emitted > redeemed)) {
            rows.push({
              id: `${seller.id}_${coupon.id}`,
              sellerId: seller.id,
              sellerName: seller.name,
              couponId: coupon.id,
              couponName: coupon.name,
              limit,
              emitted,
              redeemed,
              notLoaded,
            })
          }
        }
      }
    }

    return rows
  }, [users, qrCatalog, limitations, summary.issuedTickets, selectedSeller, selectedCoupon, verEmitidos])

  // Total KPIs
  const totalLimitados = limitations.reduce((acc, l) => acc + (Number(l.quantity) || 0), 0)
  const totalEmitidos = summary.issuedCount
  const totalCanjeados = summary.redeemedCount
  const totalNoCargados = Math.max(0, totalLimitados - totalEmitidos)

  function exportCsv() {
    if (!lecData.length) return
    const headers = 'Vendedor,Cupón,L (Limitados),E (Emitidos),C (Canjeados),N/cargados'
    const rows = lecData.map(
      (r) => `"${r.sellerName}","${r.couponName}",${r.limit},${r.emitted},${r.redeemed},${r.notLoaded}`
    )
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `informe-lec-${selectedDate}.csv`)
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
              <h1 className="doors-report-main-title">Limitados Emitidos Canjeados</h1>
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

          {/* Ver emitidos Toggle Bar */}
          <div className="doors-toggle-bar">
            <span className="doors-toggle-label">Ver emitidos</span>
            <div className="doors-toggle-pills">
              <button
                type="button"
                className={`doors-toggle-pill ${verEmitidos === 'si' ? 'active-si' : ''}`}
                onClick={() => handleVerChange('si')}
              >
                SI
              </button>
              <button
                type="button"
                className={`doors-toggle-pill ${verEmitidos === 'no' ? 'active-no' : ''}`}
                onClick={() => handleVerChange('no')}
              >
                No
              </button>
            </div>
          </div>

          {/* 4 KPI Cards */}
          <section className="doors-kpi-cards-grid doors-kpi-4">
            {/* 1. Limitados */}
            <article className="doors-kpi-banner doors-kpi-cyan">
              <div className="doors-kpi-banner-icon">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="12 2 2 7 12 12 22 7 12 2" />
                  <polyline points="2 17 12 22 22 17" />
                  <polyline points="2 12 12 17 22 12" />
                </svg>
              </div>
              <div className="doors-kpi-banner-content">
                <strong>{totalLimitados}</strong>
                <small>LIMITADOS</small>
              </div>
            </article>

            {/* 2. Emitidos */}
            <article className="doors-kpi-banner doors-kpi-blue">
              <div className="doors-kpi-banner-icon">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="6" width="20" height="12" rx="2" />
                  <circle cx="6" cy="12" r="1.5" fill="currentColor" />
                  <circle cx="18" cy="12" r="1.5" fill="currentColor" />
                  <line x1="12" y1="6" x2="12" y2="18" strokeDasharray="2 2" />
                </svg>
              </div>
              <div className="doors-kpi-banner-content">
                <strong>{totalEmitidos}</strong>
                <small>EMITIDOS</small>
              </div>
            </article>

            {/* 3. Canjeados */}
            <article className="doors-kpi-banner doors-kpi-green">
              <div className="doors-kpi-banner-icon">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div className="doors-kpi-banner-content">
                <strong>{totalCanjeados}</strong>
                <small>CANJEADOS</small>
              </div>
            </article>

            {/* 4. No cargados / Por canjear */}
            <article className="doors-kpi-banner doors-kpi-orange">
              <div className="doors-kpi-banner-icon">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div className="doors-kpi-banner-content">
                <strong>{totalNoCargados}</strong>
                <small>NO CARGADOS</small>
              </div>
            </article>
          </section>

          {/* Filtros collapsible */}
          <div className="doors-filter-section">
            <button
              type="button"
              className="doors-filter-header"
              onClick={() => setFiltersOpen(!filtersOpen)}
            >
              <span>Filtros por vendedor, cupón y tipo</span>
              <span className="doors-chevron">{filtersOpen ? '⌃' : '⌄'}</span>
            </button>
            {filtersOpen && (
              <div className="doors-filter-body">
                <div className="doors-filter-row">
                  <label>
                    <span>Vendedor:</span>
                    <select value={selectedSeller} onChange={(e) => setSelectedSeller(e.target.value)}>
                      <option value="all">Todos los vendedores</option>
                      {users.filter((u) => u.role === 'vendedor' || u.roles?.includes('vendedor')).map((u) => (
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
                    <th>Vendedor</th>
                    <th>Cupón</th>
                    <th style={{ textAlign: 'center' }}>L</th>
                    <th style={{ textAlign: 'center' }}>E</th>
                    <th style={{ textAlign: 'center' }}>C</th>
                    <th style={{ textAlign: 'center' }}>N/cargados</th>
                  </tr>
                </thead>
                <tbody>
                  {lecData.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="doors-empty-cell">
                        No hay datos para mostrar
                      </td>
                    </tr>
                  ) : (
                    lecData.map((row) => (
                      <tr key={row.id}>
                        <td><strong>{row.sellerName}</strong></td>
                        <td>{row.couponName}</td>
                        <td style={{ textAlign: 'center' }}>{row.limit}</td>
                        <td style={{ textAlign: 'center' }}>{row.emitted}</td>
                        <td style={{ textAlign: 'center' }}>{row.redeemed}</td>
                        <td style={{ textAlign: 'center' }}>{row.notLoaded}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2}><strong>Totales</strong></td>
                    <td style={{ textAlign: 'center' }}><strong>{lecData.reduce((acc, r) => acc + r.limit, 0)}</strong></td>
                    <td style={{ textAlign: 'center' }}><strong>{lecData.reduce((acc, r) => acc + r.emitted, 0)}</strong></td>
                    <td style={{ textAlign: 'center' }}><strong>{lecData.reduce((acc, r) => acc + r.redeemed, 0)}</strong></td>
                    <td style={{ textAlign: 'center' }}><strong>{lecData.reduce((acc, r) => acc + r.notLoaded, 0)}</strong></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : viewMode === 'cards' ? (
            <div className="doors-cards-view-grid">
              {lecData.length === 0 ? (
                <div className="doors-empty-box">No hay datos para mostrar</div>
              ) : (
                lecData.map((row) => (
                  <div className="doors-item-card" key={row.id}>
                    <h3>{row.sellerName}</h3>
                    <p className="doors-card-sub">{row.couponName}</p>
                    <div className="doors-card-stats-row">
                      <div><span>Limitados (L):</span> <b>{row.limit}</b></div>
                      <div><span>Emitidos (E):</span> <b>{row.emitted}</b></div>
                      <div><span>Canjeados (C):</span> <b>{row.redeemed}</b></div>
                      <div><span>No cargados:</span> <b>{row.notLoaded}</b></div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            /* Agrupado View */
            <div className="doors-grouped-view">
              {lecData.length === 0 ? (
                <div className="doors-empty-box">No hay datos para mostrar</div>
              ) : (
                Object.entries(
                  lecData.reduce((acc, row) => {
                    if (!acc[row.sellerName]) acc[row.sellerName] = []
                    acc[row.sellerName].push(row)
                    return acc
                  }, {} as Record<string, typeof lecData>)
                ).map(([sellerName, items]) => (
                  <div className="doors-group-panel" key={sellerName}>
                    <h3 className="doors-group-title">{sellerName}</h3>
                    <table className="doors-data-table">
                      <thead>
                        <tr>
                          <th>Cupón</th>
                          <th style={{ textAlign: 'center' }}>L</th>
                          <th style={{ textAlign: 'center' }}>E</th>
                          <th style={{ textAlign: 'center' }}>C</th>
                          <th style={{ textAlign: 'center' }}>N/cargados</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item) => (
                          <tr key={item.id}>
                            <td>{item.couponName}</td>
                            <td style={{ textAlign: 'center' }}>{item.limit}</td>
                            <td style={{ textAlign: 'center' }}>{item.emitted}</td>
                            <td style={{ textAlign: 'center' }}>{item.redeemed}</td>
                            <td style={{ textAlign: 'center' }}>{item.notLoaded}</td>
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
