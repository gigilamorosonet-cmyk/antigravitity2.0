import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, RefreshCw, Eye, User, Clock } from 'lucide-react'
import { useObjectiveStore } from '../../lib/stores/useObjectiveStore'
import { useAgentStore } from '../../lib/stores/useAgentStore'

interface AgentWorkDrawerProps {
  agentId: string
  onClose: () => void
}

export const AgentWorkDrawer: React.FC<AgentWorkDrawerProps> = ({ agentId, onClose }) => {
  const { objectives } = useObjectiveStore()
  const { agents } = useAgentStore()
  
  const agent = agents.find(a => a.id === agentId)
  const agentObjectives = objectives.filter(o => o.assignedTo === agentId)

  return (
    <div className="fixed inset-y-0 right-0 w-96 glass border-l border-neon-blue/20 z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="text-2xl">{agent?.icon || '🤖'}</div>
          <div>
            <h2 className="font-display font-semibold">{agent?.name || agentId}</h2>
            <p className="text-xs text-white/60">Working on {agentObjectives.length} objectives</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-white/10"
        >
          ×
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {agentObjectives.map((obj) => (
          <ObjectiveWorkView key={obj.id} objective={obj} />
        ))}
        
        {agentObjectives.length === 0 && (
          <div className="text-center py-12">
            <p className="text-white/40">No active objectives</p>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-white/10">
        <button className="w-full glass py-2 rounded-lg border border-neon-blue/30 flex items-center justify-center gap-2">
          <Send className="h-4 w-4" />
          Send Reminder
        </button>
      </div>
    </div>
  )
}

const ObjectiveWorkView = ({ objective }: { objective: any }) => {
  const [showLogs, setShowLogs] = useState(false)
  
  return (
    <div className="glass p-3 rounded-lg border border-white/10">
      <h3 className="font-medium text-sm mb-2">{objective.content}</h3>
      
      <div className="space-y-2 text-xs">
        <div className="flex items-center gap-2">
          <Clock className="h-3 w-3 text-white/40" />
          <span className="text-white/60">
            {new Date(objective.updatedAt).toLocaleTimeString()}
          </span>
        </div>
        
        {objective.logs && objective.logs.length > 0 && (
          <div>
            <button
              onClick={() => setShowLogs(!showLogs)}
              className="text-neon-blue hover:underline"
            >
              View {objective.logs.length} log entries
            </button>
            
            <AnimatePresence>
              {showLogs && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 space-y-1 pl-2 border-l border-white/10"
                >
                  {objective.logs.slice(-3).map((log: any, i: number) => (
                    <div key={i} className="text-white/50">
                      <span className="text-neon-blue">{log.agent}:</span> {log.event}
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}