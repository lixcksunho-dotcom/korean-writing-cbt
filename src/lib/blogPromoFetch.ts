// 신청한 블로그 글을 서버가 '실제로' 읽어 오는 방법.
//
// 왜 이 파일이 따로 있나: 네이버 블로그 주소를 그대로 받아 오면 본문이 안 들어 있다.
// 실측(2026-09-01, 공개 글 1건):
//   원본 blog.naver.com/{id}/{logNo} → 글자 13자 · img 0개   ← 껍데기(iframe)
//   PostView.naver?blogId=…&logNo=…  → 글자 5,663자 · img 72개 ← 본문
//   m.blog.naver.com/{id}/{logNo}    → 글자 2,708자 · img 12개
// 체험단 서비스들이 쓰는 방법이 이것이다. 껍데기를 읽고 '본문 없음'이라 하면
// 네이버로 홍보해 준 사람이 전부 사람 확인 대기로 밀린다.
//
// 사진 수도 주의: PostView의 img 태그 72개에는 네이버 UI 아이콘이 섞여 있다.
// 스마트에디터의 이미지 모듈(se-module-image) 22개가 실제 본문 사진 수에 가깝다.

import { extractPostBody } from './blogPostBody.ts'

/** 한 주소에 대해 시도할 후보들. 앞에서부터 읽어 본다. */
export function blogFetchCandidates(raw: string): string[] {
  const url = raw.trim()
  const naver = url.match(/blog\.naver\.com\/(?:PostView\.naver\?blogId=)?([A-Za-z0-9_-]+)[/&](?:logNo=)?(\d{6,})/)
  if (naver) {
    const [, id, logNo] = naver
    // 원본 주소는 후보에서 뺐다. 그 주소는 껍데기(iframe)라, 글이 비공개로 바뀌면
    // 그 글 대신 **블로그 홈**을 내준다 — 실측에서 지워진 글이 홈의 사진 57장·2,660자로
    // 조건을 통과했다. 아예 안 읽는 편이 맞다.
    return [
      // 본문이 그대로 들어 있는 주소
      `https://blog.naver.com/PostView.naver?blogId=${id}&logNo=${logNo}&redirect=Dlog&widgetTypeCall=true&directAccess=false`,
      `https://m.blog.naver.com/${id}/${logNo}`,
    ]
  }
  // 티스토리·워드프레스·브런치는 서버가 본문을 그대로 준다.
  return [url]
}

/** 본문 사진 수. 네이버는 에디터 이미지 모듈을, 그 외는 img 태그를 센다.
 *  옆 메뉴·공지글 썸네일이 섞이지 않도록 본문 안에서만 센다. */
export function countPhotos(raw: string): number {
  const html = extractPostBody(raw).html
  const seModules = (html.match(/se-module-image/gi) ?? []).length
  if (seModules > 0) return seModules
  // 네이버 구 에디터: 사진 CDN 주소로 센다
  const cdn = new Set(
    [...html.matchAll(/https?:\/\/(?:postfiles|blogfiles|mblogthumb)[^"'\s)]{20,}/gi)].map(m => m[0].split('?')[0]),
  )
  if (cdn.size > 0) return cdn.size
  return (html.match(/<img\b/gi) ?? []).length
}

const UA = {
  // 블로그가 봇에게 빈 문서를 주는 일이 잦아 일반 브라우저처럼 요청한다.
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0 Safari/537.36',
  'Accept-Language': 'ko-KR,ko;q=0.9',
}

export type FetchedPost =
  | { html: string; via: string }
  | {
      html: null
      reason: string
      /** 네이버가 '못 보여준다'고 명시한 경우. 일시적 실패와 구분해야 회수를 판단할 수 있다. */
      blocked?: boolean
    }

/**
 * 네이버가 '이 글은 못 보여준다'고 답한 것인지 본다.
 *
 * 비공개·이웃공개·삭제 글은 200으로 오고, 본문 자리에 알림창을 띄운 뒤 글 목록으로
 * 보내는 스크립트가 들어 있다. 이걸 못 알아채면 다음 후보로 넘어가다 결국 블로그
 * 홈을 읽고 '조건 통과'라고 답한다(실측). 네이버가 쓴 문구를 그대로 돌려준다.
 */
export function naverBlockedReason(html: string): string | null {
  if (!/location\.replace\(\s*['"]\/PostList/.test(html)) return null
  const msg = html.match(/var\s+msg\s*=\s*'([^']+)'/)?.[1]?.trim()
  return msg ? `네이버가 이렇게 답했어요: ${msg}` : '지금은 볼 수 없는 글이에요(비공개이거나 지워졌을 수 있어요)'
}

/** 후보를 차례로 읽어 본문이 들어 있는 문서를 돌려준다. */
export async function fetchBlogPost(raw: string): Promise<FetchedPost> {
  let lastReason = '주소를 열지 못했어요'
  for (const url of blogFetchCandidates(raw)) {
    try {
      const res = await fetch(url, { headers: UA, redirect: 'follow', signal: AbortSignal.timeout(12000) })
      if (!res.ok) { lastReason = `주소를 열지 못했어요(${res.status})`; continue }
      const html = await res.text()

      // 못 보여주는 글이면 여기서 끝낸다. 다음 후보로 넘어가면 엉뚱한 글을 읽는다.
      const blocked = naverBlockedReason(html)
      if (blocked) return { html: null, reason: blocked, blocked: true }

      const textLen = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, '').length
      // 껍데기(iframe)는 글자가 거의 없다 — 다음 후보로 넘어간다.
      if (textLen >= 400) return { html, via: url }
      lastReason = '본문이 비어 있어요'
    } catch {
      lastReason = '주소를 여는 데 시간이 오래 걸렸어요'
    }
  }
  return { html: null, reason: lastReason }
}

/**
 * 본문 글자 수. UI·메뉴 글자를 빼야 '분량' 기준이 뜻을 갖는다.
 *
 * 실측(네이버 공개 글 1건): 문서 전체 5,663자 중 머리 UI가 1,192자였고,
 * 스마트에디터 텍스트 모듈(se-module-text) 합계는 2,089자였다. 전체로 재면
 * 짧은 글도 UI 덕에 통과해 버린다.
 */
export function countBodyChars(raw: string): number {
  const html = extractPostBody(raw).html
  const strip = (s: string) =>
    s.replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, '')

  // 네이버 스마트에디터: 글쓴이가 적은 텍스트 블록만 모은다
  const modules = [...html.matchAll(/<div[^>]*class="[^"]*se-module-text[^"]*"[\s\S]*?<\/div>/gi)]
  if (modules.length > 0) return strip(modules.map(m => m[0]).join(' ')).length

  // 그 외 블로그: 문서 전체에서 태그를 걷어낸 길이. 머리·꼬리 메뉴가 섞이지만
  // 티스토리·워드프레스는 그 양이 적어 기준을 넘기는 데 문제가 되지 않는다.
  return strip(html).length
}
