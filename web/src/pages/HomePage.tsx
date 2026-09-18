import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { formatDate } from '../lib/ids'

export function HomePage() {
  const { currentUser, events, tickets } = useApp()
  const next = events.find((e) => e.status === 'activo') ?? events[0]
  const ofNext = next ? tickets.filter((t) => t.eventId === next.id) : []
  const inDoor = ofNext.filter((t) => t.redeemedAt).length

  return (
    <main className="page">
      <section>
        <p className="kicker">Hoy</p>
        <h1>Hola, {currentUser?.name.split(' ')[0]}</h1>
      </section>
      <section className="card stack">
        {next ? (
          <>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div>
                <p className="kicker">Próxima fecha</p>
                <h2>{next.name}</h2>
                <p className="muted">{formatDate(next.date)} · {next.venue}</p>
              </div>
              <Status status={next.status} />
            </div>
            <div className="kpi-grid">
              <div className="kpi"><b>{ofNext.length}</b><span>Emitidos</span></div>
              <div className="kpi"><b>{inDoor}</b><span>En puerta</span></div>
              <div className="kpi"><b>{ofNext.length - inDoor}</b><span>Pendientes</span></div>
            </div>
            <div className="row">
              <Link className="btn btn-primary" to={`/fechas/${next.id}`}>Abrir fecha</Link>
              <Link className="btn btn-secondary" to="/puerta">Ir a puerta</Link>
            </div>
          </>
        ) : (
          <>
            <h2>Todavía no hay fechas</h2>
            <p className="muted">Creá la primera noche para emitir QR y controlar el ingreso.</p>
            <Link className="btn btn-primary" to="/fechas/nueva">Nueva fecha</Link>
          </>
        )}
      </section>
      <section className="card">
        <h2>Atajos</h2>
        <Link className="list-item" to="/fechas/nueva">
          <div>
            <b>Crear fecha</b>
            <p className="muted">Nombre, horario de puerta y estado.</p>
          </div>
        </Link>
        <Link className="list-item" to="/equipo">
          <div>
            <b>Equipo</b>
            <p className="muted">Vendedores y canjeadores.</p>
          </div>
        </Link>
      </section>
    </main>
  )
}

export function Status({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    activo: ['pill pill-ok', 'Activo'],
    borrador: ['pill pill-warn', 'Borrador'],
    cerrado: ['pill pill-muted', 'Cerrado'],
  }
  const [cls, label] = map[status] ?? ['pill pill-muted', status]
  return <span className={cls}>{label}</span>
}
