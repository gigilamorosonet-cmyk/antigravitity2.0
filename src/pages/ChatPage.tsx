import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Paperclip, X, Loader2, Sparkles } from 'lucide-react'
import { api, fmtCost } from '../lib/utils'
import { useAppStore } from '../lib/stores/useAppStore'

interface Msg { role: string; content: string }

export default function ChatPage() {
  const { agents, activeAgentId, setActiveAgent } = useAppStore()
  const active = agents.find((a) => a.id === activeAgentId)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [fileCtx, setFileCtx] = useState<{ name: string; content: string } | null>(null)
  const [lastCost, setLastCost] = useState<number | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!activeAgentId) return
    api(`/messages/${activeAgentId}`).then((d) => setMessages(d.messages)).catch(() => setMessages([]))
  }, [activeAgentId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send() {
    if (!input.trim() || !activeAgentId || loading) return
    const text = input.trim()
    setInput('')
    setMessages((m) => [...m, { role: 'user', content: text }])
    setLoading(true)
    try {
      const res = await api('/chat', {
        method: 'POST',
        body: JSON.stringify({
          agent_id: activeAgentId,
          message: text,
          file_context: fileCtx ? `[${fileCtx.name}]\n${fileCtx.content}` : null,
        }),
      })
      setMessages((m) => [...m, { role: 'assistant', content: res.reply }])
      setLastCost(res.cost)
      setFileCtx(null)
    } catch (e: any) {
      setMessages((m) => [...m, { role: 'assistant', content: `⚠️ ${e.message}` }])
    } finally {
      setLoading(false)
    }
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => setFileCtx({ name: f.name, content: String(reader.result).slice(0, 50000) })
    reader.readAsText(f)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      {/* Onglets agents */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {agents.map((a) => (
          <motion.button
            key={a.id}
            whileHover={{ y: -2 }}
            onClick={() => setActiveAgent(a.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm whitespace-nowrap transition-all ${
              a.id === activeAgentId
                ? 'neon-border text-white'
                : 'cyber-glass text-white/50 hover:text-white/80'
            }`}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: a.color }} />
            {a.name}
            {!a.has_key && <span className="text-yellow-400 text-[10px]" title="Mode démo">DÉMO</span>}
          </motion.button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 cyber-glass rounded-2xl p-4 overflow-y-auto space-y-4">
        {messages.length === 0 && !loading && (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <Sparkles size={36} className="text-cyan-400/40 mb-3" />
            <p className="text-white/40 text-sm">
              Nouvelle conversation avec <span className="text-cyan-300">{active?.name}</span>
            </p>
            <p className="text-white/25 text-xs mt-1">
              La mémoire partagée et sa mémoire individuelle sont injectées automatiquement
            </p>
          </div>
        )}
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-gradient-to-br from-cyan-500/25 to-purple-500/25 border border-cyan-500/20'
                    : 'cyber-glass'
                }`}
              >
                {m.role === 'assistant' && (
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: active?.color }} />
                    <span className="text-[10px] uppercase tracking-wider text-white/40">{active?.name}</span>
                  </div>
                )}
                {m.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-white/40 text-sm">
            <Loader2 size={14} className="animate-spin text-cyan-400" />
            {active?.name} réfléchit...
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* fichier attaché */}
      {fileCtx && (
        <div className="flex items-center gap-2 mt-2 cyber-glass rounded-lg px-3 py-1.5 text-xs w-fit">
          <Paperclip size={12} className="text-cyan-400" />
          {fileCtx.name}
          <button onClick={() => setFileCtx(null)} className="text-white/40 hover:text-red-400"><X size={12} /></button>
        </div>
      )}

      {/* input */}
      <div className="flex items-end gap-2 mt-3">
        <input ref={fileRef} type="file" className="hidden" onChange={onFile}
          accept=".txt,.md,.json,.csv,.py,.js,.ts,.tsx,.html,.css" />
        <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
          onClick={() => fileRef.current?.click()}
          className="cyber-glass rounded-xl p-3 text-cyan-400/70 hover:text-cyan-300">
          <Paperclip size={18} />
        </motion.button>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder={`Message à ${active?.name || 'l\u2019agent'}... (Entrée pour envoyer)`}
          rows={1}
          className="flex-1 cyber-glass rounded-xl px-4 py-3 text-sm outline-none focus:border-cyan-400/50 bg-transparent resize-none"
        />
        <motion.button
          whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
          onClick={send} disabled={loading || !input.trim()}
          className="rounded-xl p-3 bg-gradient-to-r from-cyan-500 to-purple-600 disabled:opacity-40 glow-pulse"
        >
          <Send size={18} />
        </motion.button>
      </div>
      {lastCost !== null && (
        <div className="text-[11px] text-white/30 mt-1.5 text-right">
          Dernière requête : {fmtCost(lastCost)}
        </div>
      )}
    </div>
  )
}
