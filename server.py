from fastapi import FastAPI, WebSocket, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import json
import os
from pathlib import Path
from datetime import datetime
import asyncio

app = FastAPI(title="Anti-Gravity Multi-Agent API")

# CORS for dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket connections for real-time sync
ws_connections = []

# Endpoints for objectives
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

# Endpoints for agents
@app.get("/api/agents")
async def get_agents():
    """Get available agents"""
    return {
        "agents": [
            {"id": "hermes", "name": "Hermes Agent", "status": "connected"},
            {"id": "openclaw", "name": "OpenClaw", "status": "requires_config"},
            {"id": "custom", "name": "Custom Agent", "status": "disconnected"}
        ]
    }

@app.post("/api/agents/config")
async def configure_agent(config: dict):
    """Configure custom agent server (encrypted in production)"""
    return {"status": "configured", "agent_id": config.get("agentType")}

@app.post("/api/agents/{agent_id}/delegate")
async def delegate_to_agent(agent_id: str, data: dict):
    """Delegate objective to agent"""
    return {
        "objective_id": data.get("objective_id"),
        "delegated_to": agent_id,
        "status": "delegated"
    }

# WebSocket for real-time updates
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

# Serve frontend
@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    """Serve SPA frontend"""
    frontend_path = Path(__file__).parent / "dist"
    
    file_path = frontend_path / full_path
    if file_path.exists() and not file_path.is_dir():
        return FileResponse(str(file_path))
    
    return FileResponse(str(frontend_path / "index.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)