/**
 * authStore.js — Global auth state (Zustand)
 * sessionStorage = login required on every new browser session
 * Exports both default AND named { useAuthStore } for compatibility
 */
import { create } from 'zustand'
import { authAPI } from '@/api'

const useAuthStore = create((set, get) => ({
  user:    null,
  token:   null,
  loading: false,
  error:   null,

  // ── Restore session on app boot ──────────────────────
  initAuth: () => {
    try {
      const token = sessionStorage.getItem('token')
      const user  = sessionStorage.getItem('user')
      if (token && user) {
        set({ token, user: JSON.parse(user) })
        get().refreshMe()
      }
    } catch {
      sessionStorage.removeItem('token')
      sessionStorage.removeItem('user')
    }
  },

  // ── Register ─────────────────────────────────────────
  register: async (data) => {
    set({ loading: true, error: null })
    try {
      const res = await authAPI.register(data)
      const { access_token, user } = res.data
      sessionStorage.setItem('token', access_token)
      sessionStorage.setItem('user', JSON.stringify(user))
      set({ token: access_token, user, loading: false })
      return { success: true }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Registration failed.'
      set({ loading: false, error: msg })
      return { success: false, error: msg }
    }
  },

  // ── Login ─────────────────────────────────────────────
  login: async (identifier, password) => {
    set({ loading: true, error: null })
    try {
      const res = await authAPI.login(identifier, password)
      const { access_token, user } = res.data
      sessionStorage.setItem('token', access_token)
      sessionStorage.setItem('user', JSON.stringify(user))
      set({ token: access_token, user, loading: false })
      return { success: true }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Invalid credentials.'
      set({ loading: false, error: msg })
      return { success: false, error: msg }
    }
  },

  // ── Logout ────────────────────────────────────────────
  logout: () => {
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('user')
    set({ user: null, token: null })
    window.location.href = '/login'
  },

  // ── Refresh from server ───────────────────────────────
  refreshMe: async () => {
    try {
      const res  = await authAPI.me()
      const user = res.data
      sessionStorage.setItem('user', JSON.stringify(user))
      set({ user })
    } catch {
      get().logout()
    }
  },

  // ── Patch user locally (used by Profile, Settings etc) ─
  // Called as updateUser({ avatar_url: '...' }) — merges into user
  updateUser: (updates) => {
    set(state => {
      if (!state.user) return {}
      const user = { ...state.user, ...updates }
      sessionStorage.setItem('user', JSON.stringify(user))
      return { user }
    })
  },

  // ── Full profile update via API ────────────────────────
  updateMe: async (data) => {
    set({ loading: true })
    try {
      const res  = await authAPI.updateMe(data)
      const user = res.data
      sessionStorage.setItem('user', JSON.stringify(user))
      set({ user, loading: false })
      return { success: true }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Update failed.'
      set({ loading: false })
      return { success: false, error: msg }
    }
  },

  // ── Selectors ─────────────────────────────────────────
  isAuthenticated: () => !!get().token,
}))

// Named export for pages that use: import { useAuthStore } from '@/store/authStore'
export { useAuthStore }

// Default export for pages that use: import useAuthStore from '@/store/authStore'
export default useAuthStore
