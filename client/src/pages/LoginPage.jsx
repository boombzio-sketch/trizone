import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { api } from '../utils/api'
import { C } from '../utils/theme'

export default function LoginPage() {
  const [mode, setMode] = useState('login') // 'login' | 'register' | 'reset'
  const [email, setEmail] = useState('')
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [resetCode, setResetCode] = useState('')
  const [resetPassword, setResetPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetStep, setResetStep] = useState('request') // 'request' | 'confirm'
  const [resetDone, setResetDone] = useState(false)
  const { login, register } = useAuth()
  const navigate = useNavigate()

  function switchMode(m) {
    setMode(m); setError(''); setResetDone(false)
    setResetStep('request'); setResetCode(''); setResetPassword('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      if (mode === 'login') await login(email, password)
      else await register(email, nickname, password)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleRequestReset(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      await api.requestReset(email.trim())
      setResetStep('confirm')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleReset(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      await api.resetPassword({ email: email.trim(), code: resetCode.trim(), password: resetPassword })
      setResetDone(true)
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
          <div style={{ fontSize: 13, color: C.text2, marginTop: 6 }}>트라이애슬론 커뮤니티</div>
        </div>

        {mode === 'reset' ? (
          /* ── 비밀번호 찾기 폼 ── */
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 20 }}>🔑 비밀번호 찾기</div>
            {resetDone ? (
              <>
                <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 10, padding: '14px 16px', fontSize: 14, color: '#16A34A', marginBottom: 20 }}>
                  ✅ 비밀번호가 변경되었습니다. 로그인해주세요.
                </div>
                <button onClick={() => switchMode('login')} style={{ width: '100%', padding: '15px', background: C.accent, color: '#fff', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>
                  로그인하러 가기
                </button>
              </>
            ) : resetStep === 'request' ? (
              <form onSubmit={handleRequestReset}>
                <div style={{ marginBottom: 22 }}>
                  <label style={labelSt}>이메일 또는 닉네임</label>
                  <input value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="가입 시 사용한 이메일" style={inputSt} autoComplete="email" />
                </div>
                {error && (
                  <div style={{ background: C.errorBg, border: `1px solid ${C.errorBorder}`, borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: C.error }}>{error}</div>
                )}
                <button type="submit" disabled={loading} style={{ width: '100%', padding: '15px', background: loading ? C.surfaceHigh : C.accent, color: loading ? C.text2 : '#fff', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 800, cursor: loading ? 'default' : 'pointer' }}>
                  {loading ? '전송 중...' : '코드 전송'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleReset}>
                <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 10, padding: '12px 14px', marginBottom: 20, fontSize: 13, color: '#16A34A' }}>
                  ✅ <strong>{email}</strong> 으로 코드를 전송했습니다.
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={labelSt}>인증 코드</label>
                  <input value={resetCode} onChange={e => setResetCode(e.target.value)}
                    placeholder="이메일에서 받은 6자리 코드" style={inputSt} inputMode="numeric" />
                </div>
                <div style={{ marginBottom: 22 }}>
                  <label style={labelSt}>새 비밀번호</label>
                  <input type="password" value={resetPassword} onChange={e => setResetPassword(e.target.value)}
                    placeholder="4자 이상" style={inputSt} autoComplete="new-password" />
                </div>
                {error && (
                  <div style={{ background: C.errorBg, border: `1px solid ${C.errorBorder}`, borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: C.error }}>{error}</div>
                )}
                <button type="submit" disabled={loading} style={{ width: '100%', padding: '15px', background: loading ? C.surfaceHigh : C.accent, color: loading ? C.text2 : '#fff', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 800, cursor: loading ? 'default' : 'pointer' }}>
                  {loading ? '처리 중...' : '비밀번호 재설정'}
                </button>
                <button type="button" onClick={() => { setResetStep('request'); setError('') }} style={{ display: 'block', margin: '14px auto 0', background: 'none', border: 'none', color: C.text2, fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}>
                  ← 이메일 다시 입력
                </button>
              </form>
            )}
            {!resetDone && (
              <button onClick={() => switchMode('login')} style={{ display: 'block', margin: '18px auto 0', background: 'none', border: 'none', color: C.text2, fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}>
                ← 로그인으로 돌아가기
              </button>
            )}
          </div>
        ) : (
          /* ── 로그인 / 회원가입 폼 ── */
          <>
            <div style={{ display: 'flex', background: C.surfaceAlt, borderRadius: 14, padding: 4, marginBottom: 24, border: `1px solid ${C.border}` }}>
              {['login','register'].map(m => (
                <button key={m} onClick={() => switchMode(m)} style={{
                  flex: 1, padding: '10px', border: 'none', borderRadius: 10,
                  background: mode === m ? C.surfaceHigh : 'transparent',
                  color: mode === m ? C.accent : C.text2,
                  fontSize: 14, fontWeight: 700, cursor: 'pointer',
                }}>
                  {m === 'login' ? '로그인' : '회원가입'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 14 }}>
                <label style={labelSt}>이메일</label>
                <input
                  type={mode === 'register' ? 'email' : 'text'}
                  value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="example@email.com" style={inputSt} autoComplete="email"
                />
              </div>

              {mode === 'register' && (
                <div style={{ marginBottom: 14 }}>
                  <label style={labelSt}>닉네임</label>
                  <input value={nickname} onChange={e => setNickname(e.target.value)}
                    placeholder="예: 아이언맨김씨" style={inputSt} autoComplete="username" />
                </div>
              )}

              <div style={{ marginBottom: 22 }}>
                <label style={labelSt}>비밀번호</label>
                <input
                  type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="4자 이상" style={inputSt}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
              </div>

              {error && (
                <div style={{ background: C.errorBg, border: `1px solid ${C.errorBorder}`, borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: C.error }}>{error}</div>
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

              {mode === 'login' && (
                <button type="button" onClick={() => switchMode('reset')} style={{ display: 'block', margin: '16px auto 0', background: 'none', border: 'none', color: C.text2, fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}>
                  비밀번호를 잊으셨나요?
                </button>
              )}
            </form>
          </>
        )}

        {/* 카카오톡 문의 */}
        <a
          href="https://open.kakao.com/o/s1Hv4rvi"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            marginTop: 32, padding: '12px 20px',
            background: '#FEE500', borderRadius: 12, border: 'none',
            textDecoration: 'none', cursor: 'pointer',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path fillRule="evenodd" clipRule="evenodd" d="M10 2C5.582 2 2 4.91 2 8.5c0 2.28 1.376 4.285 3.46 5.493l-.88 3.25a.25.25 0 0 0 .373.277L9.1 15.18A9.7 9.7 0 0 0 10 15.25c4.418 0 8-2.91 8-6.5S14.418 2 10 2z" fill="#3A1D1D"/>
          </svg>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#3A1D1D' }}>카카오톡으로 문의하기</span>
        </a>
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
