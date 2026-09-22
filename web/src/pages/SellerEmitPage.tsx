import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { DottedQrImage } from '../components/DottedQrImage'
import QRCode from 'qrcode'

export function SellerEmitPage() {
  const { currentUser, events, qrCatalog, issueTicket } = useApp()
  const navigate = useNavigate()

  const [selectedCouponId, setSelectedCouponId] = useState<string>('')
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [previewTicket, setPreviewTicket] = useState<{ code: string; couponName: string; schedule: string; quantity: number; bgImage: string } | null>(null)
  const [issuing, setIssuing] = useState(false)

  const activeEvent = events.find((e) => e.status === 'activo') || events[0]
  const businessName = localStorage.getItem('qr-pass-line.business-name') || 'Cubano'
  const logo = localStorage.getItem('qr-pass-line.establishment-logo') || '/favicon.svg'
  const couponsToDisplay = qrCatalog.length > 0 ? qrCatalog : [
    { id: '1', name: 'INGRESO GENERAL 2AM', kind: 'consumible', schedule: 'Del 19/09 23:59 al 20/09 02:00', available: 200 },
    { id: '2', name: 'INGRESO S/C 2:30', kind: 'consumible', schedule: 'Del 19/09 23:59 al 20/09 02:29', available: 200 },
    { id: '3', name: 'INGRESO S/C + VIP', kind: 'consumible', schedule: 'Del 19/09 23:59 al 20/09 04:00', available: 200 },
  ]

  const activeCouponId = selectedCouponId || couponsToDisplay[0]?.id || '1'
  const selectedCoupon = couponsToDisplay.find((c) => c.id === activeCouponId) || couponsToDisplay[0]

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
      const count = counts[selectedCoupon.id] || 1
      const ticket = await issueTicket({
        eventId: activeEvent.id,
        kind: 'qr',
        holderName: `Cliente ${currentUser?.name || 'Vendedor'}`,
        dni: ''
      })

      // Strict per-coupon background image resolution
      const couponBg = (selectedCoupon as any)?.backgroundImage || (activeEvent as any)?.backgroundImage || (activeEvent as any)?.imageUrl || localStorage.getItem('qr-pass-line.poster') || ''

      setPreviewTicket({
        code: ticket.code,
        couponName: selectedCoupon.name,
        schedule: (selectedCoupon as any).schedule || 'Del 19/09 23:59 al 20/09 02:00',
        quantity: count > 0 ? count : 1,
        bgImage: couponBg
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

    // 1. Draw Original Bright Background Poster Image (No dark gradient overlay)
    const bgImg = new Image()
    bgImg.crossOrigin = 'anonymous'
    await new Promise((resolve) => {
      bgImg.onload = resolve
      bgImg.onerror = resolve
      bgImg.src = previewTicket.bgImage
    })

    if (bgImg.complete && bgImg.naturalWidth > 0) {
      ctx.drawImage(bgImg, 0, 0, width, height)
    } else {
      ctx.fillStyle = '#0f172a'
      ctx.fillRect(0, 0, width, height)
    }

    // Gentle bottom gradient ONLY behind text for readability
    const bottomGrad = ctx.createLinearGradient(0, height - 360, 0, height)
    bottomGrad.addColorStop(0, 'rgba(0,0,0,0)')
    bottomGrad.addColorStop(0.5, 'rgba(0,0,0,0.65)')
    bottomGrad.addColorStop(1, 'rgba(0,0,0,0.95)')
    ctx.fillStyle = bottomGrad
    ctx.fillRect(0, height - 360, width, 360)

    // 2. Draw Translucent Glass Rounded Card for QR Code (Imagen 1 Blue Box & Imagen 2 Glass Clone)
    const qrCardSize = 350
    const qrCardX = (width - qrCardSize) / 2
    const qrCardY = 310

    ctx.fillStyle = 'rgba(255, 255, 255, 0.78)'
    ctx.beginPath()
    ctx.roundRect(qrCardX, qrCardY, qrCardSize, qrCardSize, 48)
    ctx.fill()

    // 3. Draw Dotted QR Code onto Canvas
    const qrCanvas = document.createElement('canvas')
    qrCanvas.width = 290
    qrCanvas.height = 290
    const qrCtx = qrCanvas.getContext('2d')
    if (qrCtx) {
      try {
        const qr = QRCode.create(previewTicket.code, { errorCorrectionLevel: 'M' })
        const mSize = qr.modules.size
        const cell = 290 / mSize

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
          qrCtx.lineWidth = cell * 0.95
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

    ctx.drawImage(qrCanvas, qrCardX + 30, qrCardY + 30, 290, 290)

    // 4. Draw Table (Imagen 1 & 3 Design - No duplicate text above table)
    const tableY = 740
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

    // 5. Draw Valid Schedule & Seller Name
    ctx.textAlign = 'center'
    ctx.fillStyle = '#ffffff'
    ctx.font = '24px sans-serif'
    ctx.fillText(previewTicket.schedule, width / 2, 895)

    ctx.font = '900 34px sans-serif'
    ctx.fillText(`VENDEDOR: ${currentUser?.name || 'JOSE'}`, width / 2, 955)

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
              const isSelected = activeCouponId === coupon.id
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

      {/* Modal Previsualización de Cupón QR (Exact Blue Box Position Imagen 1 & Glass Clone Imagen 2) */}
      {previewTicket && (
        <div className="qr-preview-backdrop" style={{ position: 'fixed', inset: 0, zIndex: 110, background: 'rgba(15,23,42,0.85)', display: 'grid', placeItems: 'center', padding: 16, overflowY: 'auto' }}>
          <div style={{ width: 'min(360px, 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            {/* Card con Fondo de Imagen Original */}
            <div
              style={{
                width: '100%',
                minHeight: 520,
                borderRadius: 24,
                backgroundImage: `url(${previewTicket.bgImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                padding: '20px 20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                color: '#fff',
                boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Gradient Sombra Suave solo en la base para legibilidad */}
              <div
                style={{
                  position: 'absolute',
                  inset: '240px 0 0 0',
                  background: 'linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,0.88))',
                  pointerEvents: 'none'
                }}
              />

              {/* QR Box En el LUGAR EXACTO del Sector Azul (Imagen 1) y Cristal Translúcido (Imagen 2) */}
              <div
                style={{
                  position: 'relative',
                  zIndex: 2,
                  background: 'rgba(255, 255, 255, 0.78)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  borderRadius: 8,
                  padding: 1,
                  width: 200,
                  height: 180,
                  margin: '155px auto 12px',
                  display: 'grid',
                  placeItems: 'center',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.25)'
                }}
              >
                <div style={{ width: 170, height: 170 }}>
                  <DottedQrImage value={previewTicket.code} size={152} />
                </div>
              </div>

              {/* Detalle Inferior del Cupón (Imagen 1 - Sin texto encimado arriba) */}
              <div style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
                {/* Tabla de Cupón */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.4)', borderBottom: '1px solid rgba(255,255,255,0.4)', padding: '8px 0', margin: '0 auto 10px', width: '92%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'rgba(255,255,255,0.9)', marginBottom: 4 }}>
                    <span>Cupón</span>
                    <span>Cant.</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 800 }}>
                    <span>{previewTicket.couponName}</span>
                    <span style={{ color: '#ff4d4d' }}>{previewTicket.quantity}</span>
                  </div>
                </div>

                <p style={{ fontSize: 12, margin: '0 0 4px', color: 'rgba(255,255,255,0.9)', textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
                  {previewTicket.schedule}
                </p>

                <strong style={{ fontSize: 16, fontWeight: 900, letterSpacing: '0.04em', textTransform: 'uppercase', textShadow: '0 2px 4px rgba(0,0,0,0.9)' }}>
                  VENDEDOR: {currentUser?.name || 'JOSE'}
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
