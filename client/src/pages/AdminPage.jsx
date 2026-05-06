import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'
import { api } from '../utils/api'
import { Navigate } from 'react-router-dom'

export default function AdminPage() {
  const { user } = useAuth()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  if (user?.role !== 'admin') return <Navigate to="/" replace />

  useEffect(() => { loadMembers() }, [])

  async function loadMembers() {
    setLoading(true)
    try {
      const data = await api.getAdminMembers()
      setMembers(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleRoleToggle(member) {
    const newRole = member.role === 'admin' ? 'member' : 'admin'
    if (!confirm(`${member.nickname}의 역할을 ${newRole === 'admin' ? '관리자' : '일반회원'}으로 변경할까요?`)) return
    try {
      await api.setAdminMemberRole(member.id, newRole)
      setMembers(prev => prev.map(m => m.id === member.id ? { ...m, role: newRole } : m))
    } catch (e) {
      alert(e.message)
    }
  }

  async function handleDelete(member) {
    if (!confirm(`${member.nickname} 회원을 삭제할까요?\n훈련 기록 등 모든 데이터가 삭제됩니다.`)) return
    try {
      await api.deleteAdminMember(member.id)
      setMembers(prev => prev.filter(m => m.id !== member.id))
    } catch (e) {
      alert(e.message)
    }
  }

  return (
    <div>
      <div style={{ background: '#0C1420', borderBottom: '1px solid #16202E', padding: '12px 16px' }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#E8E6E0' }}>⚙️ 회원 관리</div>
        <div style={{ fontSize: 11, color: '#3A4A5A', marginTop: 2 }}>총 {members.length}명</div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#3A4A5A' }}>⏳ 불러오는 중...</div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#FF5050', fontSize: 13 }}>{error}</div>
      ) : (
        members.map(m => (
          <MemberRow
            key={m.id}
            member={m}
            isSelf={m.id === user?.id}
            onRoleToggle={handleRoleToggle}
            onDelete={handleDelete}
          />
        ))
      )}
    </div>
  )
}

function MemberRow({ member: m, isSelf, onRoleToggle, onDelete }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 16px', borderBottom: '1px solid #0E1520',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
        background: m.avatar_color + '22', border: `2px solid ${m.avatar_color}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 800, color: m.avatar_color,
      }}>
        {m.nickname?.charAt(0)}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#E8E6E0' }}>{m.nickname}</span>
          {isSelf && <span style={{ fontSize: 9, background: 'rgba(77,184,255,0.15)', color: '#4DB8FF', borderRadius: 4, padding: '1px 5px' }}>나</span>}
          <span style={{
            fontSize: 9, borderRadius: 4, padding: '2px 6px', fontWeight: 700,
            background: m.role === 'admin' ? 'rgba(204,100,255,0.15)' : 'rgba(74,90,106,0.2)',
            color: m.role === 'admin' ? '#CC64FF' : '#4A5A6A',
          }}>
            {m.role === 'admin' ? 'ADMIN' : 'MEMBER'}
          </span>
        </div>
        <div style={{ fontSize: 10, color: '#3A4A5A', marginTop: 2 }}>
          가입 {m.created_at?.slice(0, 10)} · 훈련 {m.workout_count}회
        </div>
      </div>

      {!isSelf && (
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={() => onRoleToggle(m)} style={{
            padding: '6px 10px', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 11, fontWeight: 700,
            background: m.role === 'admin' ? 'rgba(74,90,106,0.3)' : 'rgba(204,100,255,0.15)',
            color: m.role === 'admin' ? '#4A5A6A' : '#CC64FF',
          }}>
            {m.role === 'admin' ? '해제' : '관리자'}
          </button>
          <button onClick={() => onDelete(m)} style={{
            padding: '6px 10px', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 11, fontWeight: 700,
            background: 'rgba(255,80,80,0.1)', color: '#FF5050',
          }}>
            삭제
          </button>
        </div>
      )}
    </div>
  )
}
