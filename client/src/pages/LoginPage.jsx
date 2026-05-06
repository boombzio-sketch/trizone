import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'

export default function LoginPage() {
  const [mode, setMode] = useState('login') // login | register
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, register } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      if (mode === 'login') await login(nickname, password)
      else await register(nickname, password)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100dvh', background: '#080B10',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        {/* 로고 */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🏊🚴🏃</div>
          <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.04em', color: '#E8E6E0' }}>
            TRI<span style={{ color: '#4DB8FF' }}>ZONE</span>
          </div>
          <div style={{ fontSize: 13, color: '#4A5A6A', marginTop: 4 }}>
            철인3종 훈련 관리 플랫폼
          </div>
        </div>

        {/* 탭 */}
        <div style={{
          display: 'flex', background: '#0C1420', borderRadius: 12,
          padding: 4, marginBottom: 20, border: '1px solid #16202E',
        }}>
          {['login','register'].map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              flex: 1, padding: '10px', border: 'none', borderRadius: 8,
              background: mode === m ? '#1A2A3E' : 'transparent',
              color: mode === m ? '#4DB8FF' : '#3A4A5A',
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}>
              {m === 'login' ? '로그인' : '회원가입'}
            </button>
          ))}
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#4DB8FF', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              닉네임
            </label>
            <input value={nickname} onChange={e => setNickname(e.target.value)}
              placeholder="예: 아이언맨김씨"
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#4DB8FF', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              비밀번호
            </label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="4자 이상"
              style={inputStyle}
            />
          </div>

          {error && (
            <div style={{ background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#FF5050' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '14px', background: loading ? '#1A2A3E' : '#4DB8FF',
            color: '#080B10', border: 'none', borderRadius: 12,
            fontSize: 15, fontWeight: 800, cursor: loading ? 'default' : 'pointer',
            transition: 'background 0.2s',
          }}>
            {loading ? '처리 중...' : (mode === 'login' ? '로그인' : '회원가입')}
          </button>
        </form>

        {mode === 'register' && (
          <div style={{ marginTop: 16, padding: 14, background: 'rgba(0,220,130,0.06)', border: '1px solid rgba(0,220,130,0.2)', borderRadius: 10, fontSize: 12, color: '#5A7A6A', lineHeight: 1.6 }}>
            💡 처음 가입하는 사람이 자동으로 <strong style={{color:'#00DC82'}}>클럽장(관리자)</strong>이 됩니다.
          </div>
        )}
      </div>
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '12px 14px',
  background: '#0C1420', border: '1px solid #1E2A3A', borderRadius: 10,
  color: '#E8E6E0', fontSize: 14, outline: 'none',
  fontFamily: 'inherit',
}
