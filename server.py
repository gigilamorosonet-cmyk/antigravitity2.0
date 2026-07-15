from fastapi import FastAPI, WebSocket, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import json
from pydantic import BaseModel
import os
from pathlib import Path
from datetime import datetime, timezone
from contextlib import contextmanager
import sqlite3

app = FastAPI(title="Anti-Gravity Multi-Agent API (Public Demo)")

# CORS for dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database
DB_PATH = Path(__file__).parent / "agentnexus.db"

@contextmanager
def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()

# Init tables
def init_db():
    with db() as c:
        c.executescript("""
        CREATE TABLE IF NOT EXISTS agents(
            id INTEGER PRIMARY KEY, name TEXT, kind TEXT,
            provider TEXT, model TEXT, color TEXT, icon TEXT,
            system_prompt TEXT, skills TEXT, created_at TEXT);
        CREATE TABLE IF NOT EXISTS memory(
            id INTEGER PRIMARY KEY, agent_id INTEGER,
            scope TEXT, content TEXT, created_at TEXT);
        CREATE TABLE IF NOT EXISTS messages(
            id INTEGER PRIMARY KEY, agent_id INTEGER,
            role TEXT, content TEXT, created_at TEXT);
        """)

init_db()

# WebSocket connections for real-time sync
ws_connections = []

# ============================================================================
# API ENDPOINTS - PUBLIC DEMO MODE (No Auth Required)
# ============================================================================

@app.get("/api/agents")
async def get_agents():
    """Get available agents (public demo)"""
    with db() as c:
        rows = c.execute("SELECT * FROM agents").fetchall()
    if rows:
        return {"agents": [{**dict(r), "skills": json.loads(r["skills"] or "[]")} for r in rows]}
    # Fallback demo agents
    return {
        "agents": [
            {"id": 1, "name": "Hermes Agent", "kind": "agent", "provider": "openrouter", 
             "model": "nousresearch/hermes-4-70b", "color": "#00f3ff", "icon": "zap",
             "system_prompt": "Tu es Hermes, un agent généraliste rapide et direct.", "skills": []},
            {"id": 2, "name": "OpenClaw", "kind": "agent", "provider": "anthropic",
             "model": "claude-sonnet-4", "color": "#ff00ff", "icon": "claw",
             "system_prompt": "Tu es OpenClaw, spécialiste des tâches complexes.", "skills": []},
            {"id": 3, "name": "DeepSeek", "kind": "model", "provider": "deepseek",
             "model": "deepseek-chat", "color": "#8a2be2", "icon": "brain",
             "system_prompt": "Tu es un modèle économique pour les tâches simples.", "skills": []},
            {"id": 4, "name": "Mistral", "kind": "model", "provider": "mistral",
             "model": "mistral-large-latest", "color": "#ffb800", "icon": "wind",
             "system_prompt": "Tu es Mistral, équilibré et efficace.", "skills": []},
        ]
    }

@app.post("/api/chat")
async def chat(data: dict):
    """Chat endpoint - returns demo reply"""
    agent_id = data.get("agent_id", 1)
    message = data.get("message", "")
    
    with db() as c:
        agent = c.execute("SELECT * FROM agents WHERE id=?", (agent_id,)).fetchone()
    
    if not agent:
        agent = {"name": "Hermes Agent", "model": "unknown", "system_prompt": "Tu es un assistant."}
    
    replies = [
        "⚡ [MODE DÉMO] Je suis {name}. Message reçu : « {msg} ». Configure une clé API pour des réponses réelles.",
        "🔮 [SIMULATION] {name} ici. Ta demande serait traitée par {model}.",
    ]
    reply = replies[int(datetime.now().timestamp()) % len(replies)].format(
        name=agent["name"] if isinstance(agent, dict) else agent[2],
        msg=message[:120],
        model=agent.get("model", "unknown") if isinstance(agent, dict) else agent[4]
    )
    
    now = datetime.now(timezone.utc).isoformat()
    with db() as c:
        c.execute("INSERT INTO messages(agent_id,role,content,created_at) VALUES(?,?,?,?)",
                  (agent_id, "user", message, now))
        c.execute("INSERT INTO messages(agent_id,role,content,created_at) VALUES(?,?,?,?)",
                  (agent_id, "assistant", reply, now))
    
    return {"reply": reply, "demo": True, "cost": 0.0}

@app.get("/api/messages/{agent_id}")
async def get_messages(agent_id: int):
    """Get conversation history"""
    with db() as c:
        rows = c.execute(
            "SELECT role, content, created_at FROM messages WHERE agent_id=? ORDER BY id",
            (agent_id,)).fetchall()
    return {"messages": [dict(r) for r in rows]}

@app.get("/api/memory")
async def get_memory():
    """Get shared memory (public demo)"""
    with db() as c:
        rows = c.execute("SELECT * FROM memory ORDER BY id DESC LIMIT 50").fetchall()
    return {"memory": [dict(r) for r in rows]}

@app.post("/api/memory")
async def add_memory(data: dict):
    """Add memory entry"""
    now = datetime.now(timezone.utc).isoformat()
    with db() as c:
        c.execute("INSERT INTO memory(agent_id,scope,content,created_at) VALUES(?,?,?,?)",
                  (data.get("agent_id"), data.get("scope", "global"), data.get("content"), now))
    return {"ok": True}

# workflows table
def init_workflows():
    with db() as c:
        c.execute("CREATE TABLE IF NOT EXISTS workflows(id INTEGER PRIMARY KEY, name TEXT, data TEXT, updated_at TEXT)")

init_workflows()

class WorkflowIn(BaseModel):
    name: str
    data: dict

@app.get("/api/workflows")
async def list_workflows():
    with db() as c:
        rows = c.execute("SELECT id, name, updated_at FROM workflows ORDER BY id DESC LIMIT 10").fetchall()
    return {"workflows": [dict(r) for r in rows]}

@app.get("/api/workflows/{wf_id}")
async def get_workflow(wf_id: int):
    with db() as c:
        row = c.execute("SELECT * FROM workflows WHERE id=?", (wf_id,)).fetchone()
    if not row:
        raise HTTPException(404, "Workflow introuvable")
    return {**dict(row), "data": json.loads(row["data"] or "{}")}

@app.post("/api/workflows")
async def save_workflow(body: WorkflowIn):
    now = datetime.now(timezone.utc).isoformat()
    with db() as c:
        row = c.execute("SELECT id FROM workflows WHERE name=?", (body.name,)).fetchone()
        if row:
            c.execute("UPDATE workflows SET data=?, updated_at=? WHERE id=?",
                      (json.dumps(body.data), now, row["id"]))
            return {"id": row["id"]}
        cur = c.execute("INSERT INTO workflows(name,data,updated_at) VALUES(?,?,?)",
                        (body.name, json.dumps(body.data), now))
    return {"id": cur.lastrowid}

@app.delete("/api/workflows/{wf_id}")
async def del_workflow(wf_id: int):
    with db() as c:
        c.execute("DELETE FROM workflows WHERE id=?", (wf_id,))
    return {"ok": True}

@app.post("/api/workflows/run-task")
async def run_task(data: dict):
    """Execute workflow task via agent"""
    return await chat(data)

# ------------------------------------------------------------------ stats
@app.get("/api/stats")
async def get_stats():
    """Get usage stats (empty for demo)"""
    return {"total": {"n": 0, "cost": 0, "tokens": 0}, "by_agent": [], "by_day": [], "by_provider": []}

@app.get("/api/health")
async def health():
    return {"status": "ok", "mode": "public-demo"}

# ============================================================================
# Objectives endpoints
# ============================================================================

@app.get("/api/objectives")
async def get_objectives():
    """Get all objectives"""
    return {"objectives": []}

@app.post("/api/objectives")
async def create_objective(data: dict):
    """Create a new objective"""
    return {"objective_id": "obj-123", "status": "created"}

@app.put("/api/objectives/{objective_id}")
async def update_objective(objective_id: str, data: dict):
    """Update objective status"""
    return {"objective": objective_id, "status": data.get("status")}

# ============================================================================
# Agent config + delegation
# ============================================================================

@app.post("/api/agents/config")
async def configure_agent(config: dict):
    """Configure custom agent server"""
    return {"status": "configured", "agent_id": config.get("agentType")}

@app.post("/api/agents/{agent_id}/delegate")
async def delegate_to_agent(agent_id: str, data: dict):
    """Delegate objective to agent"""
    return {
        "objective_id": data.get("objective_id"),
        "delegated_to": agent_id,
        "status": "delegated"
    }

# ============================================================================
# WebSocket for real-time updates
# ============================================================================

@app.websocket("/ws/updates")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    ws_connections.append(websocket)
    
    try:
        while True:
            data = await websocket.receive_text()
            # Broadcast to all connections
            for conn in ws_connections:
                try:
                    await conn.send_text(data)
                except:
                    pass
    except:
        ws_connections.remove(websocket)

# ============================================================================
# Serve frontend SPA
# ============================================================================

frontend_path = Path(__file__).parent / "dist"

# Mount assets
if (frontend_path / "assets").exists():
    app.mount("/assets", StaticFiles(directory=str(frontend_path / "assets")), name="assets")

@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    """Serve SPA frontend"""
    file_path = frontend_path / full_path
    if file_path.exists() and not file_path.is_dir():
        return FileResponse(str(file_path))
    return FileResponse(str(frontend_path / "index.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8005)