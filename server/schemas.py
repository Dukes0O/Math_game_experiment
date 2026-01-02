from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class ProfileCreate(BaseModel):
    display_name: Optional[str] = None

class ProfileOut(BaseModel):
    id: str
    display_name: str
    settings: Dict[str, Any]
    created_at: datetime
    last_seen: datetime

class SettingsUpdate(BaseModel):
    settings: Dict[str, Any]

class WorldStateOut(BaseModel):
    flags: Dict[str, Any]
    reputation: Dict[str, Any]
    unlocked: Dict[str, Any]

class QuestAdvance(BaseModel):
    quest_id: str
    event: Dict[str, Any]

class QuestChoice(BaseModel):
    quest_id: str
    choice_id: str

class RunStartOut(BaseModel):
    run_id: str
    seed: int

class RunEvent(BaseModel):
    run_id: str
    event: Dict[str, Any]

class RunFinish(BaseModel):
    run_id: str
    success: bool
    stats: Dict[str, Any]

class TutorRequest(BaseModel):
    topic: str
    problem: Dict[str, Any]

class TutorResponse(BaseModel):
    steps: List[str]

class ReportSession(BaseModel):
    timestamp: datetime
    topic: str
    correct: bool
    time_ms: int
    hints_used: int
    error_type: str

class ReportSummary(BaseModel):
    sessions: List[ReportSession]

class Manifest(BaseModel):
    version: str
    entries: Dict[str, str]
