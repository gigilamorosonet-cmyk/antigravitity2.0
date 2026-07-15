import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Agent {
  id: number
  name: string
  kind: 'agent' | 'model'
  provider: string
  model: string
  color: string
  icon: string
  system_prompt: string
  skills: number[]
  has_key: boolean
  compatibility: { universal: number; warnings: string[]; incompatibleFeatures: string[] }
}

interface AppState {
  token: string | null
  email: string | null
  onboarded: boolean
  agents: Agent[]
  activeAgentId: number | null
  setAuth: (token: string, email: string, onboarded: boolean) => void
  logout: () => void
  setAgents: (agents: Agent[]) => void
  setActiveAgent: (id: number) => void
  setOnboarded: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      token: null,
      email: null,
      onboarded: false,
      agents: [],
      activeAgentId: null,
      setAuth: (token, email, onboarded) => {
        localStorage.setItem('an_token', token)
        set({ token, email, onboarded })
      },
      logout: () => {
        localStorage.removeItem('an_token')
        set({ token: null, email: null, agents: [], activeAgentId: null, onboarded: false })
      },
      setAgents: (agents) =>
        set((s) => ({
          agents,
          activeAgentId: s.activeAgentId ?? (agents[0]?.id ?? null),
        })),
      setActiveAgent: (id) => set({ activeAgentId: id }),
      setOnboarded: () => set({ onboarded: true }),
    }),
    { name: 'antigravity-app', version: 1 }
  )
)
