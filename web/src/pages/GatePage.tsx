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
      holderName: string
      ticketName: string
      sellerName: string
      venueName: string
      quantity: string
      schedule: string
      date: string
    }
  | {
      ok: false
      title: string
      reason?: string
      message: string
      sellerName?: string
      venueName?: string
      redeemedAtFormatted?: string
      redeemerName?: string
      holderName?: string
      ticketName?: string
      schedule?: string
      date?: string
      quantity?: string
    }

function GatePageContent() {
  const { currentUser, events, redeemTicket } = useApp()
  const scannerRef = useRef<QrScannerRef | null>(null)

  const [manualCode, setManualCode] = useState('')
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [scanHistory, setScanHistory] = useState<Array<{ code: string; name: string; time: string; ok: boolean }>>([])

  // Settings State (Imagen 4)
  const [redeemMode, setRedeemMode] = useState<'parcial' | 'total'>('parcial')
  const [printType, setTipoImpresion] = useState<'no' | 'todo' | 'sepa'>('no')

  const activeEvents = (events || []).filter((event) => event?.status === 'activo')

  async function redeemValue(rawValue: string) {
    if (!rawValue || typeof rawValue !== 'string') return
    const trimmed = rawValue.trim()
    if (!trimmed) return

    try {
      const code = parseQrPayload(trimmed) || trimmed.toUpperCase()

      const result: any = await redeemTicket(code)

      if (result.ok) {
        setScanResult({
          ok: true,
          title: '✓ QR VÁLIDO',
          holderName: result.ticket?.holderName || 'Cliente General',
          ticketName: result.ticketName || 'INGRESO GENERAL',
          sellerName: result.sellerName || 'Vendedor General',
          venueName: result.venueName || 'Local Principal',
          quantity: result.quantity || '1 persona beneficiada',
          schedule: result.schedule || 'Hasta las 02:00 hs',
          date: result.date || 'Fecha de hoy'
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
        setScanResult({
          ok: false,
          title: result.reason === 'already_used' ? '✕ QR YA UTILIZADO' : '✕ QR NO VÁLIDO',
          reason: result.reason,
          message: result.message || 'El acceso no es válido para ingresar.',
          sellerName: result.sellerName,
          venueName: result.venueName,
          redeemedAtFormatted: result.redeemedAtFormatted,
          redeemerName: result.redeemerName,
          holderName: result.holderName,
          ticketName: result.ticketName,
          schedule: result.schedule,
          date: result.date,
          quantity: result.quantity
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

                <div style={{ borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: 10 }}>
                  <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.85, fontWeight: 700, display: 'block' }}>
                    👥 CANTIDAD DE PERSONAS BENEFICIADAS
                  </span>
                  <strong style={{ fontSize: 18, fontWeight: 900, color: '#fef08a' }}>{scanResult.quantity}</strong>
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
