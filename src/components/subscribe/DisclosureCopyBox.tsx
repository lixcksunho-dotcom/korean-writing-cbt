'use client'

import { useState } from 'react'
import { Copy, Check, ShieldAlert } from 'lucide-react'
import DisclosureImage from '@/components/subscribe/DisclosureImage'

// 공정위 표시 문구를 그대로 복사해 붙일 수 있게 준다.
//
// 왜 이렇게까지 하나: 이용권을 주고 글을 받으면 그것은 광고다. 표시를 안 하면
// 글쓴이가 아니라 **광고주인 우리가** 제재를 받는다(시정명령·과징금).
// "알아서 써 주세요"라고 하면 반드시 빠뜨리는 사람이 나온다. 눌러서 붙일 수 있게 준다.
//
// 그림과 글자를 함께 준다. 그림은 본문 색에 묻히지 않아 '쉽게 인식' 요건에 맞고,
// 글자는 우리 판정기가 읽을 수 있는 유일한 형태다 — 그림 속 글씨는 읽을 수 없다.
export default function DisclosureCopyBox({ sample, fileName = '광고표시.png' }: { sample: string; fileName?: string }) {
  const [copied, setCopied] = useState<string | null>(null)

  const blocks = [
    { key: 'notice', label: '② 그림 바로 아래에 이 한 줄도 붙여 주세요 (자동 확인용)', text: sample },
  ]

  async function copy(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      // 클립보드가 막힌 브라우저(구형·비보안 문맥)에서는 직접 긁어 복사하게 둔다
      setCopied('fail')
      setTimeout(() => setCopied(null), 2500)
    }
  }

  return (
    <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-4">
      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-[#0f172a]">
        <ShieldAlert className="h-4 w-4 text-[#d97706]" aria-hidden="true" />
        공정거래위원회 표시 의무 — 꼭 넣어 주세요
      </p>
      <p className="mb-3 text-xs leading-relaxed text-[#64748b]">
        이용권을 받고 쓰는 글은 <b>광고</b>에 해당합니다. 대가를 받았다는 사실을 밝히지 않으면
        글을 쓴 분이 아니라 <b>저희가 제재를 받습니다.</b> 아래 그림과 문구를 글 맨 위에 넣어 주세요.
        <br />
        <span className="text-[#94a3b8]">
          ‘체험단’, ‘AD’, ‘내돈내산’ 같은 말은 공정위가 인정하지 않습니다.
        </span>
      </p>

      <div className="mb-3">
        <p className="mb-1.5 text-[11px] font-semibold text-[#475569]">
          ① 이 그림을 글 맨 위(제목 아래)에 넣어 주세요
        </p>
        <DisclosureImage sample={sample} fileName={fileName} />
      </div>

      <div className="space-y-2.5">
        {blocks.map(b => (
          <div key={b.key}>
            <p className="mb-1 text-[11px] font-semibold text-[#475569]">{b.label}</p>
            <div className="flex items-stretch gap-2">
              <code className="min-w-0 flex-1 select-all break-words rounded-lg border border-[#e2e8f0] bg-white px-3 py-2.5 text-xs leading-relaxed text-[#0f172a]">
                {b.text}
              </code>
              <button
                type="button"
                onClick={() => copy(b.key, b.text)}
                className="inline-flex shrink-0 items-center gap-1 self-start rounded-lg border border-[#e2e8f0] bg-white px-3 py-2.5 text-xs font-bold text-[#334155] transition-colors hover:bg-[#f1f5f9]"
              >
                {copied === b.key
                  ? <><Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" /> 복사됨</>
                  : <><Copy className="h-3.5 w-3.5" aria-hidden="true" /> 복사</>}
              </button>
            </div>
          </div>
        ))}
      </div>

      {copied === 'fail' && (
        <p className="mt-2 text-[11px] text-red-700">
          복사가 막혀 있어요. 문구를 손으로 긁어서 복사해 주세요(칸을 누르면 전체 선택됩니다).
        </p>
      )}

      <p className="mt-3 text-[11px] leading-relaxed text-[#94a3b8]">
        위치가 중요합니다 — <b>제목이나 본문 첫 부분</b>에 있어야 하고, ‘더보기’를 눌러야 보이는
        자리나 댓글은 인정되지 않습니다. 그림 속 글씨는 기계가 읽지 못해서, <b>②의 한 줄이 있어야
        자동으로 확인됩니다.</b>
      </p>
    </div>
  )
}
