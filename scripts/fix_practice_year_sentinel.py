# -*- coding: utf-8 -*-
"""유형별 집중 연습 문항의 잘못된 year(2026) → 연습 센티넬(9001) 복구.

증상: 016_practice_types.sql이 의도한 year=9001 대신 2026으로 적재돼
  · /practice/types 는 0문항(기능 사망)
  · /cbt 에는 '모의고사 1~4회'로 잘못 노출(회차 번호가 2025 세트와 중복)
같은 회차를 이미 푼 사용자의 quiz_sessions도 함께 옮겨 기록을 잃지 않게 한다.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from supabase_rest import get, patch  # noqa: E402

PROGRAM = "silyong"
BAD_YEAR, GOOD_YEAR = 2026, 9001
EXPECTED_ROUNDS = {1, 2, 3, 4}


def main() -> None:
    qs = get(f"questions?program=eq.{PROGRAM}&year=eq.{BAD_YEAR}&select=id,round,type")
    if not qs:
        print("이미 정리됨 (year=2026 문항 없음)")
        return

    rounds = {q["round"] for q in qs}
    types = {q["type"] for q in qs}
    # 안전장치: 유형별 연습 세트(서술형 4유형)가 맞을 때만 옮긴다.
    assert rounds <= EXPECTED_ROUNDS, f"예상 밖 회차: {rounds}"
    assert types == {"essay"}, f"예상 밖 유형: {types}"

    sess = get(f"quiz_sessions?program=eq.{PROGRAM}&year=eq.{BAD_YEAR}&select=id")
    print(f"이동 대상: 문항 {len(qs)}개, 학습기록 {len(sess)}건")

    patch(f"questions?program=eq.{PROGRAM}&year=eq.{BAD_YEAR}", {"year": GOOD_YEAR})
    if sess:
        patch(f"quiz_sessions?program=eq.{PROGRAM}&year=eq.{BAD_YEAR}", {"year": GOOD_YEAR})

    after = get(f"questions?program=eq.{PROGRAM}&year=eq.{GOOD_YEAR}&select=round")
    counts = {r: sum(1 for x in after if x["round"] == r) for r in sorted({x["round"] for x in after})}
    left = get(f"questions?program=eq.{PROGRAM}&year=eq.{BAD_YEAR}&select=id")
    print(f"검증: year=9001 회차별 {counts} · year=2026 잔여 {len(left)}건")


if __name__ == "__main__":
    main()
