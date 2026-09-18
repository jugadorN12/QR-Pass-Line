import { useState } from 'react'
import { useApp } from '../context/AppContext'

export function TeamPage() {
  const { currentUser, users, addMember } = useApp()
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    addMember({ name: String(form.get('name')), email: String(form.get('email')), password: String(form.get('password')), role: String(form.get('role')) as 'vendedor' | 'canjeador' | 'supervisor' | 'validador' })
      .then(() => { setDone(true); setError(''); e.currentTarget.reset() }).catch((err) => setError(err instanceof Error ? err.message : 'No se pudo sumar al equipo.'))
  }
  return <main className="page"><div><p className="kicker">Equipo</p><h1>Personas y roles</h1></div>{currentUser?.role === 'organizador' ? <form className="card stack" onSubmit={submit}><h2>Agregar persona</h2><label className="field"><span>Nombre</span><input name="name" required /></label><label className="field"><span>Email</span><input name="email" type="email" required /></label><label className="field"><span>Contraseña inicial</span><input name="password" type="password" minLength={6} required /></label><label className="field"><span>Rol</span><select name="role" defaultValue="vendedor"><option value="vendedor">Vendedor</option><option value="canjeador">Canjeador</option><option value="supervisor">Supervisor</option><option value="validador">Validador</option></select></label>{error ? <p className="error">{error}</p> : null}{done ? <p className="flash flash-ok">Persona agregada al equipo.</p> : null}<button className="btn btn-primary btn-block">Agregar</button></form> : null}<section className="card">{users.map((user) => <div className="list-item" key={user.id}><div style={{ flex: 1 }}><b>{user.name}</b><p className="muted">{user.email}</p></div><span className="pill pill-muted">{user.role}</span></div>)}</section></main>
}
