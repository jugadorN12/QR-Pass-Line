import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import type { Role } from '../types'

type RoleOption = {
  key: Role | 'encargado'
  label: string
  icon: string
}

const roleOptions: RoleOption[] = [
  { key: 'encargado', label: 'ENCARGADO', icon: '♙' },
  { key: 'organizador', label: 'ORGANIZADOR', icon: '♙' },
  { key: 'vendedor', label: 'VENDEDOR', icon: '♧' },
  { key: 'canjeador', label: 'CANJEADOR', icon: '⌗' },
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
    navigate(role === 'encargado' ? '/encargado' : '/')
  }

  return (
    <div className="role-screen">
      <header className="role-header">
        <div className="role-brand">
          <img src={localStorage.getItem('qr-pass-line.logo') || '/favicon.svg'} alt="" />
          <strong>QR Pass Line</strong>
        </div>
        <button className="role-exit" type="button" onClick={() => { void logout(); navigate('/ingresar') }} aria-label="Cerrar sesión">
          <span>×</span>
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
                  <span className="role-option-icon">{option.icon}</span>
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
