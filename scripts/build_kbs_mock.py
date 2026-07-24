# -*- coding: utf-8 -*-
"""KBS 모의고사 1회 조립기: 영역별 JSON → 마이그레이션 031_kbs_mock_1.sql.
각 JSON(vocab/grammar/writecreate/read1/read2/culture)은 {number,question,options[5],answer,explanation,points,passage} 배열.
listening.json은 audio 필드(→audio_url) 추가. 100문항 검증 후 SQL 생성."""
import json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MOCK = Path(r"C:\Users\선호\AppData\Local\Temp\claude\C--Users---\c04795b9-8d77-49a7-8ca2-3673937b31b2\scratchpad\kbs_mock")
AUDIO = "https://itzhfbsbwuoedncnjhzt.supabase.co/storage/v1/object/public/question-assets/listening/kbs-2025-1-{}.mp3"
FILES = ["listening.json", "vocab.json", "grammar.json", "writecreate.json", "read1.json", "read2.json", "culture.json"]


def esc(s):
    return str(s).replace("'", "''")


def main():
    rows = []
    for f in FILES:
        p = MOCK / f
        if not p.exists():
            print(f"[!] 없음: {f}"); sys.exit(1)
        data = json.loads(p.read_text(encoding="utf-8"))
        print(f"{f}: {len(data)}문항")
        for q in data:
            opts = q["options"]
            assert len(opts) == 5, f"{f} #{q['number']} 보기 {len(opts)}개"
            assert 1 <= int(q["answer"]) <= 5, f"{f} #{q['number']} answer {q['answer']}"
            rows.append(q)
    rows.sort(key=lambda x: x["number"])
    nums = [r["number"] for r in rows]
    missing = [n for n in range(1, 101) if n not in nums]
    dups = [n for n in nums if nums.count(n) > 1]
    print(f"총 {len(rows)}문항, 번호 {min(nums)}~{max(nums)}, 누락:{missing}, 중복:{sorted(set(dups))}")
    if len(rows) != 100 or missing or dups:
        print("[!] 100문항/1~100 불일치 — 중단"); sys.exit(1)

    out = ["-- KBS한국어능력시험 모의고사 1회 (program=kbs, year=2025, round=1, 100문항)",
           "-- 오리지널 창작(저작권 안전). 듣기(1~15)는 audio_url 음성. 선행: 026,028.",
           "-- Supabase SQL Editor에서 실행.",
           "DELETE FROM public.questions WHERE program='kbs' AND year=2025 AND round=1;",
           "INSERT INTO public.questions (program,year,round,number,type,question,options,correct_answer,explanation,points,passage,audio_url) VALUES"]
    vals = []
    for q in rows:
        n = q["number"]
        opts_json = json.dumps(q["options"], ensure_ascii=False)
        passage = "NULL" if not q.get("passage") else f"'{esc(q['passage'])}'"
        audio = f"'{AUDIO.format(q['audio'])}'" if q.get("audio") else "NULL"
        vals.append(
            f"('kbs',2025,1,{n},'multiple','{esc(q['question'])}',"
            f"'{esc(opts_json)}'::jsonb,'{int(q['answer'])}','{esc(q.get('explanation') or '')}',"
            f"{int(q.get('points',10))},{passage},{audio})"
        )
    out.append(",\n".join(vals) + ";")
    dst = ROOT / "supabase" / "migrations" / "031_kbs_mock_1.sql"
    dst.write_text("\n".join(out) + "\n", encoding="utf-8")
    print(f"[OK] {dst} 생성 ({len(rows)}문항)")


if __name__ == "__main__":
    main()
