import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import type { QrCatalogItem } from '../types'

export function QrTypesPage() {
  const { qrCatalog, deleteQrItem } = useApp()
  const [preview, setPreview] = useState<QrCatalogItem | null>(null)
  const navigate = useNavigate()

  function removeQr(item: QrCatalogItem) {
    if (!window.confirm(`¿Eliminar ${item.name}?`)) return
    void deleteQrItem(item.id)
  }

  return (
    <div className="staff-page qr-page">
      <header className="staff-header">
        <div className="staff-brand"><img src={localStorage.getItem('qr-pass-line.logo') || '/favicon.svg'} alt="" /><strong>QR Pass Line</strong></div>
        <div className="staff-close">×</div>
      </header>
      <div className="staff-layout">
        <aside className="staff-sidebar">
          <Link className="staff-sidebar-control" to="/encargado">‹</Link>
          <Link to="/encargado">⌂</Link>
          <Link to="/vendedores">♙</Link>
          <Link className="active" to="/qr">▣</Link>
          <Link to="/fechas">⌁</Link>
          <Link to="/fechas">▦</Link>
          <Link to="/equipo">◎</Link>
          <Link to="/puerta">?</Link>
        </aside>
        <main className="sellers-main">
          <div className="sellers-titlebar">
            <Link to="/accesos" className="back-link">‹</Link>
            <h1>QR | Accesos</h1>
            <Link className="add-person qr-add-link" to="/qr/informacion" aria-label="Información">i</Link>
            <Link className="add-person qr-add-link" to="/qr/nuevo" aria-label="Crear QR">+</Link>
            <Link className="add-person qr-add-link" to="/qr/grupos" aria-label="Gestionar grupos">▣</Link>
            <Link className="add-person qr-add-link" to="/qr/inactivos" aria-label="Ver inactivos">◉</Link>
          </div>
          <section className="sellers-panel qr-panel">
            <div className="sellers-panel-heading"><strong>Cupones sin grupo</strong><span>⌃</span></div>
            <div className="qr-grid">
              {qrCatalog.map((qr) => (
                <article className="qr-type-card" key={qr.id}>
                  <div className="qr-type-heading"><span className="qr-ticket-icon">▱</span><div><small>CONSUMIBLE_QR</small><strong>{qr.name}</strong></div></div>
                  <div className="seller-actions">
                    <button type="button" aria-label={`Editar ${qr.name}`} onClick={() => navigate(`/qr/nuevo?id=${qr.id}`)}>⌕</button>
                    <button type="button" aria-label={`Ver ${qr.name}`} onClick={() => setPreview(qr)}>◉</button>
                    <button type="button" aria-label={`Eliminar ${qr.name}`} onClick={() => removeQr(qr)}>♧</button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </main>
      </div>
      {preview ? <div className="qr-preview-backdrop" role="dialog" aria-modal="true"><button className="time-picker-dismiss" type="button" aria-label="Cerrar vista previa" onClick={() => setPreview(null)} /><section className="qr-preview-card" style={preview.backgroundImage ? { backgroundImage: `linear-gradient(rgba(255,255,255,.88),rgba(255,255,255,.96)), url(${preview.backgroundImage})` } : undefined}>      <div className="qr-preview-mark"><img src={localStorage.getItem('qr-pass-line.logo') || '/favicon.svg'} alt="" /></div><p className="kicker">CONSUMIBLE_{preview.kind.toUpperCase()}</p><h2>{preview.name}</h2><p className="muted">{preview.description}</p><div className="qr-preview-code">QR PASS LINE</div><button className="btn btn-primary btn-block" type="button" onClick={() => setPreview(null)}>Cerrar</button></section></div> : null}
    </div>
  )
}
