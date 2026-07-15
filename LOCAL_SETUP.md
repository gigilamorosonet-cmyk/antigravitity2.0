# 🚀 ANTI-GRAVITY - VERSION LOCAL

## 📂 Installation rapide

```bash
# 1. Cloner le repo
git clone git@github.com:gigilamorosonet-cmyk/antigravity-.git
cd antigravity-

# 2. Installer deps (avec --legacy-peer-deps si besoin)
npm install --legacy-peer-deps

# 3. Lancer
npm run dev        # Frontend : http://localhost:5173
npm run server:dev # Backend : http://localhost:8001
```

## ⚡ Démarrage express (sans npm)

Si tu veux juste **voir le code** :

```bash
# Téléchargement direct
curl -L https://github.com/gigilamorosonet-cmyk/antigravity-/archive/refs/heads/main.zip -o antigravity.zip
unzip antigravity.zip
```

## 🔧 Dépendances minimales

Si problème avec framer-motion:
```bash
# Version allégée sans animations lourdes
npm install react@18 react-dom@18 zustand lucide-react @dnd-kit/core
# framer-motion optionnel - les composants marcheront sans
```

## 📋 Architecture rapide

```
src/
├── components/
│   ├── AgentManager/     ← Switcher + Config
│   └── ObjectiveBoard/   ← Tableau tâches
└── lib/stores/
    ├── useAgentStore.ts  ← Agents state
    ├── useObjectiveStore.ts ← Tâches state  
    └── useSkillRegistry.ts  ← Skills
```

## 🎯 Entry points

- `src/main.tsx` - Point d'entrée
- `server.py` - API FastAPI backend

---

Tu veux que je **teste le npm install** ici et je te dis exactement quoi faire ?