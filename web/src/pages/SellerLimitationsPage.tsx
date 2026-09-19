import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import type { QrCatalogItem } from '../types'
import { StaffHeader } from '../components/StaffHeader'

const sellerNames: Record<string, { name: string; email: string }> = {
  'demo-lucia': { name: 'Lucía Eventos', email: 'lucia@qrpassline.com' },
  'demo-marcos': { name: 'Marcos Fiestas', email: 'marcos@qrpassline.com' },
}

export function SellerLimitationsPage() {
  const params = useParams()
  const personId = params.sellerId ?? params.redeemerId ?? 'demo-lucia'
  const isRedeemer = Boolean(params.redeemerId)
  const seller = sellerNames[personId] ?? { name: isRedeemer ? 'Canjeador' : 'Vendedor', email: isRedeemer ? 'canjeador@qrpassline.com' : 'vendedor@qrpassline.com' }
  const navigate = useNavigate()
  const { limitations, deleteLimitation, qrCatalog } = useApp()
  const personLimitations = limitations.filter((item) => item.personId === personId)
  const rows = personLimitations.length ? personLimitations : []

  function removeAll() {
    personLimitations.forEach((item) => void deleteLimitation(item.id))
  }

  return (
    <StaffFrame>
      <main className="sellers-main limitation-main">
        <div className="sellers-titlebar">
          <Link to={isRedeemer ? '/canjeadores' : '/vendedores'} className="back-link">‹</Link>
          <h1>Limitaciones {seller.name}</h1>
          <button className="add-person qr-add-link" aria-label="Nueva limitación" onClick={() => navigate(isRedeemer ? `/canjeadores/${personId}/limitaciones/nueva` : `/vendedores/${personId}/limitaciones/nueva`)}>+</button>
        </div>
        <div className="limitation-actions">
          <button className="btn btn-primary" type="button">Exportar limitaciones</button>
          <button className="btn limitation-delete" type="button" onClick={removeAll}>♧ &nbsp; Eliminar todas</button>
        </div>
        <section className="sellers-panel limitation-panel">
          <div className="sellers-panel-heading"><strong>QR's</strong><span>{personLimitations.length} limitaciones</span></div>
          {rows.map((row) => {
            const coupon = qrCatalog.find((item) => item.id === row.couponId)
            return (
              <div className="limitation-row" key={row.id}>
                <div>
                  <strong>▱ &nbsp;{coupon?.name ?? 'Cupón asignado'}</strong>
                  <small>S</small>
                  <small>{row.period}</small>
                </div>
                <b>{row.quantity}</b>
                <button type="button" aria-label={`Editar ${coupon?.name ?? 'limitación'}`} onClick={() => navigate(`${isRedeemer ? `/canjeadores/${personId}` : `/vendedores/${personId}`}/limitaciones/${row.id}/editar`)}>⌕</button>
                <button type="button" aria-label={`Eliminar ${coupon?.name ?? 'limitación'}`} onClick={() => void deleteLimitation(row.id)}>♧</button>
              </div>
            )
          })}
        </section>
      </main>
    </StaffFrame>
  )
}

export function EditSellerLimitationPage() {
  const params = useParams()
  const personId = params.sellerId ?? params.redeemerId ?? 'demo-lucia'
  const isRedeemer = Boolean(params.redeemerId)
  const limitationId = params.limitId ?? ''
  const navigate = useNavigate()
  const { limitations, saveLimitation, deleteLimitation, qrCatalog } = useApp()
  const limitation = limitations.find((item) => item.id === limitationId)
  const [couponId, setCouponId] = useState(limitation?.couponId ?? '')
  const [period, setPeriod] = useState(limitation?.period ?? '01/02/2000 - 31/01/2051')
  const [quantity, setQuantity] = useState(String(limitation?.quantity ?? 1))
  const [days, setDays] = useState<string[]>(limitation?.days ?? ['L', 'M', 'X', 'J', 'V', 'S', 'D'])
  const coupons = qrCatalog.filter((coupon) => coupon.active !== false)
  const backPath = isRedeemer ? `/canjeadores/${personId}/limitaciones` : `/vendedores/${personId}/limitaciones`

  function toggleDay(day: string) {
    setDays((current) => current.includes(day) ? current.filter((item) => item !== day) : [...current, day])
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!limitation || !couponId) return
    await saveLimitation({
      ...limitation,
      couponId,
      period,
      quantity: Math.max(1, Number(quantity) || 1),
      days,
    })
    navigate(backPath)
  }

  async function remove() {
    if (!limitation) return
    await deleteLimitation(limitation.id)
    navigate(backPath)
  }

  return (
    <StaffFrame>
      <main className="sellers-main limitation-main">
        <div className="limitation-form-title">
          <Link to={backPath} className="back-link">‹</Link>
          <h1>Modificar limitación</h1>
        </div>
        <form className="limitation-edit-form" onSubmit={save}>
          <label className="settings-field">
            <span>Cupón</span>
            <select value={couponId} onChange={(event) => setCouponId(event.target.value)}>
              {coupons.map((coupon) => <option key={coupon.id} value={coupon.id}>{coupon.name}</option>)}
            </select>
          </label>
          <label className="settings-field">
            <span>Período</span>
            <input value={period} onChange={(event) => setPeriod(event.target.value)} />
          </label>
          <label className="settings-field">
            <span>Cantidad</span>
            <input type="number" min="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
          </label>
          <div className="limitation-days">
            <strong>Días habilitados:</strong>
            <div>
              {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day) => (
                <button className={days.includes(day) ? 'selected' : ''} type="button" key={day} onClick={() => toggleDay(day)}>{day}</button>
              ))}
            </div>
          </div>
          <button className="btn btn-primary" type="submit">MODIFICAR LIMITACIÓN</button>
          <button className="limitation-remove-button" type="button" onClick={remove}>ELIMINAR LIMITACIÓN</button>
        </form>
      </main>
    </StaffFrame>
  )
}

export function NewSellerLimitationPage() {
  const params = useParams()
  const sellerId = params.sellerId ?? params.redeemerId ?? 'demo-lucia'
  const seller = sellerNames[sellerId] ?? { name: params.redeemerId ? 'Canjeador' : 'Vendedor', email: params.redeemerId ? 'canjeador@qrpassline.com' : 'vendedor@qrpassline.com' }
  const navigate = useNavigate()
  const { saveLimitation } = useApp()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [selectedCoupon, setSelectedCoupon] = useState<QrCatalogItem | null>(null)
  const basePath = params.redeemerId ? `/canjeadores/${sellerId}/limitaciones/nueva` : `/vendedores/${sellerId}/limitaciones/nueva`

  async function createLimitation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (selectedCoupon) {
      await saveLimitation({
        id: `limit-${crypto.randomUUID().slice(0, 8)}`,
        personId: sellerId,
        couponId: selectedCoupon.id,
        quantity: 1,
        period: '01/02/2000 - 31/01/2051',
        days: ['L', 'M', 'X', 'J', 'V', 'S', 'D'],
      })
    }
    navigate(basePath.replace('/nueva', ''))
  }

  return (
    <StaffFrame>
      <main className="sellers-main limitation-main">
        <div className="limitation-form-title">
          <Link to={params.redeemerId ? `/canjeadores/${sellerId}/limitaciones` : `/vendedores/${sellerId}/limitaciones`} className="back-link">‹</Link>
          <h1>Nueva limitación</h1>
        </div>
        <form className="limitation-form" onSubmit={createLimitation}>
          <p className="manager-section-label">Vendedor: {seller.name} · {seller.email}</p>
          <label className="limitation-period-toggle">
            <span>Período ilimitado</span>
            <button type="button">Sí</button>
            <button className="selected" type="button">No</button>
          </label>
          <label className="floating-field">
            <span>Período</span>
            <input type="text" defaultValue="01/02/2000 - 31/01/2051" readOnly />
          </label>
          <button className="coupon-select-trigger" type="button" onClick={() => setPickerOpen(true)}>
            <span>♧ &nbsp; Cupón</span>
            <strong>{selectedCoupon?.name ?? 'Seleccionar cupón'}</strong>
            <b>⌄</b>
          </button>
          <button className="btn btn-primary limitation-save" type="submit" disabled={!selectedCoupon}>CREAR LIMITACIÓN</button>
        </form>
        {pickerOpen ? <CouponPicker selectedId={selectedCoupon?.id} onClose={() => setPickerOpen(false)} onSelect={(coupon) => { setSelectedCoupon(coupon); setPickerOpen(false) }} /> : null}
      </main>
    </StaffFrame>
  )
}

function CouponPicker({ selectedId, onClose, onSelect }: { selectedId?: string; onClose: () => void; onSelect: (coupon: QrCatalogItem) => void }) {
  const [query, setQuery] = useState('')
  const { qrCatalog } = useApp()
  const coupons = qrCatalog.filter((coupon) => coupon.active !== false)
  const filteredCoupons = coupons.filter((coupon) => coupon.name.includes(query.trim().toUpperCase()))
  return (
    <div className="coupon-picker-backdrop">
      <button className="time-picker-dismiss" aria-label="Cerrar selector" onClick={onClose} />
      <section className="coupon-picker-sheet">
        <div className="sheet-handle" />
        <label className="coupon-search">⌕ <input autoFocus placeholder="Buscar cupón" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <strong className="coupon-heading">QRS</strong>
        {filteredCoupons.length ? filteredCoupons.map((coupon) => (
          <button className={`coupon-option ${coupon.id === selectedId ? 'selected' : ''}`} key={coupon.id} type="button" onClick={() => onSelect(coupon)}>
            ▱ &nbsp; {coupon.name}
            <span>{coupon.id === selectedId ? '✓' : ''}</span>
          </button>
        )) : <p className="coupon-empty">No hay cupones que coincidan con la búsqueda.</p>}
      </section>
    </div>
  )
}

function StaffFrame({ children }: { children: ReactNode }) {
  return <div className="staff-page"><StaffHeader /><div className="staff-layout"><aside className="staff-sidebar"><Link className="staff-sidebar-control" to="/encargado">‹</Link><Link to="/encargado">⌂</Link><Link className="active" to="/vendedores">♙</Link><Link to="/canjeadores">⌗</Link><Link to="/fechas">⌁</Link><Link to="/equipo">◎</Link><Link to="/puerta">?</Link></aside>{children}</div></div>
}
