/**
 * Monster Client v1.0.0
 * - 100배 업그레이드 디자인 적용 (히어로 배너, 사이드바, 예약 위젯)
 * - 관리자 연동 제거 (Standalone Mode)
 * - 하드코딩된 테마 데이터 사용
 */

import { useState } from 'react'
import { MapPin, Calendar as CalendarIcon, Grid, ChevronRight, ChevronLeft, Clock, Users, Star, Info, CheckCircle, DollarSign } from 'lucide-react'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns'
import { ko } from 'date-fns/locale'
import './ReservationPage.css'

// 테마 목록
const THEMES = [
  "가루야놀자", "공룡이나타났다", "글램핑", "난타소리로놀아요", "노랑노랑",
  "도시어부", "추억의7080", "모래놀이", "목공놀이", "비오는날",
  "수박밭에서", "옛날민속촌(전래놀이)", "마을잔치날(전래놀이)", "얼씨구절씨구(전래놀이)", "한양나들이(전래놀이)",
  "종이야놀자", "숯가마찜질", "편백나무랑놀자", "조물조물흙놀이", "바닷속으로",
  "블랙라이트", "나랑눈사람만들래", "엔지니어", "야광모래", "강철부대",
  "몬스터벅스", "자동차극장", "알로하와이", "어서와강원도는 처음이지", "꽁꽁대모험",
  "초코민트", "마켓플레이", "이집트", "파자마파티", "누들누들(가락가락)",
  "초록in정글", "핑크핑크해", "꽃이랑나무랑놀자", "가을글램핑"
]

// 타입 정의
type Mode = 'date' | 'theme'
type Region = '서울' | '경기' | '인천'

interface ThemeDetailData {
  name: string;
  description: string;
  tags: string[];
  price: number;
  duration: string;
  age: string;
  rating: number;
  reviewCount: number;
}

// 더미 데이터 생성기
const getThemeDetail = (name: string): ThemeDetailData => {
  return {
    name,
    description: `아이들의 오감을 자극하는 프리미엄 체험 활동 '${name}'입니다. 전문 강사진과 함께하는 안전하고 즐거운 놀이를 통해 창의력과 감성을 키워주세요. 친구들과 함께 특별한 추억을 만들 수 있습니다.`,
    tags: ['오감발달', '창의력', '실내활동', '인기테마'],
    price: 35000,
    duration: '50분',
    age: '4세 ~ 9세',
    rating: 4.8,
    reviewCount: 128
  }
}

function SimpleCalendar({ selectedDate, onSelectDate }: { selectedDate: Date, onSelectDate: (date: Date) => void }) {
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate))

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart)
  const endDate = endOfWeek(monthEnd)

  const days = eachDayOfInterval({ start: startDate, end: endDate })

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))

  return (
    <div className="simple-calendar">
      <div className="calendar-nav">
        <button onClick={prevMonth} className="cal-nav-btn"><ChevronLeft size={18} /></button>
        <span className="cal-title">{format(currentMonth, 'yyyy년 M월', { locale: ko })}</span>
        <button onClick={nextMonth} className="cal-nav-btn"><ChevronRight size={18} /></button>
      </div>
      <div className="calendar-grid">
        {['일', '월', '화', '수', '목', '금', '토'].map(day => (
          <div key={day} className="calendar-day-header">{day}</div>
        ))}
        {days.map(day => (
          <div
            key={day.toString()}
            className={`calendar-day ${
              !isSameMonth(day, monthStart) ? 'disabled' : ''
            } ${isSameDay(day, selectedDate) ? 'selected' : ''}`}
            onClick={() => onSelectDate(day)}
          >
            {format(day, 'd')}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ReservationPage() {
  const [mode, setMode] = useState<Mode>('theme')
  const [region, setRegion] = useState<Region>('서울')
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [themeDate, setThemeDate] = useState<Date>(new Date())
  const [selectedTheme, setSelectedTheme] = useState<string | null>(THEMES[0])
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  
  const currentThemeData = selectedTheme ? getThemeDetail(selectedTheme) : null

  const timeSlots = ['10:00', '11:00', '13:00', '14:00', '15:30', '17:00']

  return (
    <div className="reservation-page">
      <div className="page-container">
        <div className="hero-section">
          <h2>오감몬스터 예약 시스템</h2>
          <p>아이들의 꿈이 자라나는 특별한 놀이터</p>
        </div>

        <div className="reservation-card">
          {/* 상단 선택 패널 */}
          <div className="selection-panel">
            <div className="mode-selector">
              <button 
                className={`mode-btn ${mode === 'date' ? 'active' : ''}`}
                onClick={() => setMode('date')}
              >
                <CalendarIcon size={18} />
                날짜별 보기
              </button>
              <button 
                className={`mode-btn ${mode === 'theme' ? 'active' : ''}`}
                onClick={() => setMode('theme')}
              >
                <Grid size={18} />
                테마별 보기
              </button>
            </div>

            <div className="region-selector">
              <select 
                value={region} 
                onChange={(e) => setRegion(e.target.value as Region)}
              >
                <option value="서울">📍 서울특별시</option>
                <option value="경기">📍 경기도</option>
                <option value="인천">📍 인천광역시</option>
              </select>
            </div>
          </div>

          {/* 메인 컨텐츠 영역 */}
          <div className="main-view">
            {mode === 'date' ? (
              // --- 날짜별 보기 모드 ---
              <div className="date-mode-view">
                <div className="calendar-section">
                  <h3 style={{marginBottom: '1rem'}}>날짜 선택</h3>
                  <SimpleCalendar 
                    selectedDate={selectedDate} 
                    onSelectDate={setSelectedDate} 
                  />
                </div>
                
                <div style={{flex: 1}}>
                  <h3 style={{marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                    <CalendarIcon size={20} className="text-primary" />
                    {format(selectedDate, 'yyyy년 M월 d일', {locale: ko})} 예약 가능 테마
                  </h3>
                  <div className="theme-grid">
                    {THEMES.slice(0, 8).map((theme, idx) => (
                      <div key={idx} className="theme-card" onClick={() => { setMode('theme'); setSelectedTheme(theme); }}>
                        <div className="theme-image-placeholder">이미지 준비중</div>
                        <div className="theme-card-content">
                          <div className="theme-tags">
                            <span className="tag-mini">인기</span>
                            <span className="tag-mini">실내</span>
                          </div>
                          <h4>{theme}</h4>
                          <p style={{fontSize: '0.9rem', color: '#64748b'}}>50분 | 4-9세</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              // --- 테마별 보기 모드 (100배 업그레이드 버전) ---
              <div className="theme-mode-view">
                {/* 왼쪽: 테마 리스트 사이드바 */}
                <div className="theme-list-sidebar">
                  <div className="sidebar-header">
                    <h3>전체 테마 ({THEMES.length})</h3>
                  </div>
                  <div className="theme-list">
                    {THEMES.map((theme, idx) => (
                      <div 
                        key={idx} 
                        className={`theme-list-item ${selectedTheme === theme ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedTheme(theme)
                          setSelectedTime(null) // 테마 변경 시 시간 선택 초기화
                        }}
                      >
                        <span>{idx + 1}. {theme}</span>
                        <ChevronRight size={16} style={{opacity: selectedTheme === theme ? 1 : 0.3}} />
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* 오른쪽: 테마 상세 페이지 */}
                <div className="theme-detail-container">
                  {currentThemeData ? (
                    <>
                      {/* Hero Section */}
                      <div className="theme-hero">
                        <div className="hero-overlay" />
                        <div className="theme-hero-content">
                          <span className="hero-badge">BEST CHOICE</span>
                          <h2>{currentThemeData.name}</h2>
                          <div className="theme-meta-row">
                            <div className="meta-item">
                              <Star size={16} fill="#f59e0b" color="#f59e0b" />
                              <span>{currentThemeData.rating} ({currentThemeData.reviewCount} 리뷰)</span>
                            </div>
                            <div className="meta-item">
                              <MapPin size={16} />
                              <span>{region} 강남점</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 상세 정보 & 예약 위젯 레이아웃 */}
                      <div className="detail-content-wrapper">
                        {/* 상세 정보 (좌측) */}
                        <div className="detail-left">
                          <div className="tags-container" style={{marginBottom: '2rem'}}>
                            {currentThemeData.tags.map(tag => (
                              <span key={tag} className="tag-chip">#{tag}</span>
                            ))}
                          </div>

                          <div className="info-section">
                            <h4 className="section-title"><Info size={20} /> 테마 소개</h4>
                            <p className="info-text">{currentThemeData.description}</p>
                          </div>

                          <div className="info-section">
                            <h4 className="section-title"><CheckCircle size={20} /> 상세 정보</h4>
                            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: '#f8fafc', padding: '1.5rem', borderRadius: '12px'}}>
                              <div className="meta-item"><Clock size={18} /> 소요 시간: {currentThemeData.duration}</div>
                              <div className="meta-item"><Users size={18} /> 권장 연령: {currentThemeData.age}</div>
                              <div className="meta-item"><CheckCircle size={18} /> 준비물: 없음</div>
                              <div className="meta-item"><CheckCircle size={18} /> 주차: 2시간 무료</div>
                            </div>
                          </div>
                        </div>

                        {/* 예약 위젯 (우측 Sticky) */}
                        <div className="detail-right">
                          <div className="booking-widget">
                            <div className="widget-price">
                              <span className="price-label">1인 체험권</span>
                              <span className="price-value">{currentThemeData.price.toLocaleString()}</span>
                              <span className="price-unit">원</span>
                            </div>

                            <div className="widget-calendar">
                              <h5 style={{marginBottom:'0.5rem', fontWeight:600}}>날짜 선택</h5>
                              <SimpleCalendar selectedDate={themeDate} onSelectDate={setThemeDate} />
                            </div>

                            <div className="widget-time">
                              <h5 style={{marginBottom:'0.5rem', fontWeight:600}}>시간 선택 ({format(themeDate, 'M/d')})</h5>
                              <div className="time-slots-grid">
                                {timeSlots.map(time => (
                                  <button 
                                    key={time}
                                    className={`time-slot-btn ${selectedTime === time ? 'selected' : ''}`}
                                    onClick={() => setSelectedTime(time)}
                                  >
                                    {time}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <button 
                              className="btn-book-large"
                              onClick={() => alert(`${currentThemeData.name}\n${format(themeDate, 'yyyy-MM-dd')} ${selectedTime}\n예약이 접수되었습니다!`)}
                              disabled={!selectedTime}
                            >
                              {selectedTime ? '예약하기' : '시간을 선택해주세요'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="empty-state">
                      <p>테마를 선택해주세요.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
