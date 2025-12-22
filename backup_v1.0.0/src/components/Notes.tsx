import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, Search, Tag } from 'lucide-react'
import { Note } from '../types'
import { storage } from '../utils/storage'
import './Notes.css'

export default function Notes() {
  const [notes, setNotes] = useState<Note[]>([])
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editTags, setEditTags] = useState('')

  useEffect(() => {
    loadNotes()
  }, [])

  const loadNotes = () => {
    const savedNotes = storage.getNotes()
    setNotes(savedNotes)
  }

  const saveNotes = (updatedNotes: Note[]) => {
    storage.saveNotes(updatedNotes)
    setNotes(updatedNotes)
  }

  const createNewNote = () => {
    const newNote: Note = {
      id: Date.now().toString(),
      title: '새 메모',
      content: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: []
    }
    saveNotes([newNote, ...notes])
    setSelectedNote(newNote)
    setIsEditing(true)
    setEditTitle(newNote.title)
    setEditContent(newNote.content)
    setEditTags('')
  }

  const selectNote = (note: Note) => {
    setSelectedNote(note)
    setIsEditing(false)
    setEditTitle(note.title)
    setEditContent(note.content)
    setEditTags(note.tags.join(', '))
  }

  const startEditing = () => {
    if (selectedNote) {
      setIsEditing(true)
    }
  }

  const saveNote = () => {
    if (!selectedNote) return

    const tags = editTags.split(',').map(t => t.trim()).filter(t => t.length > 0)

    const updatedNote: Note = {
      ...selectedNote,
      title: editTitle || '제목 없음',
      content: editContent,
      tags,
      updatedAt: new Date().toISOString()
    }

    const updatedNotes = notes.map(note =>
      note.id === selectedNote.id ? updatedNote : note
    )

    saveNotes(updatedNotes)
    setSelectedNote(updatedNote)
    setIsEditing(false)
  }

  const deleteNote = (id: string) => {
    if (confirm('이 메모를 삭제하시겠습니까?')) {
      const updatedNotes = notes.filter(note => note.id !== id)
      saveNotes(updatedNotes)
      if (selectedNote?.id === id) {
        setSelectedNote(null)
        setIsEditing(false)
      }
    }
  }

  const filteredNotes = notes.filter(note => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return (
      note.title.toLowerCase().includes(query) ||
      note.content.toLowerCase().includes(query) ||
      note.tags.some(tag => tag.toLowerCase().includes(query))
    )
  })

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="notes">
      <div className="notes-header">
        <h2>메모</h2>
        <button className="new-note-btn" onClick={createNewNote}>
          <Plus size={20} />
          새 메모
        </button>
      </div>

      <div className="notes-container">
        <div className="notes-sidebar">
          <div className="search-section">
            <div className="search-input-wrapper">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="메모 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="notes-list">
            {filteredNotes.length === 0 ? (
              <div className="empty-notes">
                <p>메모가 없습니다</p>
                <button className="empty-create-btn" onClick={createNewNote}>
                  첫 메모 만들기
                </button>
              </div>
            ) : (
              filteredNotes.map(note => (
                <div
                  key={note.id}
                  className={`note-item ${selectedNote?.id === note.id ? 'selected' : ''}`}
                  onClick={() => selectNote(note)}
                >
                  <div className="note-item-header">
                    <h3 className="note-item-title">{note.title || '제목 없음'}</h3>
                    <button
                      className="note-delete-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteNote(note.id)
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <p className="note-item-preview">
                    {note.content.substring(0, 100)}
                    {note.content.length > 100 && '...'}
                  </p>
                  {note.tags.length > 0 && (
                    <div className="note-item-tags">
                      {note.tags.map((tag, idx) => (
                        <span key={idx} className="note-tag">
                          <Tag size={12} />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="note-item-date">
                    {formatDate(note.updatedAt)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="notes-editor">
          {selectedNote ? (
            <>
              {!isEditing ? (
                <div className="note-view">
                  <div className="note-view-header">
                    <h2>{selectedNote.title || '제목 없음'}</h2>
                    <div className="note-view-actions">
                      <button className="edit-btn" onClick={startEditing}>
                        <Edit2 size={18} />
                        수정
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => deleteNote(selectedNote.id)}
                      >
                        <Trash2 size={18} />
                        삭제
                      </button>
                    </div>
                  </div>
                  {selectedNote.tags.length > 0 && (
                    <div className="note-view-tags">
                      {selectedNote.tags.map((tag, idx) => (
                        <span key={idx} className="note-tag">
                          <Tag size={14} />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="note-view-content">
                    {selectedNote.content || <em>내용이 없습니다</em>}
                  </div>
                  <div className="note-view-footer">
                    <div>생성: {formatDate(selectedNote.createdAt)}</div>
                    <div>수정: {formatDate(selectedNote.updatedAt)}</div>
                  </div>
                </div>
              ) : (
                <div className="note-edit">
                  <div className="note-edit-header">
                    <input
                      type="text"
                      className="note-edit-title"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="제목"
                    />
                    <div className="note-edit-actions">
                      <button className="cancel-btn" onClick={() => setIsEditing(false)}>
                        취소
                      </button>
                      <button className="save-btn" onClick={saveNote}>
                        저장
                      </button>
                    </div>
                  </div>
                  <div className="note-edit-tags">
                    <input
                      type="text"
                      className="note-edit-tags-input"
                      value={editTags}
                      onChange={(e) => setEditTags(e.target.value)}
                      placeholder="태그 (쉼표로 구분)"
                    />
                  </div>
                  <textarea
                    className="note-edit-content"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    placeholder="메모 내용을 입력하세요..."
                  />
                </div>
              )}
            </>
          ) : (
            <div className="no-note-selected">
              <p>메모를 선택하거나 새 메모를 만들어주세요</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

