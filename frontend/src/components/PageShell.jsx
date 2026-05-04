/**
 * PageShell.jsx — Consistent page layout wrapper
 * Provides fixed positioning container for proper mobile scrolling
 * Replaces the old flexbox centering approach
 */
import { useEffect } from 'react'

export default function PageShell({ children, className = '', style = {} }) {
  // Ensure proper viewport height on mobile
  useEffect(() => {
    const setVH = () => {
      const vh = window.innerHeight * 0.01
      document.documentElement.style.setProperty('--vh', `${vh}px`)
    }

    setVH()
    window.addEventListener('resize', setVH)
    window.addEventListener('orientationchange', setVH)

    return () => {
      window.removeEventListener('resize', setVH)
      window.removeEventListener('orientationchange', setVH)
    }
  }, [])

  return (
    <div
      className={`page-shell ${className}`}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        ...style,
      }}
    >
      <div
        className="page-content"
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
        }}
      >
        {children}
      </div>
    </div>
  )
}