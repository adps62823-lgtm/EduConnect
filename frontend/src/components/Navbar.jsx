/**
 * Navbar.jsx — Animated nav bar
 * Supports bottom (default) / top / left-sidebar positions.
 * Active route highlight · notification badge · study status dot
 */
import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home, Search, HelpCircle, MessageCircle, BookOpen,
  User, Star, FileText, GraduationCap, Trophy, Flame,
  Bell, Settings, LogOut, Compass, Map,
} from 'lucide-react'
import useAuthStore from '@/store/authStore'
import useThemeStore from '@/store/themeStore'
import { useWSStore, useNotifStore } from '@/store/notifStore'

// Main nav items (always visible)
const NAV_ITEMS = [
  { to: '/feed',        icon: Home,          label: 'Feed'       },
  { to: '/help',        icon: HelpCircle,    label: 'Forum'      },
  { to: '/chat',        icon: MessageCircle, label: 'Chat',  badge: 'chat' },
  { to: '/rooms',       icon: BookOpen,      label: 'Rooms'      },
  { to: '/profile',     icon: User,          label: 'Profile'    },
]

// Extra items shown only in sidebar
const SIDEBAR_EXTRA = [
  { to: '/explore',     icon: Compass,    label: 'Explore'    },
  { to: '/mentor',      icon: GraduationCap, label: 'Mentors' },
  { to: '/resources',   icon: FileText,   label: 'Resources'  },
  { to: '/colleges',    icon: Map,        label: 'Colleges'   },
  { to: '/leaderboard', icon: Trophy,     label: 'Leaderboard'},
  { to: '/streak-wars', icon: Flame,      label: 'Streak Wars'},
  { to: '/journey',     icon: Star,       label: 'Journey'    },
  { to: '/notifications', icon: Bell,     label: 'Notifs', badge: 'notif' },
  { to: '/settings',    icon: Settings,   label: 'Settings'   },
]

export default function Navbar() {
  const location        = useLocation()
  const user            = useAuthStore(s => s.user)
  const logout          = useAuthStore(s => s.logout)
  const navbar_position = useThemeStore(s => s.navbar_position)
  const unreadChats     = useWSStore(s => s.unreadChats)
  const unreadNotifs    = useNotifStore(s => s.unread)

  const isLeft   = navbar_position === 'left'
  const isTop    = navbar_position === 'top'
  const isBottom = navbar_position === 'bottom'

  function getBadge(badge) {
    if (badge === 'chat'  && unreadChats  > 0) return unreadChats
    if (badge === 'notif' && unreadNotifs > 0) return unreadNotifs
    return null
  }

  // ── Bottom / Top ───────────────────────────────────────
  if (isBottom || isTop) {
    return (
      <nav className={`navbar ${isTop ? 'navbar-top' : ''}`}>
        {NAV_ITEMS.map(item => {
          const Icon    = item.icon
          const active  = location.pathname.startsWith(item.to)
          const badge   = getBadge(item.badge)

          return (
            <NavLink key={item.to} to={item.to} className="nav-item" style={{ textDecoration: 'none' }}>
              <div style={{ position: 'relative' }}>
                <motion.div
                  animate={active
                    ? { scale: 1.15, color: 'var(--primary)' }
                    : { scale: 1,    color: 'var(--text-3)'  }
                  }
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                >
                  <Icon size={22} />
                </motion.div>

                {badge && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="nav-badge"
                  >
                    {badge > 99 ? '99+' : badge}
                  </motion.span>
                )}

                {/* Active dot */}
                <AnimatePresence>
                  {active && (
                    <motion.div
                      layoutId="nav-dot"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      style={{
                        position: 'absolute',
                        bottom: -6,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 4, height: 4,
                        borderRadius: '50%',
                        background: 'var(--primary)',
                      }}
                    />
                  )}
                </AnimatePresence>
              </div>

              <span style={{
                fontSize: '0.62rem',
                fontWeight: 600,
                color: active ? 'var(--primary)' : 'var(--text-3)',
                marginTop: 2,
                letterSpacing: '0.03em',
              }}>
                {item.label}
              </span>
            </NavLink>
          )
        })}
      </nav>
    )
  }

  // ── Left Sidebar ───────────────────────────────────────
  const allItems = [...NAV_ITEMS, ...SIDEBAR_EXTRA]

  return (
    <nav className="navbar navbar-left" style={{ overflowY: 'auto' }}>
      {/* Logo */}
      <div style={{
        padding: '8px 16px 20px',
        fontFamily: 'var(--font-main)',
        fontWeight: 800,
        fontSize: '1.2rem',
        letterSpacing: '-0.05em',
        background: 'linear-gradient(135deg, var(--primary), var(--accent))',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}>
        EduConnect
      </div>

      {/* Nav links */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {allItems.map(item => {
          const Icon   = item.icon
          const active = location.pathname.startsWith(item.to)
          const badge  = getBadge(item.badge)

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`nav-item ${active ? 'active' : ''}`}
              style={{ textDecoration: 'none' }}
            >
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <Icon size={18} />
                {badge && (
                  <span className="nav-badge" style={{ top: -4, right: -6 }}>
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </div>
              <span>{item.label}</span>
              {active && (
                <motion.div
                  layoutId="sidebar-active"
                  style={{
                    position: 'absolute',
                    right: 8,
                    width: 4, height: 4,
                    borderRadius: 2,
                    background: 'var(--primary)',
                  }}
                />
              )}
            </NavLink>
          )
        })}
      </div>

      {/* User footer */}
      <div style={{
        borderTop: '1px solid var(--border)',
        paddingTop: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}>
        {user && (
          <NavLink to="/profile" style={{ textDecoration: 'none' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 12px', borderRadius: 'var(--radius)',
              cursor: 'pointer',
            }}>
              <div style={{ position: 'relative' }}>
                <img
                  src={user.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${user.name}`}
                  alt={user.name}
                  className={`avatar avatar-sm avatar-ring-${user.study_status || 'chilling'}`}
                />
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div className="truncate" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                  {user.name}
                </div>
                <div className="truncate text-muted" style={{ fontSize: '0.72rem' }}>
                  @{user.username}
                </div>
              </div>
            </div>
          </NavLink>
        )}

        <button
          onClick={logout}
          className="nav-item"
          style={{ color: 'var(--red)', width: '100%', justifyContent: 'flex-start' }}
        >
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </nav>
  )
}
