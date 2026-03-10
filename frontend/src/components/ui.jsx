/**
 * ui.jsx — Shared atomic UI components
 * Button · Input · Textarea · Spinner · EmptyState
 * PageHeader · Toggle · StarRating · Badge · Skeleton
 */
import { forwardRef } from 'react'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'

// ── Button ────────────────────────────────────────────────
export function Button({
  children, variant = 'primary', size = '',
  loading = false, icon, iconRight,
  className = '', style = {}, ...props
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      className={`btn btn-${variant} ${size ? `btn-${size}` : ''} ${className}`}
      style={style}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading
        ? <Loader2 size={16} className="animate-spin" />
        : icon
      }
      {children}
      {!loading && iconRight}
    </motion.button>
  )
}

// ── Input ─────────────────────────────────────────────────
export const Input = forwardRef(function Input({
  label, error, hint, prefix, suffix, className = '', ...props
}, ref) {
  return (
    <div className="input-group">
      {label && <label className="input-label">{label}</label>}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {prefix && (
          <span style={{
            position: 'absolute', left: 12,
            color: 'var(--text-3)', pointerEvents: 'none',
            display: 'flex', alignItems: 'center',
          }}>
            {prefix}
          </span>
        )}
        <input
          ref={ref}
          className={`input ${className}`}
          style={{
            paddingLeft: prefix ? 38 : undefined,
            paddingRight: suffix ? 38 : undefined,
            borderColor: error ? 'var(--red)' : undefined,
          }}
          {...props}
        />
        {suffix && (
          <span style={{
            position: 'absolute', right: 12,
            color: 'var(--text-3)',
            display: 'flex', alignItems: 'center',
          }}>
            {suffix}
          </span>
        )}
      </div>
      {error && <span style={{ fontSize: '0.75rem', color: 'var(--red)' }}>{error}</span>}
      {hint && !error && <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{hint}</span>}
    </div>
  )
})

// ── Textarea ──────────────────────────────────────────────
export const Textarea = forwardRef(function Textarea({
  label, error, hint, className = '', ...props
}, ref) {
  return (
    <div className="input-group">
      {label && <label className="input-label">{label}</label>}
      <textarea
        ref={ref}
        className={`input ${className}`}
        style={{
          resize: 'vertical',
          minHeight: 80,
          borderColor: error ? 'var(--red)' : undefined,
        }}
        {...props}
      />
      {error && <span style={{ fontSize: '0.75rem', color: 'var(--red)' }}>{error}</span>}
      {hint && !error && <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{hint}</span>}
    </div>
  )
})

// ── Spinner ───────────────────────────────────────────────
export function Spinner({ size = 24, color = 'var(--primary)' }) {
  return (
    <Loader2
      size={size}
      className="animate-spin"
      style={{ color, flexShrink: 0 }}
    />
  )
}

export function FullPageSpinner() {
  return (
    <div style={{
      height: '100%', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <div className="loading-dots">
        <span /><span /><span />
      </div>
    </div>
  )
}

// ── EmptyState ────────────────────────────────────────────
export function EmptyState({ icon = '📭', title, desc, action }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '48px 24px', gap: 12, textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '3.5rem', lineHeight: 1 }}>{icon}</div>
      {title && (
        <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text)' }}>
          {title}
        </div>
      )}
      {desc && <p style={{ maxWidth: 280 }}>{desc}</p>}
      {action}
    </motion.div>
  )
}

// ── PageHeader ────────────────────────────────────────────
export function PageHeader({ title, subtitle, action, back, sticky = true }) {
  return (
    <div className={sticky ? 'feed-header' : ''} style={{
      padding: sticky ? undefined : '16px 16px 0',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {back}
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{title}</h2>
          {subtitle && (
            <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', margin: 0 }}>
              {subtitle}
            </p>
          )}
        </div>
        {action}
      </div>
    </div>
  )
}

// ── Toggle ────────────────────────────────────────────────
export function Toggle({ on, onChange }) {
  return (
    <div
      className={`toggle ${on ? 'on' : ''}`}
      onClick={() => onChange(!on)}
      role="switch"
      aria-checked={on}
      tabIndex={0}
      onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') onChange(!on) }}
    >
      <div className="toggle-thumb" />
    </div>
  )
}

// ── StarRating ────────────────────────────────────────────
export function StarRating({ value = 0, max = 5, onChange, size = 18 }) {
  const stars = Array.from({ length: max }, (_, i) => i + 1)
  return (
    <div className="star-rating">
      {stars.map(star => (
        <span
          key={star}
          onClick={() => onChange?.(star)}
          style={{
            fontSize: size,
            cursor: onChange ? 'pointer' : 'default',
            color: star <= value ? 'var(--accent)' : 'var(--border-2)',
            transition: 'color 150ms ease',
          }}
        >
          ★
        </span>
      ))}
    </div>
  )
}

// ── Tag / Chip ────────────────────────────────────────────
export function Tag({ children, variant = '', onRemove }) {
  return (
    <span className={`tag ${variant ? `tag-${variant}` : ''}`}>
      {children}
      {onRemove && (
        <button
          onClick={onRemove}
          style={{ background: 'none', border: 'none', cursor: 'pointer',
                   color: 'inherit', padding: 0, marginLeft: 2, lineHeight: 1 }}
        >
          ×
        </button>
      )}
    </span>
  )
}

// ── Skeleton ──────────────────────────────────────────────
export function Skeleton({ width = '100%', height = 16, style = {} }) {
  return (
    <div
      className="skeleton"
      style={{ width, height, borderRadius: 'var(--radius)', ...style }}
    />
  )
}

export function CardSkeleton() {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <Skeleton width={44} height={44} style={{ borderRadius: '50%' }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Skeleton width="50%" height={14} />
          <Skeleton width="30%" height={12} />
        </div>
      </div>
      <Skeleton height={14} />
      <Skeleton height={14} width="80%" />
      <Skeleton height={160} />
    </div>
  )
}

// ── Divider ───────────────────────────────────────────────
export function Divider({ label }) {
  if (!label) return <div className="divider" />
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '8px 0' }}>
      <div className="divider" style={{ flex: 1, margin: 0 }} />
      <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <div className="divider" style={{ flex: 1, margin: 0 }} />
    </div>
  )
}

// ── Score / Stat box ──────────────────────────────────────
export function StatBox({ label, value, icon, color = 'var(--primary)' }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 4, padding: '12px 16px',
      background: 'var(--surface-2)',
      borderRadius: 'var(--radius)',
      flex: 1, minWidth: 70,
    }}>
      {icon && <span style={{ fontSize: '1.25rem' }}>{icon}</span>}
      <span style={{ fontWeight: 800, fontSize: '1.25rem', color }}>{value}</span>
      <span style={{ fontSize: '0.7rem', color: 'var(--text-3)', textAlign: 'center' }}>{label}</span>
    </div>
  )
}

// ── Notification dot ──────────────────────────────────────
export function NotifDot({ count }) {
  if (!count) return null
  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--red)', color: '#fff',
        fontSize: '0.65rem', fontWeight: 700,
        padding: '1px 5px', borderRadius: '999px',
        minWidth: 16, height: 16,
      }}
    >
      {count > 99 ? '99+' : count}
    </motion.span>
  )
}
