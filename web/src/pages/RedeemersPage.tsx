import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { StaffHeader } from '../components/StaffHeader'

type Redeemer = {
  id: string
  name: string
  email: string
  initials: string
  avatar?: string
}

export function RedeemersPage() {
  const { users, limitations, addMember, updateUserRole } = useApp()
  const navigate = useNavigate()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteError, setInviteError] = useState('')
  const [panelOpen, setPanelOpen] = useState(true)

  const redeemers: Redeemer[] = users
    .filter((user) =>
      user.role !== 'admin' &&
      (user.role === 'canjeador' ||
        user.role === 'organizador' ||
        Boolean(user.roles && (user.roles.includes('canjeador') || user.roles.includes('organizador'))))
    )
    .map((user) => ({
      id: user.id,
      name: user.name || user.email.split('@')[0],
      email: user.email,
      initials: (user.name || user.email).slice(0, 1).toUpperCase(),
      avatar: (user as any).avatar || '',
    }))

  async function inviteRedeemer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const email = inviteEmail.trim().toLowerCase()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setInviteError('Ingresá un email válido.')
      return
    }
    try {
      await addMember({
        name: email.split('@')[0],
        email,
        password: 'Password123!',
        role: 'canjeador',
      })
      setInviteEmail('')
      setInviteError('')
      setInviteOpen(false)
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'No se pudo registrar el canjeador.')
    }
  }

  async function handleDeleteRedeemer(redeemerId: string, redeemerName: string) {
    if (!window.confirm(`¿Estás seguro de eliminar al canjeador "${redeemerName}"?`)) return
    try {
      await updateUserRole(redeemerId, 'pendiente', undefined, [])
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="staff-page">
      <StaffHeader />
      <div className="staff-layout">
        <aside className="staff-sidebar">
          <Link className="staff-sidebar-control" to="/encargado">‹</Link>
          <Link to="/encargado" title="Inicio">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </Link>
          <Link to="/vendedores" title="Vendedores">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </Link>
          <Link className="active" to="/canjeadores" title="Canjeadores">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/></svg>
          </Link>
          <Link to="/informes" title="Informes">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          </Link>
          <Link to="/qr" title="QRs">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="22" height="18" rx="2"/><line x1="1" y1="9" x2="23" y2="9"/><line x1="1" y1="15" x2="23" y2="15"/></svg>
          </Link>
          <Link to="/fechas" title="Fechas">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </Link>
          <Link to="/links-publicos" title="Links Públicos">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
          </Link>
          <Link to="/baneos" title="Baneos">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
          </Link>
          <Link to="/equipo" title="Equipo">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </Link>
          <Link to="/puerta" title="Puerta">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </Link>
          <a href="https://api.whatsapp.com/send?phone=5491131245112&text=Hola%2C%20necesito%20soporte%20con%20QR%20Pass%20Line" target="_blank" rel="noopener noreferrer" title="Soporte WhatsApp">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>
          </a>
        </aside>

        <main className="sellers-main">
          <div className="sellers-titlebar">
            <Link to="/encargado" className="back-link">‹</Link>
            <h1 className="doors-title">Canjeadores</h1>
            <button
              className="doors-add-user-btn"
              type="button"
              aria-label="Agregar canjeador"
              onClick={() => setInviteOpen(true)}
              title="Agregar canjeador"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <line x1="20" y1="8" x2="20" y2="14" />
                <line x1="17" y1="11" x2="23" y2="11" />
              </svg>
            </button>
            <div className="doors-profile-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
          </div>

          <section className="sellers-panel doors-panel">
            <div
              className="sellers-panel-heading doors-panel-heading"
              onClick={() => setPanelOpen(!panelOpen)}
              style={{ cursor: 'pointer' }}
            >
              <strong>Canjeadores sin grupo</strong>
              <span className="doors-chevron">{panelOpen ? '⌃' : '⌄'}</span>
            </div>

            {panelOpen && (
              <div className="seller-grid doors-seller-grid">
                {redeemers.map((redeemer) => {
                  const redeemerLimits = limitations.filter((l) => l.personId === redeemer.id)
                  const totalQuota = redeemerLimits.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0)

                  return (
                    <article className="seller-card doors-seller-card" key={redeemer.id}>
                      <div className="doors-card-header">
                        <div
                          className="seller-avatar doors-avatar"
                          style={redeemer.avatar ? { backgroundImage: `url(${redeemer.avatar})` } : undefined}
                        >
                          {!redeemer.avatar ? redeemer.initials : ''}
                        </div>
                        <div className="seller-info doors-info">
                          <strong>{redeemer.name}</strong>
                          <small>{redeemer.email}</small>
                        </div>
                      </div>

                      <div className="seller-actions doors-card-actions">
                        <Link
                          className="doors-action-icon-btn"
                          to={`/canjeadores/${redeemer.id}/limitaciones`}
                          aria-label={`Limitaciones de ${redeemer.name}`}
                          title="Gestionar limitaciones"
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" />
                            <path d="M13 5v2" />
                            <path d="M13 17v2" />
                            <path d="M13 11v2" />
                          </svg>
                        </Link>

                        <button
                          type="button"
                          className="doors-action-count-btn"
                          aria-label={`Límite de ${redeemer.name}`}
                          title={`Total cupones limitados: ${totalQuota}`}
                        >
                          {totalQuota}
                        </button>

                        <button
                          type="button"
                          className="doors-action-icon-btn delete"
                          onClick={() => handleDeleteRedeemer(redeemer.id, redeemer.name)}
                          title="Eliminar canjeador"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>

          <div className="bulk-actions doors-bulk-actions">
            <button type="button" onClick={() => navigate('/qr')}>LIMITAR SELECCIONADOS</button>
            <button type="button">EXCEPCIONES A SELECCIONADOS</button>
            <button type="button">ELIMINAR SELECCIONADOS</button>
          </div>
        </main>
      </div>

      {inviteOpen && (
        <div className="doors-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="invite-title" onClick={() => setInviteOpen(false)}>
          <div className="doors-invite-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="doors-invite-header">
              <strong id="invite-title">Nuevo Canjeador</strong>
              <button type="button" className="doors-invite-close" aria-label="Cerrar" onClick={() => setInviteOpen(false)}>×</button>
            </div>
            <p className="doors-invite-sub">Introduzca el correo electrónico del nuevo canjeador.</p>
            <form onSubmit={(e) => void inviteRedeemer(e)} className="doors-invite-form">
              <input
                autoFocus
                type="email"
                className="doors-invite-input"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="Ingresa el correo electrónico del nuevo canjeador"
                required
              />
              {inviteError && <small className="doors-invite-error">{inviteError}</small>}
              <div className="doors-invite-btn-wrap">
                <button className="doors-invite-submit" type="submit">Confirmar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
