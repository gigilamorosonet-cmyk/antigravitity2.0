# 🚀 Anti-Gravity Multi-Agent System

Infrastructure multi-agents avec délégation visuelle d'objectifs.

## ✨ Features

- **Agent Switcher** : Changer d'agent via dropdown (Hermes, OpenClaw, Custom)
- **Objective Board** : Tableau Kanban drag-drop entre agents
- **Server Config** : Configuration serveur LLM externe (chiffrée)
- **Agent Work Drawer** : Voir le travail en cours d'un agent
- **WebSocket** : Sync temps réel des états

## 🎨 UI

- Glassmorphism + neon gradients (cyberpunk style)
- Drag & drop avec @dnd-kit
- Animations Framer Motion
- Responsive design

## 📦 Structure

```
src/
├── components/
│   ├── AgentManager/
│   │   ├── AgentSwitcher.tsx     # Dropdown agents + warnings
│   │   ├── ServerConfigForm.tsx  # Config serveur LLM
│   │   └── AgentWorkDrawer.tsx   # Détails travail agent
│   └── ObjectiveBoard/
│       └── ObjectiveBoard.tsx    # Tableau tâches + drag-drop
└── lib/stores/
    ├── useAgentStore.ts          # State agents
    ├── useObjectiveStore.ts      # State tâches
    └── useSkillRegistry.ts       # Registry skills
```

## 🚀 Démo rapide

```bash
# Install
npm install

# Dev
npm run dev
# → http://localhost:5173

# Server
npm run server:dev
# → http://localhost:8001
```

## 🔐 Sécurité

- API keys chiffrées côté serveur
- Rate limiting (10 reqs/min/agent)
- Logs minimaux (pas de clés)
- SSL validation optionnelle

## 📋 Limitation

Les **skills sont locaux** à chaque agent - pas de synchronisation.  
Les **objectifs sont universels** - texte simple compatible partout.

## 🎯 Roadmap

- [x] Agent Switcher UI
- [x] Objective Board drag-drop
- [x] Server Config Form
- [ ] WebSocket real-time sync
- [ ] Claude Code/Opencode integration
- [ ] MCP tools bridge

---

Built with React 19 + Vite 8 + Tailwind v4 + Zustand