export interface Todo {
  id: string
  text: string
  completed: boolean
  createdAt: string
  dueDate?: string
  priority: 'low' | 'medium' | 'high'
}

export interface Note {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
  tags: string[]
}

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  date: string
  time?: string
  color: string
}

export interface Command {
  id: string
  text: string
  type: 'todo' | 'calendar' | 'note' | 'general'
  executedAt: string
  result?: string
}

