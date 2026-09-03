import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { api } from '../utils/api'
import { C } from '../utils/theme'

export default function NoticeUnreadModal({ notices, onAck }) {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const popupNotices = notices.filter(n => n.show_popup)

  if (popupNotices.length === 0) return null

  async function handleAck() {
    setSaving(true)
    try {
      await api.markNoticesRead()
      onAck()
    } catch {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: C.surface, borderRadius: 20, width: '100%', maxWidth: 380, padding: 20, border: `1px solid ${C.border}`, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 14 }}>
          📢 새 공지 {popupNotices.length}건
        </div>

        <div style={{ overflowY: 'auto', marginBottom: 16 }}>
          {popupNotices.map(n => (
            <button key={n.id} onClick={() => navigate('/notices')}
              style={{ width: '100%', textAlign: 'left', background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 14px', cursor: 'pointer', marginBottom: 8, display: 'block' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>{n.title}</div>
              <div style={{ fontSize: 12, color: C.text2, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {(n.body || '').slice(0, 60)}
              </div>
              <div style={{ fontSize: 11, color: C.text3 }}>{n.author_nickname} · {n.created_at?.slice(0, 10)}</div>
            </button>
          ))}
        </div>

        <button onClick={handleAck} disabled={saving} style={{
          width: '100%', padding: '13px', border: 'none', borderRadius: 12,
          background: saving ? C.surfaceHigh : C.accent, color: saving ? C.text2 : '#fff',
          fontSize: 14, fontWeight: 700, cursor: saving ? 'default' : 'pointer',
        }}>
          {saving ? '처리 중...' : '확인'}
        </button>
      </div>
    </div>
  )
}
