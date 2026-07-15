import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Agent {
  id: string
  name: string
  description: string
  status: 'connected' | 'disconnected' | 'requires_config'
  model?: string
  serverUrl?: string
  icon?: string
  compatibility: {
    universal: number
    warnings: string[]
    incompatibleFeatures: string[]
  }
}

interface AgentState {
  agents: Agent[]
  activeAgent: string
  addAgent: (agent: Agent) => void
  removeAgent: (agentId: string) => void
  setActiveAgent: (agentId: string) => void
  updateAgentStatus: (agentId: string, status: Agent['status']) => void
  configureAgent: (agentId: string, config: Partial<Agent>) => void
}

const defaultAgents: Agent[] = [
  {
    id: 'hermes',
    name: 'Hermes Agent',
    description: 'Nous Research autonomous agent with skills system',
    status: 'connected',
    model: 'poolside/laguna-m.1:free',
    icon: '🦀',
    compatibility: {
      universal: 60,
      warnings: [
        'MCP tools are agent-specific',
        'Some skills require local context',
        'File system tools limited'
      ],
      incompatibleFeatures: ['MCP tools', 'Shell hooks', 'Native skills']
    }
  },
  {
    id: 'openclaw',
    name: 'OpenClaw',
    description: 'Legacy Nous Research agent',
    status: 'requires_config',
    compatibility: {
      universal: 40,
      warnings: [
        'Workflows are proprietary',
        'Skills format incompatible',
        'No skill registry API'
      ],
      incompatibleFeatures: ['Workflows', 'Skills', 'Tool definitions']
    }
  },
  {
    id: 'custom-1',
    name: 'Custom Agent',
    description: 'User-defined agent with custom LLM endpoint',
    status: 'disconnected',
    compatibility: {
      universal: 30,
      warnings: [
        'Format unknown',
        'Skills must be recreated',
        'No automatic sync'
      ],
      incompatibleFeatures: ['Unknown format', 'Custom tools', 'Skills']
    }
  }
]

export const useAgentStore = create<AgentState>()(
  persist(
    (set, get) => ({
      agents: defaultAgents,
      activeAgent: 'hermes',
      
      addAgent: (agent) => {
        set((state) => ({
          agents: [...state.agents, agent],
          activeAgent: agent.id
        }))
      },
      
      removeAgent: (agentId) => {
        set((state) => ({
          agents: state.agents.filter(a => a.id !== agentId),
          activeAgent: state.activeAgent === agentId 
            ? state.agents[0]?.id || '' 
            : state.activeAgent
        }))
      },
      
      setActiveAgent: (agentId) => {
        set({ activeAgent: agentId })
      },
      
      updateAgentStatus: (agentId, status) => {
        set((state) => ({
          agents: state.agents.map(agent =>
            agent.id === agentId ? { ...agent, status } : agent
          )
        }))
      },
      
      configureAgent: (agentId, config) => {
        set((state) => ({
          agents: state.agents.map(agent =>
            agent.id === agentId ? { ...agent, ...config } : agent
          )
        }))
      }
    }),
    {
      name: 'multi-agent-storage',
      version: 1
    }
  )
)