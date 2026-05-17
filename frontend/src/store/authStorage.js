const TOKEN_KEY = 'token'
const USER_KEY = 'user'

function getLocalStorage() {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function getSessionStorage() {
  if (typeof window === 'undefined') return null
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

function parseUser(raw) {
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function migrateLegacySessionAuth() {
  const local = getLocalStorage()
  const session = getSessionStorage()
  if (!local || !session) return

  const sessionToken = session.getItem(TOKEN_KEY)
  const sessionUser = session.getItem(USER_KEY)

  if (!local.getItem(TOKEN_KEY) && sessionToken) {
    local.setItem(TOKEN_KEY, sessionToken)
  }
  if (!local.getItem(USER_KEY) && sessionUser) {
    local.setItem(USER_KEY, sessionUser)
  }

  session.removeItem(TOKEN_KEY)
  session.removeItem(USER_KEY)
}

export function readAuthSnapshot() {
  migrateLegacySessionAuth()
  const storage = getLocalStorage()
  return {
    token: storage?.getItem(TOKEN_KEY) || null,
    user: parseUser(storage?.getItem(USER_KEY)),
  }
}

export function readToken() {
  return readAuthSnapshot().token
}

export function persistAuth(token, user) {
  const storage = getLocalStorage()
  if (!storage) return
  storage.setItem(TOKEN_KEY, token)
  storage.setItem(USER_KEY, JSON.stringify(user))
}

export function persistUser(user) {
  const storage = getLocalStorage()
  if (!storage) return
  storage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearAuthStorage() {
  getLocalStorage()?.removeItem(TOKEN_KEY)
  getLocalStorage()?.removeItem(USER_KEY)
  getSessionStorage()?.removeItem(TOKEN_KEY)
  getSessionStorage()?.removeItem(USER_KEY)
}
