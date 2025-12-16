/**
 * Monster Client v1.1.0
 * - 100배 업그레이드 디자인 적용 (히어로 배너, 사이드바, 예약 위젯)
 * - 관리자 연동 제거 (Standalone Mode)
 * - 하드코딩된 테마 데이터 사용
 * - [New] 모바일 최적화 (리스트/상세 네비게이션)
 */

import { useState, useEffect } from 'react'
import { MapPin, Calendar as CalendarIcon, Grid, ChevronRight, ChevronLeft, Clock, Users, Star, Info, CheckCircle, DollarSign, ArrowLeft } from 'lucide-react'
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
  
  // 모바일 뷰 상태
  const [showMobileDetail, setShowMobileDetail] = useState(false)
  const [isBookingExpanded, setIsBookingExpanded] = useState(false) // 예약 위젯 확장 여부
  
  const currentThemeData = selectedTheme ? getThemeDetail(selectedTheme) : null

  const timeSlots = ['10:00', '11:00', '13:00', '14:00', '15:30', '17:00']

  // 테마 선택 핸들러
  const handleThemeSelect = (theme: string) => {
    setSelectedTheme(theme)
    setSelectedTime(null)
    setShowMobileDetail(true) // 모바일에서는 상세 화면으로 전환
  }

  return (
    <div className="reservation-page">
      <div className="page-container">
        <div className={`hero-section ${showMobileDetail ? 'hidden-on-mobile' : ''}`}>
          <h2>오감몬스터 예약 시스템</h2>
          <p>아이들의 꿈이 자라나는 특별한 놀이터</p>
        </div>

        <div className="reservation-card">
          {/* 상단 선택 패널 (모바일 상세화면에서는 숨김) */}
          <div className={`selection-panel ${showMobileDetail ? 'hidden-on-mobile' : ''}`}>
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
                      <div key={idx} className="theme-card" onClick={() => { setMode('theme'); setSelectedTheme(theme); setShowMobileDetail(true); }}>
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
              // --- 테마별 보기 모드 (모바일 대응) ---
              <div className={`theme-mode-view ${showMobileDetail ? 'mobile-detail-open' : ''}`}>
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
                        onClick={() => handleThemeSelect(theme)}
                      >
                        <span>{idx + 1}. {theme}</span>
                        <ChevronRight size={16} style={{opacity: selectedTheme === theme ? 1 : 0.3}} />
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* 오른쪽: 테마 상세 페이지 */}
                <div className="theme-detail-container">
                  {/* 모바일 뒤로가기 헤더 */}
                  <div className="mobile-back-header">
                    <button onClick={() => setShowMobileDetail(false)}>
                      <ArrowLeft size={24} /> 뒤로가기
                    </button>
                    <span>테마 상세</span>
                  </div>

                  {currentThemeData ? (
                    <>
                      {/* [Airbnb Style] 모바일 이미지 갤러리 */}
                      <div className="airbnb-image-gallery">
                        <div className="gallery-main">
                          <img src="https://via.placeholder.com/600x400?text=Main+Image" alt={currentThemeData.name} />
                          <div className="gallery-badge">BEST</div>
                          <button className="gallery-back-btn" onClick={() => setShowMobileDetail(false)}>
                            <ArrowLeft size={20} />
                          </button>
                        </div>
                        {/* 더미 이미지들 (실제로는 currentThemeData.images 사용) */}
                        <div className="gallery-thumbnails">
                          {[1, 2, 3, 4].map(i => (
                            <div key={i} className="gallery-thumb">
                              <img src={`https://via.placeholder.com/150x100?text=Img+${i}`} alt={`detail-${i}`} />
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="detail-content-wrapper airbnb-layout">
                        {/* [Airbnb Style] 헤더 정보 */}
                        <div className="airbnb-header">
                          <h2>{currentThemeData.name}</h2>
                          <div className="airbnb-meta">
                            <span>★ {currentThemeData.rating}</span>
                            <span className="dot">·</span>
                            <span className="underline">후기 {currentThemeData.reviewCount}개</span>
                            <span className="dot">·</span>
                            <span className="underline">{region} 강남점</span>
                          </div>
                        </div>

                        <div className="divider"></div>

                        {/* [Airbnb Style] 호스트/테마 정보 */}
                        <div className="airbnb-host-info">
                          <div className="host-text">
                            <h3>오감몬스터님이 호스팅하는 키즈 체험</h3>
                            <p>최대 8명 · 50분 소요 · {currentThemeData.age}</p>
                          </div>
                          <div className="host-avatar"></div>
                        </div>

                        <div className="divider"></div>

                        {/* [Airbnb Style] 특징 아이콘 리스트 */}
                        <div className="airbnb-features">
                          <div className="feature-item">
                            <CheckCircle size={24} className="feature-icon" />
                            <div>
                              <h4>안전한 체험</h4>
                              <p>전문 강사진이 아이들의 안전을 책임집니다.</p>
                            </div>
                          </div>
                          <div className="feature-item">
                            <Clock size={24} className="feature-icon" />
                            <div>
                              <h4>50분 프로그램</h4>
                              <p>아이들의 집중력에 맞춘 최적의 시간입니다.</p>
                            </div>
                          </div>
                          <div className="feature-item">
                            <MapPin size={24} className="feature-icon" />
                            <div>
                              <h4>무료 주차 지원</h4>
                              <p>건물 내 2시간 무료 주차가 가능합니다.</p>
                            </div>
                          </div>
                        </div>

                        <div className="divider"></div>

                        {/* 상세 설명 */}
                        <div className="airbnb-description">
                           <h3>프로그램 소개</h3>
                           <p>{currentThemeData.description}</p>
                           <div className="airbnb-tags">
                             {currentThemeData.tags.map(tag => (
                               <span key={tag}>#{tag}</span>
                             ))}
                           </div>
                        </div>

                        {/* [Airbnb Style] 하단 고정 예약 바 (Sticky Footer) */}
                        <div className={`airbnb-bottom-bar ${isBookingExpanded ? 'expanded' : ''}`}>
                           <div className="bottom-bar-content">
                             <div className="price-info">
                               <span className="price-val">{currentThemeData.price.toLocaleString()}원</span>
                               <span className="price-suffix"> / 1인</span>
                               <div className="date-preview">
                                 {selectedTime ? `${format(themeDate, 'M월 d일')} ${selectedTime}` : '날짜를 선택하세요'}
                               </div>
                             </div>
                             <button className="btn-airbnb-reserve" onClick={() => setIsBookingExpanded(true)}>
                               예약하기
                             </button>
                           </div>

                           {/* 확장된 예약 폼 (달력/시간 선택) */}
                           <div className="airbnb-booking-form">
                             <div className="form-header">
                               <h3>날짜와 시간 선택</h3>
                               <button onClick={() => setIsBookingExpanded(false)}><X size={24} /></button>
                             </div>
                             
                             <div className="form-body">
                               <div className="section-label">날짜</div>
                               <SimpleCalendar selectedDate={themeDate} onSelectDate={setThemeDate} />
                               
                               <div className="section-label" style={{marginTop: '1.5rem'}}>시간</div>
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

                             <div className="form-footer">
                               <button 
                                 className="btn-book-final"
                                 onClick={() => {
                                   if(!selectedTime) return;
                                   alert('예약이 완료되었습니다!');
                                   setIsBookingExpanded(false);
                                 }}
                                 disabled={!selectedTime}
                               >
                                 확인
                               </button>
                             </div>
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
