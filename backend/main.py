"""AgentNexus — Backend FastAPI
Auth JWT + clés API chiffrées (Fernet) + agents + mémoire partagée/individuelle
+ stats d'usage + proxy chat multi-provider (mode démo sans clé) + workflows + skills.
"""
import os
import json
import time
import base64
import hashlib
import sqlite3
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path
from contextlib import contextmanager

import httpx
import jwt
from cryptography.fernet import Fernet
from fastapi import FastAPI, Request, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

# ------------------------------------------------------------------ config
BASE_DIR = Path(__file__).parent
DB_PATH = BASE_DIR / "agentnexus.db"
SECRET_FILE = BASE_DIR / ".secret"
PRODUCTION = os.environ.get("PRODUCTION", "false").lower() == "true"

if SECRET_FILE.exists():
    _secret = SECRET_FILE.read_bytes()
else:
    _secret = secrets.token_bytes(64)
    SECRET_FILE.write_bytes(_secret)
    os.chmod(SECRET_FILE, 0o600)

JWT_SECRET = hashlib.sha256(_secret + b"jwt").hexdigest()
FERNET = Fernet(base64.urlsafe_b64encode(hashlib.sha256(_secret + b"fernet").digest()))

PROVIDERS = {
    "openrouter": {"url": "https://openrouter.ai/api/v1/chat/completions", "auth": "Bearer"},
    "anthropic": {"url": "https://api.anthropic.com/v1/messages", "auth": "x-api-key"},
    "mistral": {"url": "https://api.mistral.ai/v1/chat/completions", "auth": "Bearer"},
    "deepseek": {"url": "https://api.deepseek.com/chat/completions", "auth": "Bearer"},
    "openai": {"url": "https://api.openai.com/v1/chat/completions", "auth": "Bearer"},
}

# prix indicatifs $/1M tokens (prompt, completion) pour l'estimation de coût
PRICING = {
    "claude": (3.0, 15.0), "gpt": (2.5, 10.0), "mistral": (2.0, 6.0),
    "deepseek": (0.27, 1.1), "llama": (0.2, 0.6), "hermes": (0.8, 0.8),
    "default": (1.0, 3.0),
}


def price_for(model: str):
    m = model.lower()
    for k, v in PRICING.items():
        if k in m:
            return v
    return PRICING["default"]


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
        CREATE TABLE IF NOT EXISTS users(
            id INTEGER PRIMARY KEY, email TEXT UNIQUE, pw_hash TEXT, salt TEXT,
            created_at TEXT, onboarded INTEGER DEFAULT 0);
        CREATE TABLE IF NOT EXISTS api_keys(
            id INTEGER PRIMARY KEY, user_id INTEGER, provider TEXT, enc_key TEXT,
            created_at TEXT, UNIQUE(user_id, provider));
        CREATE TABLE IF NOT EXISTS agents(
            id INTEGER PRIMARY KEY, user_id INTEGER, name TEXT, kind TEXT,
            provider TEXT, model TEXT, color TEXT, icon TEXT,
            system_prompt TEXT, skills TEXT, created_at TEXT);
        CREATE TABLE IF NOT EXISTS memory(
            id INTEGER PRIMARY KEY, user_id INTEGER, agent_id INTEGER,
            scope TEXT, content TEXT, created_at TEXT);
        CREATE TABLE IF NOT EXISTS messages(
            id INTEGER PRIMARY KEY, user_id INTEGER, agent_id INTEGER,
            role TEXT, content TEXT, created_at TEXT);
        CREATE TABLE IF NOT EXISTS usage(
            id INTEGER PRIMARY KEY, user_id INTEGER, agent_id INTEGER,
            provider TEXT, model TEXT, prompt_tokens INTEGER, completion_tokens INTEGER,
            cost REAL, demo INTEGER DEFAULT 0, created_at TEXT);
        CREATE TABLE IF NOT EXISTS workflows(
            id INTEGER PRIMARY KEY, user_id INTEGER, name TEXT, data TEXT,
            updated_at TEXT);
        CREATE TABLE IF NOT EXISTS skills(
            id INTEGER PRIMARY KEY, user_id INTEGER, name TEXT, category TEXT,
            description TEXT, content TEXT, universal INTEGER DEFAULT 1,
            created_at TEXT);
        CREATE TABLE IF NOT EXISTS files(
            id INTEGER PRIMARY KEY, user_id INTEGER, name TEXT, content TEXT,
            created_at TEXT);
        """)


init_db()

# ------------------------------------------------------------------ auth helpers
def hash_pw(pw: str, salt: str) -> str:
    return hashlib.pbkdf2_hmac("sha256", pw.encode(), salt.encode(), 200_000).hex()


def make_token(user_id: int, email: str) -> str:
    return jwt.encode(
        {"uid": user_id, "email": email,
         "exp": datetime.now(timezone.utc) + timedelta(days=7)},
        JWT_SECRET, algorithm="HS256")


def current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Non authentifié")
    try:
        payload = jwt.decode(authorization[7:], JWT_SECRET, algorithms=["HS256"])
        return payload
    except Exception:
        raise HTTPException(401, "Token invalide ou expiré")


# ------------------------------------------------------------------ app
app = FastAPI(title="AgentNexus API")

if not PRODUCTION:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
        allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


class RegisterIn(BaseModel):
    email: str
    password: str


class LoginIn(BaseModel):
    email: str
    password: str


@app.post("/api/auth/register")
def register(body: RegisterIn):
    if len(body.password) < 6:
        raise HTTPException(400, "Mot de passe trop court (min 6)")
    salt = secrets.token_hex(16)
    with db() as c:
        try:
            cur = c.execute(
                "INSERT INTO users(email, pw_hash, salt, created_at) VALUES(?,?,?,?)",
                (body.email.lower().strip(), hash_pw(body.password, salt), salt,
                 datetime.now(timezone.utc).isoformat()))
        except sqlite3.IntegrityError:
            raise HTTPException(409, "Email déjà utilisé")
        uid = cur.lastrowid
        # agents par défaut
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
                "INSERT INTO agents(user_id,name,kind,provider,model,color,icon,system_prompt,skills,created_at)"
                " VALUES(?,?,?,?,?,?,?,?,?,?)",
                (uid, name, kind, prov, model, color, icon, sp, sk,
                 datetime.now(timezone.utc).isoformat()))
    return {"token": make_token(uid, body.email), "email": body.email, "onboarded": False}


@app.post("/api/auth/login")
def login(body: LoginIn):
    with db() as c:
        row = c.execute("SELECT * FROM users WHERE email=?",
                        (body.email.lower().strip(),)).fetchone()
    if not row or hash_pw(body.password, row["salt"]) != row["pw_hash"]:
        raise HTTPException(401, "Email ou mot de passe incorrect")
    return {"token": make_token(row["id"], row["email"]),
            "email": row["email"], "onboarded": bool(row["onboarded"])}


@app.post("/api/auth/onboarded")
def set_onboarded(user=Depends(current_user)):
    with db() as c:
        c.execute("UPDATE users SET onboarded=1 WHERE id=?", (user["uid"],))
    return {"ok": True}


# ------------------------------------------------------------------ api keys
class KeyIn(BaseModel):
    provider: str
    key: str


@app.get("/api/keys")
def list_keys(user=Depends(current_user)):
    with db() as c:
        rows = c.execute("SELECT provider, created_at FROM api_keys WHERE user_id=?",
                         (user["uid"],)).fetchall()
    return {"keys": [{"provider": r["provider"], "created_at": r["created_at"],
                      "masked": "sk-••••••••"} for r in rows],
            "providers": list(PROVIDERS.keys())}


@app.post("/api/keys")
def save_key(body: KeyIn, user=Depends(current_user)):
    if body.provider not in PROVIDERS:
        raise HTTPException(400, "Provider inconnu")
    enc = FERNET.encrypt(body.key.encode()).decode()
    with db() as c:
        c.execute("INSERT OR REPLACE INTO api_keys(user_id,provider,enc_key,created_at)"
                  " VALUES(?,?,?,?)",
                  (user["uid"], body.provider, enc, datetime.now(timezone.utc).isoformat()))
    return {"ok": True}


@app.delete("/api/keys/{provider}")
def delete_key(provider: str, user=Depends(current_user)):
    with db() as c:
        c.execute("DELETE FROM api_keys WHERE user_id=? AND provider=?",
                  (user["uid"], provider))
    return {"ok": True}


def get_key(uid: int, provider: str):
    with db() as c:
        row = c.execute("SELECT enc_key FROM api_keys WHERE user_id=? AND provider=?",
                        (uid, provider)).fetchone()
    if not row:
        return None
    return FERNET.decrypt(row["enc_key"].encode()).decode()


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
def list_agents(user=Depends(current_user)):
    with db() as c:
        rows = c.execute("SELECT * FROM agents WHERE user_id=?", (user["uid"],)).fetchall()
        keys = {r["provider"] for r in c.execute(
            "SELECT provider FROM api_keys WHERE user_id=?", (user["uid"],)).fetchall()}
    return {"agents": [
        {**dict(r), "skills": json.loads(r["skills"] or "[]"),
         "has_key": r["provider"] in keys} for r in rows]}


@app.post("/api/agents")
def create_agent(body: AgentIn, user=Depends(current_user)):
    with db() as c:
        cur = c.execute(
            "INSERT INTO agents(user_id,name,kind,provider,model,color,icon,system_prompt,skills,created_at)"
            " VALUES(?,?,?,?,?,?,?,?,?,?)",
            (user["uid"], body.name, body.kind, body.provider, body.model, body.color,
             body.icon, body.system_prompt, json.dumps(body.skills),
             datetime.now(timezone.utc).isoformat()))
    return {"id": cur.lastrowid}


@app.put("/api/agents/{agent_id}")
def update_agent(agent_id: int, body: AgentIn, user=Depends(current_user)):
    with db() as c:
        c.execute(
            "UPDATE agents SET name=?,kind=?,provider=?,model=?,color=?,icon=?,system_prompt=?,skills=?"
            " WHERE id=? AND user_id=?",
            (body.name, body.kind, body.provider, body.model, body.color, body.icon,
             body.system_prompt, json.dumps(body.skills), agent_id, user["uid"]))
    return {"ok": True}


@app.delete("/api/agents/{agent_id}")
def delete_agent(agent_id: int, user=Depends(current_user)):
    with db() as c:
        c.execute("DELETE FROM agents WHERE id=? AND user_id=?", (agent_id, user["uid"]))
    return {"ok": True}


# ------------------------------------------------------------------ memory
class MemoryIn(BaseModel):
    scope: str  # global | private
    agent_id: int | None = None
    content: str


@app.get("/api/memory")
def list_memory(user=Depends(current_user)):
    with db() as c:
        rows = c.execute("SELECT * FROM memory WHERE user_id=? ORDER BY id DESC",
                         (user["uid"],)).fetchall()
    return {"memory": [dict(r) for r in rows]}


@app.post("/api/memory")
def add_memory(body: MemoryIn, user=Depends(current_user)):
    with db() as c:
        c.execute("INSERT INTO memory(user_id,agent_id,scope,content,created_at) VALUES(?,?,?,?,?)",
                  (user["uid"], body.agent_id, body.scope, body.content,
                   datetime.now(timezone.utc).isoformat()))
    return {"ok": True}


@app.delete("/api/memory/{mem_id}")
def del_memory(mem_id: int, user=Depends(current_user)):
    with db() as c:
        c.execute("DELETE FROM memory WHERE id=? AND user_id=?", (mem_id, user["uid"]))
    return {"ok": True}


# ------------------------------------------------------------------ chat
class ChatIn(BaseModel):
    agent_id: int
    message: str
    file_context: str | None = None


DEMO_REPLIES = [
    "⚡ [MODE DÉMO — aucune clé API configurée pour ce provider] Je suis {name}. J'ai bien reçu : « {msg} ». Ajoute une clé API dans Connecteurs pour des réponses réelles.",
    "🔮 [MODE DÉMO] {name} en simulation. Ta demande « {msg} » serait traitée par {model}. Configure ta clé pour activer le vrai modèle.",
]


@app.post("/api/chat")
def chat(body: ChatIn, user=Depends(current_user)):
    uid = user["uid"]
    with db() as c:
        agent = c.execute("SELECT * FROM agents WHERE id=? AND user_id=?",
                          (body.agent_id, uid)).fetchone()
        if not agent:
            raise HTTPException(404, "Agent introuvable")
        mem = c.execute(
            "SELECT scope, content FROM memory WHERE user_id=? AND (scope='global' OR agent_id=?)",
            (uid, body.agent_id)).fetchall()
        history = c.execute(
            "SELECT role, content FROM messages WHERE user_id=? AND agent_id=? ORDER BY id DESC LIMIT 10",
            (uid, body.agent_id)).fetchall()

    sysparts = [agent["system_prompt"] or "Tu es un assistant IA."]
    glob = [m["content"] for m in mem if m["scope"] == "global"]
    priv = [m["content"] for m in mem if m["scope"] != "global"]
    if glob:
        sysparts.append("MÉMOIRE PARTAGÉE (tous les agents):\n- " + "\n- ".join(glob))
    if priv:
        sysparts.append("MÉMOIRE INDIVIDUELLE:\n- " + "\n- ".join(priv))
    if body.file_context:
        sysparts.append("FICHIERS FOURNIS PAR L'UTILISATEUR:\n" + body.file_context[:8000])
    system = "\n\n".join(sysparts)

    msgs = [{"role": r["role"], "content": r["content"]} for r in reversed(history)]
    msgs.append({"role": "user", "content": body.message})

    provider = agent["provider"]
    key = get_key(uid, provider)
    demo = key is None

    if demo:
        reply = DEMO_REPLIES[int(time.time()) % len(DEMO_REPLIES)].format(
            name=agent["name"], msg=body.message[:120], model=agent["model"])
        p_tok = len(system + body.message) // 4
        c_tok = len(reply) // 4
        cost = 0.0
    else:
        try:
            reply, p_tok, c_tok = call_provider(provider, key, agent["model"], system, msgs)
        except Exception as e:
            raise HTTPException(502, f"Erreur provider {provider}: {e}")
        pp, cp = price_for(agent["model"])
        cost = p_tok / 1e6 * pp + c_tok / 1e6 * cp

    now = datetime.now(timezone.utc).isoformat()
    with db() as c:
        c.execute("INSERT INTO messages(user_id,agent_id,role,content,created_at) VALUES(?,?,?,?,?)",
                  (uid, body.agent_id, "user", body.message, now))
        c.execute("INSERT INTO messages(user_id,agent_id,role,content,created_at) VALUES(?,?,?,?,?)",
                  (uid, body.agent_id, "assistant", reply, now))
        c.execute("INSERT INTO usage(user_id,agent_id,provider,model,prompt_tokens,completion_tokens,cost,demo,created_at)"
                  " VALUES(?,?,?,?,?,?,?,?,?)",
                  (uid, body.agent_id, provider, agent["model"], p_tok, c_tok, cost,
                   1 if demo else 0, now))
    return {"reply": reply, "demo": demo, "prompt_tokens": p_tok,
            "completion_tokens": c_tok, "cost": round(cost, 6)}


def call_provider(provider: str, key: str, model: str, system: str, msgs: list):
    cfg = PROVIDERS[provider]
    with httpx.Client(timeout=90) as client:
        if provider == "anthropic":
            r = client.post(cfg["url"],
                            headers={"x-api-key": key, "anthropic-version": "2023-06-01",
                                     "content-type": "application/json"},
                            json={"model": model, "max_tokens": 2048,
                                  "system": system, "messages": msgs})
            r.raise_for_status()
            d = r.json()
            return (d["content"][0]["text"], d["usage"]["input_tokens"],
                    d["usage"]["output_tokens"])
        else:
            r = client.post(cfg["url"],
                            headers={"Authorization": f"Bearer {key}",
                                     "content-type": "application/json"},
                            json={"model": model,
                                  "messages": [{"role": "system", "content": system}] + msgs})
            r.raise_for_status()
            d = r.json()
            u = d.get("usage", {})
            return (d["choices"][0]["message"]["content"],
                    u.get("prompt_tokens", 0), u.get("completion_tokens", 0))


@app.get("/api/messages/{agent_id}")
def get_messages(agent_id: int, user=Depends(current_user)):
    with db() as c:
        rows = c.execute(
            "SELECT role, content, created_at FROM messages WHERE user_id=? AND agent_id=? ORDER BY id",
            (user["uid"], agent_id)).fetchall()
    return {"messages": [dict(r) for r in rows]}


# ------------------------------------------------------------------ stats
@app.get("/api/stats")
def stats(user=Depends(current_user)):
    uid = user["uid"]
    with db() as c:
        total = c.execute(
            "SELECT COUNT(*) n, COALESCE(SUM(cost),0) cost, COALESCE(SUM(prompt_tokens+completion_tokens),0) tokens"
            " FROM usage WHERE user_id=?", (uid,)).fetchone()
        by_agent = c.execute(
            "SELECT a.name, a.color, COUNT(u.id) n, COALESCE(SUM(u.cost),0) cost,"
            " COALESCE(SUM(u.prompt_tokens+u.completion_tokens),0) tokens"
            " FROM usage u JOIN agents a ON a.id=u.agent_id"
            " WHERE u.user_id=? GROUP BY u.agent_id", (uid,)).fetchall()
        by_day = c.execute(
            "SELECT substr(created_at,1,10) day, COUNT(*) n, COALESCE(SUM(cost),0) cost"
            " FROM usage WHERE user_id=? GROUP BY day ORDER BY day DESC LIMIT 30",
            (uid,)).fetchall()
        by_provider = c.execute(
            "SELECT provider, COUNT(*) n, COALESCE(SUM(cost),0) cost FROM usage"
            " WHERE user_id=? GROUP BY provider", (uid,)).fetchall()
    return {"total": dict(total),
            "by_agent": [dict(r) for r in by_agent],
            "by_day": [dict(r) for r in reversed(by_day)],
            "by_provider": [dict(r) for r in by_provider]}


# ------------------------------------------------------------------ workflows
class WorkflowIn(BaseModel):
    name: str
    data: dict


@app.get("/api/workflows")
def list_workflows(user=Depends(current_user)):
    with db() as c:
        rows = c.execute("SELECT id, name, updated_at FROM workflows WHERE user_id=?",
                         (user["uid"],)).fetchall()
    return {"workflows": [dict(r) for r in rows]}


@app.get("/api/workflows/{wf_id}")
def get_workflow(wf_id: int, user=Depends(current_user)):
    with db() as c:
        row = c.execute("SELECT * FROM workflows WHERE id=? AND user_id=?",
                        (wf_id, user["uid"])).fetchone()
    if not row:
        raise HTTPException(404, "Workflow introuvable")
    return {**dict(row), "data": json.loads(row["data"])}


@app.post("/api/workflows")
def save_workflow(body: WorkflowIn, user=Depends(current_user)):
    now = datetime.now(timezone.utc).isoformat()
    with db() as c:
        row = c.execute("SELECT id FROM workflows WHERE user_id=? AND name=?",
                        (user["uid"], body.name)).fetchone()
        if row:
            c.execute("UPDATE workflows SET data=?, updated_at=? WHERE id=?",
                      (json.dumps(body.data), now, row["id"]))
            return {"id": row["id"]}
        cur = c.execute("INSERT INTO workflows(user_id,name,data,updated_at) VALUES(?,?,?,?)",
                        (user["uid"], body.name, json.dumps(body.data), now))
    return {"id": cur.lastrowid}


@app.delete("/api/workflows/{wf_id}")
def del_workflow(wf_id: int, user=Depends(current_user)):
    with db() as c:
        c.execute("DELETE FROM workflows WHERE id=? AND user_id=?", (wf_id, user["uid"]))
    return {"ok": True}


class RunTaskIn(BaseModel):
    task: str
    agent_id: int


@app.post("/api/workflows/run-task")
def run_task(body: RunTaskIn, user=Depends(current_user)):
    """Exécute une tâche du workflow via l'agent relié."""
    return chat(ChatIn(agent_id=body.agent_id,
                       message=f"TÂCHE DU WORKFLOW À EXÉCUTER:\n{body.task}\n\nRéponds avec le résultat de la tâche."),
                user)


# ------------------------------------------------------------------ skills
class SkillIn(BaseModel):
    name: str
    category: str = "general"
    description: str = ""
    content: str
    universal: bool = True


@app.get("/api/skills")
def list_skills(user=Depends(current_user)):
    with db() as c:
        rows = c.execute("SELECT * FROM skills WHERE user_id=? ORDER BY id DESC",
                         (user["uid"],)).fetchall()
    return {"skills": [dict(r) for r in rows]}


@app.post("/api/skills")
def create_skill(body: SkillIn, user=Depends(current_user)):
    with db() as c:
        cur = c.execute(
            "INSERT INTO skills(user_id,name,category,description,content,universal,created_at)"
            " VALUES(?,?,?,?,?,?,?)",
            (user["uid"], body.name, body.category, body.description, body.content,
             1 if body.universal else 0, datetime.now(timezone.utc).isoformat()))
    return {"id": cur.lastrowid}


@app.delete("/api/skills/{skill_id}")
def del_skill(skill_id: int, user=Depends(current_user)):
    with db() as c:
        c.execute("DELETE FROM skills WHERE id=? AND user_id=?", (skill_id, user["uid"]))
    return {"ok": True}


# ------------------------------------------------------------------ files
class FileIn(BaseModel):
    name: str
    content: str


@app.get("/api/files")
def list_files(user=Depends(current_user)):
    with db() as c:
        rows = c.execute("SELECT id, name, length(content) size, created_at FROM files WHERE user_id=?",
                         (user["uid"],)).fetchall()
    return {"files": [dict(r) for r in rows]}


@app.post("/api/files")
def upload_file(body: FileIn, user=Depends(current_user)):
    with db() as c:
        cur = c.execute("INSERT INTO files(user_id,name,content,created_at) VALUES(?,?,?,?)",
                        (user["uid"], body.name, body.content[:100_000],
                         datetime.now(timezone.utc).isoformat()))
    return {"id": cur.lastrowid}


@app.get("/api/files/{file_id}")
def get_file(file_id: int, user=Depends(current_user)):
    with db() as c:
        row = c.execute("SELECT * FROM files WHERE id=? AND user_id=?",
                        (file_id, user["uid"])).fetchone()
    if not row:
        raise HTTPException(404)
    return dict(row)


@app.delete("/api/files/{file_id}")
def del_file(file_id: int, user=Depends(current_user)):
    with db() as c:
        c.execute("DELETE FROM files WHERE id=? AND user_id=?", (file_id, user["uid"]))
    return {"ok": True}


@app.get("/api/health")
def health():
    return {"status": "ok", "production": PRODUCTION}


# ------------------------------------------------------------------ SPA serving
frontend_dist = BASE_DIR.parent / "dist"
assets_dir = frontend_dist / "assets"
if assets_dir.exists():
    app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")


@app.get("/{full_path:path}", response_class=HTMLResponse)
async def serve_spa(request: Request, full_path: str):
    index_file = frontend_dist / "index.html"
    if index_file.exists():
        return HTMLResponse(content=index_file.read_text())
    return HTMLResponse("<h1>Frontend non buildé</h1><p>cd /root/agentnexus && npm run build</p>",
                        status_code=404)
