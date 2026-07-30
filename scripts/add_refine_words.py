# -*- coding: utf-8 -*-
"""순화어 O/X 퀴즈 데이터(refine-words.json) 확충.

국립국어원 '다듬은 말' 기준으로 검수한 항목만 추가한다. 'wrong'(순화 대상)이
이미 있으면 건너뛴다(멱등). 카테고리는 기존과 동일한 이름을 쓴다.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "src" / "data" / "refine-words.json"

# (category, 순화 대상, 다듬은 말)
NEW = [
    # 외래어
    ("외래어", "스크린도어", "안전문"),
    ("외래어", "키오스크", "무인 안내기, 무인 단말기"),
    ("외래어", "팩트체크", "사실 확인"),
    ("외래어", "인프라", "기반 시설"),
    ("외래어", "워라밸", "일과 삶의 균형"),
    ("외래어", "테이크아웃", "포장, 포장 구매"),
    ("외래어", "리모델링", "새 단장"),
    ("외래어", "큐레이션", "선별, 골라 주기"),
    ("외래어", "얼리어답터", "앞선 사용자"),
    ("외래어", "블랙컨슈머", "악덕 소비자"),
    ("외래어", "노키즈존", "어린이 제한 공간"),
    ("외래어", "다크서클", "눈 그늘"),
    ("외래어", "언박싱", "개봉, 뜯어보기"),
    # 일본어 투 용어
    ("일본어 투 용어", "유도리", "융통, 융통성"),
    ("일본어 투 용어", "소데나시", "민소매"),
    ("일본어 투 용어", "나가리", "무효, 깨짐"),
    ("일본어 투 용어", "삐끼", "호객꾼"),
    ("일본어 투 용어", "우와기", "윗옷, 상의"),
    ("일본어 투 용어", "나라비", "줄서기"),
    # 한자어
    ("한자어", "명일", "내일"),
    ("한자어", "금일", "오늘"),
    ("한자어", "작일", "어제"),
    ("한자어", "익월", "다음 달"),
    ("한자어", "상기", "위, 앞의"),
    ("한자어", "하기", "아래, 다음"),
]


def main() -> None:
    data = json.loads(DATA.read_text(encoding="utf-8"))
    existing = {x["wrong"] for x in data}
    added = 0
    for cat, wrong, correct in NEW:
        if wrong in existing:
            continue
        data.append({"category": cat, "wrong": wrong, "correct": correct})
        existing.add(wrong)
        added += 1
    DATA.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    import collections
    c = collections.Counter(x["category"] for x in data)
    print(f"{added}개 추가 · 총 {len(data)}항목 · 카테고리 {dict(c)}")


if __name__ == "__main__":
    main()
