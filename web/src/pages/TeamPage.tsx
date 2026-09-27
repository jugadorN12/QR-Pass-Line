import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import type { Role } from '../types'

const AVAILABLE_ROLES: { key: Role; label: string }[] = [
  { key: 'vendedor', label: 'Vendedor' },
  { key: 'canjeador', label: 'Canjeador' },
  { key: 'supervisor', label: 'Supervisor' },
  { key: 'organizador', label: 'Organizador' },
]

export function TeamPage() {
  const { currentUser, users, addMember, updateUserRole } = useApp()
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedRoles, setSelectedRoles] = useState<Role[]>(['vendedor'])

  const isManager = currentUser?.role === 'organizador' || currentUser?.role === 'admin' || currentUser?.roles?.includes('organizador') || currentUser?.roles?.includes('admin') || currentUser?.email?.toLowerCase() === 'simplemente_anibal@hotmail.com'

  const pendingUsers = users.filter(u => u.role === 'pendiente')


  function toggleSelectedRole(r: Role) {
    setSelectedRoles(prev =>
      prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]
    )
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (saving) return
    const form = new FormData(e.currentTarget)
    const email = String(form.get('email')).trim().toLowerCase()
    if (selectedRoles.length === 0) {
      setError('Seleccioná al menos un rol.')
      return
    }

    setSaving(true)
    setError('')
    try {
      await addMember({
        name: String(form.get('name')),
        email,
        password: String(form.get('password')),
        roles: selectedRoles,
      })
      setDone(true)
      setSelectedRoles(['vendedor'])
      e.currentTarget.reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo sumar al equipo.')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleUserRole(userId: string, targetRole: Role) {
    const user = users.find(u => u.id === userId)
    if (!user) return
    const currentRoles = user.roles && user.roles.length ? user.roles : (user.role ? [user.role] : [])
    let newRoles: Role[]
    if (currentRoles.includes(targetRole)) {
      newRoles = currentRoles.filter(r => r !== targetRole)
    } else {
      newRoles = [...currentRoles.filter(r => r !== 'pendiente'), targetRole]
    }
    if (newRoles.length === 0) {
      newRoles = ['pendiente']
    }
    try {
      await updateUserRole(userId, newRoles[0], user.venueId, newRoles)
    } catch (err) {
      alert('Error al actualizar roles del usuario.')
    }
  }

  return (
    <main className="page">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <Link to="/encargado" className="back-link" style={{ fontSize: 28, textDecoration: 'none', color: '#1e3a8a', fontWeight: 800 }}>‹</Link>
        <div>
          <p className="kicker" style={{ margin: 0 }}>Equipo</p>
          <h1 style={{ margin: 0, fontSize: 24 }}>Personas y roles</h1>
        </div>
      </div>

      {isManager ? (

        <div className="stack" style={{ gap: 24 }}>
          {pendingUsers.length > 0 && (
            <section className="card stack">
              <h2 style={{ color: 'var(--warn)' }}>Solicitudes pendientes ({pendingUsers.length})</h2>
              {pendingUsers.map(u => (
                <div key={u.id} className="list-item" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center' }}>
                  <div>
                    <b>{u.name}</b>
                    <p className="muted">{u.email}</p>
                  </div>
                  <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                    {AVAILABLE_ROLES.map(r => (
                      <button
                        key={r.key}
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '4px 10px', fontSize: 12 }}
                        onClick={() => void handleToggleUserRole(u.id, r.key)}
                        title={`Asignar rol de ${r.label}`}
                      >
                        + {r.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </section>
          )}

          <form className="card stack" onSubmit={submit}>
            <h2>Registrar nuevo integrante manualmente</h2>
            <p className="muted" style={{ fontSize: 13 }}>Podés asignarle uno o varios roles simultáneos:</p>
            <label className="field"><span>Nombre</span><input name="name" required /></label>
            <label className="field"><span>Email</span><input name="email" type="email" required /></label>
            <label className="field"><span>Contraseña inicial</span><input name="password" type="password" minLength={6} required /></label>
            
            <div className="field">
              <span>Roles asignados</span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                {AVAILABLE_ROLES.map(r => {
                  const active = selectedRoles.includes(r.key)
                  return (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => toggleSelectedRole(r.key)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 20,
                        border: active ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                        background: active ? '#eff6ff' : '#fff',
                        color: active ? '#1d4ed8' : '#475569',
                        fontWeight: active ? 700 : 500,
                        fontSize: 13,
                        cursor: 'pointer'
                      }}
                    >
                      {active ? '✓ ' : '+ '}{r.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {error ? <p className="error">{error}</p> : null}
            {done ? <p className="flash flash-ok">Persona agregada al equipo con sus roles.</p> : null}
            <button className="btn btn-primary btn-block">Agregar integrante</button>
          </form>
        </div>
      ) : null}

      <section className="card" style={{ marginTop: 24 }}>
        <h2>Personal actual ({users.filter(u => u.role !== 'pendiente' && u.role !== 'admin').length})</h2>
        <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>Tocá los botones de rol para activar o desactivar roles a cada integrante:</p>
        {users.filter(u => u.role !== 'pendiente' && u.role !== 'admin').map((user) => {
          const userRoles = user.roles && user.roles.length ? user.roles : (user.role ? [user.role] : [])
          return (
            <div className="list-item" key={user.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ minWidth: 160 }}>
                <b>{user.name}</b>
                <p className="muted" style={{ margin: 0, fontSize: 12 }}>{user.email}</p>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {AVAILABLE_ROLES.map(r => {
                  const isActive = userRoles.includes(r.key)
                  return (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => void handleToggleUserRole(user.id, r.key)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 14,
                        border: isActive ? '1px solid #2563eb' : '1px solid #e2e8f0',
                        background: isActive ? '#dbeafe' : '#f8fafc',
                        color: isActive ? '#1e40af' : '#94a3b8',
                        fontSize: 12,
                        fontWeight: isActive ? 700 : 400,
                        cursor: 'pointer'
                      }}
                      title={isActive ? `Quitar rol ${r.label}` : `Agregar rol ${r.label}`}
                    >
                      {isActive ? '✓ ' : '+ '}{r.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </section>
    </main>
  )
}

