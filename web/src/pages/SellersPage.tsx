import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'

type Seller = {
  id: string
  name: string
  email: string
  initials: string
}

export function SellersPage() {
  const { users, addMember } = useApp()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteError, setInviteError] = useState('')

  const sellers: Seller[] = users.filter((user) => user.role === 'vendedor').map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    initials: user.name.slice(0, 1).toUpperCase(),
  }))

  async function inviteSeller(event: React.FormEvent<HTMLFormElement>) {
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
        role: 'vendedor',
      })
      setInviteEmail('')
      setInviteError('')
      setInviteOpen(false)
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'No se pudo registrar el vendedor.')
    }
  }

  return (
    <div className="staff-page">
      <header className="staff-header">
        <div className="staff-brand"><img src={localStorage.getItem('qr-pass-line.logo') || '/favicon.svg'} alt="" /><strong>QR Pass Line</strong></div>
        <div className="staff-close">×</div>
      </header>
      <div className="staff-layout">
        <aside className="staff-sidebar">
          <Link className="staff-sidebar-control" to="/encargado">‹</Link>
          <Link to="/encargado">⌂</Link>
          <Link className="active" to="/vendedores">♙</Link>
          <Link to="/fechas">▣</Link>
          <Link to="/fechas">⌁</Link>
          <Link to="/fechas">▦</Link>
          <Link to="/fechas">◎</Link>
          <Link to="/equipo">⌁</Link>
          <Link to="/puerta">?</Link>
        </aside>
        <main className="sellers-main">
          <div className="sellers-titlebar">
            <Link to="/encargado" className="back-link">‹</Link>
            <h1>Vendedores</h1>
            <button className="add-person add-person-invite" type="button" aria-label="Agregar vendedor" onClick={() => setInviteOpen(true)}><span>♙</span><sup>+</sup></button>
            <span className="people-symbol">♧</span>
          </div>
          <section className="sellers-panel">
            <div className="sellers-panel-heading"><strong>Vendedores registrados</strong><span>{sellers.length}</span></div>
            <div className="seller-grid">
              {sellers.map((seller) => (
                <article className="seller-card" key={seller.id}>
                  <div className="seller-avatar">{seller.initials}</div>
                  <div className="seller-info"><strong>{seller.name}</strong><small>{seller.email}</small></div>
                  <div className="seller-actions">
                    <Link className="seller-action-button" to={`/vendedores/${seller.id}/limitaciones`} aria-label={`Limitaciones de ${seller.name}`}>▣</Link>
                    <button type="button" aria-label={`Ventas de ${seller.name}`}>♧ <b>0</b></button>
                    <button type="button" aria-label={`Eliminar ${seller.name}`}>♧</button>
                  </div>
                </article>
              ))}
            </div>
          </section>
          <div className="bulk-actions">
            <button type="button">LIMITAR SELECCIONADOS</button>
            <button type="button">EXCEPCIONES A SELECCIONADOS</button>
            <button type="button">ELIMINAR SELECCIONADOS</button>
          </div>
        </main>
      </div>
      {inviteOpen ? (
        <div className="invite-backdrop" role="dialog" aria-modal="true" aria-labelledby="invite-title">
          <button className="invite-dismiss" type="button" aria-label="Cerrar diálogo" onClick={() => setInviteOpen(false)} />
          <form className="invite-dialog" onSubmit={(e) => void inviteSeller(e)}>
            <div className="invite-dialog-heading"><button type="button" aria-label="Cerrar" onClick={() => setInviteOpen(false)}>×</button><strong id="invite-title">Nuevo vendedor</strong></div>
            <p>Ingresá el email del nuevo vendedor (Contraseña temporal: Password123!).</p>
            <label className="invite-field"><span>Email del vendedor</span><input autoFocus type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="vendedor@ejemplo.com" required /></label>
            {inviteError ? <small className="invite-error">{inviteError}</small> : null}
            <button className="btn btn-primary invite-confirm" type="submit">Confirmar</button>
          </form>
        </div>
      ) : null}
    </div>
  )
}
