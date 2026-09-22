import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { StaffHeader } from '../components/StaffHeader'
import { formatDate } from '../lib/ids'

export function EventsPage() {
  const { events, tickets, createEvent, updateEventStatus } = useApp()

  const [modalOpen, setModalOpen] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const [name, setName] = useState('')
  const [venue, setVenue] = useState('Salón Principal')
  const [date, setDate] = useState(() => {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}T23:59`
  })
  const [doorsOpen, setDoorsOpen] = useState('23:59')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError('')
    try {
      await createEvent({
        name: name.trim(),
        venue: venue.trim() || 'Salón Principal',
        date,
        doorsOpen: doorsOpen.trim() || '23:59',
        notes: notes.trim(),
        status: 'activo',
      })
      setName('')
      setNotes('')
      setModalOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear fecha.')
    } finally {
      setSaving(false)
    }
  }

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
          <Link to="/qr" title="QRs">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="22" height="18" rx="2"/><line x1="1" y1="9" x2="23" y2="9"/><line x1="1" y1="15" x2="23" y2="15"/></svg>
          </Link>
          <Link className="active" to="/fechas" title="Fechas">
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

        {/* Main Content Area */}
        <main className="sellers-main" style={{ padding: '14px 24px 100px' }}>
          {/* Titlebar con < Fechas ⓘ + */}
          <div className="sellers-titlebar" style={{ padding: 0, marginBottom: 16 }}>
            <Link to="/encargado" className="back-link">‹</Link>
            <h1 className="doors-title" style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 24, fontWeight: 700, color: '#0860bd', margin: 0 }}>
              <span>Fechas</span>
              <button
                type="button"
                className="doors-info-btn"
                onClick={() => setInfoOpen(!infoOpen)}
                title="Información de fechas"
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  border: '1.5px solid #93c5fd',
                  background: '#eff6ff',
                  color: '#2563eb',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                ⓘ
              </button>
              <button
                className="doors-add-user-btn"
                type="button"
                aria-label="Nueva fecha"
                onClick={() => setModalOpen(true)}
                title="Nueva fecha"
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

          {infoOpen && (
            <div style={{ padding: '12px 16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, marginBottom: 16, color: '#1e40af', fontSize: 13 }}>
              <strong>Gestión de Fechas y Eventos:</strong> Creá las fechas de cada noche de apertura para asignar y organizar las emisiones y validaciones en puerta.
            </div>
          )}

          {/* Panel Principal */}
          <section
            className="doors-panel"
            style={{
              margin: '10px 0 0',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              background: '#fff',
              boxShadow: '0 4px 14px rgba(0,0,0,0.02)',
              overflow: 'hidden'
            }}
          >
            {events.length === 0 ? (
              <div style={{ padding: '34px 20px', textAlign: 'center', color: '#64748b', fontSize: 13, fontWeight: 500 }}>
                No tenés fechas cargadas.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid #f1f5f9', background: '#fafbfc', color: '#1e293b', fontSize: 13, fontWeight: 700 }}>
                  <span>Noche / Evento</span>
                  <span>{events.length} {events.length === 1 ? 'fecha' : 'fechas'}</span>
                </div>
                {events.map((event) => {
                  const eventTickets = tickets.filter((t) => t.eventId === event.id)
                  const redeemedCount = eventTickets.filter((t) => t.redeemedAt).length
                  const isClosed = event.status === 'cerrado'

                  return (
                    <div
                      key={event.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 18px',
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background 0.15s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 10,
                            background: isClosed ? '#f1f5f9' : '#eff6ff',
                            color: isClosed ? '#94a3b8' : '#2563eb',
                            display: 'grid',
                            placeItems: 'center',
                            fontSize: 16
                          }}
                        >
                          📅
                        </div>
                        <div>
                          <strong style={{ fontSize: 14, color: '#0f172a', display: 'block' }}>{event.name}</strong>
                          <small style={{ color: '#64748b', fontSize: 11 }}>
                            {formatDate(event.date)} · Apertura: {event.doorsOpen || '23:59'} · {event.venue || 'Salón Principal'}
                          </small>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', display: 'block' }}>
                            {redeemedCount} / {eventTickets.length}
                          </span>
                          <small style={{ color: '#94a3b8', fontSize: 10 }}>en puerta</small>
                        </div>

                        <span
                          className={`pill ${isClosed ? 'pill-muted' : 'pill-ok'}`}
                          style={{ textTransform: 'uppercase', fontSize: 11 }}
                        >
                          {event.status}
                        </span>

                        <button
                          type="button"
                          className="doors-edit-btn"
                          onClick={() => updateEventStatus(event.id, isClosed ? 'activo' : 'cerrado')}
                          title={isClosed ? 'Reactivar fecha' : 'Cerrar fecha'}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            border: '1px solid #e2e8f0',
                            background: '#fff',
                            cursor: 'pointer'
                          }}
                        >
                          {isClosed ? '↺' : '✕'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </main>
      </div>

      {/* Modal Nueva Fecha */}
      {modalOpen && (
        <div className="doors-calendar-backdrop" onClick={() => setModalOpen(false)}>
          <div
            className="doors-calendar-modal"
            style={{ width: 'min(460px, 94vw)', padding: 24, borderRadius: 16 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1e3a8a', margin: 0 }}>Nueva Fecha</h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{ border: 0, background: 'transparent', fontSize: 20, color: '#64748b', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEvent} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="doors-field-group">
                <label className="doors-field-label">Nombre de la Fecha</label>
                <div className="doors-input-wrapper">
                  <input
                    type="text"
                    required
                    placeholder="Ej: Viernes 25 / Sábado 26"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="doors-field-group">
                  <label className="doors-field-label">Fecha y Hora</label>
                  <div className="doors-input-wrapper">
                    <input
                      type="datetime-local"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="doors-field-group">
                  <label className="doors-field-label">Apertura Puerta</label>
                  <div className="doors-input-wrapper">
                    <input
                      type="time"
                      required
                      value={doorsOpen}
                      onChange={(e) => setDoorsOpen(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="doors-field-group">
                <label className="doors-field-label">Salón / Sala</label>
                <div className="doors-input-wrapper">
                  <input
                    type="text"
                    placeholder="Ej: Sala Principal"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                  />
                </div>
              </div>

              <div className="doors-field-group">
                <label className="doors-field-label">Notas (Opcional)</label>
                <textarea
                  rows={2}
                  placeholder="Dress code, cortesías especiales..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
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

              {error ? <p style={{ color: '#dc2626', fontSize: 12, margin: 0 }}>{error}</p> : null}

              <button
                className="doors-submit-btn"
                type="submit"
                disabled={saving}
                style={{ marginTop: 8 }}
              >
                {saving ? 'GUARDANDO...' : 'CREAR FECHA'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
