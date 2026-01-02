from fastapi import FastAPI, Depends, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from uuid import uuid4
from sqlalchemy.orm import Session
from datetime import datetime
import json

from server import db
from server.schemas import ProfileCreate, ProfileOut, SettingsUpdate, WorldStateOut, QuestAdvance, QuestChoice, RunStartOut, RunEvent, RunFinish, TutorRequest, TutorResponse, ReportSummary, Manifest
from server.content_loader import load_json, manifest as build_manifest
from server.tutor import tutor_steps
from server.settings import settings

app = FastAPI(title="Math Heist Quest Mode")
app.mount('/static', StaticFiles(directory=settings.static_dir), name='static')

@app.get('/')
def root():
    index = settings.static_dir / 'index.html'
    if not index.exists():
        return {"message":"client not built"}
    return FileResponse(index)

@app.post('/api/auth/anon', response_model=ProfileOut)
def auth_anon(body: ProfileCreate, db_sess: Session = Depends(db.get_db)):
    pid = str(uuid4())
    prof = db.Profile(id=pid, display_name=body.display_name or 'Guest', settings_json='{}')
    inv = db.Inventory(profile_id=pid)
    world = db.WorldState(profile_id=pid)
    db_sess.add_all([prof, inv, world])
    db_sess.commit()
    return ProfileOut(id=pid, display_name=prof.display_name, settings={}, created_at=prof.created_at, last_seen=prof.last_seen)

@app.get('/api/profile', response_model=ProfileOut)
def get_profile(profile_id: str, db_sess: Session = Depends(db.get_db)):
    prof = db_sess.get(db.Profile, profile_id)
    if not prof:
        raise HTTPException(status_code=404, detail='profile not found')
    prof.last_seen = datetime.utcnow()
    db_sess.commit()
    return ProfileOut(id=prof.id, display_name=prof.display_name, settings=json.loads(prof.settings_json or '{}'), created_at=prof.created_at, last_seen=prof.last_seen)

@app.patch('/api/profile', response_model=ProfileOut)
def update_profile(profile_id: str, body: SettingsUpdate, db_sess: Session = Depends(db.get_db)):
    prof = db_sess.get(db.Profile, profile_id)
    if not prof:
        raise HTTPException(status_code=404, detail='profile not found')
    prof.settings_json = json.dumps(body.settings)
    prof.last_seen = datetime.utcnow()
    db_sess.commit()
    return ProfileOut(id=prof.id, display_name=prof.display_name, settings=body.settings, created_at=prof.created_at, last_seen=prof.last_seen)

@app.get('/api/content/manifest', response_model=Manifest)
def get_manifest():
    data = build_manifest()
    return Manifest(version=data['version'], entries=data['entries'])

@app.get('/api/content/{name}')
def get_content(name: str):
    return load_json(f"{name}.json")

@app.get('/api/world/state', response_model=WorldStateOut)
def world_state(profile_id: str, db_sess: Session = Depends(db.get_db)):
    ws = db_sess.get(db.WorldState, profile_id)
    if not ws:
        raise HTTPException(status_code=404, detail='profile not found')
    return WorldStateOut(flags=json.loads(ws.flags_json or '{}'), reputation=json.loads(ws.reputation_json or '{}'), unlocked=json.loads(ws.unlocked_json or '{}'))

@app.post('/api/quest/start')
def quest_start(profile_id: str, quest_id: str):
    return {"status":"started","quest_id":quest_id}

@app.post('/api/quest/advance')
def quest_advance(body: QuestAdvance):
    return {"status":"advanced","quest_id":body.quest_id,"event":body.event}

@app.post('/api/quest/choice')
def quest_choice(body: QuestChoice):
    return {"status":"choice recorded","quest_id":body.quest_id,"choice":body.choice_id}

@app.post('/api/run/start', response_model=RunStartOut)
def run_start(profile_id: str):
    rid = str(uuid4())
    seed = int(uuid4().int % 1_000_000)
    return RunStartOut(run_id=rid, seed=seed)

@app.post('/api/run/event')
def run_event(body: RunEvent):
    return {"ack": True, "run_id": body.run_id, "event": body.event}

@app.post('/api/run/finish')
def run_finish(body: RunFinish):
    return {"status": "recorded", "run_id": body.run_id, "success": body.success, "stats": body.stats}

@app.get('/api/report/summary', response_model=ReportSummary)
def report_summary(profile_id: str):
    return ReportSummary(sessions=[])

@app.get('/api/report/sessions')
def report_sessions(profile_id: str, limit: int = 20):
    return []

@app.get('/api/report/export.json')
def report_export(profile_id: str):
    return {"profile": profile_id, "sessions": []}

@app.post('/api/tutor/hints', response_model=TutorResponse)
def tutor(body: TutorRequest):
    steps = tutor_steps(body.topic, body.problem)
    return TutorResponse(steps=steps)
