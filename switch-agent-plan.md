# 🚀 MULTI-AGENT SYSTEM - VERSION SIMPLIFIÉE

## 🎯 Objectif Simple
UI où tu **clic-glisse** les tâches entre agents, chacun utilise ses propres skills.

---

## 🏗️ Architecture Minimale

```
┌─────────────────────────────────────────────┐
│  AGENT BOARD (vue principale)              │
├─────────────────────────────────────────────┤
│                                             │
│  ┌────────┐  ┌────────┐  ┌────────┐      │
│  │ Hermes │  │ Claude │  │ Custom │      │
│  │ Agent  │  │ Code   │  │ Agent  │      │
│  └────────┘  └────────┘  └────────┘      │
│                                             │
│  ┌─────────────────────────────────────────┐│
│  │  OBJECTIFS UNIVERSels (texte simple)     ││
│  │  ┌────────────┐ ┌────────────┐        ││
│  │  │📋 Optimiser  │ │📋 Refactor  │        ││
│  │  │   le code   │ │   le code   │        ││
│  │  └────────────┘ └────────────┘        ││
│  └─────────────────────────────────────────┘│
│                                             │
└─────────────────────────────────────────────┘
```

---

## 💡 Principe Simple

1. **Tâche = texte** (pas de skills complexe)  
2. **Tu définis l'objectif** dans le tableau
3. **Tu assigns** à un agent (clic)
4. **L'agent exécute** avec ses propres skills
5. **Tu vois le résultat** dans le board

---

## 🧩 Composants Essentiels

### 1. ObjectiveBoard.tsx
```tsx
// src/components/ObjectiveBoard/ObjectiveBoard.tsx
// Tableau kanban simple - glisser/déposer entre agents

<ObjectiveBoard>
  {agents.map(agent => (
    <AgentColumn 
      key={agent.id}
      agent={agent}
      objectives={objectives.filter(o => o.assignedTo === agent.id)}
      onDropObjective={handleAssign}  // Drop = assigner
    />
  ))}
</ObjectiveBoard>
```

### 2. AgentColumn.tsx  
```tsx
// src/components/ObjectiveBoard/AgentColumn.tsx
// Colonne par agent avec status live

<AgentColumn agent={agent}>
  <AgentHeader>
    <AgentStatusBadge status={agent.status} />
    <AgentModel model={agent.model} />
  </AgentHeader>
  
  <ObjectiveList objectives={objectives} />
  
  <DropZone 
    onDrop={(objective) => assignObjective(objective, agent.id)}
    label="Assign to this agent" 
  />
</AgentColumn>
```

### 3. ObjectiveCard.tsx
```tsx
// src/components/ObjectiveBoard/ObjectiveCard.tsx
// Carte tâche draggable

<ObjectiveCard objective={objective}>
  <DraggerHandle />  // Drag handle
  <ObjectiveText>{objective.content}</ObjectiveText>
  <StatusBadge>{objective.status}</StatusBadge>
  <AssignedTo>{objective.assignedTo}</AssignedTo>
  
  <ResultPreview>
    {objective.result && (
      <pre>{objective.result.slice(0, 100)}...</pre>
    )}
  </ResultPreview>
</ObjectiveCard>
```

---

## 🔌 Communication Agent ↔ Agent

### Simple REST API (pas de sync skills)
```typescript
// POST /api/agents/{agentId}/objective
{
  "objective": "Refactor this authentication code",
  "context": {
    "files": ["src/auth.ts"],
    "memory": "{shared context here}"
  }
}

// Response:
{
  "taskId": "uuid",
  "status": "accepted",
  "agent": "hermes"
}
```

### WebSocket pour suivi
```typescript
// ws://server/ws/objectives
{
  "event": "objective.status.changed",
  "taskId": "uuid",
  "status": "completed",
  "result": "..."  // Résumé du résultat
}
```

---

## 🛠️ Store Zustand Minimal

```typescript
// src/lib/stores/useObjectiveStore.ts

interface Objective {
  id: string
  content: string        // Texte simple
  assignedTo: string     // agent id
  status: 'pending' | 'running' | 'completed' | 'failed'
  priority: 'low' | 'medium' | 'high'
  createdAt: number
  result?: string
}

export const useObjectiveStore = create<ObjectiveState>()(
  persist(
    (set, get) => ({
      objectives: [],
      agents: [],
      
      addObjective: (content) => {
        set((state) => ({
          objectives: [...state.objectives, {
            id: uuid(),
            content,
            assignedTo: '',
            status: 'pending',
            priority: 'medium',
            createdAt: Date.now()
          }]
        }))
      },
      
      assignObjective: (objectiveId, agentId) => {
        // Envoie l'objectif à l'agent
        sendToAgent(agentId, objectiveId)
      }
    }),
    { name: 'objectives-v1' }
  )
)
```

---

## 🎨 UI Détail

### Hover Actions
```tsx
// Quand tu passes la souris sur une tâche assignée
<ObjectiveHoverActions>
  <button onClick={delegateToOtherAgent}>
    🔄 Déléguer autrement
  </button>
  <button onClick={viewAgentWork}>
    👁️ Voir ce que fait l'agent
  </button>
  <button onClick={sendReminder}>
    🔔 Rappel à l'agent
  </button>
</ObjectiveHoverActions>
```

### Agent Work View
```tsx
// Modal/drawer quand on clique "Voir le travail"
<AgentWorkDrawer agentId={agent.id}>
  <AgentTerminal output={agent.lastOutput} />
  <AgentFiles files={agent.filesUsed} />
  <AgentMessages messages={agent.messages} />
  <button>Assignee moi cette tâche</button>
</AgentWorkDrawer>
```

---

## 🚀 Quick Start

```bash
# 1. Créer les fichiers
mkdir -p src/{components,stores,services}/objective-board

# 2. Installer deps
npm install zustand @dnd-kit/core

# 3. Lancer
npm run dev
```

---

## ⚡ Points Clés

- ✅ Objectifs = texte (100% compatible)
- ❌ Pas de sync skills (chacun reste local)  
- ✅ Délegation visuelle glisser/déposer
- ✅ Suivi temps réel via WS
- ✅ Pas de frais (les serveurs externes paient)
- ✅ Infrastructure simple (REST + WS)

---

## 📋 Exemple d'utilisation

1. **Input** : "Optimise mon code React pour performance"
2. **Drag** : Dépose sur agent Claude Code
3. **Claude** : Analyse et propose des améliorations
4. **Tu vois** : Les résultats dans la carte
5. **Re-drag** : Sur Custom Agent pour tests
6. **Custom** : Exécute avec ses propres skills

---

Plan simplifié - `/root/switch-agent-plan.md`