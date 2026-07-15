import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Key, Bot, Check, ChevronRight, SkipForward, Zap } from 'lucide-react'
import { api } from '../lib/utils'
import { useAppStore } from '../lib/stores/useAppStore'

const PROVIDERS = [
  { id: 'openrouter', name: 'OpenRouter', desc: 'Accès à 200+ modèles (Hermes, Claude, GPT...)', color: '#00f3ff' },
  { id: 'anthropic', name: 'Anthropic', desc: 'Claude — tâches complexes & code', color: '#ff00ff' },
  { id: 'mistral', name: 'Mistral', desc: 'Modèles français, équilibrés', color: '#ffb800' },
  { id: 'deepseek', name: 'DeepSeek', desc: 'Ultra économique pour tâches simples', color: '#8a2be2' },
  { id: 'openai', name: 'OpenAI', desc: 'GPT — polyvalent', color: '#10ff90' },
]

export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const [keys, setKeys] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState<string[]>([])
  const [agents, setAgents] = useState<any[]>([])
  const navigate = useNavigate()
  const setOnboarded = useAppStore((s) => s.setOnboarded)

  useEffect(() => {
    api('/agents').then((d) => setAgents(d.agents)).catch(() => {})
  }, [])

  async function saveKey(provider: string) {
    const key = keys[provider]?.trim()
    if (!key) return
    await api('/keys', { method: 'POST', body: JSON.stringify({ provider, key }) })
    setSaved((s) => [...s, provider])
  }

  async function finish() {
    await api('/auth/onboarded', { method: 'POST' })
    setOnboarded()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-deep-space grid-bg flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="cyber-glass neon-border rounded-2xl p-8 w-full max-w-2xl"
      >
        {/* progress */}
        <div className="flex items-center gap-2 mb-8">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i <= step ? 'bg-gradient-to-r from-cyan-400 to-purple-500' : 'bg-white/10'}`} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="s0" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
              <Zap size={40} className="text-cyan-300 mb-4" />
              <h2 className="text-2xl font-bold neon-text mb-3">Bienvenue dans le Nexus</h2>
              <p className="text-white/60 text-sm leading-relaxed mb-6">
                AgentNexus est ton centre de commandement IA. Configure tes agents, connecte tes
                clés API (optionnel — sans clé, les agents répondent en mode démo), construis des
                workflows visuels et suis tes dépenses en temps réel.
              </p>
              <ul className="space-y-2 text-sm text-white/70 mb-8">
                <li className="flex items-center gap-2"><Check size={14} className="text-green-400" /> Multi-agents : Hermes, OpenClaw, DeepSeek, Mistral + les tiens</li>
                <li className="flex items-center gap-2"><Check size={14} className="text-green-400" /> Mémoire partagée + mémoire individuelle par agent</li>
                <li className="flex items-center gap-2"><Check size={14} className="text-green-400" /> Workflow drag-and-drop avec délégation conditionnelle</li>
                <li className="flex items-center gap-2"><Check size={14} className="text-green-400" /> Clés chiffrées AES côté serveur, jamais exposées au navigateur</li>
              </ul>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
              <Key size={32} className="text-purple-400 mb-4" />
              <h2 className="text-xl font-bold mb-2">Connecte tes clés API</h2>
              <p className="text-white/50 text-sm mb-6">
                Optionnel. Sans clé, l'agent fonctionne en mode démo (réponses simulées, coût 0€).
              </p>
              <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                {PROVIDERS.map((p) => (
                  <div key={p.id} className="cyber-glass rounded-xl p-3 flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{p.name}</div>
                      <div className="text-xs text-white/40 truncate">{p.desc}</div>
                    </div>
                    {saved.includes(p.id) ? (
                      <span className="text-green-400 flex items-center gap-1 text-xs"><Check size={14} /> OK</span>
                    ) : (
                      <>
                        <input
                          type="password" placeholder="sk-..."
                          value={keys[p.id] || ''}
                          onChange={(e) => setKeys({ ...keys, [p.id]: e.target.value })}
                          className="cyber-glass rounded-lg px-3 py-1.5 text-xs w-36 outline-none bg-transparent"
                        />
                        <button onClick={() => saveKey(p.id)}
                          className="text-xs px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30">
                          Sauver
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
              <Bot size={32} className="text-cyan-400 mb-4" />
              <h2 className="text-xl font-bold mb-2">Tes agents sont prêts</h2>
              <p className="text-white/50 text-sm mb-6">
                4 agents pré-configurés. Tu pourras les modifier ou en créer d'autres dans l'onglet Agents.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {agents.map((a) => (
                  <motion.div key={a.id} whileHover={{ scale: 1.03, y: -3 }}
                    className="cyber-glass cyber-glass-hover rounded-xl p-4">
                    <span className="w-3 h-3 rounded-full inline-block mb-2 glow-pulse" style={{ backgroundColor: a.color }} />
                    <div className="font-medium text-sm">{a.name}</div>
                    <div className="text-xs text-white/40 mt-1">{a.model}</div>
                    <div className={`text-[10px] mt-2 ${a.has_key ? 'text-green-400' : 'text-yellow-400'}`}>
                      {a.has_key ? '● Clé connectée' : '◌ Mode démo'}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex justify-between items-center mt-8">
          <button onClick={finish} className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70">
            <SkipForward size={13} /> Passer
          </button>
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => (step < 2 ? setStep(step + 1) : finish())}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 font-bold text-sm"
          >
            {step < 2 ? 'Continuer' : 'Lancer le Nexus'} <ChevronRight size={16} />
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}
