import { chromium } from 'playwright'
const BASE = process.env.NAV_BASE ?? 'http://127.0.0.1:4790'
const b = await chromium.launch()
const hop = async (target, prefetchOn) => {
  const ctx = await b.newContext({ viewport:{width:390,height:844}, isMobile:true, hasTouch:true })
  const p = await ctx.newPage()
  const cdp = await ctx.newCDPSession(p)
  await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:1.6*1024*1024/8,uploadThroughput:750*1024/8})
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:4})
  await p.addInitScript(([off]) => {
    try { sessionStorage.setItem('kpt_schedule_seen_silyong','1') } catch {}
    if (off) Object.defineProperty(navigator, 'connection', { value: { saveData: true }, configurable: true })
  }, [!prefetchOn])
  await p.goto(BASE+'/', {waitUntil:'load', timeout:60000})
  await p.waitForTimeout(4000) // 미리받기가 돌 시간
  const link = p.locator(`a[href="${target}"]`).first()
  if (!(await link.count())) { await ctx.close(); return null }
  // 사람이 하듯 스크롤해서 링크를 보이게 한 뒤, 읽을 틈 없이 바로 누른다(최악의 경우).
  await link.scrollIntoViewIfNeeded()
  const t0 = Date.now()
  await link.click()
  await p.waitForURL(u=>u.pathname===target,{timeout:20000}).catch(()=>{})
  await p.locator('h1, h2').first().waitFor({state:'visible',timeout:15000}).catch(()=>{})
  const ms = Date.now()-t0
  await ctx.close()
  return ms
}
try {
  for (const t of ['/manuscript-guide','/exam-compare','/exam-info','/idioms']) {
    const off = await hop(t, false)
    const on  = await hop(t, true)
    if (off===null||on===null) { console.log(`${t} 링크 없음`); continue }
    const gain = off - on
    console.log(`${t.padEnd(11)} 미리받기끔 ${String(off).padStart(5)}ms → 켬 ${String(on).padStart(5)}ms  ${gain>0?`${gain}ms 빨라짐`:'차이 없음'}`)
  }
} finally { await b.close() }
