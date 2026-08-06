'use client'

// 루트 레이아웃 수준 오류 경계(최후 방어선). 자체 html/body 필요.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ko">
      <body style={{ fontFamily: 'sans-serif', display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', margin: 0, background: '#f8fafc' }}>
        <div style={{ textAlign: 'center', padding: 40, background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', maxWidth: 380 }}>
          <h1 style={{ fontSize: 20, color: '#0f172a', margin: '0 0 8px' }}>일시적인 오류가 발생했어요</h1>
          <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 20px' }}>다시 시도하면 대부분 정상적으로 열려요.</p>
          <button onClick={() => reset()} style={{ background: '#1e3a5f', color: '#fff', border: 0, padding: '12px 24px', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>다시 시도</button>
          {error?.digest && <p style={{ fontSize: 11, color: '#64748b', marginTop: 16 }}>오류코드: {error.digest}</p>}
        </div>
      </body>
    </html>
  )
}
