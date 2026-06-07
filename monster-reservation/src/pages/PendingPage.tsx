import { useAuth } from '../lib/AuthContext';
import './LoginPage.css';

export default function PendingPage() {
  const { user, logout, refresh } = useAuth();
  if (!user) return null;

  const isRejected = user.status === 'rejected';
  const isSuspended = user.status === 'suspended';

  let title = '관리자 승인 대기 중';
  let body =
    '가입 신청을 확인 중입니다. 보통 영업일 기준 1일 이내에 승인됩니다.\n승인이 완료되면 다시 로그인해주세요.';
  let icon = '⏳';

  if (isRejected) {
    title = '가입이 거절되었습니다';
    body = user.admin_memo
      ? `사유: ${user.admin_memo}`
      : '관리자에게 문의해주세요.';
    icon = '❌';
  } else if (isSuspended) {
    title = '계정이 일시 정지되었습니다';
    body = user.admin_memo || '관리자에게 문의해주세요.';
    icon = '⛔';
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-hero">
          <div className="logo-icon" style={{ fontSize: 56 }}>{icon}</div>
          <div className="logo-title" style={{ marginTop: 8 }}>{title}</div>
          <p className="login-tag" style={{ whiteSpace: 'pre-line' }}>{body}</p>
        </div>

        <div className="alert alert-success" style={{ background: '#faf5ff', borderColor: '#e9d5ff', color: '#5b21b6' }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>가입 정보</div>
          <div style={{ display: 'grid', gap: 4, fontSize: 13 }}>
            <div>이메일: {user.email}</div>
            <div>유치원: {user.kindergarten_name}</div>
            <div>담당자: {user.contact_name}</div>
            <div>연락처: {user.contact_phone}</div>
            <div>신청일: {user.created_at.slice(0, 10)}</div>
          </div>
        </div>

        <button className="primary-btn" onClick={refresh}>
          승인 여부 다시 확인
        </button>
        <button
          type="button"
          onClick={logout}
          style={{
            background: 'transparent',
            border: '1.5px solid #e5e7eb',
            color: '#6b7280',
            borderRadius: 12,
            padding: 12,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          로그아웃
        </button>
      </div>
    </div>
  );
}
