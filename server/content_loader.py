import json
from pathlib import Path
from typing import Dict, Any

CONTENT_DIR = Path(__file__).resolve().parent / 'content'

def load_json(name: str) -> Dict[str, Any]:
    path = CONTENT_DIR / name
    if not path.exists():
        return {}
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def manifest():
    files = ['quests.json','dialogues.json','items.json','wings.json']
    entries = {f: str((CONTENT_DIR/f).stat().st_mtime_ns) for f in files if (CONTENT_DIR/f).exists()}
    return {"version": "1.0.0", "entries": entries}
