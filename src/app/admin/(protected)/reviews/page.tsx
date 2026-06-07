import { createAdminClient } from '@/lib/supabase/admin'
import ReviewAdminList, { type AdminReview } from './ReviewAdminList'

export const dynamic = 'force-dynamic'

export default async function AdminReviewsPage() {
  // 레이아웃(admin/layout.tsx)에서 이미 관리자 권한을 검증한다.
  // RLS상 is_visible=false 후기는 일반 클라이언트로 안 보이므로 service_role로 전체 조회.
  const admin = createAdminClient()
  const { data: rows } = await admin
    .from('reviews')
    .select('id, display_name, content, rating, exam_date, exam_score, proof_path, verified, is_visible, created_at')
    .order('created_at', { ascending: false })

  // 비공개 버킷이라 미리보기는 1시간짜리 서명 URL로 안전하게 전달
  const reviews: AdminReview[] = await Promise.all(
    (rows ?? []).map(async r => {
      let proofUrl: string | null = null
      if (r.proof_path) {
        const { data } = await admin.storage
          .from('review-proofs')
          .createSignedUrl(r.proof_path as string, 60 * 60)
        proofUrl = data?.signedUrl ?? null
      }
      return {
        id: r.id as string,
        displayName: r.display_name as string,
        content: r.content as string,
        rating: r.rating as number,
        examDate: (r.exam_date as string | null) ?? null,
        examScore: (r.exam_score as number | null) ?? null,
        verified: !!r.verified,
        isVisible: r.is_visible !== false,
        createdAt: r.created_at as string,
        proofUrl,
        hasProof: !!r.proof_path,
      }
    })
  )

  const pendingProof = reviews.filter(r => r.hasProof && !r.verified).length

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">후기 관리</h1>
        <p className="text-sm text-gray-500 mt-1">
          총 {reviews.length}개 · 인증 대기 <span className="font-semibold text-amber-600">{pendingProof}</span>개
          (사진 첨부됐지만 미인증)
        </p>
      </div>
      <ReviewAdminList reviews={reviews} />
    </div>
  )
}
