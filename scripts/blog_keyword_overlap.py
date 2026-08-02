# -*- coding: utf-8 -*-
"""블로그 글끼리 같은 검색어를 두고 경쟁하는지(키워드 잠식) 본다.

글이 늘수록 비슷한 주제를 다시 쓰게 되는데, 두 글이 같은 검색어를 노리면 검색엔진이
어느 쪽을 올릴지 못 정해 둘 다 밀린다. 한쪽을 다른 쪽으로 합치거나 각도를 틀어야 한다.

제목·태그·요약이 얼마나 겹치는지로 재고, 임계값을 넘는 쌍만 보고한다.
사용: python scripts/blog_keyword_overlap.py [임계값]   (기본 0.45)
"""
import json
import re
import sys
from itertools import combinations
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parent.parent
POSTS = ROOT / "src" / "content" / "blog"

TOKEN = re.compile(r"[가-힣A-Za-z0-9]{2,}")
# 거의 모든 글에 들어가 변별력이 없는 말
STOP = {
    "한국실용글쓰기", "실용글쓰기", "실글패스", "시험", "공부", "정리", "방법", "총정리",
    "어떻게", "무엇", "가장", "하는", "위한", "대한", "합격", "준비", "자격증", "국어",
}


def load():
    out = []
    for f in sorted(POSTS.glob("*.json")):
        d = json.load(f.open(encoding="utf-8"))
        words = set()
        for field in (d.get("title", ""), d.get("excerpt", "")):
            words |= {w for w in TOKEN.findall(field) if w not in STOP}
        words |= {t for t in d.get("tags", []) if t not in STOP}
        out.append({"slug": d["slug"], "title": d["title"], "cat": d.get("category"), "words": words})
    return out


def main():
    threshold = float(sys.argv[1]) if len(sys.argv) > 1 else 0.45
    posts = load()
    pairs = []
    for a, b in combinations(posts, 2):
        both = a["words"] & b["words"]
        union = a["words"] | b["words"]
        if not union:
            continue
        sim = len(both) / len(union)
        if sim >= threshold:
            pairs.append((sim, a, b, both))
    pairs.sort(key=lambda p: -p[0])

    print(f"글 {len(posts)}편 · 임계값 {threshold} · 겹치는 쌍 {len(pairs)}")
    for sim, a, b, both in pairs:
        print(f"\n[{sim:.2f}] {a['cat']}")
        print(f"  A: {a['title']}")
        print(f"  B: {b['title']}")
        print(f"  겹치는 말: {', '.join(sorted(both))[:150]}")
    if not pairs:
        print("\n잠식 의심 없음 ✓")
    return 1 if pairs else 0


if __name__ == "__main__":
    sys.exit(main())
