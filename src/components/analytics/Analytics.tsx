import Script from 'next/script'

// 외부 계정 ID(환경변수)가 있을 때만 로드되는 분석 스크립트.
// - NEXT_PUBLIC_GA_ID:      Google Analytics 4 측정 ID (예: G-XXXXXXX) → 유입·전환 추적
// - NEXT_PUBLIC_CLARITY_ID: Microsoft Clarity 프로젝트 ID → 히트맵·세션 리플레이
// 둘 다 무료. ID를 Vercel 환경변수에 넣고 재배포하면 즉시 활성화된다.
export default function Analytics() {
  const ga = process.env.NEXT_PUBLIC_GA_ID
  const clarity = process.env.NEXT_PUBLIC_CLARITY_ID

  return (
    <>
      {ga && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga}`} strategy="afterInteractive" />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga}');`}
          </Script>
        </>
      )}
      {clarity && (
        <Script id="ms-clarity" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${clarity}");`}
        </Script>
      )}
    </>
  )
}
