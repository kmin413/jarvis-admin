/**
 * 오감몬스터 예약 페이지 (v2 — 디자인 시안 이식)
 * - 데이터: src/data/themes.ts
 * - 스타일: ReservationPage.css
 * - 모바일 우선 (하단 고정 CTA 바)
 */
import { useEffect, useMemo, useState } from 'react';
import { THEMES, CATEGORIES, POPULAR_THEMES, filterByCategory, type CategoryTab, type Theme } from '../data/themes';
import { api, ApiError, type ReservationPayload, type DateAvailability } from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import { formatKoreanPhone, isValidKoreanPhone } from '../lib/format';
import MyReservationsModal from './MyReservationsModal';
import './ReservationPage.css';

const TIME_SLOTS = ['10:00', '11:30', '14:00', '16:00'];

const fmtKRW = (n: number) => '₩' + n.toLocaleString();

interface SelectedDate { y: number; m: number; d: number; }
const fmtDate = (sd: SelectedDate | null) =>
  sd ? `${sd.y}년 ${sd.m + 1}월 ${sd.d}일` : '';

// ─── 캘린더 ───
function Calendar({
  cursor,
  setCursor,
  selected,
  onSelect,
  today,
  availabilityMap,
}: {
  cursor: { y: number; m: number };
  setCursor: (c: { y: number; m: number }) => void;
  selected: SelectedDate | null;
  onSelect: (d: number) => void;
  today: Date;
  availabilityMap: Record<string, 'available' | 'limited' | 'full'>;
}) {
  const firstDay = new Date(cursor.y, cursor.m, 1).getDay();
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();

  const cells: React.ReactNode[] = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push(<div key={`e${i}`} className="cal-day empty" />);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(cursor.y, cursor.m, d);
    const dow = dt.getDay();
    const isToday =
      dt.getFullYear() === today.getFullYear() &&
      dt.getMonth() === today.getMonth() &&
      dt.getDate() === today.getDate();
    const isPast = dt < today && !isToday;

    const dateKey = `${cursor.y}-${String(cursor.m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const availability: 'available' | 'limited' | 'full' =
      isPast ? 'full' : (availabilityMap[dateKey] ?? 'available');

    const cls = [
      'cal-day',
      isPast && 'past',
      dow === 0 && 'sun',
      dow === 6 && 'sat',
      !isPast && availability,
      selected && selected.y === cursor.y && selected.m === cursor.m && selected.d === d && 'selected',
    ]
      .filter(Boolean)
      .join(' ');

    const clickable = !isPast && availability !== 'full';
    cells.push(
      <div
        key={d}
        className={cls}
        onClick={clickable ? () => onSelect(d) : undefined}
        role={clickable ? 'button' : undefined}
      >
        {d}
      </div>
    );
  }

  const changeMonth = (delta: number) => {
    let m = cursor.m + delta;
    let y = cursor.y;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setCursor({ y, m });
  };

  return (
    <div className="cal-box">
      <div className="cal-head">
        <button className="cal-nav-btn" onClick={() => changeMonth(-1)} aria-label="이전 달">‹</button>
        <div className="cal-title">{cursor.y}년 {cursor.m + 1}월</div>
        <button className="cal-nav-btn" onClick={() => changeMonth(1)} aria-label="다음 달">›</button>
      </div>
      <div className="cal-grid">
        <div className="cal-dow sun">일</div>
        <div className="cal-dow">월</div>
        <div className="cal-dow">화</div>
        <div className="cal-dow">수</div>
        <div className="cal-dow">목</div>
        <div className="cal-dow">금</div>
        <div className="cal-dow sat">토</div>
        {cells}
      </div>
      <div className="cal-legend">
        <span><i className="av" /> 예약 가능</span>
        <span><i className="lim" /> 잔여 적음</span>
        <span><i className="full" /> 마감</span>
      </div>
    </div>
  );
}

// ─── 예약 모달 ───
function ReservationModal({
  theme,
  date,
  initialCount,
  initialClasses,
  onClose,
  onSuccess,
}: {
  theme: Theme;
  date: SelectedDate | null;
  initialCount?: string;
  initialClasses?: string;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const { user } = useAuth();
  const [slot, setSlot] = useState(TIME_SLOTS[0]);
  const [count, setCount] = useState(initialCount ?? '25명');
  const [classes, setClasses] = useState(initialClasses ?? '1개 반');
  const [kindergarten, setKindergarten] = useState(user?.kindergarten_name ?? '');
  const [contact, setContact] = useState(user?.contact_name ?? '');
  const [phone, setPhone] = useState(user?.contact_phone ?? '');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isoDate = date
    ? `${date.y}-${String(date.m + 1).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`
    : null;

  const handleSubmit = async () => {
    setErrorMsg(null);
    if (!isoDate) {
      setErrorMsg('먼저 캘린더에서 날짜를 선택해주세요.');
      return;
    }
    if (!kindergarten.trim() || !contact.trim() || !phone.trim()) {
      setErrorMsg('어린이집 이름·담당자·연락처는 필수입니다.');
      return;
    }
    if (!isValidKoreanPhone(phone)) {
      setErrorMsg('연락처를 올바르게 입력해주세요. (예: 010-0000-0000)');
      return;
    }
    const payload: ReservationPayload = {
      theme_id: theme.id,
      reservation_date: isoDate,
      time_slot: slot,
      child_count: count,
      class_count: classes,
      kindergarten_name: kindergarten.trim(),
      contact_name: contact.trim(),
      contact_phone: phone.trim(),
      note: note.trim() || null,
    };
    setSubmitting(true);
    try {
      const res = await api.createReservation(payload);
      onSuccess(`✓ 예약 신청 완료! (접수번호 #${res.id})`);
    } catch (e) {
      if (e instanceof ApiError) {
        setErrorMsg(e.message || '예약 신청에 실패했어요. 잠시 후 다시 시도해주세요.');
      } else {
        setErrorMsg('네트워크 오류가 발생했습니다. 연결을 확인해주세요.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-bg on" onClick={(e) => { if (e.currentTarget === e.target && !submitting) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal-hero" style={{ backgroundImage: `url('/images/${theme.img}')` }}>
          <button className="modal-close" onClick={onClose} aria-label="닫기" disabled={submitting}>✕</button>
          <div className="modal-hero-text">
            <span className="modal-hero-cat">{theme.emoji} {theme.catLabel} · {theme.time}분</span>
            <h2 className="modal-hero-title">{theme.name}</h2>
          </div>
        </div>
        <div className="modal-body">
          <div className="modal-section">
            <h4>📅 예약 날짜</h4>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink-900)' }}>
              {date ? fmtDate(date) : '캘린더에서 날짜를 선택해주세요'}
            </div>
          </div>
          <div className="modal-section">
            <h4>🕐 시간 선택</h4>
            <div className="slot-row">
              {TIME_SLOTS.map((s) => (
                <div
                  key={s}
                  className={['slot', slot === s && 'on'].filter(Boolean).join(' ')}
                  onClick={() => !submitting && setSlot(s)}
                >
                  {s}
                </div>
              ))}
            </div>
          </div>
          <div className="modal-section">
            <h4>👶 인원 / 반</h4>
            <div className="field-row">
              <input className="field" value={count} onChange={(e) => setCount(e.target.value)} placeholder="아이 인원" disabled={submitting} />
              <input className="field" value={classes} onChange={(e) => setClasses(e.target.value)} placeholder="참여 반 수" disabled={submitting} />
            </div>
          </div>
          <div className="modal-section">
            <h4>🏫 어린이집 정보</h4>
            <input className="field" placeholder="어린이집 이름" value={kindergarten} onChange={(e) => setKindergarten(e.target.value)} style={{ marginBottom: 10 }} disabled={submitting} />
            <div className="field-row">
              <input className="field" placeholder="담당자 이름" value={contact} onChange={(e) => setContact(e.target.value)} disabled={submitting} />
              <input
                className="field"
                placeholder="연락처 010-0000-0000"
                value={phone}
                onChange={(e) => setPhone(formatKoreanPhone(e.target.value))}
                disabled={submitting}
                inputMode="tel"
                maxLength={14}
              />
            </div>
          </div>
          <div className="modal-section">
            <h4>📝 추가 요청 사항</h4>
            <input className="field" placeholder="알레르기, 특이사항 등 (선택)" value={note} onChange={(e) => setNote(e.target.value)} disabled={submitting} />
          </div>
          {errorMsg && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c',
              padding: '12px 14px', borderRadius: 10, fontWeight: 700, fontSize: 14,
              marginTop: 8
            }}>
              ⚠️ {errorMsg}
            </div>
          )}
        </div>
        <div className="modal-foot">
          <div className="mf-price">
            <div className="mf-label">총 예약 금액</div>
            <div className="mf-val">{fmtKRW(theme.price)}</div>
          </div>
          <button
            className="mf-submit"
            onClick={handleSubmit}
            disabled={submitting}
            style={submitting ? { opacity: 0.7, cursor: 'wait' } : undefined}
          >
            {submitting ? '신청 중...' : '예약 신청하기 →'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 메인 페이지 ───
export default function ReservationPage() {
  const { user, logout } = useAuth();
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);
  const [calCursor, setCalCursor] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [selectedDate, setSelectedDate] = useState<SelectedDate | null>(null);
  const [activeCat, setActiveCat] = useState<CategoryTab['id']>('all');
  const [modalTheme, setModalTheme] = useState<Theme | null>(null);
  const [toastOpen, setToastOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [myResOpen, setMyResOpen] = useState(false);
  // 히어로 검색 위젯 — 모달 prefill 용
  const [searchCount, setSearchCount] = useState('25명');
  const [searchClasses, setSearchClasses] = useState('1개 반');

  const gridThemes = useMemo(() => filterByCategory(THEMES, activeCat), [activeCat]);

  // 예약 성공 시 가용성 재로딩 트리거
  const [refreshKey, setRefreshKey] = useState(0);

  // ─── 월별 가용성 (캘린더 색상) ───
  const [availabilityMap, setAvailabilityMap] = useState<Record<string, 'available' | 'limited' | 'full'>>({});

  useEffect(() => {
    let cancelled = false;
    api.availability(calCursor.y, calCursor.m + 1)
      .then((days) => {
        if (cancelled) return;
        const map: Record<string, 'available' | 'limited' | 'full'> = {};
        for (const d of days) map[d.date] = d.status;
        setAvailabilityMap(map);
      })
      .catch(() => {
        if (!cancelled) setAvailabilityMap({});
      });
    return () => { cancelled = true; };
  }, [calCursor.y, calCursor.m, refreshKey]);

  // ─── 선택일의 가능 테마/슬롯 (API) ───
  const [dateAvail, setDateAvail] = useState<DateAvailability[] | null>(null);
  const [dateAvailLoading, setDateAvailLoading] = useState(false);
  const [dateAvailErr, setDateAvailErr] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedDate) { setDateAvail(null); return; }
    const iso = `${selectedDate.y}-${String(selectedDate.m + 1).padStart(2, '0')}-${String(selectedDate.d).padStart(2, '0')}`;
    let cancelled = false;
    setDateAvailLoading(true);
    setDateAvailErr(null);
    api.availabilityDate(iso)
      .then((res) => { if (!cancelled) setDateAvail(res); })
      .catch((e) => { if (!cancelled) setDateAvailErr(e instanceof Error ? e.message : String(e)); })
      .finally(() => { if (!cancelled) setDateAvailLoading(false); });
    return () => { cancelled = true; };
  }, [selectedDate, refreshKey]);

  // API → UI 표시용 — THEMES 원본 매칭 (img 등 사용)
  const availableForDate = useMemo(() => {
    if (!dateAvail) return [] as { theme: Theme; slots: string[] }[];
    return dateAvail
      .map((da) => {
        const t = THEMES.find((x) => x.id === da.theme.id);
        return t ? { theme: t, slots: da.available_slots } : null;
      })
      .filter((x): x is { theme: Theme; slots: string[] } => x !== null);
  }, [dateAvail]);

  const [toastMsg, setToastMsg] = useState('✓ 예약 신청이 완료되었어요!');

  const handleSuccess = (msg: string) => {
    setToastMsg(msg);
    setModalTheme(null);
    setToastOpen(true);
    setRefreshKey((k) => k + 1);
    setTimeout(() => setToastOpen(false), 3500);
  };

  // 스크롤 헬퍼
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  // 모달 열렸을 때 body 스크롤 잠금
  useEffect(() => {
    document.body.style.overflow = modalTheme || mobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [modalTheme, mobileMenuOpen]);

  const dowKor = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <>
      {/* 글로벌 네비 */}
      <nav className="nav">
        <div className="brand">
          <img src="/images/ogam/logo.png" alt="오감몬스터" className="brand-logo" />
        </div>
        <div className="nav-links">
          <a href="#popular" onClick={(e) => { e.preventDefault(); scrollTo('popular'); }}>인기 프로그램</a>
          <a href="#themes" onClick={(e) => { e.preventDefault(); scrollTo('themes'); }}>전체 프로그램</a>
          <a href="#calendar" onClick={(e) => { e.preventDefault(); scrollTo('calendar'); }}>날짜로 예약</a>
        </div>
        <div className="nav-cta-group">
          <span className="nav-tel">📞 1800-0000</span>
          {user && (
            <>
              <button className="btn btn-outline" onClick={() => setMyResOpen(true)}>📋 내 예약</button>
              <div className="nav-user">
                <span className="nav-user-name">{user.kindergarten_name}</span>
                <button className="btn btn-ghost" onClick={logout}>로그아웃</button>
              </div>
            </>
          )}
          <button className="btn btn-primary" onClick={() => scrollTo('calendar')}>예약하기 →</button>
        </div>
        <button className="nav-hamb" onClick={() => setMobileMenuOpen(true)} aria-label="메뉴">☰</button>
      </nav>

      {/* 모바일 메뉴 */}
      <div
        className={`mobile-menu${mobileMenuOpen ? ' on' : ''}`}
        onClick={(e) => { if (e.currentTarget === e.target) setMobileMenuOpen(false); }}
      >
        <div className="mobile-menu-panel">
          <button className="mobile-menu-close" onClick={() => setMobileMenuOpen(false)}>✕</button>
          <a href="#popular" onClick={(e) => { e.preventDefault(); setMobileMenuOpen(false); scrollTo('popular'); }}>🔥 인기 프로그램</a>
          <a href="#themes" onClick={(e) => { e.preventDefault(); setMobileMenuOpen(false); scrollTo('themes'); }}>✨ 전체 프로그램</a>
          <a href="#calendar" onClick={(e) => { e.preventDefault(); setMobileMenuOpen(false); scrollTo('calendar'); }}>📅 날짜로 예약</a>
          {user && (
            <a href="#" onClick={(e) => { e.preventDefault(); setMobileMenuOpen(false); setMyResOpen(true); }}>📋 내 예약 내역</a>
          )}
          <a href="tel:1800-0000" style={{ color: 'var(--brand-dark)', borderBottom: 'none' }}>📞 1800-0000</a>
          {user && (
            <button
              onClick={() => { setMobileMenuOpen(false); logout(); }}
              style={{
                marginTop: 'auto',
                background: 'transparent',
                border: '1.5px solid #e5e7eb',
                color: '#6b7280',
                borderRadius: 12,
                padding: '12px 16px',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
                textAlign: 'left',
              }}
            >
              👤 {user.kindergarten_name} · 로그아웃
            </button>
          )}
        </div>
      </div>

      {/* 히어로 */}
      <section className="hero">
        <div className="hero-wrap">
          <div className="hero-text">
            <div className="hero-eyebrow"><span>✨</span> 어린이집 출장 체험 No.1</div>
            <h1>
              우리 반에<br />
              <span className="wave">웃음꽃이 활짝</span> <span className="accent">피어나는 시간</span>
            </h1>
            <p className="lead">
              강사·교구·셋업까지 통째로 어린이집에 찾아갑니다.<br />
              오감을 자극하는 40+ 테마 프로그램, 원하는 날짜에 클릭 한 번이면 예약 완료.
            </p>

            <div className="search-widget">
              <div className="sw-field" onClick={() => scrollTo('calendar')}>
                <div className="sw-label">📅 원하는 날짜</div>
                <div className="sw-value">{selectedDate ? fmtDate(selectedDate) : '날짜를 선택하세요'}</div>
              </div>
              <div className="sw-field sw-input-field">
                <label className="sw-label" htmlFor="sw-count">👶 아이 인원</label>
                <input
                  id="sw-count"
                  className="sw-input"
                  value={searchCount}
                  onChange={(e) => setSearchCount(e.target.value)}
                  placeholder="25명"
                />
              </div>
              <div className="sw-field sw-input-field">
                <label className="sw-label" htmlFor="sw-class">📚 참여 반</label>
                <input
                  id="sw-class"
                  className="sw-input"
                  value={searchClasses}
                  onChange={(e) => setSearchClasses(e.target.value)}
                  placeholder="1개 반"
                />
              </div>
              <button className="sw-search" onClick={() => scrollTo('calendar')}>🔍 날짜 보기</button>
            </div>

            <div className="hero-stats">
              <div>
                <div className="hero-stat-num">12,400+</div>
                <div className="hero-stat-label">누적 출장</div>
              </div>
              <div>
                <div className="hero-stat-num">98%</div>
                <div className="hero-stat-label">재예약률</div>
              </div>
              <div>
                <div className="hero-stat-num">40+</div>
                <div className="hero-stat-label">체험 테마</div>
              </div>
            </div>
          </div>
          <div className="hero-illust">
            <img src="/images/ogam/character01.png" className="char char-blue" alt="파랑 몬스터" />
            <img src="/images/ogam/character02.png" className="char char-yellow" alt="노랑 몬스터" />
            <img src="/images/ogam/character03.png" className="char char-orange" alt="오렌지 몬스터" />
            <div className="hero-tag ht2">
              <span>💛</span> ★ 4.9 / 5.0
            </div>
          </div>
        </div>
      </section>

      {/* 인기 프로그램 */}
      <section id="popular" className="popular">
        <div className="section-head">
          <div>
            <h2 className="section-title">이번 달 <span className="accent">인기 프로그램</span> 🔥</h2>
            <p className="section-sub">선생님들이 가장 많이 예약하신 프로그램이에요</p>
          </div>
          <a href="#themes" className="section-link" onClick={(e) => { e.preventDefault(); scrollTo('themes'); }}>전체 보기 →</a>
        </div>
        <div className="popular-track">
          {POPULAR_THEMES.map((t, i) => (
            <div key={t.id} className="theme-card-lg" onClick={() => setModalTheme(t)}>
              <div className="tc-img" style={{ backgroundImage: `url('/images/${t.img}')` }}>
                <div className="tc-rank">#{i + 1} 인기</div>
                <div className="tc-fav">♡</div>
              </div>
              <div className="tc-body">
                <div className="tc-meta-row">
                  <span className={`tc-cat${t.cat === 'media' ? ' med' : t.cat === 'tradition' ? ' tra' : t.cat === 'seasonal' ? ' sea' : ''}`}>
                    {t.emoji} {t.catLabel}
                  </span>
                  <span className="tc-time">⏱ {t.time}분</span>
                </div>
                <div className="tc-name">{t.name}</div>
                <div className="tc-desc">{t.desc}</div>
                <div className="tc-foot">
                  <div className="tc-price">{fmtKRW(t.price)}<small>/회</small></div>
                  <span className="tc-action">예약 →</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 전체 그리드 */}
      <section id="themes" className="themes">
        <div className="section-wrap">
          <div className="section-head">
            <div>
              <h2 className="section-title">전체 <span className="accent">체험 프로그램</span></h2>
              <p className="section-sub">40+ 테마, 원하는 카테고리로 골라보세요</p>
            </div>
          </div>
          <div className="cat-tabs">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                className={`cat-tab${activeCat === c.id ? ' on' : ''}`}
                onClick={() => setActiveCat(c.id)}
              >
                <span className="emoji">{c.emoji}</span> {c.label}
              </button>
            ))}
          </div>
          <div className="theme-grid">
            {gridThemes.map((t) => (
              <div key={t.id} className="theme-card" onClick={() => setModalTheme(t)}>
                <div className="tg-img" style={{ backgroundImage: `url('/images/${t.img}')` }}>
                  {t.badge && <div className="tg-badge">{t.badge}</div>}
                </div>
                <div className="tg-body">
                  <div className="tg-name">{t.name}</div>
                  <div className="tg-meta">{t.emoji} {t.catLabel} · ⏱ {t.time}분</div>
                  <div className="tg-row">
                    <div className="tg-price">{fmtKRW(t.price)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 캘린더 */}
      <section id="calendar" className="calendar-section">
        <div className="section-wrap" style={{ maxWidth: 1280 }}>
          <div className="section-head">
            <div>
              <h2 className="section-title">날짜로 <span className="accent">바로 예약</span> 📅</h2>
              <p className="section-sub">원하는 날짜를 선택하시면 가능한 프로그램을 보여드려요</p>
            </div>
          </div>
          <div className="cal-wrap">
            <Calendar
              cursor={calCursor}
              setCursor={setCalCursor}
              selected={selectedDate}
              onSelect={(d) => setSelectedDate({ y: calCursor.y, m: calCursor.m, d })}
              today={today}
              availabilityMap={availabilityMap}
            />
            <div className="cal-result">
              {selectedDate ? (
                dateAvailLoading ? (
                  <div className="empty-state">
                    <div className="emoji">⏳</div>
                    <div className="ttl">불러오는 중...</div>
                  </div>
                ) : dateAvailErr ? (
                  <div className="empty-state">
                    <div className="emoji">⚠️</div>
                    <div className="ttl">정보를 불러올 수 없어요</div>
                    <div className="desc">{dateAvailErr}</div>
                  </div>
                ) : availableForDate.length === 0 ? (
                  <div className="empty-state">
                    <div className="emoji">😢</div>
                    <div className="ttl">이 날은 모두 마감되었어요</div>
                    <div className="desc">다른 날짜를 선택해 주세요</div>
                  </div>
                ) : (
                  <>
                    <div className="cal-result-head">
                      <div className="cal-result-date">
                        📅 {fmtDate(selectedDate)} ({dowKor[new Date(selectedDate.y, selectedDate.m, selectedDate.d).getDay()]})
                      </div>
                      <div className="cal-result-title">선택 가능한 {availableForDate.length}개 프로그램</div>
                      <div className="cal-result-sub">강사 배정 가능 시간대를 함께 표시해드려요</div>
                    </div>
                    <div className="cal-result-grid">
                      {availableForDate.map(({ theme: t, slots }) => (
                        <div key={t.id} className="cal-theme-card" onClick={() => setModalTheme(t)}>
                          <div className="ctc-img" style={{ backgroundImage: `url('/images/${t.img}')` }} />
                          <div className="ctc-body">
                            <div className="ctc-name">{t.emoji} {t.name}</div>
                            <div className="ctc-slots">
                              {slots.length === 0 ? (
                                <span className="ctc-slot lim">상담 문의</span>
                              ) : (
                                slots.map((s) => (
                                  <span key={s} className="ctc-slot">{s}</span>
                                ))
                              )}
                            </div>
                            <div className="ctc-price">{fmtKRW(t.price)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )
              ) : (
                <div className="empty-state">
                  <div className="emoji">🗓️</div>
                  <div className="ttl">날짜를 먼저 선택해 주세요</div>
                  <div className="desc">캘린더에서 원하는 날짜를 누르면<br />그날 가능한 체험 프로그램을 보여드려요</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 신뢰 마크 */}
      <section className="trust">
        <div className="trust-wrap">
          <div className="trust-item">
            <div className="trust-num">12,400+</div>
            <div className="trust-label">누적 어린이집 출장</div>
          </div>
          <div className="trust-item">
            <div className="trust-num">4.9</div>
            <div className="trust-label">담당 선생님 평균 평점</div>
          </div>
          <div className="trust-item">
            <div className="trust-num">15분</div>
            <div className="trust-label">평균 상담 응답 시간</div>
          </div>
          <div className="trust-item">
            <div className="trust-num">98%</div>
            <div className="trust-label">재예약 의사 응답률</div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: 0 }}>
        <div className="cta">
          <div className="cta-emoji">🎁</div>
          <h2>첫 예약, 10% 할인 진행 중!</h2>
          <p>1분이면 충분합니다. 원하는 날짜만 알려주세요.</p>
          <div className="cta-row">
            <button className="btn btn-lg btn-white" onClick={() => scrollTo('calendar')}>📅 지금 예약하기</button>
            <button className="btn btn-lg btn-ghost">📞 전화 상담 1800-0000</button>
          </div>
        </div>
      </section>

      {/* 푸터 */}
      <footer className="footer">
        <div className="footer-wrap">
          <div>
            <div className="brand" style={{ marginBottom: 16 }}>
              <img src="/images/ogam/logo.png" alt="오감몬스터" className="brand-logo" style={{ height: 36, filter: 'brightness(0) invert(1)' }} />
            </div>
            <p style={{ lineHeight: 1.6 }}>어린이집에 찾아가는 오감 체험 프로그램 전문 브랜드</p>
            <p style={{ marginTop: 14, color: 'var(--ink-500)' }}>
              상호: (주)오감몬스터<br />대표: ○○○<br />사업자등록번호: 000-00-00000
            </p>
          </div>
          <div>
            <h4>서비스</h4>
            <ul>
              <li><a href="#popular" onClick={(e) => { e.preventDefault(); scrollTo('popular'); }}>인기 프로그램</a></li>
              <li><a href="#themes" onClick={(e) => { e.preventDefault(); scrollTo('themes'); }}>전체 프로그램</a></li>
              <li><a href="#calendar" onClick={(e) => { e.preventDefault(); scrollTo('calendar'); }}>날짜로 예약</a></li>
            </ul>
          </div>
          <div>
            <h4>고객 지원</h4>
            <ul>
              <li><a href="#">자주 묻는 질문</a></li>
              <li><a href="#">예약 변경/취소</a></li>
              <li><a href="#">상담 신청</a></li>
              <li><a href="#">카탈로그 받기</a></li>
            </ul>
          </div>
          <div>
            <h4>연락처</h4>
            <ul>
              <li>📞 1800-0000</li>
              <li>📧 hello@ogammonster.com</li>
              <li>📍 서울 / 경기 / 인천</li>
              <li>🕐 평일 09:00 – 18:00</li>
            </ul>
          </div>
        </div>
        <div className="footer-copy">© 2026 오감몬스터. All rights reserved.</div>
      </footer>

      {/* 모바일 하단 고정 CTA */}
      <div className="mobile-cta">
        <a href="tel:1800-0000" className="mobile-cta-tel" aria-label="전화 걸기">📞</a>
        <button className="mobile-cta-book" onClick={() => scrollTo('calendar')}>
          📅 지금 예약하기
        </button>
      </div>

      {/* 예약 모달 */}
      {modalTheme && (
        <ReservationModal
          theme={modalTheme}
          date={selectedDate}
          initialCount={searchCount}
          initialClasses={searchClasses}
          onClose={() => setModalTheme(null)}
          onSuccess={handleSuccess}
        />
      )}

      {/* 토스트 */}
      <div className={`toast${toastOpen ? ' on' : ''}`}>{toastMsg}</div>

      {/* 내 예약 모달 */}
      {myResOpen && <MyReservationsModal onClose={() => setMyResOpen(false)} />}
    </>
  );
}
