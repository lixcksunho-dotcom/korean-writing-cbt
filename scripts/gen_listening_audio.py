# -*- coding: utf-8 -*-
"""
KBS 듣기 문항용 TTS 오디오 생성기.
- 대본(SCRIPTS)을 edge-tts 무료 뉴럴 음성(ko-KR-SunHiNeural, 여성)으로 mp3 생성
- Supabase Storage 공개 버킷 question-assets/listening/ 에 업로드
- 결정적 공개 URL을 출력 → 이 URL을 마이그레이션 questions.audio_url 에 그대로 넣는다.
- 전부 무료(edge-tts, 자체 Supabase). 유료 API 미사용.

실행: python scripts/gen_listening_audio.py
선행: .env.local 에 NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
"""
import json
import subprocess
import sys
import tempfile
import urllib.request
import urllib.error
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BUCKET = "question-assets"
VOICE = "ko-KR-SunHiNeural"  # 여성 뉴럴
PROGRAM, YEAR, ROUND = "kbs", 2025, 2

# 듣기 대본(오리지널 창작). 화면엔 안 보이고 음성으로만 나간다.
# 대화형은 "남자:/여자:" 화자 표시를 넣어 한 목소리로 읽어도 흐름을 알 수 있게 함.
SCRIPTS = {
    1: ("여러분, 우리가 무심코 쓰는 말 속에는 그 사회의 생각이 담겨 있습니다. "
        "예를 들어 예전에는 직업 이름에 남녀를 구분해 부르는 경우가 많았습니다. "
        "그러나 요즘은 성별을 드러내지 않는 표현으로 바꾸어 쓰는 흐름이 자리 잡고 있습니다. "
        "이는 단순한 말의 변화가 아니라, 서로를 동등하게 대하려는 생각이 말에 반영된 것입니다. "
        "결국 말을 다듬는 일은 곧 우리의 생각을 다듬는 일이기도 합니다."),
    2: ("어느 날 까마귀가 치즈 한 조각을 물고 나뭇가지에 앉았습니다. "
        "그것을 본 여우가 다가와 말했습니다. "
        "까마귀님, 당신의 목소리는 정말 아름답다지요. 한 곡 들려주시겠어요? "
        "우쭐해진 까마귀가 입을 벌려 노래하려는 순간, 치즈가 땅으로 떨어졌고, "
        "여우는 그것을 얼른 물고 달아났습니다."),
    3: ("창밖에는 밤새 눈이 내렸다. "
        "아무도 밟지 않은 마당 위로 "
        "아침 햇살이 조용히 내려앉는다. "
        "나는 그 하얀 고요를 오래도록 바라보았다."),
    4: ("안내 말씀 드립니다. 오늘 오후 두 시부터 도서관 삼 층 열람실은 시설 점검으로 "
        "이용하실 수 없습니다. 자료 열람이 필요하신 분은 일 층 일반 열람실을 이용해 주시기 바랍니다. "
        "점검은 오후 다섯 시에 마무리될 예정입니다. 이용에 불편을 드려 죄송합니다."),
    5: ("남자: 배송이 사흘이나 늦어서 행사에 쓰지 못했습니다. 전액 환불을 원합니다. "
        "여자: 늦어진 점은 정말 죄송합니다. 다만 상품 자체에는 문제가 없어 전액 환불은 어렵습니다. "
        "대신 배송비를 돌려드리고, 다음 구매 때 쓰실 수 있는 할인권을 드리면 어떨까요? "
        "남자: 그럼 할인권 대신, 이번 결제 금액의 일부를 돌려주시면 받아들이겠습니다."),
    6: ("여자: 주말에 등산 가기로 한 거 기억하지? "
        "남자: 아, 맞다. 그런데 일기예보 보니까 토요일에 비가 온대. "
        "여자: 그럼 일요일로 미룰까? "
        "남자: 좋아. 대신 일요일은 아침 일찍 출발하자. 사람 많아지기 전에."),
}


def env():
    e = {}
    for line in (ROOT / ".env.local").read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        e[k.strip()] = v.strip().strip('"').strip("'")
    return e


def tts(text, out_path):
    """edge-tts로 mp3 생성."""
    subprocess.run(
        [sys.executable, "-m", "edge_tts", "--voice", VOICE, "--text", text,
         "--write-media", str(out_path)],
        check=True,
    )


def ensure_bucket(base, key):
    try:
        req = urllib.request.Request(
            base + "/storage/v1/bucket", method="POST",
            data=json.dumps({"id": BUCKET, "name": BUCKET, "public": True}).encode(),
            headers={"Authorization": "Bearer " + key, "apikey": key,
                     "Content-Type": "application/json"})
        urllib.request.urlopen(req, timeout=20)
    except urllib.error.HTTPError:
        pass  # 이미 있으면 통과


def upload(base, key, path, data):
    req = urllib.request.Request(
        f"{base}/storage/v1/object/{BUCKET}/{path}", method="POST", data=data,
        headers={"Authorization": "Bearer " + key, "apikey": key,
                 "Content-Type": "audio/mpeg", "x-upsert": "true"})
    urllib.request.urlopen(req, timeout=60)
    return f"{base}/storage/v1/object/public/{BUCKET}/{path}"


def main():
    e = env()
    base = e["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
    key = e["SUPABASE_SERVICE_ROLE_KEY"]
    ensure_bucket(base, key)
    tmp = Path(tempfile.gettempdir())
    urls = {}
    for n, text in SCRIPTS.items():
        mp3 = tmp / f"kbs_listen_{n}.mp3"
        tts(text, mp3)
        path = f"listening/{PROGRAM}-{YEAR}-{ROUND}-{n}.mp3"
        url = upload(base, key, path, mp3.read_bytes())
        urls[n] = url
        print(f"[{n}] {mp3.stat().st_size} bytes -> {url}")
    # 마이그레이션에 넣기 좋게 매핑 출력
    print("\nAUDIO_URLS_JSON=" + json.dumps(urls, ensure_ascii=False))


if __name__ == "__main__":
    main()
