import { useState, useEffect, useRef } from 'react'
import { Send, Bot, User, Sparkles } from 'lucide-react'
import { parseCommand, executeCommand } from '../utils/commandParser'
import { storage } from '../utils/storage'
import './CommandCenter.css'

export default function CommandCenter() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Array<{type: 'user' | 'bot', text: string, timestamp: string}>>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // 초기 환영 메시지
    setMessages([{
      type: 'bot',
      text: '안녕하세요, 주인님! 저는 자비스입니다. 무엇을 도와드릴까요?\n\n예시 명령:\n• "할일 회의 준비하기 추가"\n• "일정 내일 오후 3시 미팅"\n• "메모 프로젝트 아이디어 저장"',
      timestamp: new Date().toISOString()
    }])
    
    // 이전 명령 기록 로드
    const commands = storage.getCommands()
    if (commands.length > 0) {
      const recentCommands = commands.slice(0, 5).map(cmd => ({
        type: 'bot' as const,
        text: `이전 명령: ${cmd.result || '완료됨'}`,
        timestamp: cmd.executedAt
      }))
      setMessages(prev => [...recentCommands, ...prev])
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isProcessing) return

    const userMessage = input.trim()
    setInput('')
    setIsProcessing(true)

    // 사용자 메시지 추가
    setMessages(prev => [...prev, {
      type: 'user',
      text: userMessage,
      timestamp: new Date().toISOString()
    }])

    // 명령 파싱 및 실행
    setTimeout(() => {
      const parsed = parseCommand(userMessage)
      const result = executeCommand(parsed)
      
      setMessages(prev => [...prev, {
        type: 'bot',
        text: result,
        timestamp: new Date().toISOString()
      }])
      
      setIsProcessing(false)
    }, 500)
  }

  const quickCommands = [
    { text: '할일 추가', command: '할일 ' },
    { text: '일정 추가', command: '일정 ' },
    { text: '메모 작성', command: '메모 ' },
  ]

  const handleQuickCommand = (command: string) => {
    setInput(command)
  }

  return (
    <div className="command-center">
      <div className="command-header">
        <Sparkles className="header-icon" />
        <div>
          <h2>명령 센터</h2>
          <p>자연어로 명령을 입력하세요</p>
        </div>
      </div>

      <div className="quick-commands">
        {quickCommands.map((qc, idx) => (
          <button
            key={idx}
            className="quick-command-btn"
            onClick={() => handleQuickCommand(qc.command)}
          >
            {qc.text}
          </button>
        ))}
      </div>

      <div className="messages-container">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.type}`}>
            <div className="message-icon">
              {msg.type === 'user' ? <User size={20} /> : <Bot size={20} />}
            </div>
            <div className="message-content">
              <div className="message-text">{msg.text}</div>
              <div className="message-time">
                {new Date(msg.timestamp).toLocaleTimeString('ko-KR', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          </div>
        ))}
        {isProcessing && (
          <div className="message bot">
            <div className="message-icon">
              <Bot size={20} />
            </div>
            <div className="message-content">
              <div className="message-text typing">처리 중...</div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="command-input-form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="command-input"
          placeholder="명령을 입력하세요... (예: 할일 회의 준비하기 추가)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isProcessing}
        />
        <button
          type="submit"
          className="command-submit"
          disabled={!input.trim() || isProcessing}
        >
          <Send size={20} />
        </button>
      </form>
    </div>
  )
}

