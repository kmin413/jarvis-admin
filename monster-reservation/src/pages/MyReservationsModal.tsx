import { useCallback, useEffect, useState } from 'react';
import { api, type Reservation } from '../lib/api';
import './MyReservationsModal.css';

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending: { label: '승인 대기', color: '#f59e0b' },
  confirmed: { label: '예약 확정', color: '#3b82f6' },
  rejected: { label: '거절됨', color: '#ef4444' },
  cancelled: { label: '취소됨', color: '#6b7280' },
  done: { label: '완료', color: '#10b981' },
};

function dowKor(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return '일월화수목금토'[d.getDay()];
}

interface Props {
  onClose: () => void;
}

export default function MyReservationsModal({ onClose }: Props) {
  const [items, setItems] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const list = await api.myReservations();
      setItems(list);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const cancel = async (r: Reservation) => {
    if (!confirm(`${r.reservation_date} ${r.time_slot} ${r.theme_name} 예약을 취소하시겠습니까?`)) return;
    setBusyId(r.id);
    try {
      const upd = await api.cancelMyReservation(r.id);
      setItems((prev) => prev.map((x) => (x.id === r.id ? upd : x)));
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div
      className="myres-bg"
      onClick={(e) => {
        if (e.currentTarget === e.target) onClose();
      }}
    >
      <div className="myres-modal" role="dialog" aria-modal="true">
        <div className="myres-head">
          <div>
            <div className="myres-title">📋 내 예약 내역</div>
            <div className="myres-sub">{items.length}건의 예약이 있습니다</div>
          </div>
          <button className="myres-close" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>

        {err && <div className="myres-error">⚠️ {err}</div>}

        <div className="myres-body">
          {loading ? (
            <div className="myres-empty">⏳ 불러오는 중...</div>
          ) : items.length === 0 ? (
            <div className="myres-empty">
              <div className="emoji">📭</div>
              <div className="ttl">아직 예약이 없어요</div>
              <div className="desc">캘린더에서 첫 예약을 시작해보세요!</div>
            </div>
          ) : (
            <div className="myres-list">
              {items.map((r) => {
                const st = STATUS_LABEL[r.status] ?? { label: r.status, color: '#9ca3af' };
                const canCancel = r.status === 'pending' || r.status === 'confirmed';
                const isPast = new Date(r.reservation_date) < new Date(new Date().toDateString());
                return (
                  <article key={r.id} className="myres-card">
                    <div className="myres-card-head">
                      <span className="myres-card-id">#{r.id}</span>
                      <span
                        className="myres-status"
                        style={{ background: st.color + '20', color: st.color }}
                      >
                        {st.label}
                      </span>
                    </div>
                    <div className="myres-card-theme">
                      <span className="myres-emoji">{r.theme_emoji}</span>
                      <span className="myres-theme-name">{r.theme_name}</span>
                    </div>
                    <div className="myres-card-meta">
                      <div>
                        <span className="key">📅 날짜</span>
                        <span className="val">
                          {r.reservation_date} ({dowKor(r.reservation_date)})
                        </span>
                      </div>
                      <div>
                        <span className="key">🕐 시간</span>
                        <span className="val">{r.time_slot}</span>
                      </div>
                      <div>
                        <span className="key">👶 인원</span>
                        <span className="val">{r.child_count} · {r.class_count}</span>
                      </div>
                      <div>
                        <span className="key">📞 연락처</span>
                        <span className="val">{r.contact_phone}</span>
                      </div>
                    </div>
                    {r.note && (
                      <div className="myres-note">📝 {r.note}</div>
                    )}
                    {r.admin_memo && (
                      <div className="myres-memo">💬 관리자 메모: {r.admin_memo}</div>
                    )}
                    {canCancel && !isPast && (
                      <div className="myres-actions">
                        <button
                          className="myres-cancel-btn"
                          disabled={busyId === r.id}
                          onClick={() => cancel(r)}
                        >
                          {busyId === r.id ? '취소 중...' : '예약 취소'}
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
