import { useState, useEffect } from 'react'
import { Download, Upload, Trash2, Info, Moon, Sun, Layout, LayoutTemplate } from 'lucide-react'
import { storage } from '../utils/storage'
import './SettingsPanel.css'

interface SettingsPanelProps {
  onSettingsChange?: () => void
}

export default function SettingsPanel({ onSettingsChange }: SettingsPanelProps) {
  const [settings, setSettings] = useState({ theme: 'dark', autoSave: true, layout: 'side' })
  const [storageInfo, setStorageInfo] = useState({ todos: 0, notes: 0, events: 0 })

  useEffect(() => {
    loadSettings()
    updateStorageInfo()
  }, [])

  const loadSettings = () => {
    const savedSettings = storage.getSettings()
    // 기존 설정에 layout이 없는 경우를 대비한 기본값 처리
    if (!savedSettings.layout) savedSettings.layout = 'side'
    setSettings(savedSettings)
  }

  const saveSettings = (newSettings: any) => {
    storage.saveSettings(newSettings)
    setSettings(newSettings)
    if (onSettingsChange) {
      onSettingsChange()
    }
  }

  const updateStorageInfo = () => {
    const todos = storage.getTodos()
    const notes = storage.getNotes()
    const events = storage.getEvents()
    setStorageInfo({
      todos: todos.length,
      notes: notes.length,
      events: events.length
    })
  }

  const handleExport = () => {
    const data = {
      todos: storage.getTodos(),
      notes: storage.getNotes(),
      events: storage.getEvents(),
      settings: storage.getSettings(),
      exportDate: new Date().toISOString()
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `jarvis-backup-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json'
    input.onchange = (e: any) => {
      const file = e.target.files[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (event: any) => {
        try {
          const data = JSON.parse(event.target.result)
          
          if (data.todos) storage.saveTodos(data.todos)
          if (data.notes) storage.saveNotes(data.notes)
          if (data.events) storage.saveEvents(data.events)
          if (data.settings) storage.saveSettings(data.settings)
          
          loadSettings()
          updateStorageInfo()
          alert('데이터를 성공적으로 가져왔습니다!')
        } catch (error) {
          alert('파일을 읽는 중 오류가 발생했습니다.')
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  const handleClearAll = () => {
    if (confirm('모든 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      localStorage.clear()
      setStorageInfo({ todos: 0, notes: 0, events: 0 })
      setSettings({ theme: 'dark', autoSave: true })
      alert('모든 데이터가 삭제되었습니다.')
    }
  }

  return (
    <div className="settings-panel">
      <div className="settings-header">
        <h2>설정</h2>
      </div>

      <div className="settings-content">
        <section className="settings-section">
          <h3>디자인 설정</h3>
          <div className="setting-item">
            <label>
              <span>레이아웃</span>
              <p>메뉴 위치를 선택합니다</p>
            </label>
            <div className="layout-options">
              <button 
                className={`layout-option-btn ${settings.layout === 'side' ? 'active' : ''}`}
                onClick={() => saveSettings({ ...settings, layout: 'side' })}
              >
                <Layout size={18} />
                <span>왼쪽 사이드바</span>
              </button>
              <button 
                className={`layout-option-btn ${settings.layout === 'top' ? 'active' : ''}`}
                onClick={() => saveSettings({ ...settings, layout: 'top' })}
              >
                <LayoutTemplate size={18} />
                <span>상단 메뉴</span>
              </button>
            </div>
          </div>
        </section>

        <section className="settings-section">
          <h3>일반 설정</h3>
          <div className="setting-item">
            <label>
              <span>자동 저장</span>
              <p>변경사항을 자동으로 저장합니다</p>
            </label>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.autoSave}
                onChange={(e) => saveSettings({ ...settings, autoSave: e.target.checked })}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </section>

        <section className="settings-section">
          <h3>데이터 관리</h3>
          
          <div className="storage-info">
            <div className="info-item">
              <span>할 일</span>
              <strong>{storageInfo.todos}개</strong>
            </div>
            <div className="info-item">
              <span>메모</span>
              <strong>{storageInfo.notes}개</strong>
            </div>
            <div className="info-item">
              <span>일정</span>
              <strong>{storageInfo.events}개</strong>
            </div>
          </div>

          <div className="data-actions">
            <button className="action-btn export-btn" onClick={handleExport}>
              <Download size={18} />
              데이터 내보내기
            </button>
            <button className="action-btn import-btn" onClick={handleImport}>
              <Upload size={18} />
              데이터 가져오기
            </button>
            <button className="action-btn clear-btn" onClick={handleClearAll}>
              <Trash2 size={18} />
              모든 데이터 삭제
            </button>
          </div>
        </section>

        <section className="settings-section">
          <h3>정보</h3>
          <div className="info-section">
            <div className="info-card">
              <Info size={24} />
              <div>
                <h4>자비스 AI 비서</h4>
                <p>버전 1.0.0</p>
                <p className="info-description">
                  일정 관리, 할 일 목록, 메모 작성 등 다양한 기능을 제공하는 AI 비서 프로그램입니다.
                  모든 데이터는 브라우저의 로컬 스토리지에 저장됩니다.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

