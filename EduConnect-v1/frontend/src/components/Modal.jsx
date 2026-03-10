/**
 * Modal.jsx — Animated modal with overlay + keyboard dismiss
 */
import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

export default function Modal({ open, onClose, title, children, maxWidth = 520, noPad = false }) {
  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={e => { if (e.target === e.currentTarget) onClose?.() }}
        >
          <motion.div
            className="modal-content"
            style={{ maxWidth, padding: noPad ? 0 : undefined }}
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1,    opacity: 1, y: 0  }}
            exit={{ scale: 0.92,    opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          >
            {(title || onClose) && (
              <div style={{
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 20,
                padding: noPad ? '20px 20px 0' : 0,
              }}>
                {title && <h3 style={{ fontSize: '1.1rem' }}>{title}</h3>}
                {onClose && (
                  <button className="btn-icon" onClick={onClose} style={{ marginLeft: 'auto' }}>
                    <X size={18} />
                  </button>
                )}
              </div>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
