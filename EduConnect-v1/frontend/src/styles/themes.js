/**
 * themes.js — EduConnect Theme System
 * 12 accent colors · dark/light · wallpapers · CSS variable injection
 */

// ══════════════════════════════════════════════════════════
// ACCENT COLORS  (12 options matching Studious)
// ══════════════════════════════════════════════════════════
export const ACCENT_COLORS = [
  { id: 'indigo',  name: 'Indigo',      primary: '#6366f1', hover: '#5254cc', glow: '#6366f140' },
  { id: 'violet',  name: 'Violet',      primary: '#8b5cf6', hover: '#7c3aed', glow: '#8b5cf640' },
  { id: 'pink',    name: 'Pink',        primary: '#ec4899', hover: '#db2777', glow: '#ec489940' },
  { id: 'rose',    name: 'Rose',        primary: '#f43f5e', hover: '#e11d48', glow: '#f43f5e40' },
  { id: 'orange',  name: 'Orange',      primary: '#f97316', hover: '#ea6c0a', glow: '#f9731640' },
  { id: 'amber',   name: 'Amber',       primary: '#f59e0b', hover: '#d97706', glow: '#f59e0b40' },
  { id: 'lime',    name: 'Lime',        primary: '#84cc16', hover: '#65a30d', glow: '#84cc1640' },
  { id: 'emerald', name: 'Emerald',     primary: '#10b981', hover: '#059669', glow: '#10b98140' },
  { id: 'teal',    name: 'Teal',        primary: '#14b8a6', hover: '#0d9488', glow: '#14b8a640' },
  { id: 'cyan',    name: 'Cyan',        primary: '#06b6d4', hover: '#0891b2', glow: '#06b6d440' },
  { id: 'sky',     name: 'Sky Blue',    primary: '#0ea5e9', hover: '#0284c7', glow: '#0ea5e940' },
  { id: 'blue',    name: 'Ocean Blue',  primary: '#3b82f6', hover: '#2563eb', glow: '#3b82f640' },
]

// ══════════════════════════════════════════════════════════
// BASE THEMES
// ══════════════════════════════════════════════════════════
export const BASE_THEMES = {
  dark: {
    '--bg':            '#0f0f1a',
    '--bg-2':          '#13131f',
    '--surface':       '#16162a',
    '--surface-2':     '#1e1e35',
    '--surface-3':     '#252540',
    '--border':        '#2a2a3d',
    '--border-2':      '#353550',
    '--text':          '#e8e8f0',
    '--text-2':        '#b0b0cc',
    '--text-3':        '#6b6b8a',
    '--text-inverse':  '#0f0f1a',
    '--glass-bg':      'rgba(22, 22, 42, 0.8)',
    '--glass-border':  'rgba(255, 255, 255, 0.06)',
  },
  light: {
    '--bg':            '#f0f0f8',
    '--bg-2':          '#e8e8f4',
    '--surface':       '#ffffff',
    '--surface-2':     '#f5f5fc',
    '--surface-3':     '#ebebf5',
    '--border':        '#dddde8',
    '--border-2':      '#ccccdd',
    '--text':          '#1a1a2e',
    '--text-2':        '#4a4a6a',
    '--text-3':        '#8888aa',
    '--text-inverse':  '#ffffff',
    '--glass-bg':      'rgba(255, 255, 255, 0.85)',
    '--glass-border':  'rgba(0, 0, 0, 0.06)',
  },
  midnight: {
    '--bg':            '#000008',
    '--bg-2':          '#05050f',
    '--surface':       '#0a0a18',
    '--surface-2':     '#10102a',
    '--surface-3':     '#16163a',
    '--border':        '#1e1e40',
    '--border-2':      '#282855',
    '--text':          '#d8d8ff',
    '--text-2':        '#9090cc',
    '--text-3':        '#5050aa',
    '--text-inverse':  '#000008',
    '--glass-bg':      'rgba(5, 5, 15, 0.85)',
    '--glass-border':  'rgba(255, 255, 255, 0.04)',
  },
  amoled: {
    '--bg':            '#000000',
    '--bg-2':          '#050505',
    '--surface':       '#0a0a0a',
    '--surface-2':     '#111111',
    '--surface-3':     '#1a1a1a',
    '--border':        '#222222',
    '--border-2':      '#333333',
    '--text':          '#f0f0f0',
    '--text-2':        '#a0a0a0',
    '--text-3':        '#555555',
    '--text-inverse':  '#000000',
    '--glass-bg':      'rgba(0, 0, 0, 0.9)',
    '--glass-border':  'rgba(255, 255, 255, 0.04)',
  },
}

// ══════════════════════════════════════════════════════════
// PRESET WALLPAPERS  (8 options)
// ══════════════════════════════════════════════════════════
export const PRESET_WALLPAPERS = [
  {
    id: 'none',
    name: 'None',
    url: null,
    preview: null,
  },
  {
    id: 'midnight',
    name: 'Midnight Blue',
    url: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1920&q=80',
    preview: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=400&q=60',
  },
  {
    id: 'aurora',
    name: 'Aurora',
    url: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1920&q=80',
    preview: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=400&q=60',
  },
  {
    id: 'space',
    name: 'Deep Space',
    url: 'https://images.unsplash.com/photo-1462332420958-a05d1e002413?w=1920&q=80',
    preview: 'https://images.unsplash.com/photo-1462332420958-a05d1e002413?w=400&q=60',
  },
  {
    id: 'forest',
    name: 'Forest Mist',
    url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1920&q=80',
    preview: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=400&q=60',
  },
  {
    id: 'golden',
    name: 'Golden Hour',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1920&q=80',
    preview: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=60',
  },
  {
    id: 'neon',
    name: 'Neon City',
    url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&q=80',
    preview: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=60',
  },
  {
    id: 'mountain',
    name: 'Mountain Snow',
    url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920&q=80',
    preview: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&q=60',
  },
]

// ══════════════════════════════════════════════════════════
// FONT SIZE OPTIONS
// ══════════════════════════════════════════════════════════
export const FONT_SIZES = [
  { id: 'small',  label: 'Small',  size: '14px' },
  { id: 'medium', label: 'Medium', size: '16px' },
  { id: 'large',  label: 'Large',  size: '18px' },
]

// ══════════════════════════════════════════════════════════
// NAVBAR POSITIONS
// ══════════════════════════════════════════════════════════
export const NAVBAR_POSITIONS = [
  { id: 'bottom', label: 'Bottom', icon: '⬇' },
  { id: 'top',    label: 'Top',    icon: '⬆' },
  { id: 'left',   label: 'Sidebar', icon: '◀' },
]

// ══════════════════════════════════════════════════════════
// DEFAULT THEME SETTINGS
// ══════════════════════════════════════════════════════════
export const DEFAULT_THEME = {
  theme:               'dark',
  accentId:            'indigo',
  primary_color:       '#6366f1',
  background_wallpaper: null,
  navbar_position:     'bottom',
  font_size:           'medium',
  animations:          true,
}

// ══════════════════════════════════════════════════════════
// CORE FUNCTIONS
// ══════════════════════════════════════════════════════════

/**
 * applyThemeToDOM — Injects CSS variables directly onto :root
 * Called once on app boot and whenever settings change.
 */
export function applyThemeToDOM(settings = {}) {
  const merged = { ...DEFAULT_THEME, ...settings }
  const root   = document.documentElement

  // 1. Base theme vars
  const base = BASE_THEMES[merged.theme] || BASE_THEMES.dark
  Object.entries(base).forEach(([k, v]) => root.style.setProperty(k, v))

  // 2. Accent color
  const accent = ACCENT_COLORS.find(a => a.id === merged.accentId)
    || ACCENT_COLORS.find(a => a.primary === merged.primary_color)
    || ACCENT_COLORS[0]
  root.style.setProperty('--primary',       accent.primary)
  root.style.setProperty('--primary-hover', accent.hover)
  root.style.setProperty('--primary-light', accent.primary + '20')
  root.style.setProperty('--primary-glow',  accent.primary + '40')

  // 3. Custom override color (from backend)
  if (merged.primary_color && merged.primary_color !== accent.primary) {
    root.style.setProperty('--primary',       merged.primary_color)
    root.style.setProperty('--primary-hover', merged.primary_color)
    root.style.setProperty('--primary-light', merged.primary_color + '20')
    root.style.setProperty('--primary-glow',  merged.primary_color + '40')
  }

  // 4. Custom background color
  if (merged.background_color) {
    root.style.setProperty('--bg', merged.background_color)
  }

  // 5. Wallpaper
  applyWallpaper(merged.background_wallpaper)

  // 6. Font size
  root.setAttribute('data-font-size', merged.font_size || 'medium')

  // 7. Theme mode
  root.setAttribute('data-theme', merged.theme || 'dark')

  // 8. Animations
  root.setAttribute('data-animations', merged.animations ? 'on' : 'off')
  if (!merged.animations) {
    root.style.setProperty('--duration',    '0ms')
    root.style.setProperty('--duration-lg', '0ms')
  } else {
    root.style.setProperty('--duration',    '200ms')
    root.style.setProperty('--duration-lg', '350ms')
  }

  // 9. Navbar position class on body
  document.body.classList.remove('navbar-top', 'navbar-bottom', 'navbar-left')
  document.body.classList.add(`navbar-${merged.navbar_position || 'bottom'}`)
}

/**
 * applyWallpaper — Sets background image on body
 */
export function applyWallpaper(url) {
  if (url) {
    document.body.style.backgroundImage   = `url(${url})`
    document.body.style.backgroundSize    = 'cover'
    document.body.style.backgroundPosition = 'center'
    document.body.style.backgroundAttachment = 'fixed'
    // Darken overlay via CSS custom property
    document.documentElement.style.setProperty(
      '--bg-overlay', 'rgba(0,0,0,0.55)'
    )
  } else {
    document.body.style.backgroundImage = 'none'
    document.documentElement.style.setProperty('--bg-overlay', 'transparent')
  }
}

/**
 * getAccentById — Returns accent object by id
 */
export function getAccentById(id) {
  return ACCENT_COLORS.find(a => a.id === id) || ACCENT_COLORS[0]
}

/**
 * getAccentByColor — Returns accent object by hex color
 */
export function getAccentByColor(hex) {
  return ACCENT_COLORS.find(a => a.primary === hex) || null
}

/**
 * getWallpaperById — Returns wallpaper object by id
 */
export function getWallpaperById(id) {
  return PRESET_WALLPAPERS.find(w => w.id === id) || PRESET_WALLPAPERS[0]
}

/**
 * serializeForAPI — Converts local theme state to the shape
 * expected by PUT /api/profile/theme
 */
export function serializeForAPI(settings) {
  return {
    theme:               settings.theme,
    primary_color:       settings.primary_color,
    accent_color:        settings.accent_color,
    background_color:    settings.background_color || null,
    background_wallpaper: settings.background_wallpaper || null,
    navbar_position:     settings.navbar_position,
    font_size:           settings.font_size,
    animations:          settings.animations,
  }
}

/**
 * deserializeFromAPI — Converts backend theme response
 * into local settings shape, normalising accent ID
 */
export function deserializeFromAPI(apiTheme) {
  if (!apiTheme) return { ...DEFAULT_THEME }

  // Try to find accent id from primary_color
  const matchedAccent = getAccentByColor(apiTheme.primary_color)

  return {
    theme:               apiTheme.theme || 'dark',
    accentId:            matchedAccent?.id || 'indigo',
    primary_color:       apiTheme.primary_color || DEFAULT_THEME.primary_color,
    background_color:    apiTheme.background_color || null,
    background_wallpaper: apiTheme.background_wallpaper || null,
    navbar_position:     apiTheme.navbar_position || 'bottom',
    font_size:           apiTheme.font_size || 'medium',
    animations:          apiTheme.animations !== false,
  }
}
