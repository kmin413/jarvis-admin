import { useEffect, useState } from 'react';
import { adminApi, type AdminStats } from '../../lib/api';

interface Props {
  refreshKey: number;
  onGotoUsers?: () => void;
}

const krw = (n: number) => '₩' + n.toLocaleString('ko-KR');

export default function StatsPanel({ refreshKey, onGotoUsers }: Props) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    adminApi
      .stats()
      .then((s) => {
        if (!cancelled) setStats(s);
      })
      .catch((e) => !cancelled && setErr((e as Error).message));
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  if (err) return <div className="adm-error">⚠️ {err}</div>;
  if (!stats) return <div className="adm-empty"><div className="emoji">⏳</div><div className="ttl">통계 불러오는 중...</div></div>;

  const t = stats.totals;

  return (
    <div className="stats-grid">
      <div className="stat-card primary">
        <div className="stat-label">이번 달 매출 (확정·완료)</div>
        <div className="stat-value">{krw(t.this_month_revenue_krw)}</div>
        <div className="stat-foot">예약 {t.this_month}건</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">최근 7일 예약</div>
        <div className="stat-value">{t.this_week}</div>
        <div className="stat-foot">건</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">전체 예약</div>
        <div className="stat-value">{t.all_reservations}</div>
        <div className="stat-foot">누적</div>
      </div>
      <div className="stat-card" style={{ cursor: onGotoUsers ? 'pointer' : 'default' }} onClick={onGotoUsers}>
        <div className="stat-label">승인 대기 회원</div>
        <div className="stat-value">{stats.users.pending}</div>
        <div className="stat-foot">{onGotoUsers ? '관리 →' : '명'}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">승인 회원</div>
        <div className="stat-value">{stats.users.approved}</div>
        <div className="stat-foot">유치원</div>
      </div>

      <div className="stat-card wide">
        <div className="stat-label">상태별 예약</div>
        <div className="stat-row">
          {Object.entries(stats.by_status).map(([k, v]) => (
            <div key={k} className="stat-chip">
              <span className={`status-pill s-${k}`}>{k}</span>
              <strong>{v}</strong>
            </div>
          ))}
        </div>
      </div>

      <div className="stat-card wide">
        <div className="stat-label">이번 달 인기 테마 TOP 5</div>
        {stats.top_themes.length === 0 ? (
          <div className="stat-empty">아직 데이터가 없습니다.</div>
        ) : (
          <ol className="top-themes">
            {stats.top_themes.map((t, idx) => (
              <li key={t.id}>
                <span className="rank">#{idx + 1}</span>
                <span className="emoji">{t.emoji ?? '🎨'}</span>
                <span className="name">{t.name}</span>
                <span className="cnt">{t.cnt}건</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
