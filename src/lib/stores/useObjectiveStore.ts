import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Objective {
  id: string
  content: string
  description?: string
  assignedTo?: string
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'delegated'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  createdAt: number
  updatedAt: number
  result?: string
  delegatedFrom?: string[]
  logs?: Array<{
    timestamp: number
    event: string
    agent: string
    message?: string
  }>
}

interface ObjectiveState {
  objectives: Objective[]
  activeObjectiveId: string | null
  
  // Actions
  addObjective: (content: string, description?: string) => void
  updateObjective: (id: string, updates: Partial<Objective>) => void
  deleteObjective: (id: string) => void
  assignObjective: (objectiveId: string, agentId: string) => void
  delegateObjective: (objectiveId: string, fromAgentId: string, toAgentId: string) => void
  setActiveObjective: (id: string | null) => void
  
  // Getters
  getObjectivesByAgent: (agentId: string) => Objective[]
  getPendingObjectives: () => Objective[]
  getObjective: (id: string) => Objective | undefined
}

export const useObjectiveStore = create<ObjectiveState>()(
  persist(
    (set, get) => ({
      objectives: [],
      activeObjectiveId: null,
      
      addObjective: (content, description) => {
        const newObjective: Objective = {
          id: `obj-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          content,
          description,
          status: 'pending',
          priority: 'medium',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          logs: [{
            timestamp: Date.now(),
            event: 'created',
            agent: 'user'
          }]
        }
        
        set((state) => ({
          objectives: [...state.objectives, newObjective]
        }))
      },
      
      updateObjective: (id, updates) => {
        set((state) => ({
          objectives: state.objectives.map(obj =>
            obj.id === id
              ? { ...obj, ...updates, updatedAt: Date.now() }
              : obj
          )
        }))
      },
      
      deleteObjective: (id) => {
        set((state) => ({
          objectives: state.objectives.filter(obj => obj.id !== id),
          activeObjectiveId: state.activeObjectiveId === id ? null : state.activeObjectiveId
        }))
      },
      
      assignObjective: (objectiveId, agentId) => {
        set((state) => ({
          objectives: state.objectives.map(obj =>
            obj.id === objectiveId
              ? {
                  ...obj,
                  assignedTo: agentId,
                  status: obj.status === 'pending' ? 'in-progress' : obj.status,
                  logs: [...(obj.logs || []), {
                    timestamp: Date.now(),
                    event: 'assigned',
                    agent: agentId
                  }]
                }
              : obj
          )
        }))
      },
      
      delegateObjective: (objectiveId, fromAgentId, toAgentId) => {
        set((state) => ({
          objectives: state.objectives.map(obj =>
            obj.id === objectiveId
              ? {
                  ...obj,
                  assignedTo: toAgentId,
                  status: 'delegated',
                  delegatedFrom: [...(obj.delegatedFrom || []), fromAgentId],
                  logs: [...(obj.logs || []), {
                    timestamp: Date.now(),
                    event: 'delegated',
                    agent: toAgentId,
                    message: `From: ${fromAgentId}`
                  }]
                }
              : obj
          )
        }))
      },
      
      setActiveObjective: (id) => {
        set({ activeObjectiveId: id })
      },
      
      getObjectivesByAgent: (agentId) => {
        return get().objectives.filter(obj => 
          obj.assignedTo === agentId || 
          (obj.delegatedFrom && obj.delegatedFrom.includes(agentId))
        )
      },
      
      getPendingObjectives: () => {
        return get().objectives.filter(obj => 
          obj.status === 'pending' || obj.status === 'delegated'
        )
      },
      
      getObjective: (id) => {
        return get().objectives.find(obj => obj.id === id)
      }
    }),
    {
      name: 'objective-storage-v1',
      version: 1
    }
  )
)