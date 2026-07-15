import React, { useState } from 'react'
import { DndContext, DragEndEvent, DragStartEvent, DragOverEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Plus, 
  LayoutGrid,
  Columns,
  ArrowLeftRight
} from 'lucide-react'
import clsx from 'clsx'
import { useObjectiveStore, Objective } from '@/lib/stores/useObjectiveStore'
import { useAgentStore } from '@/lib/stores/useAgentStore'
import { AgentColumn } from './AgentColumn'
import { ObjectiveCard } from './ObjectiveCard'

export const ObjectiveBoard: React.FC = () => {
  const { objectives, addObjective, assignObjective, delegateObjective, activeObjectiveId } = useObjectiveStore()
  const { agents } = useAgentStore()
  const [viewMode, setViewMode] = useState<'grid' | 'columns'>('columns')
  const [searchQuery, setSearchQuery] = useState('')
  const [newObjective, setNewObjective] = useState('')
  const [draggedObjective, setDraggedObjective] = useState<Objective | null>(null)
  const [activeDropAgent, setActiveDropAgent] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  )

  const pendingObjectives = objectives.filter(obj => obj.status === 'pending')
  const unassignedObjectives = objectives.filter(obj => !obj.assignedTo)

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const objective = objectives.find(o => o.id === active.id)
    setDraggedObjective(objective || null)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event
    if (over) {
      const agentId = over.id.toString().replace('agent-', '')
      setActiveDropAgent(agentId)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    
    if (over) {
      const objectiveId = active.id as string
      const targetAgentId = over.id.toString().replace('agent-', '')
      
      const objective = objectives.find(o => o.id === objectiveId)
      
      if (objective) {
        if (objective.assignedTo !== targetAgentId) {
          delegateObjective(objectiveId, objective.assignedTo || 'unassigned', targetAgentId)
        }
      }
    }
    
    setDraggedObjective(null)
    setActiveDropAgent(null)
  }

  const handleAddObjective = () => {
    if (newObjective.trim()) {
      addObjective(newObjective, 'New task from board')
      setNewObjective('')
    }
  }

  const getPriorityCount = (priority: Objective['priority']) => {
    return objectives.filter(o => o.priority === priority).length
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="glass rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">
                Objective Board
              </h2>
              <p className="text-sm text-white/50">
                Drag tasks between agents to delegate
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 glass-dark rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={clsx(
                    'p-2 rounded-lg transition-all',
                    viewMode === 'grid' ? 'bg-neon-blue/20 text-neon-blue' : 'text-white/40 hover:text-white'
                  )}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('columns')}
                  className={clsx(
                    'p-2 rounded-lg transition-all',
                    viewMode === 'columns' ? 'bg-neon-blue/20 text-neon-blue' : 'text-white/40 hover:text-white'
                  )}
                >
                  <Columns className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Add */}
          <div className="flex gap-2 mb-4">
            <div className="flex-1 relative">
              <input
                type="text"
                value={newObjective}
                onChange={(e) => setNewObjective(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddObjective()}
                placeholder="Add new objective..."
                className="w-full glass-dark rounded-lg px-4 py-2 pl-10 text-sm text-white placeholder-white/40 border border-white/10 focus:border-neon-blue/50 outline-none"
              />
              <Plus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            </div>
            <button
              onClick={handleAddObjective}
              disabled={!newObjective.trim()}
              className="px-4 py-2 rounded-lg bg-neon-blue/20 text-neon-blue font-medium text-sm hover:bg-neon-blue/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>

          {/* Priority Filters */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/60">Priority:</span>
            <div className="flex items-center gap-2">
              {(['urgent', 'high', 'medium', 'low'] as const).map(priority => (
                <div
                  key={priority}
                  className={clsx(
                    'px-2.5 py-1 rounded-full text-xs font-medium',
                    priority === 'urgent' && 'bg-red-500/20 text-red-400',
                    priority === 'high' && 'bg-orange-500/20 text-orange-400',
                    priority === 'medium' && 'bg-neon-blue/20 text-neon-blue',
                    priority === 'low' && 'bg-white/10 text-white/60'
                  )}
                >
                  {priority} ({getPriorityCount(priority)})
                </div>
              ))}
            </div>

            {draggedObjective && (
              <div className="flex items-center gap-2 ml-auto text-sm">
                <ArrowLeftRight className="h-4 w-4 text-neon-blue animate-pulse" />
                <span className="text-white/60">Dragging:</span>
                <span className="text-neon-blue font-medium line-clamp-1 max-w-[200px]">
                  {draggedObjective.content}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Board Content */}
        {viewMode === 'columns' ? (
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 min-h-0">
            {agents.map(agent => (
              <AgentColumn
                key={agent.id}
                agentId={agent.id}
                isDropTarget={activeDropAgent === agent.id}
              />
            ))}
          </div>
        ) : (
          <div className="flex-1 glass rounded-xl p-4 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {objectives.map(objective => (
                <ObjectiveCard
                  key={objective.id}
                  objective={objective}
                  onRedelegate={delegateObjective}
                  onViewWork={(id) => useObjectiveStore.getState().setActiveObjective(id)}
                  onSendReminder={(id) => console.log('Reminder for', id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Unassigned Tasks Bar */}
        {viewMode === 'columns' && unassignedObjectives.length > 0 && (
          <div className="mt-4 glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-neon-blue animate-pulse" />
              <span className="text-sm font-medium text-white">
                Unassigned ({unassignedObjectives.length})
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {unassignedObjectives.slice(0, 3).map(obj => (
                <div
                  key={obj.id}
                  className="px-3 py-1.5 rounded-lg bg-white/5 text-xs text-white/80 hover:bg-neon-blue/10 hover:text-neon-blue transition-all cursor-pointer"
                >
                  {obj.content}
                </div>
              ))}
              {unassignedObjectives.length > 3 && (
                <span className="px-3 py-1.5 rounded-lg bg-white/5 text-xs text-white/60">
                  +{unassignedObjectives.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </DndContext>
  )
}