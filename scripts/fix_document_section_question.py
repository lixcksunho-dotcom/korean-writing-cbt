# -*- coding: utf-8 -*-
"""공문서 두문·본문·결문 문항(silyong 2025-2 #19)의 선택지와 해설을 고친다.

두 가지 문제가 있었다.
  1. 정답만 길었다 — 선택지 길이가 [2,2,5,2,2]에 정답이 3번이라, 내용을 몰라도
     제일 긴 걸 고르면 맞았다(audit_questions.py의 '정답 길이 튐').
  2. 해설이 틀렸다 — "수신·제목·경유는 두문"이라고 했는데 제목은 본문에 들어간다.
     행정업무 운영 규정상 두문은 발신기관명·수신(참조·경유), 본문은 제목·내용·붙임,
     결문은 발신명의·기안자 서명·시행일 등이다.

선택지를 전부 '○○ ○○' 다섯 글자로 맞추고, 각 항목이 실제로 속한 구역에 맞게 다시 썼다.
"""
import sys
from pathlib import Path

# Windows 콘솔 기본 코드페이지(cp949)에서 한글·em dash가 깨지지 않게.
sys.stdout.reconfigure(encoding="utf-8")

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from supabase_rest import get, patch  # noqa: E402

TARGET = "program=eq.silyong&year=eq.2025&round=eq.2&number=eq.19"

# 다섯 개 모두 다섯 글자 — 길이로 답을 고를 수 없다.
NEW_OPTIONS = [
    "수신 기관",  # 두문
    "문서 제목",  # 본문
    "발신 명의",  # 결문 ← 정답(3)
    "경유 표시",  # 두문
    "붙임 표시",  # 본문
]
NEW_EXPLANATION = (
    "발신 명의는 문서를 보내는 기관·직위를 밝히는 항목으로 결문에 옵니다. "
    "수신 기관과 경유 표시는 두문에, 문서 제목과 붙임 표시는 본문에 들어갑니다."
)


def main():
    rows = get(f"questions?select=id,options,correct_answer,explanation&{TARGET}")
    if len(rows) != 1:
        print(f"대상 문항이 {len(rows)}개 — 중단")
        return 1
    row = rows[0]
    if str(row["correct_answer"]) != "3":
        print(f"정답이 3이 아님({row['correct_answer']}) — 선택지 순서 가정이 깨졌으므로 중단")
        return 1

    patch(f"questions?id=eq.{row['id']}", {"options": NEW_OPTIONS, "explanation": NEW_EXPLANATION})

    after = get(f"questions?select=options,explanation,correct_answer&{TARGET}")[0]
    lens = [len(o) for o in after["options"]]
    print(f"선택지 길이 {lens} (정답 {after['correct_answer']}) — 균일: {len(set(lens)) == 1}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
