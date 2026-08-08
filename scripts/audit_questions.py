# -*- coding: utf-8 -*-
"""문항 데이터 정합성 감사. 사람이 다 읽지 않고도 잡히는 결함만 자동으로 걸러 낸다.

검사 항목
  1. 선택지 개수·정답 번호 범위
  2. 선택지 중복
  3. 해설이 가리키는 번호와 correct_answer 불일치 (예: 정답은 3인데 해설이 "정답은 ②")
  4. 지문을 가리키는 발문("다음 글", "위 글" 등)인데 passage가 비어 있음
  5. 정답 선택지만 유난히 길거나 짧음 (길이로 답이 새는 문항)
  6. 서술형인데 모범답안(correct_answer)이 없음
  7. 발문이 완전히 같은 중복 문항
결과는 UTF-8 파일로 떨군다(콘솔 cp949로는 한글이 깨짐).
"""
import re
import sys
import urllib.request
from collections import defaultdict
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from supabase_rest import get  # noqa: E402

CIRCLED = "①②③④⑤"
NUM_WORDS = {"①": 1, "②": 2, "③": 3, "④": 4, "⑤": 5, "1번": 1, "2번": 2, "3번": 3, "4번": 4, "5번": 5}
# 해설이 정답을 다시 언급하는 관용 표현 — 여기서 뽑은 번호가 correct_answer와 달라야 의심
ANSWER_PHRASE = re.compile(r"정답은\s*([①-⑤]|[1-5]번)")
# 지문이 있어야 성립하는 발문
NEEDS_PASSAGE = re.compile(r"(다음 글|윗글|위 글|위의 글|제시문|다음 문단|다음 도표|다음 자료)")


def label(q: dict) -> str:
    return f"{q['program']} {q['year']}-{q['round']} #{q['number']}"


def main() -> None:
    rows = get(
        "questions?select=id,program,year,round,number,type,question,options,correct_answer,explanation,passage,audio_url"
        "&order=program,year,round,number"
    )
    issues: dict[str, list[str]] = defaultdict(list)
    seen_question: dict[str, str] = {}

    for q in rows:
        opts = q.get("options") or []
        ans = (q.get("correct_answer") or "").strip()
        exp = q.get("explanation") or ""
        text = q.get("question") or ""

        if q["type"] == "multiple":
            if len(opts) != 5:
                issues["선택지 개수 이상"].append(f"{label(q)} — {len(opts)}개")
            if not ans.isdigit() or not 1 <= int(ans) <= 5:
                issues["정답 번호 이상"].append(f"{label(q)} — {ans!r}")
            stripped = [o.strip() for o in opts if isinstance(o, str) and o.strip()]
            if len(set(stripped)) != len(stripped):
                issues["선택지 중복"].append(f"{label(q)}")

            m = ANSWER_PHRASE.search(exp)
            if m and ans.isdigit():
                said = NUM_WORDS.get(m.group(1))
                if said and said != int(ans):
                    issues["해설-정답 불일치"].append(f"{label(q)} — 정답 {ans} / 해설 {m.group(1)}")

            if ans.isdigit() and len(stripped) == 5:
                lens = [len(o) for o in stripped]
                i = int(ans) - 1
                others = [l for j, l in enumerate(lens) if j != i]
                if lens[i] > max(others) * 1.8 or lens[i] * 1.8 < min(others):
                    issues["정답 길이 튐"].append(f"{label(q)} — 길이 {lens} (정답 {ans})")
        else:
            if not ans:
                issues["서술형 모범답안 없음"].append(label(q))

        if NEEDS_PASSAGE.search(text.split("\n")[0]) and not (q.get("passage") or "").strip():
            # 발문 본문에 지문을 직접 붙여 둔 형태는 정상 — 줄바꿈 뒤 내용이 충분하면 통과
            body = text.partition("\n")[2].strip()
            if len(body) < 40:
                issues["지문 없음"].append(f"{label(q)} — {text[:50]}")

        # 발문만 같은 것은 정상(같은 유형이 회차마다 반복). 지문·선택지까지 같아야 진짜 중복.
        key = re.sub(
            r"\s+", " ", text + "|" + (q.get("passage") or "") + "|" + "|".join(str(o) for o in opts)
        ).strip()
        if key in seen_question:
            issues["문항 중복"].append(f"{label(q)} ↔ {seen_question[key]}")
        else:
            seen_question[key] = label(q)

    # 듣기 문항은 음성 파일이 열려야 풀 수 있다. 파일이 사라지면 화면은 멀쩡한데
    # 그 문항만 답을 고를 수 없게 된다 — 어떤 화면 검사로도 안 잡힌다.
    audio = {}
    for q in rows:
        url = q.get("audio_url")
        if url:
            audio.setdefault(url, []).append(label(q))
    if audio:
        import urllib.error
        broken = 0
        for url, uses in audio.items():
            try:
                req = urllib.request.Request(url, method="HEAD")
                code = urllib.request.urlopen(req, timeout=20).status
            except urllib.error.HTTPError as e:
                code = e.code
            except Exception as e:  # 연결 자체가 안 되는 경우
                code = f"연결 실패({type(e).__name__})"
            if code != 200:
                broken += 1
                issues["듣기 음성이 열리지 않음"].append(f"{uses[0]} 외 {len(uses) - 1}문항 — {code} {url[:80]}")
        print(f"듣기 음성 {len(audio)}개 확인 — 열리지 않음 {broken}개")

    out = HERE / "_question_audit.txt"
    lines = [f"검사 문항 {len(rows)}개\n"]
    for k in sorted(issues):
        lines.append(f"── {k} ({len(issues[k])}건)")
        lines.extend(f"   {v}" for v in issues[k])
        lines.append("")
    out.write_text("\n".join(lines), encoding="utf-8")
    print(f"이슈 {sum(len(v) for v in issues.values())}건 → {out}")


if __name__ == "__main__":
    main()
