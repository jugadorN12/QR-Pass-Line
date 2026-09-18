import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import type { Role } from '../types'

type RoleOption = {
  key: Role | 'encargado'
  label: string
  icon: string
}

const roleOptions: RoleOption[] = [
  {
    key: 'encargado',
    label: 'ENCARGADO',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
  },
  {
    key: 'organizador',
    label: 'ORGANIZADOR',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>'
  },
  {
    key: 'vendedor',
    label: 'VENDEDOR',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
  },
  {
    key: 'canjeador',
    label: 'CANJEADOR',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5c0-1.1.9-2 2-2h2"/><path d="M17 3h2c1.1 0 2 .9 2 2v2"/><path d="M21 17v2c0 1.1-.9 2-2 2h-2"/><path d="M7 21H5c-1.1 0-2-.9-2-2v-2"/><rect width="7" height="7" x="7" y="7" rx="1"/></svg>'
  },
]

export function RoleSelectionPage() {
  const { currentUser, logout } = useApp()
  const navigate = useNavigate()

  if (!currentUser) return null

  const canUse = (role: RoleOption['key']) => {
    if (role === 'encargado') return currentUser.role === 'organizador'
    return currentUser.role === role || currentUser.role === 'organizador'
  }

  function selectRole(role: RoleOption['key']) {
    if (!canUse(role)) return
    navigate(role === 'encargado' ? '/encargado' : '/resumen')
  }

  return (
    <div className="role-screen">
      <header className="role-header">
        <div className="role-brand">
          <img src={localStorage.getItem('qr-pass-line.logo') || '/favicon.svg'} alt="" />
          <strong>QR Pass Line</strong>
        </div>
        <button className="role-exit-btn" type="button" onClick={() => { void logout(); navigate('/ingresar') }} aria-label="Cerrar sesión">
          <img src="/favicon.svg" alt="Salir" className="role-exit-avatar" />
        </button>
      </header>

      <main className="role-main">
        <section className="role-card role-user-card">
          <h1>Seleccioná tu rol.</h1>
          <div className="role-user">
            <div className="role-avatar">{currentUser.name.slice(0, 1).toUpperCase()}</div>
            <div>
              <strong>{currentUser.name}</strong>
              <small>{currentUser.email}</small>
            </div>
          </div>
        </section>

        <section className="role-card role-business-card">
          <div className="business-heading">
            <div className="business-logo"><img src={localStorage.getItem('qr-pass-line.logo') || '/favicon.svg'} alt="" /></div>
            <div>
              <strong>QR Pass Line</strong>
              <small>{currentUser.role === 'organizador' ? '4 roles disponibles' : '1 rol disponible'}</small>
            </div>
          </div>
          <div className="role-grid">
            {roleOptions.map((option) => {
              const enabled = canUse(option.key)
              return (
                <button
                  className={`role-option ${enabled ? '' : 'is-disabled'}`}
                  disabled={!enabled}
                  key={option.key}
                  type="button"
                  onClick={() => selectRole(option.key)}
                >
                  <span className="role-option-icon" dangerouslySetInnerHTML={{ __html: option.icon }} />
                  <strong>{option.label}</strong>
                </button>
              )
            })}
          </div>
        </section>

        <p className="role-footer">© 2026 QR Pass Line.</p>
      </main>
    </div>
  )
}
