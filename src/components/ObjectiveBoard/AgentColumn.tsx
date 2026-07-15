import React, { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Shield, 
  Cpu, 
  Globe, 
  Activity,
  Zap,
  Clock,
  AlertCircle
} from 'lucide-react'
import clsx from 'clsx'
import { Objective, useObjectiveStore } from '@/lib/stores/useObjectiveStore'
import { useAgentStore } from '@/lib/stores/useAgentStore'
import { ObjectiveCard } from './ObjectiveCard'

interface AgentColumnProps {
  agentId: string
  isDropTarget?: boolean
}

export const AgentColumn: React.FC<AgentColumnProps> = ({ 
  agentId, 
  isDropTarget = false 
}) => {
  const { objectives } = useObjectiveStore()
  const { agents } = useAgentStore()
  const [showWork, setShowWork] = useState(false)
  
  const agent = agents.find(a => a.id === agentId)
  const agentObjectives = useObjectiveStore.getState().getObjectivesByAgent(agentId)

  const { setNodeRef, isOver } = useDroppable({
    id: `agent-${agentId}`,
    data: { agentId }
  })

  const getStatusColor = () => {
    switch (agent?.status) {
      case 'connected':
        return 'bg-green-500 shadow-[0_0_10px_rgba(0,255,0,0.5)]'
      case 'requires_config':
        return 'bg-yellow-500 shadow-[0_0_10px_rgba(255,255,0,0.5)]'
      default:
        return 'bg-red-500 shadow-[0_0_10px_rgba(255,0,0,0.5)]'
    }
  }

  const getAgentIcon = () => {
    if (agent?.icon) return <span className="text-xl">{agent.icon}</span>
    
    switch (agent?.id) {
      case 'hermes':
        return <Shield className="h-5 w-5 text-orange-400" />
      case 'openclaw':
        return <Cpu className="h-5 w-5 text-blue-400" />
      default:
        return <Globe className="h-5 w-5 text-green-400" />
    }
  }

  const getStatusText = () => {
    switch (agent?.status) {
      case 'connected':
        return 'Online'
      case 'requires_config':
        return 'Config Required'
      default:
        return 'Offline'
    }
  }

  const getWorkloadInfo = () => {
    const inProgress = agentObjectives.filter(o => o.status === 'in-progress').length
    const pending = agentObjectives.filter(o => o.status === 'pending').length
    return { inProgress, pending, total: agentObjectives.length }
  }

  const workload = getWorkloadInfo()

  if (!agent) return null

  return (
    <div className="flex flex-col h-full">
      {/* Agent Header */}
      <div className={clsx(
        'glass rounded-xl p-4 mb-4 border',
        isOver ? 'border-neon-blue' : 'border-white/10'
      )}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/5">
              {getAgentIcon()}
            </div>
            <div>
              <h3 className="font-semibold text-white">{agent.name}</h3>
              <span className="text-xs text-white/50 capitalize">
                {agent.description}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className={clsx(
              'w-2 h-2 rounded-full',
              getStatusColor()
            )} />
            <span className="text-xs text-white/60">{getStatusText()}</span>
          </div>
        </div>

        {/* Workload Stats */}
        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/10">
          <div className="text-center">
            <div className="text-lg font-bold text-neon-blue">{workload.inProgress}</div>
            <div className="text-xs text-white/40">Active</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-neon-purple">{workload.pending}</div>
            <div className="text-xs text-white/40">Pending</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-white">{workload.total}</div>
            <div className="text-xs text-white/40">Total</div>
          </div>
        </div>

        {/* Live Activity Indicator */}
        {workload.inProgress > 0 && (
          <div className="mt-2 flex items-center gap-2 text-xs text-neon-purple">
            <Activity className="h-3 w-3 animate-pulse" />
            <span>Processing {workload.inProgress} task{workload.inProgress > 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {/* Drop Zone */}
      <div
        ref={setNodeRef}
        className={clsx(
          'flex-1 rounded-xl p-2 min-h-[200px] transition-all',
          'border-2 border-dashed',
          isOver 
            ? 'border-neon-blue bg-neon-blue/5' 
            : 'border-white/10'
        )}
      >
        <AnimatePresence>
          {agentObjectives.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-48 text-center"
            >
              <div className="p-4 rounded-full bg-white/5 mb-3">
                <Zap className="h-6 w-6 text-white/20" />
              </div>
              <p className="text-sm text-white/40">No objectives assigned</p>
              <p className="text-xs text-white/30 mt-1">Drag tasks here to delegate</p>
            </motion.div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {agentObjectives.map(objective => (
                <ObjectiveCard
                  key={objective.id}
                  objective={objective}
                  onRedelegate={(obj) => useObjectiveStore.getState().delegateObjective(obj.id, obj.assignedTo || 'unassigned', '')}
                  onViewWork={(id) => useObjectiveStore.getState().setActiveObjective(id)}
                  onSendReminder={async (id) => {
                    // Simulated reminder
                    console.log('Send reminder for', id, 'to', agentId)
                  }}
                />
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}