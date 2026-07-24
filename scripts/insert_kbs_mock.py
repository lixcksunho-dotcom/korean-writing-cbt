# -*- coding: utf-8 -*-
"""KBS 모의고사 1회(100문항)를 REST(service_role)로 삽입. 컬럼(026/028) 선행 필수.
JSON 6묶음 + listening.json → questions 테이블. 기존 kbs round1 삭제 후 삽입."""
import json, urllib.request, urllib.error
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MOCK = Path(r"C:\Users\선호\AppData\Local\Temp\claude\C--Users---\c04795b9-8d77-49a7-8ca2-3673937b31b2\scratchpad\kbs_mock")
AUDIO = "https://itzhfbsbwuoedncnjhzt.supabase.co/storage/v1/object/public/question-assets/listening/kbs-2025-1-{}.mp3"
FILES = ["listening.json", "vocab.json", "grammar.json", "writecreate.json", "read1.json", "read2.json", "culture.json"]


def env():
    e = {}
    for l in (ROOT / ".env.local").read_text(encoding="utf-8").splitlines():
        l = l.strip()
        if l and not l.startswith("#") and "=" in l:
            k, v = l.split("=", 1); e[k.strip()] = v.strip().strip('"').strip("'")
    return e


def main():
    e = env()
    base = e["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/"); key = e["SUPABASE_SERVICE_ROLE_KEY"]
    h = {"apikey": key, "Authorization": "Bearer " + key, "Content-Type": "application/json"}

    rows = []
    for f in FILES:
        for q in json.loads((MOCK / f).read_text(encoding="utf-8")):
            rows.append({
                "program": "kbs", "year": 2025, "round": 1, "number": q["number"],
                "type": "multiple", "question": q["question"], "options": q["options"],
                "correct_answer": str(int(q["answer"])), "explanation": q.get("explanation") or "",
                "points": int(q.get("points", 10)),
                "passage": q.get("passage"),
                "audio_url": AUDIO.format(q["audio"]) if q.get("audio") else None,
            })
    rows.sort(key=lambda r: r["number"])
    assert len(rows) == 100, f"{len(rows)}개"

    # 기존 kbs round1 삭제(멱등)
    req = urllib.request.Request(
        f"{base}/rest/v1/questions?program=eq.kbs&year=eq.2025&round=eq.1",
        method="DELETE", headers={**h, "Prefer": "return=minimal"})
    urllib.request.urlopen(req, timeout=30)
    print("기존 kbs round1 삭제 완료")

    # 삽입
    req = urllib.request.Request(
        f"{base}/rest/v1/questions", method="POST",
        data=json.dumps(rows, ensure_ascii=False).encode("utf-8"),
        headers={**h, "Prefer": "return=minimal"})
    urllib.request.urlopen(req, timeout=60)
    print(f"삽입 완료: {len(rows)}문항")

    # 검증
    req = urllib.request.Request(
        f"{base}/rest/v1/questions?program=eq.kbs&year=eq.2025&round=eq.1&select=number,audio_url",
        headers={**h, "Prefer": "count=exact"})
    resp = urllib.request.urlopen(req, timeout=30)
    data = json.loads(resp.read())
    audio_cnt = sum(1 for d in data if d.get("audio_url"))
    print(f"검증: DB에 {len(data)}문항, 듣기(audio) {audio_cnt}개")


if __name__ == "__main__":
    main()
