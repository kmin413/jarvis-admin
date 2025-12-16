import { useState, useEffect } from 'react'
import { Plus, Trash2, Check, Circle, AlertCircle } from 'lucide-react'
import { Todo } from '../types'
import { storage } from '../utils/storage'
import './TodoList.css'

export default function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [newTodo, setNewTodo] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all')

  useEffect(() => {
    loadTodos()
  }, [])

  const loadTodos = () => {
    const savedTodos = storage.getTodos()
    setTodos(savedTodos)
  }

  const saveTodos = (updatedTodos: Todo[]) => {
    storage.saveTodos(updatedTodos)
    setTodos(updatedTodos)
  }

  const addTodo = () => {
    if (!newTodo.trim()) return

    const todo: Todo = {
      id: Date.now().toString(),
      text: newTodo.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
      priority: 'medium'
    }

    saveTodos([...todos, todo])
    setNewTodo('')
  }

  const toggleTodo = (id: string) => {
    saveTodos(todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ))
  }

  const deleteTodo = (id: string) => {
    saveTodos(todos.filter(todo => todo.id !== id))
  }

  const setPriority = (id: string, priority: 'low' | 'medium' | 'high') => {
    saveTodos(todos.map(todo =>
      todo.id === id ? { ...todo, priority } : todo
    ))
  }

  const filteredTodos = todos.filter(todo => {
    if (filter === 'active') return !todo.completed
    if (filter === 'completed') return todo.completed
    return true
  })

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <AlertCircle size={16} className="priority-high" />
      case 'medium':
        return <Circle size={16} className="priority-medium" />
      default:
        return <Circle size={16} className="priority-low" />
    }
  }

  const completedCount = todos.filter(t => t.completed).length
  const activeCount = todos.length - completedCount

  return (
    <div className="todo-list">
      <div className="todo-header">
        <h2>할 일 목록</h2>
        <div className="todo-stats">
          <span className="stat active">진행 중: {activeCount}</span>
          <span className="stat completed">완료: {completedCount}</span>
        </div>
      </div>

      <div className="todo-filters">
        <button
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          전체
        </button>
        <button
          className={`filter-btn ${filter === 'active' ? 'active' : ''}`}
          onClick={() => setFilter('active')}
        >
          진행 중
        </button>
        <button
          className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
          onClick={() => setFilter('completed')}
        >
          완료
        </button>
      </div>

      <div className="todo-input-section">
        <input
          type="text"
          className="todo-input"
          placeholder="새 할 일을 입력하세요..."
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addTodo()}
        />
        <button className="todo-add-btn" onClick={addTodo}>
          <Plus size={20} />
          추가
        </button>
      </div>

      <div className="todos-container">
        {filteredTodos.length === 0 ? (
          <div className="empty-state">
            <Check size={48} />
            <p>할 일이 없습니다</p>
          </div>
        ) : (
          filteredTodos.map(todo => (
            <div key={todo.id} className={`todo-item ${todo.completed ? 'completed' : ''} priority-${todo.priority}`}>
              <button
                className="todo-checkbox"
                onClick={() => toggleTodo(todo.id)}
              >
                {todo.completed ? (
                  <Check size={20} className="check-icon" />
                ) : (
                  <Circle size={20} className="circle-icon" />
                )}
              </button>
              <div className="todo-content">
                <div className="todo-text">{todo.text}</div>
                <div className="todo-meta">
                  {getPriorityIcon(todo.priority)}
                  <span className="todo-date">
                    {new Date(todo.createdAt).toLocaleDateString('ko-KR')}
                  </span>
                </div>
              </div>
              <div className="todo-priority-selector">
                <select
                  value={todo.priority}
                  onChange={(e) => setPriority(todo.id, e.target.value as any)}
                  onClick={(e) => e.stopPropagation()}
                >
                  <option value="low">낮음</option>
                  <option value="medium">보통</option>
                  <option value="high">높음</option>
                </select>
              </div>
              <button
                className="todo-delete-btn"
                onClick={() => deleteTodo(todo.id)}
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

