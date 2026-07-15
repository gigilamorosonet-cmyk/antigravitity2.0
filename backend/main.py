"""AgentNexus — Backend FastAPI (Public Demo Mode - No Auth Required)
Accès libre à toutes les routes - Mode démo avec réponses simulées.
"""
import os
import json
import time
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from contextlib import contextmanager

from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

# ------------------------------------------------------------------ config
BASE_DIR = Path(__file__).parent
DB_PATH = BASE_DIR / "agentnexus.db"
PRODUCTION = os.environ.get("PRODUCTION", "false").lower() == "true"

# ------------------------------------------------------------------ db
@contextmanager
def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()

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

def get_shared_agents():
    """Agents partagés pour mode démo - créés si pas existants"""
    with db() as c:
        c.execute("SELECT id FROM agents LIMIT 1")
        if c.fetchone():
            return
        defaults = [
            ("Hermes Agent", "agent", "openrouter", "nousresearch/hermes-4-70b", "#00f3ff", "zap",
             "Tu es Hermes, un agent généraliste rapide et direct.", "[]"),
            ("OpenClaw", "agent", "anthropic", "claude-sonnet-4", "#ff00ff", "claw",
             "Tu es OpenClaw, spécialiste des tâches complexes et du code.", "[]"),
            ("DeepSeek", "model", "deepseek", "deepseek-chat", "#8a2be2", "brain",
             "Tu es un modèle économique pour les tâches simples.", "[]"),
            ("Mistral", "model", "mistral", "mistral-large-latest", "#ffb800", "wind",
             "Tu es Mistral, équilibré et efficace en français.", "[]"),
        ]
        for name, kind, prov, model, color, icon, sp, sk in defaults:
            c.execute(
                "INSERT INTO agents(name,kind,provider,model,color,icon,system_prompt,skills,created_at)"
                " VALUES(?,?,?,?,?,?,?,?,?)",
                (name, kind, prov, model, color, icon, sp, sk, datetime.now(timezone.utc).isoformat()))

init_db()
get_shared_agents()

# ------------------------------------------------------------------ auth (disabled)
def current_user():
    return {"uid": 0, "email": "guest@antigravity.local"}

# ------------------------------------------------------------------ app
app = FastAPI(title="AgentNexus API (Public Demo)")

if not PRODUCTION:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# ------------------------------------------------------------------ agents
class AgentIn(BaseModel):
    name: str
    kind: str = "agent"
    provider: str = "openrouter"
    model: str = ""
    color: str = "#00f3ff"
    icon: str = "bot"
    system_prompt: str = ""
    skills: list = []

@app.get("/api/agents")
def list_agents():
    with db() as c:
        rows = c.execute("SELECT * FROM agents").fetchall()
    return {"agents": [{**dict(r), "skills": json.loads(r["skills"] or "[]")} for r in rows]}

@app.post("/api/agents")
def create_agent(body: AgentIn):
    with db() as c:
        cur = c.execute(
            "INSERT INTO agents(name,kind,provider,model,color,icon,system_prompt,skills,created_at)"
            " VALUES(?,?,?,?,?,?,?,?,?)",
            ("Guest-" + body.name, body.kind, body.provider, body.model, body.color,
             body.icon, body.system_prompt, json.dumps(body.skills),
             datetime.now(timezone.utc).isoformat()))
    return {"id": cur.lastrowid}

@app.delete("/api/agents/{agent_id}")
def delete_agent(agent_id: int):
    with db() as c:
        c.execute("DELETE FROM agents WHERE id=?", (agent_id,))
    return {"ok": True}

# ------------------------------------------------------------------ memory
class MemoryIn(BaseModel):
    scope: str
    agent_id: int | None = None
    content: str

@app.get("/api/memory")
def list_memory():
    with db() as c:
        rows = c.execute("SELECT * FROM memory ORDER BY id DESC").fetchall()
    return {"memory": [dict(r) for r in rows]}

@app.post("/api/memory")
def add_memory(body: MemoryIn):
    with db() as c:
        c.execute("INSERT INTO memory(agent_id,scope,content,created_at) VALUES(?,?,?,?)",
                  (body.agent_id, body.scope, body.content, datetime.now(timezone.utc).isoformat()))
    return {"ok": True}

# ------------------------------------------------------------------ chat
class ChatIn(BaseModel):
    agent_id: int
    message: str
    file_context: str | None = None

DEMO_REPLIES = [
    "⚡ [MODE DÉMO] Je suis {name}. Message reçu : « {msg} ». Configure une clé API pour des réponses réelles.",
    "🔮 [SIMULATION] {name} ici. Ta demande serait traitée par {model}. Ajoute une clé API dans Connecteurs.",
]

@app.post("/api/chat")
def chat(body: ChatIn):
    with db() as c:
        agent = c.execute("SELECT * FROM agents WHERE id=?", (body.agent_id,)).fetchone()
        if not agent:
            raise HTTPException(404, "Agent introuvable")
        mem = c.execute(
            "SELECT scope, content FROM memory WHERE scope='global' OR agent_id=?",
            (body.agent_id,)).fetchall()
        history = c.execute(
            "SELECT role, content FROM messages WHERE agent_id=? ORDER BY id DESC LIMIT 10",
            (body.agent_id,)).fetchall()

    sysparts = [agent["system_prompt"] or "Tu es un assistant IA."]
    glob = [m["content"] for m in mem if m["scope"] == "global"]
    if glob:
        sysparts.append("MÉMOIRE PARTAGÉE:\n- " + "\n- ".join(glob))
    if body.file_context:
        sysparts.append("FICHIERS:\n" + body.file_context[:5000])
    system = "\n\n".join(sysparts)

    msgs = [{"role": r["role"], "content": r["content"]} for r in reversed(history)]
    msgs.append({"role": "user", "content": body.message})

    reply = DEMO_REPLIES[int(time.time()) % len(DEMO_REPLIES)].format(
        name=agent["name"], msg=body.message[:120], model=agent["model"])

    now = datetime.now(timezone.utc).isoformat()
    with db() as c:
        c.execute("INSERT INTO messages(agent_id,role,content,created_at) VALUES(?,?,?,?)",
                  (body.agent_id, "user", body.message, now))
        c.execute("INSERT INTO messages(agent_id,role,content,created_at) VALUES(?,?,?,?)",
                  (body.agent_id, "assistant", reply, now))
    return {"reply": reply, "demo": True, "prompt_tokens": 0, "completion_tokens": 0, "cost": 0.0}

# ------------------------------------------------------------------ health
@app.get("/api/health")
def health():
    return {"status": "ok", "production": PRODUCTION, "mode": "public-demo"}

# ------------------------------------------------------------------ SPA serving
frontend_dist = BASE_DIR.parent / "dist"
assets_dir = frontend_dist / "assets"
if assets_dir.exists():
    app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

@app.get("/{full_path:path}", response_class=HTMLResponse)
async def serve_spa(full_path: str):
    index_file = frontend_dist / "index.html"
    if index_file.exists():
        return HTMLResponse(content=index_file.read_text())
    return HTMLResponse("<h1>Frontend non buildé</h1>", status_code=404)