import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

type ManagerTile = {
  label: string
  icon: string
  to: string
}

const tiles: ManagerTile[] = [
  { label: 'STAFF', icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke-opacity="0.5"/></svg>', to: '/equipo' },
  { label: 'ACCESOS', icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>', to: '/accesos' },
  { label: 'INFORMES', icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>', to: '/fechas' },
  { label: 'FECHAS', icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>', to: '/fechas' },
  { label: 'LINK PUBLICOS', icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>', to: '/fechas' },
  { label: 'BANEOS', icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m2 2 20 20"/><path d="M15 15a4 4 0 0 1-5.8-5.8"/><path d="M12 7a4 4 0 0 1 4 4"/><circle cx="12" cy="12" r="10"/></svg>', to: '/equipo' },
  { label: 'SOPORTE', icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2z"/><circle cx="12" cy="14" r="2"/></svg>', to: '/puerta' },
]

export function ManagerPage() {
  const { events, tickets, currentUser, logout, updateName, updateUserPassword } = useApp()
  const [staffOpen, setStaffOpen] = useState(false)
  const [accessOpen, setAccessOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileDialog, setProfileDialog] = useState<'name' | 'password' | null>(null)
  const [profileValue, setProfileValue] = useState('')
  const [profileError, setProfileError] = useState('')
  const [profilePhoto] = useState(() => localStorage.getItem('qr-pass-line.establishment-logo') ?? '')
  const navigate = useNavigate()
  const [selectedDate, setSelectedDate] = useState(() => {
    const active = events.find((event) => event.status === 'activo')
    return active ? (active.date.includes('T') ? active.date.split('T')[0] : active.date) : '2026-09-18'
  })

  function shiftDate(days: number) {
    const base = new Date(selectedDate + 'T00:00:00')
    base.setDate(base.getDate() + days)
    setSelectedDate(base.toISOString().split('T')[0])
  }

  const activeEvent = events.find((event) => (event.status === 'activo' || (event.date && event.date.startsWith(selectedDate)))) || events[0]
  const eventTickets = activeEvent ? tickets.filter((ticket) => ticket.eventId === activeEvent.id) : []
  const redeemed = eventTickets.filter((ticket) => ticket.redeemedAt).length
  const dateLabel = new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: 'short' })

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
        <div className="manager-brand"><img src={localStorage.getItem('qr-pass-line.logo') || '/app-icon.png'} alt="Logo Nexo Software" /><strong>QR Pass Line</strong></div>
        <button className="manager-profile-trigger" type="button" onClick={() => setProfileOpen(true)} aria-label="Abrir perfil"><img src={localStorage.getItem('qr-pass-line.establishment-logo') || localStorage.getItem('qr-pass-line.logo') || '/app-icon.png'} alt="Logo del boliche" /></button>
      </header>
      <main className="manager-page">
      <div className="manager-datebar">
        <button type="button" className="date-arrow" onClick={() => shiftDate(-1)} aria-label="Fecha anterior">‹</button>
        <strong>{dateLabel}</strong>
        <button type="button" className="date-arrow" onClick={() => shiftDate(1)} aria-label="Fecha siguiente">›</button>
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
            <span className="manager-tile-icon" dangerouslySetInnerHTML={{ __html: tiles[0].icon }} />
            <strong>STAFF</strong>
          </button>
        )}
        {accessOpen ? (
          <button className="manager-tile manager-tile-button" type="button" onClick={() => navigate('/qr')}>
            <span className="manager-tile-icon" dangerouslySetInnerHTML={{ __html: tiles[1].icon }} />
            <strong>QR</strong>
          </button>
        ) : (
          <button className="manager-tile manager-tile-button" type="button" onClick={() => setAccessOpen(true)}>
            <span className="manager-tile-icon" dangerouslySetInnerHTML={{ __html: tiles[1].icon }} />
            <strong>ACCESOS</strong>
          </button>
        )}
        {tiles.slice(2).map((tile) => (
          <Link className="manager-tile" to={tile.to} key={tile.label}>
            <span className="manager-tile-icon" dangerouslySetInnerHTML={{ __html: tile.icon }} />
            <strong>{tile.label}</strong>
          </Link>
        ))}
      </section>
      </main>
      {profileOpen ? <div className="profile-drawer-backdrop"><button className="profile-drawer-dismiss" type="button" aria-label="Cerrar perfil" onClick={() => setProfileOpen(false)} /><aside className="profile-drawer"><button className="profile-drawer-close" type="button" onClick={() => setProfileOpen(false)}>×</button><div className="profile-card"><img className="profile-avatar-image" src={profilePhoto || '/app-icon.png'} alt="Foto del encargado" /><div><strong>{currentUser?.name ?? 'Usuario'}</strong><small>{currentUser?.email ?? ''}</small></div></div><div className="profile-actions"><button type="button" onClick={() => navigate('/seleccionar-rol')}>♙<strong>Cambiar<br />rol</strong></button><button type="button">▣<strong>Cupones<br />comprados</strong></button><button type="button">?<strong>Ayuda</strong></button></div><div className="profile-links"><button type="button" onClick={() => { setProfileDialog('name'); setProfileValue(currentUser?.name ?? ''); setProfileError('') }}>♧ &nbsp; Cambiar nombre</button><button type="button" onClick={() => { setProfileDialog('password'); setProfileValue(''); setProfileError('') }}>⚿ &nbsp; Cambiar contraseña</button><button className="profile-logout" type="button" onClick={async () => { await logout(); navigate('/ingresar', { replace: true }) }}>Cerrar sesión</button></div></aside></div> : null}
      {profileDialog ? <div className="profile-dialog-backdrop"><form className="profile-dialog" onSubmit={saveProfile}><button className="profile-dialog-close" type="button" onClick={() => setProfileDialog(null)}>×</button><h2>{profileDialog === 'name' ? 'Cambiar nombre' : 'Cambiar contraseña'}</h2><label>{profileDialog === 'name' ? 'Nuevo nombre' : 'Nueva contraseña'}<input autoFocus type={profileDialog === 'password' ? 'password' : 'text'} value={profileValue} onChange={(event) => setProfileValue(event.target.value)} minLength={profileDialog === 'password' ? 6 : undefined} required /></label>{profileError ? <p className="error">{profileError}</p> : null}<button className="btn btn-primary" type="submit">Guardar</button></form></div> : null}
    </div>
  )
}
