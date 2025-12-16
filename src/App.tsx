import { useState, useEffect } from 'react'
import { Calendar, CheckSquare, FileText, Settings, Command, Sparkles, Store } from 'lucide-react'
import CalendarView from './components/CalendarView'
import TodoList from './components/TodoList'
import Notes from './components/Notes'
import CommandCenter from './components/CommandCenter'
import SettingsPanel from './components/SettingsPanel'
import ReservationSystem from './components/ReservationSystem/ReservationSystem'
import { storage } from './utils/storage'
import './App.css'

type Tab = 'calendar' | 'todos' | 'notes' | 'commands' | 'settings' | 'reservation'
type Layout = 'side' | 'top'

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('commands')
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

      <div className="app-body">
        <nav className="app-nav">
          <button
            className={`nav-button ${activeTab === 'commands' ? 'active' : ''}`}
            onClick={() => setActiveTab('commands')}
            title="명령 센터"
          >
            <Command size={20} />
            <span>명령</span>
          </button>
          <button
            className={`nav-button ${activeTab === 'reservation' ? 'active' : ''}`}
            onClick={() => setActiveTab('reservation')}
            title="오감몬스터 예약"
          >
            <Store size={20} />
            <span>예약 시스템</span>
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

        <main className="app-main">
          {activeTab === 'commands' && <CommandCenter />}
          {activeTab === 'reservation' && <ReservationSystem onBack={() => setActiveTab('commands')} />}
          {activeTab === 'calendar' && <CalendarView />}
          {activeTab === 'todos' && <TodoList />}
          {activeTab === 'notes' && <Notes />}
          {activeTab === 'settings' && <SettingsPanel onSettingsChange={handleSettingsChange} />}
        </main>
      </div>
    </div>
  )
}

export default App

