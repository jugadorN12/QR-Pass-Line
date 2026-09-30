import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

export function StaffHeader() {
  const { currentUser, logout, updateName, updateUserPassword, updateUserAvatar, venues, activeVenue, setAdminActiveVenue } = useApp()
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileDialog, setProfileDialog] = useState<'name' | 'password' | null>(null)
  const [profileValue, setProfileValue] = useState('')
  const [profileError, setProfileError] = useState('')
  const profilePhoto = currentUser?.avatar || (currentUser?.email ? `https://unavatar.io/${encodeURIComponent(currentUser.email)}?fallback=https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name || 'User')}&background=193659&color=fff` : '/app-icon.png')
  const navigate = useNavigate()

  const isMasterAdmin =
    currentUser?.email?.toLowerCase() === 'simplemente_anibal@hotmail.com' ||
    currentUser?.role === 'admin' ||
    Boolean(currentUser?.roles?.includes('admin'))

  async function handleAvatarUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file || !currentUser) return
    const reader = new FileReader()
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string
      if (dataUrl && updateUserAvatar) {
        try {
          await updateUserAvatar(currentUser.id, dataUrl)
        } catch (err) {
          console.error('Error updating avatar:', err)
        }
      }
    }
    reader.readAsDataURL(file)
  }

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
    <>
      <header className="staff-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', gap: 8 }}>
        <div className="staff-brand" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => navigate(isMasterAdmin ? '/admin' : '/encargado')}>
          <img src={localStorage.getItem('qr-pass-line.logo') || '/app-icon.png'} alt="Nexo Software" />
          <strong>QR Pass Line</strong>
        </div>

        {isMasterAdmin && venues.length > 0 && (
          <div className="admin-header-venue-switcher" style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 20, padding: '3px 10px', gap: 6 }}>
            <span style={{ fontSize: 13, color: '#fff' }}>🏢</span>
            <select
              value={activeVenue?.id || ''}
              onChange={(e) => setAdminActiveVenue(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontSize: 12,
                fontWeight: 700,
                outline: 'none',
                cursor: 'pointer',
                maxWidth: 130,
              }}
              title="Cambiar local activo"
            >
              {venues.map((v) => (
                <option key={v.id} value={v.id} style={{ color: '#0b192c', background: '#fff' }}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <button className="manager-profile-trigger" type="button" onClick={() => setProfileOpen(true)} aria-label="Abrir perfil">
          <img src={profilePhoto} alt="Perfil" />
        </button>
      </header>

      {profileOpen ? (
        <div className="profile-drawer-backdrop">
          <button className="profile-drawer-dismiss" type="button" aria-label="Cerrar perfil" onClick={() => setProfileOpen(false)} />
          <aside className="profile-drawer">
            <button className="profile-drawer-close" type="button" onClick={() => setProfileOpen(false)}>×</button>
            <div className="profile-card">
              <img className="profile-avatar-image" src={profilePhoto} alt="Foto de perfil" />
              <div>
                <strong>{currentUser?.name ?? 'Usuario'}</strong>
                <small>{currentUser?.email ?? ''}</small>
              </div>
            </div>
            <div className="profile-actions">
              <button type="button" onClick={() => navigate('/seleccionar-rol')}>♙<strong>Cambiar<br />rol</strong></button>
              <button type="button">▣<strong>Cupones<br />comprados</strong></button>
              <button type="button" onClick={() => window.open('https://api.whatsapp.com/send?phone=5491131245112&text=Hola%2C%20necesito%20soporte%20con%20QR%20Pass%20Line', '_blank')}>?<strong>Ayuda</strong></button>
            </div>
            <div className="profile-links">
              {isMasterAdmin && (
                <button type="button" style={{ color: '#1e3a8a', fontWeight: 700 }} onClick={() => { setProfileOpen(false); navigate('/admin') }}>
                  👑 &nbsp; Panel Super Admin
                </button>
              )}
              <label className="profile-avatar-upload-btn" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <span>📷 &nbsp; Cambiar foto de perfil</span>
                <input type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} />
              </label>
              <button type="button" onClick={() => { setProfileDialog('name'); setProfileValue(currentUser?.name ?? ''); setProfileError('') }}>♧ &nbsp; Cambiar nombre</button>
              <button type="button" onClick={() => { setProfileDialog('password'); setProfileValue(''); setProfileError('') }}>⚿ &nbsp; Cambiar contraseña</button>
              <button className="profile-logout" type="button" onClick={async () => { await logout(); navigate('/ingresar', { replace: true }) }}>Cerrar sesión</button>
            </div>
          </aside>
        </div>
      ) : null}

      {profileDialog ? (
        <div className="profile-dialog-backdrop">
          <form className="profile-dialog" onSubmit={saveProfile}>
            <button className="profile-dialog-close" type="button" onClick={() => setProfileDialog(null)}>×</button>
            <h2>{profileDialog === 'name' ? 'Cambiar nombre' : 'Cambiar contraseña'}</h2>
            <label>
              {profileDialog === 'name' ? 'Nuevo nombre' : 'Nueva contraseña'}
              <input autoFocus type={profileDialog === 'password' ? 'password' : 'text'} value={profileValue} onChange={(event) => setProfileValue(event.target.value)} minLength={profileDialog === 'password' ? 6 : undefined} required />
            </label>
            {profileError ? <p className="error">{profileError}</p> : null}
            <button className="btn btn-primary" type="submit">Guardar</button>
          </form>
        </div>
      ) : null}
    </>
  )
}
