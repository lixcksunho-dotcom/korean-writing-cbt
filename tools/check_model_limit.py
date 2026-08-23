"""Claude 모델 사용량 한도 도달을 로그의 마지막 실행 블록에서 감지한다.

8/15~16 에 Fable 5 한도("You've reached your Fable 5 limit")가 워커 3회를 죽였고,
당시엔 --model sonnet 고정으로 회피했다. 2026-08-21 사용자 지시로 Fable 을 다시 쓰되,
한도가 나면 .bat 이 sonnet 으로 즉시 폴백하도록 이 스크립트가 판정을 맡는다.
check_auth_failure.py 와 같은 마지막-블록 방식 — 과거 한도 기록에는 반응하지 않는다.

    python check_model_limit.py logs/worker.log
    종료코드: 3 = 마지막 블록에서 한도 메시지 발견(폴백 필요), 0 = 정상
"""

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from check_auth_failure import last_block
from notify import notify

# 실측 문구 둘 다 커버: "You've reached your Fable 5 limit" / "You've hit your session limit"
LIMIT = re.compile(r"You've (reached|hit) your .*limit")


def has_limit(block: str) -> bool:
    return LIMIT.search(block) is not None


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if len(sys.argv) < 2:
        print("usage: check_model_limit.py <logfile>")
        return 0
    p = Path(sys.argv[1])
    if not p.exists():
        return 0
    block, ts = last_block(p.read_text(encoding="utf-8", errors="replace"))
    if has_limit(block):
        print(f"[model-limit] 마지막 블록({ts})에서 한도 메시지 감지 — 폴백 필요")
        try:
            notify(f"모델 한도 도달({p.name}, {ts}) — sonnet 으로 폴백 재시도")
        except Exception:
            pass
        return 3
    return 0


if __name__ == "__main__":
    sys.exit(main())
