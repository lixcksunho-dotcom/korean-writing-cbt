# -*- coding: utf-8 -*-
"""KBS 듣기 문항 해설에 '듣기 대본'을 덧붙인다.

듣기 문항은 음성만 있어, 오답을 확인할 때 무엇을 놓쳤는지 되짚을 방법이 없었다.
대본은 gen_listening_mock{,2,3}.py의 SCRIPTS(음성 생성에 쓴 원문)를 그대로 가져온다.
시험 중에는 노출되지 않고 채점 후 해설에서만 보이므로 듣기 연습을 해치지 않는다.
"""
import importlib.util
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from supabase_rest import get, patch  # noqa: E402

MARKER = "[듣기 대본]"
# 회차 → 대본을 담고 있는 생성 스크립트
SOURCES = {1: "gen_listening_mock.py", 2: "gen_listening_mock2.py", 3: "gen_listening_mock3.py"}


def load_scripts(filename: str) -> dict:
    spec = importlib.util.spec_from_file_location(filename.replace(".py", ""), HERE / filename)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.SCRIPTS


def main() -> None:
    updated = skipped = 0
    for rnd, filename in SOURCES.items():
        scripts = load_scripts(filename)
        rows = get(
            f"questions?program=eq.kbs&round=eq.{rnd}&audio_url=not.is.null"
            "&select=id,number,explanation&order=number"
        )
        for row in rows:
            script = scripts.get(row["number"])
            if not script:
                continue
            current = row.get("explanation") or ""
            if MARKER in current:
                skipped += 1
                continue
            merged = f"{current}\n\n{MARKER}\n{script}".strip()
            patch(f"questions?id=eq.{row['id']}", {"explanation": merged})
            updated += 1
        print(f"{rnd}회: {len(rows)}문항 처리")

    print(f"대본 추가 {updated}건 · 이미 있어 건너뜀 {skipped}건")


if __name__ == "__main__":
    main()
