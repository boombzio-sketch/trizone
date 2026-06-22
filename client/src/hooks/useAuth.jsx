import { createContext, useContext, useState, useEffect } from 'react'
import { api, setToken, removeToken } from '../utils/api'

const AuthContext = createContext(null)

function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return !payload.exp || payload.exp * 1000 < Date.now()
  } catch {
    return true
  }
}

function getCachedUser() {
  try {
    const raw = localStorage.getItem('tz_user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function setCachedUser(user) {
  if (user) localStorage.setItem('tz_user', JSON.stringify(user))
  else localStorage.removeItem('tz_user')
}

export function AuthProvider({ children }) {
  const token = localStorage.getItem('tz_token')
  const cached = (!token || isTokenExpired(token)) ? null : getCachedUser()

  const [user, setUser] = useState(cached)
  // loading=false immediately if we have cached user; true if we need to fetch
  const [loading, setLoading] = useState(!cached)

  useEffect(() => {
    const token = localStorage.getItem('tz_token')
    if (!token || isTokenExpired(token)) {
      if (token) removeToken()
      setCachedUser(null)
      setUser(null)
      setLoading(false)
      return
    }
    // 캐시된 유저가 있으면 백그라운드에서 조용히 갱신
    api.me()
      .then(u => { setUser(u); setCachedUser(u) })
      .catch(() => { removeToken(); setCachedUser(null); setUser(null) })
      .finally(() => setLoading(false))
  }, [])

  // 권한이 바뀌면 재로그인 없이도 반영되도록: 탭 포커스 시 + 2분 주기로 /me 조용히 호출
  useEffect(() => {
    if (!user) return
    function refresh() {
      api.me()
        .then(u => { setUser(u); setCachedUser(u) })
        .catch(() => {})
    }
    window.addEventListener('focus', refresh)
    const interval = setInterval(refresh, 2 * 60 * 1000)
    return () => {
      window.removeEventListener('focus', refresh)
      clearInterval(interval)
    }
  }, [user?.id])

  async function login(email, password) {
    const data = await api.login({ email, password })
    setToken(data.token)
    setCachedUser(data.user)
    setUser(data.user)
    return data.user
  }

  async function register(email, nickname, password, termsAgreed) {
    const data = await api.register({ email, nickname, password, termsAgreed })
    setToken(data.token)
    setCachedUser(data.user)
    setUser(data.user)
    return data.user
  }

  function logout() {
    removeToken()
    setCachedUser(null)
    setUser(null)
  }

  async function refreshUser() {
    const u = await api.me()
    setCachedUser(u)
    setUser(u)
    return u
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
