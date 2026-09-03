'use client'

import { useRef, useState } from 'react'
import * as PortOne from '@portone/browser-sdk/v2'
import { trackEvent } from '@/lib/analytics/trackEvent'

type Method = 'card' | 'kakaopay'
/** 아직 못 여는 수단도 자리는 만들어 둔다 — 누가 무엇을 원하는지 세어야 준비 순서를 감으로 안 정한다. */
type MethodKey = Method

// 카카오페이는 이니시스와 별개 계약이라 포트원에서 **채널이 따로** 생긴다(채널키도 따로).
// 이 값이 없으면 버튼은 '준비중'으로 남는다 — 채널키를 넣고 재배포하면 저절로 켜진다.
// 코드를 다시 고칠 필요가 없고, 키 없이 눌려서 튕기는 일도 생기지 않는다.
// (NEXT_PUBLIC_은 브라우저로 나가는 값이다. 채널키는 원래 결제창을 여는 데 쓰는 공개값이라 괜찮다.)
const KAKAOPAY_CHANNEL_KEY = process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY_KAKAOPAY

const METHODS: {
  key: MethodKey; label: string; emoji: string; color: string
  soon?: boolean; notice?: string
}[] = [
  // 카카오페이를 맨 위에 둔다. 열려 있으면 브랜드색을 채워 주 버튼으로, 아직이면
  // 테두리형 + '준비중'으로 — 되는 것처럼 보이면 눌러 본 사람이 결제를 포기한다.
  {
    key: 'kakaopay', label: '카카오페이', emoji: '💬',
    color: KAKAOPAY_CHANNEL_KEY
      ? 'border-[#FEE500] bg-[#FEE500] text-[#3C1E1E]'
      : 'border-[#FEE500] bg-white text-[#3C1E1E]',
    soon: !KAKAOPAY_CHANNEL_KEY,
    notice: '카카오페이는 준비 중입니다. 지금은 카드 결제로 이용해 주세요.',
  },
  // 카카오페이가 주 버튼이 되면 카드는 테두리형으로 물러난다(솔리드 둘이 서로 경쟁하지 않게).
  {
    key: 'card', label: '카드 결제', emoji: '💳',
    color: KAKAOPAY_CHANNEL_KEY
      ? 'border-[#1e3a5f] bg-white text-[#1e3a5f]'
      : 'border-[#1e3a5f] bg-[#1e3a5f] text-white',
  },
]

// 포트원 V2 결제수단 매핑.
//
// 이니시스 '간편결제' 버튼은 뺐다. `payMethod: 'EASY_PAY'`만 주고 부르면 이니시스 V2는
// 결제창을 아예 안 띄우고("간편 결제 수단은 필수 입력입니다", 400), 살리려면 간편결제사를
// 하나씩 지정하면서 그 회사가 이니시스 계약에 열려 있어야 한다. 카카오페이는 자기 채널로
// 따로 열었으므로, 이니시스 간편결제는 계약이 생기기 전까지 자리를 두지 않는다.
function portoneMethodParams(method: Method) {
  if (method === 'kakaopay') {
    // 카카오페이는 자기 채널키로 불러야 한다. 이니시스 채널키로 KAKAOPAY를 부르면
    // 조용히 카드창으로 떨어진다(실측 확인) — 사용자는 카카오페이를 눌렀는데 카드창을 본다.
    //
    // 카카오페이 채널에서 넣으면 안 되는 것들(포트원 연동 문서):
    //   · windowType — PC는 IFRAME, 모바일은 REDIRECTION만 된다. 안 주면 알아서 그렇게 잡히므로
    //     **일부러 비워 둔다**. 다른 값을 주면 에러가 난다.
    //   · locale — KO_KR만 지원(주지 않는다). currency — 원화만 지원(CURRENCY_KRW로 이미 보낸다).
    //   · easyPayProvider — 카카오페이는 PG 자체가 간편결제사라 무시된다. 그래도 남겨 두는 이유는,
    //     EASY_PAY를 결제사 없이 부르다 이니시스에서 결제창이 아예 안 뜬 적이 있어서
    //     그 실수가 되돌아오지 않게 검사(check:methods)로 못 박아 뒀기 때문이다.
    return {
      channelKey: KAKAOPAY_CHANNEL_KEY,
      payMethod: 'EASY_PAY',
      easyPay: { easyPayProvider: 'KAKAOPAY' },
    } as const
  }
  return { payMethod: 'CARD' } as const
}

/** 사유 문구에서 숫자를 지우고 짧게 자른다. 트래킹은 익명 비콘이라 개인정보가 실리면 안 된다. */
function sanitizeReason(message?: string): string {
  if (!message) return 'unknown'
  return message.replace(/\d/g, '').replace(/\s+/g, ' ').trim().slice(0, 80) || 'unknown'
}

export default function PaymentButton({
  userId,
  userEmail,
  userName,
}: {
  userId: string
  userEmail: string
  userName: string
}) {
  const [loading, setLoading] = useState<Method | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [phone, setPhone] = useState('')
  // 결제창까지 못 간 사람 14명의 사유가 전화번호 미입력 7·약관 미동의 7이었다(성공 20명 대비).
  // 두 칸 다 버튼 **위에** 있는데도 그냥 누른다. 안내는 버튼 아래에 떠서, 고쳐야 할 칸과
  // 떨어져 있었다 — 좁은 화면에서는 둘이 한 화면에 안 들어온다.
  // 그래서 말만 하지 않고 그 칸으로 데려간다.
  const [missing, setMissing] = useState<'phone' | 'agree' | null>(null)
  const phoneRef = useRef<HTMLInputElement>(null)
  const agreeRef = useRef<HTMLInputElement>(null)

  /** 빠진 칸을 화면 가운데로 올리고 커서를 얹는다(모바일은 자판까지 열린다). */
  function pointAt(field: 'phone' | 'agree') {
    setMissing(field)
    const el = field === 'phone' ? phoneRef.current : agreeRef.current
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el?.focus({ preventScroll: true })
  }

  // 잠가 두면 누른 사람은 아무 반응도 못 받고 이유도 모른다(아래 동의 가드와 같은 원칙).
  // 눌리게 두고 왜 안 되는지 말해 준 다음, 원한 수단을 세어 둔다.
  function handleUnavailable(key: MethodKey, message?: string) {
    setError('')
    setNotice(message ?? '지금은 카드 결제로 이용해 주세요.')
    trackEvent('method_unavailable', key)
  }

  async function handlePayment(method: Method) {
    setNotice('')
    // 결제창까지 못 간 이유도 남긴다. payment_started는 아래 가드를 모두 통과해야 찍혀서,
    // 여기서 막힌 사람은 퍼널에 아예 안 보였다(구독 페이지 조회는 있는데 결제 시작이 0인 구간이 있었다).
    if (!agreed) {
      setError('결제 전 이용약관·환불정책에 동의해 주세요.')
      pointAt('agree')
      trackEvent('payment_blocked', 'no_agree')
      return
    }

    // KG이니시스 V2 일반결제는 구매자 휴대폰 번호가 필수
    const phoneDigits = phone.replace(/\D/g, '')
    if (!/^01[0-9]\d{7,8}$/.test(phoneDigits)) {
      setError('휴대폰 번호를 정확히 입력해 주세요. (예: 010-1234-5678)')
      pointAt('phone')
      trackEvent('payment_blocked', phoneDigits ? 'bad_phone' : 'no_phone')
      return
    }

    // 포트원 키 미설정 가드: storeId/channelKey가 비면 SDK가 cryptic 에러를 내므로 먼저 차단.
    // 수단마다 채널이 다르므로 그 수단이 쓸 키로 본다(카드는 이니시스, 카카오페이는 자기 채널).
    const storeId = process.env.NEXT_PUBLIC_PORTONE_STORE_ID
    const channelKey = method === 'kakaopay' ? KAKAOPAY_CHANNEL_KEY : process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY
    if (!storeId || !channelKey) {
      setError('결제 설정이 준비 중입니다. 잠시 후 다시 시도하거나 고객센터로 문의해 주세요.')
      trackEvent('payment_blocked', 'no_portone_key')
      return
    }

    setError('')
    setMissing(null)
    setLoading(method)
    trackEvent('payment_started', method)  // 결제창 진입(체크아웃 인텐트) 전환 측정
    try {
      const paymentId = `sub-${crypto.randomUUID()}`

      const response = await PortOne.requestPayment({
        storeId,
        channelKey,
        paymentId,
        // 구독은 시험(모드)과 무관하게 모든 기능을 여는 단일 상품이라 결제창·영수증엔 시험 중립적 이름을 쓴다.
        orderName: '프리미엄 플랜 30일 이용권',
        totalAmount: 5500,
        currency: 'CURRENCY_KRW',
        customer: {
          customerId: userId,
          email: userEmail,
          fullName: userName,
          phoneNumber: phone.replace(/\D/g, ''),
        },
        // 모바일 등 리다이렉트 결제는 이 주소로 paymentId를 달고 돌아온다.
        redirectUrl: `${window.location.origin}/subscribe/success`,
        ...portoneMethodParams(method),
      })

      // PC(팝업/iframe)에서는 Promise가 resolve된다. code가 있으면 실패.
      if (response?.code !== undefined) {
        setError(response.message ?? '결제 중 오류가 발생했습니다.')
        // 결제창이 닫힌 이유는 여기서만 알 수 있다. 창을 열고 그냥 닫으면 PG에는
        // READY만 남고 사유가 없어서, 나중에 보면 '왜 안 냈는지'를 영영 모른다.
        // 이름·meta는 리다이렉트 실패(/subscribe/fail)와 같은 규약을 쓴다 — 이름이 갈리면
        // 퍼널 보고와 관리자 트래픽 화면이 둘 중 하나만 세고, 사유 분류도 어긋난다.
        trackEvent('payment_fail', response.code)
        return
      }

      // 결제 성공 → 서버 검증 페이지로 이동(여기서 실제 구독 발급)
      window.location.assign(
        `/subscribe/success?paymentId=${encodeURIComponent(response!.paymentId)}`
      )
    } catch (e: unknown) {
      const err = e as { message?: string }
      setError(err?.message ?? '결제 중 오류가 발생했습니다.')
      // 'exception'만 남기면 무엇이 터졌는지 영영 모른다 — 실제로 간편결제가 매번 즉시
      // 죽고 있었는데 사유가 안 남아 원인을 못 좁혔다. 숫자는 지우고(카드번호·전화번호가
      // 섞여 들어올 수 있다) 길이를 잘라 사유 문구를 함께 싣는다.
      trackEvent('payment_fail', `ex:${method}:${sanitizeReason(err?.message)}`)
    } finally {
      setLoading(null)
    }
  }

  // 휴대폰 번호 자동 하이픈 포맷 (010-1234-5678)
  function onPhoneChange(v: string) {
    const d = v.replace(/\D/g, '').slice(0, 11)
    let out = d
    if (d.length >= 4 && d.length < 8) out = `${d.slice(0, 3)}-${d.slice(3)}`
    else if (d.length >= 8) out = `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`
    setPhone(out)
    if (missing === 'phone') setMissing(null)
  }

  return (
    <div className="space-y-3">
      {/* 휴대폰 번호 (KG이니시스 결제 필수) */}
      <div>
        <label className="block text-xs font-semibold text-[#475569] mb-1.5">휴대폰 번호 <span className="text-red-600">*</span></label>
        <input
          ref={phoneRef}
          type="tel"
          inputMode="numeric"
          value={phone}
          onChange={e => onPhoneChange(e.target.value)}
          placeholder="010-1234-5678"
          aria-invalid={missing === 'phone'}
          className={`w-full rounded-xl border px-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f] ${
            missing === 'phone' ? 'border-red-600 ring-2 ring-red-100' : 'border-[#e2e8f0]'
          }`}
        />
      </div>

      {/* 약관·환불정책 동의 (결제 필수) */}
      <label className={`flex items-start gap-2 text-xs text-[#475569] bg-[#f8fafc] border rounded-xl px-3.5 py-3 cursor-pointer ${
        missing === 'agree' ? 'border-red-600 ring-2 ring-red-100' : 'border-[#e2e8f0]'
      }`}>
        <input
          ref={agreeRef}
          type="checkbox"
          checked={agreed}
          onChange={e => { setAgreed(e.target.checked); if (e.target.checked) setMissing(null) }}
          aria-invalid={missing === 'agree'}
          className="mt-0.5 h-4 w-4 accent-[#1e3a5f] shrink-0"
        />
        <span>
          <a href="/terms" target="_blank" className="text-[#1e3a5f] font-semibold underline">이용약관</a> 및{' '}
          <a href="/refund" target="_blank" className="text-[#1e3a5f] font-semibold underline">취소·환불 정책</a>을 확인했으며,
          본 상품이 1회 결제·30일 이용권(자동결제 없음)이고 계정 공유 등 부정 이용 시 환불이 제한됨에 동의합니다.
        </span>
      </label>

      {METHODS.map(({ key, label, emoji, color, soon, notice: soonNotice }) => (
        <button
          key={key}
          onClick={() => (soon ? handleUnavailable(key, soonNotice) : handlePayment(key as Method))}
          // 동의 전이라고 버튼을 잠그면, 누른 사람은 아무 반응도 못 받고 이유도 모른다.
          // 눌리게 두고 handlePayment가 "무엇이 빠졌는지"를 말해 주게 한다(결제는 그대로 막힌다).
          disabled={loading !== null}
          className={`w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-bold text-sm border-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed hover:-translate-y-0.5 hover:shadow-lg ${color}`}
        >
          <span className="text-base">{emoji}</span>
          {loading === key ? '결제창 열리는 중...' : label}
          {soon && (
            <span className="rounded-full bg-[#FEE500] px-2 py-0.5 text-[11px] font-bold text-[#3C1E1E]">준비중</span>
          )}
        </button>
      ))}

      {error && (
        <p className="text-xs text-red-600 text-center pt-1">{error}</p>
      )}

      {/* 준비중 안내는 오류가 아니다 — 빨간 글씨로 쓰면 결제가 고장 난 것처럼 읽힌다. */}
      {notice && (
        <p className="text-xs text-[#475569] text-center pt-1">{notice}</p>
      )}

      <p className="text-center text-xs text-[#64748b] pt-1">
        결제 후 즉시 30일 이용권이 활성화됩니다
      </p>
    </div>
  )
}
