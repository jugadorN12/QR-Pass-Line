import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

type ManagerTile = {
  label: string
  icon: string
  to: string
}

const tiles: ManagerTile[] = [
  { label: 'STAFF', icon: '♙', to: '/equipo' },
  { label: 'ACCESOS', icon: '▣', to: '/accesos' },
  { label: 'INFORMES', icon: '⌁', to: '/fechas' },
  { label: 'FECHAS', icon: '▦', to: '/fechas' },
  { label: 'LINK PUBLICOS', icon: '◎', to: '/fechas' },
  { label: 'BANEOS', icon: '⌁', to: '/equipo' },
  { label: 'SOPORTE', icon: '?', to: '/puerta' },
]

export function ManagerPage() {
  const { events, tickets, currentUser, logout, updateName, updateUserPassword } = useApp()
  const [staffOpen, setStaffOpen] = useState(false)
  const [accessOpen, setAccessOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileDialog, setProfileDialog] = useState<'name' | 'password' | null>(null)
  const [profileValue, setProfileValue] = useState('')
  const [profileError, setProfileError] = useState('')
  const [profilePhoto] = useState(() => localStorage.getItem('qr-pass-line.logo') ?? '')
  const navigate = useNavigate()
  const activeEvent = events.find((event) => event.status === 'activo')
  const eventTickets = activeEvent ? tickets.filter((ticket) => ticket.eventId === activeEvent.id) : []
  const redeemed = eventTickets.filter((ticket) => ticket.redeemedAt).length
  const dateLabel = activeEvent
    ? new Date(activeEvent.date).toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: 'short' })
    : 'Sin fecha'

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      if (profileDialog === 'name') await updateName(profileValue)
      if (profileDialog === 'password') await updateUserPassword(profileValue)
      setProfileDialog(null)
      setProfileValue('')
      setProfileError('')
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'No se pudo actualizar el perfil.')
    }
  }

  return (
    <div className="manager-screen">
      <header className="manager-header">
        <div className="manager-brand"><img src={profilePhoto || '/favicon.svg'} alt="Logo QR Pass Line" /><strong>QR Pass Line</strong></div>
        <button className="manager-profile-trigger" type="button" onClick={() => setProfileOpen(true)} aria-label="Abrir perfil"><img src={profilePhoto || '/favicon.svg'} alt="Foto del encargado" /></button>
      </header>
      <main className="manager-page">
      <div className="manager-datebar">
        <button type="button" className="date-arrow" aria-label="Fecha anterior">‹</button>
        <strong>{dateLabel}</strong>
        <button type="button" className="date-arrow" aria-label="Fecha siguiente">›</button>
      </div>
      <div className="manager-refresh" aria-label="Actualizar">↻</div>

      <section className="manager-heading">
        <div>
          <h1>{currentUser?.name ?? 'QR Pass Line'}</h1>
          <span className="manager-heading-actions"><Link to="/encargado/configuracion" aria-label="Configurar establecimiento">⚙</Link><span>◉</span></span>
        </div>
      </section>

      <section className="manager-kpis">
        <article className="manager-kpi manager-kpi-sales"><span className="manager-kpi-icon">$</span><div><strong>$0</strong><small>VENTAS</small></div></article>
        <article className="manager-kpi manager-kpi-issued"><span className="manager-kpi-icon">▣</span><div><strong>{eventTickets.length}</strong><small>EMITIDOS</small></div></article>
        <article className="manager-kpi manager-kpi-redeemed"><span className="manager-kpi-icon">✓</span><div><strong>{redeemed}</strong><small>CANJEADOS</small></div></article>
        <article className="manager-kpi manager-kpi-pending"><span className="manager-kpi-icon">⌛</span><div><strong>{Math.max(0, eventTickets.length - redeemed)}</strong><small>POR CANJEAR</small></div></article>
      </section>

      <p className="manager-section-label">Accesos Principales</p>
      <section className={`manager-tiles ${staffOpen ? 'staff-is-open' : ''}`}>
        {staffOpen ? (
          <div className="staff-subtiles">
            <Link className="staff-subtile" to="/vendedores"><span>♙</span><strong>VENDEDORES</strong></Link>
            <Link className="staff-subtile" to="/canjeadores"><span>⌗</span><strong>CANJEADORES</strong></Link>
            <Link className="staff-subtile" to="/supervisores"><span>▣</span><strong>SUPERVISORES</strong></Link>
            <Link className="staff-subtile" to="/validadores"><span>♙</span><strong>VALIDADORES</strong></Link>
          </div>
        ) : (
          <button className="manager-tile manager-tile-button" type="button" onClick={() => setStaffOpen(true)}>
            <span className="manager-tile-icon">♙</span>
            <strong>STAFF</strong>
          </button>
        )}
        {accessOpen ? (
          <button className="manager-tile manager-tile-button" type="button" onClick={() => navigate('/qr')}>
            <span className="manager-tile-icon">⌗</span>
            <strong>QR</strong>
          </button>
        ) : (
          <button className="manager-tile manager-tile-button" type="button" onClick={() => setAccessOpen(true)}>
            <span className="manager-tile-icon">▣</span>
            <strong>ACCESOS</strong>
          </button>
        )}
        {tiles.slice(2).map((tile) => (
          <Link className="manager-tile" to={tile.to} key={tile.label}>
            <span className="manager-tile-icon">{tile.icon}</span>
            <strong>{tile.label}</strong>
          </Link>
        ))}
      </section>
      </main>
      {profileOpen ? <div className="profile-drawer-backdrop"><button className="profile-drawer-dismiss" type="button" aria-label="Cerrar perfil" onClick={() => setProfileOpen(false)} /><aside className="profile-drawer"><button className="profile-drawer-close" type="button" onClick={() => setProfileOpen(false)}>×</button><div className="profile-card"><img className="profile-avatar-image" src={profilePhoto || '/favicon.svg'} alt="Foto del encargado" /><div><strong>{currentUser?.name ?? 'Usuario'}</strong><small>{currentUser?.email ?? ''}</small></div></div><div className="profile-actions"><button type="button" onClick={() => navigate('/seleccionar-rol')}>♙<strong>Cambiar<br />rol</strong></button><button type="button">▣<strong>Cupones<br />comprados</strong></button><button type="button">?<strong>Ayuda</strong></button></div><div className="profile-links"><button type="button" onClick={() => { setProfileDialog('name'); setProfileValue(currentUser?.name ?? ''); setProfileError('') }}>♧ &nbsp; Cambiar nombre</button><button type="button" onClick={() => { setProfileDialog('password'); setProfileValue(''); setProfileError('') }}>⚿ &nbsp; Cambiar contraseña</button><button className="profile-logout" type="button" onClick={() => { void logout(); navigate('/ingresar') }}>Cerrar sesión</button></div></aside></div> : null}
      {profileDialog ? <div className="profile-dialog-backdrop"><form className="profile-dialog" onSubmit={saveProfile}><button className="profile-dialog-close" type="button" onClick={() => setProfileDialog(null)}>×</button><h2>{profileDialog === 'name' ? 'Cambiar nombre' : 'Cambiar contraseña'}</h2><label>{profileDialog === 'name' ? 'Nuevo nombre' : 'Nueva contraseña'}<input autoFocus type={profileDialog === 'password' ? 'password' : 'text'} value={profileValue} onChange={(event) => setProfileValue(event.target.value)} minLength={profileDialog === 'password' ? 6 : undefined} required /></label>{profileError ? <p className="error">{profileError}</p> : null}<button className="btn btn-primary" type="submit">Guardar</button></form></div> : null}
    </div>
  )
}
