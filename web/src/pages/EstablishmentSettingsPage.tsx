import { useState, useEffect, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { useApp, isEntityForVenue } from '../context/AppContext'
import { StaffHeader } from '../components/StaffHeader'
import { CouponTemplateEditor } from '../components/CouponTemplateEditor'

type SectionProps = { title: string; open: boolean; onToggle: () => void; children: React.ReactNode }

export function EstablishmentSettingsPage() {
  const { users, activeVenue, venues, updateVenue } = useApp()
  const [activeTab, setActiveTab] = useState<'general' | 'template'>('general')
  const [open, setOpen] = useState('establishment')

  const [name, setName] = useState('')
  const [visibleDays, setVisibleDays] = useState('7')
  const [minAgeMen, setMinAgeMen] = useState('18')
  const [minAgeWomen, setMinAgeWomen] = useState('18')
  const [logo, setLogo] = useState('')
  const [qrBackground, setQrBackground] = useState('')
  const [primaryColor, setPrimaryColor] = useState('')
  const [brandStrongColor, setBrandStrongColor] = useState('')
  const [backgroundColor, setBackgroundColor] = useState('')
  const [saved, setSaved] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Sync state when active venue loads
  useEffect(() => {
    if (activeVenue) {
      setName(activeVenue.name || '')
      setVisibleDays(activeVenue.visibleDays || '7')
      setMinAgeMen(activeVenue.minAgeMen || '18')
      setMinAgeWomen(activeVenue.minAgeWomen || '18')
      setLogo(activeVenue.logo || '')
      setQrBackground(activeVenue.qrBackground || '')
      setPrimaryColor(activeVenue.primaryColor || '')
      setBrandStrongColor(activeVenue.brandStrongColor || '')
      setBackgroundColor(activeVenue.backgroundColor || '')
    } else {
      setName(localStorage.getItem('qr-pass-line.business-name') ?? 'Cubano')
      setLogo(localStorage.getItem('qr-pass-line.establishment-logo') ?? '')
      setQrBackground(localStorage.getItem('qr-pass-line.qr-background') ?? '')
    }
  }, [activeVenue])

  const targetVenueId = activeVenue?.id

  const organizers = users.filter((u) =>
    (u.role === 'organizador' || u.role === 'admin' || (u.roles && (u.roles.includes('organizador') || u.roles.includes('admin')))) &&
    isEntityForVenue(u.venueId, targetVenueId, venues)
  )

  function loadImage(event: ChangeEvent<HTMLInputElement>, setter: (value: string) => void) {
    const file = event.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => setter(typeof reader.result === 'string' ? reader.result : '')
    reader.readAsDataURL(file)
  }

  function applyColorTheme(pColor: string, bColor: string, bgCol: string) {
    setPrimaryColor(pColor)
    setBrandStrongColor(bColor)
    setBackgroundColor(bgCol)
    const root = document.documentElement
    if (pColor) {
      const bStrong = bColor || '#180500'
      const bgGrad = bgCol && bgCol.includes('gradient')
        ? bgCol
        : `linear-gradient(135deg, ${bStrong} 0%, #3d1000 45%, ${pColor} 100%)`
      root.style.setProperty('--brand', pColor)
      root.style.setProperty('--brand-strong', bStrong)
      root.style.setProperty('--bg-gradient', bgGrad)
      root.style.setProperty('--brand-soft', `${pColor}20`)
      root.style.setProperty('--brand-glow', `${pColor}55`)
    } else {
      root.style.removeProperty('--brand')
      root.style.removeProperty('--brand-strong')
      root.style.removeProperty('--bg-gradient')
      root.style.removeProperty('--brand-soft')
      root.style.removeProperty('--brand-glow')
    }
  }

  async function save() {
    setIsSaving(true)
    const cleanName = name.trim() || activeVenue?.name || 'Mi Establecimiento'
    
    // Save to local storage for quick cache fallback
    localStorage.setItem('qr-pass-line.business-name', cleanName)
    if (logo) localStorage.setItem('qr-pass-line.establishment-logo', logo)
    else localStorage.removeItem('qr-pass-line.establishment-logo')
    if (qrBackground) localStorage.setItem('qr-pass-line.qr-background', qrBackground)
    else localStorage.removeItem('qr-pass-line.qr-background')

    try {
      if (targetVenueId) {
        await updateVenue(targetVenueId, {
          name: cleanName,
          visibleDays,
          minAgeMen,
          minAgeWomen,
          logo,
          qrBackground,
          primaryColor: primaryColor || '',
          brandStrongColor: brandStrongColor || '',
          backgroundColor: backgroundColor || '',
        })
      }
      setSaved(true)
      window.setTimeout(() => setSaved(false), 2800)
    } catch (err) {
      alert('Error al guardar configuración: ' + (err instanceof Error ? err.message : 'Error desconocido'))
    } finally {
      setIsSaving(false)
    }
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
            <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 24, fontWeight: 800, color: 'var(--brand)' }}>
              <span>{name || activeVenue?.name || 'Mi Establecimiento'}</span>
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
                border: activeTab === 'general' ? '2px solid var(--brand)' : '1px solid #dce4ed',
                background: activeTab === 'general' ? 'var(--brand)' : '#fff',
                color: activeTab === 'general' ? '#fff' : '#475569',
                boxShadow: activeTab === 'general' ? '0 4px 12px var(--brand-soft)' : '0 1px 3px rgba(0,0,0,0.05)',
                transition: 'all 0.15s ease-in-out'
              }}
            >
              🏢 Configuración del Local
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
                border: activeTab === 'template' ? '2px solid var(--brand)' : '1px solid #dce4ed',
                background: activeTab === 'template' ? 'var(--brand)' : '#fff',
                color: activeTab === 'template' ? '#fff' : '#475569',
                boxShadow: activeTab === 'template' ? '0 4px 12px var(--brand-soft)' : '0 1px 3px rgba(0,0,0,0.05)',
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
                  <label className="settings-field"><span>Nombre del Local</span><input value={name} onChange={(event) => setName(event.target.value)} /></label>
                  <label className="settings-field"><span>Días visibles para vendedores</span><input value={visibleDays} onChange={(event) => setVisibleDays(event.target.value)} inputMode="numeric" /></label>
                  <ImageSetting title="Logo del local (exclusivo de este establecimiento)" value={logo} onChange={(event) => loadImage(event, setLogo)} preview={logo || '/favicon.svg'} />
                  <ImageSetting title="Fondo de cupón / afiche QR" value={qrBackground} onChange={(event) => loadImage(event, setQrBackground)} preview={qrBackground || '/favicon.svg'} />
                  <div className="settings-age-grid">
                    <label className="settings-field"><span>Edad mínima H</span><input value={minAgeMen} onChange={(event) => setMinAgeMen(event.target.value)} /></label>
                    <label className="settings-field"><span>Edad mínima M</span><input value={minAgeWomen} onChange={(event) => setMinAgeWomen(event.target.value)} /></label>
                  </div>

                  <div style={{ marginTop: 14, padding: '16px', background: '#f8fafc', borderRadius: 14, border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <strong style={{ fontSize: 14, color: '#0f172a' }}>🎨 Paleta de colores del local</strong>
                      {(primaryColor || backgroundColor || brandStrongColor) && (
                        <button
                          type="button"
                          onClick={() => applyColorTheme('', '', '')}
                          style={{ border: 'none', background: 'none', color: '#64748b', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          Restablecer por defecto
                        </button>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                      <button
                        type="button"
                        onClick={() => applyColorTheme('#FF4606', '#180500', 'linear-gradient(135deg, #180500 0%, #3d1000 45%, #ff4606 100%)')}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '6px 12px',
                          borderRadius: 20,
                          border: primaryColor === '#FF4606' ? '2px solid #FF4606' : '1px solid #fed7aa',
                          background: '#fff7ed',
                          color: '#c2410c',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF4606' }} />
                        Naranja JOSEO
                      </button>

                      <button
                        type="button"
                        onClick={() => applyColorTheme('#0860bd', '#071322', 'linear-gradient(135deg, #071322 0%, #0d2746 45%, #0860bd 100%)')}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '6px 12px',
                          borderRadius: 20,
                          border: primaryColor === '#0860bd' ? '2px solid #0860bd' : '1px solid #cbd5e1',
                          background: '#f1f5f9',
                          color: '#0f172a',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#0860bd' }} />
                        Cubano (Original)
                      </button>

                      <button
                        type="button"
                        onClick={() => applyColorTheme('#8B5CF6', '#120524', 'linear-gradient(135deg, #120524 0%, #290848 45%, #8b5cf6 100%)')}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '6px 12px',
                          borderRadius: 20,
                          border: primaryColor === '#8B5CF6' ? '2px solid #8B5CF6' : '1px solid #e9d5ff',
                          background: '#faf5ff',
                          color: '#6b21a8',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#8B5CF6' }} />
                        Violeta Neón
                      </button>

                      <button
                        type="button"
                        onClick={() => applyColorTheme('#10B981', '#03140e', 'linear-gradient(135deg, #03140e 0%, #063122 45%, #10b981 100%)')}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '6px 12px',
                          borderRadius: 20,
                          border: primaryColor === '#10B981' ? '2px solid #10B981' : '1px solid #a7f3d0',
                          background: '#f0fdf4',
                          color: '#047857',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10B981' }} />
                        Verde Esmeralda
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 700, color: '#334155' }}>
                        <span>Color Principal (Botones)</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input
                            type="color"
                            value={primaryColor || '#0860bd'}
                            onChange={(e) => applyColorTheme(e.target.value, brandStrongColor, backgroundColor)}
                            style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid #cbd5e1', cursor: 'pointer', padding: 0 }}
                          />
                          <input
                            type="text"
                            value={primaryColor}
                            placeholder="#0860bd"
                            onChange={(e) => applyColorTheme(e.target.value, brandStrongColor, backgroundColor)}
                            style={{ flex: 1, padding: '6px 8px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12, fontFamily: 'monospace' }}
                          />
                        </div>
                      </label>

                      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 700, color: '#334155' }}>
                        <span>Color de Fondo (Pantallas)</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input
                            type="color"
                            value={backgroundColor || '#eef2f7'}
                            onChange={(e) => applyColorTheme(primaryColor, brandStrongColor, e.target.value)}
                            style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid #cbd5e1', cursor: 'pointer', padding: 0 }}
                          />
                          <input
                            type="text"
                            value={backgroundColor}
                            placeholder="#eef2f7"
                            onChange={(e) => applyColorTheme(primaryColor, brandStrongColor, e.target.value)}
                            style={{ flex: 1, padding: '6px 8px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12, fontFamily: 'monospace' }}
                          />
                        </div>
                      </label>

                      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 700, color: '#334155' }}>
                        <span>Color Oscuro (Encabezados)</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input
                            type="color"
                            value={brandStrongColor || '#102d4a'}
                            onChange={(e) => applyColorTheme(primaryColor, e.target.value, backgroundColor)}
                            style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid #cbd5e1', cursor: 'pointer', padding: 0 }}
                          />
                          <input
                            type="text"
                            value={brandStrongColor}
                            placeholder="#102d4a"
                            onChange={(e) => applyColorTheme(primaryColor, e.target.value, backgroundColor)}
                            style={{ flex: 1, padding: '6px 8px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12, fontFamily: 'monospace' }}
                          />
                        </div>
                      </label>
                    </div>
                  </div>
                  <button className="btn btn-primary settings-save" type="button" onClick={save} disabled={isSaving}>
                    {isSaving ? 'GUARDANDO...' : 'GUARDAR ESTABLECIMIENTO'}
                  </button>
                  {saved ? <p className="flash flash-ok">Establecimiento guardado exitosamente.</p> : null}
                </div>
              </SettingsSection>

              <SettingsSection title="Configuración de Cupón / Afiche QR" open={open === 'template-accordion'} onToggle={() => setOpen(open === 'template-accordion' ? '' : 'template-accordion')}>
                <div style={{ padding: '8px 0' }}>
                  <p style={{ fontSize: 13, color: '#64748b', marginBottom: 14 }}>
                    Podés calibrar el zoom del afiche, moverlo con los cursores direccionales, ajustar el tamaño del código QR y su brillo exclusivamente para este establecimiento.
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setActiveTab('template')}
                    style={{ background: 'var(--brand)', fontWeight: 800, padding: '10px 20px', borderRadius: 10 }}
                  >
                    ⚙️ Abrir Editor de Cupón de este Local
                  </button>
                </div>
              </SettingsSection>

              <SettingsSection title="Encargados de este Local" open={open === 'managers'} onToggle={() => setOpen(open === 'managers' ? '' : 'managers')}>
                <div className="manager-list">
                  {organizers.map(org => <Manager key={org.id} name={org.name} email={org.email} />)}
                  {!organizers.length && <p className="muted" style={{ padding: 12 }}>No hay otros encargados asignados a este local.</p>}
                </div>
                <p className="settings-note">Para agregar un nuevo encargado para este local, pedile que se registre y asignale el rol y este local desde el panel de Administración General.</p>
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
