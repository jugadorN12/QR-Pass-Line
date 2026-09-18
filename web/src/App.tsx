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

function ProtectedRoutes() {
  const { currentUser, loading } = useApp()
  if (loading) return <main className="app-shell"><div className="page"><div className="card">Cargando QR Pass Line…</div></div></main>
  if (!currentUser) return <Navigate to="/ingresar" replace />
  return (
    <Shell />
  )
}

function RoleGate({ children }: { children?: ReactNode }) {
  const { currentUser, loading } = useApp()
  if (loading) return <main className="role-screen"><div className="role-main"><div className="role-card">Cargando QR Pass Line…</div></div></main>
  if (!currentUser) return <Navigate to="/ingresar" replace />
  return children ?? <RoleSelectionPage />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/ingresar" element={<AuthPage />} />
        <Route path="/seleccionar-rol" element={<RoleGate />} />
        <Route path="/encargado" element={<RoleGate><ManagerPage /></RoleGate>} />
        <Route path="/encargado/configuracion" element={<RoleGate><EstablishmentSettingsPage /></RoleGate>} />
        <Route path="/vendedores" element={<RoleGate><SellersPage /></RoleGate>} />
        <Route path="/vendedores/:sellerId/limitaciones" element={<RoleGate><SellerLimitationsPage /></RoleGate>} />
        <Route path="/vendedores/:sellerId/limitaciones/nueva" element={<RoleGate><NewSellerLimitationPage /></RoleGate>} />
        <Route path="/vendedores/:sellerId/limitaciones/:limitId/editar" element={<RoleGate><EditSellerLimitationPage /></RoleGate>} />
        <Route path="/canjeadores" element={<RoleGate><RedeemersPage /></RoleGate>} />
        <Route path="/canjeadores/:redeemerId/limitaciones/nueva" element={<RoleGate><NewSellerLimitationPage /></RoleGate>} />
        <Route path="/canjeadores/:redeemerId/limitaciones" element={<RoleGate><SellerLimitationsPage /></RoleGate>} />
        <Route path="/canjeadores/:redeemerId/limitaciones/:limitId/editar" element={<RoleGate><EditSellerLimitationPage /></RoleGate>} />
        <Route path="/accesos" element={<RoleGate><AccessTypesPage /></RoleGate>} />
        <Route path="/qr" element={<RoleGate><QrTypesPage /></RoleGate>} />
        <Route path="/qr/nuevo" element={<RoleGate><NewQrPage /></RoleGate>} />
        <Route path="/qr/informacion" element={<RoleGate><QrInfoPage /></RoleGate>} />
        <Route path="/qr/grupos" element={<RoleGate><QrGroupsPage /></RoleGate>} />
        <Route path="/qr/inactivos" element={<RoleGate><InactiveQrPage /></RoleGate>} />
        <Route path="/supervisores" element={<RoleGate><StaffRolePage role="supervisor" title="Supervisores" /></RoleGate>} />
        <Route path="/validadores" element={<RoleGate><StaffRolePage role="validador" title="Validadores" /></RoleGate>} />
        <Route element={<ProtectedRoutes />}>
          <Route index element={<HomePage />} />
          <Route path="/fechas" element={<EventsPage />} />
          <Route path="/fechas/nueva" element={<NewEventPage />} />
          <Route path="/fechas/:eventId" element={<EventDetailPage />} />
          <Route path="/puerta" element={<GatePage />} />
          <Route path="/equipo" element={<TeamPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
