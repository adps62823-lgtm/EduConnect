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

  useEffect(() => {
    if (user?.id && !didConnect.current) {
      didConnect.current = true
      try { connect(user.id) } catch (e) { console.warn('WS connect failed:', e) }
      try { loadNotifs() }    catch (e) { console.warn('loadNotifs failed:', e) }
    }
    return () => {
      if (didConnect.current) {
        try { disconnect() } catch (e) {}
        didConnect.current = false
      }
    }
  }, [user?.id])

  const isLeft   = navbar_position === 'left'
  const isTop    = navbar_position === 'top'
  const isBottom = !isLeft && !isTop

  return (
    <div
      className="app-layout"
      style={{
        flexDirection: isLeft ? 'row' : 'column',
        paddingBottom: isBottom ? 'var(--navbar-height)' : 0,
        paddingTop:    isTop    ? 'var(--navbar-height)' : 0,
        paddingLeft:   isLeft   ? 'var(--sidebar-width)' : 0,
        minHeight: '100dvh',
        height: 'auto',
        overflow: 'visible',
      }}
    >
      <Navbar />
      <main className="main-content" style={{ minHeight: 0 }}>
        <div className="page-scroll" id="page-scroll">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
