# -*- coding: utf-8 -*-
"""문항 검토용 텍스트 덤프. `python scripts/dump_questions.py <rest-filter> <out.txt>`

콘솔이 cp949라 한글이 깨지므로 UTF-8 파일로 떨궈 읽는다.
예) python scripts/dump_questions.py "program=eq.kbs&round=eq.2" out.txt
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from supabase_rest import get  # noqa: E402

CIRCLED = "①②③④⑤"


def main() -> None:
    rows = get(
        f"questions?{sys.argv[1]}&select=number,type,question,options,correct_answer,explanation,passage&order=number"
    )
    out = []
    for q in rows:
        out.append(f"─── {q['number']}번 [{q['type']}] ───")
        if q.get("passage"):
            out.append(f"[지문] {q['passage'][:400]}")
        out.append(q["question"])
        for i, opt in enumerate(q.get("options") or []):
            out.append(f"  {CIRCLED[i] if i < 5 else i + 1} {opt}")
        out.append(f"  ▶ 정답 {q['correct_answer']}")
        exp = (q.get("explanation") or "").split("[듣기 대본]")[0].strip()
        if exp:
            out.append(f"  해설: {exp}")
        out.append("")
    Path(sys.argv[2]).write_text("\n".join(out), encoding="utf-8")
    print(f"{len(rows)} rows -> {sys.argv[2]}")


if __name__ == "__main__":
    main()
