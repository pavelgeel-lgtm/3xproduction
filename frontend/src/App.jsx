import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import LoginPage from './components/auth/LoginPage'
import RegisterPage from './components/auth/RegisterPage'
import InvitePage from './components/auth/InvitePage'
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
import DocumentsPage from './components/production/DocumentsPage'
import ProductionListsPage from './components/production/ProductionListsPage'
import WarehouseViewPage from './components/production/WarehouseViewPage'
import PublicWarehousePage from './components/production/PublicWarehousePage'
import NotificationsPage from './components/shared/NotificationsPage'
import ProfilePage from './components/shared/ProfilePage'
import WarehouseAnalyticsPage from './components/analytics/WarehouseAnalyticsPage'
import ProducerDashboardPage from './components/analytics/ProducerDashboardPage'

function PrivateRoute({ children }) {
  const { token, loading } = useAuth()
  if (loading) return null
  if (!token) return <Navigate to="/login" replace />
  return children
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/invite/:token" element={<InvitePage />} />
        <Route path="/recover" element={<RecoverPage />} />

        <Route path="/dashboard"               element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
        <Route path="/units"                   element={<PrivateRoute><UnitsPage /></PrivateRoute>} />
        <Route path="/units/:id"               element={<PrivateRoute><UnitPage /></PrivateRoute>} />
        <Route path="/cells"                   element={<PrivateRoute><CellsPage /></PrivateRoute>} />
        <Route path="/cells/constructor"       element={<PrivateRoute><CellConstructorPage /></PrivateRoute>} />
        <Route path="/rent"                    element={<PrivateRoute><RentPage /></PrivateRoute>} />
        <Route path="/issue/:id"               element={<PrivateRoute><IssuePage /></PrivateRoute>} />
        <Route path="/return/:id"              element={<PrivateRoute><ReturnPage /></PrivateRoute>} />
        <Route path="/notifications"           element={<PrivateRoute><NotificationsPage /></PrivateRoute>} />
        <Route path="/profile"                 element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
        <Route path="/analytics"               element={<PrivateRoute><WarehouseAnalyticsPage /></PrivateRoute>} />
        <Route path="/analytics/producer"      element={<PrivateRoute><ProducerDashboardPage /></PrivateRoute>} />
        <Route path="/requests"                element={<PrivateRoute><RequestsPage /></PrivateRoute>} />
        <Route path="/team"                    element={<PrivateRoute><TeamPage /></PrivateRoute>} />
        <Route path="/acts"                    element={<PrivateRoute><ActsPage /></PrivateRoute>} />
        <Route path="/production/documents"    element={<PrivateRoute><DocumentsPage /></PrivateRoute>} />
        <Route path="/production/lists"        element={<PrivateRoute><ProductionListsPage /></PrivateRoute>} />
        <Route path="/production/warehouse"    element={<PrivateRoute><WarehouseViewPage /></PrivateRoute>} />

        {/* Public — no auth required */}
        <Route path="/public/warehouse/:token" element={<PublicWarehousePage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
