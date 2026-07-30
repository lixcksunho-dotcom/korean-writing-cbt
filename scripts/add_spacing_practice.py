# -*- coding: utf-8 -*-
"""유형별 집중 연습에 '띄어쓰기 다지기'(round 7) 유형을 추가한다.

의존 명사·단위 명사·조사 등 자주 틀리는 띄어쓰기를 단문 교정으로 연습. 멱등.
정답은 '<붙여쓴 부분> → <바르게 띄운 부분>' 형식(기존 공문서 유형과 동일).
"""
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from supabase_rest import get, post  # noqa: E402

PROGRAM, YEAR, ROUND = "silyong", 9001, 7
Q = "다음 문장에서 띄어쓰기가 잘못된 부분을 바르게 고쳐 쓰시오."

ITEMS = [
    ("아는것이 힘이다.", "아는것이 → 아는 것이",
     "‘것’은 의존 명사이므로 관형어 ‘아는’과 띄어 씁니다."),
    ("노력하면 나도 할수있다.", "할수있다 → 할 수 있다",
     "‘수’는 의존 명사이므로 ‘할 수 있다’처럼 띄어 씁니다."),
    ("그를 만난지 십년만에 다시 만났다.", "만난지 십년만에 → 만난 지 십 년 만에",
     "시간의 경과를 나타내는 ‘지’·‘만’은 의존 명사라 띄어 쓰고, 단위 명사 ‘년’도 띄어 씁니다."),
    ("접시에 먹을만큼만 담아라.", "먹을만큼 → 먹을 만큼",
     "‘만큼’이 관형어 뒤에 오면 의존 명사이므로 ‘먹을 만큼’으로 띄어 씁니다."),
    ("그뿐만아니라 마음씨도 곱다.", "그뿐만아니라 → 그뿐만 아니라",
     "‘뿐’은 체언 뒤 조사라 ‘그뿐’으로 붙이고, ‘아니라’는 띄어 ‘그뿐만 아니라’로 씁니다."),
    ("이제는 갈데가 없다.", "갈데 → 갈 데",
     "‘데’는 곳·장소를 뜻하는 의존 명사이므로 ‘갈 데’로 띄어 씁니다."),
    ("집에 도착하는대로 연락할게.", "도착하는대로 → 도착하는 대로",
     "‘대로’가 관형어 뒤에 오면 의존 명사이므로 띄어 ‘도착하는 대로’로 씁니다."),
    ("사흘동안 아무것도 먹지 못했다.", "사흘동안 → 사흘 동안",
     "‘동안’은 명사이므로 앞말과 띄어 ‘사흘 동안’으로 씁니다."),
    ("노력한만큼 좋은 결과가 나온다.", "노력한만큼 → 노력한 만큼",
     "관형어 ‘노력한’ 뒤의 ‘만큼’은 의존 명사라 띄어 씁니다."),
    ("그 일을 시작한지 오래되었다.", "시작한지 → 시작한 지",
     "시간의 경과를 나타내는 ‘지’는 의존 명사이므로 ‘시작한 지’로 띄어 씁니다."),
    ("나는 지금 최선을 다할뿐이다.", "다할뿐이다 → 다할 뿐이다",
     "관형어 ‘다할’ 뒤의 ‘뿐’은 의존 명사이므로 띄어 ‘다할 뿐이다’로 씁니다."),
    ("하늘을 보니 곧 비가 올듯하다.", "올듯하다 → 올 듯하다",
     "‘듯’은 의존 명사이므로 관형어 ‘올’과 띄어 ‘올 듯하다’로 씁니다."),
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
    print(f"{len(rows)}개 추가 · round {ROUND}(띄어쓰기) 총 {len(after)}문항")


if __name__ == "__main__":
    main()
