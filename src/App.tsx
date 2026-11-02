import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './app/AppShell'
import { AccessDenied } from './components/ui'
import { useAuth } from './contexts/AuthContext'
import { hasPermission, type ProtectedArea } from './lib/permissions'
import { HomePage, QualificationPage, QueuePage } from './pages/DashboardPages'
import { LeadDetailPage, LeadsPage } from './pages/LeadsPages'
import { LoginPage } from './pages/LoginPage'
import { FollowUpsPage, ProfilePage, ReportsPage, TeamPage } from './pages/OperationsPages'

function ProtectedLayout(){const{user}=useAuth();if(!user)return <Navigate to="/login" replace/>;return <AppShell><Routes><Route path="/home" element={<HomePage/>}/><Route path="/queue" element={<QueuePage/>}/><Route path="/leads" element={<LeadsPage/>}/><Route path="/leads/:journeyId" element={<LeadDetailPage/>}/><Route path="/qualification" element={<QualificationPage/>}/><Route path="/follow-ups" element={<FollowUpsPage/>}/><Route path="/team" element={<RoleRoute area="team"><TeamPage/></RoleRoute>}/><Route path="/reports" element={<RoleRoute area="reports"><ReportsPage/></RoleRoute>}/><Route path="/settings/profile" element={<ProfilePage/>}/><Route path="*" element={<Navigate to="/home" replace/>}/></Routes></AppShell>}
function RoleRoute({area,children}:{area:ProtectedArea;children:React.ReactNode}){const{user}=useAuth();return user&&hasPermission(user.role,area)?children:<AccessDenied/>}
export default function App(){const{user}=useAuth();return <Routes><Route path="/login" element={<LoginPage/>}/><Route path="/*" element={<ProtectedLayout/>}/><Route path="/" element={<Navigate to={user?'/home':'/login'} replace/>}/></Routes>}
