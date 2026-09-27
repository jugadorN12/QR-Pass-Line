import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { lazy, Suspense, type ReactNode } from 'react'
import { useApp } from './context/AppContext'
import { Shell } from './components/Shell'

const AuthPage = lazy(() => import('./pages/AuthPage').then((m) => ({ default: m.AuthPage })))
const HomePage = lazy(() => import('./pages/HomePage').then((m) => ({ default: m.HomePage })))
const EventsPage = lazy(() => import('./pages/EventsPage').then((m) => ({ default: m.EventsPage })))
const NewEventPage = lazy(() => import('./pages/NewEventPage').then((m) => ({ default: m.NewEventPage })))
const EventDetailPage = lazy(() => import('./pages/EventDetailPage').then((m) => ({ default: m.EventDetailPage })))
const GatePage = lazy(() => import('./pages/GatePage').then((m) => ({ default: m.GatePage })))
const TeamPage = lazy(() => import('./pages/TeamPage').then((m) => ({ default: m.TeamPage })))
const RoleSelectionPage = lazy(() => import('./pages/RoleSelectionPage').then((m) => ({ default: m.RoleSelectionPage })))
const ManagerPage = lazy(() => import('./pages/ManagerPage').then((m) => ({ default: m.ManagerPage })))
const SellersPage = lazy(() => import('./pages/SellersPage').then((m) => ({ default: m.SellersPage })))
const RedeemersPage = lazy(() => import('./pages/RedeemersPage').then((m) => ({ default: m.RedeemersPage })))
const AccessTypesPage = lazy(() => import('./pages/AccessTypesPage').then((m) => ({ default: m.AccessTypesPage })))
const QrTypesPage = lazy(() => import('./pages/QrTypesPage').then((m) => ({ default: m.QrTypesPage })))
const NewQrPage = lazy(() => import('./pages/NewQrPage').then((m) => ({ default: m.NewQrPage })))
const StaffRolePage = lazy(() => import('./pages/StaffRolePage').then((m) => ({ default: m.StaffRolePage })))
const QrInfoPage = lazy(() => import('./pages/QrInfoPage').then((m) => ({ default: m.QrInfoPage })))
const QrGroupsPage = lazy(() => import('./pages/QrInfoPage').then((m) => ({ default: m.QrGroupsPage })))
const InactiveQrPage = lazy(() => import('./pages/QrInfoPage').then((m) => ({ default: m.InactiveQrPage })))
const SellerLimitationsPage = lazy(() => import('./pages/SellerLimitationsPage').then((m) => ({ default: m.SellerLimitationsPage })))
const NewSellerLimitationPage = lazy(() => import('./pages/SellerLimitationsPage').then((m) => ({ default: m.NewSellerLimitationPage })))
const EditSellerLimitationPage = lazy(() => import('./pages/SellerLimitationsPage').then((m) => ({ default: m.EditSellerLimitationPage })))
const EstablishmentSettingsPage = lazy(() => import('./pages/EstablishmentSettingsPage').then((m) => ({ default: m.EstablishmentSettingsPage })))
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })))
const SellerEmitPage = lazy(() => import('./pages/SellerEmitPage').then((m) => ({ default: m.SellerEmitPage })))
const InformesPage = lazy(() => import('./pages/InformesPage').then((m) => ({ default: m.InformesPage })))
const InformeVentasPage = lazy(() => import('./pages/InformeVentasPage').then((m) => ({ default: m.InformeVentasPage })))
const InformeLecPage = lazy(() => import('./pages/InformeLecPage').then((m) => ({ default: m.InformeLecPage })))
const InformeCanjeoPage = lazy(() => import('./pages/InformeCanjeoPage').then((m) => ({ default: m.InformeCanjeoPage })))
const PublicLinksPage = lazy(() => import('./pages/PublicLinksPage').then((m) => ({ default: m.PublicLinksPage })))
const BansPage = lazy(() => import('./pages/BansPage').then((m) => ({ default: m.BansPage })))


function PendingApprovalScreen() {
  const { currentUser, logout } = useApp()
  return (
    <main className="role-screen" style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', background: '#f8fafc', padding: 16 }}>
      <div className="role-card" style={{ maxWidth: 420, width: '100%', padding: '32px 24px', textAlign: 'center', background: '#fff', borderRadius: 24, boxShadow: '0 10px 30px rgba(0,0,0,0.06)' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#eff6ff', border: '2px solid #bfdbfe', display: 'grid', placeItems: 'center', fontSize: 30, margin: '0 auto 16px' }}>
          ⏳
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: '0 0 12px' }}>
          ¡Cuenta registrada!
        </h2>
        <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 16, padding: '16px 18px', margin: '16px 0', textAlign: 'center' }}>
          <p style={{ fontSize: 15, fontWeight: 800, color: '#166534', margin: '0 0 8px', lineHeight: 1.4 }}>
            Avisale al encargado que ya te registraste y pasale tu email para que te asigne tu rol.
          </p>
          <div style={{ display: 'inline-block', background: '#fff', padding: '6px 14px', borderRadius: 8, border: '1px solid #bbf7d0', fontWeight: 900, color: '#14532d', fontSize: 14 }}>
            {currentUser?.email}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
          <button className="btn btn-primary btn-block" type="button" onClick={() => window.location.reload()} style={{ height: 48, borderRadius: 12, fontWeight: 800, background: '#1e3a8a' }}>
            ↻ Ya me asignaron rol (Actualizar)
          </button>
          <button className="btn btn-secondary btn-block" type="button" onClick={() => void logout()} style={{ height: 44, borderRadius: 12 }}>
            Cerrar sesión
          </button>
        </div>
      </div>
    </main>
  )
}

function ProtectedRoutes() {
  const { currentUser, loading } = useApp()
  if (loading) return <main className="app-shell"><div className="page"><div className="card">Cargando QR Pass Line…</div></div></main>
  if (!currentUser) return <Navigate to="/ingresar" replace />
  if (currentUser.role === 'pendiente' || !currentUser.role) {
    return <PendingApprovalScreen />
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
  const { currentUser, loading } = useApp()
  if (loading) return <main className="role-screen"><div className="role-main"><div className="role-card">Cargando QR Pass Line…</div></div></main>
  if (!currentUser) return <Navigate to="/ingresar" replace />
  if (currentUser.role === 'pendiente' || !currentUser.role) {
    return <PendingApprovalScreen />
  }
  return <>{children}</>
}

function RoleGate({ children }: { children?: ReactNode }) {
  const { currentUser, loading } = useApp()
  if (loading) return <main className="role-screen"><div className="role-main"><div className="role-card">Cargando QR Pass Line…</div></div></main>
  if (!currentUser) return <Navigate to="/ingresar" replace />
  if (currentUser.role === 'pendiente' || !currentUser.role) {
    return <PendingApprovalScreen />
  }
  return children ?? <RoleSelectionPage />
}

function ManagerGate({ children }: { children: ReactNode }) {
  const { currentUser, loading } = useApp()
  if (loading) return <main className="role-screen"><div className="role-main"><div className="role-card">Cargando QR Pass Line…</div></div></main>
  if (!currentUser) return <Navigate to="/ingresar" replace />
  if (currentUser.role === 'pendiente' || !currentUser.role) {
    return <PendingApprovalScreen />
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
      <Suspense fallback={<main className="role-screen"><div className="role-main"><div className="role-card">Cargando...</div></div></main>}>
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
          <Route path="/validadores" element={<Navigate to="/canjeadores" replace />} />
          <Route path="/informes" element={<ManagerGate><InformesPage /></ManagerGate>} />
          <Route path="/informeventa" element={<ManagerGate><InformeVentasPage /></ManagerGate>} />
          <Route path="/informelec" element={<InformeLecPage />} />
          <Route path="/informecanjeo" element={<ManagerGate><InformeCanjeoPage /></ManagerGate>} />
          <Route path="/fechas" element={<ManagerGate><EventsPage /></ManagerGate>} />
          <Route path="/fechas/nueva" element={<ManagerGate><NewEventPage /></ManagerGate>} />
          <Route path="/fechas/:eventId" element={<ManagerGate><EventDetailPage /></ManagerGate>} />
          <Route path="/links-publicos" element={<ManagerGate><PublicLinksPage /></ManagerGate>} />
          <Route path="/publiclink" element={<ManagerGate><PublicLinksPage /></ManagerGate>} />
          <Route path="/baneos" element={<ManagerGate><BansPage /></ManagerGate>} />
          <Route path="/informebaneos" element={<ManagerGate><BansPage /></ManagerGate>} />
          {/* La pantalla principal del Organizador (HomePage) ahora va por fuera del Shell para verse a pantalla completa */}
          <Route path="/resumen" element={<ProtectedRoutesNoShell><HomePage /></ProtectedRoutesNoShell>} />

          <Route element={<ProtectedRoutes />}>
            <Route path="/equipo" element={<TeamPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
