import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useApp } from './context/AppContext'
import { Shell } from './components/Shell'
import { AuthPage } from './pages/AuthPage'
import { HomePage } from './pages/HomePage'
import { EventsPage } from './pages/EventsPage'
import { NewEventPage } from './pages/NewEventPage'
import { EventDetailPage } from './pages/EventDetailPage'
import { GatePage } from './pages/GatePage'
import { TeamPage } from './pages/TeamPage'
import { RoleSelectionPage } from './pages/RoleSelectionPage'
import { ManagerPage } from './pages/ManagerPage'
import { SellersPage } from './pages/SellersPage'
import { RedeemersPage } from './pages/RedeemersPage'
import { AccessTypesPage } from './pages/AccessTypesPage'
import { QrTypesPage } from './pages/QrTypesPage'
import { NewQrPage } from './pages/NewQrPage'
import { StaffRolePage } from './pages/StaffRolePage'
import { QrInfoPage, QrGroupsPage, InactiveQrPage } from './pages/QrInfoPage'
import { SellerLimitationsPage, NewSellerLimitationPage, EditSellerLimitationPage } from './pages/SellerLimitationsPage'
import { EstablishmentSettingsPage } from './pages/EstablishmentSettingsPage'
import { AdminDashboardPage } from './pages/AdminDashboardPage'
import { SellerEmitPage } from './pages/SellerEmitPage'

function ProtectedRoutes() {
  const { currentUser, loading, logout } = useApp()
  if (loading) return <main className="app-shell"><div className="page"><div className="card">Cargando QR Pass Line…</div></div></main>
  if (!currentUser) return <Navigate to="/ingresar" replace />
  if (currentUser.role === 'pendiente' || !currentUser.role) {
    return (
      <main className="role-screen">
        <div className="role-main">
          <div className="role-card" style={{ padding: 32, textAlign: 'center' }}>
            <h2>Cuenta pendiente de aprobación</h2>
            <p className="muted" style={{ margin: '16px 0' }}>Tu cuenta fue registrada exitosamente, pero aún no tiene un rol asignado por un Organizador.</p>
            <button className="btn btn-primary" type="button" onClick={() => void logout()}>Cerrar sesión</button>
          </div>
        </div>
      </main>
    )
  }
  return (
    <Shell />
  )
}

function AdminGate({ children }: { children: ReactNode }) {
  const { currentUser, loading } = useApp()
  if (loading) return <main className="role-screen"><div className="role-main"><div className="role-card">Cargando QR Pass Line…</div></div></main>
  if (!currentUser) return <Navigate to="/ingresar" replace />
  if (currentUser.role !== 'admin') return <Navigate to="/seleccionar-rol" replace />
  return <>{children}</>
}

function ProtectedRoutesNoShell({ children }: { children: ReactNode }) {
  const { currentUser, loading, logout } = useApp()
  if (loading) return <main className="role-screen"><div className="role-main"><div className="role-card">Cargando QR Pass Line…</div></div></main>
  if (!currentUser) return <Navigate to="/ingresar" replace />
  if (currentUser.role === 'pendiente' || !currentUser.role) {
    return (
      <main className="role-screen">
        <div className="role-main">
          <div className="role-card" style={{ padding: 32, textAlign: 'center' }}>
            <h2>Cuenta pendiente de aprobación</h2>
            <p className="muted" style={{ margin: '16px 0' }}>Tu cuenta fue registrada exitosamente, pero aún no tiene un rol asignado por un Organizador.</p>
            <button className="btn btn-primary" type="button" onClick={() => void logout()}>Cerrar sesión</button>
          </div>
        </div>
      </main>
    )
  }
  return <>{children}</>
}

function RoleGate({ children }: { children?: ReactNode }) {
  const { currentUser, loading, logout } = useApp()
  if (loading) return <main className="role-screen"><div className="role-main"><div className="role-card">Cargando QR Pass Line…</div></div></main>
  if (!currentUser) return <Navigate to="/ingresar" replace />
  if (currentUser.role === 'pendiente' || !currentUser.role) {
    return (
      <main className="role-screen">
        <div className="role-main">
          <div className="role-card" style={{ padding: 32, textAlign: 'center' }}>
            <h2>Cuenta pendiente de aprobación</h2>
            <p className="muted" style={{ margin: '16px 0' }}>Tu cuenta fue registrada exitosamente, pero aún no tiene un rol asignado por un Organizador.</p>
            <button className="btn btn-primary" type="button" onClick={() => void logout()}>Cerrar sesión</button>
          </div>
        </div>
      </main>
    )
  }
  return children ?? <RoleSelectionPage />
}

function ManagerGate({ children }: { children: ReactNode }) {
  const { currentUser, loading, logout } = useApp()
  if (loading) return <main className="role-screen"><div className="role-main"><div className="role-card">Cargando QR Pass Line…</div></div></main>
  if (!currentUser) return <Navigate to="/ingresar" replace />
  if (currentUser.role === 'pendiente' || !currentUser.role) {
    return (
      <main className="role-screen">
        <div className="role-main">
          <div className="role-card" style={{ padding: 32, textAlign: 'center' }}>
            <h2>Cuenta pendiente de aprobación</h2>
            <p className="muted" style={{ margin: '16px 0' }}>Tu cuenta fue registrada exitosamente, pero aún no tiene un rol asignado por un Organizador.</p>
            <button className="btn btn-primary" type="button" onClick={() => void logout()}>Cerrar sesión</button>
          </div>
        </div>
      </main>
    )
  }
  const userRoles = currentUser.roles && currentUser.roles.length ? currentUser.roles : [currentUser.role]
  const isManager = userRoles.includes('organizador') || userRoles.includes('admin')
  if (!isManager) {
    return <Navigate to="/seleccionar-rol" replace />
  }
  return <>{children}</>
}

function HomeRedirect() {
  const { currentUser, loading } = useApp()
  if (loading) return <main className="role-screen"><div className="role-main"><div className="role-card">Cargando QR Pass Line…</div></div></main>
  if (!currentUser) return <Navigate to="/ingresar" replace />
  if (currentUser.role === 'admin') return <Navigate to="/admin" replace />
  return <Navigate to="/seleccionar-rol" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/ingresar" element={<AuthPage />} />
        <Route path="/seleccionar-rol" element={<RoleGate />} />
        <Route path="/admin" element={<AdminGate><AdminDashboardPage /></AdminGate>} />
        <Route path="/encargado" element={<ManagerGate><ManagerPage /></ManagerGate>} />
        <Route path="/encargado/configuracion" element={<ManagerGate><EstablishmentSettingsPage /></ManagerGate>} />
        <Route path="/vendedor" element={<RoleGate><SellerEmitPage /></RoleGate>} />
        <Route path="/puerta" element={<RoleGate><GatePage /></RoleGate>} />
        <Route path="/vendedores" element={<ManagerGate><SellersPage /></ManagerGate>} />
        <Route path="/vendedores/:sellerId/limitaciones" element={<ManagerGate><SellerLimitationsPage /></ManagerGate>} />
        <Route path="/vendedores/:sellerId/limitaciones/nueva" element={<ManagerGate><NewSellerLimitationPage /></ManagerGate>} />
        <Route path="/vendedores/:sellerId/limitaciones/:limitId/editar" element={<ManagerGate><EditSellerLimitationPage /></ManagerGate>} />
        <Route path="/canjeadores" element={<ManagerGate><RedeemersPage /></ManagerGate>} />
        <Route path="/canjeadores/:redeemerId/limitaciones/nueva" element={<ManagerGate><NewSellerLimitationPage /></ManagerGate>} />
        <Route path="/canjeadores/:redeemerId/limitaciones" element={<ManagerGate><SellerLimitationsPage /></ManagerGate>} />
        <Route path="/canjeadores/:redeemerId/limitaciones/:limitId/editar" element={<ManagerGate><EditSellerLimitationPage /></ManagerGate>} />
        <Route path="/accesos" element={<ManagerGate><AccessTypesPage /></ManagerGate>} />
        <Route path="/qr" element={<ManagerGate><QrTypesPage /></ManagerGate>} />
        <Route path="/qr/nuevo" element={<ManagerGate><NewQrPage /></ManagerGate>} />
        <Route path="/qr/informacion" element={<ManagerGate><QrInfoPage /></ManagerGate>} />
        <Route path="/qr/grupos" element={<ManagerGate><QrGroupsPage /></ManagerGate>} />
        <Route path="/qr/inactivos" element={<ManagerGate><InactiveQrPage /></ManagerGate>} />
        <Route path="/supervisores" element={<ManagerGate><StaffRolePage role="supervisor" title="Supervisores" /></ManagerGate>} />
        <Route path="/validadores" element={<ManagerGate><StaffRolePage role="validador" title="Validadores" /></ManagerGate>} />
        {/* La pantalla principal del Organizador (HomePage) ahora va por fuera del Shell para verse a pantalla completa */}
        <Route path="/resumen" element={<ProtectedRoutesNoShell><HomePage /></ProtectedRoutesNoShell>} />

        <Route element={<ProtectedRoutes />}>
          <Route path="/fechas" element={<EventsPage />} />
          <Route path="/fechas/nueva" element={<NewEventPage />} />
          <Route path="/fechas/:eventId" element={<EventDetailPage />} />
          <Route path="/equipo" element={<TeamPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
