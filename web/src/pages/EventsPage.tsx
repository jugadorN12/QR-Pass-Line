import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { formatDate } from '../lib/ids'
import { Status } from './HomePage'

export function EventsPage() {
  const { events, tickets, currentUser } = useApp()
  const canCreate = currentUser?.role !== 'canjeador'

  return (
    <main className="page">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p className="kicker">Calendario</p>
          <h1>Fechas</h1>
        </div>
        {canCreate ? <Link className="btn btn-primary" to="/fechas/nueva">Nueva</Link> : null}
      </div>
      <section className="card">
        {events.length === 0 ? (
          <p className="muted">No hay fechas cargadas.</p>
        ) : (
          events.map((event) => {
            const count = tickets.filter((t) => t.eventId === event.id).length
            const redeemed = tickets.filter((t) => t.eventId === event.id && t.redeemedAt).length
            return (
              <Link className="list-item" key={event.id} to={`/fechas/${event.id}`}>
                <div style={{ flex: 1 }}>
                  <b>{event.name}</b>
                  <p className="muted">{formatDate(event.date)} · {event.venue}</p>
                  <p className="muted">{redeemed}/{count} en puerta</p>
                </div>
                <Status status={event.status} />
              </Link>
            )
          })
        )}
      </section>
    </main>
  )
}
