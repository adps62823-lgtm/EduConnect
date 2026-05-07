import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  BellOff,
  Check,
  CheckCheck,
  Pin,
  Plus,
  Search,
  Users,
  X,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { chatAPI } from '@/api'
import useAuthStore from '@/store/authStore'
import { useWSStore } from '@/store/notifStore'
import Avatar from '@/components/Avatar'
import Modal from '@/components/Modal'
import SearchBar from '@/components/SearchBar'
import { Button, EmptyState, PageHeader, Spinner } from '@/components/ui'
import toast from 'react-hot-toast'

function isRoomChat(chatId) {
  return typeof chatId === 'string' && chatId.startsWith('room_')
}

function sortConversations(items) {
  return [...items].sort((a, b) => {
    if (Boolean(a.is_pinned) !== Boolean(b.is_pinned)) {
      return a.is_pinned ? -1 : 1
    }

    const aDate =
      a.last_message?.created_at ||
      a.updated_at ||
      a.created_at ||
      ''
    const bDate =
      b.last_message?.created_at ||
      b.updated_at ||
      b.created_at ||
      ''

    return new Date(bDate).getTime() - new Date(aDate).getTime()
  })
}

function mergeConversationItem(previous, incoming) {
  if (!incoming?.id) return previous
  return sortConversations([
    incoming,
    ...previous.filter((item) => item.id !== incoming.id),
  ])
}

function previewLabel(conv) {
  const lastMsg = conv.last_message
  if (!lastMsg) return 'No messages yet'

  const body = lastMsg.media_url ? 'Attachment' : (lastMsg.content || 'Attachment')

  if (conv.is_group && !lastMsg.is_mine && lastMsg.sender?.name) {
    return `${lastMsg.sender.name}: ${body}`
  }

  if (lastMsg.is_mine) {
    return `You: ${body}`
  }

  return body
}

function ConvItem({ conv, onClick, onPin }) {
  const online = useWSStore((state) =>
    !conv.is_group && !!conv.other_user && state.onlineUsers.has(conv.other_user.id)
  )

  const other = conv.other_user
  const lastMsg = conv.last_message
  const unread = conv.unread_count || 0

  return (
    <motion.div
      whileHover={{ backgroundColor: 'var(--surface-2)' }}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        cursor: 'pointer',
        borderBottom: '1px solid var(--border)',
        transition: 'all 150ms ease',
        position: 'relative',
      }}
    >
      <div style={{ position: 'relative', flexShrink: 0 }}>
        {conv.is_group ? (
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary), var(--accent))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Users size={20} color="#fff" />
          </div>
        ) : (
          <Avatar user={other} size="md" showRing />
        )}

        {online && (
          <div
            style={{
              position: 'absolute',
              bottom: 1,
              right: 1,
              width: 11,
              height: 11,
              borderRadius: '50%',
              background: 'var(--green)',
              border: '2px solid var(--bg)',
            }}
          />
        )}
      </div>

      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            <div
              className="truncate"
              style={{
                fontWeight: unread > 0 ? 700 : 600,
                fontSize: '0.92rem',
                color: 'var(--text)',
              }}
            >
              {conv.name}
            </div>
            {conv.is_group && (
              <div className="truncate" style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 2 }}>
                {conv.members_count || 0} members
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            {conv.is_muted && <BellOff size={11} style={{ color: 'var(--text-3)' }} />}
            {conv.is_pinned && <Pin size={11} style={{ color: 'var(--primary)' }} fill="currentColor" />}
            {lastMsg?.created_at && (
              <span style={{ fontSize: '0.68rem', color: 'var(--text-3)' }}>
                {formatDistanceToNow(new Date(lastMsg.created_at), { addSuffix: false })}
              </span>
            )}
            <button
              className="btn-icon"
              onClick={(event) => {
                event.stopPropagation()
                onPin(conv)
              }}
              title={conv.is_pinned ? 'Unpin' : 'Pin to top'}
              style={{ padding: 2, marginLeft: 2 }}
            >
              <Pin
                size={12}
                fill={conv.is_pinned ? 'currentColor' : 'none'}
                style={{ color: conv.is_pinned ? 'var(--primary)' : 'var(--text-3)' }}
              />
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden', flex: 1 }}>
            {lastMsg?.is_mine && (
              <span style={{ color: lastMsg.is_read ? 'var(--primary)' : 'var(--text-3)', flexShrink: 0 }}>
                {lastMsg.is_read ? <CheckCheck size={13} /> : <Check size={13} />}
              </span>
            )}
            <span
              className="truncate"
              style={{
                fontSize: '0.78rem',
                color: unread > 0 ? 'var(--text-2)' : 'var(--text-3)',
                fontWeight: unread > 0 ? 600 : 400,
              }}
            >
              {previewLabel(conv)}
            </span>
          </div>

          {unread > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              style={{
                background: 'var(--primary)',
                color: '#fff',
                fontSize: '0.65rem',
                fontWeight: 700,
                borderRadius: '999px',
                minWidth: 18,
                height: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 5px',
                flexShrink: 0,
              }}
            >
              {unread > 99 ? '99+' : unread}
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function NewGroupModal({ open, onClose, onCreated, currentUser }) {
  const [name, setName] = useState('')
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) {
      setName('')
      setMembers([])
      setLoading(false)
    }
  }, [open])

  function addMember(user) {
    if (!user || user.id === currentUser?.id) return
    setMembers((previous) =>
      previous.some((member) => member.id === user.id) ? previous : [...previous, user]
    )
  }

  async function handleCreate() {
    if (!name.trim()) {
      toast.error('Group name is required.')
      return
    }

    if (members.length < 1) {
      toast.error('Add at least one member.')
      return
    }

    setLoading(true)
    try {
      const conv = await chatAPI.createGroup({
        name: name.trim(),
        member_ids: members.map((member) => member.id),
      })
      onCreated(conv)
      toast.success(`Group "${name.trim()}" created.`)
      onClose()
    } catch {
      toast.error('Could not create group.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New Group Chat">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <input
          className="input"
          placeholder="Group name..."
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoFocus
        />

        <div>
          <div className="input-label" style={{ marginBottom: 6 }}>Add Members</div>
          <SearchBar placeholder="Search students..." onSelect={addMember} />
        </div>

        {members.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {members.map((member) => (
              <div
                key={member.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'var(--primary-light)',
                  border: '1px solid var(--primary)30',
                  borderRadius: 'var(--radius-full)',
                  padding: '4px 10px',
                  fontSize: '0.8rem',
                  color: 'var(--primary)',
                }}
              >
                <Avatar user={member} size="xs" showRing={false} />
                {member.name}
                <button
                  onClick={() => setMembers((previous) => previous.filter((item) => item.id !== member.id))}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'inherit',
                    padding: 0,
                    display: 'flex',
                  }}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="ghost" onClick={onClose} style={{ flex: 1 }}>
            Cancel
          </Button>
          <Button variant="primary" loading={loading} onClick={handleCreate} style={{ flex: 2 }}>
            Create Group
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default function Chat() {
  const navigate = useNavigate()
  const location = useLocation()
  const currentUser = useAuthStore((state) => state.user)
  const setUnreadChats = useWSStore((state) => state.setUnreadChats)
  const wsOn = useWSStore((state) => state.on)

  const [convs, setConvs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [q, setQ] = useState('')
  const [showGroup, setShowGroup] = useState(false)
  const convsRef = useRef([])

  useEffect(() => {
    convsRef.current = convs
  }, [convs])

  const refreshUnreadCount = useCallback(async () => {
    try {
      const result = await chatAPI.getUnreadCount()
      setUnreadChats(result?.unread_count || 0)
    } catch {}
  }, [setUnreadChats])

  const loadConvs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await chatAPI.getConversations()
      console.log('Chat conversations loaded:', result)
      
      // Handle various response formats
      let list = []
      if (Array.isArray(result)) {
        list = result
      } else if (result?.conversations && Array.isArray(result.conversations)) {
        list = result.conversations
      } else if (result && typeof result === 'object') {
        list = Object.values(result).find(v => Array.isArray(v)) || []
      }
      
      list = sortConversations(list)
      setConvs(list)
      const total = list.reduce((sum, conv) => sum + (conv.unread_count || 0), 0)
      setUnreadChats(total)
      
      if (list.length === 0) {
        setError(null)
      }
    } catch (err) {
      console.error('Failed to load conversations:', err?.response?.data || err?.message || err)
      setError(err?.response?.data?.detail || err?.message || 'Could not load conversations. Please try again.')
      setConvs([])
      toast.error('Could not load conversations.')
    } finally {
      setLoading(false)
    }
  }, [setUnreadChats])

  const openDM = useCallback(
    async (userId) => {
      try {
        const conv = await chatAPI.createDM(userId)
        console.log('DM created/opened:', conv)
        setConvs((previous) => sortConversations([
          conv,
          ...previous.filter((item) => item.id !== conv.id),
        ]))
        navigate(`/chat/${conv.id}`)
      } catch (err) {
        console.error('Could not open conversation:', err)
        toast.error('Could not open conversation.')
      }
    },
    [navigate]
  )

  useEffect(() => {
    loadConvs()
  }, [loadConvs])

  useEffect(() => {
    const targetUserId = location.state?.openDMWith
    if (!targetUserId) return

    navigate(location.pathname, { replace: true, state: {} })
    openDM(targetUserId)
  }, [location.pathname, location.state, navigate, openDM])

  useEffect(() => {
    const unsubscribe = wsOn('chat_message', async (msg) => {
      if (!msg?.chat_id || isRoomChat(msg.chat_id)) return

      const fromCurrentUser = msg.sender_id === currentUser?.id
      const normalizedMessage = {
        ...msg,
        is_mine: fromCurrentUser,
      }
      const existing = convsRef.current.find((item) => item.id === msg.chat_id)

      if (!existing) {
        try {
          const conv = await chatAPI.getConversation(msg.chat_id)
          setConvs((previous) => mergeConversationItem(previous, conv))
        } catch {}
      } else {
        setConvs((previous) =>
          sortConversations(
            previous.map((item) =>
              item.id === msg.chat_id
                ? {
                    ...item,
                    last_message: normalizedMessage,
                    updated_at: msg.created_at || item.updated_at,
                    unread_count: fromCurrentUser ? item.unread_count || 0 : (item.unread_count || 0) + 1,
                  }
                : item
            )
          )
        )
      }

      if (!fromCurrentUser) {
        await refreshUnreadCount()
      }
    })

    return unsubscribe
  }, [currentUser?.id, refreshUnreadCount, wsOn])

  useEffect(() => {
    const unsubscribe = wsOn('conversation_updated', (event) => {
      if (!event?.conversation?.id) return
      setConvs((previous) => mergeConversationItem(previous, event.conversation))
    })

    return unsubscribe
  }, [wsOn])

  useEffect(() => {
    const unsubscribe = wsOn('conversation_removed', (event) => {
      if (!event?.chat_id) return
      setConvs((previous) => previous.filter((item) => item.id !== event.chat_id))
      refreshUnreadCount()
    })

    return unsubscribe
  }, [refreshUnreadCount, wsOn])

  useEffect(() => {
    const unsubscribe = wsOn('message_read', (event) => {
      if (!event?.chat_id || event.read_by === currentUser?.id) return
      const readIds = new Set(event.message_ids || [])
      if (readIds.size === 0) return

      setConvs((previous) =>
        previous.map((item) => {
          if (item.id !== event.chat_id) return item
          if (!item.last_message || !readIds.has(item.last_message.id)) return item
          return {
            ...item,
            last_message: {
              ...item.last_message,
              is_read: true,
            },
          }
        })
      )
    })

    return unsubscribe
  }, [currentUser?.id, wsOn])

  function handleConvClick(conv) {
    setConvs((previous) =>
      previous.map((item) =>
        item.id === conv.id ? { ...item, unread_count: 0 } : item
      )
    )
    navigate(`/chat/${conv.id}`)
  }

  function handleGroupCreated(conv) {
    setConvs((previous) => mergeConversationItem(previous, conv))
    navigate(`/chat/${conv.id}`)
  }

  async function handleTogglePin(conv) {
    try {
      const result = await chatAPI.togglePin(conv.id)
      const pinned = result?.pinned ?? !conv.is_pinned
      setConvs((previous) =>
        sortConversations(
          previous.map((item) =>
            item.id === conv.id ? { ...item, is_pinned: pinned } : item
          )
        )
      )
      toast.success(pinned ? 'Pinned to top.' : 'Unpinned.')
    } catch {
      toast.error('Could not update pin.')
    }
  }

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    if (!query) return convs

    return convs.filter((conv) => {
      const pool = [
        conv.name,
        conv.other_user?.username,
        conv.other_user?.name,
        conv.last_message?.content,
      ]
      return pool.some((value) => value?.toLowerCase().includes(query))
    })
  }, [convs, q])

  return (
    <div
      className="chat-page"
      style={{
        width: '100%',
        maxWidth: 760,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%',
      }}
    >
      <PageHeader
        title="Messages"
        subtitle={`${convs.length} conversations`}
        action={
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn-icon" onClick={() => setShowGroup(true)} title="New group">
              <Users size={18} />
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => navigate('/explore')}
              style={{ display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <Plus size={15} /> New
            </button>
          </div>
        }
      />

      <div style={{ padding: '0 12px 12px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '8px 12px',
          }}
        >
          <Search size={15} style={{ color: 'var(--text-3)' }} />
          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Search conversations..."
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              outline: 'none',
              color: 'var(--text)',
              fontSize: '0.88rem',
            }}
          />
        </div>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          margin: '0 12px 16px',
        }}
      >
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
            <Spinner />
          </div>
        ) : error ? (
          <div style={{ padding: 12 }}>
            <EmptyState
              icon="⚠️"
              title="Failed to load conversations"
              desc={error}
              action={
                <Button variant="primary" onClick={() => loadConvs()}>
                  Retry
                </Button>
              }
            />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 12 }}>
            <EmptyState
              icon="💬"
              title={q ? 'No conversations match' : 'No messages yet'}
              desc="Search for a student or explore to find people to chat with."
              action={
                <Button variant="primary" onClick={() => navigate('/explore')}>
                  Find Students
                </Button>
              }
            />
          </div>
        ) : (
          filtered.map((conv) => (
            <ConvItem
              key={conv.id}
              conv={conv}
              onClick={() => handleConvClick(conv)}
              onPin={handleTogglePin}
            />
          ))
        )}
      </div>

      <NewGroupModal
        open={showGroup}
        onClose={() => setShowGroup(false)}
        onCreated={handleGroupCreated}
        currentUser={currentUser}
      />
    </div>
  )
}
