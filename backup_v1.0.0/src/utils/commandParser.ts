import { storage } from './storage'

export interface ParsedCommand {
  type: 'todo' | 'calendar' | 'note' | 'unknown'
  action: string
  data: any
  message: string
}

export function parseCommand(text: string): ParsedCommand {
  const lowerText = text.toLowerCase().trim()
  
  // 할 일 관련 명령
  if (lowerText.includes('할일') || lowerText.includes('할 일') || lowerText.includes('todo') || 
      lowerText.includes('추가') || lowerText.includes('등록') || lowerText.includes('생성')) {
    const todoMatch = text.match(/(할일|할 일|todo|추가|등록|생성)[\s:：]*(.+)/i)
    if (todoMatch) {
      const todoText = todoMatch[2].trim()
      return {
        type: 'todo',
        action: 'create',
        data: { text: todoText },
        message: `할 일 "${todoText}"을(를) 추가했습니다.`
      }
    }
  }
  
  // 일정 관련 명령
  if (lowerText.includes('일정') || lowerText.includes('약속') || lowerText.includes('calendar') ||
      lowerText.includes('스케줄') || lowerText.includes('예약')) {
    const eventMatch = text.match(/(일정|약속|calendar|스케줄|예약)[\s:：]*(.+)/i)
    if (eventMatch) {
      const eventText = eventMatch[2].trim()
      // 날짜 추출 시도
      const dateMatch = eventText.match(/(\d{1,2}[월\/\-\.]\s*\d{1,2}[일]?)/)
      const timeMatch = eventText.match(/(\d{1,2}:\d{2}|\d{1,2}시)/)
      
      return {
        type: 'calendar',
        action: 'create',
        data: {
          title: eventText,
          date: new Date().toISOString().split('T')[0],
          time: timeMatch ? timeMatch[1] : undefined
        },
        message: `일정 "${eventText}"을(를) 추가했습니다.`
      }
    }
  }
  
  // 메모 관련 명령
  if (lowerText.includes('메모') || lowerText.includes('note') || lowerText.includes('기록') ||
      lowerText.includes('적어') || lowerText.includes('저장')) {
    const noteMatch = text.match(/(메모|note|기록|적어|저장)[\s:：]*(.+)/i)
    if (noteMatch) {
      const noteText = noteMatch[2].trim()
      return {
        type: 'note',
        action: 'create',
        data: { title: noteText.substring(0, 50), content: noteText },
        message: `메모 "${noteText.substring(0, 30)}..."을(를) 저장했습니다.`
      }
    }
  }
  
  // 일반 대화 및 영어 대응
  if (lowerText.match(/^(안녕|반가워|hi|hello|hey)/)) {
    return {
      type: 'unknown',
      action: 'chat',
      data: {},
      message: '안녕하세요! 무엇을 도와드릴까요?'
    }
  }

  if (lowerText.match(/^(고마워|감사|thanks|thank you)/)) {
    return {
      type: 'unknown',
      action: 'chat',
      data: {},
      message: '천만에요, 주인님.'
    }
  }

  // 삭제 명령
  if (lowerText.includes('삭제') || lowerText.includes('지워') || lowerText.includes('제거') ||
      lowerText.includes('delete') || lowerText.includes('remove')) {
    return {
      type: 'unknown',
      action: 'delete',
      data: {},
      message: '삭제할 항목을 선택해주세요.'
    }
  }
  
  // 조회 명령
  if (lowerText.includes('보여') || lowerText.includes('조회') || lowerText.includes('확인') ||
      lowerText.includes('리스트') || lowerText.includes('목록') ||
      lowerText.includes('show') || lowerText.includes('list')) {
    return {
      type: 'unknown',
      action: 'list',
      data: {},
      message: '목록을 표시합니다.'
    }
  }
  
  return {
    type: 'unknown',
    action: 'unknown',
    data: {},
    message: '죄송합니다. 잘 이해하지 못했습니다. 할 일, 일정, 메모 추가 명령을 내려주세요.\n예: "할일 운동 추가", "일정 내일 2시 미팅"'
  }
}

export function executeCommand(command: ParsedCommand): string {
  const commands = storage.getCommands()
  const commandRecord = {
    id: Date.now().toString(),
    text: '',
    type: command.type,
    executedAt: new Date().toISOString(),
    result: command.message
  }
  
  switch (command.type) {
    case 'todo':
      if (command.action === 'create') {
        const todos = storage.getTodos()
        todos.push({
          id: Date.now().toString(),
          text: command.data.text,
          completed: false,
          createdAt: new Date().toISOString(),
          priority: 'medium'
        })
        storage.saveTodos(todos)
      }
      break
      
    case 'calendar':
      if (command.action === 'create') {
        const events = storage.getEvents()
        events.push({
          id: Date.now().toString(),
          title: command.data.title,
          date: command.data.date,
          time: command.data.time,
          color: '#6366f1'
        })
        storage.saveEvents(events)
      }
      break
      
    case 'note':
      if (command.action === 'create') {
        const notes = storage.getNotes()
        notes.push({
          id: Date.now().toString(),
          title: command.data.title,
          content: command.data.content,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tags: []
        })
        storage.saveNotes(notes)
      }
      break
  }
  
  commands.unshift(commandRecord)
  if (commands.length > 50) commands.pop()
  storage.saveCommands(commands)
  
  return command.message
}

