import { useState, useEffect, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import type { QrCatalogItem } from '../types'
import { StaffHeader } from '../components/StaffHeader'

const iconOptions = ['Ticket', 'Estrella', 'Pulsera', 'Copa', 'Rayo']
const hours = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0'))
const minutes = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'))

export function NewQrPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { qrCatalog, saveQrItem } = useApp()
  const editingId = params.get('id')
  const existingQr = editingId ? qrCatalog.find((qr) => qr.id === editingId) : undefined

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

  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  useEffect(() => {
    if (existingQr) {
      setKind(existingQr.kind ?? 'consumible')
      setIcon(existingQr.icon ?? 'Ticket')
      setBackgroundImage(existingQr.backgroundImage ?? '')
      setPublicAccess(existingQr.publicAccess ?? false)
      setActive(existingQr.active ?? true)
      setScheduleMode(existingQr.scheduleMode ?? 'full')
      setDays(existingQr.days ?? ['L', 'M', 'X', 'J', 'V', 'S', 'D'])
      setFromLabel(existingQr.from ?? '08:00 del día corriente')
      setDurationLabel(existingQr.duration ?? '23:59 (hasta las 07:59 del día siguiente)')
    }
  }, [existingQr])

  function selectBackground(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      window.alert('Seleccioná un archivo de imagen.')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const rawSrc = typeof reader.result === 'string' ? reader.result : ''
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const maxDim = 800
        let w = img.width
        let h = img.height
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w)
            w = maxDim
          } else {
            w = Math.round((w * maxDim) / h)
            h = maxDim
          }
        }
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h)
          const compressed = canvas.toDataURL('image/jpeg', 0.82)
          setBackgroundImage(compressed)
        } else {
          setBackgroundImage(rawSrc)
        }
      }
      img.src = rawSrc
    }
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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setSaveMessage('')
    try {
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

      await saveQrItem(item)

      setSaveMessage('✓ Cambios guardados con éxito')
      setTimeout(() => {
        navigate('/qr')
      }, 1000)
    } catch (err: any) {
      console.error('Error al guardar cupón:', err)
      window.alert('Error al guardar: ' + (err?.message || 'No se pudo guardar el cupón.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="staff-page qr-page">
      <StaffHeader />
      <div className="staff-layout">
        <aside className="staff-sidebar"><Link className="staff-sidebar-control" to="/qr">‹</Link><Link to="/encargado">⌂</Link><Link to="/vendedores">♙</Link><Link className="active" to="/qr">▣</Link><Link to="/fechas">⌁</Link><Link to="/equipo">◎</Link><Link to="/puerta">?</Link></aside>
        <main className="new-qr-main">
          <div className="sellers-titlebar new-qr-titlebar"><Link to="/qr" className="back-link">‹</Link><h1>{editingId ? 'Editar Cupón QR' : 'Nuevo Cupón QR'}</h1><button className="add-person" type="button" aria-label="Información">i</button></div>
          <form onSubmit={submit} className="new-qr-form">
            <section className="new-qr-basic">
              <div className="icon-name-row"><button className="qr-icon-select" type="button" aria-label="Seleccionar icono" onClick={() => setIcon(iconOptions[(iconOptions.indexOf(icon) + 1) % iconOptions.length])}>{icon === 'Ticket' ? '▱' : icon === 'Estrella' ? '★' : icon === 'Pulsera' ? '◌' : icon === 'Copa' ? '♢' : 'ϟ'}</button><label className="floating-field"><span>Nombre</span><input name="name" defaultValue={existingQr?.name} placeholder="Nombre" required /></label></div>
              <label className="floating-field"><span>Descripción (Interno)</span><textarea name="description" defaultValue={existingQr?.description} placeholder="Observaciones internas para encargados y vendedores" rows={3} /></label>
              <div className="new-qr-label">Tipo de Cupón</div>
              <div className="qr-kind-toggle"><button type="button" className={kind === 'viral' ? 'selected' : ''} onClick={() => setKind('viral')}>QR Viral</button><button type="button" className={kind === 'consumible' ? 'selected' : ''} onClick={() => setKind('consumible')}>QR Consumible</button></div>
            </section>

            <Collapsible title="Vigencia" open={openSection === 'validity'} onClick={() => setOpenSection(openSection === 'validity' ? null : 'validity')}>
              <button className="new-qr-select new-qr-select-button" type="button" onClick={() => openPicker('from')}><small>Desde</small><span>◷ {fromLabel}</span><b>⌄</b></button>
              <button className="new-qr-select new-qr-select-button" type="button" onClick={() => openPicker('duration')}><small>Duración</small><span>◷ {durationLabel}</span><b>⌄</b></button>
              <div className="new-qr-label">Mostrar horario</div><div className="schedule-toggle"><button type="button" className={scheduleMode === 'full' ? 'selected' : ''} onClick={() => setScheduleMode('full')}>Completo</button><button type="button" className={scheduleMode === 'end' ? 'selected' : ''} onClick={() => setScheduleMode('end')}>Ocultar fin</button><button type="button" className={scheduleMode === 'hidden' ? 'selected' : ''} onClick={() => setScheduleMode('hidden')}>Ocultar todo</button></div>
              <div className="new-qr-label">Días predeterminados</div><div className="days-row">{['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day) => <button className={days.includes(day) ? 'selected' : ''} type="button" key={day} onClick={() => toggleDay(day)}>{day}</button>)}</div>
            </Collapsible>

            {/* Redesigned Visual Section (Imagen 1) */}
            <Collapsible title="Visual" open={openSection === 'visual'} onClick={() => setOpenSection(openSection === 'visual' ? null : 'visual')}>
              <div className="visual-upload-container" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '12px 0' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#64748b' }}>Fondo actual</span>

                {/* Actions Toggles Row: Borrar fondo | Mantener fondo */}
                <div style={{ display: 'flex', border: '1px solid #cbd5e1', borderRadius: 12, overflow: 'hidden' }}>
                  <button
                    type="button"
                    onClick={() => setBackgroundImage('')}
                    style={{
                      flex: 1,
                      height: 42,
                      border: 0,
                      background: '#f8fafc',
                      color: '#475569',
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: 'pointer'
                    }}
                  >
                    Borrar fondo
                  </button>
                  <button
                    type="button"
                    style={{
                      flex: 1,
                      height: 42,
                      border: 0,
                      background: backgroundImage ? '#fecdd3' : '#f8fafc',
                      color: backgroundImage ? '#9f1239' : '#64748b',
                      fontWeight: 800,
                      fontSize: 13,
                      cursor: 'pointer'
                    }}
                  >
                    Mantener fondo
                  </button>
                </div>

                {/* Imagen Actual Section with Circular Camera Upload Trigger (Imagen 1) */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, marginTop: 8 }}>
                  <strong style={{ fontSize: 15, fontWeight: 900, color: '#0f172a' }}>Imagen Actual</strong>

                  {/* 1. Large Rectangular Poster Preview Card */}
                  {backgroundImage ? (
                    <div
                      style={{
                        width: 220,
                        height: 310,
                        borderRadius: 16,
                        backgroundImage: `url(${backgroundImage})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        boxShadow: '0 12px 28px rgba(0,0,0,0.2)',
                        border: '1px solid #cbd5e1'
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 220,
                        height: 310,
                        borderRadius: 16,
                        background: '#f1f5f9',
                        display: 'grid',
                        placeItems: 'center',
                        color: '#64748b',
                        border: '2px dashed #cbd5e1'
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 700 }}>Sin imagen cargada</span>
                    </div>
                  )}

                  {/* 2. Circular Camera Upload Trigger (Imagen 1) */}
                  <label
                    style={{
                      width: 120,
                      height: 120,
                      borderRadius: '50%',
                      backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundColor: backgroundImage ? 'transparent' : '#0f172a',
                      boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
                      border: '3px solid #fff',
                      display: 'grid',
                      placeItems: 'center',
                      cursor: 'pointer',
                      position: 'relative'
                    }}
                    title="Hacé clic para cargar una nueva imagen de fondo"
                  >
                    <input type="file" accept="image/png,image/jpeg,image/webp" onChange={selectBackground} style={{ display: 'none' }} />
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        background: 'rgba(0,0,0,0.55)',
                        color: '#fff',
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: 20,
                        backdropFilter: 'blur(4px)'
                      }}
                    >
                      📷
                    </div>
                  </label>

                  <small style={{ color: '#64748b', fontSize: 12, textAlign: 'center', maxWidth: 340, lineHeight: 1.4 }}>
                    Si desea cambiar el fondo del QR, debe cargar una nueva imagen desde este input.
                  </small>
                </div>
              </div>
            </Collapsible>

            <Collapsible title="Reglas" open={openSection === 'rules'} onClick={() => setOpenSection(openSection === 'rules' ? null : 'rules')}><div className="rule-row"><span>Público</span><div className="mini-toggle"><button className={publicAccess ? 'selected' : ''} type="button" onClick={() => setPublicAccess(true)}>Sí</button><button className={!publicAccess ? 'selected' : ''} type="button" onClick={() => setPublicAccess(false)}>No</button></div></div></Collapsible>
            <div className="new-qr-icon-field"><input value={icon} readOnly aria-label="Icono seleccionado" placeholder="Seleccionar icono..." /><button type="button" onClick={() => setIcon(iconOptions[(iconOptions.indexOf(icon) + 1) % iconOptions.length])}>⌄</button></div>
            <p className="new-qr-hint">Completá nombre y tipo. Configurá vigencia y reglas según corresponda.</p>
            <div className="status-toggle"><button type="button" className={active ? 'selected' : ''} onClick={() => setActive(true)}>Activo</button><button type="button" className={!active ? 'selected' : ''} onClick={() => setActive(false)}>Inactivo</button></div>

            {saveMessage && (
              <div className="flash flash-ok" style={{ textAlign: 'center', fontSize: 14, fontWeight: 800, padding: 12, borderRadius: 12 }}>
                {saveMessage}
              </div>
            )}

            <button className="btn btn-primary new-qr-save" type="submit" disabled={saving}>
              {saving ? 'GUARDANDO CAMBIOS...' : editingId ? 'GUARDAR CAMBIOS' : 'CREAR CUPÓN'}
            </button>
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
