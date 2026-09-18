import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'

type Redeemer = {
  id: string
  name: string
  email: string
  initials: string
  demo?: boolean
  scanType?: 'qr' | 'dni' | 'both'
}

const demoRedeemers: Redeemer[] = [
  { id: 'demo-redeemer-1', name: 'Sofía Control', email: 'sofia@qrpassline.com', initials: 'S', demo: true },
  { id: 'demo-redeemer-2', name: 'Diego Puerta', email: 'diego@qrpassline.com', initials: 'D', demo: true },
]

export function RedeemersPage() {
  const { users } = useApp()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteError, setInviteError] = useState('')
  const [scanType, setScanType] = useState<'qr' | 'dni' | 'both'>('both')
  const [invitedRedeemers, setInvitedRedeemers] = useState<Redeemer[]>([])
  const realRedeemers: Redeemer[] = users
    .filter((user) => user.role === 'canjeador')
    .map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      initials: user.name.slice(0, 1).toUpperCase(),
    }))
  const redeemers = realRedeemers.length ? [...realRedeemers, ...invitedRedeemers] : [...demoRedeemers, ...invitedRedeemers]

  function inviteRedeemer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const email = inviteEmail.trim().toLowerCase()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setInviteError('Ingresá un email válido.')
      return
    }
    setInvitedRedeemers((current) => [...current, {
      id: `invited-${crypto.randomUUID().slice(0, 8)}`,
      name: 'Canjeador invitado',
      email,
      initials: email.slice(0, 1).toUpperCase(),
      scanType,
    }])
    setInviteEmail('')
    setInviteError('')
    setScanType('both')
    setInviteOpen(false)
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
            <div className="seller-grid">
              {redeemers.map((redeemer) => (
                <article className="seller-card" key={redeemer.id}>
                  <div className={`seller-avatar ${redeemer.demo ? 'seller-avatar-demo' : ''}`}>{redeemer.initials}</div>
                  <div className="seller-info"><strong>{redeemer.name}</strong><small>{redeemer.email}</small></div>
                  <div className="seller-actions">
                    <Link className="seller-action-button" to={`/canjeadores/${redeemer.id}/limitaciones/nueva`} aria-label={`Limitaciones de ${redeemer.name}`}>▣</Link>
                    <button type="button" aria-label={`Editar ${redeemer.name}`}>⌕</button>
                    <button type="button" aria-label={`Eliminar ${redeemer.name}`}>♧</button>
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
          <form className="invite-dialog" onSubmit={inviteRedeemer}>
            <div className="invite-dialog-heading"><button type="button" aria-label="Cerrar" onClick={() => setInviteOpen(false)}>×</button><strong id="redeemer-invite-title">Nuevo canjeador</strong></div>
            <p>Ingresá el email del nuevo canjeador.</p>
            <label className="invite-field"><span>Email del canjeador</span><input autoFocus type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="canjeador@ejemplo.com" required /></label>
            <fieldset className="scan-type-field">
              <legend>Tipo de escaneo permitido</legend>
              <label><input type="radio" name="scanType" value="qr" checked={scanType === 'qr'} onChange={() => setScanType('qr')} /> QR</label>
              <label><input type="radio" name="scanType" value="dni" checked={scanType === 'dni'} onChange={() => setScanType('dni')} /> DNI</label>
              <label><input type="radio" name="scanType" value="both" checked={scanType === 'both'} onChange={() => setScanType('both')} /> QR y DNI</label>
            </fieldset>
            {inviteError ? <small className="invite-error">{inviteError}</small> : null}
            <button className="btn btn-primary invite-confirm" type="submit">Confirmar</button>
          </form>
        </div>
      ) : null}
    </div>
  )
}
