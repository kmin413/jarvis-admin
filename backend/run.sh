#!/usr/bin/env bash
# 오감몬스터 예약 백엔드 실행 스크립트
set -e
cd "$(dirname "$0")"

# venv 활성화
if [ ! -d ".venv" ]; then
  python3 -m venv .venv
  ./.venv/bin/pip install --upgrade pip
  ./.venv/bin/pip install -r requirements.txt
fi

# DB 시드 (없을 때만)
if [ ! -f "data.db" ]; then
  ./.venv/bin/python3 seed.py
fi

PORT="${PORT:-8200}"
HOST="${HOST:-0.0.0.0}"

exec ./.venv/bin/uvicorn main:app --host "$HOST" --port "$PORT" --reload
