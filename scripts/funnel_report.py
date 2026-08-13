# -*- coding: utf-8 -*-
"""전환 퍼널을 실제 DB 상태로 다시 계산한다.

관리자 화면(/admin/traffic)은 이벤트만 집계하는데, 이벤트는 두 가지 이유로 실제보다
적게 잡힌다: (1) 트래킹은 2026-07-12부터 있고 (2) 앞단 가드에 막힌 시도는 최근에야
기록하기 시작했다. 그래서 '누가 실제로 무엇을 했는지'는 계정·세션·구독 테이블을
직접 세는 쪽이 정확하다. 여기서는 둘 다 보여 준다.

사용: python scripts/funnel_report.py
"""
import sys
from collections import Counter, defaultdict
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from supabase_rest import env, get  # noqa: E402

import urllib.request  # noqa: E402
import json  # noqa: E402

# 내가 검증용으로 만들고 지우는 계정들 — 통계에서 뺀다.
TEST_EMAIL_MARKS = ("uicheck+", "kbscheck+")


def admin_users():
    e = env()
    base = e["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
    key = e["SUPABASE_SERVICE_ROLE_KEY"]
    req = urllib.request.Request(
        f"{base}/auth/v1/admin/users?per_page=500",
        headers={"apikey": key, "Authorization": "Bearer " + key},
    )
    users = json.loads(urllib.request.urlopen(req, timeout=60).read()).get("users", [])
    return [u for u in users if not any(m in (u.get("email") or "") for m in TEST_EMAIL_MARKS)]


def page_all(path):
    """PostgREST는 한 번에 1000행까지만 준다 — 다 받을 때까지 넘긴다."""
    e = env()
    base = e["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
    key = e["SUPABASE_SERVICE_ROLE_KEY"]
    out, start = [], 0
    while True:
        req = urllib.request.Request(
            f"{base}/rest/v1/{path}",
            headers={
                "apikey": key,
                "Authorization": "Bearer " + key,
                "Range": f"{start}-{start + 999}",
            },
        )
        batch = json.loads(urllib.request.urlopen(req, timeout=60).read())
        out += batch
        if len(batch) < 1000:
            return out
        start += 1000


def pct(n, d):
    return f"{n / d * 100:4.0f}%" if d else "   -"


def automated_visitors(rows):
    """검사 스크립트가 남긴 방문자를 골라낸다.

    사람은 90초 안에 서로 다른 화면 8개를 훑지 않는다. 검사는 그렇게 훑는다.
    2026-08-04에 트래커가 navigator.webdriver를 보고 거르게 했지만, 그 전 기록은
    이 방법으로 걸러야 한다 — 안 그러면 순방문자 대부분이 봇이라 퍼널이 통째로 거짓이 된다.
    """
    from datetime import datetime
    by_visitor = defaultdict(list)
    for r in rows:
        if r["path"].startswith("#event/"):
            continue
        by_visitor[r["visitor_id"]].append((r["created_at"], r["path"]))
    bots = set()
    for vid, items in by_visitor.items():
        items.sort()
        for i in range(len(items)):
            j = i
            paths = set()
            t0 = datetime.fromisoformat(items[i][0].replace("Z", "+00:00"))
            while j < len(items):
                t = datetime.fromisoformat(items[j][0].replace("Z", "+00:00"))
                if (t - t0).total_seconds() > 90:
                    break
                paths.add(items[j][1])
                j += 1
            if len(paths) >= 8:
                bots.add(vid)
                break
    return bots


def main():
    users = admin_users()
    ids = {u["id"] for u in users}

    sessions = [s for s in get("quiz_sessions?select=id,user_id,completed_at,year,round,program&limit=1000")
                if s["user_id"] in ids and (s.get("year") or 0) < 9000]
    subs = [s for s in get("subscriptions?select=user_id,status,amount") if s["user_id"] in ids]

    started = {s["user_id"] for s in sessions}
    finished = {s["user_id"] for s in sessions if s["completed_at"]}
    trial = {u["id"] for u in users if int((u.get("app_metadata") or {}).get("ai_trial_used") or 0) > 0}
    paid = {s["user_id"] for s in subs if (s.get("amount") or 0) > 0}

    n = len(users)
    print("실제 DB 상태 (테스트 계정 제외)")
    print("─" * 52)
    for label, group in [
        ("가입 계정", ids), ("시험 시작", started), ("시험 완료", finished),
        ("AI 첨삭 체험", trial), ("유료 결제", paid),
    ]:
        print(f"  {label:<14}{len(group):>4}   {pct(len(group), n)}")

    print(f"\n  시험완료 → AI체험   {pct(len(finished & trial), len(finished))}")
    print(f"  AI체험  → 결제      {pct(len(trial & paid), len(trial))}")
    print(f"  체험 없이 결제      {len(paid - trial)}명 / {len(paid)}명")

    # 이벤트 쪽(사람 수 기준). 결제창 앞단에서 막힌 시도는 payment_blocked로 남는다.
    rows = page_all("page_views?select=path,visitor_id,created_at,referrer&order=created_at.asc")
    bots = automated_visitors(rows)
    if bots:
        rows = [r for r in rows if r["visitor_id"] not in bots]
    events = [r for r in rows if r["path"].startswith("#event/")]
    views = [r for r in rows if not r["path"].startswith("#event/")]
    uniq = Counter()
    for r in events:
        uniq[r["path"].replace("#event/", "")] = 0
    for name in list(uniq):
        uniq[name] = len({r["visitor_id"] for r in events if r["path"] == f"#event/{name}"})

    bot_note = f" · 자동 검사 {len(bots)}명 제외" if bots else ""
    print(f"\n이벤트 (사람 수) — 페이지뷰 {len(views)} · 순방문자 {len({r['visitor_id'] for r in views})}{bot_note}")
    print("─" * 52)
    for name in ["signup", "exam_completed", "ai_trial_used", "subscribe_view",
                 "payment_blocked", "payment_started", "purchase_success", "payment_fail"]:
        if name in uniq:
            print(f"  {name:<18}{uniq[name]:>4}")
    for name in sorted(set(uniq) - {"signup", "exam_completed", "ai_trial_used", "subscribe_view",
                                    "payment_blocked", "payment_started", "purchase_success", "payment_fail"}):
        print(f"  {name:<18}{uniq[name]:>4}")

    # 결제 실패는 사유를 나눠서 봐야 한다. 사용자가 결제창에서 스스로 닫은 것(PAY_CANCELLED)과
    # 정말 깨진 것을 한 숫자로 묶으면 "실패율 33%"처럼 읽혀서 없는 불을 끄러 가게 된다.
    # 사유는 trackEvent의 meta에 실려 page_views.referrer로 저장된다.
    #
    # 이 목록은 리다이렉트 결제(모바일)가 주소로 돌려주던 코드다. PC 결제창은 포트원 V2
    # 브라우저 SDK가 주는 code를 그대로 싣는데, 그 값의 실물은 아직 못 봤다(2026-08 기준).
    # 처음 보는 코드가 '확인 필요'로 뜨면 사고가 아니라 이 목록에 없는 것일 수 있다 —
    # 실제로 찍힌 값을 보고 넣는다(지어내서 미리 채우지 않는다).
    CANCELLED = {"PAY_CANCELLED", "USER_CANCEL", "CANCEL", "PAY_PROCESS_CANCELED"}
    fails = [r for r in events if r["path"] == "#event/payment_fail"]
    if fails:
        by_reason = Counter((r.get("referrer") or "사유없음") for r in fails)
        cancelled = sum(n for k, n in by_reason.items() if k in CANCELLED)
        print(f"\n결제 실패 {len(fails)}건 — 사용자 취소 {cancelled} · 그 외 {len(fails) - cancelled}")
        print("─" * 52)
        # 날짜를 같이 찍는다. 한 날 한 분에 여러 사유가 몰려 있으면 그건 대개
        # 실패 화면을 눌러 본 것이지 실제 사고가 아니다 — 날짜 없이는 구분이 안 된다.
        when = defaultdict(list)
        for r in fails:
            when[r.get("referrer") or "사유없음"].append(r["created_at"][:10])
        for reason, n in by_reason.most_common():
            days = sorted(set(when[reason]))
            span = days[0] if len(days) == 1 else f"{days[0]}~{days[-1]}"
            mark = "사용자 취소" if reason in CANCELLED else "확인 필요"
            print(f"  {reason:<22}{n:>3}   {mark}   {span}")

    blocked = [r for r in events if r["path"] == "#event/payment_blocked"]
    if blocked:
        print("\n결제 전 막힘 — 화면이 요구한 것을 안 채워서 결제창까지 못 간 경우")
        print("─" * 52)
        for reason, n in Counter((r.get("referrer") or "사유없음") for r in blocked).most_common():
            print(f"  {reason:<22}{n:>3}")

    if events:
        print(f"\n  기간: {events[0]['created_at'][:10]} ~ {events[-1]['created_at'][:10]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
