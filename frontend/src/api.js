/**
 * api.js — EduConnect API client (FINAL)
 * Auto-unwraps axios .data so every caller gets the data directly
 */
import axios from 'axios'

const api = axios.create({ baseURL: '/api', timeout: 30000 })

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res.data,   // ← auto-unwrap: callers get data directly, not res.data
  (err) => {
    if (err.response?.status === 401) {
      sessionStorage.removeItem('token')
      sessionStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (identifier, password) =>
    api.post('/auth/login', { identifier, password }),
  me:               ()       => api.get('/auth/me'),
  updateMe:         (data)   => api.put('/auth/me', data),
  follow:           (userId) => api.post(`/auth/follow/${userId}`),
  searchUsers:      (params) => api.get('/auth/search', { params }),
  getNotifications: ()       => api.get('/auth/notifications'),
  markAllRead:      ()       => api.post('/auth/notifications/read'),
  uploadAvatar: (file) => {
    const fd = new FormData(); fd.append('avatar', file)
    return api.post('/profile/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  uploadCover: (file) => {
    const fd = new FormData(); fd.append('cover', file)
    return api.post('/profile/cover', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
}

export const feedAPI = {
  createPost: (formData) => api.post('/feed/posts', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getPosts:      (params)   => api.get('/feed/posts', { params }),
  deletePost:    (id)       => api.delete(`/feed/posts/${id}`),
  likePost:      (id)       => api.post(`/feed/posts/${id}/like`),
  getComments:   (id)       => api.get(`/feed/posts/${id}/comments`),
  addComment:    (id, data) => api.post(`/feed/posts/${id}/comments`, data),
  deleteComment: (postId, commentId) => api.delete(`/feed/posts/${postId}/comments/${commentId}`),
  createStory: (formData) => api.post('/feed/stories', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getStories:    ()       => api.get('/feed/stories'),
  viewStory:     (id)     => api.post(`/feed/stories/${id}/view`),
  createJourney: (data)   => api.post('/feed/journey', data),
  getJourney:    (params) => api.get('/feed/journey', { params }),
  explore:       (params) => api.get('/feed/explore', { params }),
  getTags:       ()       => api.get('/feed/tags'),
}

export const helpAPI = {
  createQuestion: (data)      => api.post('/help/questions', data),
  getQuestions:   (params)    => api.get('/help/questions', { params }),
  getQuestion:    (id)        => api.get(`/help/questions/${id}`),
  deleteQuestion: (id)        => api.delete(`/help/questions/${id}`),
  postAnswer:     (qId, data) => api.post(`/help/questions/${qId}/answers`, data),
  voteAnswer:     (qId, aId, value) =>
    api.post(`/help/questions/${qId}/answers/${aId}/vote`, null, { params: { value } }),
  acceptAnswer: (qId, aId) => api.post(`/help/questions/${qId}/answers/${aId}/accept`),
  seniorMatch:  (qId)      => api.get(`/help/questions/${qId}/senior-match`),
}

export const chatAPI = {
  getConversations: ()       => api.get('/chat/conversations'),
  getConversation:  (id)     => api.get(`/chat/conversations/${id}`),
  createDM:         (userId) => api.post(`/chat/dm/${userId}`),
  createGroup:      (data)   => api.post('/chat/group', data),
  addMember:    (chatId, userId) => api.post(`/chat/conversations/${chatId}/members/${userId}`),
  removeMember: (chatId, userId) => api.delete(`/chat/conversations/${chatId}/members/${userId}`),
  getMessages:  (chatId, params) => api.get(`/chat/conversations/${chatId}/messages`, { params }),
  sendMessage:  (chatId, formData) => api.post(`/chat/conversations/${chatId}/messages`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteMessage:  (chatId, msgId) => api.delete(`/chat/conversations/${chatId}/messages/${msgId}`),
  markRead:       (chatId)        => api.post(`/chat/conversations/${chatId}/read`),
  getUnreadCount: ()              => api.get('/chat/unread-count'),
}

export const mentorAPI = {
  listMentors:   (params)   => api.get('/mentor/profiles', { params }),
  createProfile: (data)     => api.post('/mentor/profiles', data),
  getMyProfile:  ()         => api.get('/mentor/profiles/me'),
  getMentor:     (id)       => api.get(`/mentor/profiles/${id}`),
  connect:           (mentorId) => api.post(`/mentor/connect/${mentorId}`),
  respondConnection: (connId, accept) =>
    api.post(`/mentor/connect/${connId}/respond`, null, { params: { accept } }),
  getMyConnections: ()               => api.get('/mentor/my-connections'),
  addReview:        (mentorId, data) => api.post(`/mentor/profiles/${mentorId}/reviews`, data),
}

export const roomAPI = {
  getRooms:      (params)         => api.get('/rooms', { params }),
  getMyRooms:    ()               => api.get('/rooms/my'),
  createRoom:    (data)           => api.post('/rooms', data),
  getRoom:       (id)             => api.get(`/rooms/${id}`),
  joinRoom:      (id, data)       => api.post(`/rooms/${id}/join`, data),
  leaveRoom:     (id)             => api.post(`/rooms/${id}/leave`),
  kickMember:    (roomId, userId) => api.post(`/rooms/${roomId}/kick/${userId}`),
  transferHost:  (roomId, userId) => api.post(`/rooms/${roomId}/transfer/${userId}`),
  startPomodoro: (id)             => api.post(`/rooms/${id}/pomodoro/start`),
  stopPomodoro:  (id)             => api.post(`/rooms/${id}/pomodoro/stop`),
}

export const resourceAPI = {
  list: (params) => api.get('/resources', { params }),
  upload: (formData) => api.post('/resources', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  get:      (id) => api.get(`/resources/${id}`),
  delete:   (id) => api.delete(`/resources/${id}`),
  like:     (id) => api.post(`/resources/${id}/like`),
  download: (id) => api.post(`/resources/${id}/download`),
}

export const profileAPI = {
  getProfile:      (username)         => api.get(`/profile/${username}`),
  getUserPosts:    (username, params) => api.get(`/profile/${username}/posts`, { params }),
  getFollowers:    (username)         => api.get(`/profile/${username}/followers`),
  getFollowing:    (username)         => api.get(`/profile/${username}/following`),
  addCountdown:    (data) => api.post('/profile/countdowns/me', data),
  getCountdowns:   ()     => api.get('/profile/countdowns/me'),
  deleteCountdown: (id)   => api.delete(`/profile/countdowns/${id}`),
  getTheme:        ()     => api.get('/profile/theme/me'),
  updateTheme:     (data) => api.put('/profile/theme/me', data),
}

export const collegeAPI = {
  list:         (params)         => api.get('/colleges', { params }),
  create:       (data)           => api.post('/colleges', data),
  get:          (id)             => api.get(`/colleges/${id}`),
  addReview:    (id, data)       => api.post(`/colleges/${id}/reviews`, data),
  updateReview: (cId, rId, data) => api.put(`/colleges/${cId}/reviews/${rId}`, data),
  deleteReview: (cId, rId)       => api.delete(`/colleges/${cId}/reviews/${rId}`),
}

export const gameAPI = {
  getLeaderboard: (params) => api.get('/gamification/leaderboard', { params }),
  getMyStreak:    ()       => api.get('/gamification/streak'),
  checkIn:        ()       => api.post('/gamification/checkin'),
  checkBadges:    ()       => api.post('/gamification/badges/check'),
  getBadges:      (userId) => api.get(`/gamification/badges/${userId}`),
  streakWars:     ()       => api.get('/gamification/streak-wars'),
  getMyStats:     ()       => api.get('/gamification/stats/me'),
}

export const createWebSocket = (userId) => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return new WebSocket(`${protocol}//${window.location.host}/ws/${userId}`)
}
