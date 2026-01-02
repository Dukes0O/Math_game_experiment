# Math Heist (v2) — Browser-only, no backend

This is a pure front-end game. You can play it by opening `index.html` directly in a browser (offline).  
No Python, no Node, no installs required.

If your browser blocks `file://` JavaScript (some strict settings do), you can run a tiny local server:

```bash
python -m http.server 8000
# then open http://localhost:8000
```

## Controls

- Move: **WASD** or **Arrow keys**
- Interact / Hack terminal: **E**
- Hint (during a lock): **H**
- Pause: **Esc**
- Debug overlay: **~**

## What’s new in v2

- Rooms are real: walk around, collect gems, hack the terminal, pick an exit door route.
- Laser rooms sometimes become **Rhythm Locks** (timed beats).
- **Sentry orbs** roam some rooms — if they touch you, you must do a fast “panic hack”.
- Better math checking: accepts `0.30` vs `0.3`, supports `$`, `%`, simple fractions, and uses tolerance for decimals.
- Shop + cosmetics (all saved locally).
- Missions per run for bonus gems.

Have fun.
