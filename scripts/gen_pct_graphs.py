# -*- coding: utf-8 -*-
"""증감률(±%) 표(라벨:값 형식, 음수 포함) → 0기준선 꺾은선 그래프 → 업로드 → 지문 삽입.
대상: 1·2·3회 34번. 실행: python scripts/gen_pct_graphs.py
"""
import io
import json
import re
import urllib.request
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.font_manager as fm
import matplotlib.pyplot as plt
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
BUCKET = "question-assets"
PALETTE = ["#6366f1", "#ef476f", "#22c5d6", "#f59e0b"]
INK = "#1e2433"
for p in [r"C:\Windows\Fonts\NotoSansKR-Bold.ttf", r"C:\Windows\Fonts\NotoSansKR-Medium.ttf"]:
    if Path(p).exists():
        fm.fontManager.addfont(p)
BOLD = fm.FontProperties(fname=r"C:\Windows\Fonts\NotoSansKR-Bold.ttf")
MED = fm.FontProperties(fname=r"C:\Windows\Fonts\NotoSansKR-Medium.ttf")
plt.rcParams["font.family"] = MED.get_name()
plt.rcParams["axes.unicode_minus"] = False

TARGETS = [(1, 34), (2, 34), (3, 34)]


def env():
    d = {}
    for l in (ROOT / ".env.local").read_text(encoding="utf-8").splitlines():
        l = l.strip()
        if l and not l.startswith("#") and "=" in l:
            k, v = l.split("=", 1); d[k.strip()] = v.strip()
    return d


def pnum(s):
    m = re.search(r"[-+]?\d+\.?\d*", s.replace("%", ""))
    return float(m.group(0)) if m else None


def parse_pct(passage):
    lines = [ln.strip() for ln in passage.split("\n") if " / " in ln]
    if len(lines) < 2:
        return None, None, None
    rows = [[c.strip() for c in ln.split("/")] for ln in lines]
    header = rows[0]
    periods = header[1:]
    series = []
    for r in rows[1:]:
        first = r[0]
        if ":" in first:
            label, fv = first.split(":", 1)
            vals = [fv] + r[1:]
        else:
            label, vals = first, r[1:]
        nums = [pnum(v) for v in vals]
        if any(n is None for n in nums) or len(nums) != len(periods):
            return None, None, None
        series.append((label.strip(), nums))
    return periods, series, lines[-1]


def render(periods, series, title):
    allv = [v for _, vs in series for v in vs]
    lo, hi = min(allv), max(allv)
    pad = (hi - lo) * 0.28 + 2
    ymin, ymax = lo - pad, hi + pad
    fig, ax = plt.subplots(figsize=(6.4, 3.7), dpi=140)
    fig.patch.set_facecolor("white")
    x = np.arange(len(periods))
    ax.axhline(0, color="#9aa5b8", lw=1.2, zorder=1)
    for j, (name, vs) in enumerate(series):
        ax.plot(x, vs, marker="o", lw=3, color=PALETTE[j % 4], label=name, zorder=3)
        for xi, v in zip(x, vs):
            ax.text(xi, v + (ymax - ymin) * 0.04, f"{v:+g}%", ha="center",
                    va="bottom" if v >= 0 else "top", fontproperties=BOLD, fontsize=10, color=INK)
    ax.set_xticks(x); ax.set_xticklabels(periods, fontproperties=MED, fontsize=11, color="#586074")
    ax.set_xlim(-0.3, len(periods) - 0.7); ax.set_ylim(ymin, ymax)
    ax.set_yticks([]); ax.tick_params(length=0)
    for sp in ax.spines.values():
        sp.set_visible(False)
    fig.text(0.06, 0.92, title, ha="left", va="center", fontproperties=BOLD, fontsize=14, color=INK)
    ax.legend(prop=MED, fontsize=10, frameon=False, loc="upper center", ncol=len(series), bbox_to_anchor=(0.5, -0.07))
    buf = io.BytesIO(); fig.savefig(buf, format="png", facecolor="white", bbox_inches="tight", pad_inches=0.15)
    plt.close(fig); return buf.getvalue()


def main():
    e = env(); base = e["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/"); key = e["SUPABASE_SERVICE_ROLE_KEY"]
    h = {"apikey": key, "Authorization": "Bearer " + key}
    for rnd, num in TARGETS:
        r = urllib.request.Request(base + f"/rest/v1/questions?year=eq.2025&round=eq.{rnd}&number=eq.{num}&select=id,passage", headers=h)
        row = json.load(urllib.request.urlopen(r, timeout=20))[0]
        p = row["passage"] or ""
        if "![" in p:
            print(f"[{rnd}-{num}] 이미 있음"); continue
        periods, series, last = parse_pct(p)
        if not series:
            print(f"[{rnd}-{num}] 파싱 실패"); continue
        png = render(periods, series, "기간별 증감률 (%)")
        up = urllib.request.Request(f"{base}/storage/v1/object/{BUCKET}/r{rnd}_q{num}.png", method="POST", data=png,
            headers={**h, "Content-Type": "image/png", "x-upsert": "true"})
        urllib.request.urlopen(up, timeout=30)
        url = f"{base}/storage/v1/object/public/{BUCKET}/r{rnd}_q{num}.png"
        newp = p.replace(last, last + "\n" + f"![기간별 증감률]({url})", 1)
        req = urllib.request.Request(f"{base}/rest/v1/questions?id=eq.{row['id']}", method="PATCH",
            data=json.dumps({"passage": newp}).encode(), headers={**h, "Content-Type": "application/json", "Prefer": "return=minimal"})
        urllib.request.urlopen(req, timeout=20)
        print(f"[{rnd}-{num}] 그래프 삽입 · {url}")


if __name__ == "__main__":
    main()
