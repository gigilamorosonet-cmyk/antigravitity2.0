import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Brain, Plus, Trash2, Bot, Globe, Target } from 'lucide-react'
import { api } from '../lib/utils'
import { useAppStore } from '../lib/stores/useAppStore'

export default function MemoryPage() {
  const { agents } = useAppStore()
  const [memories, setMemories] = useState<any[]>([])
  const [newMem, setNewMem] = useState({ scope: 'global', agent_id: null as number | null, content: '' })

  useEffect(() => {
    api('/memory').then((d) => setMemories(d.memory)).catch(() => {})
  }, [])

  async function addMem() {
    if (!newMem.content.trim()) return
    await api('/memory', { method: 'POST', body: JSON.stringify(newMem) })
    const created = await api('/memory')
    setMemories(created.memory)
    setNewMem({ ...newMem, content: '' })
  }

  async function del(id: number) {
    await api(`/memory/${id}`, { method: 'DELETE' })
    setMemories((m) => m.filter((x) => x.id !== id))
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-white/50">
        La mémoire <strong>globale</strong> est partagée par tous les agents. La mémoire <strong>individuelle</strong> ne l'est pas.
        Les agents y ont accès automatiquement via leur prompt.
      </p>

      {/* Add form */}
      <div className="cyber-glass rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-bold text-white/70 flex items-center gap-2"><Plus size={15} /> Ajouter une mémoire</h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <input type="radio" id="glob" name="scope" checked={newMem.scope === 'global'}
              onChange={() => setNewMem({ ...newMem, scope: 'global', agent_id: null })} />
            <label htmlFor="glob" className="flex items-center gap-1 text-xs cursor-pointer">
              <Globe size={12} className="text-cyan-400" /> Global
            </label>
          </div>
          <div className="flex items-center gap-2">
            <input type="radio" id="priv" name="scope" checked={newMem.scope === 'private'}
              onChange={() => setNewMem({ ...newMem, scope: 'private' })} />
            <label htmlFor="priv" className="flex items-center gap-1 text-xs cursor-pointer">
              <Target size={12} className="text-purple-400" /> Privé
            </label>
          </div>

          {newMem.scope === 'private' && (
            <select value={newMem.agent_id ?? ''}
              onChange={(e) => setNewMem({ ...newMem, agent_id: Number(e.target.value) })}
              className="cyber-glass rounded-lg px-2 py-1 text-xs bg-transparent outline-none">
              <option value=""> — Choisir un agent — </option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          )}
        </div>
        <textarea placeholder="Contenu de la mémoire (instructions, connaissances, contexte...)"
          value={newMem.content} onChange={(e) => setNewMem({ ...newMem, content: e.target.value })}
          rows={3}
          className="cyber-glass rounded-xl px-3 py-2 text-sm outline-none w-full bg-transparent resize-none" />
        <motion.button whileHover={{ scale: 1.05 }} onClick={addMem} disabled={!newMem.content.trim()}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 font-medium text-sm disabled:opacity-40">
          <Plus size={14} /> Ajouter
        </motion.button>
      </div>

      {/* Liste mémoire */}
      {memories.length === 0 ? (
        <div className="cyber-glass rounded-2xl p-10 text-center">
          <Brain size={36} className="text-cyan-400/40 mx-auto mb-3" />
          <p className="text-white/40 text-sm">Aucune mémoire encore</p>
        </div>
      ) : (
        <div className="space-y-3">
          {memories.map((m) => (
            <motion.div key={m.id} whileHover={{ x: 4 }}
              className="cyber-glass rounded-xl px-4 py-3 flex items-start justify-between group">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {m.scope === 'global' ? (
                    <Globe size={13} className="text-cyan-400 shrink-0" />
                  ) : (
                    <Bot size={13} className="text-purple-400 shrink-0" />
                  )}
                  <span className={`text-[10px] uppercase ${m.scope === 'global' ? 'text-cyan-400' : 'text-purple-400'}`}>
                    {m.scope === 'global' ? 'Global' : 'Privé'}
                  </span>
                </div>
                <p className="text-sm text-white/80 whitespace-pre-wrap">{m.content}</p>
              </div>
              <button onClick={() => del(m.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 text-red-400/60 hover:text-red-400 p-1">
                <Trash2 size={13} />
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
