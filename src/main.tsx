import { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAppStore } from './lib/stores/useAppStore'
import { GlobalLayout } from './components/GlobalLayout'

const AuthPage = lazy(() => import('./pages/AuthPage'))
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const ChatPage = lazy(() => import('./pages/ChatPage'))
const WorkflowPage = lazy(() => import('./pages/WorkflowPage'))
const SkillsPage = lazy(() => import('./pages/SkillsPage'))
const ConnectorsPage = lazy(() => import('./pages/ConnectorsPage'))
const MemoryPage = lazy(() => import('./pages/MemoryPage'))
const AgentsPage = lazy(() => import('./pages/AgentsPage'))

function Loader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-deep-space">
      <div className="w-12 h-12 rounded-full border-2 border-cyan-400/30 border-t-cyan-400 animate-spin glow-pulse" />
    </div>
  )
}

function Protected({ children }: { children: React.ReactNode }) {
  const { token, onboarded } = useAppStore()
  if (!token) return <Navigate to="/auth" replace />
  if (!onboarded) return <Navigate to="/onboarding" replace />
  return <GlobalLayout>{children}</GlobalLayout>
}

export default function App() {
  const { token, onboarded } = useAppStore()
  return (
    <BrowserRouter>
      <Suspense fallback={<Loader />}>
        <Routes>
          <Route path="/auth" element={token ? <Navigate to="/" replace /> : <AuthPage />} />
          <Route path="/onboarding"
            element={!token ? <Navigate to="/auth" replace /> : onboarded ? <Navigate to="/" replace /> : <OnboardingPage />} />
          <Route path="/" element={<Protected><DashboardPage /></Protected>} />
          <Route path="/chat" element={<Protected><ChatPage /></Protected>} />
          <Route path="/workflow" element={<Protected><WorkflowPage /></Protected>} />
          <Route path="/skills" element={<Protected><SkillsPage /></Protected>} />
          <Route path="/connectors" element={<Protected><ConnectorsPage /></Protected>} />
          <Route path="/memory" element={<Protected><MemoryPage /></Protected>} />
          <Route path="/agents" element={<Protected><AgentsPage /></Protected>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />)