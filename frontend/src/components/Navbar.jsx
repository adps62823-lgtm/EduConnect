import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home, HelpCircle, MessageCircle, BookOpen, User,
  GraduationCap, FileText, Map, Trophy, Flame,
  Bell, Settings, LogOut, Compass, Star,
} from 'lucide-react'
import useAuthStore from '@/store/authStore'
import useThemeStore from '@/store/themeStore'
import { useWSStore, useNotifStore } from '@/store/notifStore'

const NAV_ITEMS = [
  { to: '/feed',    icon: Home,          label: 'Feed'   },
  { to: '/help',    icon: HelpCircle,    label: 'Forum'  },
  { to: '/chat',    icon: MessageCircle, label: 'Chat',   badge: 'chat'  },
  { to: '/rooms',   icon: BookOpen,      label: 'Rooms'  },
  { to: '/profile', icon: User,          label: 'Profile' },
]

const SIDEBAR_EXTRA = [
  { to: '/explore',      icon: Compass,       label: 'Explore'     },
  { to: '/mentor',       icon: GraduationCap, label: 'Mentors'     },
  { to: '/resources',    icon: FileText,      label: 'Resources'   },
  { to: '/colleges',     icon: Map,           label: 'Colleges'    },
  { to: '/leaderboard',  icon: Trophy,        label: 'Leaderboard' },
  { to: '/streak-wars',  icon: Flame,         label: 'Streak Wars' },
  { to: '/journey',      icon: Star,          label: 'Journey'     },
  { to: '/notifications',icon: Bell,          label: 'Notifs',  badge: 'notif' },
  { to: '/settings',     icon: Settings,      label: 'Settings'    },
]

export default function Navbar() {
  const location        = useLocation()
  const navigate        = useNavigate()
  const user            = useAuthStore(s => s.user)
  const logout          = useAuthStore(s => s.logout)
  const navbar_position = useThemeStore(s => s.navbar_position)
  const unreadChats     = useWSStore(s => s.unreadChats)
  const unreadNotifs    = useNotifStore(s => s.unread)

  const isLeft   = navbar_position === 'left'
  const isTop    = navbar_position === 'top'
  const isBottom = !isLeft && !isTop

  // Resolve the real destination — profile goes to /profile/:username
  function resolveTo(to) {
    if (to === '/profile') {
      return user?.username ? '/profile/' + user.username : '/feed'
    }
    return to
  }

  function getBadge(badge) {
    if (badge === 'chat'  && unreadChats  > 0) return unreadChats
    if (badge === 'notif' && unreadNotifs > 0) return unreadNotifs
    return null
  }

  function isActive(to) {
    if (to === '/profile') return location.pathname.startsWith('/profile')
    return location.pathname === to || location.pathname.startsWith(to + '/')
  }

  const navbarStyle = {
    bottom: { position:'fixed', bottom:0, left:0, right:0, height:'var(--navbar-height)',
               display:'flex', alignItems:'center', justifyContent:'space-around',
               background:'var(--glass-bg)', backdropFilter:'var(--glass-blur)',
               borderTop:'1px solid var(--glass-border)', zIndex:100, padding:'0 8px' },
    top:    { position:'fixed', top:0, left:0, right:0, height:'var(--navbar-height)',
               display:'flex', alignItems:'center', justifyContent:'space-around',
               background:'var(--glass-bg)', backdropFilter:'var(--glass-blur)',
               borderBottom:'1px solid var(--glass-border)', zIndex:100, padding:'0 8px' },
    left:   { position:'fixed', top:0, left:0, bottom:0, width:'var(--sidebar-width)',
               display:'flex', flexDirection:'column', gap:4,
               background:'var(--glass-bg)', backdropFilter:'var(--glass-blur)',
               borderRight:'1px solid var(--glass-border)', zIndex:100,
               padding:'16px 12px', overflowY:'auto' },
  }

  const itemStyle = (active) => ({
    display:'flex', flexDirection: isLeft ? 'row' : 'column',
    alignItems:'center', gap: isLeft ? 12 : 4,
    padding: isLeft ? '10px 12px' : '6px 8px',
    borderRadius:'var(--radius)',
    color: active ? 'var(--primary)' : 'var(--text-3)',
    background: active ? 'var(--primary-light)' : 'transparent',
    cursor:'pointer', border:'none', textDecoration:'none',
    fontSize: isLeft ? '0.9rem' : '0.65rem', fontWeight: active ? 600 : 400,
    transition:'all 0.15s', position:'relative', flexShrink:0,
    minWidth: isLeft ? 'auto' : 48,
  })

  function NavItem({ item }) {
    const Icon    = item.icon
    const to      = resolveTo(item.to)
    const active  = isActive(item.to)
    const badge   = getBadge(item.badge)
    return (
      <NavLink to={to} style={itemStyle(active)}>
        <div style={{ position:'relative' }}>
          <Icon size={isLeft ? 18 : 22} />
          {badge && (
            <span style={{
              position:'absolute', top:-6, right:-6,
              background:'var(--red)', color:'#fff',
              fontSize:'0.6rem', fontWeight:700,
              borderRadius:9999, minWidth:16, height:16,
              display:'flex', alignItems:'center', justifyContent:'center',
              padding:'0 3px',
            }}>{badge > 99 ? '99+' : badge}</span>
          )}
        </div>
        <span>{item.label}</span>
      </NavLink>
    )
  }

  if (isLeft) {
    return (
      <nav style={navbarStyle.left}>
        <div style={{ fontSize:'1.1rem', fontWeight:800, color:'var(--text)',
                      padding:'8px 12px 16px', letterSpacing:'-0.02em' }}>
          EduConnect
        </div>
        {[...NAV_ITEMS, ...SIDEBAR_EXTRA].map(item => (
          <NavItem key={item.to} item={item} />
        ))}
        <div style={{ marginTop:'auto' }}>
          <button onClick={logout}
            style={{ ...itemStyle(false), width:'100%', color:'var(--red)' }}>
            <LogOut size={18} />
            <span>Log out</span>
          </button>
        </div>
      </nav>
    )
  }

  return (
    <nav style={isTop ? navbarStyle.top : navbarStyle.bottom}>
      {NAV_ITEMS.map(item => (
        <NavItem key={item.to} item={item} />
      ))}
    </nav>
  )
}
