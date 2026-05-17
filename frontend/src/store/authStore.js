import { create } from 'zustand'
import { authAPI } from '@/api'
import {
  clearAuthStorage,
  persistAuth,
  persistUser,
  readAuthSnapshot,
} from '@/store/authStorage'

const initialAuth = readAuthSnapshot()

const useAuthStore = create((set, get) => ({
  user:    initialAuth.user,
  token:   initialAuth.token,
  loading: false,
  error:   null,
  hydrated: true,

  initAuth: () => {
    const { token, user } = readAuthSnapshot()
    if (token) {
      set({ token, user, hydrated: true })
      get().refreshMe()
      return
    }
    clearAuthStorage()
    set({ user: null, token: null, hydrated: true })
  },

  register: async (data) => {
    set({ loading: true, error: null })
    try {
      const { access_token, user } = await authAPI.register(data)
      persistAuth(access_token, user)
      set({ token: access_token, user, loading: false })
      return { success: true }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Registration failed.'
      set({ loading: false, error: msg })
      return { success: false, error: msg }
    }
  },

  login: async (identifier, password) => {
    set({ loading: true, error: null })
    try {
      const { access_token, user } = await authAPI.login(identifier, password)
      persistAuth(access_token, user)
      set({ token: access_token, user, loading: false })
      return { success: true }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Invalid credentials.'
      set({ loading: false, error: msg })
      return { success: false, error: msg }
    }
  },

  logout: () => {
    clearAuthStorage()
    set({ user: null, token: null, error: null })
    window.location.href = '/login'
  },

  refreshMe: async () => {
    try {
      const user = await authAPI.me()
      persistUser(user)
      set({ user })
    } catch {
      get().logout()
    }
  },

  updateUser: (updates) => {
    set(state => {
      if (!state.user) return {}
      const user = { ...state.user, ...updates }
      persistUser(user)
      return { user }
    })
  },

  updateMe: async (data) => {
    set({ loading: true })
    try {
      const user = await authAPI.updateMe(data)
      persistUser(user)
      set({ user, loading: false })
      return { success: true }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Update failed.'
      set({ loading: false })
      return { success: false, error: msg }
    }
  },

  isAuthenticated: () => !!get().token,
}))

export { useAuthStore }
export default useAuthStore
