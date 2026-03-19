import { create } from 'zustand'
import { authAPI } from '@/api'

const useAuthStore = create((set, get) => ({
  user:    null,
  token:   null,
  loading: false,
  error:   null,

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

  register: async (data) => {
    set({ loading: true, error: null })
    try {
      const { access_token, user } = await authAPI.register(data)
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

  login: async (identifier, password) => {
    set({ loading: true, error: null })
    try {
      const { access_token, user } = await authAPI.login(identifier, password)
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

  logout: () => {
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('user')
    set({ user: null, token: null })
    window.location.href = '/login'
  },

  refreshMe: async () => {
    try {
      const user = await authAPI.me()
      sessionStorage.setItem('user', JSON.stringify(user))
      set({ user })
    } catch {
      get().logout()
    }
  },

  updateUser: (updates) => {
    set(state => {
      if (!state.user) return {}
      const user = { ...state.user, ...updates }
      sessionStorage.setItem('user', JSON.stringify(user))
      return { user }
    })
  },

  updateMe: async (data) => {
    set({ loading: true })
    try {
      const user = await authAPI.updateMe(data)
      sessionStorage.setItem('user', JSON.stringify(user))
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
