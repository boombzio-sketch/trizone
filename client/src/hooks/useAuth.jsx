import { createContext, useContext, useState, useEffect } from 'react'
import { api, setToken, removeToken } from '../utils/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('tz_token')
    if (token) {
      api.me()
        .then(u => setUser(u))
        .catch(() => removeToken())
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  async function login(nickname, password) {
    const data = await api.login({ nickname, password })
    setToken(data.token)
    setUser(data.user)
    return data.user
  }

  async function register(nickname, password) {
    const data = await api.register({ nickname, password })
    setToken(data.token)
    setUser(data.user)
    return data.user
  }

  function logout() {
    removeToken()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
