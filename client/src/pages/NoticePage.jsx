import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'
import { api } from '../utils/api'
import { C } from '../utils/theme'

export default function NoticePage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [notices, setNotices] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [editing, setEditing] = useState(null) // null | 'new' | notice object

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try { setNotices(await api.getNotices()) }
    finally { setLoading(false) }
  }

  async function handleDelete(id) {
    if (!confirm('공지를 삭제할까요?')) return
    await api.deleteNotice(id)
    setNotices(prev => prev.filter(n => n.id !== id))
    setSelected(null)
  }

  // 상세 보기
  if (selected) {
    return (
      <div>
        <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: C.accent, fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: 0 }}>← 목록</button>
          <div style={{ flex: 1 }} />
          {isAdmin && (
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => { setEditing(selected); setSelected(null) }} style={{ background: C.surfaceAlt, border: 'none', borderRadius: 8, color: C.text2, fontSize: 12, fontWeight: 700, padding: '5px 12px', cursor: 'pointer' }}>수정</button>
              <button onClick={() => handleDelete(selected.id)} style={{ background: C.errorBg, border: 'none', borderRadius: 8, color: C.error, fontSize: 12, fontWeight: 700, padding: '5px 12px', cursor: 'pointer' }}>삭제</button>
            </div>
          )}
        </div>
        <div style={{ padding: '20px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            {selected.pinned && <span style={{ fontSize: 10, background: C.accentBg, color: C.accent, borderRadius: 6, padding: '2px 8px', fontWeight: 800 }}>📌 고정</span>}
          </div>
          <div style={{ fontSize: 18, fontWeight: 900, color: C.text, lineHeight: 1.4, marginBottom: 10 }}>{selected.title}</div>
          <div style={{ fontSize: 11, color: C.text3, marginBottom: 20 }}>
            {selected.author_nickname} · {selected.created_at?.slice(0, 10)}
            {selected.updated_at !== selected.created_at && ' (수정됨)'}
          </div>
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16, fontSize: 14, color: C.text, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
            {selected.body}
          </div>
        </div>
      </div>
    )
  }

  // 작성/수정 모달
  if (editing !== null) {
    return <EditForm
      notice={editing === 'new' ? null : editing}
      onSave={async (data) => {
        if (editing === 'new') {
          const created = await api.createNotice(data)
          setNotices(prev => [created, ...prev.filter(n => !data.pinned || !n.pinned || n.id === created.id)])
          await load()
        } else {
          const updated = await api.updateNotice(editing.id, data)
          setNotices(prev => prev.map(n => n.id === updated.id ? updated : n))
        }
        setEditing(null)
      }}
      onClose={() => setEditing(null)}
    />
  }

  return (
    <div>
      {/* 헤더 */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '12px 16px', display: 'flex', alignItems: 'center' }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.text, flex: 1 }}>📋 공지사항</div>
        {isAdmin && (
          <button onClick={() => setEditing('new')} style={{ background: C.accent, border: 'none', borderRadius: 10, padding: '7px 16px', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            + 작성
          </button>
        )}
      </div>

      {/* 목록 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: C.text2 }}>⏳ 불러오는 중...</div>
      ) : notices.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 64, color: C.text2 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>등록된 공지가 없습니다.</div>
        </div>
      ) : (
        <div>
          {notices.map(n => (
            <button key={n.id} onClick={() => setSelected(n)}
              style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', borderBottom: `1px solid ${C.border}`, padding: '14px 16px', cursor: 'pointer', display: 'block' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    {n.pinned && <span style={{ fontSize: 9, background: C.accentBg, color: C.accent, borderRadius: 4, padding: '1px 6px', fontWeight: 800, flexShrink: 0 }}>📌 고정</span>}
                    <span style={{ fontSize: 14, fontWeight: n.pinned ? 800 : 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</span>
                  </div>
                  <div style={{ fontSize: 11, color: C.text3 }}>{n.author_nickname} · {n.created_at?.slice(0, 10)}</div>
                </div>
                <span style={{ color: C.text3, fontSize: 16, flexShrink: 0, marginTop: 2 }}>›</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function EditForm({ notice, onSave, onClose }) {
  const [title, setTitle] = useState(notice?.title || '')
  const [body, setBody] = useState(notice?.body || '')
  const [pinned, setPinned] = useState(notice?.pinned || false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const iSt = { width: '100%', padding: '11px 13px', background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }

  async function handleSave() {
    if (!title.trim()) { setErr('제목을 입력하세요.'); return }
    setSaving(true); setErr('')
    try { await onSave({ title: title.trim(), body, pinned }) }
    catch (e) { setErr(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 300, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ background: C.surface, borderRadius: '22px 22px 0 0', width: '100%', padding: 20, border: `1px solid ${C.border}`, maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 16 }}>
          {notice ? '✏️ 공지 수정' : '📋 공지 작성'}
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.text2, marginBottom: 6, textTransform: 'uppercase' }}>제목</div>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="공지 제목" style={iSt} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.text2, marginBottom: 6, textTransform: 'uppercase' }}>내용</div>
          <textarea value={body} onChange={e => setBody(e.target.value)} rows={10} placeholder="공지 내용을 입력하세요..."
            style={{ ...iSt, resize: 'vertical', lineHeight: 1.7 }} />
        </div>

        <button type="button" onClick={() => setPinned(p => !p)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, background: pinned ? C.accentBg : C.surfaceAlt, border: `1px solid ${pinned ? C.accentBorder : C.border}`, borderRadius: 10, padding: '9px 14px', cursor: 'pointer', width: '100%' }}>
          <span style={{ fontSize: 16 }}>📌</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: pinned ? C.accent : C.text2 }}>상단 고정</span>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: pinned ? C.accent : C.text3 }}>{pinned ? 'ON' : 'OFF'}</span>
        </button>

        {err && <div style={{ background: C.errorBg, border: `1px solid ${C.errorBorder}`, borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: C.error }}>{err}</div>}

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '13px', background: C.surfaceAlt, border: 'none', borderRadius: 12, color: C.text2, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>취소</button>
          <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '13px', background: saving ? C.surfaceHigh : C.accent, border: 'none', borderRadius: 12, color: saving ? C.text2 : '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            {saving ? '저장 중...' : '💾 저장'}
          </button>
        </div>
      </div>
    </div>
  )
}
