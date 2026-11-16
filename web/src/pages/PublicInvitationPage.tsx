import { useEffect, useState, useMemo } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  query,
  where,
} from 'firebase/firestore'
import { signInAnonymously } from 'firebase/auth'
import { auth, db } from '../lib/firebase'
import { useApp } from '../context/AppContext'
import { ticketCode } from '../lib/ids'
import { DottedQrImage, drawDottedQr } from '../components/DottedQrImage'
import type { ClubEvent, Ticket, TicketItem, Limitation, QrCatalogItem, User, Venue } from '../types'

function getWeekendDates(baseEvent?: ClubEvent | null, customDateIso?: string | null) {
  const now = new Date()
  let baseDate: Date = now

  const dateToUse = customDateIso || baseEvent?.date
  if (dateToUse) {
    const cleanDate = dateToUse.includes('T') ? dateToUse.split('T')[0] : dateToUse
    const parts = cleanDate.split('-')
    if (parts.length === 3) {
      baseDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 12, 0, 0)
    } else {
      const evDate = new Date(dateToUse)
      if (!isNaN(evDate.getTime())) baseDate = evDate
    }
  }

  const day = baseDate.getDay() // 0 = Domingo, 6 = Sábado
  let satDate = new Date(baseDate)
  let sunDate = new Date(baseDate)

  if (day === 6) {
    satDate = new Date(baseDate)
    sunDate = new Date(baseDate)
    sunDate.setDate(sunDate.getDate() + 1)
  } else if (day === 0) {
    sunDate = new Date(baseDate)
    satDate = new Date(baseDate)
    satDate.setDate(satDate.getDate() - 1)
  } else {
    const daysUntilSat = (6 - day + 7) % 7
    satDate = new Date(baseDate)
    satDate.setDate(satDate.getDate() + daysUntilSat)
    sunDate = new Date(satDate)
    sunDate.setDate(sunDate.getDate() + 1)
  }

  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  const satStr = `Sábado ${satDate.getDate()} ${months[satDate.getMonth()]}`
  const sunStr = `Domingo ${sunDate.getDate()} ${months[sunDate.getMonth()]}`
  const satIso = `${satDate.getFullYear()}-${String(satDate.getMonth() + 1).padStart(2, '0')}-${String(satDate.getDate()).padStart(2, '0')}`
  const sunIso = `${sunDate.getFullYear()}-${String(sunDate.getMonth() + 1).padStart(2, '0')}-${String(sunDate.getDate()).padStart(2, '0')}`

  return { satStr, sunStr, satIso, sunIso }
}

function formatEventDay(dateStr?: string) {
  if (!dateStr) return { dayName: 'Día del Evento', formattedStr: 'Fecha confirmada', iso: new Date().toISOString().split('T')[0] }
  
  // Extraer año, mes, día numéricamente para evitar desfases de zona horaria
  const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr
  const parts = cleanDate.split('-')
  let d: Date
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10)
    const m = parseInt(parts[1], 10) - 1
    const day = parseInt(parts[2], 10)
    d = new Date(y, m, day, 12, 0, 0)
  } else {
    d = new Date(dateStr)
  }

  if (isNaN(d.getTime())) return { dayName: 'Día del Evento', formattedStr: dateStr, iso: cleanDate }
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  const dayName = days[d.getDay()]
  const formattedStr = `${dayName} ${d.getDate()} ${months[d.getMonth()]}`
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return { dayName, formattedStr, iso }
}

export function PublicInvitationPage() {
  const { eventId: urlEventId } = useParams<{ eventId?: string }>()
  const [searchParams] = useSearchParams()
  const urlCouponId = searchParams.get('coupon') || searchParams.get('couponId') || searchParams.get('tipo')

  // URL parameters for flexible configuration
  const paramDateMode = searchParams.get('dias') === 'simple' ? 'simple' : 'doble'
  const paramAllowBothDays = searchParams.get('ambos') !== '0'
  const paramSingleDay = (searchParams.get('dia') || 'sabado') as 'sabado' | 'domingo' | 'evento'
  const paramFecha = searchParams.get('fecha') || ''
  const parsedMax = parseInt(searchParams.get('max') || '6', 10)
  const maxAllowedPersons = isNaN(parsedMax) ? 6 : Math.max(1, Math.min(6, parsedMax))

  const appContext = useApp()

  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [event, setEvent] = useState<ClubEvent | null>(null)
  const [venue, setVenue] = useState<Venue | null>(null)
  const [coupon, setCoupon] = useState<QrCatalogItem | null>(null)
  const [anibalUser, setAnibalUser] = useState<User | null>(null)
  const [limitation, setLimitation] = useState<Limitation | null>(null)
  const [availableQuota, setAvailableQuota] = useState<number>(2000)

  // Form states: Full Name, Phone, Date Option ('sabado' | 'domingo' | 'ambos' | 'evento'), Quantity
  const [holderName, setHolderName] = useState('')
  const [phone, setPhone] = useState('')
  const [dateOption, setDateOption] = useState<'sabado' | 'domingo' | 'ambos' | 'evento'>(() => {
    if (paramDateMode === 'simple') return paramSingleDay
    return 'sabado'
  })
  const [quantity, setQuantity] = useState<number>(1)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  // Sincronizar fecha si cambia el parámetro de URL
  useEffect(() => {
    if (paramDateMode === 'simple') {
      setDateOption(paramSingleDay)
    }
  }, [paramDateMode, paramSingleDay])

  // Generated tickets list (supports 1 ticket for single day or 2 tickets for Ambos Días)
  const [generatedTickets, setGeneratedTickets] = useState<Ticket[]>([])
  const [activeTicketIdx, setActiveTicketIdx] = useState<number>(0)
  const [isExistingPass, setIsExistingPass] = useState(false)
  const [downloading, setDownloading] = useState(false)

  // Configuration of coupon template (matching SellerEmitPage)
  const couponTemplate = appContext?.couponTemplate || venue?.couponTemplate
  const templateQrY = couponTemplate?.qrY ?? 180
  const templateQrSize = couponTemplate?.qrSize ?? 180
  const templateQrRadius = couponTemplate?.qrRadius ?? 24
  const templateBrightness = couponTemplate?.brightness ?? 0.75
  const templateBgZoom = couponTemplate?.bgZoom ?? 100
  const templateBgPosX = couponTemplate?.bgPosX ?? 0
  const templateBgPosY = couponTemplate?.bgPosY ?? 0
  const templateShadow = couponTemplate?.shadow ?? true

  const weekend = useMemo(() => getWeekendDates(event, paramFecha), [event, paramFecha])
  const eventDay = useMemo(() => formatEventDay(paramFecha || event?.date), [paramFecha, event?.date])

  // Flyer background resolution
  const flyerBg = useMemo(() => {
    return (
      coupon?.backgroundImage ||
      venue?.qrBackground ||
      (event as any)?.backgroundImage ||
      (event as any)?.imageUrl ||
      localStorage.getItem('qr-pass-line.qr-background') ||
      ''
    )
  }, [coupon, venue, event])

  // Current active ticket to render
  const currentTicket = generatedTickets[activeTicketIdx] || generatedTickets[0] || null

  // 1. Initial Load: Authenticate if needed, load Event, Venue, Limitation, Anibal User
  useEffect(() => {
    let isMounted = true

    async function loadData() {
      setLoading(true)
      setErrorMsg('')

      // Intentar iniciar sesión anónima si no hay sesión
      if (!auth.currentUser) {
        try {
          await signInAnonymously(auth)
        } catch (authErr: any) {
          console.warn('Aviso auth:', authErr?.message || authErr)
        }
      }

      try {
        // A) Usar datos precargados de AppContext si están disponibles
        if (appContext && appContext.events && appContext.events.length > 0) {
          const allEvs = appContext.events
          const matchedEv =
            (urlEventId && urlEventId !== 'evento' ? allEvs.find((e) => e.id === urlEventId) : null) ||
            allEvs.find((e) => e.status === 'activo' && (e.name?.toLowerCase().includes('cubano') || e.venue?.toLowerCase().includes('cubano'))) ||
            allEvs.find((e) => e.status === 'activo') ||
            allEvs[0]

          if (matchedEv && isMounted) {
            setEvent(matchedEv)
            const matchedVenue =
              appContext.venues.find((v) => v.id === matchedEv.venueId) ||
              appContext.venues.find((v) => (v.name || '').toLowerCase().includes('cubano')) ||
              appContext.activeVenue ||
              null
            setVenue(matchedVenue)

            // Buscar cupón especificado en el link público o el primero
            let matchedCoupon: QrCatalogItem | null = null
            if (urlCouponId) {
              matchedCoupon = appContext.qrCatalog.find((c) => c.id === urlCouponId) || null
            }
            if (!matchedCoupon) {
              matchedCoupon =
                appContext.qrCatalog.find((c) => (c.name || '').toLowerCase().includes('general') || (c.name || '').toLowerCase().includes('ingreso')) ||
                appContext.qrCatalog[0] ||
                null
            }
            setCoupon(matchedCoupon)

            const foundAnibal =
              appContext.users.find((u) => {
                const em = (u.email || '').toLowerCase()
                return em === 'gncesso@gmail.com' || em === 'gncasso@gmail.com'
              }) ||
              appContext.users.find((u) => (u.email || '').toLowerCase() === 'simplemente_anibal@hotmail.com') ||
              appContext.users.find((u) => (u.name || '').toLowerCase().includes('anibal')) ||
              null
            setAnibalUser(foundAnibal)

            if (foundAnibal && matchedCoupon) {
              const lim =
                appContext.limitations.find((l) => l.personId === foundAnibal.id && l.couponId === matchedCoupon!.id) ||
                appContext.limitations.find((l) => l.personId === foundAnibal.id) ||
                null
              setLimitation(lim)
              const totalQuota = lim ? Number(lim.quantity) || 2000 : 2000
              const issued = appContext.tickets.filter((t) => {
                if (t.issuedBy !== foundAnibal.id || t.eventId !== matchedEv.id) return false
                if (t.items && t.items.length > 0) {
                  return t.items.some((it) => it.couponId === matchedCoupon!.id)
                }
                return t.couponId === matchedCoupon!.id
              }).length
              setAvailableQuota(Math.max(0, totalQuota - issued))
            }

            // Check localStorage for saved pass
            const localPassesKey = `qr-pass-line.public-passes-${matchedEv.id}`
            const savedPassesRaw = localStorage.getItem(localPassesKey)
            if (savedPassesRaw) {
              try {
                const parsed = JSON.parse(savedPassesRaw)
                if (Array.isArray(parsed) && parsed.length > 0) {
                  setGeneratedTickets(parsed)
                  setIsExistingPass(true)
                }
              } catch {}
            } else {
              // Backward compatibility check with single pass
              const oldPassRaw = localStorage.getItem(`qr-pass-line.public-pass-${matchedEv.id}`)
              if (oldPassRaw) {
                try {
                  const parsed = JSON.parse(oldPassRaw)
                  if (parsed && parsed.code) {
                    setGeneratedTickets([parsed])
                    setIsExistingPass(true)
                  }
                } catch {}
              }
            }
          }
        } else {
          // B) Cargar directamente desde Firestore
          let targetEvent: ClubEvent | null = null
          try {
            if (urlEventId && urlEventId !== 'evento') {
              const evSnap = await getDoc(doc(db, 'events', urlEventId))
              if (evSnap.exists()) {
                targetEvent = { id: evSnap.id, ...(evSnap.data() as any) }
              }
            }

            if (!targetEvent) {
              const evsSnap = await getDocs(collection(db, 'events'))
              const allEvents = evsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as ClubEvent[]
              targetEvent =
                allEvents.find((e) => e.status === 'activo' && (e.name?.toLowerCase().includes('cubano') || e.venue?.toLowerCase().includes('cubano'))) ||
                allEvents.find((e) => e.status === 'activo') ||
                allEvents[0] ||
                null
            }
          } catch (e: any) {
            console.warn('Error al cargar evento:', e)
          }

          if (targetEvent && isMounted) {
            setEvent(targetEvent)

            try {
              const vSnap = await getDocs(collection(db, 'venues'))
              const venues = vSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Venue[]
              const matchedVenue =
                venues.find((v) => v.id === targetEvent!.venueId) ||
                venues.find((v) => (v.name || '').toLowerCase().includes('cubano')) ||
                venues[0] ||
                null
              if (isMounted) setVenue(matchedVenue)
            } catch {}

            let matchedCoupon: QrCatalogItem | null = null
            try {
              const qSnap = await getDocs(collection(db, 'qrCatalog'))
              const catalog = qSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as QrCatalogItem[]
              if (urlCouponId) {
                matchedCoupon = catalog.find((c) => c.id === urlCouponId) || null
              }
              if (!matchedCoupon) {
                matchedCoupon =
                  catalog.find((c) => (c.name || '').toLowerCase().includes('general') || (c.name || '').toLowerCase().includes('ingreso')) ||
                  catalog[0] ||
                  null
              }
              if (isMounted) setCoupon(matchedCoupon)
            } catch {}

            let foundAnibal: User | null = null
            try {
              const uSnap = await getDocs(collection(db, 'users'))
              const allUsers = uSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as User[]
              foundAnibal =
                allUsers.find((u) => {
                  const em = (u.email || '').toLowerCase()
                  return em === 'gncesso@gmail.com' || em === 'gncasso@gmail.com'
                }) ||
                allUsers.find((u) => (u.email || '').toLowerCase() === 'simplemente_anibal@hotmail.com') ||
                allUsers.find((u) => (u.name || '').toLowerCase().includes('anibal')) ||
                null
              if (isMounted) setAnibalUser(foundAnibal)
            } catch {}

            let targetLimitation: Limitation | null = null
            try {
              const limSnap = await getDocs(collection(db, 'limitations'))
              const allLimits = limSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Limitation[]
              if (foundAnibal && matchedCoupon) {
                targetLimitation =
                  allLimits.find((l) => l.personId === foundAnibal!.id && l.couponId === matchedCoupon!.id) ||
                  allLimits.find((l) => l.personId === foundAnibal!.id) ||
                  null
              }
              if (isMounted) setLimitation(targetLimitation)
            } catch {}

            try {
              let totalQuota = targetLimitation ? Number(targetLimitation.quantity) || 2000 : 2000
              let issuedCount = 0

              if (foundAnibal && matchedCoupon) {
                const tq = query(collection(db, 'tickets'), where('issuedBy', '==', foundAnibal.id), where('eventId', '==', targetEvent.id))
                const tSnap = await getDocs(tq)
                issuedCount = tSnap.docs.filter((d) => {
                  const data = d.data()
                  if (data.items && data.items.length > 0) {
                    return data.items.some((it: any) => it.couponId === matchedCoupon!.id)
                  }
                  return data.couponId === matchedCoupon!.id
                }).length
              }

              const remaining = Math.max(0, totalQuota - issuedCount)
              if (isMounted) setAvailableQuota(remaining)
            } catch {
              if (isMounted) setAvailableQuota(targetLimitation ? Number(targetLimitation.quantity) || 2000 : 2000)
            }

            const localPassesKey = `qr-pass-line.public-passes-${targetEvent.id}`
            const savedPassesRaw = localStorage.getItem(localPassesKey)
            if (savedPassesRaw && isMounted) {
              try {
                const parsed = JSON.parse(savedPassesRaw)
                if (Array.isArray(parsed) && parsed.length > 0) {
                  setGeneratedTickets(parsed)
                  setIsExistingPass(true)
                }
              } catch {}
            } else {
              const oldPassRaw = localStorage.getItem(`qr-pass-line.public-pass-${targetEvent.id}`)
              if (oldPassRaw && isMounted) {
                try {
                  const parsed = JSON.parse(oldPassRaw)
                  if (parsed && parsed.code) {
                    setGeneratedTickets([parsed])
                    setIsExistingPass(true)
                  }
                } catch {}
              }
            }
          }
        }
      } catch (err: any) {
        console.error('Error cargando invitación:', err)
        if (isMounted) setErrorMsg('No pudimos cargar la información del evento. Por favor intentá nuevamente.')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    void loadData()
    return () => {
      isMounted = false
    }
  }, [urlEventId, appContext])

  // Manejar envío del formulario
  async function handleGenerateTicket(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')

    const cleanName = holderName.trim()
    const cleanPhone = phone.replace(/\D/g, '')

    if (cleanName.length < 3) {
      setFormError('Por favor ingresá tu nombre y apellido completo (mínimo 3 letras).')
      return
    }

    if (cleanPhone.length < 8) {
      setFormError('Por favor ingresá un número de celular o WhatsApp válido (mínimo 8 dígitos).')
      return
    }

    const qrsNeeded = dateOption === 'ambos' ? 2 : 1

    if (availableQuota < qrsNeeded) {
      if (dateOption === 'ambos' && availableQuota === 1) {
        setFormError('Solo queda 1 QR disponible para este evento. Podés sacar tu pase para el Sábado o para el Domingo (válido para tu grupo de hasta 6 personas).')
      } else {
        setFormError('Lo sentimos, los códigos QR disponibles para este evento se han completado.')
      }
      return
    }

    setSubmitting(true)

    try {
      // 1. Verificar si ya tiene pases guardados por celular en Firestore
      if (event) {
        try {
          const dupQuery = query(
            collection(db, 'tickets'),
            where('eventId', '==', event.id),
            where('phone', '==', cleanPhone)
          )
          const dupSnap = await getDocs(dupQuery)
          if (!dupSnap.empty) {
            const existingTickets = dupSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Ticket[]
            setGeneratedTickets(existingTickets)
            setIsExistingPass(true)
            setActiveTicketIdx(0)
            localStorage.setItem(`qr-pass-line.public-passes-${event.id}`, JSON.stringify(existingTickets))
            setSubmitting(false)
            return
          }
        } catch {}
      }

      // 2. Opción 1: Si es 'ambos', creamos 2 tickets separados (uno para Sábado y otro para Domingo)
      const ticketsToCreate: Omit<Ticket, 'id'>[] = []
      const couponTitle = coupon?.name || 'Ingreso General'

      if (dateOption === 'ambos') {
        // Pase 1: Sábado
        const satCode = ticketCode()
        const satItems: TicketItem[] = [
          { couponId: coupon?.id || 'cubano-sab', couponName: `${couponTitle} (Sábado)`, quantity }
        ]
        ticketsToCreate.push({
          eventId: event?.id || 'cubano-evento',
          venueId: venue?.id || event?.venueId || '',
          couponId: coupon?.id || limitation?.couponId || '',
          kind: 'qr',
          code: satCode,
          holderName: cleanName,
          phone: cleanPhone,
          dni: '',
          quantity,
          items: satItems,
          issuedBy: anibalUser?.id || 'rrpp-anibal',
          sellerName: 'RR.PP ANIBAL',
          issuedAt: new Date().toISOString(),
          eventDate: weekend.satIso,
          redeemedAt: null,
          redeemedBy: null,
        })

        // Pase 2: Domingo
        const sunCode = ticketCode()
        const sunItems: TicketItem[] = [
          { couponId: coupon?.id || 'cubano-dom', couponName: `${couponTitle} (Domingo)`, quantity }
        ]
        ticketsToCreate.push({
          eventId: event?.id || 'cubano-evento',
          venueId: venue?.id || event?.venueId || '',
          couponId: coupon?.id || limitation?.couponId || '',
          kind: 'qr',
          code: sunCode,
          holderName: cleanName,
          phone: cleanPhone,
          dni: '',
          quantity,
          items: sunItems,
          issuedBy: anibalUser?.id || 'rrpp-anibal',
          sellerName: 'RR.PP ANIBAL',
          issuedAt: new Date().toISOString(),
          eventDate: weekend.sunIso,
          redeemedAt: null,
          redeemedBy: null,
        })
      } else {
        // Un solo día (Sábado, Domingo o Fecha de evento)
        const singleCode = ticketCode()
        let targetDateIso = weekend.satIso
        let dayLabel = 'Sábado'

        if (dateOption === 'domingo') {
          targetDateIso = weekend.sunIso
          dayLabel = 'Domingo'
        } else if (dateOption === 'evento') {
          targetDateIso = eventDay.iso
          dayLabel = eventDay.dayName
        } else {
          targetDateIso = weekend.satIso
          dayLabel = 'Sábado'
        }

        const items: TicketItem[] = [
          {
            couponId: coupon?.id || 'cubano-gral',
            couponName: `${couponTitle} (${dayLabel})`,
            quantity,
          }
        ]
        ticketsToCreate.push({
          eventId: event?.id || 'cubano-evento',
          venueId: venue?.id || event?.venueId || '',
          couponId: coupon?.id || limitation?.couponId || '',
          kind: 'qr',
          code: singleCode,
          holderName: cleanName,
          phone: cleanPhone,
          dni: '',
          quantity,
          items,
          issuedBy: anibalUser?.id || 'rrpp-anibal',
          sellerName: 'RR.PP ANIBAL',
          issuedAt: new Date().toISOString(),
          eventDate: targetDateIso,
          redeemedAt: null,
          redeemedBy: null,
        })
      }

      // 3. Guardar tickets en Firestore
      const createdTickets: Ticket[] = []
      for (const t of ticketsToCreate) {
        const docRef = await addDoc(collection(db, 'tickets'), t)
        createdTickets.push({ id: docRef.id, ...t })
      }

      // 4. Guardar en LocalStorage
      if (event) {
        localStorage.setItem(`qr-pass-line.public-passes-${event.id}`, JSON.stringify(createdTickets))
      }

      setGeneratedTickets(createdTickets)
      setActiveTicketIdx(0)
      setIsExistingPass(false)
      setAvailableQuota((prev) => Math.max(0, prev - qrsNeeded))
    } catch (err: any) {
      console.error('Error al generar pase:', err)
      setFormError('Hubo un inconveniente al generar tu pase. Por favor intentá nuevamente.')
    } finally {
      setSubmitting(false)
    }
  }

  // Generar PNG de un ticket específico idéntico al de SellerEmitPage para descarga o compartir
  async function generateCouponPng(ticket: Ticket): Promise<Blob | null> {
    const width = 720
    const height = 1040
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    // 1. Dibujar afiche de fondo (con zoom, posición y brillo configurados en el panel)
    if (flyerBg) {
      const bgImg = new Image()
      bgImg.crossOrigin = 'anonymous'
      await new Promise((resolve) => {
        bgImg.onload = resolve
        bgImg.onerror = resolve
        bgImg.src = flyerBg
      })

      if (bgImg.complete && bgImg.naturalWidth > 0) {
        const scale = (templateBgZoom || 100) / 100
        const posX = (templateBgPosX || 0) * 2
        const posY = (templateBgPosY || 0) * 2

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
    } else {
      const bgGrad = ctx.createLinearGradient(0, 0, width, height)
      bgGrad.addColorStop(0, '#0a0912')
      bgGrad.addColorStop(0.5, '#151324')
      bgGrad.addColorStop(1, '#24101e')
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, width, height)
    }

    // 2. Tarjeta de vidrio translúcida para el QR (escala 2x proporcional a 360x520)
    const canvasQrSize = templateQrSize * 2
    const qrCardX = (width - canvasQrSize) / 2
    const qrCardY = templateQrY * 2
    const qrRadius = templateQrRadius * 2

    ctx.fillStyle = 'rgba(255, 255, 255, 0.78)'
    ctx.beginPath()
    ctx.roundRect(qrCardX, qrCardY, canvasQrSize, canvasQrSize, qrRadius)
    ctx.fill()

    // 3. Dibujar QR punteado idéntico
    const qrPadding = 20
    const innerQrSize = canvasQrSize - qrPadding * 2
    const qrCanvas = document.createElement('canvas')
    qrCanvas.width = innerQrSize
    qrCanvas.height = innerQrSize
    const qrCtx = qrCanvas.getContext('2d')
    if (qrCtx) {
      drawDottedQr(qrCtx, ticket.code, innerQrSize)
      ctx.drawImage(qrCanvas, qrCardX + qrPadding, qrCardY + qrPadding, innerQrSize, innerQrSize)
    }

    // 4. Tabla de items y cantidad
    const tableY = 740
    const itemsToDraw: { couponName: string; quantity: number }[] =
      ticket.items && ticket.items.length > 0
        ? ticket.items.map((it) => ({ couponName: it.couponName, quantity: it.quantity }))
        : [{ couponName: 'Ingreso General', quantity: ticket.quantity || 1 }]

    const rowHeight = 36
    const tableBottomY = tableY + 40 + itemsToDraw.length * rowHeight

    ctx.strokeStyle = 'rgba(255,255,255,0.5)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(80, tableY)
    ctx.lineTo(640, tableY)
    ctx.moveTo(80, tableY + 40)
    ctx.lineTo(640, tableY + 40)
    ctx.stroke()

    ctx.font = '22px sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.textAlign = 'left'
    ctx.fillText('Cupón', 100, tableY + 28)
    ctx.textAlign = 'right'
    ctx.fillText('Cant.', 620, tableY + 28)

    itemsToDraw.forEach((it, idx) => {
      const rowY = tableY + 40 + idx * rowHeight + 26
      ctx.font = '900 24px sans-serif'
      ctx.fillStyle = '#ffffff'
      ctx.textAlign = 'left'
      ctx.fillText(it.couponName, 100, rowY)

      ctx.fillStyle = '#ff4d4d'
      ctx.textAlign = 'right'
      ctx.fillText(String(it.quantity), 620, rowY)
    })

    ctx.beginPath()
    ctx.moveTo(80, tableBottomY + 6)
    ctx.lineTo(640, tableBottomY + 6)
    ctx.stroke()

    // 5. Nombre del titular y RRPP ANIBAL
    ctx.textAlign = 'center'
    ctx.fillStyle = '#cbd5e1'
    ctx.font = '700 20px sans-serif'
    ctx.fillText(`Titular: ${ticket.holderName.toUpperCase()}`, width / 2, tableBottomY + 38)

    ctx.fillStyle = '#ffffff'
    ctx.font = '900 30px sans-serif'
    ctx.fillText(`RR.PP: RR.PP ANIBAL`, width / 2, 980)

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png')
    })
  }

  // Descargar el pase actualmente visible
  async function handleDownloadCurrentPass() {
    if (!currentTicket) return
    setDownloading(true)
    try {
      const blob = await generateCouponPng(currentTicket)
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const sanitizedName = currentTicket.holderName.replace(/[^a-zA-Z0-9]/g, '_')
      const daySuffix = currentTicket.items?.[0]?.couponName.includes('Domingo') ? 'Domingo' : 'Sabado'
      link.download = `Pase-Cubano-${daySuffix}-${sanitizedName}.png`
      link.href = url
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error al descargar:', err)
      alert('Podés hacer una captura de pantalla a tu QR para guardarlo.')
    } finally {
      setDownloading(false)
    }
  }

  // Descargar ambos pases (Sábado y Domingo) en 2 archivos
  async function handleDownloadBothPasses() {
    if (generatedTickets.length < 2) return
    setDownloading(true)
    try {
      for (const t of generatedTickets) {
        const blob = await generateCouponPng(t)
        if (blob) {
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          const sanitizedName = t.holderName.replace(/[^a-zA-Z0-9]/g, '_')
          const daySuffix = t.items?.[0]?.couponName.includes('Domingo') ? 'Domingo' : 'Sabado'
          link.download = `Pase-Cubano-${daySuffix}-${sanitizedName}.png`
          link.href = url
          link.click()
          URL.revokeObjectURL(url)
          // Pausa pequeña entre descargas
          await new Promise((r) => setTimeout(r, 400))
        }
      }
    } catch (err) {
      console.error('Error al descargar pases:', err)
    } finally {
      setDownloading(false)
    }
  }

  // Compartir en WhatsApp
  function handleShareWhatsApp() {
    if (generatedTickets.length === 0) return

    let text = `¡Hola! Acá tengo mis Pases QR para *Cubano Bar*:\n👤 Titular: ${holderName || generatedTickets[0].holderName}\n\n`

    if (generatedTickets.length > 1) {
      const satTicket = generatedTickets[0]
      const sunTicket = generatedTickets[1]
      text += `📅 *SÁBADO (${weekend.satStr})*:\n🎟️ Código: #${satTicket.code} (${satTicket.quantity} pers.)\n\n`
      text += `📅 *DOMINGO (${weekend.sunStr})*:\n🎟️ Código: #${sunTicket.code} (${sunTicket.quantity} pers.)\n\n`
    } else {
      const single = generatedTickets[0]
      const isSun = single.items?.[0]?.couponName.includes('Domingo')
      text += `📅 *${isSun ? weekend.sunStr : weekend.satStr}*:\n🎟️ Código: #${single.code} (${single.quantity} pers.)\n\n`
    }

    text += `🤝 RRPP: RR.PP ANIBAL\n`
    text += `Mostrá cada QR en puerta al llegar: ${window.location.href}`

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank')
  }

  if (loading) {
    return (
      <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', background: '#09080e', color: '#fff', padding: 20 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, border: '3px solid #ff4606', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ fontWeight: 700, fontSize: 16 }}>Cargando Cubano Bar…</p>
        </div>
      </main>
    )
  }

  return (
    <main
      style={{
        minHeight: '100dvh',
        background: 'linear-gradient(180deg, #09080e 0%, #13111c 50%, #1a0d18 100%)',
        color: '#ffffff',
        padding: '24px 16px 48px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}
    >
      <div style={{ maxWidth: 440, width: '100%', margin: '0 auto' }}>
        {/* Encabezado: Solo dice Cubano Bar */}
        <header style={{ textAlign: 'center', marginBottom: 20 }}>
          <h1 style={{ fontSize: 34, fontWeight: 900, margin: '0 0 6px', letterSpacing: '-0.02em', color: '#fff' }}>
            Cubano Bar
          </h1>
          <p style={{ fontSize: 14, color: '#94a3b8', margin: 0 }}>
            Generá tu pase QR digital gratuito para ingresar
          </p>
        </header>

        {errorMsg && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: 14, padding: '14px 16px', color: '#fca5a5', fontSize: 14, marginBottom: 20, textAlign: 'center' }}>
            {errorMsg}
          </div>
        )}

        {/* VISTA 1: PASES GENERADOS CON OPCIÓN 1 (SÁBADO Y/O DOMINGO) */}
        {generatedTickets.length > 0 && currentTicket ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%' }}>
            {isExistingPass && (
              <div style={{ width: 'min(360px, 100%)', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid #3b82f6', borderRadius: 12, padding: '8px 12px', fontSize: 12, fontWeight: 700, color: '#93c5fd', textAlign: 'center' }}>
                ℹ️ Ya tenías un pase generado con tu número. ¡Acá está tu QR!
              </div>
            )}

            {/* Si generó para ambos días, pestañas para alternar entre Sábado y Domingo */}
            {generatedTickets.length > 1 && (
              <div style={{ width: 'min(360px, 100%)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setActiveTicketIdx(0)}
                  style={{
                    padding: '10px 8px',
                    borderRadius: 12,
                    border: activeTicketIdx === 0 ? '2px solid #ff4606' : '1px solid rgba(255,255,255,0.15)',
                    background: activeTicketIdx === 0 ? '#ff4606' : 'rgba(255,255,255,0.06)',
                    color: '#fff',
                    fontWeight: 900,
                    fontSize: 13,
                    cursor: 'pointer',
                    boxShadow: activeTicketIdx === 0 ? '0 4px 12px rgba(255, 70, 6, 0.35)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  📅 Pase Sábado
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTicketIdx(1)}
                  style={{
                    padding: '10px 8px',
                    borderRadius: 12,
                    border: activeTicketIdx === 1 ? '2px solid #ff4606' : '1px solid rgba(255,255,255,0.15)',
                    background: activeTicketIdx === 1 ? '#ff4606' : 'rgba(255,255,255,0.06)',
                    color: '#fff',
                    fontWeight: 900,
                    fontSize: 13,
                    cursor: 'pointer',
                    boxShadow: activeTicketIdx === 1 ? '0 4px 12px rgba(255, 70, 6, 0.35)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  📅 Pase Domingo
                </button>
              </div>
            )}

            {/* Indicador de qué pase se está viendo cuando hay 2 */}
            {generatedTickets.length > 1 && (
              <div style={{ fontSize: 13, fontWeight: 800, color: '#ff6633' }}>
                Mostrando: Pase para el {activeTicketIdx === 0 ? weekend.satStr : weekend.sunStr}
              </div>
            )}

            {/* Tarjeta idéntica a SellerEmitPage (360x520) */}
            <div
              style={{
                width: 'min(360px, 100%)',
                height: 520,
                borderRadius: 24,
                padding: '20px',
                color: '#fff',
                boxShadow: templateShadow ? '0 20px 40px rgba(0,0,0,0.6)' : 'none',
                position: 'relative',
                overflow: 'hidden',
                background: '#0f172a',
                border: '1.5px solid rgba(255, 70, 6, 0.4)',
                boxSizing: 'border-box'
              }}
            >
              {/* Capa de imagen de afiche con zoom y posición */}
              <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0 }}>
                {flyerBg ? (
                  <img
                    src={flyerBg}
                    alt="Afiche Cubano"
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
                ) : (
                  <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #311028 100%)' }} />
                )}
              </div>

              {/* Caja QR Vidrio Esmerilado translúcido */}
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  top: `${templateQrY}px`,
                  width: `${templateQrSize}px`,
                  height: `${templateQrSize}px`,
                  borderRadius: `${templateQrRadius}px`,
                  background: 'rgba(255, 255, 255, 0.78)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  padding: 10,
                  display: 'grid',
                  placeItems: 'center',
                  zIndex: 2,
                  boxShadow: templateShadow ? '0 8px 32px rgba(0,0,0,0.25)' : 'none'
                }}
              >
                <div style={{ width: templateQrSize - 20, height: templateQrSize - 20 }}>
                  <DottedQrImage value={currentTicket.code} size={templateQrSize - 20} />
                </div>
              </div>

              {/* Detalle Inferior del Cupón (Tabla con Cupón y Cantidad) */}
              <div style={{ position: 'absolute', bottom: 16, left: 0, right: 0, padding: '0 20px', zIndex: 2, textAlign: 'center' }}>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.4)', borderBottom: '1px solid rgba(255,255,255,0.4)', padding: '8px 0', margin: '0 auto 10px', width: '92%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'rgba(255,255,255,0.9)', marginBottom: 4 }}>
                    <span>Cupón</span>
                    <span>Cant.</span>
                  </div>
                  {currentTicket.items && currentTicket.items.length > 0 ? (
                    currentTicket.items.map((it, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 800, marginBottom: 2 }}>
                        <span>{it.couponName}</span>
                        <span style={{ color: '#ff4d4d' }}>{it.quantity}</span>
                      </div>
                    ))
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 800 }}>
                      <span>Ingreso General</span>
                      <span style={{ color: '#ff4d4d' }}>{currentTicket.quantity || 1}</span>
                    </div>
                  )}
                </div>

                <div style={{ fontSize: 11, color: '#e2e8f0', marginBottom: 4 }}>
                  Titular: <strong>{currentTicket.holderName}</strong>
                </div>

                <strong style={{ fontSize: 16, fontWeight: 900, letterSpacing: '0.04em', textTransform: 'uppercase', textShadow: templateShadow ? '0 2px 4px rgba(0,0,0,0.9)' : 'none' }}>
                  RR.PP: RR.PP ANIBAL
                </strong>
              </div>
            </div>

            {/* Botones de Acción */}
            <div style={{ width: 'min(360px, 100%)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                type="button"
                onClick={handleDownloadCurrentPass}
                disabled={downloading}
                style={{
                  height: 48,
                  borderRadius: 14,
                  border: 0,
                  background: 'linear-gradient(135deg, #ff4606 0%, #ff6b3d 100%)',
                  color: '#fff',
                  fontSize: 15,
                  fontWeight: 900,
                  cursor: 'pointer',
                  boxShadow: '0 6px 16px rgba(255, 70, 6, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8
                }}
              >
                <span>📥</span> {downloading ? 'Descargando...' : `Descargar Pase ${currentTicket.items?.[0]?.couponName.includes('Domingo') ? 'Domingo' : 'Sábado'} (Foto)`}
              </button>

              {/* Botón para descargar ambos pases si generó para sábado y domingo */}
              {generatedTickets.length > 1 && (
                <button
                  type="button"
                  onClick={handleDownloadBothPasses}
                  disabled={downloading}
                  style={{
                    height: 46,
                    borderRadius: 14,
                    border: '1.5px solid #ff4606',
                    background: 'rgba(255, 70, 6, 0.12)',
                    color: '#ff6633',
                    fontSize: 14,
                    fontWeight: 900,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8
                  }}
                >
                  <span>📥</span> Descargar Ambos Pases (2 Fotos)
                </button>
              )}

              <button
                type="button"
                onClick={handleShareWhatsApp}
                style={{
                  height: 46,
                  borderRadius: 14,
                  border: '1.5px solid #25d366',
                  background: 'rgba(37, 211, 102, 0.1)',
                  color: '#25d366',
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8
                }}
              >
                <span>💬</span> Guardar en WhatsApp
              </button>

              <button
                type="button"
                onClick={() => {
                  setGeneratedTickets([])
                  setIsExistingPass(false)
                  setHolderName('')
                  setPhone('')
                  setQuantity(1)
                }}
                style={{
                  height: 40,
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'transparent',
                  color: '#94a3b8',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  marginTop: 4
                }}
              >
                ↺ Generar otro pase para un amigo
              </button>

              <p style={{ fontSize: 12, color: '#64748b', textAlign: 'center', margin: '8px 0 0', lineHeight: 1.4 }}>
                💡 <strong>Consejo:</strong> Hacé una captura de pantalla a cada QR por si no tenés señal en la puerta.
              </p>
            </div>
          </div>
        ) : (
          /* VISTA 2: FORMULARIO DE AUTOGESTIÓN CON DOBLE FECHA Y CANTIDAD HASTA 6 (IMAGEN 1) */
          <div
            style={{
              background: 'rgba(20, 19, 27, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 24,
              padding: '24px 20px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
              backdropFilter: 'blur(16px)'
            }}
          >
            {/* Estado de Cupos */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: 14,
                background: availableQuota <= 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                border: availableQuota <= 0 ? '1px solid #ef4444' : '1px solid rgba(34, 197, 94, 0.3)',
                marginBottom: 20
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>{availableQuota <= 0 ? '🚨' : '🔥'}</span>
                <div>
                  <strong style={{ fontSize: 13, color: availableQuota <= 0 ? '#ef4444' : '#22c55e', display: 'block' }}>
                    {availableQuota <= 0 ? 'QRs Agotados para hoy' : `QRs Disponibles (${coupon?.name || 'Entrada'})`}
                  </strong>
                  <small style={{ fontSize: 11, color: '#94a3b8' }}>
                    {availableQuota <= 0
                      ? `El cupo de ${limitation ? limitation.quantity : 2000} QRs se ha completado`
                      : `Cupo restante: ${availableQuota} de ${limitation ? limitation.quantity : 2000} QRs (hasta ${maxAllowedPersons} ${maxAllowedPersons === 1 ? 'persona' : 'personas'} por QR)`}
                  </small>
                </div>
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 900,
                  color: availableQuota <= 0 ? '#ef4444' : '#22c55e',
                  background: 'rgba(0,0,0,0.25)',
                  padding: '3px 8px',
                  borderRadius: 8
                }}
              >
                {availableQuota > 0 ? 'ACTIVO' : 'CERRADO'}
              </span>
            </div>

            {availableQuota <= 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 10px' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
                <h3 style={{ fontSize: 20, fontWeight: 900, margin: '0 0 8px', color: '#fff' }}>
                  Cupo de pases completado
                </h3>
                <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.5, margin: 0 }}>
                  Ya se emitieron todos los pases autogestionados disponibles para esta fecha. Para consultas de ingreso o mesas, consultá en la puerta de Cubano Bar.
                </p>
              </div>
            ) : (
              <form onSubmit={handleGenerateTicket} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {/* 1. SELECCIÓN DE FECHA */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#cbd5e1', marginBottom: 8 }}>
                    {paramDateMode === 'simple' ? 'Fecha del pase:' : 'Seleccioná para qué día querés tu pase:'}
                  </label>

                  {paramDateMode === 'simple' ? (
                    <div
                      style={{
                        background: 'rgba(255, 70, 6, 0.12)',
                        border: '1.5px solid #ff4606',
                        borderRadius: 14,
                        padding: '12px 14px',
                        textAlign: 'center'
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 800, color: '#ff6633', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Fecha Confirmada
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 900, color: '#fff', marginTop: 3 }}>
                        📅 {dateOption === 'domingo' ? `Domingo (${weekend.sunStr})` : dateOption === 'evento' ? eventDay.formattedStr : `Sábado (${weekend.satStr})`}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                        <button
                          type="button"
                          onClick={() => setDateOption('sabado')}
                          style={{
                            padding: '12px 10px',
                            borderRadius: 14,
                            border: dateOption === 'sabado' ? '2px solid #ff4606' : '1px solid rgba(255,255,255,0.12)',
                            background: dateOption === 'sabado' ? 'rgba(255, 70, 6, 0.15)' : 'rgba(255,255,255,0.04)',
                            color: dateOption === 'sabado' ? '#ff6633' : '#cbd5e1',
                            cursor: 'pointer',
                            textAlign: 'center',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ fontSize: 15, fontWeight: 900 }}>📅 Sábado</div>
                          <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>{weekend.satStr}</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setDateOption('domingo')}
                          style={{
                            padding: '12px 10px',
                            borderRadius: 14,
                            border: dateOption === 'domingo' ? '2px solid #ff4606' : '1px solid rgba(255,255,255,0.12)',
                            background: dateOption === 'domingo' ? 'rgba(255, 70, 6, 0.15)' : 'rgba(255,255,255,0.04)',
                            color: dateOption === 'domingo' ? '#ff6633' : '#cbd5e1',
                            cursor: 'pointer',
                            textAlign: 'center',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ fontSize: 15, fontWeight: 900 }}>📅 Domingo</div>
                          <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>{weekend.sunStr}</div>
                        </button>
                      </div>

                      {/* Opción Ambos Días si está permitida */}
                      {paramAllowBothDays && (
                        <button
                          type="button"
                          disabled={availableQuota < 2}
                          onClick={() => availableQuota >= 2 && setDateOption('ambos')}
                          style={{
                            width: '100%',
                            padding: '12px 14px',
                            borderRadius: 14,
                            border: dateOption === 'ambos' ? '2px solid #ff4606' : '1px solid rgba(255,255,255,0.12)',
                            background: availableQuota < 2 ? 'rgba(255,255,255,0.02)' : dateOption === 'ambos' ? 'rgba(255, 70, 6, 0.18)' : 'rgba(255,255,255,0.03)',
                            color: availableQuota < 2 ? '#64748b' : dateOption === 'ambos' ? '#ff6633' : '#94a3b8',
                            cursor: availableQuota < 2 ? 'not-allowed' : 'pointer',
                            textAlign: 'center',
                            fontWeight: 800,
                            fontSize: 13,
                            transition: 'all 0.15s ease',
                            opacity: availableQuota < 2 ? 0.6 : 1
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 14, fontWeight: 900, color: availableQuota < 2 ? '#64748b' : dateOption === 'ambos' ? '#ff6633' : '#cbd5e1' }}>
                            <span>✨</span>
                            <span>Válido para ambos días (Sábado y Domingo)</span>
                          </div>
                          <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>
                            {availableQuota < 2
                              ? `⚠️ Queda solo 1 QR disponible: podés sacarlo para Sábado o Domingo (hasta ${maxAllowedPersons} personas)`
                              : 'Te generará 2 QRs independientes: uno para ingresar el sábado y otro para el domingo'}
                          </div>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* 2. CANTIDAD DE PERSONAS */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <label style={{ fontSize: 13, fontWeight: 800, color: '#cbd5e1' }}>
                      Cantidad de personas <span style={{ color: '#ff4606' }}>*</span>
                    </label>
                    <span style={{ fontSize: 11, color: '#ff6633', fontWeight: 700 }}>
                      {maxAllowedPersons === 1 ? 'Pase Individual' : `Máx. ${maxAllowedPersons} por QR`}
                    </span>
                  </div>

                  {maxAllowedPersons === 1 ? (
                    <div
                      style={{
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: 14,
                        padding: '12px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: 14, color: '#fff', display: 'block' }}>👤 Pase Individual</strong>
                        <small style={{ fontSize: 11, color: '#94a3b8' }}>Ingreso para 1 persona al momento de presentarse en puerta</small>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 900, color: '#22c55e', background: 'rgba(34, 197, 94, 0.15)', padding: '4px 10px', borderRadius: 8 }}>
                        1 Persona
                      </span>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <button
                          type="button"
                          disabled={quantity <= 1}
                          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                          style={{
                            width: 46,
                            height: 46,
                            borderRadius: 12,
                            border: '1px solid rgba(255,255,255,0.2)',
                            background: quantity <= 1 ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.08)',
                            color: quantity <= 1 ? '#475569' : '#fff',
                            fontSize: 22,
                            fontWeight: 900,
                            cursor: quantity <= 1 ? 'not-allowed' : 'pointer'
                          }}
                        >
                          −
                        </button>

                        <div
                          style={{
                            flex: 1,
                            height: 46,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(255, 70, 6, 0.12)',
                            border: '1.5px solid rgba(255, 70, 6, 0.4)',
                            borderRadius: 12,
                            fontSize: 16,
                            fontWeight: 900,
                            color: '#ff6633'
                          }}
                        >
                          {quantity} {quantity === 1 ? 'Persona beneficiada' : 'Personas beneficiadas'}
                        </div>

                        <button
                          type="button"
                          disabled={quantity >= maxAllowedPersons}
                          onClick={() => setQuantity((q) => Math.min(maxAllowedPersons, q + 1))}
                          style={{
                            width: 46,
                            height: 46,
                            borderRadius: 12,
                            border: '1px solid rgba(255,255,255,0.2)',
                            background: quantity >= maxAllowedPersons ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.08)',
                            color: quantity >= maxAllowedPersons ? '#475569' : '#fff',
                            fontSize: 22,
                            fontWeight: 900,
                            cursor: quantity >= maxAllowedPersons ? 'not-allowed' : 'pointer'
                          }}
                        >
                          +
                        </button>
                      </div>

                      {/* Pills selectoras rápidas */}
                      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${maxAllowedPersons}, 1fr)`, gap: 6, marginTop: 8 }}>
                        {Array.from({ length: maxAllowedPersons }, (_, i) => i + 1).map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setQuantity(num)}
                            style={{
                              height: 36,
                              borderRadius: 10,
                              border: quantity === num ? '2px solid #ff4606' : '1px solid rgba(255,255,255,0.1)',
                              background: quantity === num ? '#ff4606' : 'rgba(255,255,255,0.04)',
                              color: '#fff',
                              fontWeight: 800,
                              fontSize: 14,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. NOMBRE Y APELLIDO */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#cbd5e1', marginBottom: 6 }}>
                    Nombre y Apellido <span style={{ color: '#ff4606' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Juan Pérez"
                    value={holderName}
                    onChange={(e) => setHolderName(e.target.value)}
                    style={{
                      width: '100%',
                      height: 48,
                      borderRadius: 12,
                      border: '1px solid rgba(255,255,255,0.15)',
                      background: 'rgba(10, 9, 14, 0.8)',
                      color: '#fff',
                      fontSize: 15,
                      padding: '0 14px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  <small style={{ fontSize: 11, color: '#64748b', marginTop: 4, display: 'block' }}>
                    Como figura en tu documento para validar en el ingreso.
                  </small>
                </div>

                {/* 4. CELULAR (WHATSAPP) */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#cbd5e1', marginBottom: 6 }}>
                    Número de Celular (WhatsApp) <span style={{ color: '#ff4606' }}>*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="Ej: 11 2345 6789"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={{
                      width: '100%',
                      height: 48,
                      borderRadius: 12,
                      border: '1px solid rgba(255,255,255,0.15)',
                      background: 'rgba(10, 9, 14, 0.8)',
                      color: '#fff',
                      fontSize: 15,
                      padding: '0 14px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  <small style={{ fontSize: 11, color: '#64748b', marginTop: 4, display: 'block' }}>
                    🔒 Solo te pedimos el celular para validar tu pase y evitar duplicados. <strong>No pedimos DNI.</strong>
                  </small>
                </div>

                {formError && (
                  <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: 10, padding: '10px 12px', color: '#fca5a5', fontSize: 13, textAlign: 'center' }}>
                    {formError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    height: 52,
                    borderRadius: 14,
                    border: 0,
                    background: submitting
                      ? '#64748b'
                      : 'linear-gradient(135deg, #ff4606 0%, #ff6b3d 100%)',
                    color: '#ffffff',
                    fontSize: 16,
                    fontWeight: 900,
                    letterSpacing: '0.04em',
                    cursor: submitting ? 'wait' : 'pointer',
                    boxShadow: submitting ? 'none' : '0 8px 24px rgba(255, 70, 6, 0.4)',
                    marginTop: 6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8
                  }}
                >
                  {submitting ? (
                    <>
                      <span style={{ display: 'inline-block', width: 18, height: 18, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                      <span>GENERANDO TU PASE QR...</span>
                    </>
                  ) : (
                    <>
                      <span>✨</span>
                      <span>OBTENER MI PASE QR GRATIS</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Footer simple */}
        <footer style={{ textAlign: 'center', marginTop: 32, fontSize: 12, color: '#475569' }}>
          <p style={{ margin: '0 0 6px' }}>
            Cubano Bar · QR Pass Line
          </p>
          <p style={{ margin: 0, fontSize: 11 }}>
            Presentar el pase digital desde el celular al momento de ingresar.
          </p>
        </footer>
      </div>
    </main>
  )
}
