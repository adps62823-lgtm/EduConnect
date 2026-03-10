/**
 * Layout.jsx — App shell
 * Renders sidebar OR bottom/top navbar based on theme setting.
 * Contains the <Outlet /> for all protected pages.
 */
import { useEffect, useRef } from 'react'
import { Outlet } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import useThemeStore from '@/store/themeStore'
import { useWSStore, useNotifStore } from '@/store/notifStore'
import Navbar from './Navbar'

export default function Layout() {
  const user            = useAuthStore(s => s.user)
  const navbar_position = useThemeStore(s => s.navbar_position)
  const connect         = useWSStore(s => s.connect)
  const disconnect      = useWSStore(s => s.disconnect)
  const loadNotifs      = useNotifStore(s => s.load)
  const didConnect      = useRef(false)

  // Connect WebSocket once on mount
  useEffect(() => {
    if (user?.id && !didConnect.current) {
      didConnect.current = true
      connect(user.id)
      loadNotifs()
    }
    return () => {
      if (didConnect.current) {
        disconnect()
        didConnect.current = false
      }
    }
  }, [user?.id])

  const isLeft   = navbar_position === 'left'
  const isTop    = navbar_position === 'top'
  const isBottom = navbar_position === 'bottom'

  return (
    <div
      className="app-layout"
      style={{
        flexDirection: isLeft ? 'row' : 'column',
        paddingBottom: isBottom ? 'var(--navbar-height)' : 0,
        paddingTop:    isTop    ? 'var(--navbar-height)' : 0,
        paddingLeft:   isLeft   ? 'var(--sidebar-width)' : 0,
      }}
    >
      <Navbar />

      <main className="main-content">
        <div className="page-scroll" id="page-scroll">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
