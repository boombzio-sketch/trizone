import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { C } from '../utils/theme'

export default function LoginPage() {
  const [mode, setMode] = useState('login')
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
    <div style={{ minHeight: '100dvh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        {/* 로고 */}
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 20 }}>
            {[[C.swim,'🏊'],[C.bike,'🚴'],[C.run,'🏃']].map(([color, icon], i) => (
              <div key={i} style={{
                width: 56, height: 56, borderRadius: 18,
                background: color + '15', border: `1.5px solid ${color}40`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
              }}>{icon}</div>
            ))}
          </div>
          <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.05em', color: C.text }}>
            TRI<span style={{ color: C.accent }}>ZONE</span>
          </div>
          <div style={{ fontSize: 13, color: C.text2, marginTop: 6 }}>철인3종 커뮤니티</div>
        </div>

        {/* 탭 */}
        <div style={{ display: 'flex', background: C.surfaceAlt, borderRadius: 14, padding: 4, marginBottom: 24, border: `1px solid ${C.border}` }}>
          {['login','register'].map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              flex: 1, padding: '10px', border: 'none', borderRadius: 10,
              background: mode === m ? C.surfaceHigh : 'transparent',
              color: mode === m ? C.accent : C.text2,
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}>
              {m === 'login' ? '로그인' : '회원가입'}
            </button>
          ))}
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={labelSt}>닉네임</label>
            <input value={nickname} onChange={e => setNickname(e.target.value)} placeholder="예: 아이언맨김씨" style={inputSt} />
          </div>
          <div style={{ marginBottom: 22 }}>
            <label style={labelSt}>비밀번호</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="4자 이상" style={inputSt} />
          </div>

          {error && (
            <div style={{ background: C.errorBg, border: `1px solid ${C.errorBorder}`, borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: C.error }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '15px',
            background: loading ? C.surfaceHigh : C.accent,
            color: loading ? C.text2 : '#fff',
            border: 'none', borderRadius: 14,
            fontSize: 15, fontWeight: 800, cursor: loading ? 'default' : 'pointer',
          }}>
            {loading ? '처리 중...' : (mode === 'login' ? '로그인' : '회원가입')}
          </button>
        </form>

        {mode === 'register' && (
          <div style={{ marginTop: 16, padding: 14, background: C.successBg, border: `1px solid ${C.successBorder}`, borderRadius: 12, fontSize: 12, color: C.text2, lineHeight: 1.6 }}>
            💡 처음 가입하는 사람이 자동으로 <strong style={{ color: C.success }}>클럽장(관리자)</strong>이 됩니다.
          </div>
        )}
      </div>
    </div>
  )
}

const inputSt = {
  width: '100%', padding: '13px 14px',
  background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 12,
  color: C.text, fontSize: 14, outline: 'none', fontFamily: 'inherit',
}
const labelSt = { display: 'block', fontSize: 11, fontWeight: 700, color: C.text2, marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.06em' }
