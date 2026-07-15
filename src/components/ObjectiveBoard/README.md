# ObjectiveBoard Component System

A cyberpunk-styled drag-and-drop objective board for multi-agent task delegation.

## Components

### ObjectiveBoard (main)
Main board component with:
- Column view (agents as columns) and grid view modes
- Drag-and-drop delegation between agents
- Priority filtering (urgent/high/medium/low)
- Quick add objective input
- Unassigned tasks sidebar

### AgentColumn
Displays an agent with:
- Agent status indicator (connected/requires_config/disconnected)
- Workload stats (active/pending/total)
- Live activity indicator when processing tasks
- Drop zone for drag-and-drop delegation

### ObjectiveCard
Draggable task card with:
- Status indicator (pending/in-progress/completed/failed/delegated)
- Priority-based glow effect
- Hover actions: Re-delegate, View Work, Send Reminder
- Delegation hop counter

## Usage

```tsx
import { ObjectiveBoard } from '@/components/ObjectiveBoard'

function App() {
  return <ObjectiveBoard />
}
```

## Dependencies

```bash
npm install @dnd-kit/core framer-motion lucide-react clsx
```

## Styling

Import the CSS module:
```tsx
import '@/components/ObjectiveBoard/objective-board.css'
```

## Store Integration

Uses:
- `useAgentStore` - agent management (from `@/lib/stores/useAgentStore`)
- `useObjectiveStore` - objective/task management (from `@/lib/stores/useObjectiveStore`)

## Drag & Drop Flow

1. User drags ObjectiveCard from any location
2. Drop on agent column triggers delegation
3. Objective reassigned to target agent with `delegated` status
4. Task appears in agent's column after drop