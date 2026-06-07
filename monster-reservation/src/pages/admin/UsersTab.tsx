import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminApi, type User, type UserStatus } from '../../lib/api';

const STATUS_TABS: { key: 'pending' | 'approved' | 'rejected' | 'all'; label: string; emoji: string }[] = [
  { key: 'pending', label: '승인 대기', emoji: '⏳' },
  { key: 'approved', label: '승인 완료', emoji: '✅' },
  { key: 'rejected', label: '거절', emoji: '❌' },
  { key: 'all', label: '전체', emoji: '👥' },
];

const STATUS_LABEL: Record<UserStatus, string> = {
  pending: '승인 대기',
  approved: '승인 완료',
  rejected: '거절',
  suspended: '정지',
};

interface Props {
  refreshKey: number;
  bump: () => void;
}

export default function UsersTab({ refreshKey, bump }: Props) {
  const [tab, setTab] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [q, setQ] = useState('');
  const [items, setItems] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [memoEditing, setMemoEditing] = useState<number | null>(null);
  const [memoDraft, setMemoDraft] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const params: { status?: string; q?: string } = {};
      if (tab !== 'all') params.status = tab;
      if (q.trim()) params.q = q.trim();
      const list = await adminApi.listUsers(params);
      setItems(list);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [tab, q]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers, refreshKey]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { pending: 0, approved: 0, rejected: 0, all: items.length };
    items.forEach((u) => {
      if (u.status in c) c[u.status]++;
    });
    return c;
  }, [items]);

  const patch = async (id: number, data: { status?: UserStatus; admin_memo?: string }) => {
    setBusyId(id);
    try {
      const upd = await adminApi.patchUser(id, data);
      setItems((prev) => prev.map((u) => (u.id === id ? upd : u)));
      bump();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const approve = (u: User) => patch(u.id, { status: 'approved' });
  const reject = (u: User) => {
    const reason = prompt(`#${u.id} ${u.kindergarten_name} 거절 사유를 입력하세요 (선택):`, '');
    if (reason === null) return;
    patch(u.id, { status: 'rejected', admin_memo: reason || undefined });
  };
  const reactivate = (u: User) => patch(u.id, { status: 'approved' });

  return (
    <div className="users-tab">
      <div className="adm-tabs-wrap">
        <div className="adm-tabs">
          {STATUS_TABS.map((t) => (
            <button
              key={t.key}
              className={`adm-tab${tab === t.key ? ' on' : ''}${t.key === 'pending' && counts.pending > 0 ? ' has-new' : ''}`}
              onClick={() => setTab(t.key)}
            >
              <span className="emoji">{t.emoji}</span> {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="adm-search-row">
        <input
          className="adm-search"
          placeholder="🔍 유치원·담당자·이메일·전화로 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') fetchUsers();
          }}
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
      ) : items.length === 0 ? (
        <div className="adm-empty">
          <div className="emoji">📭</div>
          <div className="ttl">해당 조건의 회원이 없어요</div>
        </div>
      ) : (
        <div className="adm-list">
          {items.map((u) => (
            <article key={u.id} className={`adm-card u-${u.status}`}>
              <div className="adm-card-head">
                <span className="adm-card-id">#{u.id}</span>
                <span className={`adm-status u-${u.status}`}>{STATUS_LABEL[u.status]}</span>
                <span className="adm-card-time">{u.created_at.slice(0, 16)} 가입</span>
              </div>
              <div className="adm-card-body">
                <div className="adm-theme">
                  <span className="adm-theme-emoji">🏫</span>
                  <span className="adm-theme-name">{u.kindergarten_name}</span>
                </div>
                <div className="adm-meta">
                  <span>👤 {u.contact_name}</span>
                  <span>📧 {u.email}</span>
                  <span>📞 {u.contact_phone}</span>
                  {u.approved_at && <span>✅ {u.approved_at.slice(0, 16)} 승인</span>}
                </div>

                {memoEditing === u.id ? (
                  <div className="adm-memo-edit">
                    <textarea
                      value={memoDraft}
                      onChange={(e) => setMemoDraft(e.target.value)}
                      placeholder="관리자 메모 (거절 사유 등)"
                      rows={2}
                    />
                    <div className="adm-memo-actions">
                      <button
                        className="adm-btn adm-btn-primary"
                        disabled={busyId === u.id}
                        onClick={async () => {
                          await patch(u.id, { admin_memo: memoDraft });
                          setMemoEditing(null);
                        }}
                      >
                        저장
                      </button>
                      <button className="adm-btn" onClick={() => setMemoEditing(null)}>
                        취소
                      </button>
                    </div>
                  </div>
                ) : u.admin_memo ? (
                  <div className="adm-memo">
                    💬 {u.admin_memo}
                    <button
                      className="adm-memo-edit-btn"
                      onClick={() => {
                        setMemoEditing(u.id);
                        setMemoDraft(u.admin_memo ?? '');
                      }}
                    >
                      수정
                    </button>
                  </div>
                ) : null}
              </div>
              <div className="adm-card-actions">
                {u.status === 'pending' && (
                  <>
                    <button
                      className="adm-btn adm-btn-approve"
                      disabled={busyId === u.id}
                      onClick={() => approve(u)}
                    >
                      ✓ 승인
                    </button>
                    <button
                      className="adm-btn adm-btn-reject"
                      disabled={busyId === u.id}
                      onClick={() => reject(u)}
                    >
                      ✕ 거절
                    </button>
                  </>
                )}
                {u.status === 'approved' && (
                  <button
                    className="adm-btn adm-btn-reject"
                    disabled={busyId === u.id}
                    onClick={() => {
                      if (confirm(`${u.kindergarten_name} 계정을 일시정지 하시겠습니까?`)) {
                        patch(u.id, { status: 'suspended' });
                      }
                    }}
                  >
                    ⛔ 일시정지
                  </button>
                )}
                {(u.status === 'rejected' || u.status === 'suspended') && (
                  <button
                    className="adm-btn"
                    disabled={busyId === u.id}
                    onClick={() => reactivate(u)}
                  >
                    ↺ 다시 승인
                  </button>
                )}
                {memoEditing !== u.id && (
                  <button
                    className="adm-btn adm-btn-memo"
                    onClick={() => {
                      setMemoEditing(u.id);
                      setMemoDraft(u.admin_memo ?? '');
                    }}
                  >
                    💬 메모
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
