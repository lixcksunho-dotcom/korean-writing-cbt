'use client'

import dynamic from 'next/dynamic'

const PaymentButton = dynamic(() => import('./PaymentButton'), {
  ssr: false,
  loading: () => (
    <div className="space-y-3">
      {[0, 1, 2].map(i => (
        <div key={i} className="w-full h-14 rounded-xl bg-gray-100 animate-pulse" />
      ))}
    </div>
  ),
})

export default function PaymentSection({
  userId,
  userEmail,
  userName,
}: {
  userId: string
  userEmail: string
  userName: string
}) {
  return <PaymentButton userId={userId} userEmail={userEmail} userName={userName} />
}
