# Math Heist: The Algebra Artifact

An offline-first, dependency-free canvas game that teaches late elementary to early middle school math through a playful museum heist. Open `index.html` directly to play—no build step, server, or package install needed.

## Quick start

1. Download or clone this repository.
2. Open `index.html` in any modern browser (Chrome, Edge, Firefox, Safari). File URLs (`file://`) are supported.
3. Optional: run a tiny local server for convenience:
   - Python 3: `python -m http.server 8000`
   - Node: `npx serve`

## Game loop

- Start a **heist run** from the top bar.
- Navigate 6–10 rooms per run, each with a math obstacle (door lock, laser grid, key fragments, signal jammer).
- Solve problems to advance; difficulty adapts to recent accuracy, speed, and hint use.
- End with a boss room that scaffolds multiple steps for the current topic.
- Earn **Gems** for cosmetics and gadget unlocks. **Focus** acts as a soft timer; wrong answers lower it slightly and streaks refund time.
- Progress, mastery, gadgets, cosmetics, and session summaries persist via `localStorage`.

## Controls

- **Keyboard**: WASD/arrow keys to move, **Enter** to submit, **Esc** to pause, **~** to toggle debug overlay.
- **Mouse/Touch**: Click/tap to interact. On coarse pointers, an on-screen joystick and submit button appear.
- **Accessibility**: High contrast, large text, and reduce motion toggles are in Settings. No flashing effects.

## Topics and problem types

- Integers (add/subtract, compare, absolute value)
- Decimals & percents (conversion, discounts, tax/tip)
- Ratios & rates (unit rate, price per item)
- Order of operations (PEMDAS with parentheses)
- Equations (one- and two-step with mirror-balance hints)
- Coordinates (quadrants, Manhattan distance)
- Geometry (area, composite rectangles, perimeter)
- Mixed review pulls from all topics

Each problem includes a three-step hint ladder and error-aware feedback (e.g., sign errors, order-of-ops slips).

## Adaptive difficulty

- Tracks recent accuracy (last ~12), median response time, and hint usage per topic.
- Adjusts number magnitudes, multiple-choice availability, free-response preference, hint delay, and boss length.
- Anti-frustration: after misses, easier variants and visible choices appear; focus drains gently and regenerates.

## Surprises and helpers

- **Time Refund** on streaks; **Laser Rhythm Lock** mini-beats; **Mirror Math** panels for balance; **Unreliable Curator** glitch lines; **Ally Guard** tutor boost; **Heist Replay** clip with stats.
- **Gadgets** (earned/limited charges): X-Ray Goggles (prunes choices), Balance Beam (mirror hint), Percent Lens (conversion nudge), Checkpoint Token (focus restore). Gadgets refill at run start.

## UI and overlays

- **Heist Board** shows wings, flavor text, and mastery summaries.
- **Report** lists last 20 sessions and copies JSON to clipboard for parents/teachers.
- **Debug** (`~`) displays FPS estimate, current topic, difficulty, hint rate, and last error type.

## Files

- `index.html` – entry point, script/style includes.
- `styles.css` – layout, panels, accessibility styles.
- `game.js` – canvas loop, rooms, input, surprises, boss flow, audio pings.
- `ui.js` – panels, modals, settings, report, heist board, gadget buttons.
- `math.js` – problem generators, hints, error classifiers.
- `content.js` – wings, obstacles, narration, boss scripts.
- `progress.js` – mastery model, adaptation rules.
- `storage.js` – localStorage schema, save/load/reset helpers.

## Testing notes

- Open `index.html` directly to verify offline support.
- Optional smoke check with a static server: `python -m http.server 8000` then visit `http://127.0.0.1:8000/index.html`.
- Playwright smoke in the sandbox may fail to see the file server; if using containerized CI, ensure the server process is reachable before running browser checks.

