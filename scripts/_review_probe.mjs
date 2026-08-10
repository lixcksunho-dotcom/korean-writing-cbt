import fs from 'node:fs'
import { chromium, devices } from 'playwright'
import { dismissIntros } from './ui_audit_rules.mjs'
const E = Object.fromEntries(fs.readFileSync('.env.local','utf-8').split('\n').filter(l=>l.includes('=')&&!l.trim().startsWith('#')).map(l=>{const i=l.indexOf('=');return[l.slice(0,i).trim(),l.slice(i+1).trim()]}))
const admin=(p,init)=>fetch(E.NEXT_PUBLIC_SUPABASE_URL+p,{...init,headers:{apikey:E.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+E.SUPABASE_SERVICE_ROLE_KEY,'Content-Type':'application/json',...(init?.headers??{})}})
const s=String(Date.now()), email=`uicheck+${s}@kptest.cloud`, password=`Chk-${s}-aA1!`
const uid=(await (await admin('/auth/v1/admin/users',{method:'POST',body:JSON.stringify({email,password,email_confirm:true})})).json()).id
const B='https://kptest.cloud'
const b=await chromium.launch()
try{
  const ctx=await b.newContext({...devices['iPhone 13']}); await ctx.addInitScript(dismissIntros)
  const p=await ctx.newPage()
  await p.goto(`${B}/login`); await p.fill('input[type=email]',email); await p.fill('input[type=password]',password); await p.click('button[type=submit]')
  for(let i=0;i<30;i++){ if(!p.url().includes('/login')) break; await p.waitForTimeout(1000) }
  await p.goto(`${B}/dashboard`,{waitUntil:'load'}); await p.waitForTimeout(2000)
  await p.locator('button, a').filter({hasText:'후기 남기기'}).first().click(); await p.waitForTimeout(1800)
  const t=(await p.evaluate(()=>document.body.innerText)).replace(/\s+/g,' ')
  const i=t.indexOf('후기 남기기')
  console.log('[후기 모달]\n'+t.slice(i,i+900))
  const fields=await p.evaluate(()=>[...document.querySelectorAll('input,textarea,select,button')].filter(e=>e.offsetParent).map(e=>e.tagName.toLowerCase()+(e.type?`[${e.type}]`:'')+' '+((e.placeholder||e.textContent||'').replace(/\s+/g,' ').trim().slice(0,34))))
  console.log('\n[입력 항목]\n  '+fields.slice(0,18).join('\n  '))
} finally {
  await b.close(); await admin(`/auth/v1/admin/users/${uid}`,{method:'DELETE'})
}
