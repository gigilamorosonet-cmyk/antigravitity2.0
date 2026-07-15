import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Trash2, Sparkles, Tag, FileText, Lock, Unlock } from 'lucide-react'
import { api } from '../lib/utils'

const CATEGORIES = [
  'general', 'coding', 'analysis', 'writing', 'finance', 'creative', 'research', 'business',
]

export default function SkillsPage() {
  const [skills, setSkills] = useState<any[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [newSkill, setNewSkill] = useState({ name: '', category: 'general', description: '', content: '' })

  useEffect(() => {
    api('/skills').then((d) => setSkills(d.skills)).catch(() => {})
  }, [])

  async function createSkill() {
    if (!newSkill.name.trim() || !newSkill.content.trim()) return
    const s = await api('/skills', { method: 'POST', body: JSON.stringify(newSkill) })
    const created = await api(`/skills/${s.id}`)
    setSkills((sk) => [created, ...sk])
    setNewSkill({ name: '', category: 'general', description: '', content: '' })
    setShowCreate(false)
  }

  async function del(id: number) {
    if (!confirm('Supprimer ce skill ?')) return
    await api(`/skills/${id}`, { method: 'DELETE' })
    setSkills((sk) => sk.filter((s) => s.id !== id))
  }

  return (
    <div className="space-y-4">
      {/* Create button */}
      <motion.button
        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        onClick={() => setShowCreate(!showCreate)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 text-sm font-medium"
      >
        <Plus size={16} /> Créer un skill
      </motion.button>

      {/* Create form */}
      {showCreate && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
          className="cyber-glass rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-white/70 flex items-center gap-2"><Sparkles size={15} />Nouveau Skill</h3>
          <div className="grid md:grid-cols-3 gap-3">
            <input placeholder="Nom du skill" value={newSkill.name}
              onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
              className="cyber-glass rounded-xl px-3 py-2 text-sm outline-none col-span-2" />
            <select value={newSkill.category}
              onChange={(e) => setNewSkill({ ...newSkill, category: e.target.value })}
              className="cyber-glass rounded-xl px-3 py-2 text-sm outline-none bg-deep-space">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <input placeholder="Description (optionnel)" value={newSkill.description}
            onChange={(e) => setNewSkill({ ...newSkill, description: e.target.value })}
            className="cyber-glass rounded-xl px-3 py-2 text-sm outline-none w-full" />
          <textarea placeholder="Contenu du skill (instructions détaillées)" value={newSkill.content}
            onChange={(e) => setNewSkill({ ...newSkill, content: e.target.value })}
            rows={5}
            className="cyber-glass rounded-xl px-3 py-2 text-sm outline-none w-full bg-transparent resize-none" />
          <div className="flex gap-3 justify-end">
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-xl text-white/50 hover:text-white/80 text-sm">
              Annuler
            </button>
            <motion.button whileHover={{ scale: 1.05 }} onClick={createSkill}
              disabled={!newSkill.name.trim() || !newSkill.content.trim()}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 font-medium text-sm disabled:opacity-40">
              Créer
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Skills grid */}
      {skills.length === 0 ? (
        <div className="cyber-glass rounded-2xl p-10 text-center">
          <Sparkles size={36} className="text-cyan-400/40 mx-auto mb-3" />
          <p className="text-white/40 text-sm">Aucun skill créé pour l'instant</p>
          <p className="text-white/25 text-xs mt-1">Crée des skills personnalisés que tous les agents peuvent utiliser</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {skills.map((s) => (
            <motion.div key={s.id} whileHover={{ y: -4 }}
              className="cyber-glass cyber-glass-hover rounded-xl p-4 relative group">
              <div className="flex items-start justify-between mb-2">
                <Tag size={13} className="text-purple-400 shrink-0 mt-0.5" />
                <span className="text-[10px] uppercase text-white/30">{s.category}</span>
              </div>
              <h3 className="font-bold text-sm mb-1 truncate">{s.name}</h3>
              {s.description && <p className="text-xs text-white/40 mb-2 line-clamp-2">{s.description}</p>}
              <div className="text-[10px] text-white/25 border-t border-white/10 pt-2 mt-2 max-h-16 overflow-y-auto">
                {s.content.slice(0, 180)}{s.content.length > 180 ? '…' : ''}
              </div>
              <button onClick={() => del(s.id)}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-red-400/60 hover:text-red-400 p-1 rounded">
                <Trash2 size={12} />
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
