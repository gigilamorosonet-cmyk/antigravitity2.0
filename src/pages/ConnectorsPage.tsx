import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plug, Key, Check, X, ShieldCheck, RefreshCw } from 'lucide-react'
import { api } from '../lib/utils'

const PROVIDERS = [
  { id: 'openrouter', name: 'OpenRouter', desc: '200+ modèles disponibles', color: '#00f3ff' },
  { id: 'anthropic', name: 'Anthropic', desc: 'Claude — réflexion avancée', color: '#ff00ff' },
  { id: 'mistral', name: 'Mistral', desc: 'Modèles français, rapides', color: '#ffb800' },
  { id: 'deepseek', name: 'DeepSeek', desc: 'Ultra-économique', color: '#8a2be2' },
  { id: 'openai', name: 'OpenAI', desc: 'GPT — polyvalent', color: '#10ff90' },
]

export default function ConnectorsPage() {
  const [keys, setKeys] = useState<any[]>([])
  const [inputKeys, setInputKeys] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})

  useEffect(() => {
    api('/keys').then((d) => {
      setKeys(d.keys)
      const m: Record<string, boolean> = {}
      d.keys.forEach((k: any) => m[k.provider] = true)
      setSaved(m)
    }).catch(() => {})
  }, [])

  async function saveKey(provider: string) {
    const key = inputKeys[provider]?.trim()
    if (!key) return
    await api('/keys', { method: 'POST', body: JSON.stringify({ provider, key }) })
    setSaved((s) => ({ ...s, [provider]: true }))
    setInputKeys((k) => ({ ...k, [provider]: '' }))
    setKeys((k) => [...k.filter((x) => x.provider !== provider),
                    { provider, created_at: new Date().toISOString(), masked: 'sk-••••••••' }])
  }

  async function deleteKey(provider: string) {
    if (!confirm(`Supprimer la clé ${provider} ?`)) return
    await api(`/keys/${provider}`, { method: 'DELETE' })
    setSaved((s) => ({ ...s, [provider]: false }))
    setKeys((k) => k.filter((x) => x.provider !== provider))
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-white/50">
        Ajoute une ou plusieurs clés API pour activer les agents en mode réel. Sans clé, ils fonctionnent en mode démo.
      </p>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {PROVIDERS.map((p) => {
          const hasKey = saved[p.id]
          return (
            <motion.div key={p.id} whileHover={{ scale: 1.03, y: -4 }}
              className="cyber-glass cyber-glass-hover rounded-2xl p-5 flex flex-col">
              <div className="flex items-center gap-2.5 mb-3">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                <span className="font-bold text-sm">{p.name}</span>
                {hasKey && <span className="ml-auto" title="Connecté"><ShieldCheck size={13} className="text-green-400" /></span>}
              </div>
              <p className="text-xs text-white/40 mb-4 flex-1">{p.desc}</p>

              {hasKey ? (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/50">Connecté</span>
                  <button onClick={() => deleteKey(p.id)}
                    className="text-red-400/60 hover:text-red-400 px-2 py-1 rounded">
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="password" placeholder="sk-..."
                    value={inputKeys[p.id] || ''}
                    onChange={(e) => setInputKeys({ ...inputKeys, [p.id]: e.target.value })}
                    className="flex-1 cyber-glass rounded-lg px-3 py-1.5 text-xs outline-none bg-transparent"
                  />
                  <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                    onClick={() => saveKey(p.id)} disabled={!inputKeys[p.id]?.trim()}
                    className="px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 text-xs font-medium disabled:opacity-40">
                    Sauver
                  </motion.button>
                </div>
              )}
            </motion.div>
          )
        })}
      </div>

      <div className="cyber-glass rounded-xl p-4 text-[11px] text-white/50">
        <div className="flex items-center gap-1.5 mb-2">
          <Key size={13} className="text-cyan-400" />
          <span className="uppercase font-bold text-white/70">Comment obtenir une clé API</span>
        </div>
        <ul className="ml-5 list-disc space-y-1">
          <li><strong>OpenRouter</strong> → <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" className="text-cyan-300 hover:underline">openrouter.ai/keys</a></li>
          <li><strong>Anthropic</strong> → <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" className="text-cyan-300 hover:underline">console.anthropic.com</a></li>
          <li><strong>Mistral</strong> → <a href="https://console.mistral.ai/api-keys" target="_blank" rel="noreferrer" className="text-cyan-300 hover:underline">console.mistral.ai</a></li>
          <li><strong>DeepSeek</strong> → <a href="https://platform.deepseek.com/api-keys" target="_blank" rel="noreferrer" className="text-cyan-300 hover:underline">platform.deepseek.com</a></li>
          <li><strong>OpenAI</strong> → <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="text-cyan-300 hover:underline">platform.openai.com</a></li>
        </ul>
        <p className="mt-3 text-yellow-400/80">
          🔐 Les clés sont chiffrées AES-256 dans la base SQLite et jamais exposées au frontend.
        </p>
      </div>
    </div>
  )
}
