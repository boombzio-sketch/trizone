import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'
import { api } from '../utils/api'
import { uploadImage } from '../utils/upload'
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
    const photos = (() => { try { return JSON.parse(selected.photos || '[]') } catch { return [] } })()
    return (
      <DetailView
        notice={selected}
        photos={photos}
        isAdmin={isAdmin}
        onBack={() => setSelected(null)}
        onEdit={() => { setEditing(selected); setSelected(null) }}
        onDelete={() => handleDelete(selected.id)}
      />
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

function DetailView({ notice, photos, isAdmin, onBack, onEdit, onDelete }) {
  const [photoIdx, setPhotoIdx] = useState(null)

  return (
    <div>
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: C.accent, fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: 0 }}>← 목록</button>
        <div style={{ flex: 1 }} />
        {isAdmin && (
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={onEdit} style={{ background: C.surfaceAlt, border: 'none', borderRadius: 8, color: C.text2, fontSize: 12, fontWeight: 700, padding: '5px 12px', cursor: 'pointer' }}>수정</button>
            <button onClick={onDelete} style={{ background: C.errorBg, border: 'none', borderRadius: 8, color: C.error, fontSize: 12, fontWeight: 700, padding: '5px 12px', cursor: 'pointer' }}>삭제</button>
          </div>
        )}
      </div>
      <div style={{ padding: '20px 16px' }}>
        {notice.pinned && <span style={{ fontSize: 10, background: C.accentBg, color: C.accent, borderRadius: 6, padding: '2px 8px', fontWeight: 800, display: 'inline-block', marginBottom: 8 }}>📌 고정</span>}
        <div style={{ fontSize: 18, fontWeight: 900, color: C.text, lineHeight: 1.4, marginBottom: 10 }}>{notice.title}</div>
        <div style={{ fontSize: 11, color: C.text3, marginBottom: 20 }}>
          {notice.author_nickname} · {notice.created_at?.slice(0, 10)}
          {notice.updated_at !== notice.created_at && ' (수정됨)'}
        </div>
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16, fontSize: 14, color: C.text, lineHeight: 1.8, whiteSpace: 'pre-wrap', marginBottom: photos.length > 0 ? 20 : 0 }}>
          {notice.body}
        </div>

        {/* 사진 */}
        {photos.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {photos.map((p, i) => (
              <img key={i} src={p} alt={`사진 ${i+1}`} onClick={() => setPhotoIdx(i)}
                style={{ width: '100%', borderRadius: 12, display: 'block', cursor: 'zoom-in' }} />
            ))}
          </div>
        )}
      </div>

      {photoIdx !== null && (
        <PhotoViewer photos={photos} index={photoIdx} onClose={() => setPhotoIdx(null)} onChange={setPhotoIdx} />
      )}
    </div>
  )
}

function PhotoViewer({ photos, index, onClose, onChange }) {
  const [scale, setScale] = useState(1)
  const [ox, setOx] = useState(0)
  const [oy, setOy] = useState(0)
  const state = useRef({ scale: 1, ox: 0, oy: 0 })
  const drag = useRef(null)
  const pinch = useRef(null)
  const lastTap = useRef(0)
  const containerRef = useRef(null)

  // 사진 바뀌면 리셋
  useEffect(() => {
    setScale(1); setOx(0); setOy(0)
    state.current = { scale: 1, ox: 0, oy: 0 }
  }, [index])

  useEffect(() => { state.current = { scale, ox, oy } })

  function clamp(x, y, sc) {
    const el = containerRef.current
    if (!el) return { x, y }
    const maxX = Math.max(0, (el.clientWidth  * (sc - 1)) / 2)
    const maxY = Math.max(0, (el.clientHeight * (sc - 1)) / 2)
    return { x: Math.max(-maxX, Math.min(maxX, x)), y: Math.max(-maxY, Math.min(maxY, y)) }
  }

  function applyScale(next, cx = 0, cy = 0) {
    const s = state.current
    const clamped = Math.max(1, Math.min(5, next))
    const ratio = clamped / s.scale
    const nx = s.ox * ratio + cx * (1 - ratio)
    const ny = s.oy * ratio + cy * (1 - ratio)
    const c = clamp(nx, ny, clamped)
    setScale(clamped); setOx(c.x); setOy(c.y)
  }

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    function onTouchStart(e) {
      const s = state.current
      if (e.touches.length === 2) {
        e.preventDefault()
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        pinch.current = { dist: Math.hypot(dx, dy), scale: s.scale, ox: s.ox, oy: s.oy }
        drag.current = null
      } else if (e.touches.length === 1) {
        // 더블탭 확대/축소
        const now = Date.now()
        if (now - lastTap.current < 300) {
          lastTap.current = 0
          const rect = el.getBoundingClientRect()
          const cx = e.touches[0].clientX - rect.left - rect.width  / 2
          const cy = e.touches[0].clientY - rect.top  - rect.height / 2
          s.scale > 1 ? (setScale(1), setOx(0), setOy(0)) : applyScale(2.5, cx, cy)
          return
        }
        lastTap.current = now
        drag.current = { sx: e.touches[0].clientX - s.ox, sy: e.touches[0].clientY - s.oy }
        pinch.current = null
      }
    }

    function onTouchMove(e) {
      const s = state.current
      if (e.touches.length === 2 && pinch.current) {
        e.preventDefault()
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        const newScale = Math.max(1, Math.min(5, pinch.current.scale * Math.hypot(dx, dy) / pinch.current.dist))
        const c = clamp(pinch.current.ox, pinch.current.oy, newScale)
        setScale(newScale); setOx(c.x); setOy(c.y)
      } else if (e.touches.length === 1 && drag.current && s.scale > 1) {
        e.preventDefault()
        const nx = e.touches[0].clientX - drag.current.sx
        const ny = e.touches[0].clientY - drag.current.sy
        const c = clamp(nx, ny, s.scale)
        setOx(c.x); setOy(c.y)
      }
    }

    function onTouchEnd(e) {
      if (e.touches.length < 2) pinch.current = null
      if (e.touches.length === 0) drag.current = null
    }

    el.addEventListener('touchstart', onTouchStart, { passive: false })
    el.addEventListener('touchmove',  onTouchMove,  { passive: false })
    el.addEventListener('touchend',   onTouchEnd)
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove',  onTouchMove)
      el.removeEventListener('touchend',   onTouchEnd)
    }
  }, [index])

  function onWheel(e) {
    e.preventDefault()
    const rect = containerRef.current.getBoundingClientRect()
    const cx = e.clientX - rect.left - rect.width  / 2
    const cy = e.clientY - rect.top  - rect.height / 2
    applyScale(state.current.scale * (e.deltaY < 0 ? 1.15 : 0.87), cx, cy)
  }

  function onMouseDown(e) {
    drag.current = { sx: e.clientX - state.current.ox, sy: e.clientY - state.current.oy }
  }
  function onMouseMove(e) {
    if (!drag.current || state.current.scale <= 1) return
    const c = clamp(e.clientX - drag.current.sx, e.clientY - drag.current.sy, state.current.scale)
    setOx(c.x); setOy(c.y)
  }
  function onMouseUp() { drag.current = null }

  function goTo(dir) {
    setScale(1); setOx(0); setOy(0)
    state.current = { scale: 1, ox: 0, oy: 0 }
    onChange(i => (i + dir + photos.length) % photos.length)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 500, display: 'flex', flexDirection: 'column' }}>
      {/* 상단 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', flexShrink: 0 }}>
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
          {photos.length > 1 ? `${index + 1} / ${photos.length}` : ''}
          {scale > 1 && <span style={{ marginLeft: 8 }}>{Math.round(scale * 100)}%</span>}
        </span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {scale > 1 && (
            <button onClick={() => { setScale(1); setOx(0); setOy(0) }}
              style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 11, fontWeight: 700, padding: '5px 10px', cursor: 'pointer' }}>
              원래 크기
            </button>
          )}
          <button onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '50%', width: 34, height: 34, color: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>
      </div>

      {/* 이미지 영역 */}
      <div
        ref={containerRef}
        onWheel={onWheel}
        onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
        style={{ flex: 1, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: scale > 1 ? 'grab' : 'default', touchAction: 'none', userSelect: 'none' }}
      >
        <img
          src={photos[index]} alt=""
          draggable={false}
          style={{
            maxWidth: '100%', maxHeight: '100%', objectFit: 'contain',
            transform: `scale(${scale}) translate(${ox / scale}px, ${oy / scale}px)`,
            transformOrigin: 'center',
            transition: drag.current || pinch.current ? 'none' : 'transform 0.15s ease',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* 좌우 이동 */}
      {photos.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', flexShrink: 0 }}>
          <button onClick={() => goTo(-1)}
            style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 18, fontWeight: 700, padding: '8px 20px', cursor: 'pointer' }}>‹ 이전</button>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {photos.map((_, i) => (
              <div key={i} onClick={() => goTo(i - index)}
                style={{ width: 6, height: 6, borderRadius: '50%', background: i === index ? '#fff' : 'rgba(255,255,255,0.3)', cursor: 'pointer' }} />
            ))}
          </div>
          <button onClick={() => goTo(1)}
            style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 18, fontWeight: 700, padding: '8px 20px', cursor: 'pointer' }}>다음 ›</button>
        </div>
      )}
    </div>
  )
}

function EditForm({ notice, onSave, onClose }) {
  const [title, setTitle] = useState(notice?.title || '')
  const [body, setBody] = useState(notice?.body || '')
  const [pinned, setPinned] = useState(notice?.pinned || false)
  const [photos, setPhotos] = useState(() => {
    try { return JSON.parse(notice?.photos || '[]') } catch { return [] }
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const iSt = { width: '100%', padding: '11px 13px', background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }

  async function handlePhotoAdd(e) {
    const files = Array.from(e.target.files)
    if (!files.length) return
    const remaining = 10 - photos.length
    const toProcess = files.slice(0, remaining)
    e.target.value = ''
    try {
      const urls = await Promise.all(toProcess.map(f => uploadImage(f)))
      setPhotos(prev => [...prev, ...urls])
    } catch (e2) {
      setErr('사진 업로드 실패: ' + e2.message)
    }
  }

  function removePhoto(i) {
    setPhotos(prev => prev.filter((_, j) => j !== i))
  }

  async function handleSave() {
    if (!title.trim()) { setErr('제목을 입력하세요.'); return }
    setSaving(true); setErr('')
    try { await onSave({ title: title.trim(), body, pinned, photos }) }
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
          <textarea value={body} onChange={e => setBody(e.target.value)} rows={8} placeholder="공지 내용을 입력하세요..."
            style={{ ...iSt, resize: 'vertical', lineHeight: 1.7 }} />
        </div>

        {/* 사진 */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.text2, marginBottom: 8, textTransform: 'uppercase' }}>사진 ({photos.length}/10)</div>
          {photos.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {photos.map((p, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  <img src={p} alt={`사진 ${i+1}`} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 10, display: 'block' }} />
                  <button onClick={() => removePhoto(i)} style={{
                    position: 'absolute', top: 3, right: 3, width: 20, height: 20,
                    background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%',
                    color: '#fff', fontSize: 11, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>✕</button>
                </div>
              ))}
            </div>
          )}
          {photos.length < 10 && (
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: C.surfaceAlt, border: `1px dashed ${C.border}`, borderRadius: 10, cursor: 'pointer', fontSize: 12, color: C.text2, fontWeight: 700 }}>
              📷 사진 추가
              <input type="file" accept="image/*" multiple onChange={handlePhotoAdd} style={{ display: 'none' }} />
            </label>
          )}
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
