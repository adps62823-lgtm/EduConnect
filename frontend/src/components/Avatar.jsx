/**
 * Avatar.jsx — User avatar with study status ring + fallback initials
 */
export default function Avatar({ user, size = 'md', showRing = true, style = {}, onClick }) {
  const sizeClass = `avatar-${size}`
  const ring = showRing && user?.study_status
    ? `avatar-ring-${user.study_status}`
    : ''

  const src = user?.avatar_url
    || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(user?.name || 'User')}&backgroundColor=6366f1&textColor=ffffff`

  return (
    <img
      src={src}
      alt={user?.name || 'User'}
      className={`avatar ${sizeClass} ${ring}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default', ...style }}
      onError={e => {
        e.target.src = `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(user?.name || 'U')}`
      }}
    />
  )
}
