# -*- coding: utf-8 -*-
"""빠른 정답 스캔 — 발문·선택지·정답만 뽑아 오답을 눈으로 빠르게 검증한다(해설 생략)."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from supabase_rest import get
CIRC = "①②③④⑤"
rows = get(f"questions?{sys.argv[1]}&select=number,type,question,options,correct_answer&order=number")
out = []
for q in rows:
    head = (q["question"] or "").split("\n")[0][:70]
    out.append(f"#{q['number']} [{q['correct_answer']}] {head}")
    for i, o in enumerate(q.get("options") or []):
        mark = "★" if str(q["correct_answer"]) == str(i+1) else " "
        out.append(f"  {mark}{CIRC[i] if i<5 else i+1} {o}")
    out.append("")
Path(sys.argv[2]).write_text("\n".join(out), encoding="utf-8")
print(f"{len(rows)} rows -> {sys.argv[2]}")
