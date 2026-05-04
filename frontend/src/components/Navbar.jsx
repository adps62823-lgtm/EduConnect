import { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home, HelpCircle, MessageCircle, BookOpen, User,
  GraduationCap, FileText, Map, Trophy, Flame,
  Bell, Settings, LogOut, Compass, Star, Menu, X,
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

// Stable style objects - defined outside component to prevent recreation
const baseNavItemStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: '6px 8px',
  borderRadius: 'var(--radius)',
  color: 'var(--text-3)',
  background: 'transparent',
  cursor: 'pointer',
  border: 'none',
  textDecoration: 'none',
  fontSize: '0.65rem',
  fontWeight: 400,
  transition: 'all 0.15s',
  position: 'relative',
  flexShrink: 0,
  minWidth: 48,
  WebkitUserSelect: 'none',
  userSelect: 'none',
  WebkitTouchCallout: 'none',
  pointerEvents: 'auto',
}

const activeNavItemStyle = {
  ...baseNavItemStyle,
  color: 'var(--primary)',
  background: 'var(--primary-light)',
  fontWeight: 600,
}

const leftBaseNavItemStyle = {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
  padding: '10px 12px',
  borderRadius: 'var(--radius)',
  color: 'var(--text-3)',
  background: 'transparent',
  cursor: 'pointer',
  border: 'none',
  textDecoration: 'none',
  fontSize: '0.9rem',
  fontWeight: 400,
  transition: 'all 0.15s',
  position: 'relative',
  flexShrink: 0,
  minWidth: 'auto',
  WebkitUserSelect: 'none',
  userSelect: 'none',
  WebkitTouchCallout: 'none',
  pointerEvents: 'auto',
}

const leftActiveNavItemStyle = {
  ...leftBaseNavItemStyle,
  color: 'var(--primary)',
  background: 'var(--primary-light)',
  fontWeight: 600,
}

export default function Navbar() {
  const location        = useLocation()
  const navigate        = useNavigate()
  const user            = useAuthStore(s => s.user)
  const logout          = useAuthStore(s => s.logout)
  const navbar_position = useThemeStore(s => s.navbar_position)
  const unreadChats     = useWSStore(s => s.unreadChats)
  const unreadNotifs    = useNotifStore(s => s.unread)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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

  const handleNavClick = (to) => {
    navigate(resolveTo(to))
    setMobileMenuOpen(false)
  }

  const navbarStyle = {
    bottom: { 
      position:'fixed', 
      bottom:0, 
      left:0, 
      right:0, 
      height:'var(--navbar-height)',
      display:'flex', 
      alignItems:'center', 
      justifyContent:'space-around',
      background:'var(--glass-bg)', 
      backdropFilter:'var(--glass-blur)',
      borderTop:'1px solid var(--glass-border)', 
      zIndex:100, 
      padding:'0 8px',
      WebkitBackdropFilter: 'var(--glass-blur)',
    },
    top:    { 
      position:'fixed', 
      top:0, 
      left:0, 
      right:0, 
      height:'var(--navbar-height)',
      display:'flex', 
      alignItems:'center', 
      justifyContent:'space-around',
      background:'var(--glass-bg)', 
      backdropFilter:'var(--glass-blur)',
      borderBottom:'1px solid var(--glass-border)', 
      zIndex:100, 
      padding:'0 8px',
      WebkitBackdropFilter: 'var(--glass-blur)',
    },
    left:   { 
      position:'fixed', 
      top:0, 
      left:0, 
      bottom:0, 
      width:'var(--sidebar-width)',
      display:'flex', 
      flexDirection:'column', 
      gap:4,
      background:'var(--glass-bg)', 
      backdropFilter:'var(--glass-blur)',
      borderRight:'1px solid var(--glass-border)', 
      zIndex:100,
      padding:'16px 12px', 
      overflowY:'auto',
      WebkitBackdropFilter: 'var(--glass-blur)',
    },
  }

  function NavItem({ item, isDrawer = false }) {
    const Icon    = item.icon
    const to      = resolveTo(item.to)
    const active  = isActive(item.to)
    const badge   = getBadge(item.badge)
    
    const baseStyle = isLeft ? leftBaseNavItemStyle : baseNavItemStyle
    const activeStyle = isLeft ? leftActiveNavItemStyle : activeNavItemStyle
    const itemStyle = active ? activeStyle : baseStyle
    const columnStyle = isLeft ? {} : { display: 'flex', flexDirection: 'column' }

    if (isDrawer) {
      // Mobile drawer style
      return (
        <button
          onClick={() => handleNavClick(item.to)}
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            padding: '12px 16px',
            borderRadius: 'var(--radius)',
            color: active ? 'var(--primary)' : 'var(--text-2)',
            background: active ? 'var(--primary-light)' : 'transparent',
            cursor: 'pointer',
            border: 'none',
            textDecoration: 'none',
            fontSize: '0.95rem',
            fontWeight: active ? 600 : 500,
            transition: 'all 0.15s',
            width: '100%',
            position: 'relative',
          }}
        >
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Icon size={20} />
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
        </button>
      )
    }

    return (
      <button
        onClick={() => handleNavClick(item.to)}
        style={{...itemStyle, ...columnStyle}}
      >
        <div style={{ position:'relative', display: 'flex', alignItems: 'center' }}>
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
      </button>
    )
  }

  // Mobile drawer component
  const MobileDrawer = () => (
    <AnimatePresence>
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileMenuOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 99,
            }}
          />
          {/* Drawer panel */}
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{
              position: 'fixed',
              left: 0,
              top: 0,
              bottom: 0,
              width: 280,
              background: 'var(--bg)',
              borderRight: '1px solid var(--border)',
              zIndex: 100,
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto',
            }}
          >
            {/* Drawer header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px',
              borderBottom: '1px solid var(--border)',
              position: 'sticky',
              top: 0,
              background: 'var(--bg-elevated)',
              zIndex: 10,
            }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)' }}>
                EduConnect
              </h2>
              <button
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Drawer items */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              padding: '8px',
              flex: 1,
            }}>
              {[...NAV_ITEMS, ...SIDEBAR_EXTRA].map(item => (
                <NavItem key={item.to} item={item} isDrawer={true} />
              ))}
            </div>

            {/* Drawer footer */}
            <div style={{
              padding: '16px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}>
              <div style={{
                padding: '8px 12px',
                background: 'var(--bg-elevated)',
                borderRadius: 'var(--radius)',
                fontSize: '0.85rem',
                color: 'var(--text-2)',
              }}>
                <div style={{ fontWeight: 600 }}>{user?.name || 'User'}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 2 }}>
                  @{user?.username}
                </div>
              </div>
              <button
                onClick={() => { logout(); setMobileMenuOpen(false) }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--red)',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  borderRadius: 'var(--radius)',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.1)'}
                onMouseLeave={(e) => e.target.style.background = 'none'}
              >
                <LogOut size={18} />
                <span>Log out</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )

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
            style={{ ...leftBaseNavItemStyle, width:'100%', color:'var(--red)' }}>
            <LogOut size={18} />
            <span>Log out</span>
          </button>
        </div>
      </nav>
    )
  }

  // Bottom or Top navbar with mobile menu
  return (
    <>
      <nav style={isTop ? navbarStyle.top : navbarStyle.bottom}>
        {/* Hamburger menu button (only show on mobile) */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '6px',
            minWidth: 44,
            minHeight: 44,
            borderRadius: 'var(--radius)',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-elevated)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
          title="Menu"
        >
          <Menu size={24} />
        </button>

        {NAV_ITEMS.map(item => (
          <NavItem key={item.to} item={item} />
        ))}
      </nav>

      {/* Mobile drawer */}
      <MobileDrawer />
    </>
  )
}

