import { createContext, useContext, useState, useEffect } from 'react'
import { api, getToken, setToken, removeToken, cache } from '../utils/api'

const AuthContext = createContext(null)

function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return !payload.exp || payload.exp * 1000 < Date.now()
  } catch {
    return true
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const token = await getToken()
      if (!token || isTokenExpired(token)) {
        if (token) await removeToken()
        setLoading(false)
        return
      }
      // 1) 캐시된 user 즉시 표시 (디스크 → 메모리, 거의 0ms)
      const cached = await cache.get('user')
      if (cached) setUser(cached)
      else {
        // 캐시 없으면 JWT 페이로드라도 사용
        try {
          const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
          setUser(payload)
        } catch {}
      }
      setLoading(false)

      // 2) 백그라운드 동기화 — 콜드스타트 실패는 무시, 401만 세션 종료
      try {
        const u = await api.me()
        setUser(u)
        cache.set('user', u)
      } catch (e) {
        if (e?.status === 401) {
          await removeToken()
          await cache.clear()
          setUser(null)
        }
      }
    })()
  }, [])

  async function login(email, password) {
    const data = await api.login({ email, password })
    await setToken(data.token)
    setUser(data.user)
    cache.set('user', data.user)
    return data.user
  }

  async function register(email, nickname, password) {
    const data = await api.register({ email, nickname, password })
    await setToken(data.token)
    setUser(data.user)
    cache.set('user', data.user)
    return data.user
  }

  async function logout() {
    await removeToken()
    await cache.clear()
    setUser(null)
  }

  async function refreshUser() {
    const u = await api.me()
    setUser(u)
    cache.set('user', u)
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
