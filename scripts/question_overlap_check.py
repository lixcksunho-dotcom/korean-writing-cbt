# -*- coding: utf-8 -*-
"""회차 간에 사실상 같은 문항이 반복되는지 재 본다.

audit_questions.py는 발문이 '완전히 같은' 중복만 잡는다. 하지만 실제로 물어보는 게
같은데 발문만 다른 경우가 더 흔하다(예: 강낭콩·웃어른·사글세를 4개 회차에서 반복).
이용권을 사서 여러 회차를 도는 사람에게는 이쪽이 훨씬 크게 체감된다.

선택지 겹침만 보면 오판이 많다. 두괄식/미괄식처럼 '선택지 풀은 같고 묻는 건 다른'
정상 문항이 흔하기 때문이다. 그래서 세 조건을 모두 만족할 때만 중복으로 본다.
  1. 선택지 어휘가 많이 겹치고
  2. 발문도 비슷하며
  3. 정답 '텍스트'가 같다  ← 이게 핵심. 답이 다르면 다른 문제다.
같은 회차 안은 제외(한 회차에서 같은 소재를 다르게 묻는 건 정상).

사용: python scripts/question_overlap_check.py [임계값]   (기본 0.5)
"""
import re
import sys
from itertools import combinations
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from supabase_rest import get  # noqa: E402

OUT = HERE / "_question_overlap.txt"
# 어휘형 문항(외래어·표준어·맞춤법)에서 반복이 문제 된다 — 지문 해석형은 소재가 달라 무의미.
TOKEN = re.compile(r"[가-힣]{2,}")
STOP = {"다음", "것은", "옳은", "바른", "표기", "표준어", "맞춤법", "외래어", "문장", "모두", "묶인", "중에서"}


def tokens(q):
    words = set()
    for opt in q.get("options") or []:
        words |= {w for w in TOKEN.findall(str(opt)) if w not in STOP}
    return words


def answer_text(q):
    """정답 번호가 가리키는 선택지 문구. 답이 다르면 소재가 같아도 다른 문제다."""
    opts = q.get("options") or []
    try:
        i = int(str(q.get("correct_answer")).strip()) - 1
    except (TypeError, ValueError):
        return None
    return str(opts[i]).strip() if 0 <= i < len(opts) else None


def stem_sim(a, b):
    ta = {w for w in TOKEN.findall(a.get("question") or "") if w not in STOP}
    tb = {w for w in TOKEN.findall(b.get("question") or "") if w not in STOP}
    return len(ta & tb) / len(ta | tb) if (ta | tb) else 0.0


def main():
    threshold = float(sys.argv[1]) if len(sys.argv) > 1 else 0.5
    rows = get("questions?select=program,year,round,number,question,passage,options,correct_answer&type=eq.multiple&limit=2000")
    # 센티넬(연습 전용 year>=9000)은 회차 개념이 없어 제외
    rows = [r for r in rows if (r.get("year") or 0) < 9000]
    for r in rows:
        r["_t"] = tokens(r)
    rows = [r for r in rows if len(r["_t"]) >= 4]

    pairs = []
    for a, b in combinations(rows, 2):
        if (a["program"], a["year"], a["round"]) == (b["program"], b["year"], b["round"]):
            continue
        if a["program"] != b["program"]:
            continue
        inter = a["_t"] & b["_t"]
        union = a["_t"] | b["_t"]
        sim = len(inter) / len(union)
        if sim < threshold:
            continue
        # 정답 문구가 다르면 소재만 겹칠 뿐 다른 문제다.
        # 단, 완전 일치로 보면 '내용 조직하기'와 '조직하기'처럼 표기만 다른 같은 답을 놓친다.
        ans_a, ans_b = answer_text(a), answer_text(b)
        if not ans_a or not ans_b:
            continue
        wa, wb = set(TOKEN.findall(ans_a)), set(TOKEN.findall(ans_b))
        if not (wa | wb) or len(wa & wb) / len(wa | wb) < 0.7:
            continue
        ssim = stem_sim(a, b)
        if ssim < 0.4:
            continue
        # 지문이 다르면 같은 걸 묻는 게 아니다. 접속어 문항이 대표적인데, 선택지 풀이
        # (그러나·따라서·그리고…) 원래 좁아서 지문을 안 보면 전부 중복으로 보인다.
        pa, pb = (a.get("passage") or "").strip(), (b.get("passage") or "").strip()
        if pa or pb:
            wa, wb = set(TOKEN.findall(pa)), set(TOKEN.findall(pb))
            if not (wa & wb) or len(wa & wb) / max(len(wa | wb), 1) < 0.5:
                continue
        pairs.append((sim, ssim, a, b, ans_a))

    pairs.sort(key=lambda p: (-p[1], -p[0]))
    lines = [
        f"비교 대상 {len(rows)}문항 · 선택지 임계값 {threshold} · "
        f"정답까지 같은 중복 {len(pairs)}쌍\n"
    ]
    for sim, ssim, a, b, ans in pairs:
        lines.append(
            f"[선택지 {sim:.2f} · 발문 {ssim:.2f}] "
            f"{a['program']} {a['year']}-{a['round']} #{a['number']}"
            f"  ↔  {b['program']} {b['year']}-{b['round']} #{b['number']}\n"
            f"    A: {a['question'][:70]}\n"
            f"    B: {b['question'][:70]}\n"
            f"    같은 정답: {ans}\n"
        )
    OUT.write_text("\n".join(lines), encoding="utf-8")
    print("\n".join(lines[:1]))
    print(f"자세한 목록 → {OUT}")
    return 1 if pairs else 0


if __name__ == "__main__":
    sys.exit(main())
