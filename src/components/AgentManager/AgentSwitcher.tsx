import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Check, AlertCircle, Shield, Cpu, Globe } from 'lucide-react'
import clsx from 'clsx'

interface Agent {
  id: string
  name: string
  description: string
  status: 'connected' | 'disconnected' | 'requires_config'
  model?: string
  icon?: string
  compatibility: {
    universal: number  // % compatible
    warnings: string[]
    incompatibleFeatures: string[]
  }
}

interface AgentSwitcherProps {
  agents: Agent[]
  activeAgent: string
  onAgentChange: (agentId: string) => void
  onConfigure?: (agentId: string) => void
}

export const AgentSwitcher: React.FC<AgentSwitcherProps> = ({
  agents,
  activeAgent,
  onAgentChange,
  onConfigure
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null)

  const currentAgent = agents.find(a => a.id === activeAgent)

  const getAgentIcon = (agent: Agent) => {
    if (agent.icon) return <span className="text-lg">{agent.icon}</span>
    
    switch (agent.id) {
      case 'hermes':
        return <Shield className="h-4 w-4 text-orange-400" />
      case 'openclaw':
        return <Cpu className="h-4 w-4 text-blue-400" />
      default:
        return <Globe className="h-4 w-4 text-green-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-500'
      case 'requires_config':
        return 'bg-yellow-500'
      default:
        return 'bg-red-500'
    }
  }

  const getCompatibilityBadge = (agent: Agent) => {
    const { universal, warnings } = agent.compatibility
    
    if (universal === 100) {
      return (
        <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
          ✅ Universal
        </span>
      )
    }
    
    if (universal >= 50) {
      return (
        <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">
          ⚠️ {universal}% compatible
        </span>
      )
    }
    
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
        ❌ {universal}% compatible
      </span>
    )
  }

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(!isOpen)}
        className="glass flex items-center gap-3 px-4 py-2 rounded-xl border border-white/10 hover:border-white/20 transition-all"
      >
        <div className="flex items-center gap-2">
          {currentAgent && getAgentIcon(currentAgent)}
          <span className="font-medium text-sm">
            {currentAgent?.name || 'Select Agent'}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {currentAgent && (
            <>
              <div className={clsx('w-2 h-2 rounded-full', getStatusColor(currentAgent.status))} />
              {getCompatibilityBadge(currentAgent)}
            </>
          )}
          <ChevronDown className={clsx('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
        </div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full mt-2 w-80 glass rounded-xl border border-white/10 p-2 z-50"
          >
            <div className="space-y-1">
              {agents.map(agent => (
                <div
                  key={agent.id}
                  className="relative"
                  onMouseEnter={() => setHoveredAgent(agent.id)}
                  onMouseLeave={() => setHoveredAgent(null)}
                >
                  <button
                    onClick={() => {
                      onAgentChange(agent.id)
                      setIsOpen(false)
                    }}
                    disabled={agent.status === 'disconnected'}
                    className={clsx(
                      'w-full flex items-start gap-3 p-3 rounded-lg transition-all',
                      agent.id === activeAgent 
                        ? 'bg-white/10' 
                        : agent.status === 'disconnected'
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:bg-white/5'
                    )}
                  >
                    <div className="mt-0.5">
                      {getAgentIcon(agent)}
                    </div>
                    
                    <div className="flex-1 text-left">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{agent.name}</span>
                        {agent.id === activeAgent && (
                          <Check className="h-4 w-4 text-green-400" />
                        )}
                      </div>
                      
                      <p className="text-xs text-white/60 mt-0.5 line-clamp-2">
                        {agent.description}
                      </p>
                      
                      {agent.model && (
                        <p className="text-xs text-white/40 mt-1">
                          Model: {agent.model}
                        </p>
                      )}
                      
                      <div className="mt-2">
                        {getCompatibilityBadge(agent)}
                      </div>
                    </div>
                  </button>

                  {/* Tooltip for compatibility warnings */}
                  <AnimatePresence>
                    {hoveredAgent === agent.id && agent.compatibility.warnings.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute left-full ml-2 top-0 w-64 glass rounded-lg p-3 border border-yellow-500/20 z-50"
                      >
                        <div className="flex items-start gap-2 mb-2">
                          <AlertCircle className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                          <span className="text-sm font-medium text-yellow-400">
                            Limited Compatibility
                          </span>
                        </div>
                        
                        <ul className="text-xs text-white/70 space-y-1">
                          {agent.compatibility.warnings.map((warning, i) => (
                            <li key={i} className="flex items-center gap-1">
                              <span className="text-red-400">•</span>
                              {warning}
                            </li>
                          ))}
                        </ul>
                        
                        {agent.compatibility.incompatibleFeatures.length > 0 && (
                          <>
                            <div className="border-t border-white/10 mt-2 pt-2">
                              <span className="text-xs text-white/50">
                                Incompatible: {agent.compatibility.incompatibleFeatures.join(', ')}
                              </span>
                            </div>
                          </>
                        )}
                        
                        {agent.status === 'requires_config' && onConfigure && (
                          <button
                            onClick={() => {
                              onConfigure(agent.id)
                              setIsOpen(false)
                            }}
                            className="mt-3 w-full px-3 py-1.5 text-xs bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition-colors"
                          >
                            Configure Server
                          </button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}