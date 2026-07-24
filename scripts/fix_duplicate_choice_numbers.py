# -*- coding: utf-8 -*-
"""선택지 앞에 ①②③이 두 번 찍히던 문제를 고친다.

화면(ExamPlayer·연습)은 선택지 번호를 직접 그리는데, 일부 회차는 options 문자열에도
번호가 들어 있어 '① ①로봇…'처럼 보였다. 자기 순서와 일치하는 번호만 떼어 내
'①번을 고르시오' 같은 본문 속 번호 참조는 건드리지 않는다.
"""
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from supabase_rest import get, patch  # noqa: E402

CIRCLED = "①②③④⑤⑥⑦⑧⑨⑩"


def strip_leading_number(opt: str, idx: int) -> str:
    if not isinstance(opt, str) or idx >= len(CIRCLED):
        return opt
    s = opt.lstrip()
    if s[:1] == CIRCLED[idx]:
        return s[1:].lstrip()
    return opt


def main() -> None:
    dry = "--dry" in sys.argv
    rows = get("questions?select=id,program,year,round,number,options&type=eq.multiple")
    changed = 0
    log = []
    for r in rows:
        opts = r.get("options") or []
        new = [strip_leading_number(o, i) for i, o in enumerate(opts)]
        if new == opts:
            continue
        changed += 1
        log.append(f"[{r['program']} {r['year']}-{r['round']} #{r['number']}] {opts[0]!r} -> {new[0]!r}")
        if not dry:
            patch(f"questions?id=eq.{r['id']}", {"options": new})
    (HERE / "_choice_number_changes.txt").write_text("\n".join(log), encoding="utf-8")
    print(f"{'(dry) ' if dry else ''}{changed}문항 정리")


if __name__ == "__main__":
    main()
