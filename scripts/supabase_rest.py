# -*- coding: utf-8 -*-
"""Supabase REST 헬퍼 — service_role 키로 questions 등 테이블을 직접 읽고 쓴다.

콘솔 인코딩(cp949) 때문에 한글이 깨지므로, CLI로 쓸 때는 결과를 UTF-8 파일로 떨군다.
"""
import json
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def env() -> dict:
    e = {}
    for line in (ROOT / ".env.local").read_text(encoding="utf-8-sig").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            e[k.strip()] = v.strip().strip('"').strip("'")
    return e


def _conf():
    e = env()
    base = e["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
    key = e["SUPABASE_SERVICE_ROLE_KEY"]
    return base, {"apikey": key, "Authorization": "Bearer " + key, "Content-Type": "application/json"}


def get(path: str, timeout: int = 60):
    base, h = _conf()
    req = urllib.request.Request(f"{base}/rest/v1/{path}", headers=h)
    return json.loads(urllib.request.urlopen(req, timeout=timeout).read())


def post(path: str, rows, timeout: int = 120, prefer: str = "return=minimal"):
    base, h = _conf()
    req = urllib.request.Request(
        f"{base}/rest/v1/{path}",
        method="POST",
        data=json.dumps(rows, ensure_ascii=False).encode("utf-8"),
        headers={**h, "Prefer": prefer},
    )
    body = urllib.request.urlopen(req, timeout=timeout).read()
    return json.loads(body) if body else None


def patch(path: str, payload, timeout: int = 60):
    base, h = _conf()
    req = urllib.request.Request(
        f"{base}/rest/v1/{path}",
        method="PATCH",
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={**h, "Prefer": "return=minimal"},
    )
    urllib.request.urlopen(req, timeout=timeout).read()


def delete(path: str, timeout: int = 60):
    base, h = _conf()
    req = urllib.request.Request(f"{base}/rest/v1/{path}", method="DELETE", headers={**h, "Prefer": "return=minimal"})
    urllib.request.urlopen(req, timeout=timeout).read()


if __name__ == "__main__":
    # usage: python supabase_rest.py "<rest-path>" <out-file>
    data = get(sys.argv[1])
    out = Path(sys.argv[2])
    out.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(data)} rows -> {out}")
