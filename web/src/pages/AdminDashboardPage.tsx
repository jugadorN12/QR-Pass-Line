import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import type { Role } from '../types'
import { CouponTemplateEditor } from '../components/CouponTemplateEditor'

export function AdminDashboardPage() {
  const { users, venues, updateUserRole, deleteUser, resetUserPasswordByEmail, createVenue, deleteVenue, addMember, logout } = useApp()
  const [tab, setTab] = useState<'users' | 'venues' | 'settings' | 'template'>('users')
  const [globalLogo, setGlobalLogo] = useState(() => localStorage.getItem('qr-pass-line.logo') ?? '')

  function handleLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => {
      const res = typeof reader.result === 'string' ? reader.result : ''
      setGlobalLogo(res)
      if (res) localStorage.setItem('qr-pass-line.logo', res)
      else localStorage.removeItem('qr-pass-line.logo')
      setMessage('Logo global actualizado con éxito.')
    }
    reader.readAsDataURL(file)
  }

  // State for user creation
  const [newUserName, setNewUserName] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserPass, setNewUserPass] = useState('')
  const [newUserRole, setNewUserRole] = useState<Role>('pendiente')
  const [newUserVenue, setNewUserVenue] = useState('')

  // State for venue creation
  const [venueName, setVenueName] = useState('')
  const [venueAddress, setVenueAddress] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [radius, setRadius] = useState('50')

  const [message, setMessage] = useState('')
  const [isGeocoding, setIsGeocoding] = useState(false)
  const navigate = useNavigate()

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault()
    setMessage('Creando usuario...')
    try {
      await addMember({
        name: newUserName,
        email: newUserEmail,
        password: newUserPass,
        role: newUserRole
      })
      const usersSnap = users.find(u => u.email === newUserEmail)
      if (usersSnap && newUserVenue) {
          await updateUserRole(usersSnap.id, newUserRole, newUserVenue)
      }

      setNewUserName('')
      setNewUserEmail('')
      setNewUserPass('')
      setNewUserRole('pendiente')
      setNewUserVenue('')
      setMessage('Usuario creado con éxito.')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error al crear usuario.')
    }
  }

  async function validateAddress() {
    if (!venueAddress.trim()) return
    setIsGeocoding(true)
    setMessage('Validando dirección...')
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(venueAddress)}`)
      const data = await response.json()
      if (data && data.length > 0) {
        setLat(data[0].lat)
        setLng(data[0].lon)
        setMessage('Dirección encontrada.')
      } else {
        setMessage('No se encontró la dirección. Verificá y probá de nuevo.')
      }
    } catch (err) {
      setMessage('Error al conectar con el servicio de mapas.')
    } finally {
      setIsGeocoding(false)
    }
  }

  async function handleCreateVenue(e: React.FormEvent) {
    e.preventDefault()
    try {
      await createVenue({
        name: venueName,
        address: venueAddress,
        latitude: Number(lat),
        longitude: Number(lng),
        radius: Number(radius) || 50
      })
      setVenueName('')
      setVenueAddress('')
      setLat('')
      setLng('')
      setRadius('50')
      setMessage('Establecimiento creado con éxito.')
    } catch (err) {
      setMessage('Error al crear establecimiento.')
    }
  }

  async function handleResetPassword(email: string) {
    if (!window.confirm(`¿Enviar email de reseteo a ${email}?`)) return
    try {
      await resetUserPasswordByEmail(email)
      alert('Email enviado correctamente.')
    } catch (err) {
      alert('Error al enviar el email.')
    }
  }

  async function handleDeleteUser(user: { id: string; name: string; email: string }) {
    if (user.email.toLowerCase() === 'simplemente_anibal@hotmail.com') {
      alert('No es posible eliminar al Administrador Principal.')
      return
    }
    if (!window.confirm(`¿Estás seguro de que deseas eliminar permanentemente a "${user.name}" (${user.email})?\n\nEsta acción borrará su cuenta del sistema y todas sus limitaciones asignadas.`)) {
      return
    }
    try {
      await deleteUser(user.id)
      setMessage(`Usuario "${user.name}" eliminado correctamente.`)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error al eliminar usuario.')
    }
  }

  return (
    <div className="org-screen">
      <header className="org-header">
        <div className="org-brand">
          <img src={localStorage.getItem('qr-pass-line.logo') || '/app-icon.png'} alt="" />
          <strong>Panel Administrador General</strong>
        </div>
        <button className="btn btn-ghost" type="button" onClick={async () => { await logout(); navigate('/ingresar', { replace: true }) }}>Salir</button>
      </header>

      <main className="org-main" style={{ maxWidth: 1100, margin: '24px auto', padding: '0 16px' }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, borderBottom: '1px solid #e2e8f0', paddingBottom: 12, flexWrap: 'wrap' }}>
          <button className={`btn ${tab === 'users' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('users')}>Usuarios ({users.length})</button>
          <button className={`btn ${tab === 'venues' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('venues')}>Locales ({venues.length})</button>
          <button className={`btn ${tab === 'settings' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('settings')}>Configuración Global</button>
          <button className={`btn ${tab === 'template' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('template')}>⚙️ Configurar Cupón</button>
        </div>

        {message && <div className="flash flash-ok" style={{ marginBottom: 20, borderRadius: 10, padding: 12 }}>{message}</div>}

        {tab === 'users' && (
          <div className="org-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 24, alignItems: 'start' }}>
            <section className="role-card" style={{ padding: 24, background: '#fff', borderRadius: 14, border: '1px solid #dce4ed', boxShadow: '0 4px 16px rgba(15,23,52,.04)' }}>
              <h2 style={{ fontSize: 17, color: '#0b192c', fontWeight: 800, marginBottom: 16 }}>Registrar nuevo usuario</h2>
              <form onSubmit={handleCreateUser} className="stack" style={{ gap: 12 }}>
                <label className="field"><span>Nombre y Apellido</span><input value={newUserName} onChange={e => setNewUserName(e.target.value)} required placeholder="Ej: Juan Pérez" /></label>
                <label className="field"><span>Correo electrónico</span><input type="email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} required placeholder="correo@ejemplo.com" /></label>
                <label className="field"><span>Contraseñas (mín. 6 caracteres)</span><input type="password" value={newUserPass} onChange={e => setNewUserPass(e.target.value)} required minLength={6} placeholder="••••••" /></label>
                <label className="field">
                  <span>Local / Establecimiento asignado</span>
                  <select value={newUserVenue} onChange={e => setNewUserVenue(e.target.value)}>
                    <option value="">Sin local (Global)</option>
                    {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </label>
                <label className="field">
                  <span>Rol inicial</span>
                  <select value={newUserRole} onChange={e => setNewUserRole(e.target.value as Role)}>
                    <option value="pendiente">Pendiente</option>
                    <option value="vendedor">Vendedor</option>
                    <option value="canjeador">Canjeador</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="validador">Validador</option>
                    <option value="organizador">Encargado (Organizador)</option>
                    <option value="admin">Superusuario (Admin)</option>
                  </select>
                </label>
                <button className="btn btn-primary btn-block" style={{ marginTop: 8 }}>CREAR USUARIO</button>
              </form>
            </section>

            <section className="role-card" style={{ padding: 24, background: '#fff', borderRadius: 14, border: '1px solid #dce4ed', boxShadow: '0 4px 16px rgba(15,23,52,.04)' }}>
              <div className="sellers-panel-heading" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: 12, marginBottom: 12 }}>
                <strong style={{ fontSize: 15, color: '#0b192c' }}>Usuarios registrados ({users.length})</strong>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f1', color: '#64748b', fontSize: 12 }}>
                      <th style={{ padding: '10px 12px' }}>Nombre / Email</th>
                      <th style={{ padding: '10px 12px' }}>Local</th>
                      <th style={{ padding: '10px 12px' }}>Rol Actual</th>
                      <th style={{ padding: '10px 12px' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => {
                      const isMainAdmin = user.email.toLowerCase() === 'simplemente_anibal@hotmail.com'
                      return (
                        <tr key={user.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
                          <td style={{ padding: '12px' }}>
                              <strong style={{ color: '#0b192c' }}>{user.name}</strong><br/>
                              <small className="muted" style={{ fontSize: 11 }}>{user.email}</small>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <select
                               value={user.venueId || ''}
                               onChange={(e) => void updateUserRole(user.id, user.role, e.target.value)}
                               style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12, background: '#f8fafc', color: '#152238' }}
                            >
                               <option value="">Sin local</option>
                               {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                            </select>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <select
                              value={user.role}
                              onChange={(e) => void updateUserRole(user.id, e.target.value as Role, user.venueId)}
                              style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12, background: '#f8fafc', color: '#152238' }}
                            >
                              <option value="pendiente">Pendiente</option>
                              <option value="vendedor">Vendedor</option>
                              <option value="canjeador">Canjeador</option>
                              <option value="supervisor">Supervisor</option>
                              <option value="validador">Validador</option>
                              <option value="organizador">Encargado</option>
                              <option value="admin">Admin</option>
                            </select>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              <button
                                className="btn btn-secondary"
                                style={{ padding: '6px 10px', fontSize: 11 }}
                                onClick={() => void handleResetPassword(user.email)}
                                title="Enviar email de reseteo de contraseña"
                              >
                                Reset
                              </button>
                              {!isMainAdmin && (
                                <button
                                  className="btn"
                                  style={{
                                    padding: '6px 10px',
                                    fontSize: 11,
                                    background: '#fee2e2',
                                    color: '#dc2626',
                                    border: '1px solid #fca5a5',
                                    borderRadius: 6,
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4
                                  }}
                                  onClick={() => void handleDeleteUser(user)}
                                  title="Eliminar usuario permanentemente"
                                >
                                  🗑️ Eliminar
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {tab === 'venues' && (
          <div className="org-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 24, alignItems: 'start' }}>
            <section className="role-card" style={{ padding: 24, background: '#fff', borderRadius: 14, border: '1px solid #dce4ed', boxShadow: '0 4px 16px rgba(15,23,52,.04)' }}>
              <h2 style={{ fontSize: 17, color: '#0b192c', fontWeight: 800, marginBottom: 16 }}>Registrar nuevo local</h2>
              <form onSubmit={handleCreateVenue} className="stack" style={{ gap: 14 }}>
                <label className="field"><span>Nombre del Boliche/Local</span><input value={venueName} onChange={e => setVenueName(e.target.value)} required placeholder="Ej: Cubano" /></label>
                <div className="field">
                  <span>Dirección</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input value={venueAddress} onChange={e => setVenueAddress(e.target.value)} required placeholder="Ej: Av. Corrientes 1234, CABA" style={{ flex: 1 }} />
                    <button className="btn btn-secondary" type="button" disabled={isGeocoding} onClick={() => void validateAddress()}>Validar GPS</button>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <label className="field"><span>Latitud</span><input value={lat} onChange={e => setLat(e.target.value)} required placeholder="-34.6037" /></label>
                  <label className="field"><span>Longitud</span><input value={lng} onChange={e => setLng(e.target.value)} required placeholder="-58.3816" /></label>
                </div>
                <label className="field"><span>Radio permitido de canje (metros)</span><input type="number" value={radius} onChange={e => setRadius(e.target.value)} required min={10} max={1000} /></label>
                <button className="btn btn-primary btn-block" style={{ marginTop: 8 }}>CREAR LOCAL</button>
              </form>
            </section>

            <section className="role-card" style={{ padding: 24, background: '#fff', borderRadius: 14, border: '1px solid #dce4ed', boxShadow: '0 4px 16px rgba(15,23,52,.04)' }}>
              <h2 style={{ fontSize: 17, color: '#0b192c', fontWeight: 800, marginBottom: 16 }}>Locales habilitados ({venues.length})</h2>
              <div className="stack" style={{ gap: 12 }}>
                {venues.map(v => (
                  <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                    <div>
                      <strong style={{ color: '#0b192c', display: 'block' }}>{v.name}</strong>
                      <small className="muted">{v.address} (Radio: {v.radius}m)</small>
                    </div>
                    <button className="btn btn-secondary" style={{ color: '#ef4444', borderColor: '#fca5a5' }} onClick={() => void deleteVenue(v.id)}>Eliminar</button>
                  </div>
                ))}
                {!venues.length && <p className="muted">No hay locales registrados.</p>}
              </div>
            </section>
          </div>
        )}

        {tab === 'settings' && (
          <div className="role-card" style={{ padding: 24, background: '#fff', borderRadius: 14, border: '1px solid #dce4ed', boxShadow: '0 4px 16px rgba(15,23,52,.04)', maxWidth: 500 }}>
            <h2 style={{ fontSize: 17, color: '#0b192c', fontWeight: 800, marginBottom: 16 }}>Logo Global de la Plataforma (Nexo Software)</h2>
            <p className="muted" style={{ fontSize: 13, marginBottom: 20 }}>Este logo se mostrará en la esquina superior izquierda de todas las pantallas administrativas.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
              <div style={{ width: 80, height: 80, borderRadius: 16, border: '2px dashed #cbd5e1', display: 'grid', placeItems: 'center', background: '#f8fafc', overflow: 'hidden' }}>
                {globalLogo ? <img src={globalLogo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 24 }}>🖼️</span>}
              </div>
              <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                <span>Subir Logo Global</span>
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogoChange} style={{ display: 'none' }} />
              </label>
            </div>
          </div>
        )}

        {tab === 'template' && (
          <CouponTemplateEditor />
        )}
      </main>
    </div>
  )
}
