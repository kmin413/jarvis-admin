/**
 * 오감몬스터 관리자 — 통합 콘솔
 * 대시보드 / 예약 신청 / 회원 관리 / 캘린더 / 차단 슬롯
 */
import { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import StatsPanel from './admin/StatsPanel';
import ReservationsTab from './admin/ReservationsTab';
import UsersTab from './admin/UsersTab';
import CalendarTab from './admin/CalendarTab';
import BlockedTab from './admin/BlockedTab';
import ThemesTab from './admin/ThemesTab';
import './AdminPage.css';

type AdminTab = 'dashboard' | 'reservations' | 'users' | 'calendar' | 'blocked' | 'themes';

const TABS: { key: AdminTab; label: string; emoji: string }[] = [
  { key: 'dashboard',    label: '대시보드',  emoji: '📊' },
  { key: 'reservations', label: '예약 신청', emoji: '📨' },
  { key: 'users',        label: '회원 관리', emoji: '👥' },
  { key: 'calendar',     label: '캘린더',    emoji: '📅' },
  { key: 'blocked',      label: '차단 슬롯', emoji: '🚫' },
  { key: 'themes',       label: '테마 관리', emoji: '🎨' },
];

export default function AdminPage() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<AdminTab>('dashboard');
  // 자식 컴포넌트들 새로고침 트리거
  const [refreshKey, setRefreshKey] = useState(0);
  const bump = () => setRefreshKey((k) => k + 1);

  return (
    <div className="adm-root">
      <nav className="adm-nav">
        <div className="adm-brand">
          <img src="/images/ogam/logo.png" alt="오감몬스터" className="adm-logo" />
          <span className="adm-brand-tag">관리자</span>
        </div>
        <div className="adm-nav-right">
          {user && <span className="adm-user-tag">👤 {user.email}</span>}
          <a className="adm-customer-link" href="/">고객 페이지 →</a>
          <button className="adm-btn" onClick={logout}>로그아웃</button>
        </div>
      </nav>

      <header className="adm-hero">
        <div className="adm-hero-wrap">
          <div>
            <h1 className="adm-title">
              {TABS.find((t) => t.key === tab)?.emoji} {TABS.find((t) => t.key === tab)?.label}
            </h1>
            <p className="adm-sub">오감몬스터 운영 관리 콘솔</p>
          </div>
          <button className="adm-refresh" onClick={bump}>↻ 새로고침</button>
        </div>
        <div className="adm-pagetabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`adm-pagetab${tab === t.key ? ' on' : ''}`}
              onClick={() => setTab(t.key)}
            >
              <span className="emoji">{t.emoji}</span> {t.label}
            </button>
          ))}
        </div>
      </header>

      <main className="adm-main">
        {tab === 'dashboard' && (
          <StatsPanel refreshKey={refreshKey} onGotoUsers={() => setTab('users')} />
        )}
        {tab === 'reservations' && <ReservationsTab refreshKey={refreshKey} bump={bump} />}
        {tab === 'users' && <UsersTab refreshKey={refreshKey} bump={bump} />}
        {tab === 'calendar' && <CalendarTab />}
        {tab === 'blocked' && <BlockedTab />}
        {tab === 'themes' && <ThemesTab />}
      </main>
    </div>
  );
}
