import { useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { StaffHeader } from '../components/StaffHeader'

type SectionProps = { title: string; open: boolean; onToggle: () => void; children: React.ReactNode }

export function EstablishmentSettingsPage() {
  const { users } = useApp()
  const [open, setOpen] = useState('establishment')
  const [name, setName] = useState(localStorage.getItem('qr-pass-line.business-name') ?? 'QR Pass Line')
  const [visibleDays, setVisibleDays] = useState('7')
  const [minAgeMen, setMinAgeMen] = useState('18')
  const [minAgeWomen, setMinAgeWomen] = useState('18')
  const [logo, setLogo] = useState(() => localStorage.getItem('qr-pass-line.establishment-logo') ?? '')
  const [qrBackground, setQrBackground] = useState(() => localStorage.getItem('qr-pass-line.qr-background') ?? '')
  const [saved, setSaved] = useState(false)

  const organizers = users.filter(u => u.role === 'organizador' || u.role === 'admin')

  function loadImage(event: ChangeEvent<HTMLInputElement>, setter: (value: string) => void) {
    const file = event.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => setter(typeof reader.result === 'string' ? reader.result : '')
    reader.readAsDataURL(file)
  }

  function save() {
    localStorage.setItem('qr-pass-line.business-name', name.trim() || 'QR Pass Line')
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
        <aside className="staff-sidebar">
          <Link className="staff-sidebar-control" to="/encargado">‹</Link>
          <Link to="/encargado">⌂</Link>
          <Link to="/vendedores">♙</Link>
          <Link to="/accesos">▣</Link>
          <Link to="/fechas">⌁</Link>
          <Link to="/equipo">◎</Link>
          <Link to="/puerta">?</Link>
        </aside>
        <main className="settings-main">
          <div className="sellers-titlebar">
            <Link to="/encargado" className="back-link">‹</Link>
            <h1>{name || 'QR Pass Line'}</h1>
            <button className="add-person" type="button" aria-label="Información">i</button>
          </div>

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
        </main>
      </div>
    </div>
  )
}

function SettingsSection({ title, open, onToggle, children }: SectionProps) {
  return <section className="settings-section"><button className="settings-section-title" type="button" onClick={onToggle}><span>{title}</span><b>{open ? '⌃' : '⌄'}</b></button>{open ? <div className="settings-section-body">{children}</div> : null}</section>
}

function ImageSetting({ title, onChange, preview }: { title: string; value: string; onChange: (event: ChangeEvent<HTMLInputElement>) => void; preview: string }) {
  return <div className="image-setting"><strong>{title}</strong><img src={preview} alt={title} /><label><span>Cambiar imagen</span><input type="file" accept="image/*" onChange={onChange} /></label></div>
}

function Manager({ name, email }: { name: string; email: string }) {
  return <article className="manager-item"><div className="seller-avatar seller-avatar-demo">Q</div><div><strong>{name}</strong><small>{email}</small></div></article>
}

function Parameter({ title }: { title: string }) {
  const [open, setOpen] = useState(false)
  return <div className="parameter-item"><button type="button" onClick={() => setOpen(!open)}><span>{title}</span><b>{open ? '⌃' : '⌄'}</b></button>{open ? <p>Configuración disponible para este establecimiento.</p> : null}</div>
}
