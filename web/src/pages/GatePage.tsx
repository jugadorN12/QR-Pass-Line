import { Component, useRef, useState, type ReactNode } from 'react'
import { QrScanner, type QrScannerRef } from '../components/QrScanner'
import { useApp } from '../context/AppContext'
import { parseQrPayload } from '../lib/ids'
import { StaffHeader } from '../components/StaffHeader'

class GateErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: string }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error: error?.message || String(error) }
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('GatePage Error Boundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 32, textAlign: 'center', background: '#f8fafc', minHeight: '100dvh', display: 'grid', placeItems: 'center' }}>
          <div style={{ background: '#fff', padding: 24, borderRadius: 20, boxShadow: '0 10px 30px rgba(0,0,0,0.08)', maxWidth: 360 }}>
            <h2 style={{ fontSize: 18, color: '#0f172a', marginBottom: 12 }}>Atención</h2>
            <p className="muted" style={{ fontSize: 13, marginBottom: 20 }}>{this.state.error}</p>
            <button className="btn btn-primary btn-block" type="button" onClick={() => window.location.reload()}>
              Reintentar
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

type ScanResult =
  | {
      ok: true
      title: string
      ticketId?: string
      ticketCode?: string
      holderName: string
      ticketName: string
      sellerName: string
      venueName: string
      quantity: string
      numericQuantity: number
      schedule: string
      date: string
      isException?: boolean
    }
  | {
      ok: false
      title: string
      reason?: string
      message: string
      ticketId?: string
      ticketCode?: string
      sellerName?: string
      venueName?: string
      redeemedAtFormatted?: string
      redeemerName?: string
      holderName?: string
      ticketName?: string
      schedule?: string
      date?: string
      quantity?: string
      numericQuantity?: number
    }

function GatePageContent() {
  const { currentUser, events, redeemTicket, redeemTicketWithException, updateTicketQuantity } = useApp()
  const scannerRef = useRef<QrScannerRef | null>(null)

  const [manualCode, setManualCode] = useState('')
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [scanHistory, setScanHistory] = useState<Array<{ code: string; name: string; time: string; ok: boolean }>>([])

  // Modal & Action states for adjusting people & exceptions
  const [isChangePeopleModalOpen, setIsChangePeopleModalOpen] = useState(false)
  const [isExceptionModalOpen, setIsExceptionModalOpen] = useState(false)
  const [peopleCountToSet, setPeopleCountToSet] = useState(1)
  const [actionLoading, setActionLoading] = useState(false)
  const [toastFeedback, setToastFeedback] = useState<string | null>(null)

  // Settings State (Imagen 4)
  const [redeemMode, setRedeemMode] = useState<'parcial' | 'total'>('parcial')
  const [printType, setTipoImpresion] = useState<'no' | 'todo' | 'sepa'>('no')

  const activeEvents = (events || []).filter((event) => event?.status === 'activo')

  function showToast(msg: string) {
    setToastFeedback(msg)
    setTimeout(() => setToastFeedback(null), 3500)
  }

  async function redeemValue(rawValue: string) {
    if (!rawValue || typeof rawValue !== 'string') return
    const trimmed = rawValue.trim()
    if (!trimmed) return

    try {
      const code = parseQrPayload(trimmed) || trimmed.toUpperCase()

      const result: any = await redeemTicket(code)

      if (result.ok) {
        const numBenefited = typeof result.ticket?.quantity === 'number' && result.ticket.quantity > 0
          ? result.ticket.quantity
          : 1

        setScanResult({
          ok: true,
          title: result.isException ? '✓ INGRESO POR EXCEPCIÓN' : '✓ QR VÁLIDO',
          ticketId: result.ticket?.id,
          ticketCode: code,
          holderName: result.ticket?.holderName || 'Cliente General',
          ticketName: result.ticketName || 'INGRESO GENERAL',
          sellerName: result.sellerName || 'Vendedor General',
          venueName: result.venueName || 'Local Principal',
          quantity: result.quantity || (numBenefited === 1 ? '1 persona beneficiada' : `${numBenefited} personas beneficiadas`),
          numericQuantity: numBenefited,
          schedule: result.schedule || 'Hasta las 02:00 hs',
          date: result.date || 'Fecha de hoy',
          isException: Boolean(result.isException || result.ticket?.isException)
        })

        setScanHistory((prev) => [
          {
            code,
            name: result.ticket?.holderName || 'Cliente General',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            ok: true
          },
          ...prev
        ])
      } else {
        const numBenefited = typeof result.ticket?.quantity === 'number' && result.ticket.quantity > 0
          ? result.ticket.quantity
          : 1

        setScanResult({
          ok: false,
          title:
            result.reason === 'expired_schedule' || result.reason === 'expired'
              ? '✕ QR FUERA DE HORARIO'
              : result.reason === 'early_schedule'
              ? '✕ ACCESO AÚN NO INICIADO'
              : result.reason === 'already_used' || result.reason === 'already_redeemed'
              ? '✕ QR YA UTILIZADO'
              : '✕ QR NO VÁLIDO',
          reason: result.reason,
          message: result.message || 'El acceso no es válido para ingresar.',
          ticketId: result.ticket?.id,
          ticketCode: code,
          sellerName: result.sellerName,
          venueName: result.venueName,
          redeemedAtFormatted: result.redeemedAtFormatted,
          redeemerName: result.redeemerName,
          holderName: result.holderName || result.ticket?.holderName,
          ticketName: result.ticketName,
          schedule: result.schedule,
          date: result.date,
          quantity: result.quantity,
          numericQuantity: numBenefited
        })

        setScanHistory((prev) => [
          {
            code,
            name: result.holderName || 'Acceso Denegado',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            ok: false
          },
          ...prev
        ])
      }
    } catch (err: any) {
      console.error('Error in redeemValue:', err)
      setScanResult({
        ok: false,
        title: '✕ QR NO VÁLIDO',
        message: err?.message || 'Error al procesar la validación del código.'
      })
    }
  }

  async function handleConfirmQuantityChange() {
    if (!scanResult?.ticketId) return
    setActionLoading(true)
    try {
      const cleanQty = Math.max(1, Math.floor(peopleCountToSet))
      const res = await updateTicketQuantity(scanResult.ticketId, cleanQty)
      if (res.ok) {
        const qText = cleanQty === 1 ? '1 persona beneficiada' : `${cleanQty} personas beneficiadas`
        setScanResult((prev) => {
          if (!prev) return null
          return {
            ...prev,
            quantity: qText,
            numericQuantity: cleanQty
          }
        })
        setIsChangePeopleModalOpen(false)
        showToast(`✓ Cantidad actualizada a ${cleanQty} ${cleanQty === 1 ? 'persona' : 'personas'}`)
      } else {
        alert(res.error || 'No se pudo actualizar la cantidad de personas.')
      }
    } catch (err: any) {
      alert(err?.message || 'Error al actualizar la cantidad de personas.')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleConfirmExceptionEntry() {
    if (!scanResult?.ticketCode) return
    setActionLoading(true)
    try {
      const cleanQty = Math.max(1, Math.floor(peopleCountToSet))
      const res = await redeemTicketWithException(scanResult.ticketCode, cleanQty)
      if (res.ok) {
        const qText = cleanQty === 1 ? '1 persona beneficiada' : `${cleanQty} personas beneficiadas`
        setScanResult({
          ok: true,
          title: '✓ INGRESO POR EXCEPCIÓN',
          ticketId: res.ticket?.id,
          ticketCode: scanResult.ticketCode,
          holderName: res.ticket?.holderName || scanResult.holderName || 'Cliente General',
          ticketName: res.ticketName || scanResult.ticketName || 'INGRESO GENERAL',
          sellerName: res.sellerName || scanResult.sellerName || 'Vendedor General',
          venueName: res.venueName || scanResult.venueName || 'Local Principal',
          quantity: qText,
          numericQuantity: cleanQty,
          schedule: res.schedule || scanResult.schedule || 'Acceso por Excepción',
          date: res.date || scanResult.date || 'Fecha de hoy',
          isException: true
        })

        setScanHistory((prev) => [
          {
            code: scanResult.ticketCode!,
            name: `${res.ticket?.holderName || 'Cliente'} (Excepción: ${cleanQty}p)`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            ok: true
          },
          ...prev
        ])

        setIsExceptionModalOpen(false)
        showToast(`✓ Ingreso extraordinario autorizado para ${cleanQty} ${cleanQty === 1 ? 'persona' : 'personas'}`)
      } else {
        alert(res.message || 'No se pudo autorizar el ingreso por excepción.')
      }
    } catch (err: any) {
      alert(err?.message || 'Error al autorizar ingreso por excepción.')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="role-screen" style={{ minHeight: '100dvh', background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      <StaffHeader />

      <main style={{ flex: 1, width: 'min(480px, calc(100% - 24px))', margin: '16px auto 40px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ marginBottom: 4 }}>
          <p className="kicker" style={{ fontSize: 11, fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Operación en puerta</p>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: '2px 0 4px' }}>Canjear acceso</h1>
          <p className="muted" style={{ fontSize: 13, margin: 0 }}>
            {currentUser?.role === 'canjeador' ? 'Validá cada entrada una sola vez.' : 'Podés validar accesos de tus fechas activas.'}
          </p>
        </div>

        {/* Main Scanner Section */}
        <section className="card stack" style={{ padding: 12, borderRadius: 24, position: 'relative', overflow: 'visible', background: '#fff' }}>
          {/* Scanner Component with Continuous Live Camera */}
          <div style={{ position: 'relative', width: '100%' }}>
            <QrScanner ref={scannerRef} onScan={(rawValue) => void redeemValue(rawValue)} />

            {/* Floating Action Button / Menu Trigger (Imagen 2 & 3) */}
            <div style={{ position: 'absolute', bottom: 16, right: 16, zIndex: 50, display: 'flex', flexDirection: 'column-reverse', alignItems: 'center', gap: 12 }}>
              {/* Main Trigger Button (3 Dots) */}
              {!isMenuOpen ? (
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(true)}
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    background: '#0f2942',
                    color: '#fff',
                    border: 0,
                    fontSize: 24,
                    display: 'grid',
                    placeItems: 'center',
                    boxShadow: '0 8px 20px rgba(15,41,66,0.4)',
                    cursor: 'pointer'
                  }}
                  aria-label="Abrir menú"
                >
                  ⋮
                </button>
              ) : (
                /* Expanded Action Menu (Imagen 3) */
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  {/* 1. Settings Gear Icon (Configuración - Imagen 4) */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSettingsOpen(true)
                      setIsMenuOpen(false)
                    }}
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      background: '#0f2942',
                      color: '#fff',
                      border: 0,
                      fontSize: 20,
                      display: 'grid',
                      placeItems: 'center',
                      boxShadow: '0 6px 16px rgba(0,0,0,0.2)',
                      cursor: 'pointer'
                    }}
                    title="Configuración"
                  >
                    ⚙
                  </button>

                  {/* 2. Support Headset Icon */}
                  <a
                    href="https://api.whatsapp.com/send?phone=5491131245112&text=Hola%2C%20necesito%20soporte%20en%20puerta%20con%20QR%20Pass%20Line"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      background: '#0f2942',
                      color: '#fff',
                      border: 0,
                      fontSize: 20,
                      display: 'grid',
                      placeItems: 'center',
                      boxShadow: '0 6px 16px rgba(0,0,0,0.2)',
                      cursor: 'pointer',
                      textDecoration: 'none'
                    }}
                    title="Soporte WhatsApp"
                  >
                    🎧
                  </a>

                  {/* 3. Flip Camera Icon */}
                  <button
                    type="button"
                    onClick={() => {
                      void scannerRef.current?.flipCamera()
                      setIsMenuOpen(false)
                    }}
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      background: '#0f2942',
                      color: '#fff',
                      border: 0,
                      fontSize: 20,
                      display: 'grid',
                      placeItems: 'center',
                      boxShadow: '0 6px 16px rgba(0,0,0,0.2)',
                      cursor: 'pointer'
                    }}
                    title="Cambiar cámara"
                  >
                    ↺
                  </button>

                  {/* 4. History Clock Icon */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsHistoryOpen(true)
                      setIsMenuOpen(false)
                    }}
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      background: '#0f2942',
                      color: '#fff',
                      border: 0,
                      fontSize: 20,
                      display: 'grid',
                      placeItems: 'center',
                      boxShadow: '0 6px 16px rgba(0,0,0,0.2)',
                      cursor: 'pointer'
                    }}
                    title="Historial"
                  >
                    🕒
                  </button>

                  {/* 5. Close Action Menu Button (X) */}
                  <button
                    type="button"
                    onClick={() => setIsMenuOpen(false)}
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: '50%',
                      background: '#0f2942',
                      color: '#fff',
                      border: 0,
                      fontSize: 22,
                      fontWeight: 800,
                      display: 'grid',
                      placeItems: 'center',
                      boxShadow: '0 8px 20px rgba(15,41,66,0.4)',
                      cursor: 'pointer'
                    }}
                    aria-label="Cerrar menú"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Manual Code Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!manualCode.trim()) return
            void redeemValue(manualCode.trim())
            setManualCode('')
          }}
          style={{ display: 'flex', gap: 8, background: '#fff', padding: 8, borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
        >
          <input
            type="text"
            placeholder="Ingresá el código manual (ej. ABCDEFGH)..."
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value.toUpperCase())}
            style={{ flex: 1, border: 0, padding: '0 12px', fontSize: 14, fontWeight: 700, letterSpacing: '0.05em', outline: 'none', background: 'transparent' }}
          />
          <button
            type="submit"
            disabled={!manualCode.trim()}
            style={{ padding: '10px 18px', borderRadius: 12, background: manualCode.trim() ? '#1e3a8a' : '#cbd5e1', color: '#fff', fontWeight: 800, border: 0, cursor: manualCode.trim() ? 'pointer' : 'not-allowed' }}
          >
            Validar
          </button>
        </form>

        {/* Active Events List */}
        <section className="card" style={{ padding: 16, borderRadius: 20, background: '#fff' }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 12 }}>Fechas activas</h2>
          {activeEvents.map((event) => (
            <div className="list-item" key={event.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <b>{event.name}</b>
                <p className="muted" style={{ fontSize: 12, margin: 0 }}>{event.venue}</p>
              </div>
              <span className="pill pill-ok" style={{ fontSize: 11, padding: '3px 8px', borderRadius: 8 }}>Activa</span>
            </div>
          ))}
          {!activeEvents.length ? <p className="muted" style={{ marginTop: 12, fontSize: 13 }}>No hay fechas activas.</p> : null}
        </section>
      </main>

      {/* CONFIGURACIÓN Screen Modal (Imagen 4) */}
      {isSettingsOpen && (
        <div className="settings-backdrop" style={{ position: 'fixed', inset: 0, zIndex: 120, background: '#fff', display: 'flex', flexDirection: 'column', padding: '24px 20px' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 36 }}>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0f2942', letterSpacing: '0.04em', margin: 0 }}>
              CONFIGURACIÓN
            </h1>
            <button
              type="button"
              onClick={() => setIsSettingsOpen(false)}
              style={{ border: 0, background: 'transparent', color: '#0f2942', fontSize: 16, fontWeight: 800, cursor: 'pointer', letterSpacing: '0.04em' }}
            >
              CERRAR
            </button>
          </div>

          {/* Section 1: Modo de Canjeo */}
          <div style={{ marginBottom: 32 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 12 }}>
              Modo de canjeo
            </span>
            <div style={{ display: 'flex', background: '#f8fafc', borderRadius: 16, padding: 4, border: '1px solid #e2e8f0' }}>
              <button
                type="button"
                onClick={() => setRedeemMode('parcial')}
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 12,
                  border: 0,
                  background: redeemMode === 'parcial' ? '#e0f2fe' : 'transparent',
                  color: redeemMode === 'parcial' ? '#0369a1' : '#64748b',
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                Canjeo parcial del QR
              </button>
              <button
                type="button"
                onClick={() => setRedeemMode('total')}
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 12,
                  border: 0,
                  background: redeemMode === 'total' ? '#e0f2fe' : 'transparent',
                  color: redeemMode === 'total' ? '#0369a1' : '#64748b',
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                Canjeo total del QR
              </button>
            </div>
          </div>

          {/* Section 2: Tipo Impresión */}
          <div>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 12 }}>
              Tipo Impresión
            </span>
            <div style={{ display: 'flex', background: '#f8fafc', borderRadius: 16, padding: 4, border: '1px solid #e2e8f0' }}>
              <button
                type="button"
                onClick={() => setTipoImpresion('no')}
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 12,
                  border: 0,
                  background: printType === 'no' ? '#e0f2fe' : 'transparent',
                  color: printType === 'no' ? '#0369a1' : '#64748b',
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                No Imprimir
              </button>
              <button
                type="button"
                onClick={() => setTipoImpresion('todo')}
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 12,
                  border: 0,
                  background: printType === 'todo' ? '#e0f2fe' : 'transparent',
                  color: printType === 'todo' ? '#0369a1' : '#64748b',
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                Siempre Todo ...
              </button>
              <button
                type="button"
                onClick={() => setTipoImpresion('sepa')}
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 12,
                  border: 0,
                  background: printType === 'sepa' ? '#e0f2fe' : 'transparent',
                  color: printType === 'sepa' ? '#0369a1' : '#64748b',
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                Siempre Sepa...
              </button>
            </div>
          </div>

          {/* Footer Print Device Icon */}
          <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#cbd5e1', display: 'grid', placeItems: 'center', color: '#475569', fontSize: 20 }}>
              📱
            </div>
          </div>
        </div>
      )}

      {/* HISTORIAL Modal */}
      {isHistoryOpen && (
        <div className="settings-backdrop" style={{ position: 'fixed', inset: 0, zIndex: 120, background: '#fff', display: 'flex', flexDirection: 'column', padding: '24px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h1 style={{ fontSize: 20, fontWeight: 900, color: '#0f2942', margin: 0 }}>HISTORIAL DE CANJES</h1>
            <button type="button" onClick={() => setIsHistoryOpen(false)} style={{ border: 0, background: 'transparent', color: '#0f2942', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>
              CERRAR
            </button>
          </div>
          <div className="stack" style={{ gap: 12, flex: 1, overflowY: 'auto' }}>
            {scanHistory.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                <div>
                  <strong style={{ display: 'block', fontSize: 14 }}>{item.name}</strong>
                  <small style={{ color: '#64748b', fontSize: 11 }}>Código: {item.code} - {item.time}</small>
                </div>
                <span className={`pill ${item.ok ? 'pill-ok' : 'pill-err'}`}>{item.ok ? 'Canjeado' : 'Fallido'}</span>
              </div>
            ))}
            {!scanHistory.length && <p className="muted" style={{ textAlign: 'center', marginTop: 32 }}>No hay lecturas registradas aún.</p>}
          </div>
        </div>
      )}
      {/* Fixed High-Visibility Scan Result Modal Overlay (Permanece fijo hasta presionar Continuar) */}
      {scanResult && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'grid',
            placeItems: 'center',
            padding: 16,
            overflowY: 'auto'
          }}
        >
          <div
            style={{
              width: 'min(460px, 100%)',
              maxHeight: '92vh',
              overflowY: 'auto',
              background: scanResult.ok
                ? 'linear-gradient(160deg, #15803d 0%, #16a34a 100%)'
                : 'linear-gradient(160deg, #991b1b 0%, #dc2626 100%)',
              color: '#ffffff',
              borderRadius: 24,
              padding: '28px 22px',
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
              boxShadow: scanResult.ok
                ? '0 25px 60px rgba(21,128,61,0.5), 0 0 0 2px rgba(255,255,255,0.25)'
                : '0 25px 60px rgba(220,38,38,0.5), 0 0 0 2px rgba(255,255,255,0.25)',
              border: '2px solid rgba(255,255,255,0.25)',
              animation: 'fadeIn 0.2s ease-out'
            }}
          >
            {/* Header with status badge */}
            <div style={{ textAlign: 'center', paddingBottom: 4 }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.22)',
                  border: '2px solid rgba(255, 255, 255, 0.45)',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 32,
                  fontWeight: 900,
                  margin: '0 auto 12px',
                  boxShadow: '0 8px 20px rgba(0,0,0,0.2)'
                }}
              >
                {scanResult.ok ? '✓' : '✕'}
              </div>
              <h2
                style={{
                  fontSize: 26,
                  fontWeight: 900,
                  letterSpacing: '0.04em',
                  margin: 0,
                  textTransform: 'uppercase',
                  textShadow: '0 2px 8px rgba(0,0,0,0.3)'
                }}
              >
                {scanResult.title}
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: 13, opacity: 0.9, fontWeight: 600 }}>
                {scanResult.ok ? 'Acceso confirmado y validado correctamente' : 'Acceso no permitido para ingresar'}
              </p>
            </div>

            {/* Content Details */}
            {scanResult.ok ? (
              /* QR VÁLIDO - Detalle */
              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.2)',
                  borderRadius: 18,
                  padding: '16px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  border: '1px solid rgba(255, 255, 255, 0.2)'
                }}
              >
                <div style={{ borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: 10 }}>
                  <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.85, fontWeight: 700, display: 'block' }}>
                    📅 FECHA
                  </span>
                  <strong style={{ fontSize: 17, fontWeight: 800 }}>{scanResult.date}</strong>
                </div>

                <div style={{ borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div>
                    <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.85, fontWeight: 700, display: 'block' }}>
                      👥 CANTIDAD DE PERSONAS BENEFICIADAS
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2, flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: 18, fontWeight: 900, color: '#fef08a' }}>{scanResult.quantity}</strong>
                      {scanResult.isException && (
                        <span style={{ background: '#f59e0b', color: '#000', fontSize: 10, fontWeight: 900, padding: '2px 8px', borderRadius: 8, letterSpacing: '0.04em' }}>
                          POR EXCEPCIÓN
                        </span>
                      )}
                    </div>
                  </div>
                  {scanResult.ticketId && (
                    <button
                      type="button"
                      onClick={() => {
                        setPeopleCountToSet(scanResult.numericQuantity || 1)
                        setIsChangePeopleModalOpen(true)
                      }}
                      style={{
                        background: 'rgba(255, 255, 255, 0.25)',
                        border: '1px solid rgba(255, 255, 255, 0.45)',
                        color: '#ffffff',
                        padding: '6px 12px',
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <span>✏️ Modificar</span>
                    </button>
                  )}
                </div>

                <div style={{ borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: 10 }}>
                  <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.85, fontWeight: 700, display: 'block' }}>
                    🎟️ TIPO DE ENTRADA
                  </span>
                  <strong style={{ fontSize: 17, fontWeight: 800 }}>{scanResult.ticketName}</strong>
                </div>

                <div style={{ borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: 10 }}>
                  <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.85, fontWeight: 700, display: 'block' }}>
                    ⏰ LÍMITE DE HORA
                  </span>
                  <strong style={{ fontSize: 16, fontWeight: 800 }}>{scanResult.schedule}</strong>
                </div>

                <div style={{ borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: 10 }}>
                  <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.85, fontWeight: 700, display: 'block' }}>
                    👤 TITULAR / CLIENTE
                  </span>
                  <strong style={{ fontSize: 16, fontWeight: 800 }}>{scanResult.holderName}</strong>
                </div>

                <div style={{ borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: 10 }}>
                  <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.85, fontWeight: 700, display: 'block' }}>
                    🏷️ RRPP / VENDEDOR
                  </span>
                  <strong style={{ fontSize: 15, fontWeight: 800 }}>{scanResult.sellerName}</strong>
                </div>

                <div>
                  <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.85, fontWeight: 700, display: 'block' }}>
                    📍 ESTABLECIMIENTO
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{scanResult.venueName}</span>
                </div>
              </div>
            ) : (
              /* QR NO VÁLIDO / YA UTILIZADO - Detalle */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Highlighted Rejection Reason */}
                <div
                  style={{
                    background: 'rgba(0, 0, 0, 0.35)',
                    border: '2px solid rgba(255, 255, 255, 0.4)',
                    borderRadius: 18,
                    padding: '16px 18px'
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#fef08a', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    ⚠️ MOTIVO DEL RECHAZO:
                  </span>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 800, lineHeight: 1.4, color: '#ffffff' }}>
                    {scanResult.message}
                  </p>
                </div>

                {/* Exception Action Button: Available ONLY when expired schedule */}
                {(scanResult.reason === 'expired' || scanResult.reason === 'expired_schedule') && (
                  <button
                    type="button"
                    onClick={() => {
                      setPeopleCountToSet(scanResult.numericQuantity || 1)
                      setIsExceptionModalOpen(true)
                    }}
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      borderRadius: 16,
                      background: '#f59e0b',
                      color: '#000000',
                      border: '2px solid #ffffff',
                      fontWeight: 900,
                      fontSize: 15,
                      letterSpacing: '0.02em',
                      cursor: 'pointer',
                      boxShadow: '0 6px 20px rgba(245, 158, 11, 0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      transition: 'transform 0.1s ease',
                      marginTop: 2,
                      marginBottom: 2
                    }}
                  >
                    <span style={{ fontSize: 18 }}>⚠️</span>
                    <span>AUTORIZAR INGRESO POR EXCEPCIÓN</span>
                  </button>
                )}

                {/* Additional context details if available */}
                <div
                  style={{
                    background: 'rgba(0, 0, 0, 0.2)',
                    borderRadius: 18,
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    border: '1px solid rgba(255, 255, 255, 0.15)'
                  }}
                >
                  {scanResult.reason === 'already_used' && (
                    <>
                      {scanResult.redeemedAtFormatted && (
                        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: 8 }}>
                          <span style={{ fontSize: 11, opacity: 0.85, display: 'block', fontWeight: 700 }}>HORA DEL PRIMER CANJE</span>
                          <strong style={{ fontSize: 15, fontWeight: 800, color: '#fca5a5' }}>{scanResult.redeemedAtFormatted} hs</strong>
                        </div>
                      )}
                      {scanResult.redeemerName && (
                        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: 8 }}>
                          <span style={{ fontSize: 11, opacity: 0.85, display: 'block', fontWeight: 700 }}>VALIDADO EN PUERTA POR</span>
                          <strong style={{ fontSize: 15, fontWeight: 800 }}>{scanResult.redeemerName}</strong>
                        </div>
                      )}
                    </>
                  )}

                  {scanResult.date && (
                    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: 8 }}>
                      <span style={{ fontSize: 11, opacity: 0.85, display: 'block', fontWeight: 700 }}>FECHA DEL TICKET</span>
                      <strong style={{ fontSize: 14 }}>{scanResult.date}</strong>
                    </div>
                  )}

                  {scanResult.schedule && (
                    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: 8 }}>
                      <span style={{ fontSize: 11, opacity: 0.85, display: 'block', fontWeight: 700 }}>LÍMITE DE HORA PERMITIDO</span>
                      <strong style={{ fontSize: 14 }}>{scanResult.schedule}</strong>
                    </div>
                  )}

                  {scanResult.ticketName && (
                    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: 8 }}>
                      <span style={{ fontSize: 11, opacity: 0.85, display: 'block', fontWeight: 700 }}>TIPO DE ENTRADA</span>
                      <strong style={{ fontSize: 14 }}>{scanResult.ticketName}</strong>
                    </div>
                  )}

                  {scanResult.holderName && (
                    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: 8 }}>
                      <span style={{ fontSize: 11, opacity: 0.85, display: 'block', fontWeight: 700 }}>TITULAR / PORTADOR</span>
                      <strong style={{ fontSize: 14 }}>{scanResult.holderName}</strong>
                    </div>
                  )}

                  {scanResult.sellerName && (
                    <div>
                      <span style={{ fontSize: 11, opacity: 0.85, display: 'block', fontWeight: 700 }}>RRPP / VENDEDOR QUE LO EMITIÓ</span>
                      <strong style={{ fontSize: 14 }}>{scanResult.sellerName}</strong>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Floating Action Button (FAB) to Change Beneficiaries */}
            {scanResult.ok && scanResult.ticketId && (
              <button
                type="button"
                onClick={() => {
                  setPeopleCountToSet(scanResult.numericQuantity || 1)
                  setIsChangePeopleModalOpen(true)
                }}
                style={{
                  position: 'fixed',
                  bottom: 84,
                  right: 18,
                  zIndex: 9999,
                  background: '#fef08a',
                  color: '#14532d',
                  border: '2px solid #ffffff',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  borderRadius: 30,
                  padding: '11px 18px',
                  fontSize: 13,
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  letterSpacing: '0.02em'
                }}
              >
                <span style={{ fontSize: 18 }}>👥</span>
                <span>CAMBIAR PERSONAS ({scanResult.numericQuantity || 1})</span>
              </button>
            )}

            {/* Floating Action Button (FAB) for Exception if expired schedule */}
            {!scanResult.ok && (scanResult.reason === 'expired' || scanResult.reason === 'expired_schedule') && (
              <button
                type="button"
                onClick={() => {
                  setPeopleCountToSet(scanResult.numericQuantity || 1)
                  setIsExceptionModalOpen(true)
                }}
                style={{
                  position: 'fixed',
                  bottom: 84,
                  right: 18,
                  zIndex: 9999,
                  background: '#f59e0b',
                  color: '#000000',
                  border: '2px solid #ffffff',
                  boxShadow: '0 8px 24px rgba(245, 158, 11, 0.55)',
                  borderRadius: 30,
                  padding: '11px 18px',
                  fontSize: 13,
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  letterSpacing: '0.02em'
                }}
              >
                <span style={{ fontSize: 18 }}>⚠️</span>
                <span>AUTORIZAR EXCEPCIÓN ({scanResult.numericQuantity || 1}p)</span>
              </button>
            )}

            {/* Toast Feedback */}
            {toastFeedback && (
              <div
                style={{
                  position: 'fixed',
                  top: 24,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: '#0f172a',
                  color: '#ffffff',
                  border: '1px solid #22c55e',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                  padding: '12px 20px',
                  borderRadius: 30,
                  fontSize: 14,
                  fontWeight: 800,
                  zIndex: 10001,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  pointerEvents: 'none'
                }}
              >
                <span>{toastFeedback}</span>
              </div>
            )}

            {/* Prominent Action Button: CONTINUAR ESCANEANDO */}
            <button
              type="button"
              onClick={() => setScanResult(null)}
              style={{
                height: 54,
                borderRadius: 16,
                background: '#ffffff',
                color: scanResult.ok ? '#15803d' : '#dc2626',
                fontWeight: 900,
                fontSize: 16,
                letterSpacing: '0.04em',
                width: '100%',
                border: 0,
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'transform 0.1s ease',
                marginTop: 4
              }}
            >
              <span>CONTINUAR ESCANEANDO</span>
              <span style={{ fontSize: 18 }}>➔</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal: Cambiar Personas Beneficiadas */}
      {isChangePeopleModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10002,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(5px)',
            display: 'grid',
            placeItems: 'center',
            padding: 16
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !actionLoading) {
              setIsChangePeopleModalOpen(false)
            }
          }}
        >
          <div
            style={{
              background: '#0f172a',
              color: '#ffffff',
              borderRadius: 24,
              border: '1px solid rgba(255, 255, 255, 0.15)',
              padding: '24px 22px',
              maxWidth: 380,
              width: '100%',
              boxShadow: '0 25px 50px rgba(0,0,0,0.7)',
              display: 'flex',
              flexDirection: 'column',
              gap: 18
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 4 }}>👥</div>
              <h3 style={{ margin: 0, fontSize: 19, fontWeight: 900 }}>Cambiar Personas Beneficiadas</h3>
              <p style={{ margin: '6px 0 0', fontSize: 13, opacity: 0.8, lineHeight: 1.4 }}>
                Modifica cuántas personas están ingresando efectivamente con este código QR.
              </p>
            </div>

            {/* Stepper controls */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 16,
                background: 'rgba(255, 255, 255, 0.05)',
                padding: '16px 14px',
                borderRadius: 18,
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              <button
                type="button"
                disabled={peopleCountToSet <= 1 || actionLoading}
                onClick={() => setPeopleCountToSet((prev) => Math.max(1, prev - 1))}
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 16,
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  background: peopleCountToSet <= 1 ? 'rgba(255,255,255,0.05)' : '#334155',
                  color: '#ffffff',
                  fontSize: 26,
                  fontWeight: 900,
                  cursor: peopleCountToSet <= 1 ? 'not-allowed' : 'pointer',
                  display: 'grid',
                  placeItems: 'center',
                  opacity: peopleCountToSet <= 1 ? 0.4 : 1
                }}
              >
                −
              </button>

              <div style={{ textAlign: 'center', minWidth: 100 }}>
                <span style={{ fontSize: 38, fontWeight: 900, color: '#fef08a', display: 'block', lineHeight: 1 }}>
                  {peopleCountToSet}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', opacity: 0.75, letterSpacing: '0.04em' }}>
                  {peopleCountToSet === 1 ? 'Persona' : 'Personas'}
                </span>
              </div>

              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setPeopleCountToSet((prev) => prev + 1)}
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 16,
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  background: '#22c55e',
                  color: '#ffffff',
                  fontSize: 26,
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'grid',
                  placeItems: 'center',
                  boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)'
                }}
              >
                +
              </button>
            </div>

            {/* Quick Chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
              {[1, 2, 3, 4, 5, 6, 8, 10].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setPeopleCountToSet(num)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 10,
                    border: peopleCountToSet === num ? '2px solid #fef08a' : '1px solid rgba(255,255,255,0.15)',
                    background: peopleCountToSet === num ? '#fef08a' : 'rgba(255,255,255,0.08)',
                    color: peopleCountToSet === num ? '#0f172a' : '#ffffff',
                    fontWeight: 800,
                    fontSize: 13,
                    cursor: 'pointer'
                  }}
                >
                  {num}
                </button>
              ))}
            </div>

            <div style={{ background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: 12, padding: '10px 12px' }}>
              <p style={{ margin: 0, fontSize: 12, color: '#93c5fd', lineHeight: 1.4 }}>
                ℹ️ La diferencia (+ o -) se reflejará al instante en las personas ingresadas y en la cuenta de invitados del RRPP ({scanResult?.sellerName || 'Emisor'}).
              </p>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setIsChangePeopleModalOpen(false)}
                style={{
                  flex: 1,
                  height: 48,
                  borderRadius: 14,
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                  border: 0,
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmQuantityChange}
                style={{
                  flex: 1.5,
                  height: 48,
                  borderRadius: 14,
                  background: '#22c55e',
                  color: '#ffffff',
                  border: 0,
                  fontSize: 14,
                  fontWeight: 900,
                  cursor: 'pointer',
                  boxShadow: '0 6px 18px rgba(34, 197, 94, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6
                }}
              >
                {actionLoading ? 'Guardando...' : `✓ Confirmar (${peopleCountToSet})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Autorizar Ingreso por Excepción */}
      {isExceptionModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10002,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(6px)',
            display: 'grid',
            placeItems: 'center',
            padding: 16
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !actionLoading) {
              setIsExceptionModalOpen(false)
            }
          }}
        >
          <div
            style={{
              background: '#0f172a',
              color: '#ffffff',
              borderRadius: 24,
              border: '2px solid #f59e0b',
              padding: '24px 22px',
              maxWidth: 400,
              width: '100%',
              boxShadow: '0 25px 50px rgba(0,0,0,0.8)',
              display: 'flex',
              flexDirection: 'column',
              gap: 16
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 34, marginBottom: 4 }}>⚠️</div>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#f59e0b' }}>
                Autorizar Ingreso por Excepción
              </h3>
              <p style={{ margin: '6px 0 0', fontSize: 13, opacity: 0.85, lineHeight: 1.4 }}>
                Este código QR está <strong>fuera del horario</strong> permitido. ¿Deseas autorizar el ingreso extraordinario como canjeador?
              </p>
            </div>

            {/* Ticket info summary */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: 14,
                padding: '12px 14px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                fontSize: 13,
                display: 'flex',
                flexDirection: 'column',
                gap: 6
              }}
            >
              <div><span style={{ opacity: 0.7 }}>Titular:</span> <strong>{scanResult?.holderName || 'Cliente'}</strong></div>
              <div><span style={{ opacity: 0.7 }}>RRPP / Vendedor:</span> <strong>{scanResult?.sellerName || 'Vendedor'}</strong></div>
              <div><span style={{ opacity: 0.7 }}>Horario establecido:</span> <strong>{scanResult?.schedule || '-'}</strong></div>
            </div>

            {/* Stepper: Personas a ingresar */}
            <div>
              <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', opacity: 0.85, display: 'block', marginBottom: 8, textAlign: 'center' }}>
                ¿Cuántas personas ingresan por excepción?
              </span>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 16,
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '12px 14px',
                  borderRadius: 16,
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
              >
                <button
                  type="button"
                  disabled={peopleCountToSet <= 1 || actionLoading}
                  onClick={() => setPeopleCountToSet((prev) => Math.max(1, prev - 1))}
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 14,
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    background: peopleCountToSet <= 1 ? 'rgba(255,255,255,0.05)' : '#334155',
                    color: '#ffffff',
                    fontSize: 24,
                    fontWeight: 900,
                    cursor: peopleCountToSet <= 1 ? 'not-allowed' : 'pointer',
                    display: 'grid',
                    placeItems: 'center',
                    opacity: peopleCountToSet <= 1 ? 0.4 : 1
                  }}
                >
                  −
                </button>

                <div style={{ textAlign: 'center', minWidth: 90 }}>
                  <span style={{ fontSize: 34, fontWeight: 900, color: '#fef08a', display: 'block', lineHeight: 1 }}>
                    {peopleCountToSet}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', opacity: 0.75 }}>
                    {peopleCountToSet === 1 ? 'Persona' : 'Personas'}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setPeopleCountToSet((prev) => prev + 1)}
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 14,
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    background: '#f59e0b',
                    color: '#000000',
                    fontSize: 24,
                    fontWeight: 900,
                    cursor: 'pointer',
                    display: 'grid',
                    placeItems: 'center'
                  }}
                >
                  +
                </button>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setIsExceptionModalOpen(false)}
                style={{
                  flex: 1,
                  height: 48,
                  borderRadius: 14,
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                  border: 0,
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmExceptionEntry}
                style={{
                  flex: 1.6,
                  height: 48,
                  borderRadius: 14,
                  background: '#f59e0b',
                  color: '#000000',
                  border: 0,
                  fontSize: 14,
                  fontWeight: 900,
                  cursor: 'pointer',
                  boxShadow: '0 6px 18px rgba(245, 158, 11, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6
                }}
              >
                {actionLoading ? 'Autorizando...' : `✓ Autorizar (${peopleCountToSet}p)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function GatePage() {
  return (
    <GateErrorBoundary>
      <GatePageContent />
    </GateErrorBoundary>
  )
}
