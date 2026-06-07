import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminApi, type Reservation } from '../../lib/api';

interface DayCell {
  day: number;
  dateStr: string;
  isPast: boolean;
  total: number;
  confirmed: number;
  pending: number;
  done: number;
  cancelled: number;
}

const TIME_SLOTS = ['10:00', '11:30', '14:00', '16:00'];

export default function CalendarTab() {
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);
  const [cursor, setCursor] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [items, setItems] = useState<Reservation[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const fetchMonth = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const list = await adminApi.listReservations({});
      const ym = `${cursor.y}-${String(cursor.m + 1).padStart(2, '0')}`;
      setItems(list.filter((r) => r.reservation_date.startsWith(ym)));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [cursor.y, cursor.m]);

  useEffect(() => {
    fetchMonth();
  }, [fetchMonth]);

  const cells = useMemo<DayCell[]>(() => {
    const firstDay = new Date(cursor.y, cursor.m, 1).getDay();
    const daysIn = new Date(cursor.y, cursor.m + 1, 0).getDate();
    const out: DayCell[] = [];
    for (let i = 0; i < firstDay; i++) {
      out.push({ day: 0, dateStr: '', isPast: false, total: 0, confirmed: 0, pending: 0, done: 0, cancelled: 0 });
    }
    for (let d = 1; d <= daysIn; d++) {
      const dt = new Date(cursor.y, cursor.m, d);
      const isPast = dt < today;
      const ds = `${cursor.y}-${String(cursor.m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayItems = items.filter((r) => r.reservation_date === ds);
      out.push({
        day: d,
        dateStr: ds,
        isPast,
        total: dayItems.length,
        confirmed: dayItems.filter((r) => r.status === 'confirmed').length,
        pending: dayItems.filter((r) => r.status === 'pending').length,
        done: dayItems.filter((r) => r.status === 'done').length,
        cancelled: dayItems.filter((r) => r.status === 'cancelled' || r.status === 'rejected').length,
      });
    }
    return out;
  }, [cursor.y, cursor.m, items, today]);

  const changeMonth = (delta: number) => {
    let m = cursor.m + delta;
    let y = cursor.y;
    if (m < 0) {
      m = 11;
      y--;
    }
    if (m > 11) {
      m = 0;
      y++;
    }
    setCursor({ y, m });
    setSelectedDate(null);
  };

  const dayDetail = selectedDate ? items.filter((r) => r.reservation_date === selectedDate) : [];

  return (
    <div className="calendar-tab">
      <div className="cal-head">
        <button className="adm-btn" onClick={() => changeMonth(-1)} aria-label="이전 달">‹</button>
        <div className="cal-title">
          {cursor.y}년 {cursor.m + 1}월
        </div>
        <button className="adm-btn" onClick={() => changeMonth(1)} aria-label="다음 달">›</button>
        <button
          className="adm-btn"
          onClick={() => {
            const t = new Date();
            setCursor({ y: t.getFullYear(), m: t.getMonth() });
            setSelectedDate(null);
          }}
        >
          오늘로
        </button>
      </div>

      {err && <div className="adm-error">⚠️ {err}</div>}

      <div className="adm-cal-grid">
        <div className="adm-cal-dow sun">일</div>
        <div className="adm-cal-dow">월</div>
        <div className="adm-cal-dow">화</div>
        <div className="adm-cal-dow">수</div>
        <div className="adm-cal-dow">목</div>
        <div className="adm-cal-dow">금</div>
        <div className="adm-cal-dow sat">토</div>
        {cells.map((c, i) => {
          if (c.day === 0) return <div key={`e${i}`} className="adm-cal-day empty" />;
          const isSelected = selectedDate === c.dateStr;
          return (
            <button
              key={c.dateStr}
              className={`adm-cal-day${c.isPast ? ' past' : ''}${isSelected ? ' selected' : ''}${c.total > 0 ? ' has-events' : ''}`}
              onClick={() => setSelectedDate(c.dateStr)}
            >
              <div className="d-num">{c.day}</div>
              {c.total > 0 && (
                <div className="d-events">
                  {c.confirmed > 0 && <span className="d-dot ev-confirmed">{c.confirmed}</span>}
                  {c.pending > 0 && <span className="d-dot ev-pending">{c.pending}</span>}
                  {c.done > 0 && <span className="d-dot ev-done">{c.done}</span>}
                  {c.cancelled > 0 && <span className="d-dot ev-cancelled">{c.cancelled}</span>}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="cal-legend">
        <span><i className="ev-confirmed" /> 확정</span>
        <span><i className="ev-pending" /> 대기</span>
        <span><i className="ev-done" /> 완료</span>
        <span><i className="ev-cancelled" /> 취소·거절</span>
      </div>

      {loading && <div className="adm-empty">⏳ 불러오는 중...</div>}

      {selectedDate && (
        <div className="cal-detail-card">
          <h3>{selectedDate} 예약 — {dayDetail.length}건</h3>
          {dayDetail.length === 0 ? (
            <div className="adm-empty"><div className="ttl">이 날에 예약 없음</div></div>
          ) : (
            <table className="cal-detail-table">
              <thead>
                <tr>
                  <th>시간</th>
                  <th>테마</th>
                  <th>유치원</th>
                  <th>인원</th>
                  <th>상태</th>
                  <th>연락처</th>
                </tr>
              </thead>
              <tbody>
                {TIME_SLOTS.map((slot) => {
                  const slotItems = dayDetail.filter((r) => r.time_slot === slot);
                  if (slotItems.length === 0)
                    return (
                      <tr key={slot} className="cal-slot-empty">
                        <td>{slot}</td>
                        <td colSpan={5} style={{ color: '#9ca3af' }}>(빈 슬롯)</td>
                      </tr>
                    );
                  return slotItems.map((r) => (
                    <tr key={r.id}>
                      <td>{slot}</td>
                      <td>
                        {r.theme_emoji} {r.theme_name}
                      </td>
                      <td>{r.kindergarten_name}</td>
                      <td>{r.child_count}</td>
                      <td><span className={`adm-status s-${r.status}`}>{r.status}</span></td>
                      <td>
                        <a href={`tel:${r.contact_phone}`}>{r.contact_phone}</a>
                      </td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
