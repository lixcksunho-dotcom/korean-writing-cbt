# -*- coding: utf-8 -*-
"""전 회차 자료제시형 문항의 수치 표를 자동 파싱 → 그래프 생성 → Supabase 업로드 → 지문 삽입.
실행: python scripts/auto_graph_all.py
"""
import io
import json
import re
import sys
import urllib.request
import urllib.error
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.font_manager as fm
import matplotlib.pyplot as plt
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
BUCKET = "question-assets"
PALETTE = ["#6366f1", "#22c5d6", "#f59e0b", "#ef476f", "#10b981", "#8b5cf6"]
INK = "#1e2433"

for p in [r"C:\Windows\Fonts\NotoSansKR-Bold.ttf", r"C:\Windows\Fonts\NotoSansKR-Medium.ttf"]:
    if Path(p).exists():
        fm.fontManager.addfont(p)
BOLD = fm.FontProperties(fname=r"C:\Windows\Fonts\NotoSansKR-Bold.ttf")
MED = fm.FontProperties(fname=r"C:\Windows\Fonts\NotoSansKR-Medium.ttf")
plt.rcParams["font.family"] = MED.get_name()
plt.rcParams["axes.unicode_minus"] = False

TARGETS = [(1, 34), (1, 39), (2, 34), (2, 39), (3, 34), (3, 39),
           (5, 39), (6, 39), (8, 27), (8, 28), (8, 34), (8, 39)]


def env():
    d = {}
    for l in (ROOT / ".env.local").read_text(encoding="utf-8").splitlines():
        l = l.strip()
        if l and not l.startswith("#") and "=" in l:
            k, v = l.split("=", 1); d[k.strip()] = v.strip()
    return d


def pnum(s):
    s = s.replace(",", "").replace("%", "").strip()
    tot = 0.0; matched = False
    for unit, mul in [("억", 1e8), ("만", 1e4), ("천", 1e3)]:
        m = re.search(r"(\d+\.?\d*)\s*" + unit, s)
        if m:
            tot += float(m.group(1)) * mul; matched = True
    if matched:
        return tot
    m = re.search(r"-?\d+\.?\d*", s)
    return float(m.group(0)) if m else None


def first_numeric_table(passage):
    """passage에서 숫자가 든 ' / ' 연속 줄(표) 첫 블록 반환: (rows, last_line)."""
    lines = passage.split("\n")
    block = []; last = None
    for ln in lines:
        if " / " in ln:
            block.append(ln.strip())
            if re.search(r"\d", ln):
                last = ln.strip()
        elif block:
            if last:
                break
            block = []
    if not last:
        return None, None
    rows = [[c.strip() for c in ln.split("/")] for ln in block]
    return rows, last


def _style(ax, title, ymax):
    for sp in ax.spines.values():
        sp.set_visible(False)
    ax.set_yticks([]); ax.tick_params(length=0)
    for gy in [ymax * 0.33, ymax * 0.66, ymax]:
        ax.axhline(gy, color="#eef1f6", lw=1, zorder=0)
    ax.set_ylim(0, ymax)
    ax.set_title(title, fontproperties=BOLD, fontsize=14, color=INK, loc="left", pad=12)


def to_png(fig):
    buf = io.BytesIO()
    fig.savefig(buf, format="png", facecolor="white", bbox_inches="tight", pad_inches=0.15)
    plt.close(fig); return buf.getvalue()


def render(rows, title):
    """rows[0]=헤더. 2열=단일막대, 3열↑=그룹막대(시간헤더면 꺾은선)."""
    header = rows[0]; body = rows[1:]
    body = [r for r in body if len(r) == len(header) and any(re.search(r"\d", c) for c in r[1:])]
    if not body or len(header) < 2:
        return None
    ncol = len(header)
    if ncol == 2:
        labels = [r[0] for r in body]
        vals = [pnum(r[1]) for r in body]
        if any(v is None for v in vals):
            return None
        disp = [r[1] for r in body]
        ymax = max(vals) * 1.25
        fig, ax = plt.subplots(figsize=(6.0, 3.4), dpi=140); fig.patch.set_facecolor("white")
        xs = range(len(labels))
        ax.bar(xs, vals, width=0.55, color=[PALETTE[i % 6] for i in range(len(labels))], zorder=3)
        for x, v, dd in zip(xs, vals, disp):
            ax.text(x, v + ymax * 0.03, dd, ha="center", va="bottom", fontproperties=BOLD, fontsize=11, color=INK)
        ax.set_xticks(list(xs)); ax.set_xticklabels(labels, fontproperties=MED, fontsize=10.5, color="#586074")
        _style(ax, title, ymax)
        return to_png(fig)
    # multi-col
    cats = header[1:]
    series = []
    for r in body:
        vs = [pnum(c) for c in r[1:]]
        if any(v is None for v in vs):
            return None
        series.append((r[0], vs))
    allv = [v for _, vs in series for v in vs]
    ymax = max(allv) * 1.28
    is_time = any(k in " ".join(cats) for k in ["년", "시점", "연도", "월", "분기"])
    fig, ax = plt.subplots(figsize=(6.4, 3.7), dpi=140); fig.patch.set_facecolor("white")
    x = np.arange(len(cats))
    if is_time and len(series) <= 4:
        for j, (name, vs) in enumerate(series):
            ax.plot(x, vs, marker="o", lw=3, color=PALETTE[j % 6], label=name, zorder=3)
            for xi, v in zip(x, vs):
                ax.text(xi, v + ymax * 0.03, f"{v:g}", ha="center", va="bottom", fontproperties=MED, fontsize=9, color=INK)
        ax.set_xlim(-0.3, len(cats) - 0.7)
    else:
        m = len(series); w = 0.8 / m
        for j, (name, vs) in enumerate(series):
            off = (j - (m - 1) / 2) * w
            ax.bar(x + off, vs, width=w * 0.92, color=PALETTE[j % 6], zorder=3, label=name)
            for xi, v in zip(x + off, vs):
                ax.text(xi, v + ymax * 0.02, f"{v:g}", ha="center", va="bottom", fontproperties=MED, fontsize=8.5, color=INK)
    ax.set_xticks(x); ax.set_xticklabels(cats, fontproperties=MED, fontsize=10.5, color="#586074")
    _style(ax, title, ymax)
    ax.legend(prop=MED, fontsize=9.5, frameon=False, loc="upper center", ncol=min(len(series), 4), bbox_to_anchor=(0.5, -0.07))
    return to_png(fig)


def upload(e, path, data):
    base = e["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/"); key = e["SUPABASE_SERVICE_ROLE_KEY"]
    req = urllib.request.Request(f"{base}/storage/v1/object/{BUCKET}/{path}", method="POST", data=data,
        headers={"Authorization": "Bearer " + key, "apikey": key, "Content-Type": "image/png", "x-upsert": "true"})
    urllib.request.urlopen(req, timeout=30)
    return f"{base}/storage/v1/object/public/{BUCKET}/{path}"


def main():
    e = env()
    base = e["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/"); key = e["SUPABASE_SERVICE_ROLE_KEY"]
    h = {"apikey": key, "Authorization": "Bearer " + key}
    ok = skip = 0
    for rnd, num in TARGETS:
        r = urllib.request.Request(base + f"/rest/v1/questions?year=eq.2025&round=eq.{rnd}&number=eq.{num}&select=id,passage", headers=h)
        row = json.load(urllib.request.urlopen(r, timeout=20))[0]
        passage = row["passage"] or ""
        if "![" in passage:
            print(f"[{rnd}-{num}] 이미 그래프 있음 — 건너뜀"); skip += 1; continue
        rows, last = first_numeric_table(passage)
        if not rows:
            print(f"[{rnd}-{num}] 표 미검출 — 건너뜀"); skip += 1; continue
        png = render(rows, "자료 그래프")
        if not png:
            print(f"[{rnd}-{num}] 수치 파싱 실패 — 건너뜀"); skip += 1; continue
        url = upload(e, f"r{rnd}_q{num}.png", png)
        md = f"![자료 그래프]({url})"
        newp = passage.replace(last, last + "\n" + md, 1)
        body = json.dumps({"passage": newp}).encode()
        req = urllib.request.Request(f"{base}/rest/v1/questions?id=eq.{row['id']}", method="PATCH", data=body,
            headers={**h, "Content-Type": "application/json", "Prefer": "return=minimal"})
        urllib.request.urlopen(req, timeout=20)
        print(f"[{rnd}-{num}] 그래프 삽입 완료 · {url}"); ok += 1
    print(f"=== 완료: 삽입 {ok} · 건너뜀 {skip} ===")


if __name__ == "__main__":
    main()
