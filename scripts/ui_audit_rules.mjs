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
 *
 * 색은 반드시 캔버스로 sRGB 바이트까지 환산해서 넘긴다. Tailwind 4의 팔레트 색
 * (text-gray-500 등)은 계산값이 rgb()가 아니라 lab()으로 나온다. 문자열을 그냥
 * 믿으면 두 가지가 조용히 어긋난다 — 글자색은 rgb가 아니라고 통째로 건너뛰고,
 * 배경은 lab(65.9 -0.8 -8.1)에서 숫자만 긁어 rgb(65.9,-0.8,-8.1)로 오독한다.
 * 관리자 화면을 재 보니 글자 12개 중 1개만 검사되고 있었다.
 */
export function browserCollectText() {
  const res = []
  let i = 0
  const cv = document.createElement('canvas')
  cv.width = cv.height = 1
  const cx = cv.getContext('2d', { willReadFrequently: true })
  const rgbaCache = new Map()
  /** 브라우저가 아는 모든 색 표기 → [r,g,b,투명도]. 못 읽으면 null. */
  const toRgba = (css) => {
    if (rgbaCache.has(css)) return rgbaCache.get(css)
    let out = null
    cx.clearRect(0, 0, 1, 1)
    cx.fillStyle = '#000'
    cx.fillStyle = css
    cx.fillRect(0, 0, 1, 1)
    try {
      const d = cx.getImageData(0, 0, 1, 1).data
      out = [d[0], d[1], d[2], d[3] / 255]
    } catch { /* 캔버스가 막힌 환경 */ }
    rgbaCache.set(css, out)
    return out
  }
  // 그러데이션 안의 색 토큰. color-mix처럼 괄호가 겹치는 표기는 여기서 안 잡히는데,
  // 그건 stops가 비면 판정을 건너뛰므로 오탐이 아니라 미검출로 남는다.
  const COLOR_TOKEN = /(?:rgba?|hsla?|oklch|oklab|lab|lch|color)\([^()]*\)|#[0-9a-fA-F]{3,8}\b/g

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
    if (cs.visibility === 'hidden' || cs.opacity === '0') continue
    const fg = toRgba(cs.color)
    if (!fg) continue
    if (cs.webkitBackgroundClip === 'text' || cs.backgroundClip === 'text') continue
    // 장식으로 표시한 것(aria-hidden)은 읽으라고 둔 글자가 아니다 — 명암비 대상이 아니다
    if (el.closest('[aria-hidden="true"]')) continue
    const rect = el.getBoundingClientRect()
    if (rect.width < 8 || rect.height < 8) continue

    let p = el, bg = null
    while (p && p !== document.documentElement) {
      const s = getComputedStyle(p)
      if (s.backgroundImage.includes('gradient')) {
        const stops = (s.backgroundImage.match(COLOR_TOKEN) ?? [])
          .map(toRgba).filter((c) => c && c[3] > 0.9).map((c) => c.slice(0, 3))
        if (stops.length) { bg = { kind: 'grad', stops, raw: s.backgroundImage }; break }
      }
      const solid = toRgba(s.backgroundColor)
      if (solid && solid[3] > 0.9) { bg = { kind: 'solid', stops: [solid.slice(0, 3)], raw: s.backgroundColor }; break }
      p = p.parentElement
    }
    if (!bg) bg = { kind: 'solid', stops: [[255, 255, 255]], raw: 'rgb(255,255,255)' }

    el.setAttribute('data-cc', String(i))
    res.push({
      id: i++,
      text: txt.slice(0, 26),
      color: `rgb(${fg[0]}, ${fg[1]}, ${fg[2]})`,
      rgb: fg.slice(0, 3),
      fs: parseFloat(cs.fontSize),
      bold: parseInt(cs.fontWeight) >= 700,
      bg,
      tag: el.tagName.toLowerCase(),
    })
  }
  return res
}

/**
 * 글자가 아닌 것의 명암비 — 아이콘만 있는 단추와 입력칸 안내글(placeholder).
 * 둘 다 browserCollectText가 구조적으로 못 본다: 아이콘은 텍스트 노드가 없고,
 * placeholder는 DOM에 글자로 존재하지 않는다. 실제로 원고지 기록의 뒤로 가기
 * 화살표가 2.60이었는데 어느 검사에도 안 걸렸다.
 *
 * 기준은 WCAG 1.4.11(사용자 인터페이스 구성요소·그래픽 3:1). 안내글은 글자라
 * 4.5를 쓴다. 배경은 조상에서 찾은 값만 쓴다 — 입력칸과 아이콘 단추는 배경이
 * 자기 자신이거나 바로 위 카드라 픽셀 확증 없이도 어긋나지 않는다.
 */
export function browserAuditGraphics() {
  const cv = document.createElement('canvas')
  cv.width = cv.height = 1
  const cx = cv.getContext('2d', { willReadFrequently: true })
  const cache = new Map()
  const toRgba = (css) => {
    if (cache.has(css)) return cache.get(css)
    let out = null
    cx.clearRect(0, 0, 1, 1)
    cx.fillStyle = '#000'
    cx.fillStyle = css
    cx.fillRect(0, 0, 1, 1)
    try { const d = cx.getImageData(0, 0, 1, 1).data; out = [d[0], d[1], d[2], d[3] / 255] } catch { /* 막힌 환경 */ }
    cache.set(css, out)
    return out
  }
  const COLOR_TOKEN = /(?:rgba?|hsla?|oklch|oklab|lab|lch|color)\([^()]*\)|#[0-9a-fA-F]{3,8}\b/g
  const bgOf = (start) => {
    for (let p = start; p && p !== document.documentElement; p = p.parentElement) {
      const s = getComputedStyle(p)
      if (s.backgroundImage.includes('gradient')) {
        const stops = (s.backgroundImage.match(COLOR_TOKEN) ?? []).map(toRgba).filter((c) => c && c[3] > 0.9)
        if (stops.length) return { stops: stops.map((c) => c.slice(0, 3)), raw: s.backgroundImage }
      }
      const solid = toRgba(s.backgroundColor)
      if (solid && solid[3] > 0.9) return { stops: [solid.slice(0, 3)], raw: s.backgroundColor }
    }
    return { stops: [[255, 255, 255]], raw: 'rgb(255,255,255)' }
  }
  const visible = (el) => {
    const cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false
    const r = el.getBoundingClientRect()
    return r.width >= 8 && r.height >= 8
  }

  const out = []
  // 1) 아이콘만 있는 단추·링크. 글자가 같이 있으면 아이콘은 장식이라 대상이 아니다.
  for (const el of document.querySelectorAll('a[href], button, [role="button"]')) {
    if (!visible(el)) continue
    if ((el.textContent ?? '').trim()) continue
    // 사진을 감싼 링크는 아이콘 단추가 아니다 — 보이는 내용은 사진 쪽이다.
    if (el.querySelector('img')) continue
    const svg = el.querySelector('svg')
    if (!svg || el.closest('[aria-hidden="true"]')) continue
    // 겹쳐 둔 덮개 안의 아이콘은 평소 opacity:0으로 숨어 있다(마우스를 올려야 뜬다).
    // 숨은 상태로 재면 뒤 배경과 비교하게 돼 '흰 바탕에 흰 아이콘 1.00' 같은 게 나온다.
    let hidden = false
    for (let p = svg; p && p !== el.parentElement; p = p.parentElement) {
      if (parseFloat(getComputedStyle(p).opacity) === 0) { hidden = true; break }
    }
    if (hidden) continue
    const cs = getComputedStyle(svg)
    // lucide 아이콘은 stroke="currentColor"라 color가 실제 칠하는 색이다
    const src = cs.stroke && cs.stroke !== 'none' ? cs.stroke : cs.fill && cs.fill !== 'none' ? cs.fill : cs.color
    const fg = toRgba(src)
    if (!fg || fg[3] < 0.5) continue
    out.push({
      kind: '아이콘',
      name: (el.getAttribute('aria-label') || el.getAttribute('title') || '이름 없음').slice(0, 24),
      rgb: fg.slice(0, 3), bg: bgOf(el), bar: 3,
    })
  }
  // 2) 입력칸 안내글
  for (const el of document.querySelectorAll('input[placeholder], textarea[placeholder]')) {
    if (!visible(el)) continue
    const ph = getComputedStyle(el, '::placeholder')
    const fg = toRgba(ph.color || getComputedStyle(el).color)
    if (!fg || fg[3] < 0.5) continue
    out.push({
      kind: '안내글',
      name: (el.getAttribute('placeholder') || '').slice(0, 24),
      rgb: fg.slice(0, 3), bg: bgOf(el), bar: parseFloat(ph.fontSize || '14') >= 24 ? 3 : 4.5,
    })
  }
  return out
}

/** browserAuditGraphics 결과를 사람이 읽는 줄로 바꾼다. 기준 미달만 남긴다. */
export function graphicsProblemLines(path, items) {
  const lines = []
  const seen = new Set()
  for (const it of items) {
    const fl = lum(it.rgb)
    let worst = Infinity
    for (const s of it.bg.stops) worst = Math.min(worst, ratio(fl, lum(s)))
    if (worst >= it.bar) continue
    const key = it.kind + it.name + it.rgb.join()
    if (seen.has(key)) continue
    seen.add(key)
    lines.push(`${path}  ${it.kind} ${worst.toFixed(2)} (필요 ${it.bar})  "${it.name}"  색 rgb(${it.rgb.join(',')}) / 배경 ${it.bg.raw}`)
  }
  return lines
}

/** 조상 배경만으로 판정한 값(싸게 거르는 1단). 실제 배경은 픽셀로 확증해야 한다. */
export function cheapContrast(item) {
  const fl = lum(item.rgb)
  const stops = item.bg.stops
  if (!stops?.length) return null
  let worst = Infinity
  for (const s of stops) worst = Math.min(worst, ratio(fl, lum(s)))
  return { worst, fl }
}

/**
 * 이 화면에서 다음으로 갈 길이 있는가 — 본문 안에 누를 것이 하나라도 있는지 본다.
 *
 * 갓 만든 계정으로 도는 검사는 늘 '빈 화면'을 보는데, 빈 화면이야말로 막다른 길이
 * 되기 쉽다. 실제로 오답노트·즐겨찾기가 그랬다: 안내 문구만 있고 버튼이 없어서
 * 뒤로가기 말고는 나갈 데가 없었다. 글자 수만 세는 검사(120자 이상)는 이걸 못 잡는다
 * — 머리글과 꼬리글만으로도 수백 자가 나오기 때문이다.
 *
 * 머리글·꼬리글·모드 전환은 빼고 센다. 어느 화면에나 있어서 '길이 있다'는 근거가 못 된다.
 */
export function browserCountWayForward() {
  const main = document.querySelector('main') ?? document.body
  let n = 0
  const seen = []
  for (const el of main.querySelectorAll('a[href], button, [role="button"]')) {
    if (el.closest('footer, nav, header')) continue
    const cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') continue
    const r = el.getBoundingClientRect()
    if (r.width < 8 || r.height < 8) continue
    n++
    if (seen.length < 3) seen.push((el.textContent ?? el.getAttribute('aria-label') ?? '').trim().slice(0, 18))
  }
  return { n, seen, textLen: (main.innerText ?? '').trim().length }
}

/**
 * 휴대폰 화면에서 쓸 수 있는 상태인지. 반환값은 항목별 배열이고 판정은 바깥에서 한다.
 * 기준은 WCAG 2.5.8(누름 대상 24px, 문장 속 링크는 예외)과 손가락 크기 권장 44px.
 */
export function browserAuditMobile() {
  const vw = document.documentElement.clientWidth
  const out = { overflow: null, tiny: [], small: [], crowded: [], offscreen: [], covered: [], escaped: [] }

  // 가로로 넘길 수 있게 감싼 것(표 등) 안의 자식은 화면 밖으로 나가는 게 정상이라 뺀다.
  // 안 빼면 overflow-x-auto로 이미 처리한 표가 매번 '가장 넓은 것'으로 올라온다.
  const inScroller = (el) => {
    for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) {
      const ox = getComputedStyle(p).overflowX
      if (ox === 'auto' || ox === 'scroll' || ox === 'hidden') return true
    }
    return false
  }

  if (document.documentElement.scrollWidth > vw + 1) {
    const wide = []
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect()
      if (r.width < 1 || r.height < 1) continue
      if (r.right > vw + 1 && getComputedStyle(el).position !== 'fixed' && !inScroller(el)) {
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

  // 체크박스·라디오는 상자 자체가 아니라 딸린 <label>이 실제로 누르는 자리다.
  // 상자만 재면 이미 줄 전체가 눌리는 동의 항목까지 미달로 잡혀, 필요도 없는데
  // 상자를 44px로 키우게 된다.
  const tapRect = (el) => {
    const r = el.getBoundingClientRect()
    if (el.tagName !== 'INPUT' || !['checkbox', 'radio'].includes(el.type)) return r
    const lab = el.closest('label') || (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`))
    if (!lab) return r
    const lr = lab.getBoundingClientRect()
    return lr.width * lr.height > r.width * r.height ? lr : r
  }

  const sized = tappables.filter((el) => !isInline(el))
  for (const el of sized) {
    const r = tapRect(el)
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
      // 떠 있는 단추가 본문 카드 모서리를 조금 무는 건 어느 앱에나 있다. 스크롤하면
      // 비켜 주고 나머지 면적으로 누를 수 있어서, 20% 밑은 보고해도 고칠 게 없다.
      if (!pinned && pct < 20) continue
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
