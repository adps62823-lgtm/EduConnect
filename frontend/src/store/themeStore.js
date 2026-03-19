/**
 * themeStore.js — Global theme state (Zustand)
 * Handles: dark/light, accent color, wallpaper,
 *          font size, navbar position, animations
 * Syncs with backend via PUT /api/profile/theme
 */
import { create } from 'zustand'
import { profileAPI } from '@/api'
import {
  DEFAULT_THEME,
  applyThemeToDOM,
  serializeForAPI,
  deserializeFromAPI,
  ACCENT_COLORS,
} from '@/styles/themes'

const STORAGE_KEY = 'educonnect_theme'

const useThemeStore = create((set, get) => ({
  // ── State ──────────────────────────────────────────────
  ...DEFAULT_THEME,
  syncing: false,

  // ── Boot — apply theme on mount ────────────────────────
  applyTheme: () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        set(parsed)
        applyThemeToDOM(parsed)
      } else {
        applyThemeToDOM(DEFAULT_THEME)
      }
    } catch {
      applyThemeToDOM(DEFAULT_THEME)
    }
  },

  // ── Load from backend (called on Settings page open) ──
  loadFromBackend: async () => {
    try {
      const raw = await profileAPI.getTheme()
      const settings = deserializeFromAPI(raw)
      set(settings)
      applyThemeToDOM(settings)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch {
      // Use local settings
    }
  },

  // ── Save to backend + localStorage ────────────────────
  _persist: async (newSettings) => {
    set(newSettings)
    applyThemeToDOM(newSettings)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings))
    try {
      set({ syncing: true })
      await profileAPI.updateTheme(serializeForAPI(newSettings))
    } catch {
      // Fail silently — local state is already updated
    } finally {
      set({ syncing: false })
    }
  },

  // ── Toggle dark / light ────────────────────────────────
  toggleTheme: () => {
    const current = get().theme
    const next = current === 'dark' ? 'light' : 'dark'
    get()._persist({ ...get(), theme: next })
  },

  setTheme: (theme) => {
    get()._persist({ ...get(), theme })
  },

  // ── Accent color ───────────────────────────────────────
  setAccent: (accentId) => {
    const accent = ACCENT_COLORS.find(a => a.id === accentId)
    if (!accent) return
    get()._persist({
      ...get(),
      accentId,
      primary_color: accent.primary,
    })
  },

  // ── Custom hex color ───────────────────────────────────
  setCustomColor: (hex) => {
    get()._persist({
      ...get(),
      accentId: 'custom',
      primary_color: hex,
    })
  },

  // ── Wallpaper ──────────────────────────────────────────
  setWallpaper: (url) => {
    get()._persist({ ...get(), background_wallpaper: url })
  },

  clearWallpaper: () => {
    get()._persist({ ...get(), background_wallpaper: null })
  },

  // ── Navbar position ────────────────────────────────────
  setNavbarPosition: (position) => {
    get()._persist({ ...get(), navbar_position: position })
  },

  // ── Font size ──────────────────────────────────────────
  setFontSize: (size) => {
    get()._persist({ ...get(), font_size: size })
  },

  // ── Animations ────────────────────────────────────────
  setAnimations: (enabled) => {
    get()._persist({ ...get(), animations: enabled })
  },

  // ── Reset to defaults ──────────────────────────────────
  resetTheme: () => {
    get()._persist({ ...DEFAULT_THEME })
  },

  // ── Computed helpers ───────────────────────────────────
  isDark: () => get().theme !== 'light',
}))

export default useThemeStore
