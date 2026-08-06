"""코드·마이그레이션이 기대하는 테이블이 운영 DB에 실제로 있는지 대조한다.

manuscript_submissions가 이렇게 빠졌다: 마이그레이션 002는 저장소에 있는데
SQL Editor에서 실행된 적이 없었고, insert 결과를 아무도 안 봐서 조용히 실패했다
(supabase-js는 throw 대신 {error}를 돌려준다). 읽는 쪽도 `?? []`라 화면은 멀쩡해 보였다.
=> 화면 테스트로는 절대 안 잡히는 종류라 스키마를 직접 대조한다.

사용: python scripts/schema_drift_check.py     (불일치가 있으면 종료코드 1)
"""
import re
import sys
from pathlib import Path

import requests

# Windows 콘솔 기본 코드페이지에서 한글이 깨지지 않게.
sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent


def load_env():
    d = {}
    for line in (ROOT / ".env.local").read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            d[k.strip()] = v.strip().strip('"')
    return d


def live_schema(env):
    """PostgREST 루트의 OpenAPI 스펙에서 테이블과 각 테이블의 컬럼을 그대로 읽는다."""
    r = requests.get(
        f"{env['NEXT_PUBLIC_SUPABASE_URL']}/rest/v1/",
        headers={
            "apikey": env["SUPABASE_SERVICE_ROLE_KEY"],
            "Authorization": f"Bearer {env['SUPABASE_SERVICE_ROLE_KEY']}",
        },
        timeout=30,
    )
    r.raise_for_status()
    spec = r.json()
    tables = {p.lstrip("/") for p in spec.get("paths", {}) if p != "/"}
    columns = {
        name: set((d.get("properties") or {}).keys())
        for name, d in (spec.get("definitions") or {}).items()
    }
    return tables, columns


def migration_tables():
    found = set()
    for f in (ROOT / "supabase" / "migrations").glob("*.sql"):
        text = f.read_text(encoding="utf-8")
        for m in re.finditer(
            r"create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?(\w+)", text, re.I
        ):
            found.add(m.group(1))
    return found


def code_tables():
    """src에서 .from('테이블') 로 실제 접근하는 이름만 모은다(storage.from은 제외)."""
    found = {}
    for f in (ROOT / "src").rglob("*.ts*"):
        text = f.read_text(encoding="utf-8")
        for m in re.finditer(r"(?<!storage)\.from\(\s*[\"'](\w+)[\"']", text):
            found.setdefault(m.group(1), set()).add(str(f.relative_to(ROOT)))
    return found


# .from('t') 뒤에 이어지는 체인에서 실제로 참조하는 컬럼을 뽑는다.
# 없는 컬럼도 테이블 누락과 똑같이 조용히 실패한다(supabase-js는 throw 대신 {error}).
CHAIN_LEN = 900
FROM_RE = re.compile(r"(?<!storage)\.from\(\s*[\"'](\w+)[\"']\s*\)")
SELECT_RE = re.compile(r"\.select\(\s*[\"'`]([^\"'`]*)[\"'`]", re.S)
FILTER_RE = re.compile(r"\.(?:eq|neq|gt|gte|lt|lte|like|ilike|is|in|order)\(\s*[\"']([A-Za-z_][\w]*)[\"']")


def top_level_select_columns(sel: str):
    """select 문자열에서 '이 테이블의' 컬럼만 돌려준다.

    임베드(`questions(number, type)`)의 괄호 안은 다른 테이블 컬럼이므로 건너뛴다.
    괄호 깊이를 세지 않고 콤마로만 자르면 그 안쪽 이름이 이 테이블 컬럼으로 잘못 잡힌다.
    """
    cols, buf, depth = [], "", 0
    for ch in sel:
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
        elif ch == "," and depth == 0:
            cols.append(buf)
            buf = ""
            continue
        if depth == 0:
            buf += ch
    cols.append(buf)

    out = set()
    for part in cols:
        part = part.strip()
        if not part or part == "*" or "(" in part:
            continue  # 임베드는 이름만 남으므로 제외
        if ":" in part:  # 별칭(alias:col)
            part = part.split(":", 1)[1].strip()
        if re.fullmatch(r"[A-Za-z_]\w*", part):
            out.add(part)
    return out


def referenced_columns():
    """{테이블: {컬럼: {파일…}}}"""
    found = {}
    for f in (ROOT / "src").rglob("*.ts*"):
        text = f.read_text(encoding="utf-8")
        starts = [m.start() for m in FROM_RE.finditer(text)]
        for m in FROM_RE.finditer(text):
            table = m.group(1)
            # 체인은 '다음 .from(' 직전까지다. 안 끊으면 뒤 쿼리의 컬럼이 딸려 들어온다.
            nxt = next((s for s in starts if s > m.start()), len(text))
            chain = text[m.end(): min(nxt, m.end() + CHAIN_LEN)]
            cols = set(FILTER_RE.findall(chain))
            sel = SELECT_RE.search(chain)
            if sel:
                cols |= top_level_select_columns(sel.group(1))
            for c in cols:
                found.setdefault(table, {}).setdefault(c, set()).add(str(f.relative_to(ROOT)))
    return found


def question_bank_leaks():
    """questions를 사용자 클라이언트로 읽는 곳을 찾는다.

    마이그레이션 033이 questions의 공개 SELECT 정책을 없앤 뒤로 anon·authenticated는
    이 표를 한 줄도 못 읽는다. 그런데 supabase-js는 throw 대신 {error}를 주고 읽는 쪽은
    보통 `?? []`라서, 잘못 쓰면 화면이 '문항 0개'로 조용히 멀쩡해 보인다. 실제로 관리자
    문제 관리 세 화면이 그렇게 죽어 있었다(총 0문항 · 수정 열면 목록으로 되튕김).

    판정은 `.from('questions')` 앞에서 가장 가까운 클라이언트 표현으로 한다.
    """
    client = re.compile(r"questionBank\(\)|createAdminClient\(\)|admin\s*\.|supabase\s*\.")
    leaks = []
    for f in sorted((ROOT / "src").rglob("*.ts*")):
        lines = f.read_text(encoding="utf-8").splitlines()
        for i, line in enumerate(lines):
            if "from('questions')" not in line and 'from("questions")' not in line:
                continue
            window = "\n".join(lines[max(0, i - 6): i + 1])
            hits = client.findall(window)
            if not hits or hits[-1].strip().startswith("supabase"):
                leaks.append(f"{f.relative_to(ROOT).as_posix()}:{i + 1}")
    return leaks


def main():
    env = load_env()
    live, live_cols = live_schema(env)
    mig = migration_tables()
    code = code_tables()

    print(f"운영 DB 노출 테이블 {len(live)}개: {', '.join(sorted(live))}\n")

    # 코드가 쓰는데 DB에 없는 것 — 조용히 실패 중인 기능이다.
    broken = {t: fs for t, fs in code.items() if t not in live}
    # 마이그레이션은 있는데 적용 안 된 것
    unapplied = mig - live

    if broken:
        print(f"[치명] 코드가 쓰지만 DB에 없는 테이블 {len(broken)}개:")
        for t, fs in sorted(broken.items()):
            print(f"  - {t}")
            for f in sorted(fs):
                print(f"      {f}")
    if unapplied:
        print(f"\n[경고] 마이그레이션에만 있고 DB에 없는 테이블: {', '.join(sorted(unapplied))}")
        print("       => Supabase SQL Editor에서 해당 마이그레이션을 실행해야 한다.")

    # 컬럼 단위. 테이블이 있어도 없는 컬럼을 고르면 결과가 통째로 비어 돌아온다.
    bad_cols = []
    for table, cols in sorted(referenced_columns().items()):
        known = live_cols.get(table)
        if not known:
            continue  # 없는 테이블은 위에서 이미 보고했다
        for col, files in sorted(cols.items()):
            if col not in known:
                bad_cols.append((table, col, sorted(files)))

    if bad_cols:
        print(f"\n[치명] 코드가 참조하지만 테이블에 없는 컬럼 {len(bad_cols)}개:")
        for table, col, files in bad_cols:
            print(f"  - {table}.{col}")
            for f in files:
                print(f"      {f}")

    leaks = question_bank_leaks()
    if leaks:
        print(f"\n[치명] questions를 사용자 클라이언트로 읽는 곳 {len(leaks)}군데:")
        for leak in leaks:
            print(f"  - {leak}")
        print("       => RLS가 막아 늘 0건이 된다. questionBank()로 읽을 것(마이그레이션 033).")

    if not broken and not unapplied and not bad_cols and not leaks:
        print("불일치 없음 ✓")
        return 0
    return 1


if __name__ == "__main__":
    sys.exit(main())
