'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Download, Copy, Check } from 'lucide-react'

// 광고 표시 문구를 그림으로 만들어 준다.
//
// 왜 그림인가: 글자로만 적으면 본문 색·크기에 묻혀 그냥 넘어간다. 공정위가 요구하는
// 것은 '소비자가 쉽게 인식'이므로, 눈에 걸리는 편이 규정에도 맞고 우리에게도 안전하다.
//
// 왜 브라우저에서 그리나: 서버에서 만들면 한글 글꼴 파일을 따로 실어야 하고, 글꼴이
// 빠지면 네모(두부)만 찍힌 그림이 나간다. 보는 사람 브라우저에는 한글 글꼴이 이미 있다.

const W = 660
const H = 92
const SCALE = 2

function drawBanner(canvas: HTMLCanvasElement, text: string) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  canvas.width = W * SCALE
  canvas.height = H * SCALE
  ctx.scale(SCALE, SCALE)

  ctx.fillStyle = '#fffbeb'
  ctx.strokeStyle = '#fcd34d'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.roundRect(0.5, 0.5, W - 1, H - 1, 10)
  ctx.fill()
  ctx.stroke()

  // 왼쪽 띠 — 본문 색과 섞이지 않게 경계를 만든다
  ctx.fillStyle = '#f59e0b'
  ctx.beginPath()
  ctx.roundRect(0.5, 0.5, 7, H - 1, [10, 0, 0, 10])
  ctx.fill()

  const KO = '"Pretendard", "Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif'
  ctx.textBaseline = 'alphabetic'

  ctx.fillStyle = '#b45309'
  ctx.font = `bold 13px ${KO}`
  ctx.fillText('광고', 26, 30)

  ctx.fillStyle = '#78350f'
  ctx.font = `bold 17px ${KO}`

  // 낱말 단위로 접는다 — 잘린 문장은 광고 표시로 인정받지 못한다
  const maxWidth = W - 52
  const lines: string[] = []
  let line = ''
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = next
    }
  }
  if (line) lines.push(line)

  lines.slice(0, 2).forEach((l, i) => ctx.fillText(l, 26, 56 + i * 24))
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
}

export default function DisclosureImage({ sample, fileName }: { sample: string; fileName: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [state, setState] = useState<'idle' | 'saved' | 'copied' | 'fail'>('idle')

  useEffect(() => {
    if (ref.current) drawBanner(ref.current, sample)
  }, [sample])

  const flash = (s: 'saved' | 'copied' | 'fail') => {
    setState(s)
    setTimeout(() => setState('idle'), 2200)
  }

  const save = useCallback(async () => {
    const canvas = ref.current
    if (!canvas) return
    const blob = await toBlob(canvas)
    if (!blob) return flash('fail')
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
    flash('saved')
  }, [fileName])

  const copy = useCallback(async () => {
    const canvas = ref.current
    if (!canvas) return
    try {
      const blob = await toBlob(canvas)
      if (!blob) throw new Error('그림을 만들지 못했어요')
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      flash('copied')
    } catch {
      // 그림 복사를 막는 브라우저가 있다 — 그때는 저장해서 올리면 된다
      flash('fail')
    }
  }, [])

  return (
    <div>
      <canvas
        ref={ref}
        style={{ width: '100%', maxWidth: W, height: 'auto' }}
        className="rounded-lg"
        role="img"
        aria-label={sample}
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={save}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-xs font-bold text-[#334155] transition-colors hover:bg-[#f1f5f9]"
        >
          {state === 'saved'
            ? <><Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" /> 저장됨</>
            : <><Download className="h-3.5 w-3.5" aria-hidden="true" /> 이미지 저장</>}
        </button>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-xs font-bold text-[#334155] transition-colors hover:bg-[#f1f5f9]"
        >
          {state === 'copied'
            ? <><Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" /> 복사됨</>
            : <><Copy className="h-3.5 w-3.5" aria-hidden="true" /> 이미지 복사</>}
        </button>
      </div>
      {state === 'fail' && (
        <p className="mt-1.5 text-[11px] text-red-700">
          그림 복사가 막혀 있어요. ‘이미지 저장’으로 내려받아 올려 주세요.
        </p>
      )}
    </div>
  )
}
