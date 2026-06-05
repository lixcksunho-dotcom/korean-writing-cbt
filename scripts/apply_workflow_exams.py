"""워크플로우(mock-exam-gen) 결과 JSON을 questions 테이블에 적용한다.
AI 생성 텍스트에 ASCII 따옴표가 섞여 있어 SQL 파싱 방식(apply_questions_sql.py)을 못 쓰므로,
PostgREST(service_role)로 JSON 행을 직접 POST 한다.

사용: python apply_workflow_exams.py <output.json> [--apply]
  --apply 없으면 검증만(드라이런).
"""
import json
import sys
from pathlib import Path
import requests

ENV = Path(__file__).resolve().parent.parent / ".env.local"
YEAR = 2025


def load_env():
    d = {}
    for line in ENV.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        d[k.strip()] = v.strip()
    return d


def norm(s):
    return (s or "").strip() or None


def build_rows(exam):
    rnd = exam["round"]
    rows = []
    mc = sorted(exam["mc"], key=lambda q: q["number"])
    for i, q in enumerate(mc, start=1):
        rows.append({
            "year": YEAR, "round": rnd, "number": i, "type": "multiple", "points": q.get("points", 10),
            "passage": norm(q.get("passage")), "question": q["question"].strip(),
            "options": q["options"], "correct_answer": str(q["correct_answer"]).strip(),
            "explanation": (q.get("explanation") or "").strip(),
        })
    essays = sorted(exam["essays"], key=lambda q: q["number"])
    for i, q in enumerate(essays, start=31):
        rows.append({
            "year": YEAR, "round": rnd, "number": i, "type": "essay", "points": q.get("points"),
            "passage": norm(q.get("passage")), "question": q["question"].strip(),
            "options": None, "correct_answer": (q.get("correct_answer") or "").strip(),
            "explanation": (q.get("explanation") or "").strip(),
        })
    return rows


def validate(exam, rows):
    rnd = exam["round"]
    issues = []
    mc = [r for r in rows if r["type"] == "multiple"]
    es = [r for r in rows if r["type"] == "essay"]
    if len(mc) != 30:
        issues.append(f"객관식 {len(mc)}개(30 아님)")
    if len(es) != 9:
        issues.append(f"서술형 {len(es)}개(9 아님)")
    dist = {str(k): 0 for k in range(1, 6)}
    for r in mc:
        if len(r["options"]) != 5:
            issues.append(f"{r['number']}번 보기 {len(r['options'])}개")
        ca = r["correct_answer"]
        if ca in dist:
            dist[ca] += 1
        else:
            issues.append(f"{r['number']}번 정답 '{ca}' 비정상")
    pts = sum(r["points"] for r in rows)
    report = next((r for r in es if r["number"] == 39), None)
    if report and not report["passage"]:
        issues.append("39번(보고서) 자료(passage) 없음")
    print(f"  [회차 {rnd}] 객관식 {len(mc)} · 서술형 {len(es)} · 총점 {pts}점 · 정답분포 {dist}")
    for it in issues:
        print(f"    ⚠ {it}")
    return not issues


def main():
    src = Path(sys.argv[1])
    apply = "--apply" in sys.argv
    data = json.loads(src.read_text(encoding="utf-8"))
    exams = data["result"]["exams"] if "result" in data else data["exams"]

    env = load_env()
    base = env["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
    key = env["SUPABASE_SERVICE_ROLE_KEY"]
    h = {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"}

    print(f"=== {'적용' if apply else '드라이런(검증만)'} · 회차 {[e['round'] for e in exams]} ===")
    all_ok = True
    prepared = []
    for exam in exams:
        rows = build_rows(exam)
        ok = validate(exam, rows)
        all_ok = all_ok and ok
        prepared.append((exam["round"], rows))

    if not apply:
        print("\n드라이런 완료. 문제 없으면 --apply 로 반영하세요.")
        return

    for rnd, rows in prepared:
        dr = requests.delete(f"{base}/rest/v1/questions?year=eq.{YEAR}&round=eq.{rnd}",
                             headers={**h, "Prefer": "return=minimal"}, timeout=30)
        r = requests.post(f"{base}/rest/v1/questions", headers={**h, "Prefer": "return=minimal"},
                          data=json.dumps(rows, ensure_ascii=False).encode("utf-8"), timeout=60)
        chk = requests.get(f"{base}/rest/v1/questions?year=eq.{YEAR}&round=eq.{rnd}&select=number",
                           headers=h, timeout=30)
        print(f"  회차 {rnd}: DELETE {dr.status_code} · INSERT {r.status_code} · 현재 {len(chk.json())}행")
        if not r.ok:
            print(r.text[:400])


if __name__ == "__main__":
    main()
