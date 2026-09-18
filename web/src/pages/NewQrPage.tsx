import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { loadQrCatalog, saveQrCatalog, type QrCatalogItem } from '../lib/qrCatalog'

const iconOptions = ['Ticket', 'Estrella', 'Pulsera', 'Copa', 'Rayo']
const hours = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0'))
const minutes = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'))

export function NewQrPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const editingId = params.get('id')
  const existingQr = editingId ? loadQrCatalog().find((qr) => qr.id === editingId) : undefined
  const [kind, setKind] = useState<'viral' | 'consumible'>(existingQr?.kind ?? 'consumible')
  const [icon, setIcon] = useState(existingQr?.icon ?? 'Ticket')
  const [backgroundImage, setBackgroundImage] = useState(existingQr?.backgroundImage ?? '')
  const [publicAccess, setPublicAccess] = useState(existingQr?.publicAccess ?? false)
  const [active, setActive] = useState(existingQr?.active ?? true)
  const [openSection, setOpenSection] = useState<'validity' | 'visual' | 'rules' | null>('validity')
  const [scheduleMode, setScheduleMode] = useState<'full' | 'end' | 'hidden'>(existingQr?.scheduleMode ?? 'full')
  const [days, setDays] = useState<string[]>(existingQr?.days ?? ['L', 'M', 'X', 'J', 'V', 'S', 'D'])
  const [picker, setPicker] = useState<'from' | 'duration' | null>(null)
  const [pickerHour, setPickerHour] = useState('08')
  const [pickerMinute, setPickerMinute] = useState('00')
  const [dayMode, setDayMode] = useState<'current' | 'next'>('current')
  const [fromLabel, setFromLabel] = useState(existingQr?.from ?? '08:00 del día corriente')
  const [durationLabel, setDurationLabel] = useState(existingQr?.duration ?? '23:59 (hasta las 07:59 del día siguiente)')

  function selectBackground(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      window.alert('Seleccioná un archivo de imagen.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setBackgroundImage(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => window.alert('No se pudo cargar la imagen seleccionada.')
    reader.readAsDataURL(file)
  }

  function openPicker(type: 'from' | 'duration') {
    setPicker(type)
    if (type === 'duration') {
      setPickerHour('23')
      setPickerMinute('59')
    }
  }

  function confirmPicker() {
    if (picker === 'from') {
      setFromLabel(`${pickerHour}:${pickerMinute} del día ${dayMode === 'current' ? 'corriente' : 'siguiente'}`)
    } else if (picker === 'duration') {
      setDurationLabel(`${pickerHour}:${pickerMinute} (hasta las ${pickerHour === '23' ? '07' : pickerHour}:${pickerMinute} del día siguiente)`)
    }
    setPicker(null)
  }

  function toggleDay(day: string) {
    setDays((current) => current.includes(day) ? current.filter((item) => item !== day) : [...current, day])
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const item: QrCatalogItem = {
      id: editingId ?? `qr-${crypto.randomUUID().slice(0, 8)}`,
      name: String(form.get('name')).trim().toUpperCase(),
      description: String(form.get('description')).trim() || 'Acceso QR',
      kind,
      from: fromLabel,
      duration: durationLabel,
      icon,
      publicAccess,
      active,
      days,
      scheduleMode,
      backgroundImage,
    }
    saveQrCatalog([item, ...loadQrCatalog().filter((qr) => qr.id !== item.id)])
    navigate('/qr')
  }

  return (
    <div className="staff-page qr-page">
      <header className="staff-header"><div className="staff-brand"><img src={localStorage.getItem('qr-pass-line.logo') || '/favicon.svg'} alt="" /><strong>QR Pass Line</strong></div><div className="staff-close">×</div></header>
      <div className="staff-layout">
        <aside className="staff-sidebar"><Link className="staff-sidebar-control" to="/qr">‹</Link><Link to="/encargado">⌂</Link><Link to="/vendedores">♙</Link><Link className="active" to="/qr">▣</Link><Link to="/fechas">⌁</Link><Link to="/equipo">◎</Link><Link to="/puerta">?</Link></aside>
        <main className="new-qr-main">
          <div className="sellers-titlebar new-qr-titlebar"><Link to="/qr" className="back-link">‹</Link><h1>Nuevo Cupón QR</h1><button className="add-person" type="button" aria-label="Información">i</button></div>
          <form onSubmit={submit} className="new-qr-form">
            <section className="new-qr-basic">
              <div className="icon-name-row"><button className="qr-icon-select" type="button" aria-label="Seleccionar icono" onClick={() => setIcon(iconOptions[(iconOptions.indexOf(icon) + 1) % iconOptions.length])}>{icon === 'Ticket' ? '▱' : icon === 'Estrella' ? '★' : icon === 'Pulsera' ? '◌' : icon === 'Copa' ? '♢' : 'ϟ'}</button><label className="floating-field"><span>Nombre</span><input name="name" placeholder="Nombre" required /></label></div>
              <label className="floating-field"><span>Descripción (Interno)</span><textarea name="description" placeholder="Observaciones internas para encargados y vendedores" rows={3} /></label>
              <div className="new-qr-label">Tipo de Cupón</div>
              <div className="qr-kind-toggle"><button type="button" className={kind === 'viral' ? 'selected' : ''} onClick={() => setKind('viral')}>QR Viral</button><button type="button" className={kind === 'consumible' ? 'selected' : ''} onClick={() => setKind('consumible')}>QR Consumible</button></div>
            </section>
            <Collapsible title="Vigencia" open={openSection === 'validity'} onClick={() => setOpenSection(openSection === 'validity' ? null : 'validity')}>
              <button className="new-qr-select new-qr-select-button" type="button" onClick={() => openPicker('from')}><small>Desde</small><span>◷ {fromLabel}</span><b>⌄</b></button>
              <button className="new-qr-select new-qr-select-button" type="button" onClick={() => openPicker('duration')}><small>Duración</small><span>◷ {durationLabel}</span><b>⌄</b></button>
              <div className="new-qr-label">Mostrar horario</div><div className="schedule-toggle"><button type="button" className={scheduleMode === 'full' ? 'selected' : ''} onClick={() => setScheduleMode('full')}>Completo</button><button type="button" className={scheduleMode === 'end' ? 'selected' : ''} onClick={() => setScheduleMode('end')}>Ocultar fin</button><button type="button" className={scheduleMode === 'hidden' ? 'selected' : ''} onClick={() => setScheduleMode('hidden')}>Ocultar todo</button></div>
              <div className="new-qr-label">Días predeterminados</div><div className="days-row">{['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day) => <button className={days.includes(day) ? 'selected' : ''} type="button" key={day} onClick={() => toggleDay(day)}>{day}</button>)}</div>
            </Collapsible>
            <Collapsible title="Visual" open={openSection === 'visual'} onClick={() => setOpenSection(openSection === 'visual' ? null : 'visual')}>
              <div className="visual-upload">
                <label className="visual-upload-button"><span>{backgroundImage ? 'Cambiar imagen de fondo' : 'Subir imagen de fondo'}</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={selectBackground} /></label>
                <small>La imagen se mostrará como fondo del acceso QR.</small>
                {backgroundImage ? <div className="visual-image-preview" style={{ backgroundImage: `url(${backgroundImage})` }}><button type="button" onClick={() => setBackgroundImage('')}>Quitar imagen</button></div> :                 <div className="visual-placeholder"><img src={localStorage.getItem('qr-pass-line.logo') || '/favicon.svg'} alt="" /><strong>QR Pass Line</strong><small>Sin imagen de fondo</small></div>}
              </div>
            </Collapsible>
            <Collapsible title="Reglas" open={openSection === 'rules'} onClick={() => setOpenSection(openSection === 'rules' ? null : 'rules')}><div className="rule-row"><span>Público</span><div className="mini-toggle"><button className={publicAccess ? 'selected' : ''} type="button" onClick={() => setPublicAccess(true)}>Sí</button><button className={!publicAccess ? 'selected' : ''} type="button" onClick={() => setPublicAccess(false)}>No</button></div></div></Collapsible>
            <div className="new-qr-icon-field"><input value={icon} readOnly aria-label="Icono seleccionado" placeholder="Seleccionar icono..." /><button type="button" onClick={() => setIcon(iconOptions[(iconOptions.indexOf(icon) + 1) % iconOptions.length])}>⌄</button></div>
            <p className="new-qr-hint">Completá nombre y tipo. Configurá vigencia y reglas según corresponda.</p>
            <div className="status-toggle"><button type="button" className={active ? 'selected' : ''} onClick={() => setActive(true)}>Activo</button><button type="button" className={!active ? 'selected' : ''} onClick={() => setActive(false)}>Inactivo</button></div>
            <button className="btn btn-primary new-qr-save" type="submit">{editingId ? 'GUARDAR CAMBIOS' : 'CREAR CUPÓN'}</button>
          </form>
        </main>
      </div>
      {picker ? <div className="time-picker-backdrop" role="dialog" aria-modal="true" aria-label="Seleccionar horario"><button className="time-picker-dismiss" type="button" aria-label="Cerrar selector" onClick={() => setPicker(null)} /><section className="time-picker-sheet"><div className="sheet-handle" /><div className="time-picker-title"><span>{picker === 'from' ? 'Desde las' : 'Duración'}</span><strong>{pickerHour}:{pickerMinute}</strong>{picker === 'from' ? <div className="day-choice"><button className={dayMode === 'current' ? 'selected' : ''} type="button" onClick={() => setDayMode('current')}>Corriente</button><button className={dayMode === 'next' ? 'selected' : ''} type="button" onClick={() => setDayMode('next')}>Siguiente</button></div> : null}</div><div className="wheel-picker"><div className="wheel-column">{hours.map((hour) => <button className={hour === pickerHour ? 'active' : ''} type="button" key={hour} onClick={() => setPickerHour(hour)}>{hour}</button>)}</div><span>:</span><div className="wheel-column">{minutes.map((minute) => <button className={minute === pickerMinute ? 'active' : ''} type="button" key={minute} onClick={() => setPickerMinute(minute)}>{minute}</button>)}</div></div><button className="btn btn-primary time-picker-confirm" type="button" onClick={confirmPicker}>Confirmar horario</button></section></div> : null}
    </div>
  )
}

function Collapsible({ title, open, onClick, children }: { title: string; open: boolean; onClick: () => void; children: React.ReactNode }) {
  return <section className="new-qr-section collapsible-section"><button className="collapsible-title" type="button" onClick={onClick}><span>{title}</span><b>{open ? '⌃' : '⌄'}</b></button>{open ? <div className="collapsible-body">{children}</div> : null}</section>
}
