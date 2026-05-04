import { create } from 'zustand'
import { authAPI, chatAPI, createWebSocket } from '@/api'
import toast from 'react-hot-toast'

function normalizeNotifications(payload) {
  if (Array.isArray(payload)) return payload
  return payload?.notifications || []
}

function isRoomChat(chatId) {
  return typeof chatId === 'string' && chatId.startsWith('room_')
}

export const useNotifStore = create((set) => ({
  notifications: [],
  unread: 0,
  loading: false,

  load: async () => {
    set({ loading: true })
    try {
      const payload = await authAPI.getNotifications()
      const notifications = normalizeNotifications(payload)
      set({
        notifications,
        unread: notifications.filter((item) => !item.is_read).length,
        loading: false,
      })
    } catch {
      set({ loading: false })
    }
  },

  markAllRead: async () => {
    try {
      await authAPI.markAllRead()
      set((state) => ({
        notifications: state.notifications.map((item) => ({ ...item, is_read: true })),
        unread: 0,
      }))
    } catch {
      toast.error('Could not mark notifications as read.')
    }
  },

  push: (notif) => {
    set((state) => ({
      notifications: [notif, ...state.notifications],
      unread: state.unread + 1,
    }))

    const toastTypes = ['message', 'mention', 'streak_milestone', 'badge', 'mentor_accepted']
    if (toastTypes.includes(notif.type)) {
      toast(notif.message, {
        icon: notifIcon(notif.type),
        duration: 4000,
      })
    }
  },

  decrement: () => set((state) => ({ unread: Math.max(0, state.unread - 1) })),
  clearUnread: () => set({ unread: 0 }),
  reset: () => set({ notifications: [], unread: 0, loading: false }),
}))

export const useWSStore = create((set, get) => ({
  ws: null,
  connected: false,
  reconnecting: false,
  onlineUsers: new Set(),
  typingUsers: {},
  unreadChats: 0,
  _listeners: {},
  _reconnectTimer: null,
  _manualDisconnect: false,
  _userId: null,

  connect: (userId) => {
    const { ws, _userId, _reconnectTimer } = get()
    if (ws && _userId === userId && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      return
    }

    if (_reconnectTimer) {
      clearTimeout(_reconnectTimer)
    }

    const socket = createWebSocket(userId)

    socket.onopen = () => {
      set({
        ws: socket,
        connected: true,
        reconnecting: false,
        _manualDisconnect: false,
        _userId: userId,
        _reconnectTimer: null,
      })

      try {
        socket.send(JSON.stringify({ type: 'presence', status: 'online' }))
      } catch {}

      chatAPI.getUnreadCount()
        .then((result) => set({ unreadChats: result.unread_count || 0 }))
        .catch(() => {})
    }

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        get()._handleMessage(msg)
      } catch {
        // Ignore malformed payloads.
      }
    }

    socket.onclose = () => {
      const state = get()
      const shouldReconnect = !state._manualDisconnect && state._userId === userId

      set({
        ws: null,
        connected: false,
      })

      if (!shouldReconnect) {
        set({ reconnecting: false, _reconnectTimer: null })
        return
      }

      const timerId = setTimeout(() => {
        const latest = get()
        if (!latest.connected && !latest._manualDisconnect && latest._userId === userId) {
          set({ reconnecting: true })
          get().connect(userId)
        }
      }, 3000)

      set({ _reconnectTimer: timerId })
    }

    socket.onerror = () => {
      socket.close()
    }

    set({
      ws: socket,
      _userId: userId,
      _manualDisconnect: false,
      _reconnectTimer: null,
    })
  },

  disconnect: () => {
    const { ws, _reconnectTimer } = get()

    if (_reconnectTimer) {
      clearTimeout(_reconnectTimer)
    }

    set({
      _manualDisconnect: true,
      _userId: null,
      _reconnectTimer: null,
      reconnecting: false,
      connected: false,
      ws: null,
      onlineUsers: new Set(),
      typingUsers: {},
      unreadChats: 0,
    })

    if (ws) {
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'presence', status: 'offline' }))
        }
      } catch {}

      try {
        ws.close()
      } catch {}
    }
  },

  send: (data) => {
    const { ws } = get()
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data))
    }
  },

  sendChatMessage: (chatId, content) => {
    get().send({ type: 'chat', chat_id: chatId, content })
  },

  sendTyping: (chatId) => {
    get().send({ type: 'typing', chat_id: chatId })
  },

  sendStopTyping: (chatId) => {
    get().send({ type: 'stop_typing', chat_id: chatId })
  },

  sendOffer: (roomId, to, offer) => {
    get().send({ type: 'webrtc_offer', room_id: roomId, to, offer })
  },

  sendAnswer: (roomId, to, answer) => {
    get().send({ type: 'webrtc_answer', room_id: roomId, to, answer })
  },

  sendIce: (roomId, to, candidate) => {
    get().send({ type: 'webrtc_ice', room_id: roomId, to, candidate })
  },

  sendRoomJoin: (roomId) => {
    get().send({ type: 'room_join', room_id: roomId })
  },

  sendRoomLeave: (roomId) => {
    get().send({ type: 'room_leave', room_id: roomId })
  },

  _handleMessage: (msg) => {
    const notifStore = useNotifStore.getState()

    switch (msg.type) {
      case 'chat':
      case 'chat_message': {
        if (!isRoomChat(msg.chat_id)) {
          set((state) => ({
            unreadChats: state.unreadChats + 1,
          }))
        }
        get()._emit('chat_message', msg)
        break
      }

      case 'typing': {
        const { chat_id, user_id } = msg
        set((state) => {
          const typingUsers = { ...state.typingUsers }
          const current = new Set(typingUsers[chat_id] || [])
          current.add(user_id)
          typingUsers[chat_id] = current
          return { typingUsers }
        })

        setTimeout(() => get()._clearTyping(chat_id, user_id), 3000)
        break
      }

      case 'stop_typing': {
        get()._clearTyping(msg.chat_id, msg.user_id)
        break
      }

      case 'presence': {
        const { user_id, status } = msg
        set((state) => {
          const onlineUsers = new Set(state.onlineUsers)
          if (status === 'online') onlineUsers.add(user_id)
          else onlineUsers.delete(user_id)
          return { onlineUsers }
        })
        get()._emit('presence', msg)
        break
      }

      case 'notification': {
        notifStore.push(msg.notification)
        break
      }

      case 'webrtc_offer':
      case 'webrtc_answer':
      case 'webrtc_ice':
      case 'room_join':
      case 'room_leave':
      case 'room_kick':
      case 'pomodoro_start':
      case 'pomodoro_stop': {
        get()._emit(msg.type, msg)
        break
      }

      default:
        break
    }
  },

  _clearTyping: (chatId, userId) => {
    set((state) => {
      const typingUsers = { ...state.typingUsers }
      if (!typingUsers[chatId]) {
        return { typingUsers }
      }

      const current = new Set(typingUsers[chatId])
      current.delete(userId)

      if (current.size === 0) {
        delete typingUsers[chatId]
      } else {
        typingUsers[chatId] = current
      }

      return { typingUsers }
    })
  },

  on: (event, cb) => {
    set((state) => {
      const listeners = { ...state._listeners }
      listeners[event] = [...(listeners[event] || []), cb]
      return { _listeners: listeners }
    })

    return () => get().off(event, cb)
  },

  off: (event, cb) => {
    set((state) => {
      const listeners = { ...state._listeners }
      if (listeners[event]) {
        listeners[event] = listeners[event].filter((listener) => listener !== cb)
      }
      return { _listeners: listeners }
    })
  },

  _emit: (event, data) => {
    const listeners = get()._listeners[event] || []
    listeners.forEach((listener) => {
      try {
        listener(data)
      } catch {
        // Ignore listener errors so one subscriber does not break others.
      }
    })
  },

  isOnline: (userId) => get().onlineUsers.has(userId),
  isTyping: (chatId, userId) => get().typingUsers[chatId]?.has(userId) ?? false,
  whoIsTyping: (chatId) => Array.from(get().typingUsers[chatId] || []),
  decrementUnread: () => set((state) => ({ unreadChats: Math.max(0, state.unreadChats - 1) })),
  setUnreadChats: (count) => set({ unreadChats: count }),
}))

function notifIcon(type) {
  const icons = {
    like: '❤',
    comment: '💬',
    follow: '👤',
    message: '💌',
    mention: '📣',
    answer: '💡',
    accepted: '✅',
    badge: '🏆',
    streak_milestone: '🔥',
    mentor_accepted: '🎓',
    mentor_request: '🤝',
    room_join: '📚',
    resource_download: '📥',
  }

  return icons[type] || '🔔'
}

export default useNotifStore
