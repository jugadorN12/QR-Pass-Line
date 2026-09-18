import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

export function Shell() {
  const { currentUser, logout } = useApp()
  const navigate = useNavigate()

  if (!currentUser) return null

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <img className="brand-mark" src={localStorage.getItem('qr-pass-line.logo') || '/favicon.svg'} alt="" />
          <div>
            <div>QR Pass Line</div>
            <small className="muted">{currentUser.name} · {labelRole(currentUser.role)}</small>
          </div>
        </div>
        <button
          className="btn btn-ghost"
          onClick={() => {
            logout()
            navigate('/ingresar')
          }}
        >
          Salir
        </button>
      </header>
      <div className="workspace">
        <aside className="side-nav">
          <p className="nav-caption">Operación</p>
          <NavLink to="/" end><span className="nav-icon">⌂</span>Resumen</NavLink>
          <NavLink to="/fechas"><span className="nav-icon">◷</span>Fechas</NavLink>
          <NavLink to="/puerta"><span className="nav-icon">⌗</span>Control de puerta</NavLink>
          <NavLink to="/equipo"><span className="nav-icon">◎</span>Equipo</NavLink>
        </aside>
        <Outlet />
      </div>
      <nav className="bottom-nav">
        <NavLink to="/" end><span>⌂</span>Inicio</NavLink>
        <NavLink to="/fechas"><span>◷</span>Fechas</NavLink>
        <NavLink to="/puerta"><span>⌗</span>Puerta</NavLink>
        <NavLink to="/equipo"><span>◎</span>Equipo</NavLink>
      </nav>
    </div>
  )
}

function labelRole(role: string) {
  if (role === 'organizador') return 'Organizador'
  if (role === 'vendedor') return 'Vendedor'
  return 'Canjeador'
}
