# -*- coding: utf-8 -*-
"""유형별 집중 연습에 '높임 표현 바로잡기'(round 5) 유형을 추가한다.

한국실용글쓰기 서술형에서 자주 나오는 높임법 오류(사물 존대·간접 높임·높임 어휘·
주격조사 등)를 단문 교정으로 연습한다. 국립국어원 표준 언어 예절 기준으로 검수.
멱등: 같은 예문은 다시 넣지 않는다.
"""
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from supabase_rest import get, post  # noqa: E402

PROGRAM, YEAR, ROUND = "silyong", 9001, 5
Q = "다음 문장에서 높임 표현이 잘못된 부분을 바르게 고쳐 쓰시오."

ITEMS = [
    ("주문하신 커피 나오셨습니다.", "나오셨습니다 → 나왔습니다",
     "‘커피’는 높임의 대상이 아니므로 사물을 높인 ‘나오셨습니다’는 잘못입니다. ‘나왔습니다’가 맞습니다."),
    ("부장님 말씀이 계시겠습니다.", "계시겠습니다 → 있으시겠습니다",
     "‘말씀’을 직접 높이는 것은 잘못입니다. 주체(부장님)를 간접적으로 높이는 ‘있으시겠습니다’로 씁니다."),
    ("고객님, 문의하신 상품은 품절이십니다.", "품절이십니다 → 품절입니다",
     "‘상품’의 상태는 높임의 대상이 아니므로 ‘품절입니다’가 맞습니다. 사물을 높이면 안 됩니다."),
    ("손님, 이쪽으로 앉으실게요.", "앉으실게요 → 앉으세요",
     "‘-ㄹ게’는 말하는 이의 의지를 나타내는 어미라 듣는 이에게 쓰면 안 됩니다. ‘앉으세요’가 맞습니다."),
    ("저희 나라는 사계절이 뚜렷합니다.", "저희 나라 → 우리나라",
     "나라나 민족은 낮추어 이르지 않으므로 ‘우리나라’로 써야 합니다."),
    ("할머니께서 진지를 먹는다.", "먹는다 → 잡수신다(드신다)",
     "높임의 대상에게는 높임 어휘를 써서 ‘잡수신다’ 또는 ‘드신다’로 표현합니다."),
    ("선생님께서 지금 교실에 있다.", "있다 → 계신다",
     "사람을 높일 때 ‘있다’의 높임말은 ‘계시다’이므로 ‘계신다’가 맞습니다."),
    ("아버지께서 안방에서 잔다.", "잔다 → 주무신다",
     "‘자다’의 높임 어휘는 ‘주무시다’이므로 ‘주무신다’로 씁니다."),
    ("할아버지께서 감기로 아프다.", "아프다 → 편찮으시다",
     "‘아프다’의 높임 어휘는 ‘편찮으시다’이므로 ‘편찮으시다’로 씁니다."),
    ("궁금한 점은 손님께 물어보고 오겠습니다.", "물어보고 → 여쭤보고",
     "윗사람이나 손님에게 물을 때는 높임 어휘 ‘여쭙다’를 써서 ‘여쭤보고’로 씁니다."),
    ("어머니께 그 사실을 말했다.", "말했다 → 말씀드렸다",
     "높임의 대상에게 말할 때는 ‘말씀드리다’를 써서 ‘말씀드렸다’로 표현합니다."),
    ("교장 선생님이 오신다고 하셨습니다.", "교장 선생님이 → 교장 선생님께서",
     "높임의 주체에는 주격 조사 ‘께서’를 붙여 ‘교장 선생님께서’로 써야 합니다."),
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
    print(f"{len(rows)}개 추가 · round {ROUND}(높임) 총 {len(after)}문항")


if __name__ == "__main__":
    main()
