import { useState, useEffect } from 'react'
import { Calendar, CheckSquare, FileText, Settings, Command, Sparkles, Store, Columns2 } from 'lucide-react'
import CalendarView from './components/CalendarView'
import TodoList from './components/TodoList'
import Notes from './components/Notes'
import CommandCenter from './components/CommandCenter'
import SettingsPanel from './components/SettingsPanel'
import ReservationSystem from './components/ReservationSystem/ReservationSystem'
import MultiView from './components/MultiView'
import { storage } from './utils/storage'
import './App.css'

type Mode = 'assistant' | 'reservation'
type Tab = 'calendar' | 'todos' | 'notes' | 'commands' | 'settings' | 'reservation' | 'multiview'
type Layout = 'side' | 'top'

function App() {
  const [mode, setMode] = useState<Mode>(() => {
    // URL 파라미터로 모드 지정 가능
    const params = new URLSearchParams(window.location.search)
    const modeParam = params.get('mode') as Mode | null
    if (modeParam && ['assistant', 'reservation'].includes(modeParam)) {
      return modeParam
    }
    // 기본값: 비서 모드
    return 'assistant'
  })

  const [activeTab, setActiveTab] = useState<Tab>(() => {
    // URL 파라미터로 탭 지정 가능
    const params = new URLSearchParams(window.location.search)
    const tab = params.get('tab') as Tab | null
    if (tab && ['calendar', 'todos', 'notes', 'commands', 'settings', 'reservation', 'multiview'].includes(tab)) {
      return tab
    }
    // 기본값: 모드에 따라 다름
    return mode === 'reservation' ? 'reservation' : 'multiview'
  })
  const [greeting, setGreeting] = useState('')
  const [layout, setLayout] = useState<Layout>('side')

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) {
      setGreeting('좋은 아침입니다')
    } else if (hour < 18) {
      setGreeting('좋은 오후입니다')
    } else {
      setGreeting('좋은 저녁입니다')
    }
    
    loadLayoutSettings()
  }, [])

  const loadLayoutSettings = () => {
    const settings = storage.getSettings()
    if (settings.layout) {
      setLayout(settings.layout)
    }
  }

  const handleSettingsChange = () => {
    loadLayoutSettings()
  }

  return (
    <div className={`app layout-${layout}`}>
      <header className="app-header">
        <div className="header-content">
          <div className="logo-section">
            <Sparkles className="logo-icon" />
            <div>
              <h1>자비스 AI 비서</h1>
              <p className="greeting">{greeting}, 주인님</p>
            </div>
          </div>
        </div>
      </header>

      {/* 모드 전환 탭 */}
      <div className="mode-switcher">
          <button
          className={`mode-button ${mode === 'assistant' ? 'active' : ''}`}
          onClick={() => {
            setMode('assistant')
            setActiveTab('multiview')
          }}
          >
          <Sparkles size={20} />
          <span>비서 모드</span>
          </button>
          <button
          className={`mode-button ${mode === 'reservation' ? 'active' : ''}`}
          onClick={() => {
            setMode('reservation')
            setActiveTab('reservation')
          }}
          >
            <Store size={20} />
            <span>예약 시스템</span>
          </button>
      </div>

      <div className="app-body">
        {mode === 'assistant' ? (
          <nav className="app-nav">
          <button
            className={`nav-button ${activeTab === 'multiview' ? 'active' : ''}`}
            onClick={() => setActiveTab('multiview')}
            title="관리자 & 고객 통합 뷰"
          >
            <Columns2 size={20} />
            <span>통합 뷰</span>
          </button>
            <button
              className={`nav-button ${activeTab === 'commands' ? 'active' : ''}`}
              onClick={() => setActiveTab('commands')}
              title="명령 센터"
            >
              <Command size={20} />
              <span>명령</span>
            </button>
          <button
            className={`nav-button ${activeTab === 'calendar' ? 'active' : ''}`}
            onClick={() => setActiveTab('calendar')}
            title="일정 관리"
          >
            <Calendar size={20} />
            <span>일정</span>
          </button>
          <button
            className={`nav-button ${activeTab === 'todos' ? 'active' : ''}`}
            onClick={() => setActiveTab('todos')}
            title="할 일 목록"
          >
            <CheckSquare size={20} />
            <span>할 일</span>
          </button>
          <button
            className={`nav-button ${activeTab === 'notes' ? 'active' : ''}`}
            onClick={() => setActiveTab('notes')}
            title="메모"
          >
            <FileText size={20} />
            <span>메모</span>
          </button>
          <button
            className={`nav-button ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
            title="설정"
          >
            <Settings size={20} />
            <span>설정</span>
          </button>
        </nav>
        ) : (
          <nav className="app-nav reservation-nav">
            <div className="nav-section-label">예약 시스템 관리</div>
          </nav>
        )}

        <main className={`app-main ${activeTab === 'multiview' || mode === 'reservation' ? 'no-padding' : ''}`}>
          {mode === 'reservation' ? (
            <ReservationSystem onBack={() => setMode('assistant')} />
          ) : (
            <>
          {activeTab === 'commands' && <CommandCenter />}
          {activeTab === 'multiview' && <MultiView />}
          {activeTab === 'calendar' && <CalendarView />}
          {activeTab === 'todos' && <TodoList />}
          {activeTab === 'notes' && <Notes />}
          {activeTab === 'settings' && <SettingsPanel onSettingsChange={handleSettingsChange} />}
            </>
          )}
        </main>
      </div>
    </div>
  )
}

export default App

