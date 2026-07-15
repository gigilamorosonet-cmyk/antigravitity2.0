import { useState, useCallback, useEffect, useRef } from 'react'
import ReactFlow, {
  Background, Controls, MiniMap, addEdge, useNodesState, useEdgesState,
  Handle, Position, type Connection, type Edge, type Node, MarkerType,
  BackgroundVariant,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { motion } from 'framer-motion'
import { Plus, Bot, ListTodo, GitFork, Play, Save, Trash2, Loader2, FileText } from 'lucide-react'
import { api } from '../lib/utils'
import { useAppStore } from '../lib/stores/useAppStore'

/* ---------------- Custom nodes ---------------- */

function TaskNode({ data }: any) {
  return (
    <div className={`cyber-glass rounded-xl px-4 py-3 min-w-44 max-w-60 border ${
      data.status === 'done' ? 'border-green-400/60' :
      data.status === 'running' ? 'border-yellow-400/60 glow-pulse' : 'border-cyan-500/30'
    }`}>
      <Handle type="target" position={Position.Top} />
      <div className="flex items-center gap-2 mb-1">
        <ListTodo size={13} className="text-cyan-400" />
        <span className="text-[10px] uppercase tracking-wider text-white/40">Tâche</span>
        {data.status === 'running' && <Loader2 size={11} className="animate-spin text-yellow-400" />}
        {data.status === 'done' && <span className="text-green-400 text-[10px]">✓</span>}
      </div>
      <div className="text-xs text-white/90">{data.label}</div>
      {data.result && (
        <div className="text-[10px] text-green-300/70 mt-2 max-h-16 overflow-y-auto border-t border-white/10 pt-1">
          {data.result.slice(0, 200)}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}

function AgentNode({ data }: any) {
  return (
    <div className="rounded-xl px-4 py-3 min-w-40 neon-border">
      <Handle type="target" position={Position.Top} />
      <div className="flex items-center gap-2 mb-1">
        <Bot size={14} style={{ color: data.color }} />
        <span className="text-[10px] uppercase tracking-wider text-white/40">{data.kind || 'Agent'}</span>
      </div>
      <div className="text-sm font-bold" style={{ color: data.color }}>{data.label}</div>
      <div className="text-[10px] text-white/40 mt-0.5">{data.model}</div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}

function ConditionNode({ data }: any) {
  return (
    <div className="cyber-glass rounded-xl px-4 py-3 min-w-44 border border-yellow-400/40" style={{ transform: 'skewX(-4deg)' }}>
      <Handle type="target" position={Position.Top} />
      <div className="flex items-center gap-2 mb-1" style={{ transform: 'skewX(4deg)' }}>
        <GitFork size={13} className="text-yellow-400" />
        <span className="text-[10px] uppercase tracking-wider text-yellow-400/70">Condition</span>
      </div>
      <div className="text-xs text-white/90" style={{ transform: 'skewX(4deg)' }}>{data.label}</div>
      <Handle type="source" position={Position.Bottom} id="yes" style={{ left: '30%' }} />
      <Handle type="source" position={Position.Bottom} id="no" style={{ left: '70%', background: '#ff6b6b' }} />
      <div className="flex justify-between text-[9px] mt-1 px-1" style={{ transform: 'skewX(4deg)' }}>
        <span className="text-green-400">complexe → oui</span>
        <span className="text-red-400">simple → non</span>
      </div>
    </div>
  )
}

function FileNode({ data }: any) {
  return (
    <div className="cyber-glass rounded-xl px-4 py-3 min-w-36 border border-purple-400/40">
      <Handle type="target" position={Position.Top} />
      <div className="flex items-center gap-2 mb-1">
        <FileText size={13} className="text-purple-400" />
        <span className="text-[10px] uppercase tracking-wider text-purple-300/70">Fichier</span>
      </div>
      <div className="text-xs text-white/90 truncate">{data.label}</div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}

const nodeTypes = { task: TaskNode, agent: AgentNode, condition: ConditionNode, file: FileNode }

let idCounter = 100
const nextId = () => `n${idCounter++}`

/* ---------------- Page ---------------- */

export default function WorkflowPage() {
  const { agents } = useAppStore()
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [wfName, setWfName] = useState('Mon workflow')
  const [running, setRunning] = useState(false)
  const [saved, setSaved] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // charge le dernier workflow sauvegardé
    api('/workflows').then(async (d) => {
      if (d.workflows.length > 0) {
        const wf = await api(`/workflows/${d.workflows[0].id}`)
        setWfName(wf.name)
        setNodes(wf.data.nodes || [])
        setEdges(wf.data.edges || [])
        const maxId = Math.max(100, ...(wf.data.nodes || []).map((n: Node) =>
          parseInt(String(n.id).replace(/\D/g, '') || '0')))
        idCounter = maxId + 1
      }
    }).catch(() => {})
  }, [])

  const onConnect = useCallback((c: Connection) => {
    setEdges((eds) => addEdge({
      ...c, animated: true,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#00f3ff' },
    }, eds))
  }, [setEdges])

  function addNode(type: string, label: string, extra: any = {}) {
    const pos = { x: 120 + Math.random() * 300, y: 80 + Math.random() * 300 }
    setNodes((ns) => [...ns, { id: nextId(), type, position: pos, data: { label, ...extra } }])
  }

  function addAgentNode(agentId: number) {
    const a = agents.find((x) => x.id === agentId)
    if (!a) return
    addNode('agent', a.name, { agentId: a.id, color: a.color, model: a.model, kind: a.kind })
  }

  async function save() {
    await api('/workflows', {
      method: 'POST',
      body: JSON.stringify({ name: wfName, data: { nodes, edges } }),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  /* Exécution : pour chaque tâche reliée (directement ou via condition) à un agent, on l'exécute */
  async function runWorkflow() {
    setRunning(true)
    const taskNodes = nodes.filter((n) => n.type === 'task')
    for (const task of taskNodes) {
      // trouver l'agent relié (task -> agent, ou task -> condition -> agent)
      let agentNode: Node | undefined
      const direct = edges.filter((e) => e.source === task.id)
      for (const e of direct) {
        const target = nodes.find((n) => n.id === e.target)
        if (target?.type === 'agent') { agentNode = target; break }
        if (target?.type === 'condition') {
          // heuristique : tâche "complexe" (mots longs / code / analyse) → branche yes, sinon no
          const complex = /complex|code|analys|difficile|architect|debug|refactor/i.test(String(task.data.label))
          const branch = edges.find((e2) => e2.source === target.id && e2.sourceHandle === (complex ? 'yes' : 'no'))
            || edges.find((e2) => e2.source === target.id)
          if (branch) {
            const t2 = nodes.find((n) => n.id === branch.target)
            if (t2?.type === 'agent') { agentNode = t2; break }
          }
        }
      }
      if (!agentNode) continue

      setNodes((ns) => ns.map((n) => n.id === task.id ? { ...n, data: { ...n.data, status: 'running' } } : n))
      try {
        const res = await api('/workflows/run-task', {
          method: 'POST',
          body: JSON.stringify({ task: task.data.label, agent_id: agentNode.data.agentId }),
        })
        setNodes((ns) => ns.map((n) => n.id === task.id
          ? { ...n, data: { ...n.data, status: 'done', result: res.reply } } : n))
      } catch (e: any) {
        setNodes((ns) => ns.map((n) => n.id === task.id
          ? { ...n, data: { ...n.data, status: 'done', result: `Erreur: ${e.message}` } } : n))
      }
    }
    setRunning(false)
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <input value={wfName} onChange={(e) => setWfName(e.target.value)}
          className="cyber-glass rounded-xl px-3 py-2 text-sm outline-none bg-transparent w-44" />
        <motion.button whileHover={{ scale: 1.05 }} onClick={() => {
          const label = prompt('Description de la tâche :')
          if (label) addNode('task', label, { status: 'pending' })
        }} className="flex items-center gap-1.5 cyber-glass cyber-glass-hover rounded-xl px-3 py-2 text-xs">
          <Plus size={13} className="text-cyan-400" /> Tâche
        </motion.button>
        <motion.button whileHover={{ scale: 1.05 }} onClick={() => {
          const label = prompt('Condition (ex: "si complexe → Claude, sinon → DeepSeek") :')
          if (label) addNode('condition', label)
        }} className="flex items-center gap-1.5 cyber-glass cyber-glass-hover rounded-xl px-3 py-2 text-xs">
          <GitFork size={13} className="text-yellow-400" /> Condition
        </motion.button>
        <motion.button whileHover={{ scale: 1.05 }} onClick={() => {
          const label = prompt('Nom du fichier / ressource :')
          if (label) addNode('file', label)
        }} className="flex items-center gap-1.5 cyber-glass cyber-glass-hover rounded-xl px-3 py-2 text-xs">
          <FileText size={13} className="text-purple-400" /> Fichier
        </motion.button>

        <div className="flex items-center gap-1 ml-2">
          <span className="text-[10px] text-white/40 uppercase mr-1">Agents :</span>
          {agents.map((a) => (
            <motion.button key={a.id} whileHover={{ scale: 1.1 }} onClick={() => addAgentNode(a.id)}
              title={`Ajouter ${a.name} au diagramme`}
              className="cyber-glass rounded-lg px-2 py-1.5 text-[11px] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: a.color }} />
              {a.name.split(' ')[0]}
            </motion.button>
          ))}
        </div>

        <div className="flex-1" />
        <motion.button whileHover={{ scale: 1.05 }} onClick={save}
          className="flex items-center gap-1.5 cyber-glass rounded-xl px-4 py-2 text-xs">
          <Save size={13} className={saved ? 'text-green-400' : 'text-cyan-400'} />
          {saved ? 'Sauvegardé ✓' : 'Sauvegarder'}
        </motion.button>
        <motion.button whileHover={{ scale: 1.05 }} onClick={runWorkflow} disabled={running}
          className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold bg-gradient-to-r from-cyan-500 to-purple-600 disabled:opacity-50 glow-pulse">
          {running ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
          {running ? 'Exécution...' : 'Exécuter'}
        </motion.button>
        <motion.button whileHover={{ scale: 1.05 }} onClick={() => { setNodes([]); setEdges([]) }}
          className="cyber-glass rounded-xl px-3 py-2 text-xs text-red-400/70 hover:text-red-400">
          <Trash2 size={13} />
        </motion.button>
      </div>

      <p className="text-[11px] text-white/35">
        Ajoute des tâches, des agents et des conditions → relie une tâche à un agent pour qu'il l'exécute.
        Relie via une condition pour déléguer selon la complexité (complexe → branche verte, simple → branche rouge).
        Supprime un élément avec la touche Suppr/Backspace.
      </p>

      {/* Canvas */}
      <div ref={wrapperRef} className="cyber-glass rounded-2xl overflow-hidden" style={{ height: 'calc(100vh - 300px)', minHeight: 420 }}>
        <ReactFlow
          nodes={nodes} edges={edges}
          onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          deleteKeyCode={['Backspace', 'Delete']}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} color="#00f3ff22" gap={24} />
          <Controls />
          <MiniMap nodeColor={(n: Node) => n.data?.color || '#00f3ff'} maskColor="rgba(4,4,12,0.7)" />
        </ReactFlow>
      </div>
    </div>
  )
}
