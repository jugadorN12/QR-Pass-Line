import { useState } from 'react'
import { QrScanner } from '../components/QrScanner'
import { useApp } from '../context/AppContext'
import { parseQrPayload } from '../lib/ids'

export function GatePage() {
  const { currentUser, events, redeemTicket } = useApp()
  const [value, setValue] = useState('')
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const activeEvents = events.filter((event) => event.status === 'activo')

  async function redeemValue(rawValue: string) {
    const code = parseQrPayload(rawValue)
    if (!code) {
      setMessage({ ok: false, text: 'Ingresá un código QR válido de 8 caracteres.' })
      return
    }
    const result = await redeemTicket(code)
    setMessage(result.ok ? { ok: true, text: `Ingreso autorizado para ${result.ticket.holderName}.` } : { ok: false, text: result.message })
    if (result.ok) setValue('')
  }

  function redeem(e: React.FormEvent) {
    e.preventDefault()
    void redeemValue(value)
  }

  return (
    <main className="page">
      <div><p className="kicker">Operación en puerta</p><h1>Canjear acceso</h1><p className="muted">{currentUser?.role === 'canjeador' ? 'Validá cada entrada una sola vez.' : 'Podés validar accesos de tus fechas activas.'}</p></div>
      <section className="card stack">
        <QrScanner onScan={(rawValue) => { setValue(rawValue); void redeemValue(rawValue) }} />
        <form className="stack" onSubmit={redeem}>
          <label className="field"><span>Código QR / DNI</span><input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Ej: 7K3P9M2A" autoCapitalize="characters" /></label>
          <button className="btn btn-primary btn-block">Validar ingreso</button>
        </form>
        {message ? <div className={`flash ${message.ok ? 'flash-ok' : 'flash-err'}`}>{message.text}</div> : null}
      </section>
      <section className="card"><h2>Fechas activas</h2>{activeEvents.map((event) => <div className="list-item" key={event.id}><div><b>{event.name}</b><p className="muted">{event.venue}</p></div><span className="pill pill-ok">Activa</span></div>)}{!activeEvents.length ? <p className="muted" style={{ marginTop: 12 }}>No hay fechas activas.</p> : null}</section>
    </main>
  )
}
