import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, BookmarkCheck, GraduationCap, Heart, MessageCircle, UserPlus } from 'lucide-react'
import { EmptyState, PageHeader, Spinner } from '@/components/ui'
import { useNotifStore } from '@/store/notifStore'

const TYPE_META = {
  like: { icon: Heart, color: 'var(--red)' },
  comment: { icon: MessageCircle, color: 'var(--primary)' },
  follow: { icon: UserPlus, color: 'var(--accent)' },
  answer: { icon: MessageCircle, color: 'var(--green)' },
  accepted: { icon: BookmarkCheck, color: 'var(--green)' },
  mentor_request: { icon: GraduationCap, color: 'var(--accent)' },
  badge: { icon: Bell, color: 'var(--primary)' },
}

function ago(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function getGroupLabel(iso) {
  const date = new Date(iso)
  const today = new Date()
  if (date.toDateString() === today.toDateString()) {
    return 'Today'
  }

  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday'
  }

  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })
}

function getNotificationHref(notification) {
  if (['answer', 'accepted'].includes(notification.type) && notification.ref_id) {
    return `/help/${notification.ref_id}`
  }
  if (['like', 'comment'].includes(notification.type)) {
    return '/feed'
  }
  if (notification.type === 'mentor_request') {
    return '/mentor'
  }
  if (notification.type === 'follow') {
    return '/profile'
  }
  return null
}

function NotificationRow({ notification, onOpen }) {
  const meta = TYPE_META[notification.type] || { icon: Bell, color: 'var(--primary)' }
  const Icon = meta.icon
  const href = getNotificationHref(notification)

  return (
    <button
      type="button"
      onClick={() => href && onOpen(href)}
      aria-disabled={!href}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '14px 14px',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid transparent',
        background: notification.is_read
          ? 'var(--surface)'
          : 'linear-gradient(135deg, color-mix(in srgb, var(--primary) 10%, transparent), transparent)',
        cursor: href ? 'pointer' : 'default',
        textAlign: 'left',
        transition: 'transform 0.15s ease, border-color 0.15s ease, background 0.15s ease',
      }}
      className="notification-row"
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          color: meta.color,
        }}
      >
        <Icon size={18} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 3 }}>
          <p style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: 'var(--text)' }}>
            {notification.title || 'Notification'}
          </p>
          {!notification.is_read && (
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--primary)',
                flexShrink: 0,
              }}
            />
          )}
        </div>
        <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-2)', lineHeight: 1.5 }}>
          {notification.message}
        </p>
      </div>

      <span style={{ fontSize: '0.74rem', color: 'var(--text-3)', flexShrink: 0, marginTop: 2 }}>
        {ago(notification.created_at)}
      </span>
    </button>
  )
}

export default function Notifications() {
  const navigate = useNavigate()
  const notifications = useNotifStore((state) => state.notifications)
  const loading = useNotifStore((state) => state.loading)
  const load = useNotifStore((state) => state.load)
  const markAllRead = useNotifStore((state) => state.markAllRead)

  useEffect(() => {
    let active = true

    async function init() {
      await load()
      if (!active) return
      await markAllRead()
    }

    init()
    return () => {
      active = false
    }
  }, [load, markAllRead])

  const grouped = useMemo(() => {
    return notifications.reduce((acc, notification) => {
      const label = getGroupLabel(notification.created_at)
      if (!acc[label]) acc[label] = []
      acc[label].push(notification)
      return acc
    }, {})
  }, [notifications])

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.is_read).length,
    [notifications]
  )

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        title="Notifications"
        subtitle={
          notifications.length > 0
            ? `${notifications.length} updates${unreadCount > 0 ? ` - ${unreadCount} unread` : ''}`
            : 'Stay on top of likes, replies, follows, and mentor activity'
        }
      />

      <div className="page-container" style={{ paddingTop: 2, paddingBottom: 20 }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <Spinner size={34} />
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon="!"
            title="All caught up"
            desc="New likes, comments, follows, and mentor activity will show up here."
          />
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {Object.entries(grouped).map(([label, items]) => (
              <section key={label} style={{ display: 'grid', gap: 8 }}>
                <div
                  style={{
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--text-3)',
                    paddingInline: 4,
                  }}
                >
                  {label}
                </div>

                <div style={{ display: 'grid', gap: 8 }}>
                  {items.map((notification) => (
                    <NotificationRow
                      key={notification.id}
                      notification={notification}
                      onOpen={(href) => navigate(href)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .notification-row:hover[aria-disabled="false"] {
          transform: translateY(-1px);
          border-color: var(--border);
          background: var(--surface-2);
        }
      `}</style>
    </div>
  )
}
