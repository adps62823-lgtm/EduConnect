/**
 * authStore.js — Global auth state (Zustand)
 * Handles: login, logout, register, profile updates,
 *          follow/unfollow, study status
 */
import { create } from 'zustand'
import { authAPI } from '@/api'
import toast from 'react-hot-toast'

const useAuthStore = create((set, get) => ({
  // ── State ──────────────────────────────────────────────
  user:    null,
  token:   null,
  loading: false,
  error:   null,

  // ── Init — restore from localStorage on app boot ───────
  initAuth: () => {
    try {
      const token = localStorage.getItem('token')
      const user  = localStorage.getItem('user')
      if (token && user) {
        set({ token, user: JSON.parse(user) })
        // Silently refresh user data in background
        get().refreshMe()
      }
    } catch {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    }
  },

  // ── Register ───────────────────────────────────────────
  register: async (data) => {
    set({ loading: true, error: null })
    try {
      const res = await authAPI.register(data)
      const { access_token, user } = res.data
      localStorage.setItem('token', access_token)
      localStorage.setItem('user',  JSON.stringify(user))
      set({ token: access_token, user, loading: false })
      toast.success(`Welcome to EduConnect, ${user.name}! 🎉`)
      return { success: true }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Registration failed.'
      set({ loading: false, error: msg })
      toast.error(msg)
      return { success: false, error: msg }
    }
  },

  // ── Login ──────────────────────────────────────────────
  login: async (identifier, password) => {
    set({ loading: true, error: null })
    try {
      const res = await authAPI.login(identifier, password)
      const { access_token, user } = res.data
      localStorage.setItem('token', access_token)
      localStorage.setItem('user',  JSON.stringify(user))
      set({ token: access_token, user, loading: false })
      toast.success(`Welcome back, ${user.name}! 👋`)
      return { success: true }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Invalid credentials.'
      set({ loading: false, error: msg })
      toast.error(msg)
      return { success: false, error: msg }
    }
  },

  // ── Logout ─────────────────────────────────────────────
  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    set({ user: null, token: null })
    toast('Logged out. See you soon! 👋', { icon: '🚪' })
    window.location.href = '/login'
  },

  // ── Refresh current user ───────────────────────────────
  refreshMe: async () => {
    try {
      const res = await authAPI.me()
      const user = res.data
      localStorage.setItem('user', JSON.stringify(user))
      set({ user })
    } catch {
      // Token expired
      get().logout()
    }
  },

  // ── Update profile ─────────────────────────────────────
  updateMe: async (data) => {
    set({ loading: true })
    try {
      const res = await authAPI.updateMe(data)
      const user = res.data
      localStorage.setItem('user', JSON.stringify(user))
      set({ user, loading: false })
      toast.success('Profile updated!')
      return { success: true }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Update failed.'
      set({ loading: false })
      toast.error(msg)
      return { success: false, error: msg }
    }
  },

  // ── Avatar upload ──────────────────────────────────────
  uploadAvatar: async (file) => {
    try {
      const res = await authAPI.uploadAvatar(file)
      const { avatar_url } = res.data
      set(state => ({
        user: { ...state.user, avatar_url }
      }))
      localStorage.setItem('user', JSON.stringify(get().user))
      toast.success('Avatar updated!')
      return avatar_url
    } catch {
      toast.error('Failed to upload avatar.')
      return null
    }
  },

  // ── Cover upload ───────────────────────────────────────
  uploadCover: async (file) => {
    try {
      const res = await authAPI.uploadCover(file)
      const { cover_url } = res.data
      set(state => ({
        user: { ...state.user, cover_url }
      }))
      localStorage.setItem('user', JSON.stringify(get().user))
      toast.success('Cover photo updated!')
      return cover_url
    } catch {
      toast.error('Failed to upload cover.')
      return null
    }
  },

  // ── Change password ────────────────────────────────────
  changePassword: async (data) => {
    try {
      await authAPI.changePassword(data)
      toast.success('Password changed successfully!')
      return { success: true }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Password change failed.'
      toast.error(msg)
      return { success: false, error: msg }
    }
  },

  // ── Study status ───────────────────────────────────────
  updateStatus: async (status) => {
    try {
      await authAPI.updateStatus(status)
      set(state => ({
        user: { ...state.user, study_status: status }
      }))
      localStorage.setItem('user', JSON.stringify(get().user))
    } catch {
      // Silent — status is non-critical
    }
  },

  // ── Follow / Unfollow ──────────────────────────────────
  follow: async (userId) => {
    try {
      await authAPI.follow(userId)
      // Optimistically update following list in local user
      set(state => ({
        user: {
          ...state.user,
          following_count: (state.user.following_count || 0) + 1,
        }
      }))
      return { success: true }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not follow.')
      return { success: false }
    }
  },

  unfollow: async (userId) => {
    try {
      await authAPI.unfollow(userId)
      set(state => ({
        user: {
          ...state.user,
          following_count: Math.max(0, (state.user.following_count || 1) - 1),
        }
      }))
      return { success: true }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not unfollow.')
      return { success: false }
    }
  },

  // ── Selectors ──────────────────────────────────────────
  isAuthenticated: () => !!get().token,
  isMentor:  () => get().user?.role === 'mentor',
  isAdmin:   () => get().user?.role === 'admin',
}))

export default useAuthStore
