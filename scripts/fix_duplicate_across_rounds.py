# -*- coding: utf-8 -*-
"""회차를 넘나들며 그대로 반복되던 문항을 다른 문제로 교체한다.

question_overlap_check.py가 찾은 두 그룹.
  1. '글쓰기 과정의 일반적 순서' — 1·8·9회차에 사실상 같은 문항(정답까지 동일)
  2. '높임 표현이 바르게 쓰인 것' — 6회차 #9와 9회차 #7이 정답 문장은 물론
     오답 3개까지 겹침

각 그룹에서 가장 앞 회차는 그대로 두고 뒤엣것만 바꾼다. 이용권을 사서 여러 회차를
도는 사람이 같은 문제를 다시 만나면 그게 곧 환불 사유가 된다.

교체 문항은 같은 영역(작문 이론 / 높임법)에서 난이도를 맞춰 새로 썼다.
"""
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from supabase_rest import get, patch  # noqa: E402

# (round, number): 새 문항
REPLACEMENTS = {
    (8, 12): {
        "question": "글을 고쳐 쓸 때 가장 먼저 점검해야 할 것은?",
        "options": [
            "맞춤법과 띄어쓰기가 맞는지",
            "주제가 분명하게 드러나는지",
            "문장의 길이가 적절한지",
            "단어 선택이 자연스러운지",
            "문단의 연결이 매끄러운지",
        ],
        "correct_answer": "2",
        "explanation": (
            "고쳐쓰기는 글 전체(주제·구성) → 문단 → 문장 → 단어 순으로 큰 단위부터 점검합니다. "
            "맞춤법이나 단어 선택 같은 작은 단위를 먼저 손보면, 뒤에서 주제나 구성이 바뀔 때 "
            "그 작업이 모두 헛수고가 됩니다."
        ),
    },
    (9, 12): {
        "question": "주제문을 쓸 때 갖춰야 할 조건으로 가장 적절한 것은?",
        "options": [
            "여러 내용을 한 문장에 담는다",
            "의문문 형태로 독자에게 묻는다",
            "하나의 완결된 평서문으로 쓴다",
            "비유적 표현을 최대한 활용한다",
            "반드시 글의 마지막에 제시한다",
        ],
        "correct_answer": "3",
        "explanation": (
            "주제문은 글에서 말하려는 바를 하나의 완결된 평서문으로 분명히 밝힌 문장입니다. "
            "여러 내용을 한 문장에 담으면 초점이 흐려지고, 의문문이나 비유는 주장을 확정하지 "
            "못합니다. 제시 위치는 두괄식·미괄식 등 구성 방식에 따라 달라지므로 마지막으로 "
            "고정되지 않습니다."
        ),
    },
    (9, 7): {
        "question": "높임 표현이 바르게 쓰인 것은?",
        "options": [
            "할머니께 여쭤볼 말씀이 있습니다.",
            "어머니가 아버지한테 물어보셨다.",
            "지금 커피는 준비 중이십니다.",
            "이 옷은 사이즈가 없으십니다.",
            "저희 나라 전통은 자랑스럽습니다.",
        ],
        "correct_answer": "1",
        "explanation": (
            "'여쭈다'는 웃어른께 묻는 것을 낮춰 이르는 객체 높임 어휘이고 조사 '께'도 바르게 "
            "썼습니다. ② 아버지도 높임 대상이므로 '아버지께 여쭈셨다'로 써야 합니다. "
            "③④ 커피·사이즈는 사물이라 높임의 대상이 아닙니다(사물 존대). "
            "⑤ 나라는 낮출 대상이 아니므로 '저희 나라'가 아니라 '우리나라'로 씁니다."
        ),
    },
}


def main():
    for (rnd, num), new in REPLACEMENTS.items():
        q = f"program=eq.silyong&year=eq.2025&round=eq.{rnd}&number=eq.{num}"
        rows = get(f"questions?select=id,question&{q}")
        if len(rows) != 1:
            print(f"2025-{rnd} #{num}: 대상이 {len(rows)}개 — 건너뜀")
            continue
        patch(f"questions?id=eq.{rows[0]['id']}", new)
        print(f"2025-{rnd} #{num} 교체: {new['question']}")

    print("\n교체 후 중복 재검사가 필요하다: python scripts/question_overlap_check.py 0.35")
    return 0


if __name__ == "__main__":
    sys.exit(main())
