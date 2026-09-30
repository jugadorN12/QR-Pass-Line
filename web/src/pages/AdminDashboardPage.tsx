import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import type { Role, User } from '../types'
import { CouponTemplateEditor } from '../components/CouponTemplateEditor'
import { UserAvatar } from '../components/UserAvatar'
import './AdminDashboard.css'

const AVAILABLE_ROLES: { key: Role; label: string; icon: string }[] = [
  { key: 'vendedor', label: 'Vendedor', icon: '🏷️' },
  { key: 'canjeador', label: 'Canjeador', icon: '🎟️' },
  { key: 'supervisor', label: 'Supervisor', icon: '👁️' },
  { key: 'organizador', label: 'Encargado', icon: '📋' },
  { key: 'admin', label: 'Admin', icon: '👑' },
]

export function AdminDashboardPage() {
  const { users, venues, updateUserRole, deleteUser, adminResetPassword, createVenue, deleteVenue, addMember, logout, activeVenue, setAdminActiveVenue } = useApp()
  const [tab, setTab] = useState<'users' | 'venues' | 'settings' | 'template'>('users')
  const [globalLogo, setGlobalLogo] = useState(() => localStorage.getItem('qr-pass-line.logo') ?? '')

  // Password reset modal state
  const [resetModalUser, setResetModalUser] = useState<User | null>(null)
  const [resetModalPass, setResetModalPass] = useState('123456')
  const [isResettingPass, setIsResettingPass] = useState(false)

  // UI State for toggling create panels
  const [showUserForm, setShowUserForm] = useState(false)
  const [showVenueForm, setShowVenueForm] = useState(false)

  // Filters & Search
  const [searchUser, setSearchUser] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [venueFilter, setVenueFilter] = useState<string>('all')

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
  const [venueManagerName, setVenueManagerName] = useState('')
  const [venueManagerEmail, setVenueManagerEmail] = useState('')
  const [venueManagerPassword, setVenueManagerPassword] = useState('')

  const [isSubmittingUser, setIsSubmittingUser] = useState(false)
  const [message, setMessage] = useState('')
  const [isGeocoding, setIsGeocoding] = useState(false)
  const navigate = useNavigate()

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

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault()
    if (isSubmittingUser) return
    const cleanMail = newUserEmail.trim().toLowerCase()
    if (!cleanMail) return

    const existing = users.find((u) => u.email.toLowerCase() === cleanMail)
    if (existing) {
      setMessage(`El usuario "${cleanMail}" ya está registrado. Modificalo en la lista.`)
      return
    }

    setIsSubmittingUser(true)
    setMessage('Creando usuario...')
    try {
      await addMember({
        name: newUserName,
        email: cleanMail,
        password: newUserPass,
        role: newUserRole
      })
      const usersSnap = users.find(u => u.email.toLowerCase() === cleanMail)
      if (usersSnap && newUserVenue) {
        await updateUserRole(usersSnap.id, newUserRole, newUserVenue)
      }

      setNewUserName('')
      setNewUserEmail('')
      setNewUserPass('')
      setNewUserRole('pendiente')
      setNewUserVenue('')
      setShowUserForm(false)
      setMessage('Usuario registrado con éxito.')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error al crear usuario.')
    } finally {
      setIsSubmittingUser(false)
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
        setMessage('📍 Dirección localizada con éxito en el mapa.')
      } else {
        setMessage('No se encontró la dirección. Verificá la escritura.')
      }
    } catch {
      setMessage('Error al conectar con el servicio de mapas.')
    } finally {
      setIsGeocoding(false)
    }
  }

  async function handleCreateVenue(e: React.FormEvent) {
    e.preventDefault()
    if (!venueName.trim()) return
    try {
      const createdVenue = await createVenue({
        name: venueName.trim(),
        address: venueAddress.trim(),
        latitude: Number(lat) || 0,
        longitude: Number(lng) || 0,
        radius: Number(radius) || 50
      })

      let managerMsg = ''
      if (venueManagerEmail.trim()) {
        const cleanMgrEmail = venueManagerEmail.trim().toLowerCase()
        const cleanMgrName = venueManagerName.trim() || 'Encargado'
        const cleanMgrPass = venueManagerPassword.trim() || '123456'
        await addMember({
          name: cleanMgrName,
          email: cleanMgrEmail,
          password: cleanMgrPass,
          role: 'organizador',
          roles: ['organizador'],
          venueId: createdVenue.id
        })
        managerMsg = ` y Encargado "${cleanMgrEmail}" creado con éxito.`
      }

      setVenueName('')
      setVenueAddress('')
      setLat('')
      setLng('')
      setRadius('50')
      setVenueManagerName('')
      setVenueManagerEmail('')
      setVenueManagerPassword('')
      setShowVenueForm(false)
      setMessage(`✓ Establecimiento "${venueName}" registrado${managerMsg}`)
    } catch (err: any) {
      setMessage(`Error al crear establecimiento: ${err?.message || 'Error desconocido'}`)
    }
  }

  function handleOpenResetModal(user: User) {
    setResetModalUser(user)
    setResetModalPass('123456')
  }

  async function handleConfirmResetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!resetModalUser || isResettingPass) return
    if (resetModalPass.length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    setIsResettingPass(true)
    try {
      await adminResetPassword(resetModalUser.id, resetModalPass)
      setMessage(`✓ Contraseña provisoria para "${resetModalUser.email}" actualizada a: ${resetModalPass}`)
      setResetModalUser(null)
    } catch (err: any) {
      alert(err instanceof Error ? err.message : 'Error al actualizar contraseña.')
    } finally {
      setIsResettingPass(false)
    }
  }

  async function handleDeleteUser(user: { id: string; name: string; email: string }) {
    if (user.email.toLowerCase() === 'simplemente_anibal@hotmail.com') {
      alert('No es posible eliminar al Administrador Principal.')
      return
    }
    if (!window.confirm(`¿Eliminar permanentemente a "${user.name}" (${user.email})?\n\nEsta acción borrará su cuenta y limitaciones.`)) {
      return
    }
    try {
      await deleteUser(user.id)
      setMessage(`Usuario "${user.name}" eliminado correctamente.`)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error al eliminar usuario.')
    }
  }

  // Filter users based on search and selected role / venue
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const q = searchUser.trim().toLowerCase()
      const matchesSearch = !q || user.name.toLowerCase().includes(q) || user.email.toLowerCase().includes(q)
      
      const userRoles = user.roles && user.roles.length ? user.roles : (user.role ? [user.role] : [])
      const matchesRole = roleFilter === 'all' || userRoles.includes(roleFilter as Role)
      
      const matchesVenue = venueFilter === 'all' || (venueFilter === 'none' ? !user.venueId : user.venueId === venueFilter)

      return matchesSearch && matchesRole && matchesVenue
    })
  }, [users, searchUser, roleFilter, venueFilter])

  return (
    <div className="admin-page-container">
      {/* Header */}
      <header className="admin-header">
        <div className="admin-header-inner">
          <div className="admin-brand">
            <img
              src={globalLogo || '/app-icon.png'}
              alt="Logo"
              className="admin-brand-logo"
            />
            <div className="admin-brand-info">
              <strong className="admin-brand-title">Panel General</strong>
              <span className="admin-brand-subtitle">Administración de Plataforma</span>
            </div>
          </div>
          <div className="admin-header-actions">
            <button
              className="admin-exit-btn"
              type="button"
              onClick={async () => {
                await logout()
                navigate('/ingresar', { replace: true })
              }}
            >
              <span>Salir</span> ✕
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="admin-main">
        {/* Navigation Tabs (Mobile Pill Bar) */}
        <nav className="admin-tabs-nav" aria-label="Navegación del Administrador">
          <button
            type="button"
            className={`admin-tab-btn ${tab === 'users' ? 'active' : ''}`}
            onClick={() => setTab('users')}
          >
            <span>👥 Usuarios</span>
            <span className="admin-tab-badge">{users.length}</span>
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${tab === 'venues' ? 'active' : ''}`}
            onClick={() => setTab('venues')}
          >
            <span>🏢 Locales</span>
            <span className="admin-tab-badge">{venues.length}</span>
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${tab === 'settings' ? 'active' : ''}`}
            onClick={() => setTab('settings')}
          >
            <span>⚙️ Logo / Ajustes</span>
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${tab === 'template' ? 'active' : ''}`}
            onClick={() => setTab('template')}
          >
            <span>🎟️ Cupón</span>
          </button>
        </nav>

        {/* Global Alert Notification */}
        {message && (
          <div className="admin-toast admin-toast-ok">
            <span>{message}</span>
            <button
              type="button"
              onClick={() => setMessage('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', color: 'inherit' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* =========================================================
            TAB 1: USUARIOS
           ========================================================= */}
        {tab === 'users' && (
          <div>
            {/* Top Action & Search Bar */}
            <div className="admin-section-header">
              <button
                type="button"
                className="admin-btn-action-primary"
                onClick={() => setShowUserForm(!showUserForm)}
              >
                {showUserForm ? '✕ Cancelar Registro' : '＋ Registrar Nuevo Usuario'}
              </button>
            </div>

            {/* Collapsible User Creation Form */}
            {showUserForm && (
              <section className="admin-form-card">
                <div className="admin-form-header">
                  <span className="admin-form-title">👤 Nuevo Usuario</span>
                  <button
                    type="button"
                    className="admin-form-close"
                    onClick={() => setShowUserForm(false)}
                  >
                    ✕
                  </button>
                </div>
                <form onSubmit={handleCreateUser}>
                  <div className="admin-form-grid">
                    <div className="admin-input-group">
                      <label>Nombre y Apellido</label>
                      <input
                        className="admin-input"
                        value={newUserName}
                        onChange={e => setNewUserName(e.target.value)}
                        required
                        placeholder="Ej: Juan Pérez"
                      />
                    </div>
                    <div className="admin-input-group">
                      <label>Correo Electrónico</label>
                      <input
                        className="admin-input"
                        type="email"
                        value={newUserEmail}
                        onChange={e => setNewUserEmail(e.target.value)}
                        required
                        placeholder="correo@ejemplo.com"
                      />
                    </div>
                    <div className="admin-input-group">
                      <label>Contraseña inicial (mín. 6 caracteres)</label>
                      <input
                        className="admin-input"
                        type="password"
                        value={newUserPass}
                        onChange={e => setNewUserPass(e.target.value)}
                        required
                        minLength={6}
                        placeholder="••••••••"
                      />
                    </div>
                    <div className="admin-input-group">
                      <label>Establecimiento Asignado</label>
                      <select
                        className="admin-select"
                        value={newUserVenue}
                        onChange={e => setNewUserVenue(e.target.value)}
                      >
                        <option value="">Sin local (Acceso Global)</option>
                        {venues.map(v => (
                          <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="admin-input-group" style={{ gridColumn: '1 / -1' }}>
                      <label>Rol Inicial</label>
                      <select
                        className="admin-select"
                        value={newUserRole}
                        onChange={e => setNewUserRole(e.target.value as Role)}
                      >
                        <option value="pendiente">⏳ Pendiente</option>
                        <option value="vendedor">🏷️ Vendedor</option>
                        <option value="canjeador">🎟️ Canjeador</option>
                        <option value="supervisor">👁️ Supervisor</option>
                        <option value="organizador">📋 Encargado (Organizador)</option>
                        <option value="admin">👑 Administrador</option>
                      </select>
                    </div>
                  </div>
                  <button
                    className="admin-btn-action-primary"
                    style={{ marginTop: 16, width: '100%' }}
                    disabled={isSubmittingUser}
                  >
                    {isSubmittingUser ? 'CREANDO USUARIO...' : 'GUARDAR Y REGISTRAR USUARIO'}
                  </button>
                </form>
              </section>
            )}

            {/* Search & Filters */}
            <div className="admin-filters-bar">
              <div className="admin-search-wrapper">
                <span className="admin-search-icon">🔍</span>
                <input
                  type="text"
                  className="admin-search-input"
                  placeholder="Buscar por nombre o email..."
                  value={searchUser}
                  onChange={e => setSearchUser(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <select
                  className="admin-filter-select"
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value)}
                  style={{ flex: 1 }}
                >
                  <option value="all">Todos los Roles</option>
                  <option value="vendedor">Vendedores</option>
                  <option value="canjeador">Canjeadores</option>
                  <option value="supervisor">Supervisores</option>
                  <option value="organizador">Encargados</option>
                  <option value="admin">Admins</option>
                  <option value="pendiente">Pendientes</option>
                </select>
                <select
                  className="admin-filter-select"
                  value={venueFilter}
                  onChange={e => setVenueFilter(e.target.value)}
                  style={{ flex: 1 }}
                >
                  <option value="all">Todos los Locales</option>
                  <option value="none">Sin local</option>
                  {venues.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Users List (Mobile First Cards) */}
            {filteredUsers.length === 0 ? (
              <div className="admin-empty-state">
                <p>No se encontraron usuarios con los filtros aplicados.</p>
              </div>
            ) : (
              <div className="admin-users-list">
                {filteredUsers.map(user => {
                  const isMainAdmin = user.email.toLowerCase() === 'simplemente_anibal@hotmail.com'
                  const userRoles = user.roles && user.roles.length ? user.roles : (user.role ? [user.role] : [])
                  
                  return (
                    <div key={user.id} className="admin-user-card">
                      {/* Card Header: Avatar, Name, Email */}
                      <div className="admin-user-card-header">
                        <div className="admin-user-info-row">
                          <UserAvatar
                            userId={user.id}
                            name={user.name}
                            email={user.email}
                            avatar={user.avatar}
                            size={44}
                          />
                          <div className="admin-user-names">
                            <span className="admin-user-name" title={user.name}>{user.name}</span>
                            <span className="admin-user-email" title={user.email}>{user.email}</span>
                          </div>
                        </div>
                        {isMainAdmin && (
                          <span className="admin-user-badge-main">SUPERADMIN</span>
                        )}
                      </div>

                      {/* Venue selector */}
                      <div className="admin-user-field">
                        <label className="admin-user-field-label">📍 Establecimiento</label>
                        <select
                          className="admin-user-venue-select"
                          value={user.venueId || ''}
                          onChange={(e) => void updateUserRole(user.id, user.role, e.target.value, userRoles)}
                        >
                          <option value="">Sin local (Global)</option>
                          {venues.map(v => (
                            <option key={v.id} value={v.id}>{v.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Role Chips */}
                      <div className="admin-user-field">
                        <label className="admin-user-field-label">🏷️ Roles Asignados ({userRoles.length})</label>
                        <div className="admin-roles-chips">
                          {AVAILABLE_ROLES.map(({ key, label, icon }) => {
                            const isActive = userRoles.includes(key)
                            return (
                              <button
                                key={key}
                                type="button"
                                className={`admin-role-chip ${isActive ? (key === 'admin' ? 'active-admin' : 'active') : ''}`}
                                onClick={() => {
                                  let newRoles: Role[]
                                  if (isActive) {
                                    newRoles = userRoles.filter(x => x !== key)
                                  } else {
                                    newRoles = [...userRoles.filter(x => x !== 'pendiente'), key]
                                  }
                                  if (newRoles.length === 0) newRoles = ['pendiente']
                                  void updateUserRole(user.id, newRoles[0], user.venueId, newRoles)
                                }}
                              >
                                <span>{isActive ? '✓' : '+'}</span>
                                <span>{icon} {label}</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Card Actions Footer */}
                      <div className="admin-user-card-actions">
                        <button
                          type="button"
                          className="admin-btn-reset"
                          onClick={() => handleOpenResetModal(user)}
                          title="Asignar contraseña provisoria directa sin correos"
                        >
                          🔑 Resetear Clave
                        </button>
                        {!isMainAdmin && (
                          <button
                            type="button"
                            className="admin-btn-delete"
                            onClick={() => void handleDeleteUser(user)}
                            title="Eliminar este usuario definitivamente"
                          >
                            🗑️ Eliminar
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* =========================================================
            TAB 2: LOCALES / ESTABLECIMIENTOS
           ========================================================= */}
        {tab === 'venues' && (
          <div>
            <div className="admin-section-header">
              <button
                type="button"
                className="admin-btn-action-primary"
                onClick={() => setShowVenueForm(!showVenueForm)}
              >
                {showVenueForm ? '✕ Cancelar' : '＋ Registrar Nuevo Local'}
              </button>
            </div>

            {/* Collapsible Venue Form */}
            {showVenueForm && (
              <section className="admin-form-card">
                <div className="admin-form-header">
                  <span className="admin-form-title">🏢 Nuevo Local / Establecimiento</span>
                  <button
                    type="button"
                    className="admin-form-close"
                    onClick={() => setShowVenueForm(false)}
                  >
                    ✕
                  </button>
                </div>
                <form onSubmit={handleCreateVenue}>
                  <div className="admin-form-grid">
                    <div className="admin-input-group" style={{ gridColumn: '1 / -1' }}>
                      <label>Nombre del Establecimiento / Boliche</label>
                      <input
                        className="admin-input"
                        value={venueName}
                        onChange={e => setVenueName(e.target.value)}
                        required
                        placeholder="Ej: Club Nocturno Oasis"
                      />
                    </div>
                    <div className="admin-input-group" style={{ gridColumn: '1 / -1' }}>
                      <label>Dirección física</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          className="admin-input"
                          value={venueAddress}
                          onChange={e => setVenueAddress(e.target.value)}
                          required
                          placeholder="Ej: Av. Corrientes 1234, CABA"
                          style={{ flex: 1 }}
                        />
                        <button
                          type="button"
                          className="admin-btn-reset"
                          style={{ whiteSpace: 'nowrap', padding: '0 16px', background: '#e2e8f0' }}
                          disabled={isGeocoding}
                          onClick={() => void validateAddress()}
                        >
                          {isGeocoding ? 'Buscando...' : '📍 Validar GPS'}
                        </button>
                      </div>
                    </div>
                    <div className="admin-input-group">
                      <label>Latitud GPS</label>
                      <input
                        className="admin-input"
                        value={lat}
                        onChange={e => setLat(e.target.value)}
                        required
                        placeholder="-34.6037"
                      />
                    </div>
                    <div className="admin-input-group">
                      <label>Longitud GPS</label>
                      <input
                        className="admin-input"
                        value={lng}
                        onChange={e => setLng(e.target.value)}
                        required
                        placeholder="-58.3816"
                      />
                    </div>
                    <div className="admin-input-group" style={{ gridColumn: '1 / -1' }}>
                      <label>Radio permitido para canjes (en metros)</label>
                      <input
                        className="admin-input"
                        type="number"
                        value={radius}
                        onChange={e => setRadius(e.target.value)}
                        required
                        min={10}
                        max={2000}
                        placeholder="50"
                      />
                    </div>

                    {/* Optional Manager Account Creation */}
                    <div style={{ gridColumn: '1 / -1', marginTop: 12, padding: 14, background: '#f8fafc', borderRadius: 12, border: '1px dashed #cbd5e1' }}>
                      <strong style={{ fontSize: 13, color: '#1e3a8a', display: 'block', marginBottom: 8 }}>
                        👤 Asignar Encargado Inicial del Local (Opcional)
                      </strong>
                      <div className="admin-form-grid" style={{ gap: 10 }}>
                        <div className="admin-input-group">
                          <label>Nombre del Encargado</label>
                          <input
                            className="admin-input"
                            value={venueManagerName}
                            onChange={e => setVenueManagerName(e.target.value)}
                            placeholder="Ej: Juan Pérez"
                          />
                        </div>
                        <div className="admin-input-group">
                          <label>Email de Acceso</label>
                          <input
                            className="admin-input"
                            type="email"
                            value={venueManagerEmail}
                            onChange={e => setVenueManagerEmail(e.target.value)}
                            placeholder="encargado@boliche.com"
                          />
                        </div>
                        <div className="admin-input-group" style={{ gridColumn: '1 / -1' }}>
                          <label>Contraseña Inicial</label>
                          <input
                            className="admin-input"
                            type="password"
                            value={venueManagerPassword}
                            onChange={e => setVenueManagerPassword(e.target.value)}
                            placeholder="Mínimo 6 caracteres (ej: 123456)"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    className="admin-btn-action-primary"
                    style={{ marginTop: 16, width: '100%' }}
                  >
                    GUARDAR LOCAL Y CREAR ENCARGADO
                  </button>
                </form>
              </section>
            )}

            {/* Venues List */}
            {venues.length === 0 ? (
              <div className="admin-empty-state">
                <p>No hay locales registrados aún.</p>
              </div>
            ) : (
              <div className="admin-venues-list">
                {venues.map(v => (
                  <div key={v.id} className="admin-venue-card">
                    <div className="admin-venue-header">
                      <div className="admin-venue-icon">🏢</div>
                      <div className="admin-venue-details">
                        <div className="admin-venue-name">{v.name}</div>
                        <div className="admin-venue-address">📍 {v.address}</div>
                        <div className="admin-venue-meta">
                          <span className="admin-venue-tag">🎯 Radio: {v.radius || 50}m</span>
                          {v.latitude && v.longitude && (
                            <span className="admin-venue-tag">🌐 GPS Configurado</span>
                          )}
                          {activeVenue?.id === v.id && (
                            <span className="admin-venue-tag" style={{ background: '#dcfce7', color: '#15803d', fontWeight: 800 }}>✓ ACTIVO AHORA</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="admin-user-card-actions">
                      <button
                        type="button"
                        className="admin-btn-reset"
                        style={{ background: '#1e3a8a', color: '#fff', fontWeight: 700 }}
                        onClick={() => {
                          setAdminActiveVenue(v.id)
                          navigate('/encargado')
                        }}
                      >
                        👁️ Ver Panel de este Local
                      </button>
                      <button
                        type="button"
                        className="admin-btn-delete"
                        onClick={() => {
                          if (window.confirm(`¿Eliminar local "${v.name}"?`)) {
                            void deleteVenue(v.id)
                          }
                        }}
                      >
                        🗑️ Eliminar Local
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* =========================================================
            TAB 3: CONFIGURACIÓN GLOBAL / LOGO
           ========================================================= */}
        {tab === 'settings' && (
          <section className="admin-settings-card">
            <h2 style={{ fontSize: 17, color: '#0f172a', fontWeight: 800, margin: '0 0 8px' }}>
              🖼️ Logo Global de la Plataforma
            </h2>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px', lineHeight: 1.4 }}>
              Este logo se mostrará en el encabezado de todas las pantallas de administración y control.
            </p>
            <div className="admin-logo-upload-box">
              <img
                src={globalLogo || '/app-icon.png'}
                alt="Logo Actual"
                className="admin-logo-preview"
              />
              <label
                className="admin-btn-action-primary"
                style={{ cursor: 'pointer', textAlign: 'center' }}
              >
                <span>📁 Cambiar Logo</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleLogoChange}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </section>
        )}

        {/* =========================================================
            TAB 4: CONFIGURAR PLANTILLA DE CUPÓN
           ========================================================= */}
        {tab === 'template' && (
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <CouponTemplateEditor />
          </div>
        )}
      </main>

      {/* =========================================================
          MODAL: RESETEAR CONTRASEÑA DIRECTA (OPCIÓN A)
         ========================================================= */}
      {resetModalUser && (
        <div className="admin-modal-backdrop" onClick={() => setResetModalUser(null)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 24 }}>🔑</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: 17, color: '#0f172a', fontWeight: 800 }}>
                    Asignar Clave Provisoria
                  </h3>
                  <span style={{ fontSize: 12, color: '#64748b' }}>
                    Cambio directo sin depender de emails
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => setResetModalUser(null)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 14px' }}>
                <div style={{ fontSize: 13, color: '#475569', fontWeight: 700 }}>{resetModalUser.name}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{resetModalUser.email}</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                  Nueva Contraseña Provisoria:
                </label>
                <input
                  type="text"
                  value={resetModalPass}
                  onChange={(e) => setResetModalPass(e.target.value)}
                  placeholder="Ej: 123456"
                  required
                  minLength={6}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 14,
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                  }}
                  autoFocus
                />
                <span style={{ fontSize: 11, color: '#64748b' }}>
                  El usuario ingresará con esta clave y se le solicitará definir su propia contraseña al entrar.
                </span>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setResetModalUser(null)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    color: '#475569',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isResettingPass}
                  style={{
                    padding: '10px 18px',
                    borderRadius: 8,
                    border: 'none',
                    background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  {isResettingPass ? 'Guardando...' : '✓ Guardar Clave'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
