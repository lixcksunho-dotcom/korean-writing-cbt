# -*- coding: utf-8 -*-
"""유형별 집중 연습에 '표준어 바로 알기'(round 6) 유형을 추가한다.

비표준어를 표준어로 고치는 단문 교정. 표준어 규정 기준으로 검수. 멱등.
"""
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from supabase_rest import get, post  # noqa: E402

PROGRAM, YEAR, ROUND = "silyong", 9001, 6
Q = "다음 문장에서 표준어가 아닌 부분을 표준어로 바르게 고쳐 쓰시오."

ITEMS = [
    ("텃밭에 강남콩을 심었다.", "강남콩 → 강낭콩",
     "어원에서 멀어진 형태가 굳어져 ‘강낭콩’이 표준어입니다."),
    ("윗어른께 공손히 인사드렸다.", "윗어른 → 웃어른",
     "위아래의 대립이 없는 말에는 ‘웃-’을 쓰므로 ‘웃어른’이 표준어입니다."),
    ("삼겹살을 상치에 싸 먹었다.", "상치 → 상추",
     "표준어 규정에 따라 ‘상추’가 표준어입니다."),
    ("떡을 미싯가루에 굴려 먹었다.", "미싯가루 → 미숫가루",
     "‘미숫가루’가 표준어이며 ‘미싯가루’는 비표준어입니다."),
    ("형편이 어려워 삭월세 방을 얻었다.", "삭월세 → 사글세",
     "어원에서 멀어진 ‘사글세’가 표준어로 인정됩니다."),
    ("반찬으로 무우를 채 썰어 무쳤다.", "무우 → 무",
     "‘무우’가 아니라 준 형태인 ‘무’가 표준어입니다."),
    ("그는 으례 아침 일곱 시에 일어난다.", "으례 → 으레",
     "표준어는 ‘으레’이며 ‘으례’는 잘못된 표기입니다."),
    ("길을 잘못 들어 낭떨어지 앞에서 멈췄다.", "낭떨어지 → 낭떠러지",
     "‘낭떠러지’가 표준어입니다."),
    ("배가 고파 자장면을 곱배기로 시켰다.", "곱배기 → 곱빼기",
     "된소리로 적는 ‘곱빼기’가 표준어입니다."),
    ("국물을 내려고 며루치를 넣고 끓였다.", "며루치 → 멸치",
     "‘멸치’가 표준어이며 ‘며루치’는 비표준어입니다."),
    ("봄이 되니 들판에 아지랭이가 피어올랐다.", "아지랭이 → 아지랑이",
     "‘ㅣ’ 역행 동화를 인정하지 않아 ‘아지랑이’가 표준어입니다."),
    ("우리에 숫퇘지 한 마리가 있다.", "숫퇘지 → 수퇘지",
     "수컷을 이르는 접두사는 ‘수-’가 원칙이고 뒤에 ‘ㅎ’이 덧나 ‘수퇘지’로 적습니다."),
]


def main() -> None:
    existing = get(f"questions?program=eq.{PROGRAM}&year=eq.{YEAR}&round=eq.{ROUND}&select=number,question&order=number")
    seen = {r["question"].split("\n")[-1].strip() for r in existing}
    next_num = max([r["number"] for r in existing], default=0)
    rows = []
    for sentence, answer, expl in ITEMS:
        if sentence.strip() in seen:
            continue
        next_num += 1
        rows.append({
            "program": PROGRAM, "year": YEAR, "round": ROUND, "number": next_num,
            "type": "essay", "points": 10, "passage": None,
            "question": f"{Q}\n\n{sentence}", "options": None,
            "correct_answer": answer, "explanation": expl,
        })
    if not rows:
        print("추가할 항목 없음(이미 반영됨)")
        return
    post("questions", rows)
    after = get(f"questions?program=eq.{PROGRAM}&year=eq.{YEAR}&round=eq.{ROUND}&select=number")
    print(f"{len(rows)}개 추가 · round {ROUND}(표준어) 총 {len(after)}문항")


if __name__ == "__main__":
    main()
