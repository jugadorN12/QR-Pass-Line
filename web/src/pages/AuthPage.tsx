import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

export function AuthPage() {
  const { currentUser, loading, login, register } = useApp()
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  if (loading) {
    return <div className="auth-layout" style={{ display: 'grid', placeItems: 'center', background: '#102d4a', color: '#fff' }}><p>Cargando sesión…</p></div>
  }

  if (currentUser) {
    return <Navigate to="/seleccionar-rol" replace />
  }

  async function onLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setPending(true)
    setError('')
    try {
      await login(String(form.get('email')), String(form.get('password')))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo ingresar.')
      setPending(false)
    }
  }

  async function onRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const pass = String(form.get('password'))
    const pass2 = String(form.get('password2'))
    if (pass.length < 6) {
      setError('La contraseña tiene que tener al menos 6 caracteres.')
      return
    }
    if (pass !== pass2) {
      setError('Las contraseñas no coinciden.')
      return
    }
    setPending(true)
    setError('')
    try {
      await register(String(form.get('name')), String(form.get('email')), pass)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la cuenta.')
      setPending(false)
    }
  }

  return (
    <div className="auth-layout">
      <section className="auth-brand-panel">
        <div className="brand auth-brand">
          <img className="brand-mark" src={localStorage.getItem('qr-pass-line.logo') || '/app-icon.png'} alt="" />
          <strong>QR Pass Line</strong>
        </div>
        <div className="auth-promise">
          <p className="kicker">Operación de eventos</p>
          <h1>Tu noche,<br /><em>bajo control.</em></h1>
          <p>Venta, accesos y equipo en un solo lugar.</p>
        </div>
        <div className="auth-stat"><span className="status-dot" /> Plataforma operativa para eventos</div>
      </section>
      <main className="auth-form-panel">
        <div className="auth-form-wrap">
          <div className="auth-mobile-brand"><img className="brand-mark" src={localStorage.getItem('qr-pass-line.logo') || '/app-icon.png'} alt="" /><strong>QR Pass Line</strong></div>
          <div className="auth-heading">
            <p className="kicker">{tab === 'login' ? 'Bienvenido de nuevo' : 'Empezá ahora'}</p>
            <h2>{tab === 'login' ? 'Ingresá a tu cuenta' : 'Creá tu cuenta'}</h2>
            <p className="muted">{tab === 'login' ? 'Administrá tu operación desde cualquier dispositivo.' : 'La primera cuenta será el organizador del local.'}</p>
          </div>
          <div className="card stack auth-card">
          <div className="tabs">
            <button className={tab === 'login' ? 'active' : ''} type="button" onClick={() => setTab('login')}>
              Ingresar
            </button>
            <button className={tab === 'register' ? 'active' : ''} type="button" onClick={() => setTab('register')}>
              Crear cuenta
            </button>
          </div>
          {tab === 'login' ? (
            <form className="stack" onSubmit={onLogin}>
              <label className="field">
                <span>Email</span>
                <input name="email" type="email" required autoComplete="email" />
              </label>
              <label className="field">
                <span>Contraseña</span>
                <input name="password" type="password" required autoComplete="current-password" />
              </label>
              {error ? <p className="error">{error}</p> : null}
              <button className="btn btn-primary btn-block" disabled={pending}>
                {pending ? 'Ingresando…' : 'Entrar'}
              </button>
            </form>
          ) : (
            <form className="stack" onSubmit={onRegister}>
              <label className="field">
                <span>Nombre</span>
                <input name="name" required placeholder="Tu nombre" />
              </label>
              <label className="field">
                <span>Email</span>
                <input name="email" type="email" required autoComplete="email" />
              </label>
              <label className="field">
                <span>Contraseña</span>
                <input name="password" type="password" required autoComplete="new-password" />
              </label>
              <label className="field">
                <span>Repetir contraseña</span>
                <input name="password2" type="password" required autoComplete="new-password" />
              </label>
              <p className="muted">Podés sumar vendedores y canjeadores después desde Equipo.</p>
              {error ? <p className="error">{error}</p> : null}
              <button className="btn btn-primary btn-block" disabled={pending}>
                {pending ? 'Creando…' : 'Crear cuenta'}
              </button>
            </form>
          )}
          </div>
        </div>
      </main>
    </div>
  )
}
