# -*- coding: utf-8 -*-
"""KBS 모의고사 2회(round=2, 100문항)를 REST(service_role)로 삽입. 컬럼 선행 필수."""
import json, urllib.request
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
MOCK = Path(r"C:\Users\선호\AppData\Local\Temp\claude\C--Users---\c04795b9-8d77-49a7-8ca2-3673937b31b2\scratchpad\kbs_mock3")
AUDIO = "https://itzhfbsbwuoedncnjhzt.supabase.co/storage/v1/object/public/question-assets/listening/kbs-2025-3-{}.mp3"
FILES = ["listening.json","vocab.json","grammar.json","writecreate.json","read1.json","read2.json","culture.json"]
ROUND = 3
def env():
    e={}
    for l in (ROOT/".env.local").read_text(encoding="utf-8").splitlines():
        l=l.strip()
        if l and not l.startswith("#") and "=" in l:
            k,v=l.split("=",1); e[k.strip()]=v.strip().strip('"').strip("'")
    return e
def main():
    e=env(); base=e["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/"); key=e["SUPABASE_SERVICE_ROLE_KEY"]
    h={"apikey":key,"Authorization":"Bearer "+key,"Content-Type":"application/json"}
    rows=[]
    for f in FILES:
        for q in json.loads((MOCK/f).read_text(encoding="utf-8")):
            assert len(q["options"])==5 and 1<=int(q["answer"])<=5, f"{f} #{q['number']}"
            rows.append({"program":"kbs","year":2025,"round":ROUND,"number":q["number"],"type":"multiple",
                "question":q["question"],"options":q["options"],"correct_answer":str(int(q["answer"])),
                "explanation":q.get("explanation") or "","points":int(q.get("points",10)),
                "passage":q.get("passage"),"audio_url":AUDIO.format(q["audio"]) if q.get("audio") else None})
    rows.sort(key=lambda r:r["number"])
    nums=[r["number"] for r in rows]
    miss=[n for n in range(1,101) if n not in nums]
    assert len(rows)==100 and not miss, f"{len(rows)}개 누락{miss}"
    urllib.request.urlopen(urllib.request.Request(
        f"{base}/rest/v1/questions?program=eq.kbs&year=eq.2025&round=eq.{ROUND}",
        method="DELETE",headers={**h,"Prefer":"return=minimal"}),timeout=30)
    urllib.request.urlopen(urllib.request.Request(
        f"{base}/rest/v1/questions",method="POST",
        data=json.dumps(rows,ensure_ascii=False).encode("utf-8"),
        headers={**h,"Prefer":"return=minimal"}),timeout=60)
    d=json.loads(urllib.request.urlopen(urllib.request.Request(
        f"{base}/rest/v1/questions?program=eq.kbs&year=eq.2025&round=eq.{ROUND}&select=number,audio_url",headers=h),timeout=30).read())
    print(f"삽입·검증: DB에 {len(d)}문항, 듣기 {sum(1 for x in d if x.get('audio_url'))}개")
if __name__=="__main__": main()
