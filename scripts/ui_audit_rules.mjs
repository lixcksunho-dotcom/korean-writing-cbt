// 화면 품질 판정 규칙 — 공개 면 검사(check:contrast, check:mobile)와 로그인 뒤 화면
// 검사(check:ui-authed)가 같은 기준을 쓰도록 여기 모아 둔다.
//
// browser로 시작하는 함수는 page.evaluate에 그대로 넘기는 것이라 바깥 스코프를 참조하면
// 안 된다(직렬화돼서 브라우저 안에서 실행된다).

export const lum = ([r, g, b]) => {
  const c = [r, g, b].map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
export const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
/** 큰 글자(24px 이상, 굵으면 18.66px 이상)는 3, 나머지는 4.5 */
export const contrastBar = (fs, bold) => (fs >= 24 || (fs >= 18.66 && bold) ? 3 : 4.5)

/** 자동으로 뜨는 안내를 '이미 본 것'으로 만들어 스크림이 화면을 덮지 않게 한다. */
export const dismissIntros = () => {
  try {
    localStorage.setItem('kptest_mode_intro_v1', '1')
    sessionStorage.setItem('kpt_schedule_seen_silyong', '1')
    sessionStorage.setItem('kpt_schedule_seen_kbs', '1')
  } catch { /* 저장소가 막힌 환경 */ }
}

/**
 * 글자색 + 조상에서 찾은 배경을 뽑고, 나중에 다시 잡을 표식(data-cc)을 붙인다.
 * 요소 자신의 backgroundColor는 대개 transparent라, 그냥 흰색으로 가정하면
 * 어두운 배경 위 흰 글자가 전부 미달로 잡힌다.
 */
export function browserCollectText() {
  const res = []
  let i = 0
  for (const el of document.querySelectorAll('body *')) {
    // 자기 글자를 직접 가진 요소만 본다. 예전엔 자식 요소가 하나라도 있으면 건너뛰었는데,
    // 그러면 아이콘+글자 버튼(<button><svg/>글자</button>)이 통째로 빠진다.
    // 실제로 결과 화면의 'AI 분석' 버튼이 그렇게 빠져 흰 글자 2.15:1로 남아 있었다.
    const ownText = [...el.childNodes]
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent.trim())
      .join(' ')
      .trim()
    if (!ownText) continue
    const txt = ownText
    const cs = getComputedStyle(el)
    if (cs.visibility === 'hidden' || cs.opacity === '0' || !cs.color.startsWith('rgb')) continue
    if (cs.webkitBackgroundClip === 'text' || cs.backgroundClip === 'text') continue
    // 장식으로 표시한 것(aria-hidden)은 읽으라고 둔 글자가 아니다 — 명암비 대상이 아니다
    if (el.closest('[aria-hidden="true"]')) continue
    const rect = el.getBoundingClientRect()
    if (rect.width < 8 || rect.height < 8) continue

    let p = el, bg = null
    while (p && p !== document.documentElement) {
      const s = getComputedStyle(p)
      if (s.backgroundImage.includes('gradient')) { bg = { kind: 'grad', raw: s.backgroundImage }; break }
      const m = s.backgroundColor.match(/[\d.]+/g)
      if (m && (m.length < 4 || Number(m[3]) > 0.9)) { bg = { kind: 'solid', raw: s.backgroundColor }; break }
      p = p.parentElement
    }
    if (!bg) bg = { kind: 'solid', raw: 'rgb(255,255,255)' }

    el.setAttribute('data-cc', String(i))
    res.push({
      id: i++,
      text: txt.slice(0, 26),
      color: cs.color,
      fs: parseFloat(cs.fontSize),
      bold: parseInt(cs.fontWeight) >= 700,
      bg,
      tag: el.tagName.toLowerCase(),
    })
  }
  return res
}

/** 조상 배경만으로 판정한 값(싸게 거르는 1단). 실제 배경은 픽셀로 확증해야 한다. */
export function cheapContrast(item) {
  const fg = item.color.match(/[\d.]+/g).slice(0, 3).map(Number)
  const fl = lum(fg)
  const stops = item.bg.kind === 'grad'
    ? [...item.bg.raw.matchAll(/rgba?\(([^)]+)\)/g)].map((m) => m[1].split(',').map(Number)).filter((s) => s.length < 4 || s[3] > 0.9)
    : [item.bg.raw.match(/[\d.]+/g).slice(0, 3).map(Number)]
  if (!stops.length) return null
  let worst = Infinity
  for (const s of stops) worst = Math.min(worst, ratio(fl, lum(s.slice(0, 3))))
  return { worst, fl }
}

/**
 * 휴대폰 화면에서 쓸 수 있는 상태인지. 반환값은 항목별 배열이고 판정은 바깥에서 한다.
 * 기준은 WCAG 2.5.8(누름 대상 24px, 문장 속 링크는 예외)과 손가락 크기 권장 44px.
 */
export function browserAuditMobile() {
  const vw = document.documentElement.clientWidth
  const out = { overflow: null, tiny: [], small: [], crowded: [], offscreen: [], covered: [], escaped: [] }

  if (document.documentElement.scrollWidth > vw + 1) {
    const wide = []
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect()
      if (r.width < 1 || r.height < 1) continue
      if (r.right > vw + 1 && getComputedStyle(el).position !== 'fixed') {
        wide.push({ tag: el.tagName.toLowerCase(), right: Math.round(r.right), text: (el.textContent ?? '').trim().slice(0, 20) })
      }
    }
    wide.sort((a, b) => b.right - a.right)
    out.overflow = { scrollWidth: document.documentElement.scrollWidth, vw, worst: wide.slice(0, 3) }
  }

  const tappables = [...document.querySelectorAll('a[href], button, input, select, textarea, [role="button"]')]
    .filter((el) => {
      const cs = getComputedStyle(el)
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false
      const r = el.getBoundingClientRect()
      if (r.width <= 0 || r.height <= 0) return false
      // 화면 낭독기 전용(sr-only) 요소는 눈에 보일 때 제 크기를 갖는다.
      // 숨어 있는 상태(1x1 + clip)로 크기를 재면 '본문 바로가기'가 늘 미달로 잡힌다.
      const clipped = cs.clip !== 'auto' || cs.clipPath !== 'none'
      if (clipped && r.width <= 2 && r.height <= 2) return false
      return true
    })

  // 문장 안에 흐르는 링크는 크기·간격 기준에서 빠진다(WCAG 2.5.8의 inline 예외).
  // 이걸 안 빼면 본문 링크가 전부 걸려 진짜 문제가 묻힌다.
  const isInline = (el) => {
    if (el.tagName !== 'A') return false
    if (!getComputedStyle(el).display.startsWith('inline')) return false
    const p = el.parentElement
    if (!p) return false
    return [...p.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0)
  }
  const label = (el) => (el.getAttribute('aria-label') || el.textContent || el.getAttribute('placeholder') || el.tagName).trim().slice(0, 22)

  for (const el of tappables) {
    const r = el.getBoundingClientRect()
    if (r.right > vw + 1 || r.left < -1) out.offscreen.push({ label: label(el), left: Math.round(r.left), right: Math.round(r.right) })
  }

  const sized = tappables.filter((el) => !isInline(el))
  for (const el of sized) {
    const r = el.getBoundingClientRect()
    const w = Math.round(r.width), h = Math.round(r.height)
    if (w < 24 || h < 24) out.small.push({ label: label(el), w, h, hard: true })
    else if (w < 44 || h < 44) out.small.push({ label: label(el), w, h, hard: false })
  }

  // 규격은 24px보다 작은 대상에만 간격을 요구한다 — 충분히 큰 것끼리는 붙어 있어도 위반이 아니다.
  const undersized = (r) => r.width < 24 || r.height < 24
  for (let i = 0; i < sized.length; i++) {
    const a = sized[i].getBoundingClientRect()
    for (let j = i + 1; j < sized.length; j++) {
      const b = sized[j].getBoundingClientRect()
      if (!undersized(a) && !undersized(b)) continue
      if (sized[i].contains(sized[j]) || sized[j].contains(sized[i])) continue
      const dx = Math.max(0, Math.max(a.left, b.left) - Math.min(a.right, b.right))
      const dy = Math.max(0, Math.max(a.top, b.top) - Math.min(a.bottom, b.bottom))
      if (dx === 0 && dy === 0) continue
      const gap = Math.hypot(dx, dy)
      if (gap > 0 && gap < 24) {
        out.crowded.push({
          a: (sized[i].textContent || sized[i].tagName).trim().slice(0, 16),
          b: (sized[j].textContent || sized[j].tagName).trim().slice(0, 16),
          gap: Math.round(gap),
        })
      }
    }
  }

  for (const el of document.querySelectorAll('body *')) {
    if (el.children.length > 0) continue
    const txt = el.textContent?.trim()
    if (!txt || txt.length < 2) continue
    const fs = parseFloat(getComputedStyle(el).fontSize)
    if (fs && fs < 12) out.tiny.push({ text: txt.slice(0, 20), fs })
  }

  // transform이 걸린 조상 안의 position:fixed는 화면이 아니라 그 조상 기준이 되어,
  // 팝업이 화면 아래로 밀려 버튼을 못 누르게 된다(가입 직후 안내 팝업이 실제로 그랬다).
  for (const f of document.querySelectorAll('body *')) {
    if (getComputedStyle(f).position !== 'fixed') continue
    const fr = f.getBoundingClientRect()
    if (fr.height < 20) continue
    const over = Math.round(Math.max(0, fr.bottom - innerHeight))
    if (over < 20) continue
    if (fr.top >= innerHeight) continue // 통째로 화면 밖 = 일부러 숨긴 것
    const hidden = [...f.querySelectorAll('a[href], button, [role="button"]')]
      .filter((x) => x.getBoundingClientRect().top >= innerHeight)
    if (!hidden.length) continue
    out.escaped.push({ what: label(f).slice(0, 20), over, hidden: hidden.length })
  }

  // 떠다니는 버튼이 조작 위에 앉아 있는지. 화면 폭을 꽉 채우는 하단 바는 뺀다
  // — 본문을 덮는 게 그 물건의 본질이고 스크롤하면 지나간다.
  for (const f of document.querySelectorAll('body *')) {
    if (getComputedStyle(f).position !== 'fixed') continue
    const fr = f.getBoundingClientRect()
    if (fr.height < 20 || fr.width < 20 || fr.top > innerHeight || fr.bottom < 0) continue
    if (fr.width >= vw * 0.9) continue
    for (const t of document.querySelectorAll('a[href], button, [role="button"]')) {
      if (f.contains(t) || t.contains(f)) continue
      if (getComputedStyle(t).position === 'fixed') continue
      const tr = t.getBoundingClientRect()
      if (tr.height < 8 || tr.width < 8) continue
      const ov = Math.max(0, Math.min(fr.right, tr.right) - Math.max(fr.left, tr.left)) *
                 Math.max(0, Math.min(fr.bottom, tr.bottom) - Math.max(fr.top, tr.top))
      const pct = Math.round((ov / (tr.width * tr.height)) * 100)
      if (pct < 5) continue
      // 덮인 쪽도 화면에 붙어 있으면(고정·스티키 안) 스크롤해도 안 비켜서 영영 못 누른다.
      // 본문 위에 잠깐 겹치는 것과는 무게가 다르다.
      let anc = t.parentElement, pinned = false
      while (anc && anc !== document.body) {
        const ps = getComputedStyle(anc).position
        if (ps === 'fixed' || ps === 'sticky') { pinned = true; break }
        anc = anc.parentElement
      }
      out.covered.push({ over: label(f).slice(0, 16), under: label(t).slice(0, 16), pct, pinned })
    }
  }
  return out
}

/** 휴대폰 검사 결과를 사람이 읽는 줄로 바꾼다. */
export function mobileProblemLines(path, r) {
  const uniq = (arr, key) => [...new Map(arr.map((x) => [key(x), x])).values()]
  const out = []
  if (r.overflow) {
    const w = r.overflow.worst.map((x) => `<${x.tag}> ${x.right}px "${x.text}"`).join(' / ')
    out.push({ hard: true, line: `${path}  가로 스크롤 ${r.overflow.scrollWidth}px > 화면 ${r.overflow.vw}px — ${w}` })
  }
  for (const x of uniq(r.offscreen, (v) => v.label)) out.push({ hard: true, line: `${path}  화면 밖 누름대상 "${x.label}" (left ${x.left}, right ${x.right})` })
  for (const x of uniq(r.small, (v) => v.label + v.w + v.h).slice(0, 6)) {
    out.push({ hard: x.hard, line: `${path}  ${x.hard ? '누름대상 24px 미만' : '누름대상 권장(44px) 미만'} ${x.w}x${x.h} "${x.label}"` })
  }
  for (const x of uniq(r.crowded, (v) => v.a + v.b).slice(0, 4)) out.push({ hard: true, line: `${path}  누름대상 간격 ${x.gap}px "${x.a}" ↔ "${x.b}"` })
  for (const x of uniq(r.tiny, (v) => v.text).slice(0, 4)) out.push({ hard: x.fs < 11, line: `${path}  ${x.fs}px 글자 "${x.text}"` })
  for (const x of uniq(r.escaped, (v) => v.what)) out.push({ hard: true, line: `${path}  떠 있는 "${x.what}"가 화면 아래로 ${x.over}px 나감 — 버튼 ${x.hidden}개가 화면 밖` })
  for (const x of uniq(r.covered, (v) => v.over + v.under)) {
    out.push({
      hard: x.pinned,
      line: `${path}  떠 있는 "${x.over}"가 ${x.pinned ? '화면에 붙어 있는 ' : ''}"${x.under}"를 ${x.pct}% 덮음`,
    })
  }
  return out
}
