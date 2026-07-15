import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, Plus, Edit, Trash2, Save, X, Zap, Plug, Brain, RotateCcw } from 'lucide-react'
import { api } from '../lib/utils'
import { useAppStore } from '../lib/stores/useAppStore'

const KINDS = ['agent', 'model']
const PROVIDERS = ['openrouter', 'anthropic', 'mistral', 'deepseek', 'openai']

export default function AgentsPage() {
  const { agents, setAgents, activeAgentId } = useAppStore()
  const [editing, setEditing] = useState<any | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    api('/agents').then((d) => setAgents(d.agents)).catch(() => {})
  }, [])

  async function saveAgent(data: any) {
    if (editing?.id) {
      await api(`/agents/${editing.id}`, { method: 'PUT', body: JSON.stringify(data) })
    } else {
      await api('/agents', { method: 'POST', body: JSON.stringify(data) })
    }
    const updated = await api('/agents')
    setAgents(updated.agents)
    setShowCreate(false)
    setEditing(null)
  }

  async function deleteAgent(id: number) {
    if (!confirm('Supprimer cet agent ?')) return
    await api(`/agents/${id}`, { method: 'DELETE' })
    setAgents(agents.filter((a) => a.id !== id))
  }

  function AgentForm({ agent, onSave, onCancel }: any) {
    const [form, setForm] = useState(agent || { name: '', kind: 'agent', provider: 'openrouter', model: '', color: '#00f3ff', icon: 'bot', system_prompt: '', skills: [] })

    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="cyber-glass rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-white/70 flex items-center gap-2">
          {agent ? <Edit size={15} /> : <Plus size={15} />}
          {agent ? 'Modifier' : 'Créer'} un agent
        </h3>

        <div className="grid md:grid-cols-2 gap-3">
          <input placeholder="Nom" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="cyber-glass rounded-xl px-3 py-2 text-sm outline-none" />
          <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}
            className="cyber-glass rounded-xl px-3 py-2 text-sm outline-none bg-deep-space">
            {KINDS.map((k) => <option key={k} value={k}>{k === 'agent' ? 'Agent' : 'Modèle'}</option>)}
          </select>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <select value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })}
            className="cyber-glass rounded-xl px-3 py-2 text-sm outline-none bg-deep-space">
            {PROVIDERS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <input placeholder="Modèle (ex: claude-sonnet-4)" value={form.model}
            onChange={(e) => setForm({ ...form, model: e.target.value })}
            className="cyber-glass rounded-xl px-3 py-2 text-sm outline-none" />
        </div>

        <input placeholder="Couleur (hex)" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })}
          className="cyber-glass rounded-xl px-3 py-2 text-sm outline-none w-full" />

        <textarea placeholder="Prompt système (instructions)" value={form.system_prompt}
          onChange={(e) => setForm({ ...form, system_prompt: e.target.value })}
          rows={3}
          className="cyber-glass rounded-xl px-3 py-2 text-sm outline-none w-full bg-transparent resize-none" />

        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 rounded-xl text-white/50 hover:text-white/80 text-sm flex items-center gap-1">
            <X size={14} /> Annuler
          </button>
          <motion.button whileHover={{ scale: 1.05 }} onClick={() => onSave(form)}
            disabled={!form.name.trim() || !form.model.trim()}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 font-medium text-sm disabled:opacity-40 flex items-center gap-1.5">
            <Save size={14} /> Sauver
          </motion.button>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-white/50">
          Gère, crée et configure tes agents IA. Les agents par défaut utilisent les providers configurés.
        </p>
        <motion.button whileHover={{ scale: 1.05 }} onClick={() => { setEditing(null); setShowCreate(true) }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 text-sm font-medium">
          <Plus size={15} /> Nouvel agent
        </motion.button>
      </div>

      {/* Form create/edit */}
      <AnimatePresence>
        {showCreate && (
          <AgentForm agent={editing} onSave={saveAgent} onCancel={() => { setShowCreate(false); setEditing(null) }} />
        )}
      </AnimatePresence>

      {/* Agents grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((a) => (
          <motion.div key={a.id} whileHover={{ y: -4 }}
            className={`cyber-glass cyber-glass-hover rounded-2xl p-5 relative group ${a.id === activeAgentId ? 'border-cyan-400/60' : ''}`}>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: a.color }} />
              <span className="font-bold text-sm truncate flex-1">{a.name}</span>
              {a.has_key ? (
                <span className="shrink-0" title="Clé disponible"><Plug size={12} className="text-green-400" /></span>
              ) : (
                <span className="shrink-0" title="Mode démo"><Plug size={12} className="text-yellow-400" /></span>
              )}
            </div>
            <div className="text-[11px] text-white/40 mb-2">{a.model}</div>
            <div className="text-[11px] uppercase text-white/30 mb-3">{a.kind} · {a.provider}</div>
            {a.system_prompt && (
              <p className="text-xs text-white/60 line-clamp-2 mb-3">{a.system_prompt}</p>
            )}
            <div className="flex items-center gap-1 text-[11px]">
              <Brain size={12} className="text-purple-400 shrink-0" />
              <span className="text-purple-300/70">{a.skills?.length || 0} skills</span>
            </div>

            <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => { setEditing(a); setShowCreate(true) }}
                className="text-cyan-400/70 hover:text-cyan-300 p-1 rounded">
                <Edit size={13} />
              </button>
              <button onClick={() => deleteAgent(a.id)}
                className="text-red-400/60 hover:text-red-400 p-1 rounded">
                <Trash2 size={13} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
