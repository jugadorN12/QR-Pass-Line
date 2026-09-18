import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { QrImage } from '../components/QrImage'
import { Status } from './HomePage'
import { useApp } from '../context/AppContext'
import { formatDate, qrPayload } from '../lib/ids'

export function EventDetailPage() {
  const { eventId } = useParams()
  const { events, tickets, currentUser, issueTicket, updateEventStatus } = useApp()
  const currentEvent = events.find((item) => item.id === eventId)
  const [createdCode, setCreatedCode] = useState<string | null>(null)
  const [error, setError] = useState('')
  if (!currentEvent) return <main className="page"><div className="card">No se encontró la fecha.</div></main>
  const event = currentEvent
  const eventTickets = tickets.filter((ticket) => ticket.eventId === event.id)
  const canIssue = currentUser?.role !== 'canjeador'

  async function createAccess(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    try {
      const ticket = await issueTicket({
        eventId: event.id,
        kind: String(form.get('kind')) as 'qr' | 'dni',
        holderName: String(form.get('holderName')),
        dni: String(form.get('dni') || ''),
      })
      setCreatedCode(ticket.code)
      e.currentTarget.reset()
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo emitir el acceso.')
    }
  }

  return (
    <main className="page">
      <Link className="muted" to="/fechas">← Volver a fechas</Link>
      <section className="card stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div><p className="kicker">Fecha operativa</p><h1>{event.name}</h1><p className="muted">{formatDate(event.date)} · {event.venue}</p></div>
          <Status status={event.status} />
        </div>
        <div className="kpi-grid">
          <div className="kpi"><b>{eventTickets.length}</b><span>Emitidos</span></div>
          <div className="kpi"><b>{eventTickets.filter((t) => t.redeemedAt).length}</b><span>Canjeados</span></div>
          <div className="kpi"><b>{eventTickets.filter((t) => !t.redeemedAt).length}</b><span>Pendientes</span></div>
        </div>
        {currentUser?.role === 'organizador' ? (
          <button className="btn btn-secondary" onClick={() => updateEventStatus(event.id, event.status === 'activo' ? 'cerrado' : 'activo')}>
            {event.status === 'activo' ? 'Cerrar fecha' : 'Reactivar fecha'}
          </button>
        ) : null}
      </section>
      {canIssue ? (
        <form className="card stack" onSubmit={createAccess}>
          <div><p className="kicker">Emisión</p><h2>Crear acceso</h2></div>
          <label className="field"><span>Persona</span><input name="holderName" required placeholder="Nombre y apellido" /></label>
          <label className="field"><span>Tipo</span><select name="kind" defaultValue="qr"><option value="qr">QR</option><option value="dni">Lista DNI</option></select></label>
          <label className="field"><span>DNI (opcional)</span><input name="dni" inputMode="numeric" placeholder="Sin puntos" /></label>
          {error ? <p className="error">{error}</p> : null}
          <button className="btn btn-primary btn-block">Emitir acceso</button>
        </form>
      ) : null}
      {createdCode ? <section className="card qr-wrap"><p className="kicker">Acceso creado</p><QrImage value={qrPayload(createdCode)} /><strong className="code-xl">{createdCode}</strong><p className="muted">Guardá o compartí este código con la persona.</p></section> : null}
      <section className="card">
        <h2>Últimos accesos</h2>
        {eventTickets.slice(0, 8).map((ticket) => <div className="list-item" key={ticket.id}><div style={{ flex: 1 }}><b>{ticket.holderName}</b><p className="muted">{ticket.kind.toUpperCase()} · {ticket.code}</p></div><span className={ticket.redeemedAt ? 'pill pill-ok' : 'pill pill-warn'}>{ticket.redeemedAt ? 'Canjeado' : 'Pendiente'}</span></div>)}
        {!eventTickets.length ? <p className="muted" style={{ marginTop: 12 }}>Todavía no hay accesos emitidos.</p> : null}
      </section>
    </main>
  )
}
