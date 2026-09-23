import { useState, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { StaffHeader } from '../components/StaffHeader'
import {
  getTodayDateString,
  formatDateDmy,
  getWeeklyDateRange,
  getTicketActivitySummary,
} from '../lib/dateUtils'

export function InformeVentasPage() {
  const { tickets, users, qrCatalog } = useApp()
  const [searchParams] = useSearchParams()
  const initialDate = searchParams.get('dia') || getTodayDateString()

  const [selectedDate] = useState<string>(initialDate)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')
  const [selectedSeller, setSelectedSeller] = useState<string>('all')
  const [selectedCoupon, setSelectedCoupon] = useState<string>('all')

  // Calculate activity for selectedDate (daily or weekly if Saturday)
  const summary = useMemo(() => {
    return getTicketActivitySummary(tickets, selectedDate)
  }, [tickets, selectedDate])

  const dateRangeLabel = useMemo(() => {
    if (summary.isWeeklySummary) {
      return getWeeklyDateRange(selectedDate).label
    }
    const dmy = formatDateDmy(selectedDate)
    return `${dmy} - ${dmy}`
  }, [selectedDate, summary.isWeeklySummary])

  // Group tickets by Seller and Coupon
  const salesData = useMemo(() => {
    const list = summary.issuedTickets.filter((ticket) => {
      if (selectedSeller !== 'all' && ticket.issuedBy !== selectedSeller) return false
      if (selectedCoupon !== 'all' && ticket.couponId !== selectedCoupon) return false
      return true
    })

    const map = new Map<string, {
      sellerId: string
      sellerName: string
      couponId: string
      couponName: string
      quantity: number
      price: number
      totalSales: number
      redeemed: number
    }>()

    for (const t of list) {
      const seller = users.find((u) => u.id === t.issuedBy)
      const coupon = qrCatalog.find((c) => c.id === t.couponId)
      const sellerName = seller?.name || seller?.email?.split('@')[0] || 'Vendedor'
      const couponName = coupon?.name || 'Ingreso General'
      const price = Number((t as any).price || (coupon as any)?.price || 0)
      const key = `${t.issuedBy || 'anon'}_${t.couponId || 'gen'}`

      const current = map.get(key) || {
        sellerId: t.issuedBy || '',
        sellerName,
        couponId: t.couponId || '',
        couponName,
        quantity: 0,
        price,
        totalSales: 0,
        redeemed: 0,
      }

      current.quantity += 1
      current.totalSales += price
      if (t.redeemedAt) {
        current.redeemed += 1
      }
      map.set(key, current)
    }

    return Array.from(map.values())
  }, [summary.issuedTickets, selectedSeller, selectedCoupon, users, qrCatalog])

  const totalQuantity = salesData.reduce((acc, row) => acc + row.quantity, 0)
  const totalSalesAmount = salesData.reduce((acc, row) => acc + row.totalSales, 0)
  const totalRedeemedCount = summary.redeemedTickets.length

  function exportCsv() {
    if (!salesData.length) return
    const headers = 'Vendedor,Cupón,Cantidad,Precio,Venta'
    const rows = salesData.map(
      (r) => `"${r.sellerName}","${r.couponName}",${r.quantity},${r.price},${r.totalSales}`
    )
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `informe-ventas-${selectedDate}.csv`)
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
              <h1 className="doors-report-main-title">Informe de Ventas</h1>
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

          {/* Date range banner */}
          <div className="doors-date-banner">
            <div className="doors-date-banner-label">Fecha del informe</div>
            <div className="doors-date-banner-value">{dateRangeLabel}</div>
          </div>

          {/* 3 KPI Cards */}
          <section className="doors-kpi-cards-grid doors-kpi-3">
            {/* 1. Venta */}
            <article className="doors-kpi-banner doors-kpi-cyan">
              <div className="doors-kpi-banner-icon">
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="2" width="16" height="20" rx="2" />
                  <rect x="7" y="6" width="3" height="3" rx="0.5" />
                  <rect x="14" y="6" width="3" height="3" rx="0.5" />
                  <rect x="7" y="11" width="3" height="3" rx="0.5" />
                  <rect x="14" y="11" width="3" height="3" rx="0.5" />
                  <path d="M10 22v-4h4v4" />
                </svg>
              </div>
              <div className="doors-kpi-banner-content">
                <strong>${totalSalesAmount}</strong>
                <small>VENTA</small>
              </div>
            </article>

            {/* 2. Vendidas */}
            <article className="doors-kpi-banner doors-kpi-blue">
              <div className="doors-kpi-banner-icon">
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 9a3 3 0 0 1 0 6v3a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3a3 3 0 0 1 0-6V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" />
                  <line x1="9" y1="4" x2="9" y2="20" strokeDasharray="2 2" />
                </svg>
              </div>
              <div className="doors-kpi-banner-content">
                <strong>{totalQuantity}</strong>
                <small>VENDIDAS</small>
              </div>
            </article>

            {/* 3. Canjeadas */}
            <article className="doors-kpi-banner doors-kpi-green">
              <div className="doors-kpi-banner-icon">
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div className="doors-kpi-banner-content">
                <strong>{totalRedeemedCount}</strong>
                <small>CANJEADAS</small>
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
              <span>Filtros</span>
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

          {/* Switchers: + Tabla | Cards */}
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
          </div>

          {/* Table / Cards content */}
          {viewMode === 'table' ? (
            <div className="doors-table-container">
              <table className="doors-data-table">
                <thead>
                  <tr>
                    <th>Vendedor</th>
                    <th>Cupón</th>
                    <th style={{ textAlign: 'center' }}>Cantidad</th>
                    <th style={{ textAlign: 'right' }}>Precio</th>
                    <th style={{ textAlign: 'right' }}>Venta</th>
                  </tr>
                </thead>
                <tbody>
                  {salesData.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="doors-empty-cell">
                        No hay datos para mostrar
                      </td>
                    </tr>
                  ) : (
                    salesData.map((row) => (
                      <tr key={`${row.sellerId}_${row.couponId}`}>
                        <td><strong>{row.sellerName}</strong></td>
                        <td>{row.couponName}</td>
                        <td style={{ textAlign: 'center' }}>{row.quantity}</td>
                        <td style={{ textAlign: 'right' }}>${row.price}</td>
                        <td style={{ textAlign: 'right' }}><strong>${row.totalSales}</strong></td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2}><strong>Totales</strong></td>
                    <td style={{ textAlign: 'center' }}><strong>{totalQuantity}</strong></td>
                    <td style={{ textAlign: 'right' }}><strong>${salesData.length ? (totalSalesAmount / (totalQuantity || 1)).toFixed(0) : '0'}</strong></td>
                    <td style={{ textAlign: 'right' }}><strong>${totalSalesAmount}</strong></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="doors-cards-view-grid">
              {salesData.length === 0 ? (
                <div className="doors-empty-box">No hay datos para mostrar</div>
              ) : (
                salesData.map((row) => (
                  <div className="doors-item-card" key={`${row.sellerId}_${row.couponId}`}>
                    <h3>{row.sellerName}</h3>
                    <p className="doors-card-sub">{row.couponName}</p>
                    <div className="doors-card-stats-row">
                      <div><span>Cantidad:</span> <b>{row.quantity}</b></div>
                      <div><span>Precio:</span> <b>${row.price}</b></div>
                      <div><span>Venta:</span> <b>${row.totalSales}</b></div>
                    </div>
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
