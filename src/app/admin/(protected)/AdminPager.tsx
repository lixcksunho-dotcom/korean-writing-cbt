import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

// 목록 화면의 이전/다음. 서버 컴포넌트 — 페이지는 주소(`?page=`)에만 있어 새로고침해도 그 자리다.
export default function AdminPager({
  page, pageSize, total, href, label = '건',
}: {
  page: number
  pageSize: number
  total: number
  /** 페이지 번호를 받아 주소를 만든다 — 검색어 같은 다른 조건을 같이 실을 수 있게 */
  href: (page: number) => string
  label?: string
}) {
  const lastPage = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)
  const linkCls = 'inline-flex items-center gap-1 min-h-11 px-3 rounded-lg text-sm font-bold border'
  const on = `${linkCls} border-gray-300 bg-white text-gray-900 hover:bg-gray-50`
  const off = `${linkCls} border-gray-200 bg-gray-50 text-gray-500 cursor-default`

  return (
    <nav aria-label="페이지 이동" className="mt-4 flex items-center justify-between gap-3">
      <p className="text-sm text-gray-600 tabular-nums">
        {total === 0 ? `0${label}` : `${from}–${to}${label} / 전체 ${total}${label}`} · {page}/{lastPage}쪽
      </p>
      <div className="flex items-center gap-2">
        {page > 1
          ? <Link href={href(page - 1)} className={on}><ChevronLeft className="h-4 w-4" aria-hidden="true" />이전</Link>
          : <span aria-disabled="true" className={off}><ChevronLeft className="h-4 w-4" aria-hidden="true" />이전</span>}
        {page < lastPage
          ? <Link href={href(page + 1)} className={on}>다음<ChevronRight className="h-4 w-4" aria-hidden="true" /></Link>
          : <span aria-disabled="true" className={off}>다음<ChevronRight className="h-4 w-4" aria-hidden="true" /></span>}
      </div>
    </nav>
  )
}
