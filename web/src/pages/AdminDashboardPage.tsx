import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import type { Role } from '../types'

export function AdminDashboardPage() {
  const { users, venues, updateUserRole, resetUserPasswordByEmail, createVenue, deleteVenue, addMember } = useApp()
  const [tab, setTab] = useState<'users' | 'venues' | 'settings'>('users')
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

  return (
    <div className="org-screen" style={{ minHeight: '100dvh', background: '#f2f5fa', display: 'flex', flexDirection: 'column' }}>
      <header className="org-header" style={{ height: 72, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', background: '#fff', borderBottom: '1px solid #e0e6ee' }}>
        <div className="org-brand" style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 800, fontSize: 18, color: '#102d4a' }}>
          <img src={localStorage.getItem('qr-pass-line.logo') || '/favicon.svg'} alt="Logo" style={{ width: 40, height: 40, objectFit: 'contain' }} />
          <strong>QR Pass Line <span style={{ color: '#16b7bd', fontSize: 13, fontWeight: 700 }}>[ADMIN]</span></strong>
        </div>
        <div className="row" style={{ gap: 12 }}>
           <button className="btn btn-ghost" style={{ fontSize: 13 }} onClick={() => navigate('/resumen')}>Ver como Organizador</button>
           <button className="btn btn-secondary" style={{ fontSize: 13 }} onClick={() => navigate('/seleccionar-rol')}>Cerrar Panel</button>
        </div>
      </header>

      <main className="org-main" style={{ width: 'min(1200px, calc(100% - 32px))', margin: '32px auto', flex: 1 }}>
        <section className="org-hero" style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 26, color: '#0b192c', fontWeight: 900, letterSpacing: '-0.03em' }}>Panel de Administración General 👋</h1>
          <p className="muted" style={{ fontSize: 14, marginTop: 4 }}>Control total de usuarios, boliches y geolocalización de la plataforma.</p>
        </section>

        <div className="tabs" style={{ marginBottom: 28, maxWidth: 450, background: '#e2e8f0', borderRadius: 999, padding: 4, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <button className={`btn ${tab === 'users' ? 'btn-primary' : 'btn-ghost'}`} style={{ borderRadius: 999, fontSize: 13 }} onClick={() => setTab('users')}>Usuarios</button>
          <button className={`btn ${tab === 'venues' ? 'btn-primary' : 'btn-ghost'}`} style={{ borderRadius: 999, fontSize: 13 }} onClick={() => setTab('venues')}>Locales</button>
          <button className={`btn ${tab === 'settings' ? 'btn-primary' : 'btn-ghost'}`} style={{ borderRadius: 999, fontSize: 13 }} onClick={() => setTab('settings')}>Logo Global</button>
        </div>

        {tab === 'settings' ? (
          <section className="role-card" style={{ padding: 28, background: '#fff', borderRadius: 14, border: '1px solid #dce4ed', boxShadow: '0 4px 16px rgba(15,23,52,.04)', maxWidth: 650 }}>
            <h2 style={{ fontSize: 18, color: '#0b192c', fontWeight: 800, marginBottom: 6 }}>Logo Global de la Plataforma</h2>
            <p className="muted" style={{ fontSize: 13, marginBottom: 20 }}>Este logo aparecerá en el encabezado superior izquierdo junto a "QR Pass Line" en toda la aplicación.</p>
            <div className="stack" style={{ gap: 20 }}>
              <div className="image-setting" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, background: '#f8fafc' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <img src={globalLogo || '/favicon.svg'} alt="Logo global" style={{ width: 56, height: 56, objectFit: 'contain', background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: 6 }} />
                  <div>
                    <strong style={{ display: 'block', fontSize: 13, color: '#152238' }}>Logo actual</strong>
                    <small className="muted" style={{ fontSize: 11 }}>Formato recomendado: SVG, PNG o JPG</small>
                  </div>
                </div>
                <label className="btn btn-primary" style={{ cursor: 'pointer', fontSize: 12, padding: '10px 16px' }}>
                  <span>Cambiar logo</span>
                  <input type="file" accept="image/*" onChange={handleLogoChange} style={{ display: 'none' }} />
                </label>
              </div>
              {message && <p className="flash flash-ok" style={{ padding: '12px 16px', borderRadius: 10, fontSize: 13 }}>{message}</p>}
            </div>
          </section>
        ) : tab === 'users' ? (
          <div className="org-layout" style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 24, alignItems: 'start' }}>
            <section className="role-card" style={{ padding: 24, background: '#fff', borderRadius: 14, border: '1px solid #dce4ed', boxShadow: '0 4px 16px rgba(15,23,52,.04)' }}>
              <h2 style={{ fontSize: 17, color: '#0b192c', fontWeight: 800, marginBottom: 16 }}>Registrar nuevo usuario</h2>
              <form onSubmit={handleCreateUser} className="stack" style={{ gap: 14 }}>
                <label className="field"><span>Nombre</span><input value={newUserName} onChange={e => setNewUserName(e.target.value)} required /></label>
                <label className="field"><span>Email</span><input type="email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} required /></label>
                <label className="field"><span>Contraseña</span><input type="password" value={newUserPass} onChange={e => setNewUserPass(e.target.value)} required minLength={6} /></label>
                <label className="field">
                  <span>Establecimiento</span>
                  <select value={newUserVenue} onChange={e => setNewUserVenue(e.target.value)}>
                    <option value="">Sin asignar (Global)</option>
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
                    {users.map(user => (
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
                          <button className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: 11 }} onClick={() => void handleResetPassword(user.email)}>Reset</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        ) : (
          <div className="org-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
            <section className="role-card" style={{ padding: 24, background: '#fff', borderRadius: 14, border: '1px solid #dce4ed', boxShadow: '0 4px 16px rgba(15,23,52,.04)' }}>
              <h2 style={{ fontSize: 17, color: '#0b192c', fontWeight: 800, marginBottom: 16 }}>Registrar nuevo local</h2>
              <form onSubmit={handleCreateVenue} className="stack" style={{ gap: 14 }}>
                <label className="field"><span>Nombre del Boliche/Local</span><input value={venueName} onChange={e => setVenueName(e.target.value)} required /></label>
                <div className="field">
                  <span>Dirección</span>
                  <div className="row" style={{ gap: 8 }}>
                    <input style={{ flex: 1 }} value={venueAddress} onChange={e => setVenueAddress(e.target.value)} placeholder="Ej: Av. Rivadavia 1234, CABA" required />
                    <button type="button" className="btn btn-secondary" onClick={validateAddress} disabled={isGeocoding}>Validar</button>
                  </div>
                </div>
                <div className="row" style={{ gap: 16 }}>
                  <label className="field" style={{ flex: 1 }}><span>Latitud</span><input type="number" step="any" value={lat} onChange={e => setLat(e.target.value)} required /></label>
                  <label className="field" style={{ flex: 1 }}><span>Longitud</span><input type="number" step="any" value={lng} onChange={e => setLng(e.target.value)} required /></label>
                </div>
                <label className="field"><span>Radio de validación (metros)</span><input type="number" value={radius} onChange={e => setRadius(e.target.value)} required /></label>
                {lat && lng && (
                  <a href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#2563eb', textDecoration: 'underline' }}>
                    Ver en Google Maps para confirmar
                  </a>
                )}
                {message && <p className="flash flash-ok" style={{ marginTop: 10, padding: 12, borderRadius: 10 }}>{message}</p>}
                <button className="btn btn-primary btn-block" style={{ marginTop: 8 }}>CREAR LOCAL GEOLOCALIZADO</button>
              </form>
            </section>

            <section className="role-card" style={{ padding: 24, background: '#fff', borderRadius: 14, border: '1px solid #dce4ed', boxShadow: '0 4px 16px rgba(15,23,52,.04)' }}>
              <h2 style={{ fontSize: 17, color: '#0b192c', fontWeight: 800, marginBottom: 16 }}>Locales registrados ({venues.length})</h2>
              <div style={{ display: 'grid', gap: 12, marginTop: 8 }}>
                {venues.map(v => (
                  <div key={v.id} className="list-item" style={{ justifyContent: 'space-between', padding: '14px 16px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', alignItems: 'center' }}>
                    <div>
                      <strong style={{ fontSize: 14, color: '#0b192c' }}>{v.name}</strong>
                      <p className="muted" style={{ fontSize: 12, marginTop: 2 }}>{v.address}</p>
                      <div className="row" style={{ gap: 8, marginTop: 6 }}>
                         <a href={`https://www.google.com/maps/search/?api=1&query=${v.latitude},${v.longitude}`} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#2563eb', textDecoration: 'underline' }}>
                           Ubicación: {v.latitude}, {v.longitude}
                         </a>
                         <span className="pill pill-ok" style={{ fontSize: 10 }}>Radio: {v.radius}m</span>
                      </div>
                    </div>
                    <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: 11 }} onClick={() => void deleteVenue(v.id)}>Eliminar</button>
                  </div>
                ))}
                {venues.length === 0 && <p className="muted" style={{ padding: 20, textAlign: 'center' }}>No hay locales registrados aún.</p>}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
