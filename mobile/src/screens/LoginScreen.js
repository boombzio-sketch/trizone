import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native'
import { useAuth } from '../hooks/useAuth'
import { api } from '../utils/api'
import { C } from '../utils/theme'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function LoginScreen() {
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

  function switchMode(m) {
    setMode(m)
    setError('')
    setResetDone(false)
    setResetStep('request')
    setResetCode('')
    setResetPassword('')
  }

  async function handleSubmit() {
    setError('')
    if (!email.trim() || !password.trim()) {
      setError('이메일과 비밀번호를 입력해주세요.')
      return
    }
    if (mode === 'register' && !EMAIL_RE.test(email.trim())) {
      setError('올바른 이메일 형식이 아닙니다.')
      return
    }
    if (mode === 'register' && !nickname.trim()) {
      setError('닉네임을 입력해주세요.')
      return
    }
    setLoading(true)
    try {
      if (mode === 'login') await login(email.trim(), password)
      else await register(email.trim(), nickname.trim(), password)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleRequestReset() {
    setError('')
    if (!email.trim()) { setError('이메일을 입력해주세요.'); return }
    setLoading(true)
    try {
      await api.requestReset(email.trim())
      setResetStep('confirm')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleReset() {
    setError('')
    if (!resetCode.trim() || !resetPassword.trim()) {
      setError('모든 항목을 입력해주세요.')
      return
    }
    setLoading(true)
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
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        {/* 로고 */}
        <View style={s.logoArea}>
          <View style={s.icons}>
            {[[C.swim,'🏊'],[C.bike,'🚴'],[C.run,'🏃']].map(([color, icon], i) => (
              <View key={i} style={[s.iconBox, { backgroundColor: color + '22', borderColor: color + '55' }]}>
                <Text style={s.iconText}>{icon}</Text>
              </View>
            ))}
          </View>
          <Text style={s.brand}>TRI<Text style={{ color: C.accent }}>ZONE</Text></Text>
          <Text style={s.sub}>트라이애슬론 커뮤니티</Text>
        </View>

        {/* 탭 */}
        <View style={s.tabRow}>
          {['login','register'].map(m => (
            <TouchableOpacity key={m} onPress={() => switchMode(m)} style={[s.tab, mode === m && s.tabActive]}>
              <Text style={[s.tabText, mode === m && s.tabTextActive]}>
                {m === 'login' ? '로그인' : '회원가입'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 비밀번호 찾기 폼 */}
        {mode === 'reset' ? (
          <View style={s.form}>
            {resetDone ? (
              <>
                <View style={[s.errorBox, { backgroundColor: '#F0FDF4', borderColor: '#86EFAC' }]}>
                  <Text style={[s.errorText, { color: '#16A34A' }]}>✅ 비밀번호가 변경되었습니다. 로그인해주세요.</Text>
                </View>
                <TouchableOpacity style={[s.btn, { marginTop: 16 }]} onPress={() => switchMode('login')}>
                  <Text style={s.btnText}>로그인하러 가기</Text>
                </TouchableOpacity>
              </>
            ) : resetStep === 'request' ? (
              <>
                <Text style={s.label}>이메일 또는 닉네임</Text>
                <TextInput
                  style={s.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="가입 시 사용한 이메일"
                  placeholderTextColor={C.text2}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {error ? (
                  <View style={s.errorBox}><Text style={s.errorText}>{error}</Text></View>
                ) : null}
                <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={handleRequestReset} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>코드 전송</Text>}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={[s.errorBox, { backgroundColor: '#F0FDF4', borderColor: '#86EFAC', marginBottom: 16 }]}>
                  <Text style={[s.errorText, { color: '#16A34A' }]}>✅ {email} 으로 코드를 전송했습니다.</Text>
                </View>
                <Text style={s.label}>인증 코드</Text>
                <TextInput
                  style={s.input}
                  value={resetCode}
                  onChangeText={setResetCode}
                  placeholder="이메일에서 받은 6자리 코드"
                  placeholderTextColor={C.text2}
                  keyboardType="number-pad"
                  autoCapitalize="none"
                />
                <Text style={[s.label, { marginTop: 14 }]}>새 비밀번호</Text>
                <TextInput
                  style={s.input}
                  value={resetPassword}
                  onChangeText={setResetPassword}
                  placeholder="4자 이상"
                  placeholderTextColor={C.text2}
                  secureTextEntry
                  autoCapitalize="none"
                />
                {error ? (
                  <View style={s.errorBox}><Text style={s.errorText}>{error}</Text></View>
                ) : null}
                <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={handleReset} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>비밀번호 재설정</Text>}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setResetStep('request'); setError('') }} style={s.resetLink}>
                  <Text style={s.resetLinkText}>← 이메일 다시 입력</Text>
                </TouchableOpacity>
              </>
            )}
            {!resetDone && (
              <TouchableOpacity onPress={() => switchMode('login')} style={s.resetLink}>
                <Text style={s.resetLinkText}>← 로그인으로 돌아가기</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          /* 로그인 / 회원가입 폼 */
          <View style={s.form}>
            <Text style={s.label}>이메일</Text>
            <TextInput
              style={s.input}
              value={email}
              onChangeText={setEmail}
              placeholder="example@email.com"
              placeholderTextColor={C.text2}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
            />

            {mode === 'register' && (
              <>
                <Text style={[s.label, { marginTop: 14 }]}>닉네임</Text>
                <TextInput
                  style={s.input}
                  value={nickname}
                  onChangeText={setNickname}
                  placeholder="예: 아이언맨김씨"
                  placeholderTextColor={C.text2}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </>
            )}

            <Text style={[s.label, { marginTop: 14 }]}>비밀번호</Text>
            <TextInput
              style={s.input}
              value={password}
              onChangeText={setPassword}
              placeholder="4자 이상"
              placeholderTextColor={C.text2}
              secureTextEntry
              autoCapitalize="none"
            />

            {error ? (
              <View style={s.errorBox}>
                <Text style={s.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[s.btn, loading && s.btnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.btnText}>{mode === 'login' ? '로그인' : '회원가입'}</Text>
              }
            </TouchableOpacity>

            {mode === 'login' && (
              <TouchableOpacity onPress={() => switchMode('reset')} style={s.resetLink}>
                <Text style={s.resetLinkText}>비밀번호를 잊으셨나요?</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logoArea: { alignItems: 'center', marginBottom: 44 },
  icons: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  iconBox: { width: 56, height: 56, borderRadius: 18, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 26 },
  brand: { fontSize: 32, fontWeight: '900', letterSpacing: -1.5, color: C.text },
  sub: { fontSize: 13, color: C.text2, marginTop: 6 },
  tabRow: {
    flexDirection: 'row', backgroundColor: C.surfaceAlt,
    borderRadius: 14, padding: 4, marginBottom: 24,
    borderWidth: 1, borderColor: C.border,
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: C.surfaceHigh },
  tabText: { fontSize: 14, fontWeight: '700', color: C.text2 },
  tabTextActive: { color: C.accent },
  form: {},
  label: { fontSize: 11, fontWeight: '700', color: C.text2, marginBottom: 7, textTransform: 'uppercase', letterSpacing: 1 },
  input: {
    backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
    color: C.text, fontSize: 14,
  },
  errorBox: {
    backgroundColor: C.errorBg, borderWidth: 1, borderColor: C.errorBorder,
    borderRadius: 10, padding: 12, marginTop: 14,
  },
  errorText: { color: C.error, fontSize: 13 },
  btn: { marginTop: 22, backgroundColor: C.accent, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  btnDisabled: { backgroundColor: C.surfaceHigh },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  resetLink: { marginTop: 18, alignItems: 'center' },
  resetLinkText: { fontSize: 13, color: C.text2, textDecorationLine: 'underline' },
})
