import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import type { Role } from '../types'
import { StaffHeader } from '../components/StaffHeader'

type Props = { role: Extract<Role, 'supervisor' | 'validador'>; title: string }

const demos = {
  supervisor: [{ name: 'Camila Supervisión', email: 'camila@qrpassline.com', initials: 'C' }, { name: 'Bruno Operaciones', email: 'bruno@qrpassline.com', initials: 'B' }],
  validador: [{ name: 'Micaela Validación', email: 'micaela@qrpassline.com', initials: 'M' }, { name: 'Tomás Accesos', email: 'tomas@qrpassline.com', initials: 'T' }],
}

export function StaffRolePage({ role, title }: Props) {
  const { users } = useApp()
  const real = users.filter((user) => user.role === role).map((user) => ({ name: user.name, email: user.email, initials: user.name.slice(0, 1).toUpperCase() }))
  const people = real.length ? real : demos[role]
  return <div className="staff-page"><StaffHeader /><div className="staff-layout"><aside className="staff-sidebar"><Link className="staff-sidebar-control" to="/encargado">‹</Link><Link to="/encargado">⌂</Link><Link to="/vendedores">♙</Link><Link to="/canjeadores">⌗</Link><Link className="active" to={`/${role}s`}>▣</Link><Link to="/fechas">⌁</Link><Link to="/puerta">?</Link></aside><main className="sellers-main"><div className="sellers-titlebar"><Link to="/encargado" className="back-link">‹</Link><h1>{title}</h1><button className="add-person" type="button">♙<sup>+</sup></button></div><section className="sellers-panel"><div className="sellers-panel-heading"><strong>{title} sin grupo</strong><span>⌃</span></div><div className="seller-grid">{people.map((person) => <article className="seller-card" key={person.email}><div className="seller-avatar seller-avatar-demo">{person.initials}</div><div className="seller-info"><strong>{person.name}</strong><small>{person.email}</small></div><div className="seller-actions"><button type="button">▣</button><button type="button">⌕</button><button type="button">♧</button></div></article>)}</div></section></main></div></div>
}
