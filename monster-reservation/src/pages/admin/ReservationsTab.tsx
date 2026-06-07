import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminApi, type Reservation } from '../../lib/api';

type ReservationStatus = 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'done';
type TabKey = 'all' | 'pending' | 'confirmed' | 'done' | 'cancelled';

const TABS: { key: TabKey; label: string; emoji: string; status?: ReservationStatus[] }[] = [
  { key: 'all', label: '전체', emoji: '✨' },
  { key: 'pending', label: '대기', emoji: '⏳', status: ['pending'] },
  { key: 'confirmed', label: '승인', emoji: '✅', status: ['confirmed'] },
  { key: 'done', label: '완료', emoji: '🎉', status: ['done'] },
  { key: 'cancelled', label: '취소·거절', emoji: '🚫', status: ['cancelled', 'rejected'] },
];

const STATUS_LABEL: Record<ReservationStatus, string> = {
  pending: '대기 중',
  confirmed: '예약 확정',
  rejected: '거절됨',
  cancelled: '취소됨',
  done: '진행 완료',
};

const POLL_MS = 5000;

function dowKor(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return '일월화수목금토'[d.getDay()];
}

function relativeTime(iso: string): string {
  const t = new Date(iso.replace(' ', 'T') + 'Z');
  const diff = Date.now() - t.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

interface Props {
  refreshKey: number;
  bump: () => void;
}

export default function ReservationsTab({ refreshKey, bump }: Props) {
  const [tab, setTab] = useState<TabKey>('pending');
  const [q, setQ] = useState('');
  const [items, setItems] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [detail, setDetail] = useState<Reservation | null>(null);
  const [memoEditing, setMemoEditing] = useState<number | null>(null);
  const [memoDraft, setMemoDraft] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const params: { q?: string } = {};
      if (q.trim()) params.q = q.trim();
      const list = await adminApi.listReservations(params);
      setItems(list);
      setErr(null);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll, refreshKey]);

  useEffect(() => {
    const id = setInterval(() => fetchAll(), POLL_MS);
    return () => clearInterval(id);
  }, [fetchAll]);

  const filtered = useMemo(() => {
    const def = TABS.find((t) => t.key === tab);
    if (!def?.status) return items;
    return items.filter((r) => def.status!.includes(r.status as ReservationStatus));
  }, [items, tab]);

  const counts = useMemo(() => {
    const c: Record<TabKey, number> = { all: items.length, pending: 0, confirmed: 0, done: 0, cancelled: 0 };
    items.forEach((r) => {
      if (r.status === 'pending') c.pending++;
      else if (r.status === 'confirmed') c.confirmed++;
      else if (r.status === 'done') c.done++;
      else if (r.status === 'cancelled' || r.status === 'rejected') c.cancelled++;
    });
    return c;
  }, [items]);

  const updateStatus = async (id: number, status: ReservationStatus) => {
    setBusyId(id);
    try {
      const upd = await adminApi.patchReservation(id, { status });
      setItems((prev) => prev.map((r) => (r.id === id ? upd : r)));
      if (detail?.id === id) setDetail(upd);
      bump();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const saveMemo = async (id: number) => {
    setBusyId(id);
    try {
      const upd = await adminApi.patchReservation(id, { admin_memo: memoDraft });
      setItems((prev) => prev.map((r) => (r.id === id ? upd : r)));
      if (detail?.id === id) setDetail(upd);
      setMemoEditing(null);
      bump();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="reservations-tab">
      <div className="adm-tabs-wrap">
        <div className="adm-tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`adm-tab${tab === t.key ? ' on' : ''}${t.key === 'pending' && counts.pending > 0 ? ' has-new' : ''}`}
              onClick={() => setTab(t.key)}
            >
              <span className="emoji">{t.emoji}</span> {t.label}
              <span className="adm-tab-count">{counts[t.key]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="adm-search-row">
        <input
          className="adm-search"
          placeholder="🔍 유치원·담당자·전화·메모로 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {q && (
          <button className="adm-btn" onClick={() => setQ('')}>
            초기화
          </button>
        )}
      </div>

      {err && <div className="adm-error">⚠️ {err}</div>}

      {loading ? (
        <div className="adm-empty">⏳ 불러오는 중...</div>
      ) : filtered.length === 0 ? (
        <div className="adm-empty">
          <div className="emoji">📭</div>
          <div className="ttl">표시할 예약이 없어요</div>
          <div className="desc">조건을 변경하거나 새 신청을 기다려주세요</div>
        </div>
      ) : (
        <div className="adm-list">
          {filtered.map((r) => (
            <article key={r.id} className={`adm-card s-${r.status}`}>
              <div className="adm-card-head">
                <span className="adm-card-id">#{r.id}</span>
                <span className={`adm-status s-${r.status}`}>{STATUS_LABEL[r.status as ReservationStatus]}</span>
                <span className="adm-card-time">{relativeTime(r.created_at)}</span>
                <button className="adm-detail-btn" onClick={() => setDetail(r)}>
                  상세
                </button>
              </div>
              <div className="adm-card-body">
                <div className="adm-theme">
                  <span className="adm-theme-emoji">{r.theme_emoji}</span>
                  <span className="adm-theme-name">{r.theme_name}</span>
                </div>
                <div className="adm-meta">
                  <span>📅 {r.reservation_date} <em>({dowKor(r.reservation_date)})</em></span>
                  <span>🕐 {r.time_slot}</span>
                  <span>🏫 {r.kindergarten_name}</span>
                  <span>👶 {r.child_count} · {r.class_count}</span>
                </div>
                <div className="adm-contact">
                  <span className="who">{r.contact_name}</span>
                  <a href={`tel:${r.contact_phone}`} className="phone">
                    📞 {r.contact_phone}
                  </a>
                </div>
                {r.note && <div className="adm-note">📝 {r.note}</div>}
                {memoEditing === r.id ? (
                  <div className="adm-memo-edit">
                    <textarea
                      value={memoDraft}
                      onChange={(e) => setMemoDraft(e.target.value)}
                      placeholder="관리자 메모"
                      rows={2}
                    />
                    <div className="adm-memo-actions">
                      <button
                        className="adm-btn adm-btn-primary"
                        disabled={busyId === r.id}
                        onClick={() => saveMemo(r.id)}
                      >
                        저장
                      </button>
                      <button className="adm-btn" onClick={() => setMemoEditing(null)}>
                        취소
                      </button>
                    </div>
                  </div>
                ) : r.admin_memo ? (
                  <div className="adm-memo">
                    💬 {r.admin_memo}
                    <button
                      className="adm-memo-edit-btn"
                      onClick={() => {
                        setMemoEditing(r.id);
                        setMemoDraft(r.admin_memo ?? '');
                      }}
                    >
                      수정
                    </button>
                  </div>
                ) : null}
              </div>
              <div className="adm-card-actions">
                {r.status === 'pending' && (
                  <>
                    <button
                      className="adm-btn adm-btn-approve"
                      onClick={() => updateStatus(r.id, 'confirmed')}
                      disabled={busyId === r.id}
                    >
                      ✓ 승인
                    </button>
                    <button
                      className="adm-btn adm-btn-reject"
                      onClick={() => {
                        if (confirm(`#${r.id} ${r.kindergarten_name} — 거절하시겠습니까?`)) {
                          updateStatus(r.id, 'rejected');
                        }
                      }}
                      disabled={busyId === r.id}
                    >
                      ✕ 거절
                    </button>
                  </>
                )}
                {r.status === 'confirmed' && (
                  <button
                    className="adm-btn adm-btn-done"
                    onClick={() => updateStatus(r.id, 'done')}
                    disabled={busyId === r.id}
                  >
                    🎉 진행 완료
                  </button>
                )}
                {(r.status === 'rejected' || r.status === 'cancelled') && (
                  <button
                    className="adm-btn"
                    onClick={() => updateStatus(r.id, 'pending')}
                    disabled={busyId === r.id}
                  >
                    ↺ 되돌리기
                  </button>
                )}
                {memoEditing !== r.id && (
                  <button
                    className="adm-btn adm-btn-memo"
                    onClick={() => {
                      setMemoEditing(r.id);
                      setMemoDraft(r.admin_memo ?? '');
                    }}
                  >
                    💬 {r.admin_memo ? '메모 보기' : '메모'}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* 상세 모달 */}
      {detail && (
        <div className="adm-modal-bg" onClick={(e) => e.currentTarget === e.target && setDetail(null)}>
          <div className="adm-modal" role="dialog" aria-modal="true">
            <div className="adm-modal-head">
              <div>
                <div className="adm-modal-id">#{detail.id} · {detail.theme_name}</div>
                <div className="adm-modal-sub">
                  <span className={`adm-status s-${detail.status}`}>{STATUS_LABEL[detail.status as ReservationStatus]}</span>
                  <span>{relativeTime(detail.created_at)} 신청</span>
                </div>
              </div>
              <button className="adm-modal-close" onClick={() => setDetail(null)}>
                ✕
              </button>
            </div>
            <div className="adm-modal-body">
              <table className="adm-detail">
                <tbody>
                  <tr><th>예약일</th><td>{detail.reservation_date} ({dowKor(detail.reservation_date)}) {detail.time_slot}</td></tr>
                  <tr><th>테마</th><td>{detail.theme_emoji} {detail.theme_name}</td></tr>
                  <tr><th>인원</th><td>{detail.child_count} · {detail.class_count}</td></tr>
                  <tr><th>유치원</th><td>{detail.kindergarten_name}</td></tr>
                  <tr><th>담당자</th><td>{detail.contact_name}</td></tr>
                  <tr><th>연락처</th><td><a href={`tel:${detail.contact_phone}`}>{detail.contact_phone}</a></td></tr>
                  {detail.note && <tr><th>요청</th><td>{detail.note}</td></tr>}
                  {detail.admin_memo && <tr><th>메모</th><td>{detail.admin_memo}</td></tr>}
                  <tr><th>신청 시각</th><td>{detail.created_at}</td></tr>
                  <tr><th>최종 변경</th><td>{detail.updated_at}</td></tr>
                </tbody>
              </table>
            </div>
            <div className="adm-modal-foot">
              {detail.status === 'pending' && (
                <>
                  <button className="adm-btn adm-btn-approve" onClick={() => updateStatus(detail.id, 'confirmed')} disabled={busyId === detail.id}>승인</button>
                  <button className="adm-btn adm-btn-reject" onClick={() => updateStatus(detail.id, 'rejected')} disabled={busyId === detail.id}>거절</button>
                </>
              )}
              {detail.status === 'confirmed' && (
                <button className="adm-btn adm-btn-done" onClick={() => updateStatus(detail.id, 'done')} disabled={busyId === detail.id}>완료 처리</button>
              )}
              <button className="adm-btn" onClick={() => setDetail(null)}>닫기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
