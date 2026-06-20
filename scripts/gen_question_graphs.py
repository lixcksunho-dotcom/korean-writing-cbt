# -*- coding: utf-8 -*-
"""자료제시형 문항용 그래프 이미지 생성 → Supabase Storage 업로드 → 지문에 이미지 삽입.
실제 한국실용글쓰기 시험처럼 표뿐 아니라 그래프 그림을 자료로 제시하기 위함.
실행: python scripts/gen_question_graphs.py
"""
import io
import json
import urllib.request
import urllib.error
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.font_manager as fm
import matplotlib.pyplot as plt

ROOT = Path(__file__).resolve().parent.parent
BUCKET = "question-assets"
PALETTE = ["#6366f1", "#22c5d6", "#f59e0b", "#ef476f"]
INK = "#1e2433"

# 한글 폰트
for p in [r"C:\Windows\Fonts\NotoSansKR-Bold.ttf", r"C:\Windows\Fonts\NotoSansKR-Medium.ttf",
          r"C:\Windows\Fonts\malgun.ttf"]:
    if Path(p).exists():
        fm.fontManager.addfont(p)
BOLD = fm.FontProperties(fname=r"C:\Windows\Fonts\NotoSansKR-Bold.ttf") if Path(r"C:\Windows\Fonts\NotoSansKR-Bold.ttf").exists() else None
MED = fm.FontProperties(fname=r"C:\Windows\Fonts\NotoSansKR-Medium.ttf") if Path(r"C:\Windows\Fonts\NotoSansKR-Medium.ttf").exists() else None
plt.rcParams["axes.unicode_minus"] = False
if MED:
    plt.rcParams["font.family"] = MED.get_name()


def env():
    d = {}
    for l in (ROOT / ".env.local").read_text(encoding="utf-8").splitlines():
        l = l.strip()
        if l and not l.startswith("#") and "=" in l:
            k, v = l.split("=", 1); d[k.strip()] = v.strip()
    return d


def _style(ax, title, ymax):
    for sp in ax.spines.values():
        sp.set_visible(False)
    ax.set_yticks([])
    ax.tick_params(length=0)
    for gy in [ymax * 0.33, ymax * 0.66, ymax]:
        ax.axhline(gy, color="#eef1f6", lw=1, zorder=0)
    ax.set_ylim(0, ymax)
    ax.set_title(title, fontproperties=BOLD, fontsize=15, color=INK, loc="left", pad=14)


def fig_to_png(fig):
    buf = io.BytesIO()
    fig.savefig(buf, format="png", facecolor="white", bbox_inches="tight", pad_inches=0.15)
    plt.close(fig)
    return buf.getvalue()


def bar_single(title, labels, values, unit=""):
    fig, ax = plt.subplots(figsize=(6.0, 3.4), dpi=140)
    fig.patch.set_facecolor("white")
    ymax = max(values) * 1.25
    xs = range(len(labels))
    ax.bar(xs, values, width=0.55, color=[PALETTE[i % 4] for i in range(len(labels))], zorder=3)
    for x, v in zip(xs, values):
        ax.text(x, v + ymax * 0.03, f"{v:g}{unit}", ha="center", va="bottom",
                fontproperties=BOLD, fontsize=12, color=INK)
    ax.set_xticks(list(xs)); ax.set_xticklabels(labels, fontproperties=MED, fontsize=11, color="#586074")
    _style(ax, title, ymax)
    return fig_to_png(fig)


def bar_grouped(title, cats, series, unit=""):
    # series: list of (name, [values])
    fig, ax = plt.subplots(figsize=(6.2, 3.6), dpi=140)
    fig.patch.set_facecolor("white")
    allv = [v for _, vs in series for v in vs]
    ymax = max(allv) * 1.28
    n = len(cats); m = len(series); w = 0.8 / m
    import numpy as np
    x = np.arange(n)
    for j, (name, vs) in enumerate(series):
        off = (j - (m - 1) / 2) * w
        ax.bar(x + off, vs, width=w * 0.92, color=PALETTE[j % 4], zorder=3, label=name)
        for xi, v in zip(x + off, vs):
            ax.text(xi, v + ymax * 0.02, f"{v:g}", ha="center", va="bottom",
                    fontproperties=MED, fontsize=9.5, color=INK)
    ax.set_xticks(x); ax.set_xticklabels(cats, fontproperties=MED, fontsize=11, color="#586074")
    _style(ax, title, ymax)
    ax.legend(prop=MED, fontsize=10, frameon=False, loc="upper center", ncol=m, bbox_to_anchor=(0.5, -0.08))
    return fig_to_png(fig)


def line_multi(title, cats, series, unit=""):
    fig, ax = plt.subplots(figsize=(6.2, 3.6), dpi=140)
    fig.patch.set_facecolor("white")
    allv = [v for _, vs in series for v in vs]
    ymax = max(allv) * 1.3
    import numpy as np
    x = np.arange(len(cats))
    for j, (name, vs) in enumerate(series):
        ax.plot(x, vs, marker="o", lw=3, color=PALETTE[j % 4], label=name, zorder=3)
        for xi, v in zip(x, vs):
            ax.text(xi, v + ymax * 0.03, f"{v:g}{unit}", ha="center", va="bottom",
                    fontproperties=BOLD, fontsize=10, color=INK)
    ax.set_xticks(x); ax.set_xticklabels(cats, fontproperties=MED, fontsize=11, color="#586074")
    ax.set_xlim(-0.3, len(cats) - 0.7)
    _style(ax, title, ymax)
    ax.legend(prop=MED, fontsize=10, frameon=False, loc="upper center", ncol=len(series), bbox_to_anchor=(0.5, -0.08))
    return fig_to_png(fig)


def upload(e, path, data):
    base = e["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/"); key = e["SUPABASE_SERVICE_ROLE_KEY"]
    # 버킷 보장
    try:
        req = urllib.request.Request(base + "/storage/v1/bucket", method="POST",
            data=json.dumps({"id": BUCKET, "name": BUCKET, "public": True}).encode(),
            headers={"Authorization": "Bearer " + key, "apikey": key, "Content-Type": "application/json"})
        urllib.request.urlopen(req, timeout=20)
    except urllib.error.HTTPError:
        pass
    req = urllib.request.Request(f"{base}/storage/v1/object/{BUCKET}/{path}", method="POST", data=data,
        headers={"Authorization": "Bearer " + key, "apikey": key, "Content-Type": "image/png", "x-upsert": "true"})
    urllib.request.urlopen(req, timeout=30)
    return f"{base}/storage/v1/object/public/{BUCKET}/{path}"


def patch_passage_append(e, number, image_md, after_line=None):
    """해당 문항 passage 끝(또는 after_line 다음)에 image_md 줄을 삽입."""
    base = e["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/"); key = e["SUPABASE_SERVICE_ROLE_KEY"]
    h = {"apikey": key, "Authorization": "Bearer " + key, "Content-Type": "application/json"}
    r = urllib.request.Request(f"{base}/rest/v1/questions?year=eq.2025&round=eq.4&number=eq.{number}&select=id,passage", headers=h)
    row = json.load(urllib.request.urlopen(r, timeout=20))[0]
    p = row["passage"] or ""
    if image_md in p:
        return "이미 있음"
    if after_line and after_line in p:
        p = p.replace(after_line, after_line + "\n" + image_md, 1)
    else:
        p = p.rstrip() + "\n" + image_md
    body = json.dumps({"passage": p}).encode()
    req = urllib.request.Request(f"{base}/rest/v1/questions?id=eq.{row['id']}", method="PATCH", data=body,
        headers={**h, "Prefer": "return=minimal"})
    urllib.request.urlopen(req, timeout=20)
    return "패치 완료"


def main():
    e = env()
    YRS = ["1차 시점", "2차 시점", "3차 시점"]
    jobs = []
    # 객관식 27: 국내/해외 매출 비중 추이 (line)
    jobs.append(("q27.png", "부문별 매출 비중 추이 (단위 %)",
                 line_multi("부문별 매출 비중 추이 (단위 %)", YRS,
                            [("국내", [68, 60, 52]), ("해외", [32, 40, 48])], unit=""), 27,
                 "해외 / 32 / 40 / 48"))
    # 객관식 28: 전자책 대출 (bar, 만 건)
    jobs.append(("q28.png", "전자책 대출 건수 (만 건)",
                 bar_single("전자책 대출 건수 (만 건)", ["2022년", "2023년", "2024년"], [1, 1.5, 3], unit=""), 28,
                 "2024년 / 3만 건"))
    # 서34: 연령별 인구 변화 (grouped bar)
    jobs.append(("e34.png", "연령별 인구 변화 (명)",
                 bar_grouped("연령별 인구 변화 (명)", YRS,
                             [("65세 이상", [8200, 9600, 11200]), ("0~14세", [5400, 4100, 2900])]), 34,
                 "0∼14세 / 5400 / 4100 / 2900"))
    # 서39: 계층별 디지털 정보화 수준 (bar)
    jobs.append(("e39.png", "계층별 디지털 정보화 수준 (전체=100)",
                 bar_single("계층별 디지털 정보화 수준 (전체=100)",
                            ["고령층", "장애인", "농어민", "저소득층"], [69.9, 82.2, 78.9, 95.6]), 39,
                 "저소득층 / 95.6"))

    for fname, alt, png, num, after in jobs:
        url = upload(e, fname, png)
        md = f"![{alt}]({url})"
        res = patch_passage_append(e, num, md, after_line=after)
        print(f"[{num}] {fname} 업로드 → {res}\n     {url}")


if __name__ == "__main__":
    main()
