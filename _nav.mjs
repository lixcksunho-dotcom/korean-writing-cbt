// 상단바에서 모드 스위처와 메뉴가 실제로 겹치는지 폭별로 잰다(눈으로는 특정 폭에서만 보인다).
import fs from 'node:fs'
import { chromium } from 'playwright'
const E=Object.fromEntries(fs.readFileSync('.env.local','utf-8').split('\n').filter(l=>l.includes('=')&&!l.trim().startsWith('#')).map(l=>{const i=l.indexOf('=');return[l.slice(0,i).trim(),l.slice(i+1).trim().replace(/^["']|["']$/g,'')]}))
const admin=(p,init)=>fetch(`${E.NEXT_PUBLIC_SUPABASE_URL}${p}`,{...init,headers:{apikey:E.SUPABASE_SERVICE_ROLE_KEY,Authorization:`Bearer ${E.SUPABASE_SERVICE_ROLE_KEY}`,'Content-Type':'application/json',...(init?.headers??{})}})
const stamp=String(Date.now()); const email=`uicheck+nv${stamp}@kptest.cloud`, password=`Chk-${stamp}-aA1!`
const uid=(await (await admin('/auth/v1/admin/users',{method:'POST',body:JSON.stringify({email,password,email_confirm:true})})).json()).id
const BASE=process.env.BASE ?? 'https://kptest.cloud'
const b=await chromium.launch(); const page=await b.newPage({viewport:{width:1280,height:800}})
try{
  let l=false
  for(let a=0;a<3&&!l;a++){
    await page.goto(`${BASE}/login`,{waitUntil:'domcontentloaded'})
    await page.fill('input[type="email"]',email); await page.fill('input[type="password"]',password); await page.click('button[type="submit"]')
    for(let i=0;i<30;i++){ if(!new URL(page.url()).pathname.includes('/login')){l=true;break} await page.waitForTimeout(1000) }
  }
  if(!l) throw new Error('로그인 실패')
  for (const w of [768, 820, 880, 929, 980, 1024, 1100, 1280]) {
    await page.setViewportSize({width:w,height:800})
    await page.goto(`${BASE}/dashboard`,{waitUntil:'networkidle'})
    await page.waitForTimeout(400)
    const r = await page.evaluate(() => {
      const pill=[...document.querySelectorAll('nav *')].find(el=>/실용글쓰기/.test(el.textContent||'') && el.className && String(el.className).includes('rounded-full') && String(el.className).includes('border'))
      const menu=[...document.querySelectorAll('nav a')].find(a=>/대시보드/.test(a.textContent||''))
      if(!pill||!menu) return {pill:!!pill,menu:!!menu}
      const p=pill.getBoundingClientRect(), m=menu.getBoundingClientRect()
      const overlap = Math.max(0, Math.min(p.right,m.right)-Math.max(p.left,m.left))
      return {pill:true,menu:true,pillRight:Math.round(p.right),menuLeft:Math.round(m.left),overlap:Math.round(overlap), navScroll: document.querySelector('nav').scrollWidth > document.querySelector('nav').clientWidth}
    })
    console.log(`${String(w).padStart(5)}px  ${r.menu ? `모드칩 오른쪽 ${r.pillRight} · 메뉴 왼쪽 ${r.menuLeft} · 겹침 ${r.overlap}px${r.overlap>0?'  ← 겹침':''}` : '메뉴 숨김(햄버거)'}`)
  }
} finally { await b.close(); await admin(`/rest/v1/page_views?visitor_id=eq.u:${uid}`,{method:'DELETE'}); await admin(`/auth/v1/admin/users/${uid}`,{method:'DELETE'}) }
