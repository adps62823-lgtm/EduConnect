import axios from 'axios'
import toast from 'react-hot-toast'

// ── Axios instance ────────────────────────────────────────
const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// ── Request interceptor — attach JWT ─────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ── Response interceptor — handle errors globally ────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const detail = error.response?.data?.detail

    if (status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
    } else if (status === 403) {
      toast.error(detail || 'Access denied.')
    } else if (status === 422) {
      // Validation errors — show first message
      const errors = error.response?.data?.detail
      if (Array.isArray(errors)) {
        toast.error(errors[0]?.msg || 'Validation error.')
      }
    } else if (status >= 500) {
      toast.error('Server error. Please try again.')
    }

    return Promise.reject(error)
  }
)

export default api

// ══════════════════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════════════════
export const authAPI = {
  register: (data) => api.post('/auth/register', data),

  login: (identifier, password) => {
    const form = new FormData()
    form.append('username', identifier)
    form.append('password', password)
    return api.post('/auth/login', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  me:             ()     => api.get('/auth/me'),
  updateMe:       (data) => api.put('/auth/me', data),
  changePassword: (data) => api.put('/auth/change-password', data),
  uploadAvatar:   (file) => {
    const fd = new FormData(); fd.append('file', file)
    return api.post('/auth/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  uploadCover: (file) => {
    const fd = new FormData(); fd.append('file', file)
    return api.post('/auth/cover', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  updateStatus:       (status)  => api.put('/auth/status', { status }),
  follow:             (userId)  => api.post(`/auth/follow/${userId}`),
  unfollow:           (userId)  => api.delete(`/auth/follow/${userId}`),
  getUser:            (id)      => api.get(`/auth/users/${id}`),
  searchUsers:        (params)  => api.get('/auth/search', { params }),
  getFollowers:       (userId)  => api.get(`/auth/users/${userId}/followers`),
  getFollowing:       (userId)  => api.get(`/auth/users/${userId}/following`),
  getNotifications:   ()        => api.get('/auth/notifications'),
  markAllRead:        ()        => api.put('/auth/notifications/read-all'),
}

// ══════════════════════════════════════════════════════════
// FEED
// ══════════════════════════════════════════════════════════
export const feedAPI = {
  createPost: (formData) => api.post('/feed/posts', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getPosts:      (params) => api.get('/feed/posts', { params }),
  getPost:       (id)     => api.get(`/feed/posts/${id}`),
  updatePost:    (id, d)  => api.put(`/feed/posts/${id}`, d),
  deletePost:    (id)     => api.delete(`/feed/posts/${id}`),
  likePost:      (id)     => api.post(`/feed/posts/${id}/like`),
  unlikePost:    (id)     => api.delete(`/feed/posts/${id}/like`),
  getComments:   (id)     => api.get(`/feed/posts/${id}/comments`),
  addComment:    (id, d)  => api.post(`/feed/posts/${id}/comments`, d),
  deleteComment: (postId, commentId) => api.delete(`/feed/posts/${postId}/comments/${commentId}`),

  // Stories
  createStory: (formData) => api.post('/feed/stories', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getStories:   ()   => api.get('/feed/stories'),
  viewStory:    (id) => api.post(`/feed/stories/${id}/view`),
  deleteStory:  (id) => api.delete(`/feed/stories/${id}`),

  // Journey
  createJourney: (d)      => api.post('/feed/journey', d),
  getJourney:    (userId) => api.get(`/feed/journey/${userId}`),

  // Explore
  explore: (params) => api.get('/feed/explore', { params }),
  getTags: ()       => api.get('/feed/tags'),
}

// ══════════════════════════════════════════════════════════
// HELP FORUM
// ══════════════════════════════════════════════════════════
export const helpAPI = {
  createQuestion:  (d)      => api.post('/help/questions', d),
  getQuestions:    (params) => api.get('/help/questions', { params }),
  getQuestion:     (id)     => api.get(`/help/questions/${id}`),
  updateQuestion:  (id, d)  => api.put(`/help/questions/${id}`, d),
  deleteQuestion:  (id)     => api.delete(`/help/questions/${id}`),
  postAnswer:      (qId, d) => api.post(`/help/questions/${qId}/answers`, d),
  updateAnswer:    (id, d)  => api.put(`/help/answers/${id}`, d),
  deleteAnswer:    (id)     => api.delete(`/help/answers/${id}`),
  voteAnswer:      (id, dir)=> api.post(`/help/answers/${id}/vote`, { direction: dir }),
  acceptAnswer:    (id)     => api.post(`/help/answers/${id}/accept`),
  getSeniorMatches:(qId)    => api.get(`/help/questions/${qId}/matches`),
  getTags:         (q)      => api.get('/help/tags', { params: { q } }),
  getUserStats:    (userId) => api.get(`/help/users/${userId}/stats`),
}

// ══════════════════════════════════════════════════════════
// CHAT
// ══════════════════════════════════════════════════════════
export const chatAPI = {
  createDM:           (userId)  => api.post('/chat/conversations', { user_id: userId }),
  createGroup:        (d)       => api.post('/chat/conversations/group', d),
  getConversations:   ()        => api.get('/chat/conversations'),
  getConversation:    (id)      => api.get(`/chat/conversations/${id}`),
  deleteConversation: (id)      => api.delete(`/chat/conversations/${id}`),
  getMessages:        (id, p)   => api.get(`/chat/conversations/${id}/messages`, { params: p }),
  sendMessage: (chatId, formData) => api.post(`/chat/conversations/${chatId}/messages`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  deleteMessage:  (chatId, msgId) => api.delete(`/chat/conversations/${chatId}/messages/${msgId}`),
  markRead:       (chatId)        => api.put(`/chat/conversations/${chatId}/read`),
  addMember:      (chatId, uid)   => api.post(`/chat/conversations/${chatId}/members`, { user_id: uid }),
  removeMember:   (chatId, uid)   => api.delete(`/chat/conversations/${chatId}/members/${uid}`),
  getUnreadCount: ()              => api.get('/chat/unread-count'),
}

// ══════════════════════════════════════════════════════════
// MENTOR
// ══════════════════════════════════════════════════════════
export const mentorAPI = {
  createProfile:     (d)   => api.post('/mentor/profiles', d),
  listMentors:       (p)   => api.get('/mentor/profiles', { params: p }),
  getMentor:         (id)  => api.get(`/mentor/profiles/${id}`),
  getMentorByUser:   (uid) => api.get(`/mentor/by-user/${uid}`),
  updateProfile:     (id, d) => api.put(`/mentor/profiles/${id}`, d),
  sendRequest:       (d)   => api.post('/mentor/request', d),
  getSentRequests:   ()    => api.get('/mentor/requests/sent'),
  getReceivedRequests: ()  => api.get('/mentor/requests/received'),
  respondToRequest:  (id, action) => api.put(`/mentor/requests/${id}/respond`, { action }),
  addReview:         (id, d) => api.post(`/mentor/profiles/${id}/review`, d),
  getReviews:        (id)  => api.get(`/mentor/profiles/${id}/reviews`),
  recommend:         ()    => api.get('/mentor/recommend'),
}

// ══════════════════════════════════════════════════════════
// STUDY ROOMS
// ══════════════════════════════════════════════════════════
export const roomAPI = {
  createRoom:     (d)   => api.post('/rooms', d),
  listRooms:      (p)   => api.get('/rooms', { params: p }),
  getMyActive:    ()    => api.get('/rooms/my/active'),
  getRoom:        (id)  => api.get(`/rooms/${id}`),
  updateRoom:     (id, d) => api.put(`/rooms/${id}`, d),
  deleteRoom:     (id)  => api.delete(`/rooms/${id}`),
  joinRoom:       (id, password) => api.post(`/rooms/${id}/join`, { password }),
  leaveRoom:      (id)  => api.post(`/rooms/${id}/leave`),
  getMembers:     (id)  => api.get(`/rooms/${id}/members`),
  startPomodoro:  (id, mins) => api.post(`/rooms/${id}/pomodoro/start`, { duration_minutes: mins }),
  stopPomodoro:   (id)  => api.post(`/rooms/${id}/pomodoro/stop`),
  kickMember:     (roomId, userId) => api.post(`/rooms/${roomId}/kick/${userId}`),
  getHistory:     ()    => api.get('/rooms/history/me'),
}

// ══════════════════════════════════════════════════════════
// RESOURCES
// ══════════════════════════════════════════════════════════
export const resourceAPI = {
  upload: (formData) => api.post('/resources', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  list:         (p)   => api.get('/resources', { params: p }),
  get:          (id)  => api.get(`/resources/${id}`),
  update:       (id, d) => api.put(`/resources/${id}`, d),
  delete:       (id)  => api.delete(`/resources/${id}`),
  download:     (id)  => api.post(`/resources/${id}/download`),
  like:         (id)  => api.post(`/resources/${id}/like`),
  unlike:       (id)  => api.delete(`/resources/${id}/like`),
  myUploads:    ()    => api.get('/resources/my/uploads'),
  myLiked:      ()    => api.get('/resources/my/liked'),
  stats:        ()    => api.get('/resources/stats/overview'),
}

// ══════════════════════════════════════════════════════════
// PROFILE
// ══════════════════════════════════════════════════════════
export const profileAPI = {
  getProfile:      (username) => api.get(`/profile/${username}`),
  getProfilePosts: (username, p) => api.get(`/profile/${username}/posts`, { params: p }),
  getUserPosts:    (username, p) => api.get(`/profile/${username}/posts`, { params: p }),  // alias
  getFollowers:    (username) => api.get(`/profile/${username}/followers`),
  getFollowing:    (username) => api.get(`/profile/${username}/following`),
  getJourney:      (username) => api.get(`/profile/${username}/journey`),
  getBadges:       (username) => api.get(`/gamification/badges/${username}`),

  // Exam countdowns  (match backend: POST /profile/countdowns/me)
  addCountdown:    (d)   => api.post('/profile/countdowns/me', d),
  getCountdowns:   ()    => api.get('/profile/countdowns/me'),
  deleteCountdown: (id)  => api.delete(`/profile/countdowns/${id}`),

  // Theme
  getTheme:        ()    => api.get('/profile/theme/me'),
  updateTheme:     (d)   => api.put('/profile/theme/me', d),
}

// ══════════════════════════════════════════════════════════
// COLLEGES
// ══════════════════════════════════════════════════════════
export const collegeAPI = {
  create:       (d)    => api.post('/colleges', d),
  list:         (p)    => api.get('/colleges', { params: p }),
  topRated:     ()     => api.get('/colleges/top/rated'),
  get:          (id)   => api.get(`/colleges/${id}`),
  update:       (id,d) => api.put(`/colleges/${id}`, d),
  addReview:    (id,d) => api.post(`/colleges/${id}/reviews`, d),
  updateReview: (cId, rId, d) => api.put(`/colleges/${cId}/reviews/${rId}`, d),
  deleteReview: (cId, rId)    => api.delete(`/colleges/${cId}/reviews/${rId}`),
  getReviews:   (id, p) => api.get(`/colleges/${id}/reviews`, { params: p }),
  stats:        ()     => api.get('/colleges/stats/overview'),
}

// ══════════════════════════════════════════════════════════
// GAMIFICATION
// ══════════════════════════════════════════════════════════
export const gameAPI = {
  getLeaderboard: (p)   => api.get('/gamification/leaderboard', { params: p }),
  getMyStreak:    ()    => api.get('/gamification/streaks/me'),
  checkIn:        ()    => api.post('/gamification/streaks/checkin'),
  listWars:       (p)   => api.get('/gamification/streak-wars', { params: p }),
  createWar:      (d)   => api.post('/gamification/streak-wars', d),
  getWar:         (id)  => api.get(`/gamification/streak-wars/${id}`),
  joinWar:        (id, team) => api.post(`/gamification/streak-wars/${id}/join/${team}`),
  listBadges:     ()    => api.get('/gamification/badges'),
  myBadges:       ()    => api.get('/gamification/badges/me'),
  checkBadges:    ()    => api.post('/gamification/badges/check'),
  schoolStats:    (s)   => api.get('/gamification/stats/school', { params: { school: s } }),
}

// ══════════════════════════════════════════════════════════
// WEBSOCKET helper
// ══════════════════════════════════════════════════════════
export const createWebSocket = (userId) => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = window.location.host
  return new WebSocket(`${protocol}//${host}/ws/${userId}`)
}
