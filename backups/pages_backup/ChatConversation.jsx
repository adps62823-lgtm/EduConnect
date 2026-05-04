import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Check,
  CheckCheck,
  ChevronLeft,
  FileText,
  Info,
  Paperclip,
  Send,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { format, isToday, isYesterday } from 'date-fns'
import { chatAPI } from '@/api'
import useAuthStore from '@/store/authStore'
import { useWSStore } from '@/store/notifStore'
import Avatar from '@/components/Avatar'
import Modal from '@/components/Modal'
import SearchBar from '@/components/SearchBar'
import { EmptyState, Spinner } from '@/components/ui'
import toast from 'react-hot-toast'

function dedupeMessages(items) {
  const seen = new Set()
  return items.filter((item) => {
    if (!item?.id || seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
}

function mergeMessages(previous, incoming) {
  return dedupeMessages([...previous, ...incoming]).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
}

function prependMessages(previous, incoming) {
  return dedupeMessages([...incoming, ...previous]).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
}

function DateSep({ date }) {
  const value = new Date(date)
  const label = isToday(value) ? 'Today' : isYesterday(value) ? 'Yesterday' : format(value, 'dd MMM yyyy')

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        margin: '10px 0',
        padding: '0 4px',
      }}
    >
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      <span
        style={{
          fontSize: '0.7rem',
          color: 'var(--text-3)',
          fontWeight: 600,
          background: 'var(--surface)',
          padding: '2px 10px',
          borderRadius: 'var(--radius-full)',
          border: '1px solid var(--border)',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  )
}

function MessageBubble({ msg, prevMsg, isMine, onDelete }) {
  const [showMenu, setShowMenu] = useState(false)
  const showDate = !prevMsg || new Date(msg.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString()
  const showSender = !isMine && (!prevMsg || prevMsg.sender?.id !== msg.sender?.id)

  return (
    <>
      {showDate && <DateSep date={msg.created_at} />}

      <div
        style={{
          display: 'flex',
          flexDirection: isMine ? 'row-reverse' : 'row',
          alignItems: 'flex-end',
          gap: 6,
          marginBottom: showSender ? 8 : 2,
        }}
      >
        {!isMine && (
          <div style={{ width: 28, flexShrink: 0 }}>
            {showSender && <Avatar user={msg.sender} size="xs" showRing={false} />}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: isMine ? 'flex-end' : 'flex-start',
            maxWidth: 'fit-content',
          }}
        >
          {showSender && (
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: 'var(--primary)',
                marginBottom: 3,
                paddingLeft: 10,
              }}
            >
              {msg.sender?.name}
            </span>
          )}

          <div
            style={{ position: 'relative' }}
            onMouseEnter={() => setShowMenu(true)}
            onMouseLeave={() => setShowMenu(false)}
          >
            {msg.media_type === 'image' && msg.media_url && (
              <img
                src={msg.media_url}
                alt="attachment"
                style={{
                  maxWidth: 240,
                  maxHeight: 280,
                  borderRadius: 14,
                  borderBottomRightRadius: isMine ? 4 : 14,
                  borderBottomLeftRadius: isMine ? 14 : 4,
                  display: 'block',
                  marginBottom: msg.content ? 4 : 0,
                }}
              />
            )}

            {msg.media_type === 'file' && msg.media_url && (
              <a
                href={msg.media_url}
                download
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: isMine ? 'rgba(255,255,255,0.15)' : 'var(--surface-3)',
                  borderRadius: 10,
                  padding: '8px 12px',
                  color: 'inherit',
                  textDecoration: 'none',
                  fontSize: '0.82rem',
                }}
              >
                <FileText size={18} />
                <span className="truncate" style={{ maxWidth: 140 }}>
                  {msg.media_url.split('/').pop()}
                </span>
              </a>
            )}

            {msg.content && (
              <div className={isMine ? 'message-bubble message-mine' : 'message-bubble message-theirs'}>
                {msg.content}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: 3,
                    marginTop: 2,
                    fontSize: '0.62rem',
                    opacity: 0.65,
                  }}
                >
                  {format(new Date(msg.created_at), 'HH:mm')}
                  {isMine && (msg.is_read ? <CheckCheck size={11} style={{ color: '#a5b4fc' }} /> : <Check size={11} />)}
                </div>
              </div>
            )}

            <AnimatePresence>
              {showMenu && isMine && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={() => onDelete(msg.id)}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    [isMine ? 'left' : 'right']: -32,
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: '50%',
                    width: 26,
                    height: 26,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'var(--red)',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <Trash2 size={12} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  )
}

function TypingIndicator({ names }) {
  if (!names.length) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 16px',
        fontSize: '0.78rem',
        color: 'var(--text-3)',
      }}
    >
      <div style={{ display: 'flex', gap: 3 }}>
        {[0, 1, 2].map((index) => (
          <motion.span
            key={index}
            animate={{ y: [0, -4, 0] }}
            transition={{ delay: index * 0.15, repeat: Infinity, duration: 0.6 }}
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--primary)',
              display: 'block',
            }}
          />
        ))}
      </div>
      <span>{names.join(', ')} {names.length === 1 ? 'is' : 'are'} typing...</span>
    </motion.div>
  )
}

function GroupInfoModal({ open, onClose, conv, onMemberAdded, onMemberRemoved }) {
  const currentUser = useAuthStore((state) => state.user)
  const isAdmin = conv?.created_by === currentUser?.id
  const [adding, setAdding] = useState(false)
  const [loading, setLoading] = useState(false)

  async function addMember(user) {
    if (!conv || !user?.id) return
    setLoading(true)
    try {
      await chatAPI.addMember(conv.id, user.id)
      onMemberAdded(user)
      toast.success(`${user.name} added.`)
      setAdding(false)
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Could not add member.')
    } finally {
      setLoading(false)
    }
  }

  async function removeMember(userId, name) {
    if (!conv || !userId) return
    if (!window.confirm(`Remove ${name}?`)) return
    setLoading(true)
    try {
      await chatAPI.removeMember(conv.id, userId)
      onMemberRemoved(userId)
      toast.success(`${name} removed.`)
    } catch {
      toast.error('Could not remove member.')
    } finally {
      setLoading(false)
    }
  }

  if (!conv) return null

  return (
    <Modal open={open} onClose={onClose} title={conv.name}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>
          {conv.members_count} members
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {conv.participants?.map((participant) => (
            <div
              key={participant.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                borderRadius: 'var(--radius)',
                background: 'var(--surface-2)',
              }}
            >
              <Avatar user={participant} size="sm" showRing />
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontWeight: 600, fontSize: '0.85rem' }} className="truncate">
                  {participant.name} {participant.id === currentUser?.id && '(you)'}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>
                  @{participant.username}
                </div>
              </div>
              {isAdmin && participant.id !== currentUser?.id && (
                <button
                  onClick={() => removeMember(participant.id, participant.name)}
                  disabled={loading}
                  style={{
                    background: 'var(--red-light)',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    padding: '4px 8px',
                    color: 'var(--red)',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                  }}
                >
                  <UserMinus size={13} />
                </button>
              )}
            </div>
          ))}
        </div>

        {isAdmin && (
          <div>
            <button
              onClick={() => setAdding((value) => !value)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                border: '1px solid var(--primary)30',
                borderRadius: 'var(--radius)',
                padding: '8px 14px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 600,
                width: '100%',
                justifyContent: 'center',
              }}
            >
              <UserPlus size={15} /> Add Member
            </button>
            {adding && (
              <div style={{ marginTop: 10 }}>
                <SearchBar placeholder="Search students..." onSelect={addMember} />
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}

export default function ChatConversation() {
  const { chatId } = useParams()
  const navigate = useNavigate()
  const currentUser = useAuthStore((state) => state.user)
  const wsOn = useWSStore((state) => state.on)
  const sendTyping = useWSStore((state) => state.sendTyping)
  const stopTyping = useWSStore((state) => state.sendStopTyping)
  const whoIsTyping = useWSStore((state) => state.whoIsTyping)
  const isOnline = useWSStore((state) => state.isOnline)
  const setUnreadChats = useWSStore((state) => state.setUnreadChats)

  const [conv, setConv] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(1)
  const [text, setText] = useState('')
  const [file, setFile] = useState(null)
  const [filePreview, setFilePreview] = useState(null)
  const [sending, setSending] = useState(false)
  const [showInfo, setShowInfo] = useState(false)

  const bottomRef = useRef(null)
  const fileRef = useRef(null)
  const typingTimer = useRef(null)

  const refreshUnreadCount = useCallback(async () => {
    try {
      const result = await chatAPI.getUnreadCount()
      setUnreadChats(result.unread_count || 0)
    } catch {}
  }, [setUnreadChats])

  const markConversationRead = useCallback(async () => {
    try {
      await chatAPI.markRead(chatId)
      await refreshUnreadCount()
    } catch {}
  }, [chatId, refreshUnreadCount])

  const loadConversation = useCallback(async () => {
    setLoading(true)
    try {
      const [convRes, msgRes] = await Promise.all([
        chatAPI.getConversation(chatId),
        chatAPI.getMessages(chatId, { page: 1, limit: 40 }),
      ])

      setConv(convRes)
      setMessages(dedupeMessages(msgRes?.messages || []))
      setHasMore(Boolean(msgRes?.has_more))
      setPage(1)
      await markConversationRead()
    } catch {
      toast.error('Conversation not found.')
      navigate('/chat')
    } finally {
      setLoading(false)
    }
  }, [chatId, markConversationRead, navigate])

  useEffect(() => {
    loadConversation()
    return () => {
      clearTimeout(typingTimer.current)
    }
  }, [loadConversation])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const unsubscribe = wsOn('chat_message', async (msg) => {
      if (msg.chat_id !== chatId) return
      setMessages((prev) => mergeMessages(prev, [{ ...msg, is_mine: msg.sender_id === currentUser?.id }]))
      await markConversationRead()
    })

    return unsubscribe
  }, [chatId, currentUser?.id, markConversationRead, wsOn])

  useEffect(() => {
    return () => {
      if (filePreview) {
        URL.revokeObjectURL(filePreview)
      }
    }
  }, [filePreview])

  const typingUsers = whoIsTyping(chatId)
  const typingNames = useMemo(() => {
    return typingUsers
      .filter((userId) => userId !== currentUser?.id)
      .map((userId) => conv?.participants?.find((participant) => participant.id === userId)?.name)
      .filter(Boolean)
  }, [chatId, conv?.participants, currentUser?.id, typingUsers])

  async function loadMore() {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const nextPage = page + 1
      const result = await chatAPI.getMessages(chatId, { page: nextPage, limit: 40 })
      setMessages((prev) => prependMessages(prev, result?.messages || []))
      setHasMore(Boolean(result?.has_more))
      setPage(nextPage)
    } catch {
      toast.error('Could not load older messages.')
    } finally {
      setLoadingMore(false)
    }
  }

  function handleTextChange(event) {
    setText(event.target.value)
    sendTyping(chatId)
    clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => stopTyping(chatId), 2500)
  }

  function clearFileSelection() {
    if (filePreview) {
      URL.revokeObjectURL(filePreview)
    }
    setFile(null)
    setFilePreview(null)
    if (fileRef.current) {
      fileRef.current.value = ''
    }
  }

  function handleFileChange(event) {
    const nextFile = event.target.files?.[0]
    if (!nextFile) return

    if (filePreview) {
      URL.revokeObjectURL(filePreview)
    }

    setFile(nextFile)
    setFilePreview(nextFile.type.startsWith('image/') ? URL.createObjectURL(nextFile) : null)
  }

  async function handleSend(event) {
    event?.preventDefault()
    if ((!text.trim() && !file) || sending) return

    setSending(true)
    stopTyping(chatId)
    clearTimeout(typingTimer.current)

    try {
      const formData = new FormData()
      if (text.trim()) formData.append('content', text.trim())
      if (file) formData.append('file', file)

      const result = await chatAPI.sendMessage(chatId, formData)
      setMessages((prev) => mergeMessages(prev, [result]))
      setText('')
      clearFileSelection()
      await refreshUnreadCount()
    } catch {
      toast.error('Could not send message.')
    } finally {
      setSending(false)
    }
  }

  async function handleDeleteMessage(msgId) {
    try {
      await chatAPI.deleteMessage(chatId, msgId)
      setMessages((prev) => prev.filter((msg) => msg.id !== msgId))
    } catch {
      toast.error('Could not delete message.')
    }
  }

  function handleMemberAdded(user) {
    setConv((prev) => {
      if (!prev) return prev
      const participants = prev.participants || []
      if (participants.some((participant) => participant.id === user.id)) return prev
      return {
        ...prev,
        participants: [...participants, user],
        members_count: (prev.members_count || participants.length) + 1,
      }
    })
  }

  function handleMemberRemoved(userId) {
    setConv((prev) => {
      if (!prev) return prev
      const participants = (prev.participants || []).filter((participant) => participant.id !== userId)
      return {
        ...prev,
        participants,
        members_count: Math.max(0, (prev.members_count || 0) - 1),
      }
    })
  }

  if (loading) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size={32} />
      </div>
    )
  }

  if (!conv) return null

  const other = conv.other_user
  const online = !conv.is_group && other && isOnline(other.id)

  return (
    <div className="chat-window" style={{ height: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 14px',
          background: 'var(--glass-bg)',
          backdropFilter: 'var(--glass-blur)',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}
      >
        <button className="btn-icon" onClick={() => navigate('/chat')}>
          <ChevronLeft size={20} />
        </button>

        {conv.is_group ? (
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary), var(--accent))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Users size={18} color="#fff" />
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            <Avatar user={other} size="sm" showRing={false} />
            {online && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: 'var(--green)',
                  border: '2px solid var(--bg)',
                }}
              />
            )}
          </div>
        )}

        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ fontWeight: 700, fontSize: '0.92rem' }} className="truncate">
            {conv.name}
          </div>
          <div style={{ fontSize: '0.7rem', color: online ? 'var(--green)' : 'var(--text-3)' }}>
            {conv.is_group ? `${conv.members_count} members` : online ? 'Online' : 'Offline'}
          </div>
        </div>

        {conv.is_group && (
          <button className="btn-icon" onClick={() => setShowInfo(true)} title="Group info">
            <Info size={18} />
          </button>
        )}
      </div>

      <div
        className="chat-messages"
        onScroll={(event) => {
          if (event.currentTarget.scrollTop < 60 && hasMore && !loadingMore) {
            loadMore()
          }
        }}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: '120px', // Extra space for fixed input bar
        }}
      >
        {loadingMore && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 8 }}>
            <Spinner size={18} />
          </div>
        )}

        {messages.length === 0 ? (
          <EmptyState
            icon="Chat"
            title="Say hello"
            desc={`Start a conversation with ${conv.is_group ? conv.name : other?.name}.`}
          />
        ) : (
          messages.map((msg, index) => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              prevMsg={messages[index - 1]}
              isMine={msg.sender_id === currentUser?.id || msg.is_mine}
              onDelete={handleDeleteMessage}
            />
          ))
        )}

        <AnimatePresence>
          {typingNames.length > 0 && <TypingIndicator names={typingNames} />}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* Fixed input bar at bottom */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        zIndex: 100,
      }}>
        <AnimatePresence>
          {file && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{
                padding: '8px 16px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: 'var(--surface-2)',
              }}
            >
              {filePreview ? (
                <img src={filePreview} alt="" style={{ height: 48, borderRadius: 8, objectFit: 'cover' }} />
              ) : (
                <FileText size={24} style={{ color: 'var(--primary)' }} />
              )}
              <span style={{ flex: 1, fontSize: '0.82rem' }} className="truncate">{file.name}</span>
              <button
                onClick={clearFileSelection}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex' }}
              >
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSend} style={{
          padding: '12px 16px',
          paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <input
            ref={fileRef}
            type="file"
            style={{ display: 'none' }}
            accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.txt"
            onChange={handleFileChange}
          />

          <button type="button" className="btn-icon" onClick={() => fileRef.current?.click()} title="Attach file">
            <Paperclip size={18} />
          </button>

          <input
            value={text}
            onChange={handleTextChange}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                handleSend()
              }
            }}
            placeholder="Type a message..."
            style={{
              flex: 1,
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 20,
              padding: '12px 16px',
              outline: 'none',
              color: 'var(--text)',
              fontSize: '16px', // Prevent zoom on iOS
              transition: 'border-color 150ms',
              minHeight: '44px', // Touch-friendly
            }}
            onFocus={(event) => { event.target.style.borderColor = 'var(--primary)' }}
            onBlur={(event) => { event.target.style.borderColor = 'var(--border)' }}
          />

          <motion.button
            whileTap={{ scale: 0.9 }}
            type="submit"
            disabled={(!text.trim() && !file) || sending}
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: (!text.trim() && !file) ? 'var(--surface-3)' : 'var(--primary)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: (!text.trim() && !file) ? 'default' : 'pointer',
              flexShrink: 0,
              transition: 'background 200ms ease',
              boxShadow: (!text.trim() && !file) ? 'none' : '0 4px 12px var(--primary-glow)',
            }}
          >
            {sending ? <Spinner size={16} color="#fff" /> : <Send size={18} color={(!text.trim() && !file) ? 'var(--text-3)' : '#fff'} />}
          </motion.button>
        </form>
      </div>

      {conv.is_group && (
        <GroupInfoModal
          open={showInfo}
          onClose={() => setShowInfo(false)}
          conv={conv}
          onMemberAdded={handleMemberAdded}
          onMemberRemoved={handleMemberRemoved}
        />
      )}
    </div>
  )
}
