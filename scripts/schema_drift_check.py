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


def live_tables(env):
    """PostgREST 루트가 노출 중인 테이블 목록을 그대로 알려 준다."""
    r = requests.get(
        f"{env['NEXT_PUBLIC_SUPABASE_URL']}/rest/v1/",
        headers={
            "apikey": env["SUPABASE_SERVICE_ROLE_KEY"],
            "Authorization": f"Bearer {env['SUPABASE_SERVICE_ROLE_KEY']}",
        },
        timeout=30,
    )
    r.raise_for_status()
    return {p.lstrip("/") for p in r.json().get("paths", {}) if p != "/"}


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


def main():
    env = load_env()
    live = live_tables(env)
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

    if not broken and not unapplied:
        print("불일치 없음 ✓")
        return 0
    return 1


if __name__ == "__main__":
    sys.exit(main())
