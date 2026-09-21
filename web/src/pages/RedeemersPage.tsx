import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'

import { StaffHeader } from '../components/StaffHeader'

type Redeemer = {
  id: string
  name: string
  email: string
  initials: string
}

export function RedeemersPage() {
  const { users, addMember } = useApp()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteError, setInviteError] = useState('')

  const redeemers: Redeemer[] = users
    .filter((user) => user.role === 'canjeador')
    .map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      initials: user.name.slice(0, 1).toUpperCase(),
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

  return (
    <div className="staff-page">
      <StaffHeader />
      <div className="staff-layout">
        <aside className="staff-sidebar">
          <Link className="staff-sidebar-control" to="/encargado">‹</Link>
          <Link to="/encargado">⌂</Link>
          <Link to="/vendedores">♙</Link>
          <Link className="active" to="/canjeadores">⌗</Link>
          <Link to="/fechas">▣</Link>
          <Link to="/fechas">⌁</Link>
          <Link to="/fechas">▦</Link>
          <Link to="/equipo">◎</Link>
          <Link to="/puerta">?</Link>
        </aside>
        <main className="sellers-main redeemers-main">
          <div className="sellers-titlebar">
            <Link to="/encargado" className="back-link">‹</Link>
            <h1>Canjeadores</h1>
            <button className="add-person add-person-invite" type="button" aria-label="Agregar canjeador" onClick={() => setInviteOpen(true)}><span>♙</span><sup>+</sup></button>
            <span className="people-symbol">♧</span>
          </div>
          <section className="sellers-panel redeemers-panel">
            <div className="sellers-panel-heading"><strong>Canjeadores registrados</strong><span>{redeemers.length}</span></div>
            <div className="seller-grid">
              {redeemers.map((redeemer) => (
                <article className="seller-card" key={redeemer.id}>
                  <div className="seller-avatar" style={(redeemer as any).avatar ? { backgroundImage: `url(${(redeemer as any).avatar})` } : undefined}>{!(redeemer as any).avatar ? redeemer.initials : ''}</div>
                  <div className="seller-info"><strong>{redeemer.name}</strong><small>{redeemer.email}</small></div>
                  <div className="seller-actions">
                    <Link className="seller-action-button" to={`/canjeadores/${redeemer.id}/limitaciones/nueva`} aria-label={`Limitaciones de ${redeemer.name}`}>▱</Link>
                    <button type="button" aria-label={`Canjes de ${redeemer.name}`}><b>0</b></button>
                    <button type="button" aria-label={`Eliminar ${redeemer.name}`}>🗑</button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </main>
      </div>
      {inviteOpen ? (
        <div className="invite-backdrop" role="dialog" aria-modal="true" aria-labelledby="redeemer-invite-title">
          <button className="invite-dismiss" type="button" aria-label="Cerrar diálogo" onClick={() => setInviteOpen(false)} />
          <form className="invite-dialog" onSubmit={(e) => void inviteRedeemer(e)}>
            <div className="invite-dialog-heading"><button type="button" aria-label="Cerrar" onClick={() => setInviteOpen(false)}>×</button><strong id="redeemer-invite-title">Nuevo canjeador</strong></div>
            <p>Ingresá el email del nuevo canjeador (Contraseña temporal: Password123!).</p>
            <label className="invite-field"><span>Email del canjeador</span><input autoFocus type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="canjeador@ejemplo.com" required /></label>
            {inviteError ? <small className="invite-error">{inviteError}</small> : null}
            <button className="btn btn-primary invite-confirm" type="submit">Confirmar</button>
          </form>
        </div>
      ) : null}
    </div>
  )
}
