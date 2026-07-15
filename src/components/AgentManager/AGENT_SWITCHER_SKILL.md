---
name: multi-agent-switcher
description: "Agent switcher component with compatibility warnings and secure server config"
tags: [agent, switcher, multi-agent, universal]
---

# Multi-Agent Switcher Component

## Usage

```tsx
import { AgentSwitcher } from '@/components/AgentManager/AgentSwitcher'
import { useAgentStore } from '@/lib/stores/useAgentStore'

function Header() {
  const { agents, activeAgent, setActiveAgent } = useAgentStore()
  
  return (
    <AgentSwitcher 
      agents={agents}
      activeAgent={activeAgent}
      onAgentChange={setActiveAgent}
    />
  )
}
```

## Compatibility Legend

| Icon | Meaning | Sync Status |
|------|---------|-------------|
| ✅ | Universal | Fully syncable |
| ⚠️ | Partial | Partially syncable |
| ❌ | Agent-specific | Not syncable |