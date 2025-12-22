const STORAGE_KEYS = {
  TODOS: 'jarvis_todos',
  NOTES: 'jarvis_notes',
  EVENTS: 'jarvis_events',
  COMMANDS: 'jarvis_commands',
  SETTINGS: 'jarvis_settings'
}

export const storage = {
  getTodos: (): any[] => {
    const data = localStorage.getItem(STORAGE_KEYS.TODOS)
    return data ? JSON.parse(data) : []
  },
  
  saveTodos: (todos: any[]) => {
    localStorage.setItem(STORAGE_KEYS.TODOS, JSON.stringify(todos))
  },
  
  getNotes: (): any[] => {
    const data = localStorage.getItem(STORAGE_KEYS.NOTES)
    return data ? JSON.parse(data) : []
  },
  
  saveNotes: (notes: any[]) => {
    localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes))
  },
  
  getEvents: (): any[] => {
    const data = localStorage.getItem(STORAGE_KEYS.EVENTS)
    return data ? JSON.parse(data) : []
  },
  
  saveEvents: (events: any[]) => {
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events))
  },
  
  getCommands: (): any[] => {
    const data = localStorage.getItem(STORAGE_KEYS.COMMANDS)
    return data ? JSON.parse(data) : []
  },
  
  saveCommands: (commands: any[]) => {
    localStorage.setItem(STORAGE_KEYS.COMMANDS, JSON.stringify(commands))
  },
  
  getSettings: (): any => {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS)
    return data ? JSON.parse(data) : { theme: 'dark', autoSave: true, layout: 'side' }
  },
  
  saveSettings: (settings: any) => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings))
  }
}

