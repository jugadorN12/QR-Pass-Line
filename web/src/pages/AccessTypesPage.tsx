import { Link } from 'react-router-dom'
import { StaffHeader } from '../components/StaffHeader'

export function AccessTypesPage() {
  return (
    <div className="staff-page">
      <StaffHeader />
      <div className="staff-layout">
        <aside className="staff-sidebar">
          <Link className="staff-sidebar-control" to="/encargado">‹</Link>
          <Link to="/encargado">⌂</Link>
          <Link to="/vendedores">♙</Link>
          <Link className="active" to="/accesos">▣</Link>
          <Link to="/fechas">⌁</Link>
          <Link to="/fechas">▦</Link>
          <Link to="/equipo">◎</Link>
          <Link to="/puerta">?</Link>
        </aside>
        <main className="sellers-main access-types-page">
          <div className="sellers-titlebar"><Link to="/encargado" className="back-link">‹</Link><h1>Accesos</h1></div>
          <p className="manager-section-label">Tipos de acceso</p>
          <section className="access-types-grid">
            <Link className="manager-tile access-type-tile" to="/qr">
              <span className="manager-tile-icon">⌗</span>
              <strong>QR</strong>
            </Link>
          </section>
        </main>
      </div>
    </div>
  )
}
