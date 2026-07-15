import { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { GlobalLayout } from './components/GlobalLayout'
import './index.css'

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

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loader />}>
        <Routes>
          <Route path="/auth" element={<Navigate to="/" replace />} />
          <Route path="/onboarding" element={<Navigate to="/" replace />} />
          <Route path="/" element={<GlobalLayout><DashboardPage /></GlobalLayout>} />
          <Route path="/chat" element={<GlobalLayout><ChatPage /></GlobalLayout>} />
          <Route path="/workflow" element={<GlobalLayout><WorkflowPage /></GlobalLayout>} />
          <Route path="/skills" element={<GlobalLayout><SkillsPage /></GlobalLayout>} />
          <Route path="/connectors" element={<GlobalLayout><ConnectorsPage /></GlobalLayout>} />
          <Route path="/memory" element={<GlobalLayout><MemoryPage /></GlobalLayout>} />
          <Route path="/agents" element={<GlobalLayout><AgentsPage /></GlobalLayout>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />)