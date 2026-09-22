import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { StaffHeader } from '../components/StaffHeader'

type BanItem = {
  id: string
  name: string
  dni: string
  reason: string
  createdAt: string
  active: boolean
}

export function BansPage() {
  const [bans, setBans] = useState<BanItem[]>(() => {
    const saved = localStorage.getItem('qr-pass-line.bans')
    if (saved) {
      try { return JSON.parse(saved) } catch {}
    }
    return []
  })

  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards')
  const [searchTerm, setSearchTerm] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [dni, setDni] = useState('')
  const [reason, setReason] = useState('')

  function handleSaveBan(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    const newBan: BanItem = {
      id: `ban-${crypto.randomUUID().slice(0, 8)}`,
      name: name.trim(),
      dni: dni.trim(),
      reason: reason.trim() || 'Derecho de admisión y permanencia',
      createdAt: new Date().toISOString(),
      active: true,
    }

    const updated = [newBan, ...bans]
    setBans(updated)
    localStorage.setItem('qr-pass-line.bans', JSON.stringify(updated))

    setName('')
    setDni('')
    setReason('')
    setModalOpen(false)
  }

  function handleDeleteBan(id: string) {
    if (!window.confirm('¿Eliminar esta prohibición/baneo?')) return
    const updated = bans.filter((b) => b.id !== id)
    setBans(updated)
    localStorage.setItem('qr-pass-line.bans', JSON.stringify(updated))
  }

  const filteredBans = useMemo(() => {
    return bans.filter((b) => {
      if (!searchTerm.trim()) return true
      const s = searchTerm.toLowerCase()
      return b.name.toLowerCase().includes(s) || b.dni.includes(s) || b.reason.toLowerCase().includes(s)
    })
  }, [bans, searchTerm])

  return (
    <div className="staff-page">
      <StaffHeader />
      <div className="staff-layout">
        {/* Sidebar */}
        <aside className="staff-sidebar">
          <Link className="staff-sidebar-control" to="/encargado">‹</Link>
          <Link to="/encargado" title="Inicio">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </Link>
          <Link to="/vendedores" title="Vendedores">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </Link>
          <Link to="/canjeadores" title="Canjeadores">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/></svg>
          </Link>
          <Link to="/informes" title="Informes">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          </Link>
          <Link to="/fechas" title="Fechas">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </Link>
          <Link to="/qr" title="QRs">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="22" height="18" rx="2"/><line x1="1" y1="9" x2="23" y2="9"/><line x1="1" y1="15" x2="23" y2="15"/></svg>
          </Link>
          <Link to="/links-publicos" title="Links Públicos">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
          </Link>
          <Link className="active" to="/baneos" title="Baneos">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
          </Link>
          <Link to="/puerta" title="Puerta">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </Link>
          <a href="https://api.whatsapp.com/send?phone=5491131245112&text=Hola%2C%20necesito%20soporte%20con%20QR%20Pass%20Line" target="_blank" rel="noopener noreferrer" title="Soporte WhatsApp">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>
          </a>
        </aside>

        {/* Main Content */}
        <main className="sellers-main" style={{ padding: '14px 24px 100px' }}>
          {/* Titlebar con < Baneos ⚙ + */}
          <div className="sellers-titlebar" style={{ padding: 0, marginBottom: 16 }}>
            <Link to="/encargado" className="back-link">‹</Link>
            <h1 className="doors-title" style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 24, fontWeight: 700, color: '#0860bd', margin: 0 }}>
              <span>Baneos</span>
              <button
                type="button"
                onClick={() => setSettingsOpen(!settingsOpen)}
                title="Configuración de admisión"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  border: 'none',
                  background: '#f1f5f9',
                  color: '#475569',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 14,
                  cursor: 'pointer'
                }}
              >
                ⚙
              </button>
              <button
                className="doors-add-user-btn"
                type="button"
                aria-label="Nuevo baneo"
                onClick={() => setModalOpen(true)}
                title="Nuevo baneo"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: '#e0f2fe',
                  color: '#0284c7',
                  border: 'none',
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer'
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </h1>
          </div>

          {settingsOpen && (
            <div style={{ padding: '12px 16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, marginBottom: 16, color: '#1e40af', fontSize: 13 }}>
              <strong>Control de Admisión y Permanencia:</strong> Las personas agregadas a esta lista serán alertadas y bloqueadas automáticamente durante el escaneo en puerta.
            </div>
          )}

          {/* Search bar */}
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '0 14px',
                height: 44,
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  outline: 'none',
                  fontSize: 13,
                  color: '#1e293b',
                  background: 'transparent'
                }}
              />
            </div>
          </div>

          {/* View Toggle Tabs (+ Tabla / Cards) */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 8,
                border: viewMode === 'table' ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
                background: viewMode === 'table' ? '#eff6ff' : '#fff',
                color: viewMode === 'table' ? '#1d4ed8' : '#64748b',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <span>+</span> Tabla
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 8,
                border: viewMode === 'cards' ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
                background: viewMode === 'cards' ? '#eff6ff' : '#fff',
                color: viewMode === 'cards' ? '#1d4ed8' : '#64748b',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <span>▱</span> Cards
            </button>
          </div>

          {/* Main Content Body */}
          {filteredBans.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b', fontSize: 14, fontWeight: 500 }}>
              No tenés prohibiciones.
            </div>
          ) : viewMode === 'cards' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
              {filteredBans.map((ban) => (
                <div
                  key={ban.id}
                  style={{
                    padding: 16,
                    border: '1.5px solid #fee2e2',
                    borderRadius: 14,
                    background: '#fff',
                    boxShadow: '0 2px 8px rgba(220,38,38,0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 12
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        background: '#fee2e2',
                        color: '#dc2626',
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: 18,
                        fontWeight: 800
                      }}
                    >
                      🚫
                    </div>
                    <div>
                      <strong style={{ fontSize: 14, color: '#0f172a', display: 'block' }}>{ban.name}</strong>
                      <small style={{ color: '#64748b', fontSize: 12 }}>DNI: {ban.dni || 'Sin documento'}</small>
                    </div>
                  </div>

                  <div style={{ fontSize: 12, color: '#b91c1c', background: '#fef2f2', padding: '8px 10px', borderRadius: 8 }}>
                    <strong>Motivo:</strong> {ban.reason}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
                    <small style={{ color: '#94a3b8', fontSize: 11 }}>
                      {new Date(ban.createdAt).toLocaleDateString('es-AR')}
                    </small>
                    <button
                      type="button"
                      onClick={() => handleDeleteBan(ban.id)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        border: '1px solid #fecaca',
                        background: '#fff',
                        color: '#dc2626',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#64748b', background: '#fafbfc' }}>
                    <th style={{ padding: '12px 16px' }}>Nombre</th>
                    <th style={{ padding: '12px 16px' }}>DNI</th>
                    <th style={{ padding: '12px 16px' }}>Motivo</th>
                    <th style={{ padding: '12px 16px' }}>Fecha</th>
                    <th style={{ padding: '12px 16px' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBans.map((ban) => (
                    <tr key={ban.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>{ban.name}</td>
                      <td style={{ padding: '12px 16px', color: '#64748b' }}>{ban.dni || '-'}</td>
                      <td style={{ padding: '12px 16px', color: '#dc2626' }}>{ban.reason}</td>
                      <td style={{ padding: '12px 16px', color: '#64748b' }}>{new Date(ban.createdAt).toLocaleDateString('es-AR')}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <button
                          type="button"
                          onClick={() => handleDeleteBan(ban.id)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: 6,
                            border: '1px solid #fecaca',
                            background: '#fff',
                            color: '#dc2626',
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>

      {/* Modal Nuevo Baneo */}
      {modalOpen && (
        <div className="doors-calendar-backdrop" onClick={() => setModalOpen(false)}>
          <div
            className="doors-calendar-modal"
            style={{ width: 'min(440px, 94vw)', padding: 24, borderRadius: 16 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1e3a8a', margin: 0 }}>Nueva Prohibición / Baneo</h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{ border: 0, background: 'transparent', fontSize: 20, color: '#64748b', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBan} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="doors-field-group">
                <label className="doors-field-label">Nombre y Apellido</label>
                <div className="doors-input-wrapper">
                  <input
                    type="text"
                    required
                    placeholder="Ej: Juan Pérez"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>

              <div className="doors-field-group">
                <label className="doors-field-label">DNI / Documento</label>
                <div className="doors-input-wrapper">
                  <input
                    type="text"
                    placeholder="Ej: 42123456"
                    value={dni}
                    onChange={(e) => setDni(e.target.value)}
                  />
                </div>
              </div>

              <div className="doors-field-group">
                <label className="doors-field-label">Motivo de la Prohibición</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Ej: Disturbios reiterados, agresión física..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  style={{
                    width: '100%',
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    padding: 10,
                    fontSize: 13,
                    outline: 'none',
                    resize: 'none'
                  }}
                />
              </div>

              <button
                className="doors-submit-btn"
                type="submit"
                style={{ marginTop: 8 }}
              >
                GUARDAR PROHIBICIÓN
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
