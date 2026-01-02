# Math Heist: Quest Mode

This repository holds a quest-driven “museum heist” math RPG with a laptop-first client and an optional Python (FastAPI) backend for richer story, quests, analytics, and sync. You can still open the client offline, but the backend unlocks daily missions, branching quests, and cloud-friendly progress.

## Repo layout
- `client/` — Vanilla HTML/CSS/JS canvas game (runs offline via `file://`).
- `server/` — FastAPI backend, content JSON, and launcher scripts.
- Root legacy files mirror the client for quick offline access.

## Quick start (local mode)
1. Install Python 3.10+.
2. Run `server/run_local.sh` (or `server/run_local.bat` on Windows).
   - Creates a virtualenv, installs FastAPI + deps, and starts Uvicorn on `http://127.0.0.1:8000`.
3. Open `http://127.0.0.1:8000` to play with backend-powered quests and content.

### Offline/no-backend mode
- Open `client/index.html` (or the root `index.html`) directly via `file://` to play the offline loop that uses localStorage only.

## Backend API (high level)
- **Auth**: `POST /api/auth/anon` to create a local profile token.
- **Profile**: `GET /api/profile`, `PATCH /api/profile` for settings.
- **Content**: `GET /api/content/manifest`, `GET /api/content/{quests|dialogues|items|wings}`.
- **World/Quests**: `GET /api/world/state`, `POST /api/quest/start`, `/advance`, `/choice`.
- **Runs**: `POST /api/run/start`, `/event`, `/finish`.
- **Reports**: `GET /api/report/summary`, `/sessions`, `/export.json`.
- **Tutor**: `POST /api/tutor/hints` for deterministic hint ladders (uses SymPy for equations).

## Content authoring
- Edit JSON under `server/content/` (quests, dialogues, items, wings). `manifest.json` captures versions/hashes and is served via the API.

## iPad/PWA thoughts
- Serve the same client as static assets; add a service worker for caching when you extend to PWA.
- Use the backend for cloud sync; in pure offline mode, the client uses local storage/IndexedDB.

## Safety notes
- Profiles are anonymous; no personal info required.
- No user-to-user chat; leaderboards are optional and should stay anonymized if added later.

## Development tips
- Static files are mounted from `client/` at `/static`; hitting `/` returns `client/index.html`.
- The backend currently persists to SQLite at `server/data.db` (created on first run).
- Extend `server/tutor.py` to add richer, deterministic hints per topic.

## Definition of done checklist (excerpt)
- Create/select profile, pick quests, run missions, and fight multi-phase bosses.
- Math hacks change room state; XP/loot/relationships progress.
- Reports and mastery stats available; data persists across restarts.
