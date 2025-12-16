/**
 * Jarvis Admin v1.3.0
 * - 통합 관리자 대시보드 (매출, 예약 통계)
 * - 실시간 예약 승인/거절 시스템
 * - 월간 스케줄 캘린더 (TO 관리)
 * - 테마 CMS 고도화
 *   - [New] 상세 이미지 업로드 (최대 10장)
 *   - [New] 테마 공개 여부 설정
 *   - [New] 최대 정원(Capacity) 설정
 *   - [New] 테마 고유 색상 설정
 * - [New] 예약 상세 모달 (수정, 메모)
 * - [New] 일자별 회차 관리 (마감, TO 관리)
 * - [New] 모바일 반응형 지원 (사이드바 토글, 그리드 조정)
 */

import { useState, useEffect, useRef } from 'react'
import { 
  LayoutDashboard, 
  Calendar, 
  Settings, 
  List, 
  Check, 
  X, 
  Bell, 
  TrendingUp,
  DollarSign,
  Clock,
  ChevronLeft,
  ChevronRight,
  Plus,
  Image as ImageIcon,
  Trash2,
  Edit,
  Save,
  Upload,
  Bot, 
  MoreHorizontal,
  Lock,
  Unlock,
  User,
  Eye,
  EyeOff,
  Palette,
  Menu // 햄버거 메뉴 아이콘
} from 'lucide-react'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns'
import { ko } from 'date-fns/locale'
import './ReservationSystem.css'

// 초기 더미 데이터
const INITIAL_RESERVATIONS = [
  { id: 'R-240325-001', user: '김민수', phone: '010-1234-5678', theme: '공룡이나타났다', date: '2024-03-25', time: '10:00', people: 2, status: 'confirmed', amount: 70000, memo: '' },
  { id: 'R-240325-002', user: '이영희', phone: '010-9876-5432', theme: '가루야놀자', date: '2024-03-25', time: '14:00', people: 3, status: 'confirmed', amount: 105000, memo: '아이 알러지 주의' },
]

// 초기 테마 데이터 (관리자 관리용) - v1.2.0 필드 추가
const INITIAL_THEMES = [
  { 
    id: 1, 
    name: "가루야놀자", 
    price: 35000, 
    duration: "50분", 
    age: "4-9세", 
    tags: ["오감발달", "밀가루"], 
    image: null, 
    detailImages: [],
    desc: "하얀 밀가루 세상에서 펼쳐지는 오감 만족 체험",
    isVisible: true,
    maxCapacity: 8,
    color: "#6366f1"
  },
  { 
    id: 2, 
    name: "공룡이나타났다", 
    price: 38000, 
    duration: "60분", 
    age: "5-10세", 
    tags: ["공룡", "모험"], 
    image: null, 
    detailImages: [],
    desc: "쥬라기 공원으로 떠나는 신나는 탐험",
    isVisible: true,
    maxCapacity: 6,
    color: "#10b981"
  },
  { 
    id: 3, 
    name: "도시어부", 
    price: 30000, 
    duration: "40분", 
    age: "전연령", 
    tags: ["물놀이", "낚시"], 
    image: null, 
    detailImages: [],
    desc: "실내에서 즐기는 짜릿한 낚시 체험",
    isVisible: true,
    maxCapacity: 10,
    color: "#3b82f6"
  },
  { 
    id: 4, 
    name: "비오는날", 
    price: 32000, 
    duration: "50분", 
    age: "4-8세", 
    tags: ["감성", "물감"], 
    image: null, 
    detailImages: [],
    desc: "비 오는 날의 감성을 물감으로 표현해보아요",
    isVisible: true,
    maxCapacity: 8,
    color: "#8b5cf6"
  },
  { 
    id: 5, 
    name: "블랙라이트", 
    price: 35000, 
    duration: "50분", 
    age: "5-13세", 
    tags: ["야광", "퍼포먼스"], 
    image: null, 
    detailImages: [],
    desc: "어둠 속에서 빛나는 환상의 우주 여행",
    isVisible: true,
    maxCapacity: 8,
    color: "#ec4899"
  }
]

const TIMES = ["10:00", "11:00", "13:00", "14:00", "15:30", "17:00"]
const THEME_COLORS = ["#6366f1", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#ef4444", "#64748b"]

type Tab = 'dashboard' | 'reservations' | 'schedule' | 'settings'

interface AdminDashboardProps {
  onBack?: () => void;
}

export default function AdminDashboard({ onBack }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [reservations, setReservations] = useState<any[]>([])
  const [themes, setThemes] = useState<any[]>(INITIAL_THEMES)
  const [blockedSlots, setBlockedSlots] = useState<string[]>([])
  
  // 캘린더 상태
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  // 모바일 메뉴 상태
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // 모달 상태
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState<any>(null)

  // 테마 편집 상태
  const [isEditing, setIsEditing] = useState(false)
  const [editTheme, setEditTheme] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const detailInputRef = useRef<HTMLInputElement>(null)

  // 데이터 로드
  const loadData = () => {
    const savedRes = localStorage.getItem('ogam_reservations')
    if (savedRes) setReservations(JSON.parse(savedRes))
    else setReservations(INITIAL_RESERVATIONS)

    const savedThemes = localStorage.getItem('ogam_themes')
    if (savedThemes) setThemes(JSON.parse(savedThemes))
    
    const savedBlocked = localStorage.getItem('ogam_blocked_slots')
    if (savedBlocked) setBlockedSlots(JSON.parse(savedBlocked))
  }

  useEffect(() => {
    loadData()
    const handleStorageChange = () => loadData()
    window.addEventListener('storage', handleStorageChange)
    window.dispatchEvent(new Event('local-storage-update'))
    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  // 예약 상태 변경
  const handleStatusChange = (id: string, newStatus: string) => {
    const updated = reservations.map(res => 
      res.id === id ? { ...res, status: newStatus } : res
    )
    setReservations(updated)
    localStorage.setItem('ogam_reservations', JSON.stringify(updated))
    window.dispatchEvent(new Event('local-storage-update'))
  }

  // 예약 수정 저장
  const handleReservationUpdate = (updatedRes: any) => {
    const updated = reservations.map(res => 
      res.id === updatedRes.id ? updatedRes : res
    )
    setReservations(updated)
    localStorage.setItem('ogam_reservations', JSON.stringify(updated))
    setIsReservationModalOpen(false)
    window.dispatchEvent(new Event('local-storage-update'))
  }

  // 슬롯 차단/해제 토글
  const toggleSlotBlock = (dateStr: string, time: string) => {
    const slotKey = `${dateStr} ${time}`
    let newBlocked
    if (blockedSlots.includes(slotKey)) {
      newBlocked = blockedSlots.filter(s => s !== slotKey)
    } else {
      newBlocked = [...blockedSlots, slotKey]
    }
    setBlockedSlots(newBlocked)
    localStorage.setItem('ogam_blocked_slots', JSON.stringify(newBlocked))
  }

  // 대표 이미지 업로드
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setEditTheme({ ...editTheme, image: reader.result })
      }
      reader.readAsDataURL(file)
    }
  }

  // 상세 이미지 업로드 (최대 10장)
  const handleDetailImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      const currentImages = editTheme.detailImages || []
      if (currentImages.length + files.length > 10) {
        alert('상세 이미지는 최대 10장까지 업로드 가능합니다.')
        return
      }

      const readers: Promise<string>[] = []
      Array.from(files).forEach(file => {
        readers.push(new Promise((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(file)
        }))
      })

      Promise.all(readers).then(results => {
        setEditTheme({ 
          ...editTheme, 
          detailImages: [...currentImages, ...results] 
        })
      })
    }
  }

  // 상세 이미지 삭제
  const removeDetailImage = (index: number) => {
    const newImages = [...(editTheme.detailImages || [])]
    newImages.splice(index, 1)
    setEditTheme({ ...editTheme, detailImages: newImages })
  }

  // 테마 저장 핸들러
  const saveTheme = () => {
    let updatedThemes
    if (editTheme.id) {
      // 수정
      updatedThemes = themes.map(t => t.id === editTheme.id ? editTheme : t)
    } else {
      // 추가
      updatedThemes = [...themes, { ...editTheme, id: Date.now() }]
    }
    setThemes(updatedThemes)
    localStorage.setItem('ogam_themes', JSON.stringify(updatedThemes))
    setIsEditing(false)
    setEditTheme(null)
  }

  // 테마 삭제 핸들러
  const deleteTheme = (id: number) => {
    if (confirm('정말 이 테마를 삭제하시겠습니까?')) {
      const updatedThemes = themes.filter(t => t.id !== id)
      setThemes(updatedThemes)
      localStorage.setItem('ogam_themes', JSON.stringify(updatedThemes))
    }
  }

  // 캘린더 날짜 계산
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart)
  const endDate = endOfWeek(monthEnd)
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate })

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))

  // 통계 계산
  const pendingReservations = reservations.filter(r => r.status === 'pending').length
  const totalRevenue = reservations.filter(r => r.status === 'confirmed').reduce((sum, r) => sum + r.amount, 0)

  // 탭 변경 시 모바일 메뉴 닫기
  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab)
    setIsMobileMenuOpen(false)
  }

  // 모달 컴포넌트
  const ReservationDetailModal = () => {
    if (!selectedReservation) return null;
    const [localRes, setLocalRes] = useState(selectedReservation)

    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="modal-header">
            <h3>예약 상세 정보</h3>
            <button className="btn-icon" onClick={() => setIsReservationModalOpen(false)}><X size={20} /></button>
          </div>
          <div className="modal-body">
            <div className="form-group">
              <label>예약번호</label>
              <input type="text" value={localRes.id} disabled className="input-disabled" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>고객명</label>
                <input type="text" value={localRes.user} onChange={e => setLocalRes({...localRes, user: e.target.value})} />
              </div>
              <div className="form-group">
                <label>연락처</label>
                <input type="text" value={localRes.phone} onChange={e => setLocalRes({...localRes, phone: e.target.value})} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>날짜</label>
                <input type="date" value={localRes.date} onChange={e => setLocalRes({...localRes, date: e.target.value})} />
              </div>
              <div className="form-group">
                <label>시간</label>
                <select value={localRes.time} onChange={e => setLocalRes({...localRes, time: e.target.value})}>
                  {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>테마</label>
                <select value={localRes.theme} onChange={e => setLocalRes({...localRes, theme: e.target.value})}>
                  {themes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>인원</label>
                <input type="number" value={localRes.people} onChange={e => setLocalRes({...localRes, people: parseInt(e.target.value)})} />
              </div>
            </div>
             <div className="form-group">
              <label>상태</label>
              <select value={localRes.status} onChange={e => setLocalRes({...localRes, status: e.target.value})}>
                <option value="pending">승인 대기</option>
                <option value="confirmed">예약 확정</option>
                <option value="cancelled">취소됨</option>
              </select>
            </div>
            <div className="form-group">
              <label>관리자 메모</label>
              <textarea 
                rows={3} 
                value={localRes.memo || ''} 
                onChange={e => setLocalRes({...localRes, memo: e.target.value})}
                placeholder="고객 특이사항 등을 기록하세요."
              />
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn-action" onClick={() => setIsReservationModalOpen(false)}>취소</button>
            <button className="btn-action btn-primary" onClick={() => handleReservationUpdate(localRes)}>저장하기</button>
          </div>
        </div>
      </div>
    )
  }

  // 일자별 스케줄 관리 패널
  const DailySchedulePanel = () => {
    if (!selectedDate) return null;
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    const dayReservations = reservations.filter(r => r.date === dateStr && r.status !== 'cancelled')

    return (
      <div className="schedule-panel">
        <div className="schedule-header">
          <h3>{format(selectedDate, 'M월 d일 (EEE)', { locale: ko })} 일정 관리</h3>
          <button className="btn-icon" onClick={() => setSelectedDate(null)}><X size={20} /></button>
        </div>
        <div className="schedule-body">
          {TIMES.map(time => {
            const isBlocked = blockedSlots.includes(`${dateStr} ${time}`)
            const timeReservations = dayReservations.filter(r => r.time === time)
            const currentPeople = timeReservations.reduce((sum, r) => sum + r.people, 0)
            const maxPeople = 8 

            return (
              <div key={time} className={`time-slot-card ${isBlocked ? 'blocked' : ''}`}>
                <div className="slot-header">
                  <div className="slot-time">
                    <Clock size={16} /> {time}
                    {isBlocked && <span className="badge-blocked">마감됨</span>}
                  </div>
                  <div className="slot-actions">
                     <span className={`capacity ${currentPeople >= maxPeople ? 'full' : ''}`}>
                        <User size={14} /> {currentPeople} / {maxPeople}명
                     </span>
                     <button 
                      className={`btn-icon ${isBlocked ? 'active' : ''}`} 
                      onClick={() => toggleSlotBlock(dateStr, time)}
                      title={isBlocked ? "예약 열기" : "예약 막기"}
                    >
                       {isBlocked ? <Unlock size={16} /> : <Lock size={16} />}
                     </button>
                  </div>
                </div>
                {timeReservations.length > 0 ? (
                  <div className="slot-reservations">
                    {timeReservations.map(res => (
                      <div key={res.id} className="mini-res-item" onClick={() => { setSelectedReservation(res); setIsReservationModalOpen(true); }}>
                        <span className="res-name">{res.user}</span>
                        <span className="res-theme">{res.theme}</span>
                        <span className="res-people">{res.people}명</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-slot-msg">예약 없음</div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="reservation-system">
      {isReservationModalOpen && <ReservationDetailModal />}

      {/* 모바일 메뉴 오버레이 */}
      <div 
        className={`mobile-menu-overlay ${isMobileMenuOpen ? 'open' : ''}`} 
        onClick={() => setIsMobileMenuOpen(false)}
      ></div>

      <div className={`admin-sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="admin-logo">
          <div style={{width: 24, height: 24, background: '#6366f1', borderRadius: 6}}></div>
          오감몬스터 Admin
        </div>
        
        <nav className="admin-nav">
          <div className="nav-item" onClick={onBack} style={{marginBottom: '1rem', color: '#6366f1'}}>
            <Bot size={20} /> AI 비서 모드
          </div>
          <div className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => handleTabChange('dashboard')}>
            <LayoutDashboard size={20} /> 대시보드
          </div>
          <div className={`nav-item ${activeTab === 'reservations' ? 'active' : ''}`} onClick={() => handleTabChange('reservations')}>
            <List size={20} /> 예약 현황
          </div>
          <div className={`nav-item ${activeTab === 'schedule' ? 'active' : ''}`} onClick={() => handleTabChange('schedule')}>
            <Calendar size={20} /> 일정/재고 관리
          </div>
          <div className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => handleTabChange('settings')}>
            <Settings size={20} /> 테마 설정
          </div>
        </nav>
      </div>

      <div className="admin-main">
        <header className="admin-header">
          <div className="header-title" style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
            <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu size={24} />
            </button>
            <h2>
              {activeTab === 'dashboard' && '관리자 대시보드'}
              {activeTab === 'reservations' && '실시간 예약 접수 현황'}
              {activeTab === 'schedule' && '통합 스케줄 캘린더'}
              {activeTab === 'settings' && '테마 컨텐츠 관리'}
            </h2>
          </div>
          <div className="header-actions">
            <button className="btn-action">
              <Bell size={18} />
              {pendingReservations > 0 && <span style={{marginLeft: 6, background: '#ef4444', color: 'white', fontSize: 10, padding: '2px 6px', borderRadius: 10}}>{pendingReservations}</span>}
            </button>
            <div style={{width: 32, height: 32, borderRadius: '50%', background: '#475569'}}></div>
          </div>
        </header>

        <div className="admin-content">
          {activeTab === 'dashboard' && (
            <>
              <div className="dashboard-grid">
                <div className="stat-card">
                  <span className="stat-label">총 예약 건수</span>
                  <div className="stat-value">{reservations.length}건</div>
                  <div className="stat-trend trend-up"><TrendingUp size={14} /> 실시간 반영 중</div>
                </div>
                <div className="stat-card">
                  <span className="stat-label">확정 매출액</span>
                  <div className="stat-value">{totalRevenue.toLocaleString()}원</div>
                  <div className="stat-trend trend-up"><DollarSign size={14} /> 목표 달성률 95%</div>
                </div>
                <div className="stat-card">
                  <span className="stat-label">승인 대기</span>
                  <div className="stat-value" style={{color: pendingReservations > 0 ? '#f59e0b' : '#94a3b8'}}>{pendingReservations}건</div>
                  <div className="stat-trend"><Clock size={14} /> 빠른 처리 필요</div>
                </div>
                <div className="stat-card">
                  <span className="stat-label">활성 테마</span>
                  <div className="stat-value">{themes.filter(t => t.isVisible !== false).length}개</div>
                  <div className="stat-trend"><Settings size={14} /> 컨텐츠 관리</div>
                </div>
              </div>
              <div className="data-table-container">
                <div style={{padding: '1.5rem', borderBottom: '1px solid #334155'}}>
                  <h3 style={{margin: 0}}>최근 들어온 예약</h3>
                </div>
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>상태</th>
                        <th>예약번호</th>
                        <th>고객명</th>
                        <th>테마</th>
                        <th>일시</th>
                        <th>관리</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reservations.slice(0, 5).map(res => (
                        <tr key={res.id} onClick={() => { setSelectedReservation(res); setIsReservationModalOpen(true); }} style={{cursor: 'pointer'}}>
                          <td>
                            <span className={`status-badge status-${res.status}`}>
                              {res.status === 'pending' ? '대기중' : res.status === 'confirmed' ? '확정' : '취소'}
                            </span>
                          </td>
                          <td>{res.id}</td>
                          <td>{res.user}</td>
                          <td>{res.theme}</td>
                          <td>{res.date} {res.time}</td>
                          <td>
                            <div className="action-buttons" onClick={e => e.stopPropagation()}>
                              {res.status === 'pending' && (
                                <>
                                  <button className="btn-icon approve" onClick={() => handleStatusChange(res.id, 'confirmed')}><Check size={16} /></button>
                                  <button className="btn-icon reject" onClick={() => handleStatusChange(res.id, 'cancelled')}><X size={16} /></button>
                                </>
                              )}
                              <button className="btn-icon" onClick={() => { setSelectedReservation(res); setIsReservationModalOpen(true); }}><MoreHorizontal size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {activeTab === 'reservations' && (
            <div className="data-table-container">
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>예약번호</th>
                      <th>고객명</th>
                      <th>연락처</th>
                      <th>테마</th>
                      <th>일시</th>
                      <th>상태</th>
                      <th>관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reservations.map(res => (
                      <tr key={res.id} onClick={() => { setSelectedReservation(res); setIsReservationModalOpen(true); }} style={{cursor: 'pointer'}}>
                        <td>{res.id}</td>
                        <td>{res.user}</td>
                        <td>{res.phone}</td>
                        <td>{res.theme}</td>
                        <td>{res.date} {res.time}</td>
                        <td>
                          <span className={`status-badge status-${res.status}`}>
                            {res.status === 'pending' ? '승인 대기' : res.status === 'confirmed' ? '예약 확정' : '취소됨'}
                          </span>
                        </td>
                        <td>
                           <div className="action-buttons" onClick={e => e.stopPropagation()}>
                            {res.status === 'pending' && (
                              <div className="action-buttons">
                                <button className="btn-icon approve" onClick={() => handleStatusChange(res.id, 'confirmed')}><Check size={16} /></button>
                                <button className="btn-icon reject" onClick={() => handleStatusChange(res.id, 'cancelled')}><X size={16} /></button>
                              </div>
                            )}
                            <button className="btn-icon" onClick={() => { setSelectedReservation(res); setIsReservationModalOpen(true); }}><Edit size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'schedule' && (
            <div className="admin-calendar-wrapper">
               <div className="admin-calendar-container" style={{flex: 1}}>
                  <div className="calendar-header-actions">
                    <div style={{display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
                      <button className="btn-icon" onClick={prevMonth}><ChevronLeft size={20} /></button>
                      <span className="calendar-month-title">{format(currentMonth, 'yyyy년 M월', { locale: ko })}</span>
                      <button className="btn-icon" onClick={nextMonth}><ChevronRight size={20} /></button>
                    </div>
                    <button className="btn-action" onClick={() => setCurrentMonth(new Date())}>오늘 날짜로 이동</button>
                  </div>
                  <div className="month-grid">
                    {['일', '월', '화', '수', '목', '금', '토'].map(day => (
                      <div key={day} className="month-cell-header">{day}</div>
                    ))}
                    {calendarDays.map(day => {
                      const dateKey = format(day, 'yyyy-MM-dd');
                      const dayReservations = reservations.filter(r => r.date === dateKey && r.status !== 'cancelled');
                      const isToday = isSameDay(day, new Date());
                      const isCurrentMonth = isSameMonth(day, currentMonth);
                      const isSelected = selectedDate && isSameDay(day, selectedDate);

                      return (
                        <div 
                          key={dateKey} 
                          className={`month-cell ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                          onClick={() => setSelectedDate(day)}
                        >
                          <div className={`date-label ${!isCurrentMonth ? 'faded' : ''}`}>
                            {format(day, 'd')}
                          </div>
                          {dayReservations.slice(0, 3).map(res => (
                            <div key={res.id} className={`res-badge ${res.status}`} style={res.status === 'confirmed' ? {borderColor: themes.find(t=>t.name===res.theme)?.color, color: themes.find(t=>t.name===res.theme)?.color, background: `${themes.find(t=>t.name===res.theme)?.color}20`} : {}}>
                              <span style={{fontSize: 10}}>{res.time}</span>
                              {res.theme}
                            </div>
                          ))}
                          {dayReservations.length > 3 && (
                            <div className="more-badge">+{dayReservations.length - 3}건 더보기</div>
                          )}
                        </div>
                      )
                    })}
                  </div>
               </div>
               
               {selectedDate && <DailySchedulePanel />}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="settings-container">
              {!isEditing ? (
                <>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem'}}>
                    <h3 style={{margin: 0}}>등록된 테마 목록 ({themes.length})</h3>
                    <button className="btn-action btn-primary" onClick={() => {
                      setEditTheme({ 
                        name: '', price: 35000, duration: '50분', age: '전연령', 
                        tags: [], desc: '', image: null, detailImages: [],
                        isVisible: true, maxCapacity: 8, color: THEME_COLORS[0]
                      });
                      setIsEditing(true);
                    }}>
                      <Plus size={18} /> 새 테마 등록
                    </button>
                  </div>
                  <div className="themes-grid">
                    {themes.map(theme => (
                      <div key={theme.id} className={`stat-card ${!theme.isVisible ? 'theme-hidden' : ''}`} style={{padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', opacity: theme.isVisible === false ? 0.6 : 1}}>
                        <div style={{height: 160, background: '#334155', position: 'relative'}}>
                          {theme.image ? (
                            <img src={theme.image} alt={theme.name} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                          ) : (
                            <div style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8'}}>
                              <ImageIcon size={32} />
                            </div>
                          )}
                          <div style={{position: 'absolute', top: 10, right: 10, display: 'flex', gap: 5}}>
                            <button className="btn-icon" style={{background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none'}} onClick={() => { setEditTheme(theme); setIsEditing(true); }}>
                              <Edit size={16} />
                            </button>
                            <button className="btn-icon" style={{background: 'rgba(239,68,68,0.8)', color: 'white', border: 'none'}} onClick={() => deleteTheme(theme.id)}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                          {theme.isVisible === false && (
                            <div style={{position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600}}>
                              <EyeOff size={24} style={{marginRight: 8}} /> 비공개
                            </div>
                          )}
                        </div>
                        <div style={{padding: '1.2rem', flex: 1, borderTop: `4px solid ${theme.color || '#6366f1'}`}}>
                          <h4 style={{margin: '0 0 0.5rem 0', fontSize: '1.1rem'}}>{theme.name}</h4>
                          <p style={{margin: '0 0 1rem 0', color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.5}}>{theme.desc}</p>
                          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem'}}>
                            <span>{parseInt(theme.price).toLocaleString()}원</span>
                            <span>{theme.duration} / {theme.age}</span>
                          </div>
                          <div style={{marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap'}}>
                            {theme.tags?.map((tag: string, i: number) => (
                              <span key={i} style={{background: '#334155', padding: '2px 8px', borderRadius: 10, fontSize: '0.75rem'}}>#{tag}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="stat-card" style={{maxWidth: 1000, margin: '0 auto'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '1px solid #334155'}}>
                    <h3 style={{margin: 0}}>{editTheme.id ? '테마 수정' : '새 테마 등록'}</h3>
                    <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
                       <label style={{display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: editTheme.isVisible === false ? '#94a3b8' : '#10b981'}}>
                         {editTheme.isVisible === false ? <EyeOff size={18} /> : <Eye size={18} />}
                         <span style={{fontSize: '0.9rem'}}>{editTheme.isVisible === false ? '비공개 상태' : '공개 중'}</span>
                         <input type="checkbox" checked={editTheme.isVisible !== false} onChange={e => setEditTheme({...editTheme, isVisible: e.target.checked})} style={{display: 'none'}} />
                       </label>
                       <button className="btn-icon" onClick={() => setIsEditing(false)}><X size={20} /></button>
                    </div>
                  </div>
                  
                  <div className="edit-form-grid">
                    {/* 좌측: 이미지 업로드 섹션 */}
                    <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
                       <div>
                        <label style={{display: 'block', marginBottom: '0.5rem', color: '#94a3b8'}}>대표 이미지</label>
                        <div 
                          className="image-upload-box"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          {editTheme.image ? (
                            <img src={editTheme.image} alt="Main" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                          ) : (
                            <div className="upload-placeholder">
                              <Upload size={32} />
                              <div>대표 이미지 추가</div>
                            </div>
                          )}
                          <input type="file" ref={fileInputRef} style={{display: 'none'}} accept="image/*" onChange={handleImageUpload} />
                        </div>
                      </div>

                      <div>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem'}}>
                          <label style={{color: '#94a3b8'}}>상세 이미지 ({editTheme.detailImages?.length || 0}/10)</label>
                          <button 
                            className="btn-text" 
                            onClick={() => detailInputRef.current?.click()}
                            disabled={(editTheme.detailImages?.length || 0) >= 10}
                          >
                            + 추가
                          </button>
                        </div>
                        <input type="file" ref={detailInputRef} style={{display: 'none'}} accept="image/*" multiple onChange={handleDetailImageUpload} />
                        
                        <div className="detail-images-grid">
                          {editTheme.detailImages?.map((img: string, idx: number) => (
                            <div key={idx} className="detail-image-item">
                              <img src={img} alt={`Detail ${idx}`} />
                              <button className="btn-remove-img" onClick={() => removeDetailImage(idx)}><X size={12} /></button>
                            </div>
                          ))}
                          {(editTheme.detailImages?.length || 0) < 10 && (
                             <div className="detail-image-add" onClick={() => detailInputRef.current?.click()}>
                               <Plus size={20} />
                             </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 우측: 상세 정보 입력 */}
                    <div style={{display: 'flex', flexDirection: 'column', gap: '1.2rem'}}>
                      <div>
                        <label style={{display: 'block', marginBottom: '0.5rem', color: '#94a3b8'}}>테마명</label>
                        <input type="text" value={editTheme.name} onChange={e => setEditTheme({...editTheme, name: e.target.value})} className="form-input" placeholder="예: 공룡이나타났다" />
                      </div>

                      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                        <div>
                          <label style={{display: 'block', marginBottom: '0.5rem', color: '#94a3b8'}}>가격 (원)</label>
                          <input type="number" value={editTheme.price} onChange={e => setEditTheme({...editTheme, price: e.target.value})} className="form-input" />
                        </div>
                        <div>
                          <label style={{display: 'block', marginBottom: '0.5rem', color: '#94a3b8'}}>소요 시간</label>
                          <input type="text" value={editTheme.duration} onChange={e => setEditTheme({...editTheme, duration: e.target.value})} className="form-input" placeholder="예: 50분" />
                        </div>
                      </div>

                      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                         <div>
                          <label style={{display: 'block', marginBottom: '0.5rem', color: '#94a3b8'}}>권장 연령</label>
                          <input type="text" value={editTheme.age} onChange={e => setEditTheme({...editTheme, age: e.target.value})} className="form-input" placeholder="예: 4세 ~ 9세" />
                        </div>
                         <div>
                          <label style={{display: 'block', marginBottom: '0.5rem', color: '#94a3b8'}}>최대 정원 (회차당)</label>
                          <input type="number" value={editTheme.maxCapacity || 8} onChange={e => setEditTheme({...editTheme, maxCapacity: parseInt(e.target.value)})} className="form-input" />
                        </div>
                      </div>

                      <div>
                         <label style={{display: 'block', marginBottom: '0.5rem', color: '#94a3b8'}}>테마 고유 색상</label>
                         <div style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap'}}>
                           {THEME_COLORS.map(color => (
                             <div 
                                key={color}
                                onClick={() => setEditTheme({...editTheme, color})}
                                style={{
                                  width: 32, height: 32, borderRadius: '50%', background: color, 
                                  cursor: 'pointer', border: editTheme.color === color ? '2px solid white' : '2px solid transparent',
                                  boxShadow: editTheme.color === color ? '0 0 0 2px #6366f1' : 'none'
                                }}
                             />
                           ))}
                         </div>
                      </div>

                      <div>
                        <label style={{display: 'block', marginBottom: '0.5rem', color: '#94a3b8'}}>상세 설명</label>
                        <textarea rows={4} value={editTheme.desc} onChange={e => setEditTheme({...editTheme, desc: e.target.value})} className="form-input" style={{resize: 'none'}} placeholder="테마에 대한 상세한 설명을 입력해주세요." />
                      </div>

                      <div>
                        <label style={{display: 'block', marginBottom: '0.5rem', color: '#94a3b8'}}>태그 (쉼표로 구분)</label>
                        <input type="text" value={editTheme.tags?.join(', ')} onChange={e => setEditTheme({...editTheme, tags: e.target.value.split(',').map(t => t.trim())})} className="form-input" placeholder="예: 오감발달, 물놀이, 실내" />
                      </div>
                    </div>
                  </div>

                  <div style={{marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid #334155', paddingTop: '1.5rem'}}>
                    <button className="btn-action" onClick={() => setIsEditing(false)}>취소</button>
                    <button className="btn-action btn-primary" onClick={saveTheme}><Save size={18} /> 저장하기</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
