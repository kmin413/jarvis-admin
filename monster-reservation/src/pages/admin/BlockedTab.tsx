import { useCallback, useEffect, useState } from 'react';
import { adminApi, type BlockedSlot } from '../../lib/api';

const TIME_SLOTS = ['10:00', '11:30', '14:00', '16:00'];

export default function BlockedTab() {
  const today = new Date();
  const [cursor, setCursor] = useState({ y: today.getFullYear(), m: today.getMonth() + 1 });
  const [items, setItems] = useState<BlockedSlot[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 폼
  const [date, setDate] = useState(today.toISOString().slice(0, 10));
  const [slot, setSlot] = useState<string>('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const list = await adminApi.listBlocked({ year: cursor.y, month: cursor.m });
      setItems(list);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [cursor.y, cursor.m]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await adminApi.addBlocked({
        block_date: date,
        time_slot: slot || null,
        reason: reason || undefined,
      });
      setReason('');
      await fetchAll();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm('이 차단을 해제하시겠습니까?')) return;
    try {
      await adminApi.deleteBlocked(id);
      setItems((prev) => prev.filter((b) => b.id !== id));
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const changeMonth = (delta: number) => {
    let m = cursor.m + delta;
    let y = cursor.y;
    if (m < 1) {
      m = 12;
      y--;
    }
    if (m > 12) {
      m = 1;
      y++;
    }
    setCursor({ y, m });
  };

  return (
    <div className="blocked-tab">
      <div className="cal-head">
        <button className="adm-btn" onClick={() => changeMonth(-1)}>‹</button>
        <div className="cal-title">{cursor.y}년 {cursor.m}월 차단 슬롯</div>
        <button className="adm-btn" onClick={() => changeMonth(1)}>›</button>
      </div>

      <form className="blocked-form" onSubmit={submit}>
        <label>
          <span>차단 날짜 *</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <label>
          <span>시간 슬롯</span>
          <select value={slot} onChange={(e) => setSlot(e.target.value)}>
            <option value="">하루 종일</option>
            {TIME_SLOTS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="grow">
          <span>사유 (선택)</span>
          <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="예) 강사 휴무" />
        </label>
        <button className="adm-btn adm-btn-primary" type="submit" disabled={busy}>
          {busy ? '추가 중...' : '➕ 차단 추가'}
        </button>
      </form>

      {err && <div className="adm-error">⚠️ {err}</div>}

      {loading ? (
        <div className="adm-empty">⏳ 불러오는 중...</div>
      ) : items.length === 0 ? (
        <div className="adm-empty">
          <div className="emoji">🟢</div>
          <div className="ttl">이번 달 차단된 슬롯이 없습니다</div>
        </div>
      ) : (
        <table className="blocked-table">
          <thead>
            <tr>
              <th>날짜</th>
              <th>시간</th>
              <th>사유</th>
              <th>등록일</th>
              <th>해제</th>
            </tr>
          </thead>
          <tbody>
            {items.map((b) => (
              <tr key={b.id}>
                <td>{b.block_date}</td>
                <td>{b.time_slot ?? <strong style={{ color: '#b91c1c' }}>하루 종일</strong>}</td>
                <td>{b.reason ?? '-'}</td>
                <td>{b.created_at.slice(0, 16)}</td>
                <td>
                  <button className="adm-btn adm-btn-reject" onClick={() => remove(b.id)}>
                    해제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
