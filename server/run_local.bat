@echo off
python -m venv .venv
call .venv\Scripts\activate
pip install --upgrade pip
pip install -r server\requirements.txt
uvicorn server.main:app --reload --port 8000
