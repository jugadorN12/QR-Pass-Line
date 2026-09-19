import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import type { Role } from '../types'

type RoleOption = {
  key: Role | 'encargado'
  label: string
  icon: string
}

const roleOptions: RoleOption[] = [
  {
    key: 'encargado',
    label: 'ENCARGADO',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
  },
  {
    key: 'organizador',
    label: 'ORGANIZADOR',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>'
  },
  {
    key: 'vendedor',
    label: 'VENDEDOR',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
  },
  {
    key: 'canjeador',
    label: 'CANJEADOR',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5c0-1.1.9-2 2-2h2"/><path d="M17 3h2c1.1 0 2 .9 2 2v2"/><path d="M21 17v2c0 1.1-.9 2-2 2h-2"/><path d="M7 21H5c-1.1 0-2-.9-2-2v-2"/><rect width="7" height="7" x="7" y="7" rx="1"/></svg>'
  },
]

export function RoleSelectionPage() {
  const { currentUser, logout, updateName, updateUserPassword } = useApp()
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileDialog, setProfileDialog] = useState<'name' | 'password' | null>(null)
  const [profileValue, setProfileValue] = useState('')
  const [profileError, setProfileError] = useState('')
  const [profilePhoto] = useState(() => localStorage.getItem('qr-pass-line.establishment-logo') ?? '')
  const navigate = useNavigate()

  if (!currentUser) return null

  // Redirección directa para Admins
  if ((currentUser.role as string) === 'admin') {
    return <Navigate to="/admin" replace />
  }

  const canUse = (role: RoleOption['key']) => {
    const r = currentUser.role as string
    if (role === 'encargado') return r === 'organizador' || r === 'admin'
    return r === role || r === 'organizador' || r === 'admin'
  }

  function selectRole(role: RoleOption['key']) {
    if (!canUse(role)) return
    if ((role as string) === 'admin') return navigate('/admin')
    navigate(role === 'encargado' ? '/encargado' : '/resumen')
  }

  const extendedRoleOptions = [...roleOptions]
  if ((currentUser.role as string) === 'admin') {
    extendedRoleOptions.push({
      key: 'admin' as any,
      label: 'ADMIN GENERAL',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'
    })
  }

  const availableRoleOptions = extendedRoleOptions.filter(option => canUse(option.key))

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
    <div className="role-screen">
      <header className="role-header">
        <div className="role-brand">
          <img src={localStorage.getItem('qr-pass-line.logo') || '/favicon.svg'} alt="" />
          <strong>QR Pass Line</strong>
        </div>
        <button className="role-exit-btn" type="button" onClick={() => setProfileOpen(true)} aria-label="Abrir perfil">
          <img src={profilePhoto || '/favicon.svg'} alt="Perfil" className="role-exit-avatar" />
        </button>
      </header>

      <main className="role-main">
        <section className="role-card role-user-card">
          <h1>Seleccioná tu rol.</h1>
          <div className="role-user">
            <div className="role-avatar">{currentUser.name.slice(0, 1).toUpperCase()}</div>
            <div>
              <strong>{currentUser.name}</strong>
              <small>{currentUser.email}</small>
            </div>
          </div>
        </section>

        <section className="role-card role-business-card">
          <div className="business-heading">
            <div className="business-logo"><img src={localStorage.getItem('qr-pass-line.establishment-logo') || localStorage.getItem('qr-pass-line.logo') || '/favicon.svg'} alt="" /></div>
            <div>
              <strong>{localStorage.getItem('qr-pass-line.business-name') || 'QR Pass Line'}</strong>
              <small>{currentUser.role === 'admin' ? 'Modo Superusuario' : `${availableRoleOptions.length} ${availableRoleOptions.length === 1 ? 'rol disponible' : 'roles disponibles'}`}</small>
            </div>
          </div>
          <div className="role-grid" style={availableRoleOptions.length > 4 ? { gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' } : undefined}>
            {availableRoleOptions.map((option) => {
              return (
                <button
                  className="role-option"
                  key={option.key}
                  type="button"
                  onClick={() => selectRole(option.key)}
                >
                  <span className="role-option-icon" dangerouslySetInnerHTML={{ __html: option.icon }} />
                  <strong>{option.label}</strong>
                </button>
              )
            })}
          </div>
        </section>

        <p className="role-footer">© 2026 QR Pass Line.</p>
      </main>

      {profileOpen ? <div className="profile-drawer-backdrop"><button className="profile-drawer-dismiss" type="button" aria-label="Cerrar perfil" onClick={() => setProfileOpen(false)} /><aside className="profile-drawer"><button className="profile-drawer-close" type="button" onClick={() => setProfileOpen(false)}>×</button><div className="profile-card"><img className="profile-avatar-image" src={profilePhoto || '/favicon.svg'} alt="Foto del usuario" /><div><strong>{currentUser?.name ?? 'Usuario'}</strong><small>{currentUser?.email ?? ''}</small></div></div><div className="profile-actions"><button type="button" onClick={() => setProfileOpen(false)}>♙<strong>Cambiar<br />rol</strong></button><button type="button">▣<strong>Cupones<br />comprados</strong></button><button type="button">?<strong>Ayuda</strong></button></div><div className="profile-links"><button type="button" onClick={() => { setProfileDialog('name'); setProfileValue(currentUser?.name ?? ''); setProfileError('') }}>♧ &nbsp; Cambiar nombre</button><button type="button" onClick={() => { setProfileDialog('password'); setProfileValue(''); setProfileError('') }}>⚿ &nbsp; Cambiar contraseña</button><button className="profile-logout" type="button" onClick={() => { void logout(); navigate('/ingresar') }}>Cerrar sesión</button></div></aside></div> : null}
      {profileDialog ? <div className="profile-dialog-backdrop"><form className="profile-dialog" onSubmit={saveProfile}><button className="profile-dialog-close" type="button" onClick={() => setProfileDialog(null)}>×</button><h2>{profileDialog === 'name' ? 'Cambiar nombre' : 'Cambiar contraseña'}</h2><label>{profileDialog === 'name' ? 'Nuevo nombre' : 'Nueva contraseña'}<input autoFocus type={profileDialog === 'password' ? 'password' : 'text'} value={profileValue} onChange={(event) => setProfileValue(event.target.value)} minLength={profileDialog === 'password' ? 6 : undefined} required /></label>{profileError ? <p className="error">{profileError}</p> : null}<button className="btn btn-primary" type="submit">Guardar</button></form></div> : null}
    </div>
  )
}
