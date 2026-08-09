import { ImageResponse } from 'next/og'
import type { SubscriberReport } from '@/lib/subscriberReport'

// 보고용 그래프. next/og(Satori)로 PNG를 만든다 — flexbox만 지원하고 grid는 안 된다.
//
// 그림 안 글자는 전부 ASCII다. Satori에는 한글 글꼴이 없어서 한글을 넣으면 네모(두부)로
// 나온다. 글꼴을 실어 나르면 매일 도는 작업에 수 MB 내려받기가 붙으므로, 숫자·날짜만
// 그림에 넣고 한국어 설명은 텔레그램 캡션에 싣는다.
//
// 색은 dataviz 검증기를 통과한 값이다(흰 배경 기준: 명도대·채도·CVD·대비 전부 통과).
//   파랑 #2a78d6 — 신규 구독   /   주황 #eb6834 — 방문자
// 두 지표는 자릿수가 달라서(0~2 vs 수십) 한 축에 겹치지 않는다. 축을 각각 가진
// 그림 두 개를 위아래로 둔다.
const INK = '#0f172a'
const MUTED = '#475569'
const GRID = '#e2e8f0'
const SUBS = '#2a78d6'
const VISITS = '#eb6834'

const W = 1000
const PANEL_H = 200

function Panel({
  title, note, bars, color, labelEvery,
}: {
  title: string
  note: string
  bars: { label: string; value: number }[]
  color: string
  labelEvery: number
}) {
  const max = Math.max(1, ...bars.map((b) => b.value))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <div style={{ display: 'flex', fontSize: 26, fontWeight: 700, color: INK }}>{title}</div>
        <div style={{ display: 'flex', fontSize: 18, color: MUTED }}>{note}</div>
      </div>
      {/* 눈금선은 최댓값 하나만 — 값이 작아서 격자를 촘촘히 그으면 막대보다 선이 더 보인다 */}
      <div style={{ display: 'flex', alignItems: 'flex-end', height: PANEL_H, marginTop: 10, borderBottom: `2px solid ${GRID}` }}>
        {bars.map((b, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', flex: 1, height: '100%', paddingLeft: 2, paddingRight: 2 }}>
            {b.value > 0 && (
              <div style={{ display: 'flex', fontSize: 18, fontWeight: 700, color: INK, marginBottom: 4 }}>{b.value}</div>
            )}
            <div
              style={{
                display: 'flex',
                width: '100%',
                height: Math.max(b.value > 0 ? 6 : 2, Math.round((b.value / max) * (PANEL_H - 34))),
                backgroundColor: b.value > 0 ? color : GRID,
                borderTopLeftRadius: 4,
                borderTopRightRadius: 4,
              }}
            />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', marginTop: 6 }}>
        {bars.map((b, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'center', flex: 1, fontSize: 16, color: MUTED }}>
            {i % labelEvery === 0 || i === bars.length - 1 ? b.label : ''}
          </div>
        ))}
      </div>
    </div>
  )
}

export function SubscriberReportChart({ r, asOf }: { r: SubscriberReport; asOf: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: W,
        height: 700,
        backgroundColor: '#ffffff',
        padding: 36,
        gap: 26,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ display: 'flex', fontSize: 32, fontWeight: 700, color: INK }}>kptest.cloud</div>
        <div style={{ display: 'flex', fontSize: 20, color: MUTED }}>as of {asOf} KST</div>
      </div>

      <Panel
        title="New paid subscriptions"
        note={`per week · total ${r.total}`}
        bars={r.weeks.map((w) => ({ label: w.label, value: w.count }))}
        color={SUBS}
        labelEvery={2}
      />

      <Panel
        title="Unique visitors"
        note={`per day · ${r.days.length} days`}
        bars={r.days.map((d) => ({ label: d.label, value: d.visitors }))}
        color={VISITS}
        labelEvery={3}
      />
    </div>
  )
}

/** 라우트가 JSX를 들고 있지 않도록 그림 만드는 것까지 여기서 끝낸다(route.ts는 .ts로 유지). */
export function renderSubscriberReport(r: SubscriberReport, asOf: string): ImageResponse {
  return new ImageResponse(<SubscriberReportChart r={r} asOf={asOf} />, { width: W, height: 700 })
}
