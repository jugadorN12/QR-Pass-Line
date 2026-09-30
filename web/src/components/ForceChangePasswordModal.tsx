import { useState } from 'react'
import { useApp } from '../context/AppContext'

export function ForceChangePasswordModal() {
  const { currentUser, updateUserPassword, logout } = useApp()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!currentUser?.mustChangePassword) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    setError('')
    try {
      await updateUserPassword(newPassword)
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Error al cambiar la contraseña.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 9999,
        padding: 16,
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 20,
          padding: '28px 24px',
          maxWidth: 440,
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #e2e8f0',
          animation: 'scaleUp 0.2s ease-out',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: '#eff6ff',
              border: '2px solid #bfdbfe',
              display: 'grid',
              placeItems: 'center',
              fontSize: 26,
              margin: '0 auto 12px',
            }}
          >
            🔒
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', margin: '0 0 6px' }}>
            Definí tu Nueva Contraseña
          </h2>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0, lineHeight: 1.4 }}>
            Tu cuenta tiene una clave provisoria. Por tu seguridad, creá tu contraseña personal definitiva para acceder.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
              Nueva Contraseña
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
              minLength={6}
              autoFocus
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 10,
                border: '1px solid #cbd5e1',
                fontSize: 15,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
              Confirmar Nueva Contraseña
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repetí tu nueva contraseña"
              required
              minLength={6}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 10,
                border: '1px solid #cbd5e1',
                fontSize: 15,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {error && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                padding: '10px 14px',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: 12,
                border: 'none',
                background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                color: '#ffffff',
                fontSize: 15,
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
              }}
            >
              {loading ? 'Guardando...' : '✓ Guardar Contraseña y Continuar'}
            </button>

            <button
              type="button"
              onClick={() => void logout()}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                padding: '8px',
              }}
            >
              Cerrar sesión
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
