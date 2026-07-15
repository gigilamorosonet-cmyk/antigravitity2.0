import { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, MessageSquare, GitBranch, Sparkles, Plug, Bot,
  LogOut, Menu, X, Zap, Shield,
} from 'lucide-react'
import { useAppStore } from '../lib/stores/useAppStore'

const NAV = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/' },
  { label: 'Chat Agents', icon: MessageSquare, href: '/chat' },
  { label: 'Workflow', icon: GitBranch, href: '/workflow' },
  { label: 'Skills', icon: Sparkles, href: '/skills' },
  { label: 'Connecteurs', icon: Plug, href: '/connectors' },
  { label: 'Mémoire', icon: Bot, href: '/memory' },
  { label: 'Agents', icon: Bot, href: '/agents' },
]

export function GlobalLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { email, logout } = useAppStore()
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-deep-space grid-bg relative">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-64 glass border-r border-cyan-500/10 z-40 p-4 gap-4">
        <div className="flex items-center gap-2 px-2 py-3">
          <Zap className="text-neon-blue" size={24} />
          <h1 className="text-lg font-bold neon-text">ANTIGRAVITY</h1>
        </div>
        <nav className="flex-1 flex flex-col gap-1 mt-2">
          {NAV.map((item) => (
            <NavLink key={item.href} to={item.href}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  isActive ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <item.icon size={17} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-cyan-500/10 pt-3 space-y-2">
          {email && (
            <div className="flex items-center gap-2 px-2 text-xs text-white/50">
              <Shield size={13} className="text-green-400" />
              <span className="truncate">{email}</span>
            </div>
          )}
          <button onClick={() => { logout(); navigate('/auth') }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-400/80 hover:bg-red-500/10 w-full transition-colors">
            <LogOut size={15} /> Déconnexion
          </button>
        </div>
      </aside>

      {/* Mobile */}
      <header className="lg:hidden fixed top-0 inset-x-0 h-14 glass z-40 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Zap className="text-neon-blue" size={20} />
          <span className="font-bold neon-text text-sm">ANTIGRAVITY</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="text-cyan-300">
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>
      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="lg:hidden fixed top-14 inset-x-0 bottom-0 bg-deep-space/95 backdrop-blur-xl z-30 p-4 space-y-2"
          >
            {NAV.map((item) => (
              <NavLink key={item.href} to={item.href} onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl ${isActive ? 'bg-cyan-500/15 text-cyan-300' : 'text-white/70'}`
                }
              >
                <item.icon size={18} /> {item.label}
              </NavLink>
            ))}
          </motion.nav>
        )}
      </AnimatePresence>

      <main className="lg:ml-64 pt-14 lg:pt-0 min-h-screen scanline">
        <div className="p-4 lg:p-8">
          <motion.div key={location.pathname} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  )
}