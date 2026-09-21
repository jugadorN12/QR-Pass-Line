import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { DottedQrImage } from '../components/DottedQrImage'
import QRCode from 'qrcode'

export function SellerEmitPage() {
  const { currentUser, events, qrCatalog, issueTicket } = useApp()
  const navigate = useNavigate()

  const [selectedCouponId, setSelectedCouponId] = useState<string>('1')
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [previewTicket, setPreviewTicket] = useState<{ code: string; couponName: string; schedule: string; quantity: number } | null>(null)
  const [issuing, setIssuing] = useState(false)

  const activeEvent = events.find((e) => e.status === 'activo') || events[0]
  const businessName = localStorage.getItem('qr-pass-line.business-name') || 'Cubano'
  const logo = localStorage.getItem('qr-pass-line.establishment-logo') || '/favicon.svg'
  const eventBg = (activeEvent as any)?.backgroundImage || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80'

  const couponsToDisplay = qrCatalog.length > 0 ? qrCatalog : [
    { id: '1', name: 'INGRESO GENERAL 2AM', kind: 'consumible', schedule: 'Del 19/09 23:59 al 20/09 02:00', available: 200 },
    { id: '2', name: 'INGRESO S/C 2:30', kind: 'consumible', schedule: 'Del 19/09 23:59 al 20/09 02:29', available: 200 },
    { id: '3', name: 'INGRESO S/C + VIP', kind: 'consumible', schedule: 'Del 19/09 23:59 al 20/09 04:00', available: 200 },
  ]

  function updateCount(couponId: string, delta: number) {
    setCounts((prev) => {
      const current = prev[couponId] ?? 0
      const next = Math.max(0, current + delta)
      return { ...prev, [couponId]: next }
    })
  }

  async function handleDirectEmit() {
    if (!activeEvent || issuing) return
    setIssuing(true)
    try {
      const selectedCoupon = couponsToDisplay.find((c) => c.id === selectedCouponId) || couponsToDisplay[0]
      const count = counts[selectedCoupon.id] || 1
      const ticket = await issueTicket({
        eventId: activeEvent.id,
        kind: 'qr',
        holderName: `Cliente ${currentUser?.name || 'Vendedor'}`,
        dni: ''
      })

      setPreviewTicket({
        code: ticket.code,
        couponName: selectedCoupon.name,
        schedule: (selectedCoupon as any).schedule || 'Del 19/09 23:59 al 20/09 02:00',
        quantity: count > 0 ? count : 1
      })
    } catch (err: any) {
      alert(err?.message || 'Error al emitir cupón.')
    } finally {
      setIssuing(false)
    }
  }

  async function generateCouponPng(): Promise<Blob | null> {
    if (!previewTicket) return null
    const width = 720
    const height = 1040
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    // 1. Draw Background Poster Image
    const bgImg = new Image()
    bgImg.crossOrigin = 'anonymous'
    await new Promise((resolve) => {
      bgImg.onload = resolve
      bgImg.onerror = resolve
      bgImg.src = eventBg
    })

    if (bgImg.complete && bgImg.naturalWidth > 0) {
      ctx.drawImage(bgImg, 0, 0, width, height)
    } else {
      ctx.fillStyle = '#0f172a'
      ctx.fillRect(0, 0, width, height)
    }

    // Gradient Overlay for text legibility
    const grad = ctx.createLinearGradient(0, 0, 0, height)
    grad.addColorStop(0, 'rgba(0,0,0,0.45)')
    grad.addColorStop(0.5, 'rgba(0,0,0,0.2)')
    grad.addColorStop(1, 'rgba(0,0,0,0.85)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, width, height)

    // 2. Draw Header Text
    ctx.textAlign = 'center'
    ctx.fillStyle = '#ffffff'
    ctx.font = '900 36px sans-serif'
    ctx.fillText('SÁBADO 19 SEPTIEMBRE', width / 2, 90)

    ctx.font = '900 50px sans-serif'
    ctx.fillText('PRE PRIMAVERA', width / 2, 155)

    // 3. Draw Translucent White Rounded Card for QR Code
    const qrCardSize = 420
    const qrCardX = (width - qrCardSize) / 2
    const qrCardY = 210

    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)'
    ctx.beginPath()
    ctx.roundRect(qrCardX, qrCardY, qrCardSize, qrCardSize, 48)
    ctx.fill()

    // 4. Draw Dotted QR Code onto Canvas
    const qrCanvas = document.createElement('canvas')
    qrCanvas.width = 340
    qrCanvas.height = 340
    const qrCtx = qrCanvas.getContext('2d')
    if (qrCtx) {
      try {
        const qr = QRCode.create(previewTicket.code, { errorCorrectionLevel: 'M' })
        const mSize = qr.modules.size
        const cell = 340 / mSize

        qrCtx.fillStyle = '#0f172a'

        const isFinder = (r: number, c: number) =>
          (r < 7 && c < 7) || (r < 7 && c >= mSize - 7) || (r >= mSize - 7 && c < 7)

        for (let r = 0; r < mSize; r++) {
          for (let c = 0; c < mSize; c++) {
            if (isFinder(r, c)) continue
            if (qr.modules.get(r, c)) {
              qrCtx.beginPath()
              qrCtx.arc((c + 0.5) * cell, (r + 0.5) * cell, cell * 0.42, 0, Math.PI * 2)
              qrCtx.fill()
            }
          }
        }

        const drawFinder = (startRow: number, startCol: number) => {
          const x = startCol * cell
          const y = startRow * cell
          const outerDim = 7 * cell
          qrCtx.lineWidth = cell * 0.9
          qrCtx.strokeStyle = '#0f172a'
          const strokeOffset = qrCtx.lineWidth / 2
          qrCtx.beginPath()
          qrCtx.roundRect(x + strokeOffset, y + strokeOffset, outerDim - qrCtx.lineWidth, outerDim - qrCtx.lineWidth, cell * 1.8)
          qrCtx.stroke()

          qrCtx.beginPath()
          qrCtx.arc(x + outerDim / 2, y + outerDim / 2, cell * 1.35, 0, Math.PI * 2)
          qrCtx.fill()
        }

        drawFinder(0, 0)
        drawFinder(0, mSize - 7)
        drawFinder(mSize - 7, 0)
      } catch (e) {
        console.error(e)
      }
    }

    ctx.drawImage(qrCanvas, qrCardX + 40, qrCardY + 40, 340, 340)

    // 5. Draw Ticket Name
    ctx.textAlign = 'center'
    ctx.fillStyle = '#ffffff'
    ctx.font = '900 40px sans-serif'
    ctx.fillText(previewTicket.couponName, width / 2, 700)

    // 6. Draw Table
    const tableY = 750
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(80, tableY)
    ctx.lineTo(640, tableY)
    ctx.moveTo(80, tableY + 80)
    ctx.lineTo(640, tableY + 80)
    ctx.stroke()

    ctx.font = '24px sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.textAlign = 'left'
    ctx.fillText('Cupón', 100, tableY + 30)
    ctx.textAlign = 'right'
    ctx.fillText('Cant.', 620, tableY + 30)

    ctx.font = '900 32px sans-serif'
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'left'
    ctx.fillText(previewTicket.couponName, 100, tableY + 68)

    ctx.fillStyle = '#ff4d4d'
    ctx.textAlign = 'right'
    ctx.fillText(String(previewTicket.quantity), 620, tableY + 68)

    // 7. Draw Valid Schedule & Seller Name
    ctx.textAlign = 'center'
    ctx.fillStyle = '#ffffff'
    ctx.font = '24px sans-serif'
    ctx.fillText(previewTicket.schedule, width / 2, 890)

    ctx.font = '900 32px sans-serif'
    ctx.fillText(`VENDEDOR: ${currentUser?.name || 'Alinne'}`, width / 2, 950)

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png')
    })
  }

  async function handleShare() {
    if (!previewTicket) return
    try {
      const blob = await generateCouponPng()
      if (!blob) return

      const file = new File([blob], 'cupon-invitacion.png', { type: 'image/png' })

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'Cupón de Invitación',
          text: `Cupón ${previewTicket.couponName} - ${businessName}`,
          files: [file]
        })
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'cupon-invitacion.png'
        a.click()
        URL.revokeObjectURL(url)
        alert('¡Imagen del cupón descargada para compartir!')
      }
    } catch (err) {
      console.error('Error al compartir imagen:', err)
    }
  }

  return (
    <div className="role-screen" style={{ minHeight: '100dvh', background: '#f5f7fa', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header className="role-header" style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', background: '#fff', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="back-link" style={{ border: 0, background: 'transparent', cursor: 'pointer', fontSize: 26, color: '#2563eb' }} onClick={() => navigate('/seleccionar-rol')}>‹</button>
          <strong style={{ fontSize: 18, color: '#1e3a8a', fontWeight: 800 }}>{businessName}</strong>
          <div style={{ display: 'flex', gap: 6, marginLeft: 4 }}>
            <span style={{ width: 28, height: 28, borderRadius: '50%', background: '#eff6ff', color: '#3b82f6', display: 'grid', placeItems: 'center', fontSize: 13 }}>ⓘ</span>
            <span style={{ width: 28, height: 28, borderRadius: '50%', background: '#eff6ff', color: '#3b82f6', display: 'grid', placeItems: 'center', fontSize: 13 }}>↺</span>
            <span style={{ width: 28, height: 28, borderRadius: '50%', background: '#eff6ff', color: '#3b82f6', display: 'grid', placeItems: 'center', fontSize: 13 }}>⌁</span>
            <span style={{ width: 28, height: 28, borderRadius: '50%', background: '#eff6ff', color: '#3b82f6', display: 'grid', placeItems: 'center', fontSize: 13 }}>➦</span>
          </div>
        </div>
        <img src={logo} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '1px solid #cbd5e1' }} />
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, width: 'min(480px, calc(100% - 24px))', margin: '20px auto 40px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="role-card" style={{ padding: 18, background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(15,23,52,0.03)' }}>
          {/* Active Event Schedule Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: 12, marginBottom: 12 }}>
            <strong style={{ fontSize: 15, color: '#1e293b', fontWeight: 800 }}>
              Sábado 19/09 Ex Disp 10 de 10
            </strong>
            <span style={{ color: '#64748b', fontSize: 14 }}>⌃</span>
          </div>

          {/* Coupon List */}
          <div className="stack" style={{ gap: 12 }}>
            {couponsToDisplay.map((coupon) => {
              const isSelected = selectedCouponId === coupon.id
              const count = counts[coupon.id] ?? 0
              return (
                <div
                  key={coupon.id}
                  onClick={() => setSelectedCouponId(coupon.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: isSelected ? '2px solid #1e3a8a' : '1px solid #f1f5f9',
                    background: isSelected ? '#f0f7ff' : '#fafafa',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 24, color: '#3b82f6' }}>▱</span>
                    <div>
                      <small style={{ color: '#64748b', fontSize: 10, display: 'block' }}>{(coupon as any).schedule || 'Del 19/09 23:59 al 20/09 04:00'}</small>
                      <strong style={{ fontSize: 14, color: '#0f172a', display: 'block', margin: '2px 0' }}>{coupon.name}</strong>
                      <small style={{ color: '#94a3b8', fontSize: 10, display: 'block' }}>{(coupon as any).available ?? 200} disp.</small>
                    </div>
                  </div>

                  {/* Stepper (+ / -) Box */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      background: '#1e3a8a',
                      color: '#fff',
                      padding: '4px 8px',
                      borderRadius: 10
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => updateCount(coupon.id, -1)}
                      style={{ border: 0, background: 'transparent', color: '#fff', fontSize: 16, fontWeight: 800, cursor: 'pointer', padding: '0 4px' }}
                    >
                      -
                    </button>
                    <strong style={{ fontSize: 14, minWidth: 16, textAlign: 'center' }}>{count}</strong>
                    <button
                      type="button"
                      onClick={() => updateCount(coupon.id, 1)}
                      style={{ border: 0, background: 'transparent', color: '#fff', fontSize: 16, fontWeight: 800, cursor: 'pointer', padding: '0 4px' }}
                    >
                      +
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Direct Emit Action Button */}
          <button
            className="btn btn-block"
            type="button"
            disabled={issuing}
            onClick={handleDirectEmit}
            style={{
              marginTop: 20,
              height: 48,
              borderRadius: 12,
              background: '#1e3a8a',
              color: '#fff',
              fontSize: 15,
              fontWeight: 800,
              letterSpacing: '0.04em',
              border: 0,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(30,58,138,0.2)'
            }}
          >
            {issuing ? 'GENERANDO CUPÓN...' : 'EMITIR CUPÓN'}
          </button>
        </div>
      </main>

      {/* Modal Previsualización de Cupón QR Estilo Imagen 2 & 3 */}
      {previewTicket && (
        <div className="qr-preview-backdrop" style={{ position: 'fixed', inset: 0, zIndex: 110, background: 'rgba(15,23,42,0.85)', display: 'grid', placeItems: 'center', padding: 16, overflowY: 'auto' }}>
          <div style={{ width: 'min(360px, 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            {/* Card con Fondo de Imagen */}
            <div
              style={{
                width: '100%',
                minHeight: 520,
                borderRadius: 20,
                backgroundImage: `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.65)), url(${eventBg})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                padding: '24px 20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                color: '#fff',
                boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Encabezado Evento */}
              <div style={{ textAlign: 'center' }}>
                <h2 style={{ fontSize: 22, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                  SÁBADO 19 SEPTIEMBRE
                </h2>
                <strong style={{ fontSize: 26, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', margin: '4px 0 0', textShadow: '0 2px 6px rgba(0,0,0,0.9)' }}>
                  PRE PRIMAVERA
                </strong>
              </div>

              {/* QR Dunteado/Pelotitas Centrado con Marco Blanco Elegante (Imagen 3 Format) */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.92)',
                  borderRadius: 24,
                  padding: 18,
                  width: 210,
                  height: 210,
                  margin: '12px auto',
                  display: 'grid',
                  placeItems: 'center',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
                }}
              >
                <div style={{ width: 174, height: 174 }}>
                  <DottedQrImage value={previewTicket.code} size={174} />
                </div>
              </div>

              {/* Detalle Inferior del Cupón */}
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ fontSize: 20, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 12px', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                  {previewTicket.couponName}
                </h3>

                {/* Tabla de Cupón */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.4)', borderBottom: '1px solid rgba(255,255,255,0.4)', padding: '8px 0', margin: '0 auto 12px', width: '90%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'rgba(255,255,255,0.9)', marginBottom: 4 }}>
                    <span>Cupón</span>
                    <span>Cant.</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 800 }}>
                    <span>{previewTicket.couponName}</span>
                    <span style={{ color: '#ff4d4d' }}>{previewTicket.quantity}</span>
                  </div>
                </div>

                <p style={{ fontSize: 12, margin: '0 0 4px', color: 'rgba(255,255,255,0.9)' }}>
                  {previewTicket.schedule}
                </p>

                <strong style={{ fontSize: 16, fontWeight: 900, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  VENDEDOR: {currentUser?.name || 'Alinne'}
                </strong>
              </div>
            </div>

            {/* Acciones de Cierre y Compartir */}
            <div style={{ display: 'flex', gap: 10, width: '100%' }}>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => setPreviewTicket(null)}
                style={{ flex: 1, height: 44, borderRadius: 12, background: '#fff', color: '#0f172a', fontWeight: 800 }}
              >
                Cerrar
              </button>
              <button
                className="btn btn-primary"
                type="button"
                onClick={handleShare}
                style={{ flex: 1.5, height: 44, borderRadius: 12, background: '#2563eb', color: '#fff', fontWeight: 800, gap: 8 }}
              >
                <span>➦</span> Compartir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
