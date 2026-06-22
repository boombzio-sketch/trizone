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
  const [termsAgreed, setTermsAgreed] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const { login, register } = useAuth()
  const navigate = useNavigate()

  function switchMode(m) {
    setMode(m); setError(''); setResetDone(false)
    setResetStep('request'); setResetCode(''); setResetPassword('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (mode === 'register' && !termsAgreed) { setError('이용약관에 동의해주세요.'); return }
    setError(''); setLoading(true)
    try {
      if (mode === 'login') await login(email, password)
      else await register(email, nickname, password, termsAgreed)
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
    <div style={{ minHeight: '100dvh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, overflowY: 'auto' }}>
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

              {mode === 'register' && (
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 18, cursor: 'pointer' }}>
                  <input type="checkbox" checked={termsAgreed} onChange={e => setTermsAgreed(e.target.checked)}
                    style={{ marginTop: 2, width: 16, height: 16, accentColor: C.accent, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: C.text2, lineHeight: 1.5 }}>
                    <button type="button" onClick={() => setShowTerms(true)} style={{ background: 'none', border: 'none', padding: 0, color: C.accent, fontWeight: 700, textDecoration: 'underline', cursor: 'pointer', fontSize: 12 }}>이용약관 및 커뮤니티 가이드라인</button>에 동의합니다.
                  </span>
                </label>
              )}

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
      </div>

      {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
    </div>
  )
}

function TermsModal({ onClose }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.surface, borderRadius: 20, padding: 24, width: '100%', maxWidth: 400, maxHeight: '80vh', overflowY: 'auto', border: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 14 }}>이용약관 및 커뮤니티 가이드라인</div>
        <div style={{ fontSize: 13, color: C.text2, lineHeight: 1.7 }}>
          <p><strong style={{ color: C.text }}>1. 콘텐츠 책임</strong><br />
          회원이 게시하는 운동기록, 사진, 댓글 등 모든 콘텐츠에 대한 책임은 작성자 본인에게 있습니다.</p>
          <p><strong style={{ color: C.text }}>2. 금지 행위 (무관용 정책)</strong><br />
          아래 행위는 적발 즉시 콘텐츠 삭제 및 계정 정지·삭제 조치됩니다.</p>
          <ul style={{ paddingLeft: 18, margin: '0 0 12px' }}>
            <li>음란물, 폭력적이거나 혐오스러운 콘텐츠</li>
            <li>특정 인물·집단에 대한 비방, 욕설, 괴롭힘</li>
            <li>불법 행위를 조장하거나 타인에게 해를 끼치는 콘텐츠</li>
            <li>스팸, 광고, 사기성 게시물</li>
            <li>타인을 사칭하거나 사생활을 침해하는 행위</li>
          </ul>
          <p><strong style={{ color: C.text }}>3. 신고 및 차단</strong><br />
          부적절한 콘텐츠나 사용자는 신고할 수 있으며, 신고된 콘텐츠는 운영자가 확인 후 삭제 등 조치합니다. 특정 사용자를 차단하면 해당 사용자의 콘텐츠가 더 이상 노출되지 않습니다.</p>
          <p><strong style={{ color: C.text }}>4. 운영자 권한</strong><br />
          운영자는 신고 접수 또는 자체 모니터링을 통해 가이드라인 위반 콘텐츠를 사전 통지 없이 삭제할 수 있으며, 반복 위반 시 계정을 정지 또는 삭제할 수 있습니다.</p>
        </div>
        <button onClick={onClose} style={{ width: '100%', marginTop: 16, padding: '12px', background: C.accent, border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          확인
        </button>
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
