import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Server, Key, Cpu, Shield, AlertCircle } from 'lucide-react'
import { useAgentStore } from '../../lib/stores/useAgentStore'

interface ServerConfigFormProps {
  agentId: string
  onClose: () => void
}

export const ServerConfigForm: React.FC<ServerConfigFormProps> = ({ agentId, onClose }) => {
  const { updateAgentStatus, configureAgent } = useAgentStore()
  const [config, setConfig] = useState({
    serverUrl: '',
    apiKey: '',
    model: '',
    validateSSL: true
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showWarning, setShowWarning] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // In production, this would be encrypted server-side
      await fetch('/api/agents/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          agentId // Pass agent ID explicitly
        })
      })

      configureAgent(agentId, {
        serverUrl: config.serverUrl,
        model: config.model
      })
      
      updateAgentStatus(agentId, 'connected')
      onClose()
    } catch (error) {
      setShowWarning(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="glass w-full max-w-md rounded-xl p-6 border border-neon-blue/20"
      >
        <div className="flex items-center gap-3 mb-6">
          <Server className="h-6 w-6 text-neon-blue" />
          <h2 className="text-xl font-display">Configure Agent</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-white/70 mb-2">
              Server URL
            </label>
            <input
              type="url"
              required
              value={config.serverUrl}
              onChange={(e) => setConfig({ ...config, serverUrl: e.target.value })}
              placeholder="https://api.example.com/v1"
              className="w-full glass px-3 py-2 rounded-lg border border-white/20 focus:border-neon-blue/50 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-white/70 mb-2">
              API Key
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <input
                type="password"
                required
                value={config.apiKey}
                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                placeholder="sk-... (stored encrypted)"
                className="w-full glass pl-10 pr-3 py-2 rounded-lg border border-white/20 focus:border-neon-blue/50 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-white/70 mb-2">
              Model
            </label>
            <div className="relative">
              <Cpu className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <input
                type="text"
                required
                value={config.model}
                onChange={(e) => setConfig({ ...config, model: e.target.value })}
                placeholder="gpt-4.1-mini"
                className="w-full glass pl-10 pr-3 py-2 rounded-lg border border-white/20 focus:border-neon-blue/50 outline-none"
              />
            </div>
          </div>

          <AnimatePresence>
            {showWarning && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20"
              >
                <AlertCircle className="h-4 w-4 text-yellow-400 mt-0.5" />
                <p className="text-sm text-yellow-400">
                  Configuration failed. Check URL format and API key.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 glass px-4 py-2 rounded-lg border border-white/20 hover:border-white/30"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-neon-blue text-black font-medium px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              {isSubmitting ? 'Configuring...' : 'Configure'}
            </button>
          </div>
        </form>
        
        <p className="text-xs text-white/40 mt-4">
          API keys are encrypted server-side and never exposed to the frontend
        </p>
      </motion.div>
    </div>
  )
}