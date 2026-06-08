// 페이지 이동 시 즉시 표시되는 스켈레톤 — 데이터 로딩 동안 빈 화면 대기를 없애 체감 속도를 끌어올린다.
export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-7 w-40 rounded-lg bg-[#e9eef5] mb-5" />
      <div className="h-28 rounded-2xl bg-[#eef2f7] mb-6" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="h-24 rounded-2xl bg-[#eef2f7]" />
        ))}
      </div>
      <div className="h-44 rounded-2xl bg-[#eef2f7] mb-4" />
      <div className="h-44 rounded-2xl bg-[#eef2f7]" />
    </div>
  )
}
