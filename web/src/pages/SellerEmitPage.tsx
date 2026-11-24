import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp, isEntityForVenue, isMasterAdminEmail } from '../context/AppContext'
import type { TicketItem } from '../types'
import { DottedQrImage, drawDottedQr } from '../components/DottedQrImage'
import { formatCouponSchedule, formatCouponTimeBadge, getCouponBaseDate, parseDMY, SPANISH_DAY_NAMES, isLimitationExpired, isTicketForLimitation } from '../lib/dateUtils'

export function SellerEmitPage() {
  const { currentUser, events, qrCatalog, limitations, tickets, issueTicket, couponTemplate, activeVenue, venues } = useApp()
  const navigate = useNavigate()

  const [selectedCouponId, setSelectedCouponId] = useState<string>('')
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [previewTicket, setPreviewTicket] = useState<{
    code: string
    couponName: string
    schedule: string
    quantity: number
    bgImage: string
    sellerName: string
    items?: TicketItem[]
    menQuantity?: number
    womenQuantity?: number
    isMixed?: boolean
  } | null>(null)
  const [issuing, setIssuing] = useState(false)

  const sellerDisplayName = currentUser?.name || 'JOSE'

  const targetVenueId = activeVenue?.id || currentUser?.venueId
  const venueEvents = events.filter(e => isEntityForVenue(e.venueId, targetVenueId, venues))
  const activeEvent = venueEvents.find((e) => e.status === 'activo') || venueEvents[0]
  const venueQrCatalog = qrCatalog.filter(q => isEntityForVenue(q.venueId, targetVenueId, venues))

  const businessName = activeVenue?.name || 'Local'
  const logo = activeVenue?.logo || '/app-icon.png'

  // Filtrar estrictamente por las limitaciones asignadas a este usuario (sea vendedor o encargado)
  const userLimitations = limitations.filter((l) => l.personId === currentUser?.id)

  const isMasterAdmin =
    isMasterAdminEmail(currentUser?.email) ||
    currentUser?.role === 'admin' ||
    Boolean(currentUser?.roles?.includes('admin'))

  // Solo el superadmin general sin limitaciones específicas mantiene acceso global libre
  const isMasterAdminOnly = isMasterAdmin && userLimitations.length === 0

  // Filtrar solo las limitaciones activas para este evento (que no hayan pasado las 06:00 AM del día siguiente al evento)
  const activeUserLimitations = userLimitations.filter((lim) => !isLimitationExpired(lim))

  const couponsToDisplay = useMemo(() => {
    // Si es superadmin sin limitaciones específicas, acceso global para pruebas
    if (isMasterAdminOnly) {
      if (venueQrCatalog.length > 0) {
        return venueQrCatalog.map((item) => {
          const issuedCount = tickets
            .filter((t) => {
              if (t.issuedBy !== currentUser?.id) return false
              if (t.items && t.items.length > 0) {
                return t.items.some((it) => it.couponId === item.id)
              }
              return t.couponId === item.id
            })
            .reduce((sum, t) => {
              if (t.items && t.items.length > 0) {
                const matched = t.items.find((it) => it.couponId === item.id)
                return sum + (matched ? matched.quantity : 0)
              }
              return sum + (typeof t.quantity === 'number' && t.quantity > 0 ? t.quantity : 1)
            }, 0)

          return {
            id: item.id,
            limitationId: 'unlimited-' + item.id,
            name: item.name || 'INGRESO GENERAL',
            kind: item.kind || 'consumible',
            description: item.description || '',
            period: 'Ilimitado',
            days: item.days,
            from: item.from || '23:59',
            duration: item.duration || '02:00',
            hasGenderSchedules: Boolean(item.hasGenderSchedules),
            menDuration: item.menDuration,
            womenDuration: item.womenDuration,
            scheduleMode: item.scheduleMode,
            schedule: formatCouponSchedule(activeEvent, item),
            available: 9999,
            totalQuota: 9999,
            issuedCount,
            backgroundImage: item.backgroundImage || (item as any)?.bgImage || (activeEvent as any)?.backgroundImage || '',
          }
        })
      } else {
        return [{
          id: 'default-coupon',
          limitationId: 'unlimited-default',
          name: 'INGRESO GENERAL',
          kind: 'consumible' as const,
          description: 'Acceso general',
          period: 'Ilimitado',
          days: undefined,
          from: activeEvent?.doorsOpen || '23:59',
          duration: '02:00',
          hasGenderSchedules: false,
          menDuration: undefined,
          womenDuration: undefined,
          scheduleMode: 'end' as const,
          schedule: `Válido hasta las ${activeEvent?.doorsOpen || '23:59'} hs`,
          available: 9999,
          totalQuota: 9999,
          issuedCount: 0,
          backgroundImage: (activeEvent as any)?.backgroundImage || (activeEvent as any)?.imageUrl || '',
        }]
      }
    }

    // Para vendedor normal y encargado: solo cupones y cantidades asignadas que sigan activos
    if (activeUserLimitations.length > 0) {
      return activeUserLimitations.map((lim) => {
        const catalogItem = qrCatalog.find((q) => q.id === lim.couponId)
        // Solo contabilizar los tickets emitidos correspondientes a esta fecha/evento de la limitación
        const issuedCount = tickets
          .filter((t) => {
            if (t.issuedBy !== currentUser?.id) return false
            if (t.items && t.items.length > 0) {
              return t.items.some((it) => it.couponId === lim.couponId) && isTicketForLimitation(t, lim, events, qrCatalog)
            }
            if (t.couponId !== lim.couponId && !(qrCatalog.length === 1 && !t.couponId)) return false
            return isTicketForLimitation(t, lim, events, qrCatalog)
          })
          .reduce((sum, t) => {
            if (t.items && t.items.length > 0) {
              const matched = t.items.find((it) => it.couponId === lim.couponId)
              return sum + (matched ? matched.quantity : 0)
            }
            return sum + (typeof t.quantity === 'number' && t.quantity > 0 ? t.quantity : 1)
          }, 0)

        const totalQuota = Number(lim.quantity) || 0
        const available = Math.max(0, totalQuota - issuedCount)
        const couponDays = (catalogItem?.days && catalogItem.days.length > 0) ? catalogItem.days : lim.days
        const couponSchedule = formatCouponSchedule(activeEvent, {
          ...catalogItem,
          period: lim.period,
          days: couponDays,
        })
        return {
          id: lim.couponId,
          limitationId: lim.id,
          name: catalogItem?.name || 'INGRESO GENERAL',
          kind: catalogItem?.kind || 'consumible',
          description: catalogItem?.description || '',
          period: lim.period,
          days: couponDays,
          from: catalogItem?.from || '23:59',
          duration: catalogItem?.duration || '02:00',
          hasGenderSchedules: Boolean(catalogItem?.hasGenderSchedules),
          menDuration: catalogItem?.menDuration,
          womenDuration: catalogItem?.womenDuration,
          scheduleMode: catalogItem?.scheduleMode,
          schedule: couponSchedule,
          available,
          totalQuota,
          issuedCount,
          backgroundImage: catalogItem?.backgroundImage || (catalogItem as any)?.bgImage,
        }
      })
    }

    // Sin limitaciones activas asignadas para esta fecha (arranca la semana en limpio en 0)
    return []
  }, [isMasterAdminOnly, activeUserLimitations, qrCatalog, tickets, currentUser, activeEvent, events, venueQrCatalog])

  const totalSelectedCount = useMemo(() => {
    return couponsToDisplay.reduce((sum, c) => sum + (counts[c.id] || 0), 0)
  }, [couponsToDisplay, counts])

  const activeCouponId = selectedCouponId || couponsToDisplay[0]?.id || ''
  const selectedCoupon = couponsToDisplay.find((c) => c.id === activeCouponId) || couponsToDisplay[0]

  // Calcular la fecha y cabecera del evento según el cupón seleccionado o evento activo
  const targetHeaderDate = useMemo(() => {
    if (selectedCoupon) {
      return getCouponBaseDate(activeEvent, selectedCoupon)
    }
    if (activeEvent?.date) {
      return parseDMY(activeEvent.date) || new Date()
    }
    return new Date()
  }, [selectedCoupon, activeEvent])

  const headerTitle = useMemo(() => {
    const dayName = SPANISH_DAY_NAMES[targetHeaderDate.getDay()]
    const dayNum = targetHeaderDate.getDate()
    const y = targetHeaderDate.getFullYear()
    const m = String(targetHeaderDate.getMonth() + 1).padStart(2, '0')
    const d = String(dayNum).padStart(2, '0')
    return `${dayName} ${dayNum} (${y}-${m}-${d})`
  }, [targetHeaderDate])

  const headerDoorsOpen = selectedCoupon?.from || activeEvent?.doorsOpen || '23:59'

  const savedTemplate = JSON.parse(localStorage.getItem('qr-pass-line.coupon-template') || '{}')
  const template = couponTemplate || (savedTemplate.qrY ? savedTemplate : null)
  const templateBrightness = template?.brightness ?? 1
  const templateShadow = template?.shadow ?? true
  const templateBgZoom = template?.bgZoom ?? 100
  const templateBgPosX = template?.bgPosX ?? 0
  const templateBgPosY = template?.bgPosY ?? 0

  function updateCount(couponId: string, delta: number) {
    const coupon = couponsToDisplay.find((c) => c.id === couponId)
    const maxAvailable = isMasterAdminOnly ? 999 : (coupon?.available ?? 200)
    setCounts((prev) => {
      const current = prev[couponId] ?? 0
      const next = Math.min(maxAvailable, Math.max(0, current + delta))
      return { ...prev, [couponId]: next }
    })
    setSelectedCouponId(couponId)
  }

  async function handleDirectEmit() {
    if (issuing) return

    const selectedItems = couponsToDisplay.filter((c) => (counts[c.id] || 0) > 0)
    if (selectedItems.length === 0) {
      alert('Debes agregar al menos 1 persona con el botón (+) en alguno de los cupones.')
      return
    }

    // Verificar cupos disponibles para cada cupón seleccionado
    for (const item of selectedItems) {
      const qty = counts[item.id] || 0
      if (qty > item.available) {
        alert(`Solo tienes ${item.available} cupones disponibles para ${item.name}.`)
        return
      }
    }

    setIssuing(true)
    try {
      const items: TicketItem[] = selectedItems.map((c) => {
        const item: TicketItem = {
          couponId: c.id,
          couponName: c.name || 'Cupón',
          quantity: counts[c.id] || 1
        }
        if (c.schedule) item.schedule = c.schedule
        if (c.from) item.from = c.from
        if (c.duration) item.duration = c.duration
        if (c.scheduleMode) item.scheduleMode = c.scheduleMode
        if (typeof c.hasGenderSchedules === 'boolean') item.hasGenderSchedules = c.hasGenderSchedules
        if (c.menDuration) item.menDuration = c.menDuration
        if (c.womenDuration) item.womenDuration = c.womenDuration
        return item
      })

      const totalQuantity = items.reduce((sum, it) => sum + it.quantity, 0)

      // Identificar Damas y Caballeros si están presentes
      const menItem = items.find((it) => it.couponName.toLowerCase().includes('caballero') || it.couponName.toLowerCase().includes('hombre'))
      const womenItem = items.find((it) => it.couponName.toLowerCase().includes('dama') || it.couponName.toLowerCase().includes('mujer'))

      // Buscar si existe un evento activo cuya fecha coincida con el día del cupón (ej: Domingo)
      let targetEvent = activeEvent
      const targetBaseDate = getCouponBaseDate(undefined, selectedItems[0])
      const targetDateIso = `${targetBaseDate.getFullYear()}-${String(targetBaseDate.getMonth() + 1).padStart(2, '0')}-${String(targetBaseDate.getDate()).padStart(2, '0')}`

      const matchingEvent = venueEvents.find(
        (e) => e.status === 'activo' && e.date && e.date.startsWith(targetDateIso)
      )
      if (matchingEvent) {
        targetEvent = matchingEvent
      }

      const ticket = await issueTicket({
        eventId: targetEvent?.id || '',
        couponId: selectedItems[0].id,
        kind: 'qr',
        holderName: `Cliente ${currentUser?.name || 'Vendedor'}`,
        dni: '',
        quantity: totalQuantity,
        eventDate: targetDateIso,
        menQuantity: menItem?.quantity,
        womenQuantity: womenItem?.quantity,
        items
      })

      const couponBg = (selectedItems[0] as any)?.backgroundImage || (targetEvent as any)?.backgroundImage || (targetEvent as any)?.imageUrl || ''

      const combinedSchedule = items.length > 1
        ? items.map((it) => `${it.couponName}: ${it.schedule}`).join(' · ')
        : formatCouponSchedule(targetEvent, selectedItems[0])

      const combinedName = items.length > 1
        ? items.map((it) => it.couponName).join(' + ')
        : selectedItems[0].name

      setPreviewTicket({
        code: ticket.code,
        couponName: combinedName,
        schedule: combinedSchedule,
        quantity: totalQuantity,
        bgImage: couponBg,
        sellerName: sellerDisplayName.toUpperCase(),
        items,
        menQuantity: menItem?.quantity,
        womenQuantity: womenItem?.quantity,
        isMixed: items.length > 1
      })

      // Restablecer contadores a 0 tras emitir
      setCounts({})
    } catch (err: any) {
      alert(err?.message || 'Error al emitir cupón.')
    } finally {
      setIssuing(false)
    }
  }

  async function generateCouponPng(): Promise<Blob | null> {
    if (!previewTicket) return null
    const width = 1000
    const height = 1400
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    // 1. Draw Background Poster Image with Admin Brightness, Zoom and Position
    const bgImg = new Image()
    bgImg.crossOrigin = 'anonymous'
    await new Promise((resolve) => {
      bgImg.onload = resolve
      bgImg.onerror = resolve
      bgImg.src = previewTicket.bgImage
    })

    if (bgImg.complete && bgImg.naturalWidth > 0) {
      const scale = (templateBgZoom || 100) / 100
      const posX = (templateBgPosX || 0) * (width / 360)
      const posY = (templateBgPosY || 0) * (height / 504)

      const imgRatio = bgImg.naturalWidth / bgImg.naturalHeight
      const canvasRatio = width / height
      let drawW = width
      let drawH = height

      if (imgRatio > canvasRatio) {
        drawH = height
        drawW = height * imgRatio
      } else {
        drawW = width
        drawH = width / imgRatio
      }

      ctx.save()
      ctx.filter = `brightness(${templateBrightness})`
      ctx.translate(width / 2, height / 2)
      ctx.scale(scale, scale)
      ctx.translate(posX, posY)
      ctx.drawImage(bgImg, -drawW / 2, -drawH / 2, drawW, drawH)
      ctx.restore()
    } else {
      ctx.fillStyle = '#0f172a'
      ctx.fillRect(0, 0, width, height)
    }

    // 2. Draw Translucent Glass Rounded Card for QR Code (500x500 at x=250, y=450)
    const qrSize = 500
    const qrCardX = (width - qrSize) / 2
    const qrCardY = 450
    const qrRadius = 48

    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)'
    ctx.beginPath()
    ctx.roundRect(qrCardX, qrCardY, qrSize, qrSize, qrRadius)
    ctx.fill()

    // Corner brackets decoration
    ctx.strokeStyle = 'rgba(95, 68, 145, 0.7)'
    ctx.lineWidth = 3
    const bracketLen = 36
    ctx.beginPath()
    // Top-left
    ctx.moveTo(qrCardX + 24, qrCardY + 12)
    ctx.lineTo(qrCardX + 24 + bracketLen, qrCardY + 12)
    ctx.moveTo(qrCardX + 12, qrCardY + 24)
    ctx.lineTo(qrCardX + 12, qrCardY + 24 + bracketLen)
    // Top-right
    ctx.moveTo(qrCardX + qrSize - 24 - bracketLen, qrCardY + 12)
    ctx.lineTo(qrCardX + qrSize - 24, qrCardY + 12)
    ctx.moveTo(qrCardX + qrSize - 12, qrCardY + 24)
    ctx.lineTo(qrCardX + qrSize - 12, qrCardY + 24 + bracketLen)
    // Bottom-left
    ctx.moveTo(qrCardX + 24, qrCardY + qrSize - 12)
    ctx.lineTo(qrCardX + 24 + bracketLen, qrCardY + qrSize - 12)
    ctx.moveTo(qrCardX + 12, qrCardY + qrSize - 24 - bracketLen)
    ctx.lineTo(qrCardX + 12, qrCardY + qrSize - 24)
    // Bottom-right
    ctx.moveTo(qrCardX + qrSize - 24 - bracketLen, qrCardY + qrSize - 12)
    ctx.lineTo(qrCardX + qrSize - 24, qrCardY + qrSize - 12)
    ctx.moveTo(qrCardX + qrSize - 12, qrCardY + qrSize - 24 - bracketLen)
    ctx.lineTo(qrCardX + qrSize - 12, qrCardY + qrSize - 24)
    ctx.stroke()

    // 3. Draw Dotted QR Code onto Canvas (410x410)
    const innerQrSize = 410
    const qrPadding = (qrSize - innerQrSize) / 2
    const qrCanvas = document.createElement('canvas')
    qrCanvas.width = innerQrSize
    qrCanvas.height = innerQrSize
    const qrCtx = qrCanvas.getContext('2d')
    if (qrCtx) {
      drawDottedQr(qrCtx, previewTicket.code, innerQrSize)
    }
    ctx.drawImage(qrCanvas, qrCardX + qrPadding, qrCardY + qrPadding, innerQrSize, innerQrSize)

    // 4. Draw Bottom Card: 875w x 370h at x=125, y=1030
    const cardX = 125
    const cardY = 1030
    const cardW = 875
    const cardH = 370

    // Fondo oscuro translúcido con desenfoque de vidrio (sin color rosado)
    ctx.fillStyle = 'rgba(10, 8, 16, 0.82)'
    ctx.beginPath()
    ctx.roundRect(cardX, cardY, cardW, cardH, [24, 0, 0, 0])
    ctx.fill()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)'
    ctx.lineWidth = 1.5
    ctx.stroke()

    // Lateral strip for QRPASSLINE: width = 125px (x from 875 to 1000)
    const stripW = 125
    const tableRight = width - stripW
    const tableLeft = cardX + 30

    // Vertical divider before lateral strip
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(tableRight, cardY + 16)
    ctx.lineTo(tableRight, height - 16)
    ctx.stroke()

    // Vertical QRPASSLINE in ALL CAPS reading bottom-to-top
    ctx.save()
    ctx.translate(tableRight + stripW / 2, cardY + cardH / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.font = '900 56px Impact, sans-serif'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('QRPASSLINE', 0, 0)
    ctx.restore()

    // Table Content (100% dinámico)
    const itemsToDraw = previewTicket.items && previewTicket.items.length > 0
      ? previewTicket.items
      : [{ couponName: previewTicket.couponName, quantity: previewTicket.quantity, schedule: previewTicket.schedule }]

    const tblTopY = cardY + 36
    const dividerX = tableRight - 120

    // Header: Cupón & Cant.
    ctx.font = '22px sans-serif'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'bottom'
    ctx.fillText('Cupón', tableLeft + 10, tblTopY - 10)
    ctx.textAlign = 'center'
    ctx.fillText('Cant.', (dividerX + tableRight) / 2, tblTopY - 10)

    // Lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(tableLeft, tblTopY)
    ctx.lineTo(tableRight - 10, tblTopY)
    ctx.stroke()

    // Dynamic item rows
    const rowHeight = 44
    let currentY = tblTopY
    itemsToDraw.forEach((it) => {
      const rowY = currentY + 30
      ctx.font = '900 24px sans-serif'
      ctx.fillStyle = '#ffffff'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(it.couponName, tableLeft + 10, rowY)

      ctx.fillStyle = '#ff4d4d'
      ctx.textAlign = 'center'
      ctx.fillText(String(it.quantity), (dividerX + tableRight) / 2, rowY)

      const timeBadge = formatCouponTimeBadge(it)
      if (timeBadge) {
        ctx.font = '600 17px sans-serif'
        ctx.fillStyle = '#cbd5e1'
        ctx.textAlign = 'left'
        ctx.fillText(`🕒 ${timeBadge}`, tableLeft + 10, rowY + 22)
        currentY += rowHeight + 14
      } else {
        currentY += rowHeight
      }
    })

    const tblBotY = currentY + 8
    // Bottom line & vertical divider line
    ctx.beginPath()
    ctx.moveTo(tableLeft, tblBotY)
    ctx.lineTo(tableRight - 10, tblBotY)
    ctx.moveTo(dividerX, tblTopY)
    ctx.lineTo(dividerX, tblBotY)
    ctx.stroke()

    // Footer Seller Name
    ctx.textAlign = 'center'
    ctx.fillStyle = '#ffffff'
    ctx.font = '900 28px sans-serif'
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)'
    ctx.shadowBlur = 8
    ctx.fillText(`RR.PP: ${previewTicket.sellerName || 'JOSE'}`, (tableLeft + tableRight) / 2, tblBotY + 44)
    ctx.shadowBlur = 0

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
            <button type="button" onClick={() => window.location.reload()} title="Recargar datos" style={{ width: 28, height: 28, borderRadius: '50%', background: '#eff6ff', color: '#3b82f6', border: 'none', display: 'grid', placeItems: 'center', fontSize: 13, cursor: 'pointer', padding: 0 }}>↺</button>
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
              {headerTitle}
            </strong>
            <span style={{ color: '#64748b', fontSize: 13, fontWeight: 700 }}>Apertura: {headerDoorsOpen}</span>
          </div>

          {/* Coupon List or Empty State */}
          {couponsToDisplay.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 16px', color: '#64748b' }}>
              <div style={{ fontSize: 38, marginBottom: 12 }}>🔒</div>
              <strong style={{ fontSize: 16, color: '#1e293b', display: 'block', marginBottom: 8 }}>
                Sin cupones habilitados en {businessName}
              </strong>
              <p style={{ fontSize: 13, lineHeight: 1.5, margin: 0 }}>
                No tenés limitaciones o cupones habilitados para emitir en este momento. Creá cupones en el menú <strong>QRs</strong> y asigná límites a los vendedores en <strong>Vendedores</strong> para comenzar a emitir.
              </p>
            </div>
          ) : (
            <div className="stack" style={{ gap: 12 }}>
              {couponsToDisplay.map((coupon) => {
                const count = counts[coupon.id] ?? 0
                const formattedSchedule = formatCouponSchedule(activeEvent, coupon)
                const isExhausted = coupon.available <= 0
                const hasSelected = count > 0

                return (
                  <div
                    key={coupon.id}
                    onClick={() => !isExhausted && setSelectedCouponId(coupon.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: 12,
                      border: hasSelected ? '2px solid #1e3a8a' : '1px solid #f1f5f9',
                      background: isExhausted ? '#f8fafc' : hasSelected ? '#f0f7ff' : '#fafafa',
                      opacity: isExhausted ? 0.6 : 1,
                      cursor: isExhausted ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 24, color: isExhausted ? '#94a3b8' : hasSelected ? '#1e3a8a' : '#3b82f6' }}>▱</span>
                      <div>
                        <small style={{ color: '#64748b', fontSize: 10, display: 'block' }}>{formattedSchedule}</small>
                        <strong style={{ fontSize: 14, color: '#0f172a', display: 'block', margin: '2px 0' }}>{coupon.name}</strong>
                        <small style={{ color: isExhausted ? '#ef4444' : '#64748b', fontSize: 11, display: 'block', fontWeight: 600 }}>
                          {isExhausted ? 'Agotado (0 disp.)' : isMasterAdminOnly ? 'Ilimitado (Admin)' : `${coupon.available} disp. / ${coupon.totalQuota || coupon.available} total`}
                        </small>
                      </div>
                    </div>

                    {/* Stepper (+ / -) Box */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        background: isExhausted ? '#94a3b8' : hasSelected ? '#1e3a8a' : '#1e3a8a',
                        color: '#fff',
                        padding: '4px 8px',
                        borderRadius: 10
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        disabled={isExhausted || count <= 0}
                        onClick={() => updateCount(coupon.id, -1)}
                        style={{
                          border: 0,
                          background: 'transparent',
                          color: '#fff',
                          fontSize: 16,
                          fontWeight: 800,
                          cursor: (isExhausted || count <= 0) ? 'not-allowed' : 'pointer',
                          padding: '0 4px',
                          opacity: count <= 0 ? 0.4 : 1
                        }}
                      >
                        -
                      </button>
                      <strong style={{ fontSize: 14, minWidth: 16, textAlign: 'center' }}>{count}</strong>
                      <button
                        type="button"
                        disabled={isExhausted || count >= coupon.available}
                        onClick={() => updateCount(coupon.id, 1)}
                        style={{
                          border: 0,
                          background: 'transparent',
                          color: '#fff',
                          fontSize: 16,
                          fontWeight: 800,
                          cursor: (isExhausted || count >= coupon.available) ? 'not-allowed' : 'pointer',
                          padding: '0 4px',
                          opacity: (isExhausted || count >= coupon.available) ? 0.4 : 1
                        }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Direct Emit Action Button */}
          {couponsToDisplay.length > 0 && (
            <button
              className="btn btn-block"
              type="button"
              disabled={issuing || totalSelectedCount <= 0}
              onClick={handleDirectEmit}
              style={{
                marginTop: 20,
                height: 48,
                borderRadius: 12,
                background: totalSelectedCount <= 0 ? '#94a3b8' : '#1e3a8a',
                color: '#fff',
                fontSize: 15,
                fontWeight: 800,
                letterSpacing: '0.04em',
                border: 0,
                cursor: totalSelectedCount <= 0 ? 'not-allowed' : 'pointer',
                boxShadow: totalSelectedCount <= 0 ? 'none' : '0 4px 12px rgba(30,58,138,0.2)'
              }}
            >
              {issuing
                ? 'GENERANDO CUPÓN...'
                : totalSelectedCount <= 0
                  ? 'SELECCIONÁ CANTIDAD (+)'
                  : totalSelectedCount === 1
                    ? 'EMITIR CUPÓN (1 PERSONA)'
                    : `EMITIR CUPÓN (${totalSelectedCount} PERSONAS)`}
            </button>
          )}
        </div>
      </main>

      {/* Modal Previsualización de Cupón QR (Sincronizado 100% con Admin Template Config) */}
      {previewTicket && (
        <div className="qr-preview-backdrop" style={{ position: 'fixed', inset: 0, zIndex: 110, background: 'rgba(15,23,42,0.85)', display: 'grid', placeItems: 'center', padding: 16, overflowY: 'auto' }}>
          <div style={{ width: 'min(360px, 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            {/* Resumen Superior de Cupones Emitidos (Foto 2) */}
            {previewTicket.items && previewTicket.items.length > 1 && (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6, background: '#ffffff', borderRadius: 14, padding: '10px 14px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                {previewTicket.items.map((it, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: idx < (previewTicket.items?.length || 0) - 1 ? '1px solid #f1f5f9' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16 }}>🎟️</span>
                      <div>
                        <small style={{ fontSize: 10, color: '#64748b', display: 'block' }}>{it.schedule}</small>
                        <strong style={{ fontSize: 13, color: '#0f172a' }}>{it.couponName}</strong>
                      </div>
                    </div>
                    <strong style={{ fontSize: 15, color: '#1e3a8a' }}>{it.quantity}</strong>
                  </div>
                ))}
              </div>
            )}

            {/* Botón de Compartir Superior / Acción Directa */}
            <div style={{ display: 'flex', gap: 10, width: '100%' }}>
              <button
                className="btn btn-primary"
                type="button"
                onClick={handleShare}
                style={{ flex: 1, height: 44, borderRadius: 12, background: '#1e3a8a', color: '#fff', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                <span>➦</span> Enviar QR
              </button>
            </div>

            {/* Card con Fondo de Imagen (Proporción exacta 1000x1400 -> 360x504) */}
            <div
              style={{
                width: 360,
                height: 504,
                borderRadius: 24,
                color: '#fff',
                boxShadow: templateShadow ? '0 20px 40px rgba(0,0,0,0.5)' : 'none',
                position: 'relative',
                overflow: 'hidden',
                background: '#0f172a'
              }}
            >
              {/* Background Layer with Zoom and Position Transform */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  overflow: 'hidden',
                  zIndex: 0,
                }}
              >
                <img
                  src={previewTicket.bgImage}
                  alt="Afiche"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: `scale(${(templateBgZoom || 100) / 100}) translate(${templateBgPosX || 0}px, ${templateBgPosY || 0}px)`,
                    transformOrigin: 'center center',
                    filter: `brightness(${templateBrightness})`,
                    pointerEvents: 'none'
                  }}
                />
              </div>

              {/* QR Box: 500x500 centrado a 450px de altura (en escala 360x504 = 180x180 a 162px de top) */}
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  top: '162px',
                  width: '180px',
                  height: '180px',
                  borderRadius: '18px',
                  background: 'rgba(255, 255, 255, 0.92)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  padding: 12,
                  display: 'grid',
                  placeItems: 'center',
                  zIndex: 2,
                  boxShadow: templateShadow ? '0 8px 32px rgba(0,0,0,0.25)' : 'none'
                }}
              >
                <div style={{ width: 156, height: 156 }}>
                  <DottedQrImage value={previewTicket.code} size={156} />
                </div>
              </div>

              {/* Tarjeta Inferior: 875x370 (en escala = margen izq 45px, alto 133px al fondo) */}
              <div
                style={{
                  position: 'absolute',
                  left: '45px',
                  right: 0,
                  bottom: 0,
                  height: '133px',
                  background: 'rgba(10, 8, 16, 0.82)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  borderTopLeftRadius: '14px',
                  border: '1px solid rgba(255, 255, 255, 0.18)',
                  borderRight: 0,
                  borderBottom: 0,
                  zIndex: 2,
                  display: 'flex',
                  color: '#ffffff',
                  overflow: 'hidden'
                }}
              >
                {/* Zona Principal de Tabla de Cupones */}
                <div style={{ flex: 1, padding: '8px 12px 6px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  {/* Encabezado */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 800, paddingBottom: 2, borderBottom: '1px solid rgba(255, 255, 255, 0.25)', color: 'rgba(255, 255, 255, 0.75)' }}>
                      <span>Cupón</span>
                      <span style={{ minWidth: 28, textAlign: 'center', borderLeft: '1px solid rgba(255, 255, 255, 0.25)', paddingLeft: 4 }}>Cant.</span>
                    </div>
                    {/* Filas */}
                    <div style={{ maxHeight: 52, overflowY: 'auto' }}>
                      {previewTicket.items && previewTicket.items.length > 0 ? (
                        previewTicket.items.map((it, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10.5, fontWeight: 800, padding: '2px 0' }}>
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#ffffff' }}>{it.couponName}</span>
                            <span style={{ minWidth: 28, textAlign: 'center', borderLeft: '1px solid rgba(255, 255, 255, 0.25)', paddingLeft: 4, color: '#ff4d4d' }}>{it.quantity}</span>
                          </div>
                        ))
                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10.5, fontWeight: 800, padding: '2px 0' }}>
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#ffffff' }}>{previewTicket.couponName}</span>
                          <span style={{ minWidth: 28, textAlign: 'center', borderLeft: '1px solid rgba(255, 255, 255, 0.25)', paddingLeft: 4, color: '#ff4d4d' }}>{previewTicket.quantity}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Pie de tabla: Horario y Vendedor */}
                  <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.25)', paddingTop: 2, textAlign: 'center' }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(203, 213, 225, 0.9)' }}>
                      {previewTicket.schedule || previewTicket.items?.[0]?.schedule || ''}
                    </div>
                    <strong style={{ fontSize: 9.5, fontWeight: 900, textTransform: 'uppercase', color: '#ffffff', letterSpacing: '0.04em' }}>
                      RR.PP: {previewTicket.sellerName || 'JOSE'}
                    </strong>
                  </div>
                </div>

                {/* Franja Lateral Derecha con QRPASSLINE de abajo hacia arriba */}
                <div
                  style={{
                    width: '45px',
                    borderLeft: '1px solid rgba(255, 255, 255, 0.22)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(0, 0, 0, 0.25)'
                  }}
                >
                  <span
                    style={{
                      writingMode: 'vertical-rl',
                      transform: 'rotate(180deg)',
                      fontFamily: 'Impact, sans-serif',
                      fontSize: 18,
                      color: 'rgba(255, 255, 255, 0.85)',
                      letterSpacing: '0.08em',
                      userSelect: 'none'
                    }}
                  >
                    QRPASSLINE
                  </span>
                </div>
              </div>
            </div>

            {/* Acción de Cierre */}
            <div style={{ display: 'flex', gap: 10, width: '100%' }}>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => setPreviewTicket(null)}
                style={{ flex: 1, height: 44, borderRadius: 12, background: '#fff', color: '#0f172a', fontWeight: 800 }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
