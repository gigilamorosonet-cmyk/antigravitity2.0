import { useState } from 'react'
import { motion } from 'framer-motion'
import { Zap, Lock, Mail, Eye, EyeOff, Shield } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../lib/stores/useAppStore'

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const setAuth = useAppStore((s) => s.setAuth)
  const navigate = useNavigate()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Erreur')
      setAuth(data.token, data.email, data.onboarded)
      navigate(data.onboarded ? '/' : '/onboarding')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-deep-space grid-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* orbes flottants */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl float-slow" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl float-slow" style={{ animationDelay: '2s' }} />

      <motion.div
        initial={{ opacity: 0, y: 30, rotateX: -10 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ type: 'spring', stiffness: 200 }}
        className="cyber-glass neon-border rounded-2xl p-8 w-full max-w-md relative z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ repeat: Infinity, duration: 4 }}
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/30 to-purple-500/30 flex items-center justify-center glow-pulse mb-4"
          >
            <Zap size={32} className="text-cyan-300" />
          </motion.div>
          <h1 className="text-3xl font-bold neon-text">AGENTNEXUS</h1>
          <p className="text-white/50 text-sm mt-2 text-center">
            Gérez vos agents IA — mémoire partagée, workflows, statistiques
          </p>
        </div>

        <div className="flex cyber-glass rounded-xl p-1 mb-6">
          {(['login', 'register'] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError('') }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === m ? 'bg-gradient-to-r from-cyan-500/30 to-purple-500/30 text-cyan-200' : 'text-white/50'
              }`}
            >
              {m === 'login' ? 'Connexion' : 'Créer un compte'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="relative">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400/60" />
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemple.com"
              className="w-full cyber-glass rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:border-cyan-400/50 bg-transparent"
            />
          </div>
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400/60" />
            <input
              type={showPw ? 'text' : 'password'} required minLength={6} value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe (min 6 caractères)"
              className="w-full cyber-glass rounded-xl pl-10 pr-10 py-3 text-sm outline-none focus:border-cyan-400/50 bg-transparent"
            />
            <button type="button" onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {error && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-red-400 text-sm text-center">{error}</motion.p>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 font-bold text-sm disabled:opacity-50 glow-pulse"
          >
            {loading ? '...' : mode === 'login' ? 'ENTRER DANS LE NEXUS' : 'INITIALISER MON COMPTE'}
          </motion.button>
        </form>

        <div className="flex items-center gap-2 justify-center mt-6 text-xs text-white/40">
          <Shield size={12} className="text-green-400" />
          Clés API chiffrées AES · Auth JWT · Stockage local sécurisé
        </div>
      </motion.div>
    </div>
  )
}
