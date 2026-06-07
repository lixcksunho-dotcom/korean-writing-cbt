import AdminLoginForm from './AdminLoginForm'

export const metadata = { title: '관리자 로그인', robots: { index: false, follow: false } }

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  return <AdminLoginForm forbidden={error === 'forbidden'} />
}
