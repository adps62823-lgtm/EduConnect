/**
 * notifStore.js — Notifications + WebSocket state (Zustand)
 * Handles: notification list, unread count, real-time WS events,
 *          chat relay, typing indicators, online presence
 */
import { create } from 'zustand'
import { authAPI, chatAPI, createWebSocket } from '@/api'
import toast from 'react-hot-toast'

// ── Notification Store ────────────────────────────────────
export const useNotifStore = create((set, get) => ({
  notifications: [],
  unread:        0,
  loading:       false,

  // Load notifications from backend
  load: async () => {
    set({ loading: true })
    try {
      const res = await authAPI.getNotifications()
      const notifs = res.data
      set({
        notifications: notifs,
        unread: notifs.filter(n => !n.is_read).length,
        loading: false,
      })
    } catch {
      set({ loading: false })
    }
  },

  // Mark all as read
  markAllRead: async () => {
    try {
      await authAPI.markAllRead()
      set(state => ({
        notifications: state.notifications.map(n => ({ ...n, is_read: true })),
        unread: 0,
      }))
    } catch {
      toast.error('Could not mark notifications as read.')
    }
  },

  // Push a new notification in real-time (from WebSocket)
  push: (notif) => {
    set(state => ({
      notifications: [notif, ...state.notifications],
      unread: state.unread + 1,
    }))
    // Show toast for important types
    const toastTypes = ['message', 'mention', 'streak_milestone', 'badge', 'mentor_accepted']
    if (toastTypes.includes(notif.type)) {
      toast(notif.message, {
        icon: _notifIcon(notif.type),
        duration: 4000,
      })
    }
  },

  decrement: () => set(s => ({ unread: Math.max(0, s.unread - 1) })),
  reset:     () => set({ notifications: [], unread: 0 }),
}))


// ── WebSocket Store ───────────────────────────────────────
export const useWSStore = create((set, get) => ({
  ws:           null,
  connected:    false,
  reconnecting: false,
  onlineUsers:  new Set(),
  typingUsers:  {},     // { chatId: Set<userId> }
  unreadChats:  0,

  // ── Connect ──────────────────────────────────────────
  connect: (userId) => {
    const existing = get().ws
    if (existing?.readyState === WebSocket.OPEN) return

    const ws = createWebSocket(userId)
    let reconnectTimer = null

    ws.onopen = () => {
      set({ ws, connected: true, reconnecting: false })
      // Announce presence
      ws.send(JSON.stringify({ type: 'presence', status: 'online' }))
      // Load unread chat count
      chatAPI.getUnreadCount()
        .then(r => set({ unreadChats: r.data.unread_count }))
        .catch(() => {})
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        get()._handleMessage(msg)
      } catch {
        // Ignore malformed
      }
    }

    ws.onclose = () => {
      set({ connected: false })
      // Auto-reconnect after 3s
      reconnectTimer = setTimeout(() => {
        if (get().ws) {
          set({ reconnecting: true })
          get().connect(userId)
        }
      }, 3000)
    }

    ws.onerror = () => {
      ws.close()
    }

    set({ ws, _reconnectTimer: reconnectTimer })
  },

  // ── Disconnect ────────────────────────────────────────
  disconnect: () => {
    const { ws } = get()
    if (ws) {
      ws.send(JSON.stringify({ type: 'presence', status: 'offline' }))
      ws.close()
    }
    set({ ws: null, connected: false })
  },

  // ── Send ──────────────────────────────────────────────
  send: (data) => {
    const { ws } = get()
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data))
    }
  },

  // ── Send chat message via WS ──────────────────────────
  sendChatMessage: (chatId, content) => {
    get().send({ type: 'chat', chat_id: chatId, content })
  },

  // ── Typing indicator ──────────────────────────────────
  sendTyping: (chatId) => {
    get().send({ type: 'typing', chat_id: chatId })
  },

  sendStopTyping: (chatId) => {
    get().send({ type: 'stop_typing', chat_id: chatId })
  },

  // ── WebRTC signalling ──────────────────────────────────
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

  // ── Message handlers ──────────────────────────────────
  _handleMessage: (msg) => {
    const notifStore = useNotifStore.getState()

    switch (msg.type) {

      // New chat message
      case 'chat': {
        set(state => ({
          unreadChats: state.unreadChats + 1,
        }))
        // Let individual chat pages handle message injection
        // via their own listeners
        get()._emit('chat_message', msg)
        break
      }

      // Typing indicator
      case 'typing': {
        const { chat_id, user_id } = msg
        set(state => {
          const typing = { ...state.typingUsers }
          if (!typing[chat_id]) typing[chat_id] = new Set()
          else typing[chat_id] = new Set(typing[chat_id])
          typing[chat_id].add(user_id)
          return { typingUsers: typing }
        })
        // Auto-clear after 3s
        setTimeout(() => get()._clearTyping(chat_id, user_id), 3000)
        break
      }

      case 'stop_typing': {
        get()._clearTyping(msg.chat_id, msg.user_id)
        break
      }

      // Presence update
      case 'presence': {
        const { user_id, status } = msg
        set(state => {
          const online = new Set(state.onlineUsers)
          if (status === 'online') online.add(user_id)
          else online.delete(user_id)
          return { onlineUsers: online }
        })
        get()._emit('presence', msg)
        break
      }

      // Notification
      case 'notification': {
        notifStore.push(msg.notification)
        break
      }

      // WebRTC signalling — forward to room listeners
      case 'webrtc_offer':
      case 'webrtc_answer':
      case 'webrtc_ice': {
        get()._emit(msg.type, msg)
        break
      }

      // Room events
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
    set(state => {
      const typing = { ...state.typingUsers }
      if (typing[chatId]) {
        const set2 = new Set(typing[chatId])
        set2.delete(userId)
        typing[chatId] = set2
      }
      return { typingUsers: typing }
    })
  },

  // ── Event emitter (for component listeners) ───────────
  _listeners: {},

  on: (event, cb) => {
    set(state => {
      const listeners = { ...state._listeners }
      if (!listeners[event]) listeners[event] = []
      listeners[event] = [...listeners[event], cb]
      return { _listeners: listeners }
    })
    // Return unsubscribe fn
    return () => get().off(event, cb)
  },

  off: (event, cb) => {
    set(state => {
      const listeners = { ...state._listeners }
      if (listeners[event]) {
        listeners[event] = listeners[event].filter(f => f !== cb)
      }
      return { _listeners: listeners }
    })
  },

  _emit: (event, data) => {
    const listeners = get()._listeners[event] || []
    listeners.forEach(cb => {
      try { cb(data) } catch { /* ignore listener errors */ }
    })
  },

  // ── Helpers ────────────────────────────────────────────
  isOnline:    (userId) => get().onlineUsers.has(userId),
  isTyping:    (chatId, userId) => get().typingUsers[chatId]?.has(userId) ?? false,
  whoIsTyping: (chatId) => Array.from(get().typingUsers[chatId] || []),

  decrementUnread: () => set(s => ({ unreadChats: Math.max(0, s.unreadChats - 1) })),
  setUnreadChats:  (n) => set({ unreadChats: n }),
}))

// ── Helper ────────────────────────────────────────────────
function _notifIcon(type) {
  const icons = {
    like:            '❤️',
    comment:         '💬',
    follow:          '👤',
    message:         '💌',
    mention:         '📣',
    answer:          '💡',
    accepted:        '✅',
    badge:           '🏆',
    streak_milestone:'🔥',
    mentor_accepted: '🎓',
    mentor_request:  '🤝',
    room_join:       '📚',
    resource_download:'📥',
  }
  return icons[type] || '🔔'
}

export default useNotifStore
