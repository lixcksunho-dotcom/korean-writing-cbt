import { ClipboardList, Target, Pencil, FileText, BarChart3, Lightbulb } from 'lucide-react'

// 카테고리 아이콘을 이모지 대신 lucide로 그린다.
//
// 왜: 블로그 목록 첫 화면에 이모지가 12개 넘게 있어(칩 6 + 카드들) 첫 레이아웃 안에서
// 이모지 글꼴(Segoe UI Emoji 등)을 읽는다. 자매 서비스에서 같은 자리를 lucide로 바꿔
// TBT가 눈에 띄게 내려갔다(REPORT 3차). 색은 카테고리 테마를 그대로 따른다.
const ICONS = {
  'exam-info': ClipboardList,
  study: Target,
  grammar: Pencil,
  writing: FileText,
  'mock-exam': BarChart3,
  guide: Lightbulb,
} as const

export default function CategoryIcon({ slug, className = 'h-3.5 w-3.5' }: { slug: string; className?: string }) {
  const Icon = ICONS[slug as keyof typeof ICONS] ?? ClipboardList
  return <Icon className={className} aria-hidden="true" />
}
