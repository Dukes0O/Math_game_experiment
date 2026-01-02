@echo off
REM Simple helper to launch Math Heist locally via a lightweight HTTP server.
REM Double-click this file on Windows to start the server and open the game.

set PORT=8000

REM Prefer the built-in Python http.server (Python 3).
python -c "import sys" >nul 2>&1
if %errorlevel% neq 0 (
  echo Python 3 is required to run the local server. Please install it from https://www.python.org/downloads/.
  pause
  exit /b 1
)

echo Starting Math Heist on http://localhost:%PORT% ...
start "" http://localhost:%PORT%/index.html
python -m http.server %PORT%