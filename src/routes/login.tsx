import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#E8DDD1', fontFamily: 'sans-serif' }}>
      <div style={{ width: 400, maxWidth: '95vw', background: '#FFFBF2', borderRadius: 32, padding: 32, textAlign: 'center' }}>
        <div style={{ width: 110, height: 110, background: '#5C3A21', borderRadius: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#fff', fontSize: 72, fontWeight: 800 }}>ش</div>
        <h1 style={{ color: '#3E2410' }}>السوق الشامل</h1>
        <h2 style={{ color: '#3E2410' }}>تسجيل الدخول</h2>
        <p style={{ color: '#8A6D4B' }}>أدخل رقم هاتفك لاستلام رمز التحقق</p>
        <button style={{ width: '100%', background: '#5C3A21', color: '#fff', border: 0, borderRadius: 20, padding: 18, fontSize: 20, fontWeight: 700, marginTop: 16 }}>إرسال رمز التحقق</button>
      </div>
    </div>
  )
}
