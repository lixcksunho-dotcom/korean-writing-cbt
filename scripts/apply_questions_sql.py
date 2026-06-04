"""questions 시드 SQL(INSERT INTO public.questions ... VALUES ...)을 파싱해
Supabase PostgREST(service_role)로 적용한다. 직접 DB 접속(비밀번호) 없이 시드 반영용.

전제: 각 VALUES 튜플의 문자열 리터럴 내부에 ASCII 작은따옴표(')가 없음
      (내부 인용은 한글 따옴표 사용). 따라서 '..' 는 escape 없는 단순 리터럴로 파싱 가능.
또한 맨 앞 DELETE FROM ... WHERE year=.. AND round=.. 를 읽어 동일 범위를 먼저 삭제.

사용: python apply_questions_sql.py <sql파일경로>
"""
import json
import re
import sys
from pathlib import Path

import requests

ENV = Path(__file__).resolve().parent.parent / ".env.local"


def load_env():
    d = {}
    for line in ENV.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        d[k.strip()] = v.strip()
    return d


def parse_values(sql):
    """VALUES 이후의 튜플들을 파싱해 [[field,...], ...] 반환.
    필드는 'string'(앞뒤 따옴표 제거) / NULL / 숫자 / '..'::jsonb(원본 JSON) 형태."""
    i = sql.index("VALUES") + len("VALUES")
    s = sql[i:]
    rows = []
    cur = []          # 현재 튜플의 필드 원본 문자열들
    field = ""
    depth = 0         # 괄호 깊이 (튜플 = depth 1)
    in_str = False
    buf = ""

    def flush_field():
        nonlocal field
        f = field.strip()
        if f:
            cur.append(f)
        field = ""

    for ch in s:
        if in_str:
            field += ch
            if ch == "'":
                in_str = False
            continue
        if ch == "'":
            in_str = True
            field += ch
        elif ch == "(":
            depth += 1
            if depth == 1:
                cur = []; field = ""
            else:
                field += ch
        elif ch == ")":
            if depth == 1:
                flush_field()
                rows.append(cur)
                cur = []
            else:
                field += ch
            depth -= 1
        elif ch == "," and depth == 1:
            flush_field()
        else:
            field += ch
    return rows


def lit(raw):
    """필드 원본 -> 파이썬 값."""
    raw = raw.strip()
    if raw == "NULL":
        return None
    if raw.endswith("::jsonb"):
        inner = raw[: -len("::jsonb")].strip()
        inner = inner[1:-1]  # 앞뒤 ' 제거
        return json.loads(inner)
    if raw.startswith("'") and raw.endswith("'"):
        return raw[1:-1]
    if re.fullmatch(r"-?\d+", raw):
        return int(raw)
    return raw


COLS = ["year", "round", "number", "type", "points",
        "passage", "question", "options", "correct_answer", "explanation"]


def main():
    sql_path = Path(sys.argv[1])
    sql = sql_path.read_text(encoding="utf-8")
    env = load_env()
    base = env["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
    key = env["SUPABASE_SERVICE_ROLE_KEY"]
    h = {"apikey": key, "Authorization": f"Bearer {key}",
         "Content-Type": "application/json"}

    rows = [dict(zip(COLS, [lit(x) for x in r])) for r in parse_values(sql)]
    print(f"파싱된 문항: {len(rows)}개")
    yrs = sorted({r["year"] for r in rows}); rnds = sorted({r["round"] for r in rows})
    print(f"year={yrs} round={rnds}")

    # SQL 파일의 DELETE 문 조건을 그대로 따라 선삭제 (type 등 포함된 범위 정확히 반영)
    m = re.search(r"DELETE\s+FROM\s+public\.questions\s+WHERE\s+(.+?);", sql, re.IGNORECASE | re.DOTALL)
    if m:
        conds = re.split(r"\s+AND\s+", m.group(1).strip(), flags=re.IGNORECASE)
        filt = []
        for c in conds:
            cm = re.match(r"(\w+)\s*=\s*'?([^']+?)'?\s*$", c.strip())
            if cm:
                filt.append(f"{cm.group(1)}=eq.{cm.group(2).strip()}")
        url = f"{base}/rest/v1/questions?" + "&".join(filt)
        dr = requests.delete(url, headers={**h, "Prefer": "return=minimal"}, timeout=30)
        print(f"DELETE [{' & '.join(filt)}]: {dr.status_code}")
    else:
        print("DELETE 문 없음 — 삭제 생략(append)")

    # 삽입
    r = requests.post(f"{base}/rest/v1/questions",
                      headers={**h, "Prefer": "return=minimal"},
                      data=json.dumps(rows, ensure_ascii=False).encode("utf-8"),
                      timeout=60)
    print(f"INSERT: {r.status_code}")
    if not r.ok:
        print(r.text[:500]); sys.exit(1)

    # 검증: 개수 조회
    chk = requests.get(f"{base}/rest/v1/questions?year=eq.{yrs[0]}&round=eq.{rnds[0]}&select=number,type",
                       headers={**h, "Prefer": "count=exact"}, timeout=30)
    print(f"검증 조회: {chk.status_code} · 행수={len(chk.json())}")


if __name__ == "__main__":
    main()
