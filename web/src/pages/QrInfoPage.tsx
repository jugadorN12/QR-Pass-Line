import { Link } from 'react-router-dom'

export function QrInfoPage() {
  return <QrUtilityPage title="Información de QR" eyebrow="Ayuda operativa"><div className="utility-content"><p>Los accesos QR permiten emitir entradas y validar el ingreso desde la puerta.</p><div className="utility-list"><div><b>QR Consumible</b><span>Se puede canjear una vez por persona.</span></div><div><b>QR Viral</b><span>Comparte un acceso controlado para campañas y difusión.</span></div><div><b>Vigencia</b><span>Define desde cuándo y hasta cuándo puede utilizarse.</span></div></div></div></QrUtilityPage>
}

export function QrGroupsPage() {
  return <QrUtilityPage title="Grupos de QR" eyebrow="Organización"><div className="utility-content"><p>Ordená los accesos por campaña, sector o fecha operativa.</p><button className="btn btn-primary">Crear grupo</button><div className="utility-list"><div><b>Sin grupo</b><span>Accesos independientes sin agrupación.</span></div><div><b>Campaña de lanzamiento</b><span>Grupo demo listo para organizar tus QRs.</span></div></div></div></QrUtilityPage>
}

export function InactiveQrPage() {
  return <QrUtilityPage title="QR inactivos" eyebrow="Historial"><div className="utility-content"><p>Estos accesos fueron cerrados o desactivados y ya no pueden utilizarse.</p><div className="utility-list"><div><b>Acceso demo archivado</b><span>Estado: inactivo · Conservado para consulta.</span><span className="pill pill-muted">Inactivo</span></div></div></div></QrUtilityPage>
}

function QrUtilityPage({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) {
  return <div className="staff-page qr-page"><header className="staff-header"><div className="staff-brand"><img src={localStorage.getItem('qr-pass-line.logo') || '/favicon.svg'} alt="" /><strong>QR Pass Line</strong></div><div className="staff-close">×</div></header><div className="staff-layout"><aside className="staff-sidebar"><Link className="staff-sidebar-control" to="/qr">‹</Link><Link to="/encargado">⌂</Link><Link to="/vendedores">♙</Link><Link className="active" to="/qr">▣</Link><Link to="/fechas">⌁</Link><Link to="/equipo">◎</Link><Link to="/puerta">?</Link></aside><main className="sellers-main utility-main"><div className="sellers-titlebar"><Link to="/qr" className="back-link">‹</Link><h1>{title}</h1></div><p className="manager-section-label">{eyebrow}</p><section className="sellers-panel utility-panel">{children}</section></main></div></div>
}
