#!/usr/bin/env bash
set -e
python -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r server/requirements.txt
uvicorn server.main:app --reload --port 8000
