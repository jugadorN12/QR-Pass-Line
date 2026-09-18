import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import type { Role } from '../types'

export function AdminDashboardPage() {
  const { users, venues, updateUserRole, resetUserPasswordByEmail, createVenue, deleteVenue, addMember } = useApp()
  const [tab, setTab] = useState<'users' | 'venues'>('users')

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
      // Nota: addMember ahora debe soportar pasar el venueId si el admin lo elige
      // Para simplificar, usamos updateUserRole después si es admin
      await addMember({
        name: newUserName,
        email: newUserEmail,
        password: newUserPass,
        role: newUserRole
      })
      // Si el admin eligió un local, lo asignamos (ya que addMember usa el local del creador por defecto)
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
    <div className="org-screen">
      <header className="org-header">
        <div className="org-brand">
          <img src={localStorage.getItem('qr-pass-line.logo') || '/favicon.svg'} alt="" />
          <strong>QR Pass Line [ADMIN]</strong>
        </div>
        <div className="row" style={{ gap: 12 }}>
           <button className="btn btn-ghost" onClick={() => navigate('/resumen')}>Ver como Organizador</button>
           <button className="btn btn-secondary" onClick={() => navigate('/seleccionar-rol')}>Cerrar Panel</button>
        </div>
      </header>

      <main className="org-main" style={{ maxWidth: 1200 }}>
        <section className="org-hero">
          <h1>Panel de Administración General 👋</h1>
          <p>Control total de usuarios, boliches y geolocalización.</p>
        </section>

        <div className="tabs" style={{ marginBottom: 24, maxWidth: 400 }}>
          <button className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}>Usuarios</button>
          <button className={tab === 'venues' ? 'active' : ''} onClick={() => setTab('venues')}>Locales</button>
        </div>

        {tab === 'users' ? (
          <div className="org-layout" style={{ gridTemplateColumns: '380px 1fr' }}>
            <section className="role-card" style={{ padding: 24 }}>
              <h2>Registrar nuevo usuario</h2>
              <form onSubmit={handleCreateUser} className="stack" style={{ marginTop: 16 }}>
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
                <button className="btn btn-primary btn-block">CREAR USUARIO</button>
              </form>
            </section>

            <section className="role-card" style={{ padding: 24 }}>
              <div className="sellers-panel-heading"><strong>Usuarios registrados</strong></div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16 }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f1' }}>
                      <th style={{ padding: 12 }}>Nombre / Email</th>
                      <th style={{ padding: 12 }}>Local</th>
                      <th style={{ padding: 12 }}>Rol Actual</th>
                      <th style={{ padding: 12 }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => (
                      <tr key={user.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: 12 }}>
                            <strong>{user.name}</strong><br/>
                            <small className="muted">{user.email}</small>
                        </td>
                        <td style={{ padding: 12 }}>
                          <select
                             value={user.venueId || ''}
                             onChange={(e) => void updateUserRole(user.id, user.role, e.target.value)}
                             style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #cbd5e1', fontSize: 11 }}
                          >
                             <option value="">Sin local</option>
                             {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: 12 }}>
                          <select
                            value={user.role}
                            onChange={(e) => void updateUserRole(user.id, e.target.value as Role, user.venueId)}
                            style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #cbd5e1', fontSize: 11 }}
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
                        <td style={{ padding: 12 }}>
                          <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => void handleResetPassword(user.email)}>Reset</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        ) : (
          <div className="org-layout" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <section className="role-card" style={{ padding: 24 }}>
              <h2>Registrar nuevo local</h2>
              <form onSubmit={handleCreateVenue} className="stack" style={{ marginTop: 16 }}>
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
                {message && <p className="flash flash-ok" style={{marginTop: 10}}>{message}</p>}
                <button className="btn btn-primary btn-block">CREAR LOCAL GEOLOCALIZADO</button>
              </form>
            </section>

            <section className="role-card" style={{ padding: 24 }}>
              <h2>Locales registrados</h2>
              <div style={{ marginTop: 16 }}>
                {venues.map(v => (
                  <div key={v.id} className="list-item" style={{ justifyContent: 'space-between', padding: '16px 0' }}>
                    <div>
                      <strong>{v.name}</strong>
                      <p className="muted" style={{ fontSize: 11 }}>{v.address}</p>
                      <div className="row" style={{gap: 8, marginTop: 4}}>
                         <a href={`https://www.google.com/maps/search/?api=1&query=${v.latitude},${v.longitude}`} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: '#2563eb' }}>
                           Ubicación: {v.latitude}, {v.longitude} (Abrir Mapa)
                         </a>
                         <span className="pill pill-ok" style={{fontSize: 9}}>Radio: {v.radius}m</span>
                      </div>
                    </div>
                    <button className="btn btn-ghost" style={{ color: 'red' }} onClick={() => void deleteVenue(v.id)}>Eliminar</button>
                  </div>
                ))}
                {venues.length === 0 && <p className="muted">No hay locales registrados aún.</p>}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
