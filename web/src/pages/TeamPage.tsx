import { useState } from 'react'
import { useApp } from '../context/AppContext'
import type { Role } from '../types'

export function TeamPage() {
  const { currentUser, users, addMember, updateUserRole } = useApp()
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const pendingUsers = users.filter(u => u.role === 'pendiente')

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    try {
      await addMember({
        name: String(form.get('name')),
        email: String(form.get('email')),
        password: String(form.get('password')),
        role: String(form.get('role')) as Role
      })
      setDone(true)
      setError('')
      e.currentTarget.reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo sumar al equipo.')
    }
  }

  async function handleApprove(userId: string, role: Role) {
    try {
      await updateUserRole(userId, role)
      alert('Usuario aprobado y rol asignado correctamente.')
    } catch (err) {
      alert('Error al aprobar usuario.')
    }
  }

  return (
    <main className="page">
      <div>
        <p className="kicker">Equipo</p>
        <h1>Personas y roles</h1>
      </div>

      {currentUser?.role === 'organizador' || currentUser?.role === 'admin' ? (
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
                  <div className="row" style={{ gap: 8 }}>
                    <select
                      onChange={(e) => void handleApprove(u.id, e.target.value as Role)}
                      defaultValue=""
                      className="pill"
                      style={{ padding: '4px 8px', border: '1px solid #cbd5e1' }}
                    >
                      <option value="" disabled>Asignar rol...</option>
                      <option value="vendedor">Vendedor</option>
                      <option value="canjeador">Canjeador</option>
                      <option value="supervisor">Supervisor</option>
                      <option value="validador">Validador</option>
                      <option value="organizador">Organizador</option>
                    </select>
                  </div>
                </div>
              ))}
            </section>
          )}

          <form className="card stack" onSubmit={submit}>
            <h2>Registrar nuevo integrante manualmente</h2>
            <p className="muted" style={{ fontSize: 13 }}>Si la persona ya se registró, aparecerá arriba como pendiente. Si no, completá estos datos:</p>
            <label className="field"><span>Nombre</span><input name="name" required /></label>
            <label className="field"><span>Email</span><input name="email" type="email" required /></label>
            <label className="field"><span>Contraseña inicial</span><input name="password" type="password" minLength={6} required /></label>
            <label className="field">
              <span>Rol</span>
              <select name="role" defaultValue="vendedor">
                <option value="vendedor">Vendedor</option>
                <option value="canjeador">Canjeador</option>
                <option value="supervisor">Supervisor</option>
                <option value="validador">Validador</option>
                <option value="organizador">Organizador</option>
              </select>
            </label>
            {error ? <p className="error">{error}</p> : null}
            {done ? <p className="flash flash-ok">Persona agregada al equipo.</p> : null}
            <button className="btn btn-primary btn-block">Agregar integrante</button>
          </form>
        </div>
      ) : null}

      <section className="card" style={{ marginTop: 24 }}>
        <h2>Personal actual</h2>
        {users.filter(u => u.role !== 'pendiente').map((user) => (
          <div className="list-item" key={user.id}>
            <div style={{ flex: 1 }}>
              <b>{user.name}</b>
              <p className="muted">{user.email}</p>
            </div>
            <span className={`pill ${user.role === 'admin' ? 'pill-ok' : 'pill-muted'}`}>{user.role}</span>
          </div>
        ))}
      </section>
    </main>
  )
}
