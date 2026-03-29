import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { ROLES } from './constants/roles'
import { getHomeRoute } from './utils/getHomeRoute'
import LoginPage from './components/auth/LoginPage'
import RegisterPage from './components/auth/RegisterPage'
import InvitePage from './components/auth/InvitePage'
import SignPage from './components/rent/SignPage'
import RecoverPage from './components/auth/RecoverPage'
import DashboardPage from './components/warehouse/DashboardPage'
import UnitPage from './components/warehouse/UnitPage'
import IssuePage from './components/movement/IssuePage'
import ReturnPage from './components/movement/ReturnPage'
import CellsPage from './components/warehouse/CellsPage'
import UnitsPage from './components/warehouse/UnitsPage'
import RentPage from './components/rent/RentPage'
import CellConstructorPage from './components/warehouse/CellConstructorPage'
import RequestsPage from './components/warehouse/RequestsPage'
import TeamPage from './components/warehouse/TeamPage'
import ActsPage from './components/warehouse/ActsPage'
import DebtsPage from './components/warehouse/DebtsPage'
import ApprovalsPage from './components/warehouse/ApprovalsPage'
import DocumentsPage from './components/production/DocumentsPage'
import DocumentViewer from './components/production/DocumentViewer'
import ProductionListsPage from './components/production/ProductionListsPage'
import RequestsProductionPage from './components/production/RequestsProductionPage'
import WarehouseViewPage from './components/production/WarehouseViewPage'
import PublicWarehousePage from './components/production/PublicWarehousePage'
import NotificationsPage from './components/shared/NotificationsPage'
import ProfilePage from './components/shared/ProfilePage'
import WarehouseAnalyticsPage from './components/analytics/WarehouseAnalyticsPage'
import ProducerDashboardPage from './components/analytics/ProducerDashboardPage'
import StaffPage from './components/production/StaffPage'
import SeedPage from './components/dev/SeedPage'

// Requires auth only
function PrivateRoute({ children }) {
  const { token, loading } = useAuth()
  if (loading) return null
  if (!token) return <Navigate to="/login" replace />
  return children
}

// Requires auth + warehouse world
function WarehouseRoute({ children }) {
  const { token, user, loading } = useAuth()
  if (loading) return null
  if (!token) return <Navigate to="/login" replace />
  const world = ROLES[user?.role]?.world
  if (world && world !== 'warehouse') return <Navigate to={getHomeRoute(user.role)} replace />
  return children
}

// Requires auth + production world
function ProductionRoute({ children }) {
  const { token, user, loading } = useAuth()
  if (loading) return null
  if (!token) return <Navigate to="/login" replace />
  const world = ROLES[user?.role]?.world
  if (world && world !== 'production') return <Navigate to={getHomeRoute(user.role)} replace />
  return children
}

function ImpersonateBanner() {
  const { user, login } = useAuth()
  const producerToken = sessionStorage.getItem('producer_token')

  // Set CSS var for layout offset
  document.documentElement.style.setProperty('--impersonate-offset', producerToken ? '36px' : '0px')

  if (!producerToken) return null

  const roleDef = ROLES[user?.role] || {}

  function handleReturn() {
    const token = sessionStorage.getItem('producer_token')
    const userData = sessionStorage.getItem('producer_user')
    if (token && userData) {
      login(token, JSON.parse(userData))
      sessionStorage.removeItem('producer_token')
      sessionStorage.removeItem('producer_user')
      window.location.href = '/production/staff'
    }
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999, height: 36,
      background: '#f59e0b', color: '#000', padding: '0 16px',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
      fontSize: 13, fontWeight: 500,
    }}>
      <span>Вы просматриваете как {user?.name} ({roleDef.label || user?.role})</span>
      <button onClick={handleReturn} style={{
        background: '#000', color: '#fff', border: 'none', borderRadius: 6,
        padding: '4px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
      }}>
        Вернуться
      </button>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <ImpersonateBanner />
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/invite/:token" element={<InvitePage />} />
        <Route path="/recover" element={<RecoverPage />} />

        {/* Warehouse routes */}
        <Route path="/dashboard"               element={<WarehouseRoute><DashboardPage /></WarehouseRoute>} />
        <Route path="/units"                   element={<WarehouseRoute><UnitsPage /></WarehouseRoute>} />
        <Route path="/units/:id"               element={<WarehouseRoute><UnitPage /></WarehouseRoute>} />
        <Route path="/cells"                   element={<WarehouseRoute><CellsPage /></WarehouseRoute>} />
        <Route path="/cells/constructor"       element={<WarehouseRoute><CellConstructorPage /></WarehouseRoute>} />
        <Route path="/rent"                    element={<PrivateRoute><RentPage /></PrivateRoute>} />
        <Route path="/issue/:id"               element={<WarehouseRoute><IssuePage /></WarehouseRoute>} />
        <Route path="/return/:id"              element={<WarehouseRoute><ReturnPage /></WarehouseRoute>} />
        <Route path="/requests"                element={<WarehouseRoute><RequestsPage /></WarehouseRoute>} />
        <Route path="/team"                    element={<PrivateRoute><TeamPage /></PrivateRoute>} />
        <Route path="/acts"                    element={<WarehouseRoute><ActsPage /></WarehouseRoute>} />
        <Route path="/debts"                   element={<WarehouseRoute><DebtsPage /></WarehouseRoute>} />
        <Route path="/approvals"               element={<WarehouseRoute><ApprovalsPage /></WarehouseRoute>} />
        <Route path="/analytics"               element={<WarehouseRoute><WarehouseAnalyticsPage /></WarehouseRoute>} />

        {/* Production routes */}
        <Route path="/production/requests"      element={<ProductionRoute><RequestsProductionPage /></ProductionRoute>} />
        <Route path="/production/documents"    element={<ProductionRoute><DocumentsPage /></ProductionRoute>} />
        <Route path="/production/documents/:projectId/:docId" element={<ProductionRoute><DocumentViewer /></ProductionRoute>} />
        <Route path="/production/lists"        element={<ProductionRoute><ProductionListsPage /></ProductionRoute>} />
        <Route path="/production/warehouse"    element={<ProductionRoute><WarehouseViewPage /></ProductionRoute>} />
        <Route path="/production/staff"          element={<ProductionRoute><StaffPage /></ProductionRoute>} />
        <Route path="/analytics/producer"      element={<ProductionRoute><ProducerDashboardPage /></ProductionRoute>} />

        {/* Shared routes (any authenticated user) */}
        <Route path="/notifications"           element={<PrivateRoute><NotificationsPage /></PrivateRoute>} />
        <Route path="/profile"                 element={<PrivateRoute><ProfilePage /></PrivateRoute>} />

        {/* Dev tools */}
        <Route path="/dev/seed" element={<SeedPage />} />

        {/* Public — no auth required */}
        <Route path="/public/warehouse/:token" element={<PublicWarehousePage />} />
        <Route path="/sign/:token" element={<SignPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
