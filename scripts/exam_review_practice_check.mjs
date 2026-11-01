// 시험 '검토 표시'와 객관식 연습 '풀이 설정'이 실제 화면에서 도는지 끝까지 눌러 본다.
//   npm run build -- --webpack && npx next start -p 3123
//   EXAM_UI_BASE=http://localhost:3123 npm run check:review-practice
//
// 왜 필요한가: 경쟁 CBT(cbtbank·comcbt·machuda)와 맞춘 기능이다 — 검토 표시는
// 제출 대화상자까지, 풀이 설정은 '다 풀고 채점'·'틀린 문항만 다시 풀기'까지 이어져야
// 쓸모가 있다. 계산은 check:practice가 보고, 여기는 화면 연결을 본다.
// 휴대폰·데스크톱 두 폭에서 손가락 높이(44px)와 가로 넘침도 같이 잰다.
//
// 주소는 localhost여야 한다 — 127.0.0.1은 Secure 쿠키가 안 붙어 로그인이 풀린다.
// 검증용 계정은 만든 것만 지운다. AI 채점은 누르지 않는다.
import fs from 'node:fs'
import { chromium, devices } from 'playwright'
import { dismissIntros } from './ui_audit_rules.mjs'
const BASE = process.env.EXAM_UI_BASE ?? 'http://localhost:3123'
const OUT = process.env.DEBUG_OUT ?? '.next'
const ENV = Object.fromEntries(fs.readFileSync('.env.local','utf-8').split('\n').filter(l=>l.includes('=')&&!l.trim().startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(),l.slice(i+1).trim()]}))
const admin=(p,init)=>fetch(`${ENV.NEXT_PUBLIC_SUPABASE_URL}${p}`,{...init,headers:{apikey:ENV.SUPABASE_SERVICE_ROLE_KEY,Authorization:`Bearer ${ENV.SUPABASE_SERVICE_ROLE_KEY}`,'Content-Type':'application/json',...(init?.headers??{})}})
const stamp=String(Date.now()); const email=`uicheck+parity${stamp}@kptest.cloud`; const password=`Chk-${stamp}-aA1!`
const results=[]; const ok=(n,d='')=>results.push(`  ○ ${n}${d?` — ${d}`:''}`); const bad=(n,d='')=>results.push(`  × ${n}${d?` — ${d}`:''}`)
const mk=await admin('/auth/v1/admin/users',{method:'POST',body:JSON.stringify({email,password,email_confirm:true})})
const uid=(await mk.json()).id
const browser=await chromium.launch()
async function tap(page, loc, name){ const b=await loc.boundingBox(); if(!b) return bad(`${name} 보이지 않음`); (b.height>=44? ok:bad)(`${name} 손가락 높이`, `${Math.round(b.height)}px`) }
async function noOverflow(page,name){ const o=await page.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:window.innerWidth})); (o.sw<=o.iw+1?ok:bad)(`${name} 가로 넘침 없음`,`${o.sw}/${o.iw}`) }
try{
  for (const [label, dev] of [['휴대폰', devices['iPhone 13']], ['데스크톱', { viewport:{width:1280,height:900} }]]) {
    const ctx=await browser.newContext({...dev})
    await ctx.addCookies([{name:'kptest_mode',value:'silyong',domain:'localhost',path:'/'}])
    await ctx.addInitScript(dismissIntros)
    const page=await ctx.newPage()
    const errors=[]; page.on('pageerror',e=>errors.push(String(e)))
    await page.goto(`${BASE}/login`,{waitUntil:'domcontentloaded'})
    await page.fill('input[type="email"]',email); await page.fill('input[type="password"]',password); await page.click('button[type="submit"]')
    for(let i=0;i<30;i++){ if(!new URL(page.url()).pathname.includes('/login')) break; await page.waitForTimeout(1000) }
    // ── 시험: 검토 표시
    await page.goto(`${BASE}/cbt/2025-1?start=1`,{waitUntil:'load'})
    await page.locator('button').filter({hasText:/^[①②③④⑤]/}).first().waitFor({timeout:30000})
    const flagBtn=page.locator('button',{hasText:/^검토 표시/}).first()
    ;(await flagBtn.count()===1?ok:bad)(`[${label}] 시험: 검토 표시 단추 존재`)
    await tap(page, flagBtn, `[${label}] 검토 표시 단추`)
    await flagBtn.click(); await page.waitForTimeout(200)
    ;((await flagBtn.getAttribute('aria-pressed'))==='true'?ok:bad)(`[${label}] 검토 표시 누르면 켜짐(aria-pressed)`)
    ;(/검토 표시됨/.test(await flagBtn.innerText())?ok:bad)(`[${label}] 글자가 '검토 표시됨'으로 바뀜`)
    const stored=await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('kptest_exam_flags_')).length)
    ;(stored===1?ok:bad)(`[${label}] 브라우저에 표시 저장됨`)
    const ringed=await page.locator('button.ring-amber-500').count()
    ;(ringed>=1?ok:bad)(`[${label}] 문제 목록에 표시 테두리`, `${ringed}개(목록 2벌)`)
    await noOverflow(page,`[${label}] 시험 화면`)
    // 다음 문항으로 가면 꺼진 상태로 보여야 한다
    await page.locator('button',{hasText:/^다음/}).first().click(); await page.waitForTimeout(200)
    ;((await flagBtn.getAttribute('aria-pressed'))==='false'?ok:bad)(`[${label}] 다른 문항은 표시 안 됨`)
    // 제출 대화상자
    await page.locator('button',{hasText:/제출하기/}).first().click(); await page.waitForTimeout(300)
    const dlg=page.locator('div.fixed.inset-0').first()
    const dtxt=await dlg.innerText()
    ;(/검토 표시한 문항이 1개/.test(dtxt)?ok:bad)(`[${label}] 제출 대화상자에 검토 표시 개수`)
    const goFlag=dlg.locator('button',{hasText:/첫 검토 문항으로 가기/}).first()
    await goFlag.click(); await page.waitForTimeout(300)
    ;((await page.locator('div.fixed.inset-0').count())===0?ok:bad)(`[${label}] '첫 검토 문항으로 가기' → 대화상자 닫힘`)
    ;((await flagBtn.getAttribute('aria-pressed'))==='true'?ok:bad)(`[${label}] 첫 검토 문항으로 이동함`)
    // 다시 누르면 꺼짐
    await flagBtn.click(); await page.waitForTimeout(200)
    ;((await flagBtn.getAttribute('aria-pressed'))==='false'?ok:bad)(`[${label}] 다시 누르면 꺼짐`)
    await page.screenshot({path:`${OUT}/exam_${label}.png`})
    // ── 연습: 풀이 설정
    await page.goto(`${BASE}/practice/multiple?set=all`,{waitUntil:'load'})
    await page.locator('button').filter({hasText:/^[①②③④⑤]/}).first().waitFor({timeout:30000})
    const settings=page.locator('button[aria-controls="practice-settings"]').first()
    ;(await settings.count()===1?ok:bad)(`[${label}] 연습: 풀이 설정 단추 존재`)
    await tap(page, settings, `[${label}] 풀이 설정 단추`)
    await settings.click(); await page.waitForTimeout(200)
    ;((await page.locator('#practice-settings').count())===1?ok:bad)(`[${label}] 설정 패널 열림`)
    await page.locator('[role="radio"]',{hasText:/^무작위$/}).click(); await page.waitForTimeout(200)
    await page.locator('[role="radio"]',{hasText:/^섞기$/}).click(); await page.waitForTimeout(200)
    await page.locator('[role="radio"]',{hasText:/^다 풀고 채점$/}).click(); await page.waitForTimeout(200)
    const prefs=await page.evaluate(()=>localStorage.getItem('kptest_practice_prefs_v1'))
    ;(prefs==='{"order":"random","shuffleChoices":true,"reveal":"deferred"}'?ok:bad)(`[${label}] 설정이 브라우저에 저장됨`, prefs??'')
    ;((await page.locator('text=보기 섞음').count())>=1?ok:bad)(`[${label}] '보기 섞음' 표시`)
    await noOverflow(page,`[${label}] 연습 화면(설정 열림)`)
    // 다 풀고 채점: 고르면 공개되지 않고 바꿀 수 있다
    const opts=page.locator('button').filter({hasText:/^[①②③④⑤]/})
    await opts.nth(0).click(); await page.waitForTimeout(150)
    ;((await opts.nth(0).getAttribute('aria-pressed'))==='true'?ok:bad)(`[${label}] 채점 모드: 고른 보기 표시`)
    ;((await page.locator('text=정답이에요').count())===0 && (await page.locator('text=아쉬워요').count())===0 ?ok:bad)(`[${label}] 채점 모드: 바로 공개 안 됨`)
    await opts.nth(1).click(); await page.waitForTimeout(150)
    ;((await opts.nth(1).getAttribute('aria-pressed'))==='true'?ok:bad)(`[${label}] 채점 모드: 채점 전엔 답 바꿀 수 있음`)
    ;(/푼 문항 1/.test(await page.locator('body').innerText())?ok:bad)(`[${label}] 머리글이 '푼 문항 1'`)
    // 마지막 문항까지 가서 채점
    let grade=null
    for(let i=0;i<200;i++){ const g=page.locator('button',{hasText:/^채점하기/}); if(await g.count()){grade=g.first();break} await page.locator('button',{hasText:/^다음/}).first().click(); await page.waitForTimeout(60) }
    ;(grade?ok:bad)(`[${label}] 마지막 문항에 '채점하기' 단추`)
    if(grade){ await grade.click(); await page.waitForTimeout(400)
      const body=await page.locator('body').innerText()
      ;(/연습 완료/.test(body)?ok:bad)(`[${label}] 채점하기 → 결과 요약`)
      ;(/정답은 [①②③④⑤]/.test(body)||/정답이에요/.test(body)?ok:bad)(`[${label}] 채점 뒤 1번 문항 정답 공개`)
      const retry=page.locator('button',{hasText:/틀린 \d+문항만 다시 풀기/}).first()
      if(await retry.count()){ await retry.click(); await page.waitForTimeout(300)
        ;(/틀린 문제 다시 풀기 \(\d+문항\)/.test(await page.locator('body').innerText())?ok:bad)(`[${label}] 틀린 문항만 다시 풀기 → 머리글 전환`) }
      else ok(`[${label}] 틀린 문항 없음(재풀이 단추 생략)`) }
    // 즉시 모드로 되돌려 저장 확인
    if((await page.locator('#practice-settings').count())===0) await settings.click(); await page.locator('[role="radio"]',{hasText:/^고르면 바로$/}).click(); await page.waitForTimeout(150)
    const again=page.locator('button',{hasText:/다시 풀기|전체 문항으로 돌아가기/}).first(); if(await again.count()) { await again.click(); await page.waitForTimeout(300) }
    await opts.nth(0).click(); await page.waitForTimeout(150)
    const b2=await page.locator('body').innerText()
    ;(/정답이에요|아쉬워요/.test(b2)?ok:bad)(`[${label}] 즉시 모드: 고르면 바로 공개`)
    ;(/보기 섞음/.test(b2)?ok:bad)(`[${label}] 보기 섞기 유지`)
    await page.screenshot({path:`${OUT}/practice_${label}.png`})
    ;(errors.length===0?ok:bad)(`[${label}] 페이지 오류 없음`, errors.join(' | ').slice(0,200))
    await ctx.close()
  }
}catch(e){ bad('실행', String(e).slice(0,400)) }
finally{
  await browser.close()
  for (const t of ['quiz_answers','quiz_sessions','subscriptions']) await admin(`/rest/v1/${t}?user_id=eq.${uid}`,{method:'DELETE'}).catch(()=>{})
  await admin(`/auth/v1/admin/users/${uid}`,{method:'DELETE'})
  console.log(results.join('\n')); console.log(results.some(r=>r.startsWith('  ×'))?'\n실패 있음':'\n모두 통과')
}
