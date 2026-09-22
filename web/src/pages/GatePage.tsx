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
    }
  | {
      ok: false
      title: string
      reason?: string
      message: string
      sellerName?: string
      redeemedAtFormatted?: string
      redeemerName?: string
      holderName?: string
    }

function GatePageContent() {
  const { currentUser, events, redeemTicket } = useApp()
  const scannerRef = useRef<QrScannerRef | null>(null)

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
    const code = parseQrPayload(rawValue)
    if (!code) {
      setScanResult({
        ok: false,
        title: '✕ QR NO VÁLIDO',
        message: 'Código de acceso no reconocido.'
      })
      return
    }

    const result: any = await redeemTicket(code)

    if (result.ok) {
      setScanResult({
        ok: true,
        title: '✓ QR VÁLIDO',
        holderName: result.ticket.holderName || 'Cliente General',
        ticketName: 'INGRESO GENERAL 2AM',
        sellerName: result.sellerName || 'Vendedor General',
        venueName: result.venueName || 'Local Principal',
        quantity: 'Ingreso para 1 persona',
        schedule: result.schedule || 'Del 19/09 23:59 al 20/09 02:00'
      })

      setScanHistory((prev) => [
        {
          code,
          name: result.ticket.holderName || 'Cliente General',
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
        message: result.message,
        sellerName: result.sellerName,
        redeemedAtFormatted: result.redeemedAtFormatted,
        redeemerName: result.redeemerName,
        holderName: result.holderName
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

            {/* Cartel Permanente de Resultado Superpuesto (Verde para Válido / Rojo para Inválido o Usado) */}
            {scanResult && (
              <div
                style={{
                  position: 'absolute',
                  inset: 12,
                  zIndex: 60,
                  background: scanResult.ok ? '#15803d' : '#b91c1c',
                  color: '#fff',
                  borderRadius: 20,
                  padding: '24px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: scanResult.ok
                    ? '0 20px 40px rgba(21,128,61,0.6)'
                    : '0 20px 40px rgba(185,28,28,0.6)',
                  animation: 'fadeIn 0.2s ease-out'
                }}
              >
                <div>
                  <strong style={{ fontSize: 24, fontWeight: 900, letterSpacing: '0.04em', display: 'block', marginBottom: 12 }}>
                    {scanResult.title}
                  </strong>

                  {scanResult.ok ? (
                    /* QR VÁLIDO - Detalle */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14, borderTop: '1px solid rgba(255,255,255,0.3)', paddingTop: 12 }}>
                      <div>
                        <span style={{ opacity: 0.85, fontSize: 12, display: 'block' }}>Cliente / Portador</span>
                        <strong style={{ fontSize: 17 }}>{scanResult.holderName}</strong>
                      </div>
                      <div>
                        <span style={{ opacity: 0.85, fontSize: 12, display: 'block' }}>Tipo de Entrada</span>
                        <strong style={{ fontSize: 16 }}>{scanResult.ticketName}</strong>
                      </div>
                      <div>
                        <span style={{ opacity: 0.85, fontSize: 12, display: 'block' }}>Cantidad</span>
                        <strong style={{ fontSize: 15 }}>{scanResult.quantity}</strong>
                      </div>
                      <div>
                        <span style={{ opacity: 0.85, fontSize: 12, display: 'block' }}>Horario Permitido</span>
                        <span style={{ fontSize: 13, opacity: 0.95 }}>{scanResult.schedule}</span>
                      </div>
                      <div>
                        <span style={{ opacity: 0.85, fontSize: 12, display: 'block' }}>RRPP / Vendedor</span>
                        <strong style={{ fontSize: 15 }}>{scanResult.sellerName}</strong>
                      </div>
                    </div>
                  ) : (
                    /* QR NO VÁLIDO / YA UTILIZADO - Detalle */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14, borderTop: '1px solid rgba(255,255,255,0.3)', paddingTop: 12 }}>
                      <p style={{ margin: '4px 0 8px', fontSize: 16, fontWeight: 700, lineHeight: 1.4 }}>
                        {scanResult.message}
                      </p>

                      {scanResult.reason === 'already_used' && (
                        <>
                          {scanResult.redeemedAtFormatted && (
                            <div>
                              <span style={{ opacity: 0.85, fontSize: 12, display: 'block' }}>Hora de Canje</span>
                              <strong style={{ fontSize: 15 }}>{scanResult.redeemedAtFormatted} hs</strong>
                            </div>
                          )}
                          {scanResult.redeemerName && (
                            <div>
                              <span style={{ opacity: 0.85, fontSize: 12, display: 'block' }}>Validado por</span>
                              <strong style={{ fontSize: 15 }}>{scanResult.redeemerName}</strong>
                            </div>
                          )}
                        </>
                      )}

                      {scanResult.sellerName && (
                        <div>
                          <span style={{ opacity: 0.85, fontSize: 12, display: 'block' }}>RRPP / Vendedor que lo emitió</span>
                          <strong style={{ fontSize: 15 }}>{scanResult.sellerName}</strong>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Botón Permanente CONTINUAR */}
                <button
                  type="button"
                  onClick={() => setScanResult(null)}
                  style={{
                    marginTop: 20,
                    height: 50,
                    borderRadius: 14,
                    background: '#ffffff',
                    color: scanResult.ok ? '#15803d' : '#b91c1c',
                    fontWeight: 900,
                    fontSize: 16,
                    letterSpacing: '0.04em',
                    width: '100%',
                    border: 0,
                    cursor: 'pointer',
                    boxShadow: '0 6px 16px rgba(0,0,0,0.25)'
                  }}
                >
                  CONTINUAR
                </button>
              </div>
            )}

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
                  <button
                    type="button"
                    onClick={() => alert('Soporte técnico disponible 24/7 para el centro de canje.')}
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
                    title="Soporte"
                  >
                    🎧
                  </button>

                  {/* 3. Flip Camera Icon */}
                  <button
                    type="button"
                    onClick={() => void scannerRef.current?.flipCamera()}
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
