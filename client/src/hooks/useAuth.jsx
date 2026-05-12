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

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('tz_token')
    if (!token || isTokenExpired(token)) {
      if (token) removeToken()
      setLoading(false)
      return
    }
    api.me()
      .then(u => setUser(u))
      .catch(() => removeToken())
      .finally(() => setLoading(false))
  }, [])

  async function login(email, password) {
    const data = await api.login({ email, password })
    setToken(data.token)
    setUser(data.user)
    return data.user
  }

  async function register(email, nickname, password) {
    const data = await api.register({ email, nickname, password })
    setToken(data.token)
    setUser(data.user)
    return data.user
  }

  function logout() {
    removeToken()
    setUser(null)
  }

  async function refreshUser() {
    const u = await api.me()
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
