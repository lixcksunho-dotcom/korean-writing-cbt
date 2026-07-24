# -*- coding: utf-8 -*-
"""띄어쓰기 문항의 ∨ 표기를 일관되게 고친다.

일부 회차는 한 선택지 안에서 ∨와 일반 공백을 섞어 써서, 어디가 띄어 쓴 자리인지
알 수 없었다(정답 선택지만 표기가 달라 답이 새는 문제도 있었다).
'모든 띄어 쓴 자리 = ∨, 일반 공백 없음'으로 통일하고 발문에 범례를 넣는다.
silyong 2025-9 #3 ③은 해설과 선택지가 어긋나 있어(해설: '두 시간'으로 띄어야 함,
선택지: 이미 띄어져 있음) 의도대로 '두시간'으로 바로잡는다.
"""
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from supabase_rest import get, patch  # noqa: E402

LEGEND = " (∨는 띄어 씀을 뜻한다.)"

FIXES = {
    # (program, year, round, number): (발문, 선택지 5개)
    ("silyong", 2025, 6, 3): (
        "다음 중 띄어쓰기가 모두 옳은 것은?" + LEGEND,
        [
            "그가∨떠난∨지∨사흘만에∨소식이∨왔다.",
            "아는∨만큼∨보인다고∨한다.",
            "올만한∨사람은∨다∨왔다.",
            "십∨여∨명이∨회의에∨참석했다.",
            "공부∨하면서∨일도∨한다.",
        ],
    ),
    ("silyong", 2025, 9, 3): (
        "다음 중 띄어쓰기가 바른 것은?" + LEGEND,
        [
            "그가∨떠난∨지도∨벌써∨삼∨년이∨지났다.",
            "내가∨할∨수∨밖에∨없는∨일이다.",
            "회의는∨두시간∨만에∨끝났다.",
            "그∨일을∨한∨지∨십∨년만이다.",
            "너∨만큼∨잘하는∨사람도∨드물다.",
        ],
    ),
}


def main() -> None:
    for (program, year, rnd, num), (question, options) in FIXES.items():
        rows = get(
            f"questions?program=eq.{program}&year=eq.{year}&round=eq.{rnd}&number=eq.{num}&select=id,correct_answer"
        )
        if not rows:
            print(f"없음: {program} {year}-{rnd} #{num}")
            continue
        patch(f"questions?id=eq.{rows[0]['id']}", {"question": question, "options": options})
        print(f"정리: {program} {year}-{rnd} #{num} (정답 {rows[0]['correct_answer']} 유지)")


if __name__ == "__main__":
    main()
