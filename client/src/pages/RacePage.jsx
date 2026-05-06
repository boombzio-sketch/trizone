import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'
import { api } from '../utils/api'
import { C } from '../utils/theme'

const DISTANCES = [
  { key: 'sprint',   label: 'Sprint',   sub: '750m / 20km / 5km',          color: '#22C55E' },
  { key: 'olympic',  label: 'Olympic',  sub: '1.5km / 40km / 10km',         color: '#0EA5E9' },
  { key: 'half',     label: 'half',     sub: '1.9km / 90.1km / 21.1km',       color: '#F97316' },
  { key: 'king',  label: 'king',  sub: '3.8km / 180.2km / 42.2km',      color: '#EF4444' },
]

const DIST_MAP = Object.fromEntries(DISTANCES.map(d => [d.key, d]))

const empty = { name: '', date: '', location: '', distance: 'olympic', entry_fee: '', reg_url: '', capacity: '', reg_start: '', reg_end: '' }

function raceToForm(r) {
  return {
    name: r.name, date: r.date, location: r.location, distance: r.distance,
    entry_fee: r.entry_fee || '', reg_url: r.reg_url || '',
    capacity: r.capacity || '', reg_start: r.reg_start || '', reg_end: r.reg_end || '',
  }
}

export default function RacePage() {
  const { user } = useAuth()
  const [races, setRaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null) // null = 신규, id = 수정
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try { setRaces(await api.getRaces()) }
    finally { setLoading(false) }
  }

  function f(k) { return e => setForm(p => ({ ...p, [k]: e.target.value })) }

  function openNew() { setEditingId(null); setForm(empty); setError(''); setShowForm(true) }
  function openEdit(race) { setEditingId(race.id); setForm(raceToForm(race)); setError(''); setShowForm(true) }
  function closeForm() { setShowForm(false); setEditingId(null); setForm(empty); setError('') }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true); setError('')
    const body = { ...form, entry_fee: parseInt(form.entry_fee) || 0, capacity: parseInt(form.capacity) || 0 }
    try {
      if (editingId) {
        const updated = await api.updateRace(editingId, body)
        setRaces(prev => prev.map(r => r.id === editingId ? updated : r).sort((a, b) => a.date.localeCompare(b.date)))
      } else {
        const race = await api.addRace(body)
        setRaces(prev => [...prev, race].sort((a, b) => a.date.localeCompare(b.date)))
      }
      closeForm()
    } catch(e) { setError(e.message) }
    finally { setSaving(false) }
  }

  async function handleDelete(id) {
    if (!confirm('이 대회를 삭제할까요?')) return
    await api.deleteRace(id)
    setRaces(prev => prev.filter(r => r.id !== id))
    if (editingId === id) closeForm()
  }

  const today = new Date().toISOString().slice(0, 10)
  const upcoming = races.filter(r => r.date >= today)
  const past     = races.filter(r => r.date < today)

  return (
    <div>
      {/* 헤더 */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>🏁 대회 일정</div>
          <div style={{ fontSize: 11, color: C.text2, marginTop: 2 }}>예정 {upcoming.length}개 · 종료 {past.length}개</div>
        </div>
        {user?.role === 'admin' && (
          <button onClick={showForm ? closeForm : openNew} style={{
            padding: '8px 16px', border: 'none', borderRadius: 100,
            background: showForm ? C.surfaceAlt : C.accent,
            color: showForm ? C.text2 : '#fff',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}>
            {showForm ? '취소' : '+ 대회 등록'}
          </button>
        )}
      </div>

      {/* 등록 폼 */}
      {showForm && (
        <form onSubmit={handleSubmit} style={{ margin: '12px', background: C.surface, borderRadius: 18, padding: 18, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.text, marginBottom: 16 }}>{editingId ? '대회 수정' : '새 대회 등록'}</div>

          <Field label="대회명 *">
            <input value={form.name} onChange={f('name')} placeholder="예: 2026 부산 철인3종" required style={iSt} />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="대회 날짜 *">
              <input type="date" value={form.date} onChange={f('date')} required style={iSt} />
            </Field>
            <Field label="장소 *">
              <input value={form.location} onChange={f('location')} placeholder="예: 해운대" required style={iSt} />
            </Field>
          </div>

          <Field label="종목 *">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
              {DISTANCES.map(d => (
                <button key={d.key} type="button" onClick={() => setForm(p => ({ ...p, distance: d.key }))} style={{
                  padding: '10px 4px', border: 'none', borderRadius: 12, cursor: 'pointer',
                  background: form.distance === d.key ? d.color + '20' : C.surfaceAlt,
                  outline: form.distance === d.key ? `2px solid ${d.color}` : '2px solid transparent',
                  color: form.distance === d.key ? d.color : C.text2,
                  fontSize: 12, fontWeight: 700,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                }}>
                  <span>{d.label}</span>
                  <span style={{ fontSize: 9, fontWeight: 400, opacity: 0.7 }}>{d.sub}</span>
                </button>
              ))}
            </div>
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="접수 시작일">
              <input type="date" value={form.reg_start} onChange={f('reg_start')} style={iSt} />
            </Field>
            <Field label="접수 마감일">
              <input type="date" value={form.reg_end} onChange={f('reg_end')} style={iSt} />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="참가비 (원)">
              <input type="number" value={form.entry_fee} onChange={f('entry_fee')} placeholder="예: 80000" style={iSt} />
            </Field>
            <Field label="모집 인원">
              <input type="number" value={form.capacity} onChange={f('capacity')} placeholder="예: 300" style={iSt} />
            </Field>
          </div>

          <Field label="신청 링크">
            <input type="url" value={form.reg_url} onChange={f('reg_url')} placeholder="https://..." style={iSt} />
          </Field>

          {error && <div style={{ background: C.errorBg, border: `1px solid ${C.errorBorder}`, borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: C.error }}>{error}</div>}

          <button type="submit" disabled={saving} style={{
            width: '100%', padding: '13px', border: 'none', borderRadius: 12,
            background: saving ? C.surfaceHigh : C.accent,
            color: saving ? C.text2 : '#fff',
            fontSize: 14, fontWeight: 800, cursor: saving ? 'default' : 'pointer',
          }}>
            {saving ? '저장 중...' : editingId ? '💾 수정 저장' : '💾 대회 등록'}
          </button>
        </form>
      )}

      {/* 대회 목록 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: C.text2 }}>⏳ 불러오는 중...</div>
      ) : races.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 56, color: C.text2 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🏁</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>등록된 대회가 없습니다</div>
          {user?.role === 'admin' && <div style={{ fontSize: 12, marginTop: 6, color: C.text3 }}>위 버튼으로 대회를 등록해보세요.</div>}
        </div>
      ) : (
        <div style={{ padding: '10px 12px' }}>
          {upcoming.length > 0 && (
            <>
              <SectionLabel>예정 대회</SectionLabel>
              {upcoming.map(r => <RaceCard key={r.id} race={r} isAdmin={user?.role === 'admin'} onEdit={openEdit} onDelete={handleDelete} today={today} />)}
            </>
          )}
          {past.length > 0 && (
            <>
              <SectionLabel style={{ marginTop: upcoming.length > 0 ? 16 : 0 }}>종료된 대회</SectionLabel>
              {past.map(r => <RaceCard key={r.id} race={r} isAdmin={user?.role === 'admin'} onEdit={openEdit} onDelete={handleDelete} today={today} isPast />)}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function RaceCard({ race: r, isAdmin, onEdit, onDelete, isPast }) {
  const dist = DIST_MAP[r.distance] || { label: r.distance, color: C.accent, sub: '' }
  const regOpen = r.reg_start && r.reg_end
    ? `${r.reg_start} ~ ${r.reg_end}`
    : r.reg_start ? `${r.reg_start}부터`
    : r.reg_end ? `~${r.reg_end}` : null

  return (
    <div style={{
      background: isPast ? C.surfaceAlt : C.surface,
      borderRadius: 16, marginBottom: 10, overflow: 'hidden',
      borderLeft: `4px solid ${isPast ? C.text3 : dist.color}`,
      opacity: isPast ? 0.7 : 1,
    }}>
      <div style={{ padding: '14px 16px' }}>
        {/* 종목 배지 + 대회명 */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
          <span style={{
            fontSize: 10, fontWeight: 800, borderRadius: 6, padding: '3px 8px', flexShrink: 0, marginTop: 2,
            background: dist.color + '20', color: dist.color,
          }}>{dist.label}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.text, lineHeight: 1.3 }}>{r.name}</div>
            <div style={{ fontSize: 10, color: dist.color, marginTop: 2 }}>{dist.sub}</div>
          </div>
          {isAdmin && (
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button onClick={() => onEdit(r)} style={{ background: C.accentBg, border: 'none', borderRadius: 8, color: C.accent, cursor: 'pointer', fontSize: 11, fontWeight: 700, padding: '4px 10px' }}>수정</button>
              <button onClick={() => onDelete(r.id)} style={{ background: C.errorBg, border: 'none', borderRadius: 8, color: C.error, cursor: 'pointer', fontSize: 11, fontWeight: 700, padding: '4px 10px' }}>삭제</button>
            </div>
          )}
        </div>

        {/* 정보 그리드 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', marginBottom: 12 }}>
          <Info icon="📅" label="대회일" value={r.date} />
          <Info icon="📍" label="장소" value={r.location} />
          {r.capacity > 0 && <Info icon="👥" label="모집 인원" value={`${r.capacity.toLocaleString()}명`} />}
          {r.entry_fee > 0 && <Info icon="💰" label="참가비" value={`${r.entry_fee.toLocaleString()}원`} />}
          {regOpen && <Info icon="📝" label="접수" value={regOpen} full />}
        </div>

        {/* 신청 링크 */}
        {r.reg_url && !isPast && (
          <a href={r.reg_url} target="_blank" rel="noopener noreferrer" style={{
            display: 'block', textAlign: 'center', padding: '11px', borderRadius: 12,
            background: dist.color, color: '#fff', textDecoration: 'none',
            fontSize: 13, fontWeight: 700,
          }}>
            신청하기 →
          </a>
        )}
        {r.reg_url && isPast && (
          <a href={r.reg_url} target="_blank" rel="noopener noreferrer" style={{
            display: 'block', textAlign: 'center', padding: '10px', borderRadius: 12,
            background: C.surfaceHigh, color: C.text2, textDecoration: 'none',
            fontSize: 13, fontWeight: 700,
          }}>
            대회 페이지 보기
          </a>
        )}
      </div>
    </div>
  )
}

function Info({ icon, label, value, full }) {
  return (
    <div style={{ gridColumn: full ? '1 / -1' : undefined }}>
      <div style={{ fontSize: 9, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: C.text2 }}>{icon} {value}</div>
    </div>
  )
}

function SectionLabel({ children, style }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: C.text2, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, ...style }}>{children}</div>
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.text2, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
      {children}
    </div>
  )
}

const iSt = { width: '100%', padding: '11px 13px', background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 11, color: C.text, fontSize: 13, outline: 'none', fontFamily: 'inherit' }
