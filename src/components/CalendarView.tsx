import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, addMonths, subMonths } from 'date-fns'
import { ko } from 'date-fns/locale'
import { CalendarEvent } from '../types'
import { storage } from '../utils/storage'
import './CalendarView.css'

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showEventForm, setShowEventForm] = useState(false)
  const [newEvent, setNewEvent] = useState({ title: '', description: '', date: '', time: '' })

  useEffect(() => {
    loadEvents()
  }, [])

  const loadEvents = () => {
    const savedEvents = storage.getEvents()
    setEvents(savedEvents)
  }

  const saveEvents = (updatedEvents: CalendarEvent[]) => {
    storage.saveEvents(updatedEvents)
    setEvents(updatedEvents)
  }

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // 달력 시작일 이전의 빈 칸
  const startDay = monthStart.getDay()
  const emptyDays = Array.from({ length: startDay }, (_, i) => i)

  const getEventsForDate = (date: Date) => {
    return events.filter(event => isSameDay(new Date(event.date), date))
  }

  const handleAddEvent = () => {
    if (!newEvent.title.trim() || !newEvent.date) return

    const event: CalendarEvent = {
      id: Date.now().toString(),
      title: newEvent.title,
      description: newEvent.description,
      date: newEvent.date,
      time: newEvent.time || undefined,
      color: '#6366f1'
    }

    saveEvents([...events, event])
    setNewEvent({ title: '', description: '', date: '', time: '' })
    setShowEventForm(false)
    setSelectedDate(null)
  }

  const handleDeleteEvent = (id: string) => {
    saveEvents(events.filter(event => event.id !== id))
  }

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    setNewEvent({ ...newEvent, date: format(date, 'yyyy-MM-dd') })
    setShowEventForm(true)
  }

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1))

  const dayNames = ['일', '월', '화', '수', '목', '금', '토']

  return (
    <div className="calendar-view">
      <div className="calendar-header">
        <h2>일정 관리</h2>
        <button className="add-event-btn" onClick={() => setShowEventForm(true)}>
          <Plus size={20} />
          일정 추가
        </button>
      </div>

      <div className="calendar-container">
        <div className="calendar-nav">
          <button className="nav-btn" onClick={prevMonth}>
            <ChevronLeft size={20} />
          </button>
          <h3 className="month-title">
            {format(currentDate, 'yyyy년 M월', { locale: ko })}
          </h3>
          <button className="nav-btn" onClick={nextMonth}>
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="calendar-grid">
          {dayNames.map(day => (
            <div key={day} className="calendar-day-header">
              {day}
            </div>
          ))}

          {emptyDays.map((_, idx) => (
            <div key={`empty-${idx}`} className="calendar-day empty" />
          ))}

          {daysInMonth.map(day => {
            const dayEvents = getEventsForDate(day)
            const isCurrentDay = isToday(day)
            const isSelected = selectedDate && isSameDay(day, selectedDate)

            return (
              <div
                key={day.toString()}
                className={`calendar-day ${isCurrentDay ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                onClick={() => handleDateClick(day)}
              >
                <div className="day-number">{format(day, 'd')}</div>
                <div className="day-events">
                  {dayEvents.slice(0, 3).map(event => (
                    <div
                      key={event.id}
                      className="event-dot"
                      style={{ backgroundColor: event.color }}
                      title={event.title}
                    />
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="event-more">+{dayEvents.length - 3}</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="events-sidebar">
        <h3>일정 목록</h3>
        <div className="events-list">
          {events.length === 0 ? (
            <div className="empty-events">
              <p>등록된 일정이 없습니다</p>
            </div>
          ) : (
            events
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
              .map(event => (
                <div key={event.id} className="event-item">
                  <div className="event-color" style={{ backgroundColor: event.color }} />
                  <div className="event-details">
                    <div className="event-title">{event.title}</div>
                    <div className="event-date">
                      {format(new Date(event.date), 'M월 d일', { locale: ko })}
                      {event.time && ` ${event.time}`}
                    </div>
                    {event.description && (
                      <div className="event-description">{event.description}</div>
                    )}
                  </div>
                  <button
                    className="event-delete-btn"
                    onClick={() => handleDeleteEvent(event.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
          )}
        </div>
      </div>

      {showEventForm && (
        <div className="event-form-overlay" onClick={() => setShowEventForm(false)}>
          <div className="event-form" onClick={(e) => e.stopPropagation()}>
            <h3>일정 추가</h3>
            <div className="form-group">
              <label>제목</label>
              <input
                type="text"
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                placeholder="일정 제목"
              />
            </div>
            <div className="form-group">
              <label>날짜</label>
              <input
                type="date"
                value={newEvent.date}
                onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>시간 (선택사항)</label>
              <input
                type="time"
                value={newEvent.time}
                onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>설명 (선택사항)</label>
              <textarea
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                placeholder="일정 설명"
                rows={3}
              />
            </div>
            <div className="form-actions">
              <button className="cancel-btn" onClick={() => setShowEventForm(false)}>
                취소
              </button>
              <button className="save-btn" onClick={handleAddEvent}>
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

