import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Universal skill format that works for all agents
interface UniversalSkill {
  id: string
  name: string
  description: string
  category: string
  content: string  // Text-only content - universally compatible
  capabilities: string[]
  
  // Agent-specific versions (not converted, just stored)
  agentVersions: Record<string, {
    format: 'native' | 'converted' | 'manual'
    content: string
    lastSync: number
    syncStatus: 'synced' | 'pending' | 'failed'
  }>
  
  // Metadata
  createdAt: number
  updatedAt: number
  createdBy: string
}

interface SkillCompatibility {
  compatible: boolean
  warnings: string[]
  impossible: string[]
}

interface SkillRegistryState {
  skills: UniversalSkill[]
  getSkillReferences: (skillId: string) => UniversalSkill['agentVersions']
  getCompatibleSkills: (agentId: string) => UniversalSkill[]
  addSkill: (skill: Partial<UniversalSkill>) => void
  updateSkillContent: (skillId: string, content: string) => void
  analyzeCompatibility: (skill: UniversalSkill, targetAgent: string) => SkillCompatibility
}

export const useSkillRegistry = create<SkillRegistryState>()(
  persist(
    (set, get) => ({
      skills: [
        {
          id: 'revision-brevet',
          name: 'Révision Brevet',
          description: 'Assistant pour la révision du brevet des collèges',
          category: 'education',
          content: `# Révision Brevet Français
          
Aide à la révision pour le brevet des collèges.
- Matières: Français, Maths, HG, Sciences
- Format: QCM, exercices, corrigés`,
          capabilities: ['text-generation', 'explanation', 'examples'],
          agentVersions: {
            hermes: {
              format: 'native',
              content: '# Skill Hermes native format...',
              lastSync: Date.now(),
              syncStatus: 'synced'
            },
            openclaw: {
              format: 'converted',
              content: '# Converted version - some features lost',
              lastSync: Date.now(),
              syncStatus: 'pending'
            }
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: 'user'
        },
        {
          id: 'analyse-code',
          name: 'Analyse Code',
          description: 'Review and improve code quality',
          category: 'development',
          content: `# Code Analysis Rules
          
1. Check for clean code
2. Identify SOLID violations
3. Suggest improvements
4. Security review`,
          capabilities: ['code-review', 'security', 'optimization'],
          agentVersions: {
            hermes: {
              format: 'native',
              content: 'SKILL.md format for Hermes',
              lastSync: Date.now(),
              syncStatus: 'synced'
            }
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: 'user'
        }
      ],
      
      getSkillReferences: (skillId) => {
        const skill = get().skills.find(s => s.id === skillId)
        return skill?.agentVersions || {}
      },
      
      getCompatibleSkills: (agentId) => {
        return get().skills.filter(skill => 
          skill.agentVersions[agentId] && 
          skill.agentVersions[agentId].syncStatus !== 'failed'
        )
      },
      
      addSkill: (skill) => {
        const newSkill: UniversalSkill = {
          id: skill.id || `skill-${Date.now()}`,
          name: skill.name || 'Unnamed Skill',
          description: skill.description || '',
          category: skill.category || 'general',
          content: skill.content || '',
          capabilities: skill.capabilities || [],
          agentVersions: skill.agentVersions || {},
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: skill.createdBy || 'user'
        }
        
        set((state) => ({
          skills: [...state.skills, newSkill]
        }))
      },
      
      updateSkillContent: (skillId, content) => {
        set((state) => ({
          skills: state.skills.map(skill =>
            skill.id === skillId
              ? { ...skill, content, updatedAt: Date.now() }
              : skill
          )
        }))
      },
      
      analyzeCompatibility: (skill, targetAgent) => {
        const warnings: string[] = []
        const impossible: string[] = []
        
        // Check agent versions
        const hasNativeVersion = !!skill.agentVersions[targetAgent]
        if (!hasNativeVersion) {
          warnings.push(`No ${targetAgent} version available`)
        }
        
        const version = skill.agentVersions[targetAgent]
        if (version?.syncStatus === 'failed') {
          impossible.push(`Sync failed for ${targetAgent}`)
        }
        
        // Check capabilities
        const incompatibleCaps = skill.capabilities.filter(cap => {
          const incompatible = ['mcp-tools', 'shell-hooks', 'native-file-system']
          return incompatible.includes(cap)
        })
        
        if (incompatibleCaps.length > 0) {
          impossible.push(`Features not available: ${incompatibleCaps.join(', ')}`)
        }
        
        return {
          compatible: warnings.length === 0 && impossible.length === 0,
          warnings,
          impossible
        }
      }
    }),
    {
      name: 'skill-registry-storage',
      version: 1
    }
  )
)