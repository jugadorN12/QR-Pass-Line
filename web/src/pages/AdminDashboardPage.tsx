import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import type { Role } from '../types'
import { DottedQrImage } from '../components/DottedQrImage'
import { formatCouponSchedule } from '../lib/dateUtils'

export function AdminDashboardPage() {
  const { users, venues, updateUserRole, resetUserPasswordByEmail, createVenue, deleteVenue, addMember, logout, couponTemplate, saveCouponTemplate, qrCatalog, events } = useApp()
  const [tab, setTab] = useState<'users' | 'venues' | 'settings' | 'template'>('users')
  const [globalLogo, setGlobalLogo] = useState(() => localStorage.getItem('qr-pass-line.logo') ?? '')

  // Template Editor State
  const [templateConfig, setTemplateConfig] = useState(() => {
    if (couponTemplate) return couponTemplate
    const saved = localStorage.getItem('qr-pass-line.coupon-template')
    if (saved) {
      try { return JSON.parse(saved) } catch {}
    }
    return {
      qrY: 180,
      qrSize: 180,
      qrRadius: 24,
      brightness: 1,
      shadow: true
    }
  })

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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
            {/* Left Column: Controls */}
            <div className="role-card" style={{ padding: 24, background: '#fff', borderRadius: 16, border: '1px solid #dce4ed', boxShadow: '0 4px 16px rgba(15,23,52,.04)', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 900, color: '#0b192c', margin: 0 }}>Editor de Plantilla de Cupón</h2>
              <p className="muted" style={{ fontSize: 13, margin: 0 }}>Ajustá las coordenadas, tamaños y estilos del QR y los textos. Los cambios se sincronizan en la nube para todos los vendedores y clientes.</p>

              <label className="field">
                <span>Posición vertical QR (Y): {templateConfig.qrY}px</span>
                <input type="range" min={50} max={320} value={templateConfig.qrY} onChange={e => setTemplateConfig({ ...templateConfig, qrY: Number(e.target.value) })} style={{ width: '100%' }} />
              </label>

              <label className="field">
                <span>Tamaño del QR: {templateConfig.qrSize}px</span>
                <input type="range" min={120} max={280} value={templateConfig.qrSize} onChange={e => setTemplateConfig({ ...templateConfig, qrSize: Number(e.target.value) })} style={{ width: '100%' }} />
              </label>

              <label className="field">
                <span>Radio de esquinas QR (Bordes): {templateConfig.qrRadius}px</span>
                <input type="range" min={0} max={50} value={templateConfig.qrRadius} onChange={e => setTemplateConfig({ ...templateConfig, qrRadius: Number(e.target.value) })} style={{ width: '100%' }} />
              </label>

              <label className="field">
                <span>Brillo del Afiche: {Math.round(templateConfig.brightness * 100)}%</span>
                <input type="range" min={50} max={150} value={Math.round(templateConfig.brightness * 100)} onChange={e => setTemplateConfig({ ...templateConfig, brightness: Number(e.target.value) / 100 })} style={{ width: '100%' }} />
              </label>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>Sombras de texto y contenedor</span>
                <input type="checkbox" checked={templateConfig.shadow} onChange={e => setTemplateConfig({ ...templateConfig, shadow: e.target.checked })} style={{ width: 18, height: 18 }} />
              </div>

              {message && <p className="flash flash-ok" style={{ fontSize: 13, padding: 10, borderRadius: 8 }}>{message}</p>}

              <button
                className="btn btn-primary btn-block"
                type="button"
                onClick={async () => {
                  try {
                    await saveCouponTemplate(templateConfig)
                    setMessage('¡Plantilla de cupón guardada con éxito en la nube y aplicada a todos los dispositivos!')
                    setTimeout(() => setMessage(''), 4000)
                  } catch (err: any) {
                    setMessage('Error al guardar: ' + (err?.message || 'Error desconocido'))
                  }
                }}
                style={{ height: 48, borderRadius: 12, background: '#1e3a8a', fontWeight: 800, fontSize: 15 }}
              >
                GUARDAR CONFIGURACIÓN DE CUPÓN
              </button>
            </div>

            {/* Right Column: Real-Time Live Preview */}
            <div className="role-card" style={{ padding: 24, background: '#f8fafc', borderRadius: 16, border: '1px solid #dce4ed', boxShadow: '0 4px 16px rgba(15,23,42,.04)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, position: 'sticky', top: 20 }}>
              <strong style={{ fontSize: 14, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vista Preliminar en Tiempo Real</strong>

              {(() => {
                const sampleCoupon = qrCatalog.find((q) => q.backgroundImage) || qrCatalog[0]
                const activeEvent = events.find((e) => e.status === 'activo') || events[0]
                const posterBg = sampleCoupon?.backgroundImage || (activeEvent as any)?.backgroundImage || (activeEvent as any)?.imageUrl || localStorage.getItem('qr-pass-line.poster') || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80'

                return (
                  <div
                    style={{
                      width: 360,
                      height: 520,
                      borderRadius: 24,
                      backgroundImage: `url(${posterBg})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      filter: `brightness(${templateConfig.brightness})`,
                      padding: '20px',
                      color: '#fff',
                      boxShadow: templateConfig.shadow ? '0 20px 40px rgba(0,0,0,0.6)' : 'none',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Gradient Sombra Base */}
                    <div style={{ position: 'absolute', inset: '240px 0 0 0', background: 'linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,0.92))', pointerEvents: 'none' }} />

                    {/* QR Box with Live Template Config */}
                    <div
                      style={{
                        position: 'absolute',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        top: `${templateConfig.qrY}px`,
                        width: `${templateConfig.qrSize}px`,
                        height: `${templateConfig.qrSize}px`,
                        borderRadius: `${templateConfig.qrRadius}px`,
                        background: 'rgba(255, 255, 255, 0.78)',
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                        padding: 10,
                        display: 'grid',
                        placeItems: 'center',
                        zIndex: 2,
                        boxShadow: templateConfig.shadow ? '0 8px 32px rgba(0,0,0,0.3)' : 'none'
                      }}
                    >
                      <div style={{ width: templateConfig.qrSize - 20, height: templateConfig.qrSize - 20 }}>
                        <DottedQrImage value="DEMO-QR-CODE" size={templateConfig.qrSize - 20} />
                      </div>
                    </div>

                    {/* Bottom Details */}
                    <div style={{ position: 'absolute', bottom: 16, left: 0, right: 0, padding: '0 20px', zIndex: 2, textAlign: 'center' }}>
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.4)', borderBottom: '1px solid rgba(255,255,255,0.4)', padding: '8px 0', margin: '0 auto 10px', width: '92%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'rgba(255,255,255,0.9)', marginBottom: 4 }}>
                          <span>Cupón</span>
                          <span>Cant.</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 800 }}>
                          <span>INGRESO GENERAL 2AM</span>
                          <span style={{ color: '#ff4d4d' }}>1</span>
                        </div>
                      </div>

                      <p style={{ fontSize: 12, margin: '0 0 4px', color: 'rgba(255,255,255,0.9)', textShadow: templateConfig.shadow ? '0 1px 3px rgba(0,0,0,0.9)' : 'none' }}>
                        {formatCouponSchedule(activeEvent, sampleCoupon)}
                      </p>

                      <strong style={{ fontSize: 16, fontWeight: 900, letterSpacing: '0.04em', textTransform: 'uppercase', textShadow: templateConfig.shadow ? '0 2px 4px rgba(0,0,0,0.9)' : 'none' }}>
                        RR.PP: JOSE
                      </strong>
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
