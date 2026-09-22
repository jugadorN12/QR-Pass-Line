import { useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { StaffHeader } from '../components/StaffHeader'
import { CouponTemplateEditor } from '../components/CouponTemplateEditor'

type SectionProps = { title: string; open: boolean; onToggle: () => void; children: React.ReactNode }

export function EstablishmentSettingsPage() {
  const { users } = useApp()
  const [activeTab, setActiveTab] = useState<'general' | 'template'>('general')
  const [open, setOpen] = useState('establishment')
  const [name, setName] = useState(localStorage.getItem('qr-pass-line.business-name') ?? 'Cubano')
  const [visibleDays, setVisibleDays] = useState('7')
  const [minAgeMen, setMinAgeMen] = useState('18')
  const [minAgeWomen, setMinAgeWomen] = useState('18')
  const [logo, setLogo] = useState(() => localStorage.getItem('qr-pass-line.establishment-logo') ?? '')
  const [qrBackground, setQrBackground] = useState(() => localStorage.getItem('qr-pass-line.qr-background') ?? '')
  const [saved, setSaved] = useState(false)

  const organizers = users.filter((u) => u.role === 'organizador' || u.role === 'admin')

  function loadImage(event: ChangeEvent<HTMLInputElement>, setter: (value: string) => void) {
    const file = event.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => setter(typeof reader.result === 'string' ? reader.result : '')
    reader.readAsDataURL(file)
  }

  function save() {
    localStorage.setItem('qr-pass-line.business-name', name.trim() || 'Cubano')
    if (logo) localStorage.setItem('qr-pass-line.establishment-logo', logo)
    else localStorage.removeItem('qr-pass-line.establishment-logo')
    if (qrBackground) localStorage.setItem('qr-pass-line.qr-background', qrBackground)
    else localStorage.removeItem('qr-pass-line.qr-background')
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2400)
  }

  return (
    <div className="staff-page settings-page">
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

        <main className="settings-main" style={{ padding: '20px 32px 100px' }}>
          <div className="sellers-titlebar" style={{ marginBottom: 16 }}>
            <Link to="/encargado" className="back-link">‹</Link>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 24, fontWeight: 800, color: '#0860bd' }}>
              <span>{name || 'Cubano'}</span>
              <button className="doors-info-btn" type="button" aria-label="Información" style={{ width: 24, height: 24, borderRadius: '50%', border: '1px solid #bfdbfe', background: '#eff6ff', color: '#2563eb', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>i</button>
            </h1>
          </div>

          {/* Top Switcher Tabs / Pills */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setActiveTab('general')}
              style={{
                padding: '10px 22px',
                borderRadius: 24,
                fontWeight: 800,
                fontSize: 14,
                cursor: 'pointer',
                border: activeTab === 'general' ? '2px solid #0860bd' : '1px solid #dce4ed',
                background: activeTab === 'general' ? '#0860bd' : '#fff',
                color: activeTab === 'general' ? '#fff' : '#475569',
                boxShadow: activeTab === 'general' ? '0 4px 12px rgba(8,96,189,0.25)' : '0 1px 3px rgba(0,0,0,0.05)',
                transition: 'all 0.15s ease-in-out'
              }}
            >
              🏢 Editar Establecimiento
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('template')}
              style={{
                padding: '10px 22px',
                borderRadius: 24,
                fontWeight: 800,
                fontSize: 14,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                border: activeTab === 'template' ? '2px solid #0860bd' : '1px solid #dce4ed',
                background: activeTab === 'template' ? '#0860bd' : '#fff',
                color: activeTab === 'template' ? '#fff' : '#475569',
                boxShadow: activeTab === 'template' ? '0 4px 12px rgba(8,96,189,0.25)' : '0 1px 3px rgba(0,0,0,0.05)',
                transition: 'all 0.15s ease-in-out'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              Configurar Cupón
            </button>
          </div>

          {activeTab === 'template' ? (
            <CouponTemplateEditor />
          ) : (
            <>
              <SettingsSection title="Editar establecimiento" open={open === 'establishment'} onToggle={() => setOpen(open === 'establishment' ? '' : 'establishment')}>
                <div className="settings-fields">
                  <label className="settings-field"><span>Nombre</span><input value={name} onChange={(event) => setName(event.target.value)} /></label>
                  <label className="settings-field"><span>Días visibles para vendedores</span><input value={visibleDays} onChange={(event) => setVisibleDays(event.target.value)} inputMode="numeric" /></label>
                  <ImageSetting title="Logo actual" value={logo} onChange={(event) => loadImage(event, setLogo)} preview={logo || '/favicon.svg'} />
                  <ImageSetting title="Fondo QR actual" value={qrBackground} onChange={(event) => loadImage(event, setQrBackground)} preview={qrBackground || '/favicon.svg'} />
                  <div className="settings-age-grid">
                    <label className="settings-field"><span>Edad mínima H</span><input value={minAgeMen} onChange={(event) => setMinAgeMen(event.target.value)} /></label>
                    <label className="settings-field"><span>Edad mínima M</span><input value={minAgeWomen} onChange={(event) => setMinAgeWomen(event.target.value)} /></label>
                  </div>
                  <button className="btn btn-primary settings-save" type="button" onClick={save}>GUARDAR ESTABLECIMIENTO</button>
                  {saved ? <p className="flash flash-ok">Establecimiento guardado.</p> : null}
                </div>
              </SettingsSection>

              <SettingsSection title="Configuración de Cupón / Afiche QR" open={open === 'template-accordion'} onToggle={() => setOpen(open === 'template-accordion' ? '' : 'template-accordion')}>
                <div style={{ padding: '8px 0' }}>
                  <p style={{ fontSize: 13, color: '#64748b', marginBottom: 14 }}>
                    Podés calibrar el zoom del afiche, moverlo con los cursores direccionales, ajustar el tamaño del código QR y su brillo para todos los vendedores.
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setActiveTab('template')}
                    style={{ background: '#0860bd', fontWeight: 800, padding: '10px 20px', borderRadius: 10 }}
                  >
                    ⚙️ Abrir Editor de Cupón Completo
                  </button>
                </div>
              </SettingsSection>

              <SettingsSection title="Encargados" open={open === 'managers'} onToggle={() => setOpen(open === 'managers' ? '' : 'managers')}>
                <div className="manager-list">
                  {organizers.map(org => <Manager key={org.id} name={org.name} email={org.email} />)}
                </div>
                <p className="settings-note">Para agregar un nuevo encargado, pedile que se registre y asignale el rol desde el panel de Administración General.</p>
              </SettingsSection>

              <SettingsSection title="Parámetros de establecimiento" open={open === 'parameters'} onToggle={() => setOpen(open === 'parameters' ? '' : 'parameters')}>
                <div className="parameter-list">
                  <Parameter title="Tiempo de tolerancia de canjeo" />
                  <Parameter title="Mensajes" />
                  <Parameter title="Personalización de link" />
                  <Parameter title="Personalización de vencimiento" />
                  <Parameter title="Edición de datos del portador" />
                  <Parameter title="Facebook Pixel" />
                </div>
                <div className="settings-radio">
                  <span>Mostrar SOLD OUT</span>
                  <label><input type="radio" name="soldout" /> Activo</label>
                  <label><input type="radio" name="soldout" defaultChecked /> Inactivo</label>
                </div>
              </SettingsSection>
            </>
          )}
        </main>
      </div>
    </div>
  )
}

function SettingsSection({ title, open, onToggle, children }: SectionProps) {
  return (
    <section className="settings-section">
      <button className="settings-section-title" type="button" onClick={onToggle}>
        <span>{title}</span>
        <b>{open ? '⌃' : '⌄'}</b>
      </button>
      {open ? <div className="settings-section-body">{children}</div> : null}
    </section>
  )
}

function ImageSetting({ title, onChange, preview }: { title: string; value: string; onChange: (event: ChangeEvent<HTMLInputElement>) => void; preview: string }) {
  return (
    <div className="image-setting">
      <strong>{title}</strong>
      <img src={preview} alt={title} />
      <label>
        <span>Cambiar imagen</span>
        <input type="file" accept="image/*" onChange={onChange} />
      </label>
    </div>
  )
}

function Manager({ name, email }: { name: string; email: string }) {
  return (
    <article className="manager-item">
      <div className="seller-avatar seller-avatar-demo">Q</div>
      <div>
        <strong>{name}</strong>
        <small>{email}</small>
      </div>
    </article>
  )
}

function Parameter({ title }: { title: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="parameter-item">
      <button type="button" onClick={() => setOpen(!open)}>
        <span>{title}</span>
        <b>{open ? '⌃' : '⌄'}</b>
      </button>
      {open ? <p>Configuración disponible para este establecimiento.</p> : null}
    </div>
  )
}
