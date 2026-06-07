import { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { formatKoreanPhone, isValidKoreanPhone, isValidEmail } from '../lib/format';
import './LoginPage.css';

interface Props {
  mode: 'customer' | 'admin';
}

type Tab = 'login' | 'signup';

export default function LoginPage({ mode }: Props) {
  const auth = useAuth();
  const isAdmin = mode === 'admin';
  const [tab, setTab] = useState<Tab>('login');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signupDone, setSignupDone] = useState(false);

  // 폼 상태
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [kg, setKg] = useState('');
  const [contact, setContact] = useState('');
  const [phone, setPhone] = useState('');

  async function submitLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (isAdmin) {
        await auth.adminLogin(email.trim(), password);
      } else {
        await auth.login(email.trim(), password);
      }
    } catch (err) {
      setError((err as Error).message || '로그인에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  async function submitSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isValidEmail(email)) {
      setError('이메일 형식을 확인해주세요.');
      return;
    }
    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.');
      return;
    }
    if (!isValidKoreanPhone(phone)) {
      setError('연락처를 올바르게 입력해주세요. (예: 010-0000-0000)');
      return;
    }
    setBusy(true);
    try {
      await auth.signup({
        email: email.trim(),
        password,
        kindergarten_name: kg.trim(),
        contact_name: contact.trim(),
        contact_phone: phone.trim(),
      });
      setSignupDone(true);
      setTab('login');
    } catch (err) {
      setError((err as Error).message || '회원가입에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-hero">
          <div className="login-logo">
            <span className="logo-icon">🌈</span>
            <div>
              <div className="logo-title">오감몬스터</div>
              <div className="logo-sub">{isAdmin ? '관리자 콘솔' : '유치원 예약 시스템'}</div>
            </div>
          </div>
          {!isAdmin && (
            <p className="login-tag">
              승인된 유치원만 가격·테마·예약을 확인할 수 있습니다.<br />
              가입 후 관리자 승인까지 잠시만 기다려주세요.
            </p>
          )}
          {isAdmin && (
            <p className="login-tag">관리자 계정으로 로그인하세요.</p>
          )}
        </div>

        {!isAdmin && (
          <div className="tab-bar">
            <button
              type="button"
              className={tab === 'login' ? 'tab active' : 'tab'}
              onClick={() => {
                setTab('login');
                setError(null);
              }}
            >
              로그인
            </button>
            <button
              type="button"
              className={tab === 'signup' ? 'tab active' : 'tab'}
              onClick={() => {
                setTab('signup');
                setError(null);
                setSignupDone(false);
              }}
            >
              회원가입
            </button>
          </div>
        )}

        {signupDone && tab === 'login' && (
          <div className="alert alert-success">
            가입 신청이 접수되었습니다. 관리자 승인 후 로그인할 수 있습니다.<br />
            (보통 영업일 기준 1일 이내)
          </div>
        )}

        {tab === 'login' || isAdmin ? (
          <form className="login-form" onSubmit={submitLogin}>
            <label>
              <span>이메일</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="kindergarten@example.com"
                required
                autoComplete="username"
              />
            </label>
            <label>
              <span>비밀번호</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </label>

            {error && <div className="alert alert-error">{error}</div>}

            <button className="primary-btn" type="submit" disabled={busy}>
              {busy ? '확인 중...' : isAdmin ? '관리자 로그인' : '로그인'}
            </button>
          </form>
        ) : (
          <form className="login-form" onSubmit={submitSignup}>
            <label>
              <span>이메일 *</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="kindergarten@example.com"
                required
              />
            </label>
            <label>
              <span>비밀번호 * (6자 이상)</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
                autoComplete="new-password"
              />
            </label>
            <label>
              <span>유치원/어린이집 이름 *</span>
              <input
                type="text"
                value={kg}
                onChange={(e) => setKg(e.target.value)}
                placeholder="예) 행복어린이집"
                required
              />
            </label>
            <label>
              <span>담당자 이름 *</span>
              <input
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                required
              />
            </label>
            <label>
              <span>연락처 *</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(formatKoreanPhone(e.target.value))}
                placeholder="010-0000-0000"
                maxLength={14}
                inputMode="tel"
                required
              />
            </label>

            {error && <div className="alert alert-error">{error}</div>}

            <button className="primary-btn" type="submit" disabled={busy}>
              {busy ? '신청 중...' : '가입 신청'}
            </button>
            <p className="hint">
              가입 후 관리자 승인이 필요합니다. 승인이 완료되면 로그인할 수 있습니다.
            </p>
          </form>
        )}

        {!isAdmin && (
          <div className="footer-links">
            <a href="/?view=admin">관리자 콘솔 →</a>
          </div>
        )}
        {isAdmin && (
          <div className="footer-links">
            <a href="/">고객 페이지로 돌아가기 →</a>
          </div>
        )}
      </div>
    </div>
  );
}
