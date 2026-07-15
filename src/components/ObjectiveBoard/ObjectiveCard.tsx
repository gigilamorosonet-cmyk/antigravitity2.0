import React, { useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  Eye,
  Bell,
  Zap
} from 'lucide-react'
import clsx from 'clsx'
import { Objective } from '@/lib/stores/useObjectiveStore'

interface ObjectiveCardProps {
  objective: Objective
  onRedelegate?: (objective: Objective) => void
  onViewWork?: (objectiveId: string) => void
  onSendReminder?: (objectiveId: string) => void
  isDragging?: boolean
}

export const ObjectiveCard: React.FC<ObjectiveCardProps> = ({
  objective,
  onRedelegate,
  onViewWork,
  onSendReminder,
  isDragging = false
}) => {
  const [showActions, setShowActions] = useState(false)
  
  const { attributes, listeners, setNodeRef, transform, isDragging: dragActive } = useDraggable({
    id: objective.id,
    data: { objective }
  })

  const style = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    opacity: isDragging || dragActive ? 0.5 : 1,
  }

  const getStatusIcon = () => {
    switch (objective.status) {
      case 'pending':
        return <Clock className="h-3 w-3" />
      case 'in-progress':
        return <RefreshCw className="h-3 w-3 animate-spin" />
      case 'completed':
        return <CheckCircle2 className="h-3 w-3" />
      case 'failed':
        return <AlertCircle className="h-3 w-3" />
      case 'delegated':
        return <Zap className="h-3 w-3" />
      default:
        return <Clock className="h-3 w-3" />
    }
  }

  const getStatusColor = () => {
    switch (objective.status) {
      case 'pending':
        return 'text-neon-blue'
      case 'in-progress':
        return 'text-neon-purple'
      case 'completed':
        return 'text-green-400'
      case 'failed':
        return 'text-red-400'
      case 'delegated':
        return 'text-yellow-400'
      default:
        return 'text-white/60'
    }
  }

  const getPriorityGlow = () => {
    switch (objective.priority) {
      case 'urgent':
        return 'shadow-[0_0_20px_rgba(255,0,100,0.5)]'
      case 'high':
        return 'shadow-[0_0_15px_rgba(255,100,0,0.4)]'
      case 'medium':
        return 'shadow-[0_0_10px_rgba(0,243,255,0.3)]'
      default:
        return ''
    }
  }

  const getTimeSince = () => {
    const diff = Date.now() - objective.updatedAt
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    
    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    return `${minutes}m ago`
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      className={clsx(
        'glass-dark rounded-xl p-4 cursor-grab active:cursor-grabbing',
        'border border-white/5 hover:border-neon-blue/30 transition-all',
        'relative overflow-hidden group',
        getPriorityGlow(),
        (isDragging || dragActive) && 'ring-2 ring-neon-blue'
      )}
    >
      {/* Priority indicator bar */}
      <div className={clsx(
        'absolute top-0 left-0 w-full h-0.5',
        objective.priority === 'urgent' && 'bg-red-400',
        objective.priority === 'high' && 'bg-orange-400',
        objective.priority === 'medium' && 'bg-neon-blue',
        objective.priority === 'low' && 'bg-white/20'
      )} />

      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-medium text-sm text-white line-clamp-2 flex-1">
          {objective.content}
        </h4>
        
        <div className={clsx(
          'flex items-center gap-1 px-2 py-1 rounded-full text-xs',
          objective.status === 'pending' && 'bg-neon-blue/10',
          objective.status === 'in-progress' && 'bg-neon-purple/10',
          objective.status === 'completed' && 'bg-green-400/10',
          objective.status === 'failed' && 'bg-red-400/10',
          objective.status === 'delegated' && 'bg-yellow-400/10'
        )}>
          <span className={getStatusColor()}>
            {getStatusIcon()}
          </span>
          <span className={clsx('capitalize', getStatusColor())}>
            {objective.status.replace('-', ' ')}
          </span>
        </div>
      </div>

      {objective.description && (
        <p className="text-xs text-white/50 mb-3 line-clamp-2">
          {objective.description}
        </p>
      )}

      <div className="flex items-center justify-between text-xs">
        <span className="text-white/40">
          {getTimeSince()}
        </span>
        
        {objective.delegatedFrom && objective.delegatedFrom.length > 0 && (
          <span className="text-neon-purple/60 flex items-center gap-1">
            <Zap className="h-3 w-3" />
            {objective.delegatedFrom.length} hop{objective.delegatedFrom.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Hover Actions */}
      <div className={clsx(
        'absolute inset-x-4 bottom-4 glass-dark rounded-lg p-2',
        'border border-white/10 flex items-center justify-between',
        'transition-opacity',
        showActions ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      )}>
        <div className="flex items-center gap-1">
          {onRedelegate && (
            <button
              onClick={() => onRedelegate?.(objective)}
              className="p-1.5 rounded-lg bg-neon-blue/10 text-neon-blue hover:bg-neon-blue/20 transition-colors"
              title="Re-delegate"
            >
              <RefreshCw className="h-3 w-3" />
            </button>
          )}
          
          {onViewWork && (
            <button
              onClick={() => onViewWork(objective.id)}
              className="p-1.5 rounded-lg bg-neon-purple/10 text-neon-purple hover:bg-neon-purple/20 transition-colors"
              title="View agent work"
            >
              <Eye className="h-3 w-3" />
            </button>
          )}
          
          {onSendReminder && (
            <button
              onClick={() => onSendReminder(objective.id)}
              className="p-1.5 rounded-lg bg-yellow-400/10 text-yellow-400 hover:bg-yellow-400/20 transition-colors"
              title="Send reminder"
            >
              <Bell className="h-3 w-3" />
            </button>
          )}
        </div>

        <div className="text-xs text-white/40 capitalize">
          {objective.priority} priority
        </div>
      </div>
    </div>
  )
}