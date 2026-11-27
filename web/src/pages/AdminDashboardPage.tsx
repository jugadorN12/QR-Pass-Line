import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import type { Role, User, Venue, VenueServiceType, VenueVisibleButtons } from '../types'
import { defaultVenueVisibleButtons } from '../types'
import { parseGoogleMapsCoords } from '../lib/geo'
import { CouponTemplateEditor } from '../components/CouponTemplateEditor'
import { UserAvatar } from '../components/UserAvatar'
import './AdminDashboard.css'

const SERVICE_OPTIONS: { value: VenueServiceType; label: string }[] = [
  { value: 'BASICO', label: 'BÁSICO' },
  { value: 'ESTANDAR', label: 'ESTÁNDAR' },
  { value: 'FULL', label: 'FULL' },
  { value: 'MIXTO', label: 'MIXTO' },
  { value: 'OTRO', label: 'Otro / Personalizado' },
]

const AVAILABLE_ROLES: { key: Role; label: string; icon: string }[] = [
  { key: 'vendedor', label: 'Vendedor', icon: '🏷️' },
  { key: 'canjeador', label: 'Canjeador', icon: '🎟️' },
  { key: 'supervisor', label: 'Supervisor', icon: '👁️' },
  { key: 'organizador', label: 'Encargado', icon: '📋' },
  { key: 'admin', label: 'Admin', icon: '👑' },
]

function renderButtonsSelector(
  state: Required<VenueVisibleButtons>,
  setState: React.Dispatch<React.SetStateAction<Required<VenueVisibleButtons>>>
) {
  function toggle(key: keyof VenueVisibleButtons) {
    setState(prev => ({ ...prev, [key]: !prev[key] }))
  }

  function setAll(val: boolean) {
    setState({
      staff: val,
      staffVendedores: val,
      staffCanjeadores: val,
      staffSupervisores: val,
      accesos: val,
      informes: val,
      fechas: val,
      linksPublicos: val,
      baneos: val,
      soporte: val,
    })
  }

  return (
    <div style={{ background: '#f8fafc', padding: 14, borderRadius: 12, border: '1px solid #cbd5e1' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <strong style={{ fontSize: 13, color: '#0f172a', display: 'block' }}>
            🎛️ Botones visibles en el panel del Encargado
          </strong>
          <small style={{ fontSize: 11, color: '#64748b' }}>
            Marcá los accesos que este establecimiento podrá ver en su pantalla principal.
          </small>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            onClick={() => setAll(true)}
            style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontWeight: 700, color: '#1e3a8a' }}
          >
            ✓ Todos
          </button>
          <button
            type="button"
            onClick={() => setAll(false)}
            style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontWeight: 700, color: '#dc2626' }}
          >
            ✕ Ninguno
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10 }}>
        {/* Bloque STAFF y sus sub-botones */}
        <div style={{ background: '#fff', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', color: '#0f172a' }}>
            <input
              type="checkbox"
              checked={state.staff}
              onChange={() => toggle('staff')}
              style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#1e3a8a' }}
            />
            <span>👥 STAFF</span>
          </label>
          <div style={{ paddingLeft: 24, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6, opacity: state.staff ? 1 : 0.4 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: state.staff ? 'pointer' : 'not-allowed', color: '#334155', fontWeight: 600 }}>
              <input
                type="checkbox"
                disabled={!state.staff}
                checked={state.staffVendedores}
                onChange={() => toggle('staffVendedores')}
                style={{ width: 14, height: 14, cursor: 'pointer', accentColor: '#1e3a8a' }}
              />
              <span>♙ Vendedores</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: state.staff ? 'pointer' : 'not-allowed', color: '#334155', fontWeight: 600 }}>
              <input
                type="checkbox"
                disabled={!state.staff}
                checked={state.staffCanjeadores}
                onChange={() => toggle('staffCanjeadores')}
                style={{ width: 14, height: 14, cursor: 'pointer', accentColor: '#1e3a8a' }}
              />
              <span>⌗ Canjeadores</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: state.staff ? 'pointer' : 'not-allowed', color: '#334155', fontWeight: 600 }}>
              <input
                type="checkbox"
                disabled={!state.staff}
                checked={state.staffSupervisores}
                onChange={() => toggle('staffSupervisores')}
                style={{ width: 14, height: 14, cursor: 'pointer', accentColor: '#1e3a8a' }}
              />
              <span>▣ Supervisores</span>
            </label>
          </div>
        </div>

        {/* Bloque Accesos y Operación */}
        <div style={{ background: '#fff', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', color: '#0f172a' }}>
            <input
              type="checkbox"
              checked={state.accesos}
              onChange={() => toggle('accesos')}
              style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#1e3a8a' }}
            />
            <span>🎟️ ACCESOS / QR</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', color: '#0f172a' }}>
            <input
              type="checkbox"
              checked={state.fechas}
              onChange={() => toggle('fechas')}
              style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#1e3a8a' }}
            />
            <span>📅 FECHAS</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', color: '#0f172a' }}>
            <input
              type="checkbox"
              checked={state.linksPublicos}
              onChange={() => toggle('linksPublicos')}
              style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#1e3a8a' }}
            />
            <span>🌐 LINK PÚBLICOS</span>
          </label>
        </div>

        {/* Bloque Informes y Seguridad */}
        <div style={{ background: '#fff', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', color: '#0f172a' }}>
            <input
              type="checkbox"
              checked={state.informes}
              onChange={() => toggle('informes')}
              style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#1e3a8a' }}
            />
            <span>📊 INFORMES</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', color: '#0f172a' }}>
            <input
              type="checkbox"
              checked={state.baneos}
              onChange={() => toggle('baneos')}
              style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#1e3a8a' }}
            />
            <span>🚫 BANEOS</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', color: '#0f172a' }}>
            <input
              type="checkbox"
              checked={state.soporte}
              onChange={() => toggle('soporte')}
              style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#1e3a8a' }}
            />
            <span>💬 SOPORTE</span>
          </label>
        </div>
      </div>
    </div>
  )
}

export function AdminDashboardPage() {
  const { users, venues, updateUserRole, deleteUser, adminResetPassword, createVenue, updateVenue, deleteVenue, addMember, replaceMember, createDemoVenue, logout, activeVenue, setAdminActiveVenue } = useApp()
  const [tab, setTab] = useState<'users' | 'venues' | 'settings' | 'template'>('users')
  const [globalLogo, setGlobalLogo] = useState(() => localStorage.getItem('qr-pass-line.logo') ?? '')

  // Password reset modal state
  const [resetModalUser, setResetModalUser] = useState<User | null>(null)
  const [resetModalPass, setResetModalPass] = useState('123456')
  const [isResettingPass, setIsResettingPass] = useState(false)

  // Replace user (e.g. Demo -> Real) modal state
  const [replacingUser, setReplacingUser] = useState<User | null>(null)
  const [replaceName, setReplaceName] = useState('')
  const [replaceEmail, setReplaceEmail] = useState('')
  const [replacePass, setReplacePass] = useState('123456')
  const [isReplacingUser, setIsReplacingUser] = useState(false)

  // Demo creation state
  const [isCreatingDemo, setIsCreatingDemo] = useState(false)
  const [demoCredentialsModal, setDemoCredentialsModal] = useState<{
    venueName: string
    credentials: { roleLabel: string; name: string; email: string; password: string }[]
  } | null>(null)

  // Venue visible buttons state (for creation form)
  const [venueVisibleButtons, setVenueVisibleButtons] = useState<Required<VenueVisibleButtons>>(defaultVenueVisibleButtons)

  // Venue visible buttons modal state (for editing existing venue)
  const [editingVenueButtons, setEditingVenueButtons] = useState<Venue | null>(null)
  const [editButtonsState, setEditButtonsState] = useState<Required<VenueVisibleButtons>>(defaultVenueVisibleButtons)
  const [isSavingButtons, setIsSavingButtons] = useState(false)

  // Full Venue Edit Modal state
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null)
  const [editVenueName, setEditVenueName] = useState('')
  const [editVenueAddress, setEditVenueAddress] = useState('')
  const [editVenueCrossStreets, setEditVenueCrossStreets] = useState('')
  const [editVenueMapsLink, setEditVenueMapsLink] = useState('')
  const [editVenueLat, setEditVenueLat] = useState('')
  const [editVenueLng, setEditVenueLng] = useState('')
  const [editVenueRadius, setEditVenueRadius] = useState('50')
  const [editVenueIsDemo, setEditVenueIsDemo] = useState(false)
  const [editVenueServiceType, setEditVenueServiceType] = useState<VenueServiceType>('FULL')
  const [editVenueServiceNotes, setEditVenueServiceNotes] = useState('')
  const [editVenueMonthlyFee, setEditVenueMonthlyFee] = useState('')
  const [editVenueNextDueAt, setEditVenueNextDueAt] = useState('')
  const [isSavingVenueEdit, setIsSavingVenueEdit] = useState(false)

  // Pay by Date & Time Modal state
  const [payByDateVenue, setPayByDateVenue] = useState<Venue | null>(null)
  const [payDateValue, setPayDateValue] = useState('')
  const [payTimeValue, setPayTimeValue] = useState('06:00')
  const [payAmountValue, setPayAmountValue] = useState('')
  const [isSavingPayByDate, setIsSavingPayByDate] = useState(false)

  // UI State for toggling create panels
  const [showUserForm, setShowUserForm] = useState(false)
  const [showVenueForm, setShowVenueForm] = useState(false)

  // Filters & Search
  const [searchUser, setSearchUser] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [venueFilter, setVenueFilter] = useState<string>('all')

  // State for user creation
  const [newUserName, setNewUserName] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserPass, setNewUserPass] = useState('')
  const [newUserRole, setNewUserRole] = useState<Role>('pendiente')
  const [newUserVenue, setNewUserVenue] = useState('')

  // State for venue creation
  const [venueName, setVenueName] = useState('')
  const [venueAddress, setVenueAddress] = useState('')
  const [venueCrossStreets, setVenueCrossStreets] = useState('')
  const [venueMapsLink, setVenueMapsLink] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [radius, setRadius] = useState('50')
  const [venueServiceType, setVenueServiceType] = useState<VenueServiceType>('FULL')
  const [venueServiceNotes, setVenueServiceNotes] = useState('')
  const [venueMonthlyFee, setVenueMonthlyFee] = useState('')
  const [venueManagerName, setVenueManagerName] = useState('')
  const [venueManagerEmail, setVenueManagerEmail] = useState('')
  const [venueManagerPassword, setVenueManagerPassword] = useState('')

  const [isSubmittingUser, setIsSubmittingUser] = useState(false)
  const [isSubmittingVenue, setIsSubmittingVenue] = useState(false)
  const [message, setMessage] = useState('')
  const [isGeocoding, setIsGeocoding] = useState(false)
  const navigate = useNavigate()

  function handleLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => {
      const res = typeof reader.result === 'string' ? reader.result : ''
      setGlobalLogo(res)
      if (res) localStorage.setItem('qr-pass-line.logo', res)
      else localStorage.removeItem('qr-pass-line.logo')
      setMessage('Logo global actualizado con éxito.')
    }
    reader.readAsDataURL(file)
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault()
    if (isSubmittingUser) return
    const cleanMail = newUserEmail.trim().toLowerCase()
    if (!cleanMail) return

    const existing = users.find((u) => u.email.toLowerCase() === cleanMail)
    if (existing) {
      setMessage(`El usuario "${cleanMail}" ya está registrado. Modificalo en la lista.`)
      return
    }

    setIsSubmittingUser(true)
    setMessage('Creando usuario...')
    try {
      await addMember({
        name: newUserName,
        email: cleanMail,
        password: newUserPass,
        role: newUserRole
      })
      const usersSnap = users.find(u => u.email.toLowerCase() === cleanMail)
      if (usersSnap && newUserVenue) {
        await updateUserRole(usersSnap.id, newUserRole, newUserVenue)
      }

      setNewUserName('')
      setNewUserEmail('')
      setNewUserPass('')
      setNewUserRole('pendiente')
      setNewUserVenue('')
      setShowUserForm(false)
      setMessage('Usuario registrado con éxito.')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error al crear usuario.')
    } finally {
      setIsSubmittingUser(false)
    }
  }

  async function validateAddress(customAddress?: string, isEditMode: boolean = false) {
    const queryAddr = (customAddress ?? venueAddress).trim()
    if (!queryAddr) return
    setIsGeocoding(true)
    setMessage('Validando dirección...')
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryAddr)}`)
      const data = await response.json()
      if (data && data.length > 0) {
        if (isEditMode) {
          setEditVenueLat(data[0].lat)
          setEditVenueLng(data[0].lon)
        } else {
          setLat(data[0].lat)
          setLng(data[0].lon)
        }
        setMessage('📍 Dirección localizada con éxito en el mapa.')
      } else {
        setMessage('No se encontró la dirección exacta. Probá agregar localidad/provincia o pegá un link/coordenadas de Google Maps.')
      }
    } catch {
      setMessage('Error al conectar con el servicio de mapas.')
    } finally {
      setIsGeocoding(false)
    }
  }

  async function handleCreateVenue(e: React.FormEvent) {
    e.preventDefault()
    if (isSubmittingVenue) return
    const cleanVenueName = venueName.trim()
    if (!cleanVenueName) return

    setIsSubmittingVenue(true)
    setMessage('Registrando establecimiento...')
    try {
      const createdVenue = await createVenue({
        name: cleanVenueName,
        address: venueAddress.trim(),
        crossStreets: venueCrossStreets.trim(),
        latitude: Number(lat) || 0,
        longitude: Number(lng) || 0,
        radius: Number(radius) || 50,
        isActive: true,
        isDemo: false,
        serviceType: venueServiceType,
        serviceNotes: venueServiceNotes.trim(),
        monthlyFee: Number(venueMonthlyFee) || 0,
        visibleButtons: venueVisibleButtons
      })

      let managerMsg = ''
      if (venueManagerEmail.trim()) {
        const cleanMgrEmail = venueManagerEmail.trim().toLowerCase()
        const cleanMgrName = venueManagerName.trim() || 'Encargado'
        const cleanMgrPass = venueManagerPassword.trim() || '123456'
        await addMember({
          name: cleanMgrName,
          email: cleanMgrEmail,
          password: cleanMgrPass,
          role: 'organizador',
          roles: ['organizador'],
          venueId: createdVenue.id
        })
        managerMsg = ` y Encargado "${cleanMgrEmail}" creado con éxito.`
      }

      setVenueName('')
      setVenueAddress('')
      setVenueCrossStreets('')
      setVenueMapsLink('')
      setLat('')
      setLng('')
      setRadius('50')
      setVenueServiceType('FULL')
      setVenueServiceNotes('')
      setVenueMonthlyFee('')
      setVenueManagerName('')
      setVenueManagerEmail('')
      setVenueManagerPassword('')
      setVenueVisibleButtons(defaultVenueVisibleButtons)
      setShowVenueForm(false)
      setMessage(`✓ Establecimiento "${cleanVenueName}" registrado${managerMsg}`)
    } catch (err: any) {
      setMessage(`Error al crear establecimiento: ${err?.message || 'Error desconocido'}`)
    } finally {
      setIsSubmittingVenue(false)
    }
  }

  async function handleCreateDemo() {
    if (isCreatingDemo) return
    setIsCreatingDemo(true)
    setMessage('Creando versión DEMO con Encargado, Vendedor, Canjeador y Evento de prueba...')
    try {
      const res = await createDemoVenue()
      setDemoCredentialsModal({
        venueName: res.venue.name,
        credentials: res.credentials,
      })
      setMessage(`✓ Local "${res.venue.name}" creado y listo para mostrar (sin límite de zona).`)
    } catch (err: any) {
      setMessage(`Error al crear DEMO: ${err?.message || 'Error desconocido'}`)
    } finally {
      setIsCreatingDemo(false)
    }
  }

  async function handleToggleVenueActive(v: Venue) {
    const nextState = !(v.isActive ?? true)
    try {
      await updateVenue(v.id, { isActive: nextState })
      setMessage(nextState ? `🟢 Local "${v.name}" ACTIVADO.` : `🔴 Local "${v.name}" DESACTIVADO (bloqueado).`)
    } catch (err: any) {
      setMessage(`Error al cambiar estado: ${err?.message || 'Error desconocido'}`)
    }
  }

  async function handleRegisterVenuePayment(v: Venue) {
    const now = new Date()
    const nextDue = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    try {
      await updateVenue(v.id, {
        isActive: true,
        isDemo: false,
        lastPaidAt: now.toISOString(),
        nextDueAt: nextDue.toISOString(),
        nextDueAtMs: nextDue.getTime(),
      })
      setMessage(`💰 Pago registrado para "${v.name}". Vencimiento extendido 30 días.`)
    } catch (err: any) {
      setMessage(`Error al registrar pago: ${err?.message || 'Error desconocido'}`)
    }
  }

  function handleOpenPayByDate(v: Venue) {
    setPayByDateVenue(v)
    if (v.nextDueAt) {
      const d = new Date(v.nextDueAt)
      if (!Number.isNaN(d.getTime())) {
        const yyyy = d.getFullYear()
        const mm = String(d.getMonth() + 1).padStart(2, '0')
        const dd = String(d.getDate()).padStart(2, '0')
        const hh = String(d.getHours()).padStart(2, '0')
        const min = String(d.getMinutes()).padStart(2, '0')
        setPayDateValue(`${yyyy}-${mm}-${dd}`)
        setPayTimeValue(`${hh}:${min}`)
      } else {
        setPayDateValue(new Date().toISOString().split('T')[0])
        setPayTimeValue('06:00')
      }
    } else {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
      setPayDateValue(tomorrow.toISOString().split('T')[0])
      setPayTimeValue('06:00')
    }
    setPayAmountValue(v.monthlyFee ? String(v.monthlyFee) : '')
  }

  async function handleSavePayByDate(e: React.FormEvent) {
    e.preventDefault()
    if (!payByDateVenue || !payDateValue || isSavingPayByDate) return
    setIsSavingPayByDate(true)
    try {
      const timeStr = payTimeValue || '23:59'
      const targetDate = new Date(`${payDateValue}T${timeStr}:00`)
      if (Number.isNaN(targetDate.getTime())) {
        throw new Error('Fecha u hora inválida.')
      }
      const updates: Partial<Venue> = {
        isActive: true,
        lastPaidAt: new Date().toISOString(),
        nextDueAt: targetDate.toISOString(),
        nextDueAtMs: targetDate.getTime(),
      }
      if (payAmountValue.trim() !== '') {
        updates.monthlyFee = Number(payAmountValue) || 0
      }
      await updateVenue(payByDateVenue.id, updates)
      setMessage(`📅 "${payByDateVenue.name}" habilitado hasta el ${targetDate.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} hs.`)
      setPayByDateVenue(null)
    } catch (err: any) {
      setMessage(`Error al guardar fecha de habilitación: ${err?.message || 'Error desconocido'}`)
    } finally {
      setIsSavingPayByDate(false)
    }
  }

  function handleOpenEditVenue(v: Venue) {
    setEditingVenue(v)
    setEditVenueName(v.name || '')
    setEditVenueAddress(v.address || '')
    setEditVenueCrossStreets(v.crossStreets || '')
    setEditVenueMapsLink('')
    setEditVenueLat(v.latitude ? String(v.latitude) : '')
    setEditVenueLng(v.longitude ? String(v.longitude) : '')
    setEditVenueRadius(String(v.radius || 50))
    setEditVenueIsDemo(Boolean(v.isDemo))
    setEditVenueServiceType(v.serviceType || 'FULL')
    setEditVenueServiceNotes(v.serviceNotes || '')
    setEditVenueMonthlyFee(v.monthlyFee ? String(v.monthlyFee) : '')
    setEditVenueNextDueAt(v.nextDueAt ? v.nextDueAt.split('T')[0] : '')
  }

  async function handleSaveVenueEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingVenue || isSavingVenueEdit) return
    const cleanName = editVenueName.trim()
    if (!cleanName) return
    setIsSavingVenueEdit(true)
    try {
      const parsedLat = Number(editVenueLat) || 0
      const parsedLng = Number(editVenueLng) || 0
      const parsedRadius = Number(editVenueRadius) || 50
      const nextDueDateObj = editVenueNextDueAt ? new Date(`${editVenueNextDueAt}T23:59:59`) : null
      const updates: Partial<Venue> = {
        name: cleanName,
        address: editVenueAddress.trim(),
        crossStreets: editVenueCrossStreets.trim(),
        latitude: parsedLat,
        longitude: parsedLng,
        radius: parsedRadius,
        isDemo: editVenueIsDemo,
        serviceType: editVenueServiceType,
        serviceNotes: editVenueServiceNotes.trim(),
        monthlyFee: Number(editVenueMonthlyFee) || 0,
        nextDueAt: nextDueDateObj ? nextDueDateObj.toISOString() : '',
        nextDueAtMs: nextDueDateObj ? nextDueDateObj.getTime() : 0,
      }
      await updateVenue(editingVenue.id, updates)
      setMessage(`✓ Local "${cleanName}" actualizado correctamente.`)
      setEditingVenue(null)
    } catch (err: any) {
      setMessage(`Error al actualizar local: ${err?.message || 'Error desconocido'}`)
    } finally {
      setIsSavingVenueEdit(false)
    }
  }

  function handleOpenReplaceUser(user: User) {
    setReplacingUser(user)
    setReplaceName('')
    setReplaceEmail('')
    setReplacePass('123456')
  }

  async function handleConfirmReplaceUser(e: React.FormEvent) {
    e.preventDefault()
    if (!replacingUser || isReplacingUser) return
    setIsReplacingUser(true)
    try {
      const newUser = await replaceMember({
        oldUserId: replacingUser.id,
        name: replaceName,
        email: replaceEmail,
        password: replacePass,
      })
      setMessage(`✓ Usuario "${replacingUser.name}" reemplazado por "${newUser.name}" (${newUser.email}) conservando roles y limitaciones.`)
      setReplacingUser(null)
    } catch (err: any) {
      setMessage(`Error al reemplazar usuario: ${err?.message || 'Error desconocido'}`)
    } finally {
      setIsReplacingUser(false)
    }
  }

  function handleOpenEditButtons(v: Venue) {
    setEditingVenueButtons(v)
    setEditButtonsState({
      staff: v.visibleButtons?.staff ?? true,
      staffVendedores: v.visibleButtons?.staffVendedores ?? true,
      staffCanjeadores: v.visibleButtons?.staffCanjeadores ?? true,
      staffSupervisores: v.visibleButtons?.staffSupervisores ?? true,
      accesos: v.visibleButtons?.accesos ?? true,
      informes: v.visibleButtons?.informes ?? true,
      fechas: v.visibleButtons?.fechas ?? true,
      linksPublicos: v.visibleButtons?.linksPublicos ?? true,
      baneos: v.visibleButtons?.baneos ?? true,
      soporte: v.visibleButtons?.soporte ?? true,
    })
  }

  async function handleSaveVenueButtons(e: React.FormEvent) {
    e.preventDefault()
    if (!editingVenueButtons || isSavingButtons) return
    setIsSavingButtons(true)
    try {
      await updateVenue(editingVenueButtons.id, {
        visibleButtons: editButtonsState
      })
      setMessage(`✓ Permisos de botones actualizados para "${editingVenueButtons.name}"`)
      setEditingVenueButtons(null)
    } catch (err: any) {
      setMessage(`Error al actualizar botones: ${err?.message || 'Error desconocido'}`)
    } finally {
      setIsSavingButtons(false)
    }
  }

  function handleOpenResetModal(user: User) {
    setResetModalUser(user)
    setResetModalPass('123456')
  }

  async function handleConfirmResetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!resetModalUser || isResettingPass) return
    if (resetModalPass.length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    setIsResettingPass(true)
    try {
      await adminResetPassword(resetModalUser.id, resetModalPass)
      setMessage(`✓ Contraseña provisoria para "${resetModalUser.email}" actualizada a: ${resetModalPass}`)
      setResetModalUser(null)
    } catch (err: any) {
      alert(err instanceof Error ? err.message : 'Error al actualizar contraseña.')
    } finally {
      setIsResettingPass(false)
    }
  }

  async function handleDeleteUser(user: { id: string; name: string; email: string }) {
    if (user.email.toLowerCase() === 'simplemente_anibal@hotmail.com') {
      alert('No es posible eliminar al Administrador Principal.')
      return
    }
    if (!window.confirm(`¿Eliminar permanentemente a "${user.name}" (${user.email})?\n\nEsta acción borrará su cuenta y limitaciones.`)) {
      return
    }
    try {
      await deleteUser(user.id)
      setMessage(`Usuario "${user.name}" eliminado correctamente.`)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error al eliminar usuario.')
    }
  }

  // Filter users based on search and selected role / venue
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const q = searchUser.trim().toLowerCase()
      const matchesSearch = !q || user.name.toLowerCase().includes(q) || user.email.toLowerCase().includes(q)

      const userRoles = user.roles && user.roles.length ? user.roles : (user.role ? [user.role] : [])
      const matchesRole = roleFilter === 'all' || userRoles.includes(roleFilter as Role)

      const matchesVenue = venueFilter === 'all' || (venueFilter === 'none' ? !user.venueId : user.venueId === venueFilter)

      return matchesSearch && matchesRole && matchesVenue
    })
  }, [users, searchUser, roleFilter, venueFilter])

  return (
    <div className="admin-page-container">
      {/* Header */}
      <header className="admin-header">
        <div className="admin-header-inner">
          <div className="admin-brand">
            <img
              src={globalLogo || '/app-icon.png'}
              alt="Logo"
              className="admin-brand-logo"
            />
            <div className="admin-brand-info">
              <strong className="admin-brand-title">Panel General</strong>
              <span className="admin-brand-subtitle">Administración de Plataforma</span>
            </div>
          </div>
          <div className="admin-header-actions">
            <button
              className="admin-exit-btn"
              type="button"
              onClick={async () => {
                await logout()
                navigate('/ingresar', { replace: true })
              }}
            >
              <span>Salir</span> ✕
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="admin-main">
        {/* Navigation Tabs (Mobile Pill Bar) */}
        <nav className="admin-tabs-nav" aria-label="Navegación del Administrador">
          <button
            type="button"
            className={`admin-tab-btn ${tab === 'users' ? 'active' : ''}`}
            onClick={() => setTab('users')}
          >
            <span>👥 Usuarios</span>
            <span className="admin-tab-badge">{users.length}</span>
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${tab === 'venues' ? 'active' : ''}`}
            onClick={() => setTab('venues')}
          >
            <span>🏢 Locales</span>
            <span className="admin-tab-badge">{venues.length}</span>
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${tab === 'settings' ? 'active' : ''}`}
            onClick={() => setTab('settings')}
          >
            <span>⚙️ Logo / Ajustes</span>
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${tab === 'template' ? 'active' : ''}`}
            onClick={() => setTab('template')}
          >
            <span>🎟️ Cupón</span>
          </button>
        </nav>

        {/* Global Alert Notification */}
        {message && (
          <div className="admin-toast admin-toast-ok">
            <span>{message}</span>
            <button
              type="button"
              onClick={() => setMessage('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', color: 'inherit' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* =========================================================
            TAB 1: USUARIOS
           ========================================================= */}
        {tab === 'users' && (
          <div>
            {/* Top Action & Search Bar */}
            <div className="admin-section-header">
              <button
                type="button"
                className="admin-btn-action-primary"
                onClick={() => setShowUserForm(!showUserForm)}
              >
                {showUserForm ? '✕ Cancelar Registro' : '＋ Registrar Nuevo Usuario'}
              </button>
            </div>

            {/* Collapsible User Creation Form */}
            {showUserForm && (
              <section className="admin-form-card">
                <div className="admin-form-header">
                  <span className="admin-form-title">👤 Nuevo Usuario</span>
                  <button
                    type="button"
                    className="admin-form-close"
                    onClick={() => setShowUserForm(false)}
                  >
                    ✕
                  </button>
                </div>
                <form onSubmit={handleCreateUser}>
                  <div className="admin-form-grid">
                    <div className="admin-input-group">
                      <label>Nombre y Apellido</label>
                      <input
                        className="admin-input"
                        value={newUserName}
                        onChange={e => setNewUserName(e.target.value)}
                        required
                        placeholder="Ej: Juan Pérez"
                      />
                    </div>
                    <div className="admin-input-group">
                      <label>Correo Electrónico</label>
                      <input
                        className="admin-input"
                        type="email"
                        value={newUserEmail}
                        onChange={e => setNewUserEmail(e.target.value)}
                        required
                        placeholder="correo@ejemplo.com"
                      />
                    </div>
                    <div className="admin-input-group">
                      <label>Contraseña inicial (mín. 6 caracteres)</label>
                      <input
                        className="admin-input"
                        type="password"
                        value={newUserPass}
                        onChange={e => setNewUserPass(e.target.value)}
                        required
                        minLength={6}
                        placeholder="••••••••"
                      />
                    </div>
                    <div className="admin-input-group">
                      <label>Establecimiento Asignado</label>
                      <select
                        className="admin-select"
                        value={newUserVenue}
                        onChange={e => setNewUserVenue(e.target.value)}
                      >
                        <option value="">Sin local (Acceso Global)</option>
                        {venues.map(v => (
                          <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="admin-input-group" style={{ gridColumn: '1 / -1' }}>
                      <label>Rol Inicial</label>
                      <select
                        className="admin-select"
                        value={newUserRole}
                        onChange={e => setNewUserRole(e.target.value as Role)}
                      >
                        <option value="pendiente">⏳ Pendiente</option>
                        <option value="vendedor">🏷️ Vendedor</option>
                        <option value="canjeador">🎟️ Canjeador</option>
                        <option value="supervisor">👁️ Supervisor</option>
                        <option value="organizador">📋 Encargado (Organizador)</option>
                        <option value="admin">👑 Administrador</option>
                      </select>
                    </div>
                  </div>
                  <button
                    className="admin-btn-action-primary"
                    style={{ marginTop: 16, width: '100%' }}
                    disabled={isSubmittingUser}
                  >
                    {isSubmittingUser ? 'CREANDO USUARIO...' : 'GUARDAR Y REGISTRAR USUARIO'}
                  </button>
                </form>
              </section>
            )}

            {/* Search & Filters */}
            <div className="admin-filters-bar">
              <div className="admin-search-wrapper">
                <span className="admin-search-icon">🔍</span>
                <input
                  type="text"
                  className="admin-search-input"
                  placeholder="Buscar por nombre o email..."
                  value={searchUser}
                  onChange={e => setSearchUser(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <select
                  className="admin-filter-select"
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value)}
                  style={{ flex: 1 }}
                >
                  <option value="all">Todos los Roles</option>
                  <option value="vendedor">Vendedores</option>
                  <option value="canjeador">Canjeadores</option>
                  <option value="supervisor">Supervisores</option>
                  <option value="organizador">Encargados</option>
                  <option value="admin">Admins</option>
                  <option value="pendiente">Pendientes</option>
                </select>
                <select
                  className="admin-filter-select"
                  value={venueFilter}
                  onChange={e => setVenueFilter(e.target.value)}
                  style={{ flex: 1 }}
                >
                  <option value="all">Todos los Locales</option>
                  <option value="none">Sin local</option>
                  {venues.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Users List (Mobile First Cards) */}
            {filteredUsers.length === 0 ? (
              <div className="admin-empty-state">
                <p>No se encontraron usuarios con los filtros aplicados.</p>
              </div>
            ) : (
              <div className="admin-users-list">
                {filteredUsers.map(user => {
                  const isMainAdmin = user.email.toLowerCase() === 'simplemente_anibal@hotmail.com'
                  const userRoles = user.roles && user.roles.length ? user.roles : (user.role ? [user.role] : [])

                  return (
                    <div key={user.id} className="admin-user-card">
                      {/* Card Header: Avatar, Name, Email */}
                      <div className="admin-user-card-header">
                        <div className="admin-user-info-row">
                          <UserAvatar
                            userId={user.id}
                            name={user.name}
                            email={user.email}
                            avatar={user.avatar}
                            size={44}
                          />
                          <div className="admin-user-names">
                            <span className="admin-user-name" title={user.name}>{user.name}</span>
                            <span className="admin-user-email" title={user.email}>{user.email}</span>
                          </div>
                        </div>
                        {isMainAdmin && (
                          <span className="admin-user-badge-main">SUPERADMIN</span>
                        )}
                      </div>

                      {/* Venue selector */}
                      <div className="admin-user-field">
                        <label className="admin-user-field-label">📍 Establecimiento</label>
                        <select
                          className="admin-user-venue-select"
                          value={user.venueId || ''}
                          onChange={(e) => void updateUserRole(user.id, user.role, e.target.value, userRoles)}
                        >
                          <option value="">Sin local (Global)</option>
                          {venues.map(v => (
                            <option key={v.id} value={v.id}>{v.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Role Chips */}
                      <div className="admin-user-field">
                        <label className="admin-user-field-label">🏷️ Roles Asignados ({userRoles.length})</label>
                        <div className="admin-roles-chips">
                          {AVAILABLE_ROLES.map(({ key, label, icon }) => {
                            const isActive = userRoles.includes(key)
                            return (
                              <button
                                key={key}
                                type="button"
                                className={`admin-role-chip ${isActive ? (key === 'admin' ? 'active-admin' : 'active') : ''}`}
                                onClick={() => {
                                  let newRoles: Role[]
                                  if (isActive) {
                                    newRoles = userRoles.filter(x => x !== key)
                                  } else {
                                    newRoles = [...userRoles.filter(x => x !== 'pendiente'), key]
                                  }
                                  if (newRoles.length === 0) newRoles = ['pendiente']
                                  void updateUserRole(user.id, newRoles[0], user.venueId, newRoles)
                                }}
                              >
                                <span>{isActive ? '✓' : '+'}</span>
                                <span>{icon} {label}</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Card Actions Footer */}
                      <div className="admin-user-card-actions">
                        <button
                          type="button"
                          className="admin-btn-reset"
                          onClick={() => handleOpenResetModal(user)}
                          title="Asignar contraseña provisoria directa sin correos"
                        >
                          🔑 Resetear Clave
                        </button>
                        {!isMainAdmin && (
                          <button
                            type="button"
                            className="admin-btn-reset"
                            style={{ background: '#0ea5e9', color: '#fff', fontWeight: 700 }}
                            onClick={() => handleOpenReplaceUser(user)}
                            title="Reemplazar este usuario ficticio por el usuario real conservando roles y limitaciones"
                          >
                            🔄 Reemplazar
                          </button>
                        )}
                        {!isMainAdmin && (
                          <button
                            type="button"
                            className="admin-btn-delete"
                            onClick={() => void handleDeleteUser(user)}
                            title="Eliminar este usuario definitivamente"
                          >
                            🗑️ Eliminar
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* =========================================================
            TAB 2: LOCALES / ESTABLECIMIENTOS
           ========================================================= */}
        {tab === 'venues' && (
          <div>
            <div className="admin-section-header" style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <button
                type="button"
                className="admin-btn-action-primary"
                onClick={() => setShowVenueForm(!showVenueForm)}
              >
                {showVenueForm ? '✕ Cancelar' : '＋ Registrar Nuevo Local'}
              </button>
              <button
                type="button"
                className="admin-btn-action-primary"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)' }}
                disabled={isCreatingDemo}
                onClick={() => void handleCreateDemo()}
              >
                {isCreatingDemo ? 'Creando DEMO...' : '✨ Crear Local DEMO (Listo para mostrar)'}
              </button>
            </div>

            {/* Collapsible Venue Form */}
            {showVenueForm && (
              <section className="admin-form-card">
                <div className="admin-form-header">
                  <span className="admin-form-title">🏢 Nuevo Local / Establecimiento</span>
                  <button
                    type="button"
                    className="admin-form-close"
                    onClick={() => setShowVenueForm(false)}
                  >
                    ✕
                  </button>
                </div>
                <form onSubmit={handleCreateVenue}>
                  <div className="admin-form-grid">
                    <div className="admin-input-group" style={{ gridColumn: '1 / -1' }}>
                      <label>Nombre del Establecimiento / Boliche</label>
                      <input
                        className="admin-input"
                        value={venueName}
                        onChange={e => setVenueName(e.target.value)}
                        required
                        placeholder="Ej: Club Nocturno Oasis"
                      />
                    </div>
                    <div className="admin-input-group" style={{ gridColumn: '1 / -1' }}>
                      <label>Dirección física (opcional para quintas/eventos sin altura)</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          className="admin-input"
                          value={venueAddress}
                          onChange={e => setVenueAddress(e.target.value)}
                          placeholder="Ej: Valentin Gomez 3085, Gregorio de Laferrere"
                          style={{ flex: 1 }}
                        />
                        <button
                          type="button"
                          className="admin-btn-reset"
                          style={{ whiteSpace: 'nowrap', padding: '0 16px', background: '#e2e8f0' }}
                          disabled={isGeocoding}
                          onClick={() => void validateAddress()}
                        >
                          {isGeocoding ? 'Buscando...' : '📍 Validar GPS'}
                        </button>
                      </div>
                    </div>
                    <div className="admin-input-group" style={{ gridColumn: '1 / -1' }}>
                      <label>Entre calles / Referencia (ideal para provincia o quintas)</label>
                      <input
                        className="admin-input"
                        value={venueCrossStreets}
                        onChange={e => setVenueCrossStreets(e.target.value)}
                        placeholder="Ej: Entre Av. Luro y Echeverría"
                      />
                    </div>
                    <div className="admin-input-group" style={{ gridColumn: '1 / -1' }}>
                      <label>Pegar Link de Google Maps o Coordenadas (opcional)</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          className="admin-input"
                          value={venueMapsLink}
                          onChange={e => setVenueMapsLink(e.target.value)}
                          placeholder="Pegá el link de Google Maps o -34.7447, -58.5914"
                          style={{ flex: 1 }}
                        />
                        <button
                          type="button"
                          className="admin-btn-reset"
                          style={{ whiteSpace: 'nowrap', padding: '0 14px', background: '#dbeafe', color: '#1e40af', fontWeight: 700 }}
                          onClick={() => {
                            const coords = parseGoogleMapsCoords(venueMapsLink)
                            if (coords) {
                              setLat(String(coords.lat))
                              setLng(String(coords.lng))
                              setMessage('📍 Coordenadas extraídas del link correctamente.')
                            } else {
                              setMessage('No se detectaron coordenadas en ese texto/link.')
                            }
                          }}
                        >
                          Extraer GPS
                        </button>
                      </div>
                    </div>
                    <div className="admin-input-group">
                      <label>Latitud GPS</label>
                      <input
                        className="admin-input"
                        value={lat}
                        onChange={e => setLat(e.target.value)}
                        placeholder="-34.7447"
                      />
                    </div>
                    <div className="admin-input-group">
                      <label>Longitud GPS</label>
                      <input
                        className="admin-input"
                        value={lng}
                        onChange={e => setLng(e.target.value)}
                        placeholder="-58.5914"
                      />
                    </div>
                    <div className="admin-input-group">
                      <label>Radio permitido para canjes (metros)</label>
                      <input
                        className="admin-input"
                        type="number"
                        value={radius}
                        onChange={e => setRadius(e.target.value)}
                        min={0}
                        max={2000}
                        placeholder="50"
                      />
                    </div>
                    <div className="admin-input-group">
                      <label>Tipo de Servicio</label>
                      <select
                        className="admin-select"
                        value={venueServiceType}
                        onChange={e => setVenueServiceType(e.target.value as VenueServiceType)}
                      >
                        {SERVICE_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="admin-input-group">
                      <label>Abono Mensual ($)</label>
                      <input
                        className="admin-input"
                        type="number"
                        value={venueMonthlyFee}
                        onChange={e => setVenueMonthlyFee(e.target.value)}
                        placeholder="Ej: 50000"
                      />
                    </div>
                    <div className="admin-input-group">
                      <label>Detalle / Texto libre del servicio</label>
                      <input
                        className="admin-input"
                        value={venueServiceNotes}
                        onChange={e => setVenueServiceNotes(e.target.value)}
                        placeholder="Ej: Incluye 2 eventos por finde, soporte WhatsApp..."
                      />
                    </div>

                    {/* Optional Manager Account Creation */}
                    <div style={{ gridColumn: '1 / -1', marginTop: 12, padding: 14, background: '#f8fafc', borderRadius: 12, border: '1px dashed #cbd5e1' }}>
                      <strong style={{ fontSize: 13, color: '#1e3a8a', display: 'block', marginBottom: 8 }}>
                        👤 Asignar Encargado Inicial del Local (Opcional)
                      </strong>
                      <div className="admin-form-grid" style={{ gap: 10 }}>
                        <div className="admin-input-group">
                          <label>Nombre del Encargado</label>
                          <input
                            className="admin-input"
                            value={venueManagerName}
                            onChange={e => setVenueManagerName(e.target.value)}
                            placeholder="Ej: Juan Pérez"
                          />
                        </div>
                        <div className="admin-input-group">
                          <label>Email de Acceso</label>
                          <input
                            className="admin-input"
                            type="email"
                            value={venueManagerEmail}
                            onChange={e => setVenueManagerEmail(e.target.value)}
                            placeholder="encargado@boliche.com"
                          />
                        </div>
                        <div className="admin-input-group" style={{ gridColumn: '1 / -1' }}>
                          <label>Contraseña Inicial</label>
                          <input
                            className="admin-input"
                            type="password"
                            value={venueManagerPassword}
                            onChange={e => setVenueManagerPassword(e.target.value)}
                            placeholder="Mínimo 6 caracteres (ej: 123456)"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Botones Visibles para este Cliente */}
                    <div style={{ gridColumn: '1 / -1', marginTop: 12 }}>
                      {renderButtonsSelector(venueVisibleButtons, setVenueVisibleButtons)}
                    </div>
                  </div>
                  <button
                    className="admin-btn-action-primary"
                    style={{ marginTop: 16, width: '100%', opacity: isSubmittingVenue ? 0.7 : 1 }}
                    disabled={isSubmittingVenue}
                  >
                    {isSubmittingVenue ? 'Guardando local...' : 'GUARDAR LOCAL Y CREAR ENCARGADO'}
                  </button>
                </form>
              </section>
            )}

            {/* Venues List */}
            {venues.length === 0 ? (
              <div className="admin-empty-state">
                <p>No hay locales registrados aún.</p>
              </div>
            ) : (
              <div className="admin-venues-list">
                {venues.map(v => {
                  const isVenueActive = v.isActive ?? true
                  const hasGeo = Boolean(!v.isDemo && v.address?.trim() && v.latitude && v.longitude)
                  const createdLabel = v.createdAt ? new Date(v.createdAt).toLocaleDateString('es-AR') : '—'
                  const nextDueLabel = v.nextDueAt
                    ? new Date(v.nextDueAt).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : ''
                  const isOverdue = Boolean(
                    (v.nextDueAtMs && v.nextDueAtMs > 0 && Date.now() > v.nextDueAtMs) ||
                    (v.nextDueAt && new Date(v.nextDueAt).getTime() < Date.now())
                  )

                  return (
                    <div
                      key={v.id}
                      className="admin-venue-card"
                      style={{
                        borderLeft: `5px solid ${isVenueActive ? (v.isDemo ? '#7c3aed' : '#16a34a') : '#dc2626'}`,
                        opacity: isVenueActive ? 1 : 0.85,
                      }}
                    >
                      <div className="admin-venue-header">
                        <div className="admin-venue-icon">{v.isDemo ? '🧪' : '🏢'}</div>
                        <div className="admin-venue-details">
                          <div className="admin-venue-name" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span>{v.name}</span>
                            <span
                              className="admin-venue-tag"
                              style={{
                                background: isVenueActive ? '#dcfce7' : '#fee2e2',
                                color: isVenueActive ? '#15803d' : '#b91c1c',
                                fontWeight: 800,
                              }}
                            >
                              {isVenueActive ? '🟢 ACTIVO' : '🔴 DESACTIVADO'}
                            </span>
                            {v.isDemo && (
                              <span className="admin-venue-tag" style={{ background: '#ede9fe', color: '#6d28d9', fontWeight: 800 }}>
                                🧪 DEMO
                              </span>
                            )}
                            {v.serviceType && (
                              <span className="admin-venue-tag" style={{ background: '#e0f2fe', color: '#0369a1', fontWeight: 800 }}>
                                📦 {v.serviceType}{v.monthlyFee ? ` · $${v.monthlyFee.toLocaleString('es-AR')}/mes` : ''}
                              </span>
                            )}
                          </div>

                          <div className="admin-venue-address">
                            📍 {v.address?.trim() ? v.address : 'Sin dirección fija (Evento/DEMO)'}
                            {v.crossStreets ? ` · Entre: ${v.crossStreets}` : ''}
                          </div>

                          {v.serviceNotes && (
                            <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
                              📝 {v.serviceNotes}
                            </div>
                          )}

                          <div className="admin-venue-meta">
                            <span className="admin-venue-tag">📅 Alta: {createdLabel}</span>
                            {nextDueLabel && (
                              <span
                                className="admin-venue-tag"
                                style={{
                                  background: isOverdue ? '#fee2e2' : '#fef9c3',
                                  color: isOverdue ? '#b91c1c' : '#854d0e',
                                  fontWeight: 700,
                                }}
                              >
                                {isOverdue ? '⚠️ Venció: ' : '💳 Vence: '}{nextDueLabel}
                              </span>
                            )}
                            {hasGeo ? (
                              <span className="admin-venue-tag" style={{ background: '#f0fdf4', color: '#166534' }}>
                                🎯 Radio: {v.radius || 50}m · 🌐 GPS Activo
                              </span>
                            ) : (
                              <span className="admin-venue-tag" style={{ background: '#f1f5f9', color: '#475569' }}>
                                🔓 Canje libre (sin límite de zona)
                              </span>
                            )}
                            {activeVenue?.id === v.id && (
                              <span className="admin-venue-tag" style={{ background: '#dcfce7', color: '#15803d', fontWeight: 800 }}>✓ SELECCIONADO</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="admin-user-card-actions" style={{ flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="admin-btn-reset"
                          style={{
                            background: isVenueActive ? '#dc2626' : '#16a34a',
                            color: '#fff',
                            fontWeight: 800,
                          }}
                          onClick={() => void handleToggleVenueActive(v)}
                        >
                          {isVenueActive ? '⏸️ Desactivar' : '▶️ Activar'}
                        </button>
                        <button
                          type="button"
                          className="admin-btn-reset"
                          style={{ background: '#f59e0b', color: '#fff', fontWeight: 700 }}
                          onClick={() => handleOpenEditVenue(v)}
                        >
                          ✏️ Editar Local / Dirección / Plan
                        </button>
                        <button
                          type="button"
                          className="admin-btn-reset"
                          style={{ background: '#15803d', color: '#fff', fontWeight: 700 }}
                          onClick={() => void handleRegisterVenuePayment(v)}
                        >
                          💰 Pago (+30d)
                        </button>
                        <button
                          type="button"
                          className="admin-btn-reset"
                          style={{ background: '#7c3aed', color: '#fff', fontWeight: 700 }}
                          onClick={() => handleOpenPayByDate(v)}
                        >
                          📅 Paga por fecha
                        </button>
                        <button
                          type="button"
                          className="admin-btn-reset"
                          style={{ background: '#1e3a8a', color: '#fff', fontWeight: 700 }}
                          onClick={() => {
                            setAdminActiveVenue(v.id)
                            navigate('/encargado')
                          }}
                        >
                          👁️ Ver Panel
                        </button>
                        <button
                          type="button"
                          className="admin-btn-reset"
                          style={{ background: '#0284c7', color: '#fff', fontWeight: 700 }}
                          onClick={() => handleOpenEditButtons(v)}
                        >
                          🎛️ Botones
                        </button>
                        <button
                          type="button"
                          className="admin-btn-delete"
                          onClick={() => {
                            if (window.confirm(`¿Eliminar local "${v.name}"?`)) {
                              void deleteVenue(v.id)
                            }
                          }}
                        >
                          🗑️ Eliminar
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* =========================================================
            TAB 3: CONFIGURACIÓN GLOBAL / LOGO
           ========================================================= */}
        {tab === 'settings' && (
          <section className="admin-settings-card">
            <h2 style={{ fontSize: 17, color: '#0f172a', fontWeight: 800, margin: '0 0 8px' }}>
              🖼️ Logo Global de la Plataforma
            </h2>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px', lineHeight: 1.4 }}>
              Este logo se mostrará en el encabezado de todas las pantallas de administración y control.
            </p>
            <div className="admin-logo-upload-box">
              <img
                src={globalLogo || '/app-icon.png'}
                alt="Logo Actual"
                className="admin-logo-preview"
              />
              <label
                className="admin-btn-action-primary"
                style={{ cursor: 'pointer', textAlign: 'center' }}
              >
                <span>📁 Cambiar Logo</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleLogoChange}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </section>
        )}

        {/* =========================================================
            TAB 4: CONFIGURAR PLANTILLA DE CUPÓN
           ========================================================= */}
        {tab === 'template' && (
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <CouponTemplateEditor />
          </div>
        )}
      </main>

      {/* =========================================================
          MODAL: RESETEAR CONTRASEÑA DIRECTA (OPCIÓN A)
         ========================================================= */}
      {resetModalUser && (
        <div className="admin-modal-backdrop" onClick={() => setResetModalUser(null)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 24 }}>🔑</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: 17, color: '#0f172a', fontWeight: 800 }}>
                    Asignar Clave Provisoria
                  </h3>
                  <span style={{ fontSize: 12, color: '#64748b' }}>
                    Cambio directo sin depender de emails
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => setResetModalUser(null)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 14px' }}>
                <div style={{ fontSize: 13, color: '#475569', fontWeight: 700 }}>{resetModalUser.name}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{resetModalUser.email}</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                  Nueva Contraseña Provisoria:
                </label>
                <input
                  type="text"
                  value={resetModalPass}
                  onChange={(e) => setResetModalPass(e.target.value)}
                  placeholder="Ej: 123456"
                  required
                  minLength={6}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 14,
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                  }}
                  autoFocus
                />
                <span style={{ fontSize: 11, color: '#64748b' }}>
                  El usuario ingresará con esta clave y se le solicitará definir su propia contraseña al entrar.
                </span>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setResetModalUser(null)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    color: '#475569',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isResettingPass}
                  style={{
                    padding: '10px 18px',
                    borderRadius: 8,
                    border: 'none',
                    background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  {isResettingPass ? 'Guardando...' : '✓ Guardar Clave'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Configurar Botones Visibles de Establecimiento */}
      {editingVenueButtons && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'grid',
            placeItems: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 16,
              maxWidth: 580,
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0f172a' }}>
                  🎛️ Permisos de Botones: {editingVenueButtons.name}
                </h3>
                <small style={{ color: '#64748b', fontSize: 12 }}>
                  Seleccioná qué botones y sub-botones podrá ver este establecimiento en su menú principal.
                </small>
              </div>
              <button
                type="button"
                onClick={() => setEditingVenueButtons(null)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveVenueButtons} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {renderButtonsSelector(editButtonsState, setEditButtonsState)}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setEditingVenueButtons(null)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    color: '#475569',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingButtons}
                  style={{
                    padding: '10px 20px',
                    borderRadius: 8,
                    border: 'none',
                    background: 'linear-gradient(135deg, #1e3a8a, #2563eb)',
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  {isSavingButtons ? 'Guardando...' : '✓ Guardar Permisos'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL DE CREDENCIALES DEMO GENERADAS
         ========================================================= */}
      {demoCredentialsModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.72)',
            backdropFilter: 'blur(4px)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div style={{ background: '#fff', borderRadius: 20, padding: 24, maxWidth: 460, width: '100%', boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: 19, fontWeight: 900, color: '#0f172a' }}>
              ✨ ¡{demoCredentialsModal.venueName} lista para mostrar!
            </h3>
            <p style={{ fontSize: 13, color: '#475569', margin: '0 0 14px', lineHeight: 1.4 }}>
              Se creó el local sin límite de zona, con 1 evento activo, 2 cupones, limitaciones y estos 3 usuarios ficticios (que luego podés reemplazar por los reales):
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              {demoCredentialsModal.credentials.map((c, idx) => (
                <div key={idx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '10px 12px', fontSize: 12.5 }}>
                  <strong style={{ color: '#1e3a8a', display: 'block', marginBottom: 2 }}>{c.roleLabel}</strong>
                  <div>Usuario: <code style={{ fontWeight: 700 }}>{c.email}</code></div>
                  <div>Clave: <code style={{ fontWeight: 700 }}>{c.password}</code></div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="admin-btn-action-primary"
                style={{ flex: 1 }}
                onClick={() => {
                  const text = `🎟️ *Acceso ${demoCredentialsModal.venueName} - QR Pass Line*\n🌐 https://qr-pass-line.web.app\n\n` +
                    demoCredentialsModal.credentials.map(c => `*${c.roleLabel}*\nEmail: ${c.email}\nClave: ${c.password}`).join('\n\n')
                  void navigator.clipboard?.writeText(text)
                  setMessage('📋 Accesos copiados al portapapeles para enviar por WhatsApp.')
                }}
              >
                📋 Copiar Accesos
              </button>
              <button
                type="button"
                className="admin-btn-reset"
                style={{ padding: '0 18px', fontWeight: 700 }}
                onClick={() => setDemoCredentialsModal(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL EDITAR LOCAL / DIRECCIÓN / SERVICIO / COBRANZA
         ========================================================= */}
      {editingVenue && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.72)',
            backdropFilter: 'blur(4px)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 9999,
            padding: 16,
            overflowY: 'auto',
          }}
        >
          <div style={{ background: '#fff', borderRadius: 20, padding: 24, maxWidth: 540, width: '100%', boxShadow: '0 24px 60px rgba(0,0,0,0.3)', maxHeight: '90dvh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#0f172a' }}>
                ✏️ Editar Local: {editingVenue.name}
              </h3>
              <button type="button" onClick={() => setEditingVenue(null)} style={{ border: 0, background: '#f1f5f9', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', fontWeight: 700 }}>✕</button>
            </div>

            <form onSubmit={handleSaveVenueEdit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="admin-input-group">
                <label>Nombre del Local (ej: cambiar DEMO por el nombre real)</label>
                <input className="admin-input" value={editVenueName} onChange={e => setEditVenueName(e.target.value)} required />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#f5f3ff', borderRadius: 10, border: '1px solid #ddd6fe', fontSize: 13, fontWeight: 700, color: '#5b21b6', cursor: 'pointer' }}>
                <input type="checkbox" checked={editVenueIsDemo} onChange={e => setEditVenueIsDemo(e.target.checked)} />
                <span>🧪 Marcar como DEMO (sin limitación de zona GPS aunque tenga texto de dirección)</span>
              </label>

              <div className="admin-input-group">
                <label>Dirección física / Lugar del evento (quinta, salón, etc.)</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="admin-input" value={editVenueAddress} onChange={e => setEditVenueAddress(e.target.value)} placeholder="Ej: Valentin Gomez 3085, Gregorio de Laferrere" style={{ flex: 1 }} />
                  <button type="button" className="admin-btn-reset" disabled={isGeocoding} onClick={() => void validateAddress(editVenueAddress, true)} style={{ whiteSpace: 'nowrap', padding: '0 14px', background: '#e2e8f0' }}>
                    {isGeocoding ? '...' : '📍 Buscar GPS'}
                  </button>
                </div>
              </div>

              <div className="admin-input-group">
                <label>Entre calles / Referencia</label>
                <input className="admin-input" value={editVenueCrossStreets} onChange={e => setEditVenueCrossStreets(e.target.value)} placeholder="Ej: Entre Av. Luro y Echeverría" />
              </div>

              <div className="admin-input-group">
                <label>Pegar Link de Google Maps o Coordenadas (para quintas/eventos)</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="admin-input" value={editVenueMapsLink} onChange={e => setEditVenueMapsLink(e.target.value)} placeholder="Pegá link de Google Maps o -34.7447, -58.5914" style={{ flex: 1 }} />
                  <button
                    type="button"
                    className="admin-btn-reset"
                    style={{ whiteSpace: 'nowrap', padding: '0 12px', background: '#dbeafe', color: '#1e40af', fontWeight: 700 }}
                    onClick={() => {
                      const coords = parseGoogleMapsCoords(editVenueMapsLink)
                      if (coords) {
                        setEditVenueLat(String(coords.lat))
                        setEditVenueLng(String(coords.lng))
                        setMessage('📍 Coordenadas extraídas correctamente.')
                      } else {
                        setMessage('No se reconocieron coordenadas en ese link.')
                      }
                    }}
                  >
                    Extraer
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <div className="admin-input-group">
                  <label>Latitud</label>
                  <input className="admin-input" value={editVenueLat} onChange={e => setEditVenueLat(e.target.value)} placeholder="0" />
                </div>
                <div className="admin-input-group">
                  <label>Longitud</label>
                  <input className="admin-input" value={editVenueLng} onChange={e => setEditVenueLng(e.target.value)} placeholder="0" />
                </div>
                <div className="admin-input-group">
                  <label>Radio (m)</label>
                  <input className="admin-input" type="number" value={editVenueRadius} onChange={e => setEditVenueRadius(e.target.value)} min={0} max={5000} />
                </div>
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 10, marginTop: 4 }}>
                <strong style={{ fontSize: 13, color: '#0f172a', display: 'block', marginBottom: 8 }}>💳 Servicio y Cobranza Mensual</strong>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div className="admin-input-group">
                    <label>Tipo de Servicio</label>
                    <select className="admin-select" value={editVenueServiceType} onChange={e => setEditVenueServiceType(e.target.value as VenueServiceType)}>
                      {SERVICE_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="admin-input-group">
                    <label>Abono Mensual ($)</label>
                    <input className="admin-input" type="number" value={editVenueMonthlyFee} onChange={e => setEditVenueMonthlyFee(e.target.value)} placeholder="50000" />
                  </div>
                  <div className="admin-input-group">
                    <label>Próximo vencimiento</label>
                    <input className="admin-input" type="date" value={editVenueNextDueAt} onChange={e => setEditVenueNextDueAt(e.target.value)} />
                  </div>
                  <div className="admin-input-group">
                    <label>Notas / Texto libre</label>
                    <input className="admin-input" value={editVenueServiceNotes} onChange={e => setEditVenueServiceNotes(e.target.value)} placeholder="Detalle del servicio..." />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="button" className="admin-btn-reset" onClick={() => setEditingVenue(null)} style={{ padding: '10px 16px' }}>Cancelar</button>
                <button type="submit" disabled={isSavingVenueEdit} className="admin-btn-action-primary" style={{ padding: '10px 20px' }}>
                  {isSavingVenueEdit ? 'Guardando...' : '✓ Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL REEMPLAZAR USUARIO FICTICIO POR USUARIO REAL
         ========================================================= */}
      {replacingUser && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.72)',
            backdropFilter: 'blur(4px)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div style={{ background: '#fff', borderRadius: 20, padding: 24, maxWidth: 420, width: '100%', boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 900, color: '#0f172a' }}>
              🔄 Reemplazar usuario por persona real
            </h3>
            <p style={{ fontSize: 13, color: '#475569', margin: '0 0 14px', lineHeight: 1.4 }}>
              Se creará la cuenta real para reemplazar a <strong>{replacingUser.name}</strong> ({replacingUser.email}), transfiriendo automáticamente sus mismos roles y limitaciones de cupones.
            </p>
            <form onSubmit={handleConfirmReplaceUser} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="admin-input-group">
                <label>Nombre Real</label>
                <input className="admin-input" value={replaceName} onChange={e => setReplaceName(e.target.value)} required placeholder="Ej: Carlos Gómez" />
              </div>
              <div className="admin-input-group">
                <label>Email Real</label>
                <input className="admin-input" type="email" value={replaceEmail} onChange={e => setReplaceEmail(e.target.value)} required placeholder="carlos@boliche.com" />
              </div>
              <div className="admin-input-group">
                <label>Contraseña Inicial</label>
                <input className="admin-input" type="password" value={replacePass} onChange={e => setReplacePass(e.target.value)} required minLength={6} placeholder="Mínimo 6 caracteres" />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="button" className="admin-btn-reset" onClick={() => setReplacingUser(null)} style={{ padding: '10px 16px' }}>Cancelar</button>
                <button type="submit" disabled={isReplacingUser} className="admin-btn-action-primary" style={{ padding: '10px 18px' }}>
                  {isReplacingUser ? 'Reemplazando...' : '✓ Confirmar Reemplazo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* =========================================================
          MODAL PAGA POR FECHA (ALMANAQUE Y HORA LÍMITE)
         ========================================================= */}
      {payByDateVenue && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.72)',
            backdropFilter: 'blur(4px)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div style={{ background: '#fff', borderRadius: 20, padding: 24, maxWidth: 420, width: '100%', boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#0f172a' }}>
                📅 Paga por Fecha: {payByDateVenue.name}
              </h3>
              <button type="button" onClick={() => setPayByDateVenue(null)} style={{ border: 0, background: '#f1f5f9', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', fontWeight: 700 }}>✕</button>
            </div>
            <p style={{ fontSize: 13, color: '#475569', margin: '0 0 14px', lineHeight: 1.4 }}>
              Elegí en el almanaque hasta qué <strong>día y hora exacta</strong> va a quedar habilitado el servicio para este local. Al pasar esa hora, se bloqueará automáticamente.
            </p>
            <form onSubmit={handleSavePayByDate} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="admin-input-group">
                <label>📅 Habilitado hasta el día (Almanaque)</label>
                <input
                  className="admin-input"
                  type="date"
                  value={payDateValue}
                  onChange={e => setPayDateValue(e.target.value)}
                  required
                />
              </div>
              <div className="admin-input-group">
                <label>🕒 Hasta la hora</label>
                <input
                  className="admin-input"
                  type="time"
                  value={payTimeValue}
                  onChange={e => setPayTimeValue(e.target.value)}
                  required
                />
              </div>
              <div className="admin-input-group">
                <label>💵 Monto abonado ($) (opcional)</label>
                <input
                  className="admin-input"
                  type="number"
                  value={payAmountValue}
                  onChange={e => setPayAmountValue(e.target.value)}
                  placeholder="Ej: 25000"
                />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="button" className="admin-btn-reset" onClick={() => setPayByDateVenue(null)} style={{ padding: '10px 16px' }}>Cancelar</button>
                <button
                  type="submit"
                  disabled={isSavingPayByDate}
                  className="admin-btn-action-primary"
                  style={{ padding: '10px 18px', background: 'linear-gradient(135deg, #7c3aed, #2563eb)' }}
                >
                  {isSavingPayByDate ? 'Guardando...' : '✓ Habilitar hasta fecha y hora'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
