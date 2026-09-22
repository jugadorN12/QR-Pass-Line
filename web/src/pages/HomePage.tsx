import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

export function HomePage() {
  const { currentUser, users, logout, updateName, updateUserPassword } = useApp()
  const [profileOpen, setProfileOpen] = useState(false)

  const pendingCount = users.filter(u => u.role === 'pendiente').length
  const [profileDialog, setProfileDialog] = useState<'name' | 'password' | null>(null)
  const [profileValue, setProfileValue] = useState('')
  const [profileError, setProfileError] = useState('')
  const [profilePhoto] = useState(() => localStorage.getItem('qr-pass-line.establishment-logo') ?? '')
  const navigate = useNavigate()

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
    <div className="org-screen">
      <header className="org-header">
        <div className="org-brand">
          <img src={localStorage.getItem('qr-pass-line.logo') || '/app-icon.png'} alt="" />
          <strong>QR Pass Line</strong>
        </div>
        <button className="role-exit-btn" type="button" onClick={() => setProfileOpen(true)} aria-label="Abrir perfil">
          <img src={profilePhoto || '/app-icon.png'} alt="Perfil" className="role-exit-avatar" />
        </button>
      </header>

      <main className="org-main">
        {pendingCount > 0 && (
          <div className="flash flash-warn" style={{ marginBottom: 20, cursor: 'pointer' }} onClick={() => navigate('/equipo')}>
            ⚠️ Hay {pendingCount} {pendingCount === 1 ? 'usuario esperando' : 'usuarios esperando'} aprobación de rol. Ir a Equipo.
          </div>
        )}
        <section className="org-hero">
          <h1>¡Hola, {currentUser?.name.split(' ')[0]}! 👋</h1>
          <p>Gestioná todo lo que necesitás, desde acá.</p>
        </section>

        <div className="org-layout">
          <aside className="org-sidebar">
            <button className="org-menu-item" type="button" onClick={() => navigate('/vendedores')}>
              <span>Vendedores <span className="badge-new">Nuevo</span></span>
              <span className="org-arrow">›</span>
            </button>
          </aside>

          <section className="org-content">
            <div className="org-panel">
              <div className="org-panel-header">
                <h2>Informes</h2>
                <span className="org-panel-icon">^</span>
              </div>
              <div className="org-panel-body">
                <button className="org-menu-item" type="button" onClick={() => navigate('/fechas')}>
                  <span>Limitados, Emitidos y Canjeados</span>
                  <span className="org-arrow">›</span>
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>

      {profileOpen ? <div className="profile-drawer-backdrop"><button className="profile-drawer-dismiss" type="button" aria-label="Cerrar perfil" onClick={() => setProfileOpen(false)} /><aside className="profile-drawer"><button className="profile-drawer-close" type="button" onClick={() => setProfileOpen(false)}>×</button><div className="profile-card"><img className="profile-avatar-image" src={profilePhoto || '/app-icon.png'} alt="Foto del usuario" /><div><strong>{currentUser?.name ?? 'Usuario'}</strong><small>{currentUser?.email ?? ''}</small></div></div><div className="profile-actions"><button type="button" onClick={() => navigate('/seleccionar-rol')}>♙<strong>Cambiar<br />rol</strong></button><button type="button">▣<strong>Cupones<br />comprados</strong></button><button type="button">?<strong>Ayuda</strong></button></div><div className="profile-links"><button type="button" onClick={() => { setProfileDialog('name'); setProfileValue(currentUser?.name ?? ''); setProfileError('') }}>♧ &nbsp; Cambiar nombre</button><button type="button" onClick={() => { setProfileDialog('password'); setProfileValue(''); setProfileError('') }}>⚿ &nbsp; Cambiar contraseña</button><button className="profile-logout" type="button" onClick={async () => { await logout(); navigate('/ingresar', { replace: true }) }}>Cerrar sesión</button></div></aside></div> : null}
      {profileDialog ? <div className="profile-dialog-backdrop"><form className="profile-dialog" onSubmit={saveProfile}><button className="profile-dialog-close" type="button" onClick={() => setProfileDialog(null)}>×</button><h2>{profileDialog === 'name' ? 'Cambiar nombre' : 'Cambiar contraseña'}</h2><label>{profileDialog === 'name' ? 'Nuevo nombre' : 'Nueva contraseña'}<input autoFocus type={profileDialog === 'password' ? 'password' : 'text'} value={profileValue} onChange={(event) => setProfileValue(event.target.value)} minLength={profileDialog === 'password' ? 6 : undefined} required /></label>{profileError ? <p className="error">{profileError}</p> : null}<button className="btn btn-primary" type="submit">Guardar</button></form></div> : null}
    </div>
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
