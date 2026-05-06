import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'
import { api } from '../utils/api'
import { C } from '../utils/theme'

const DISTANCES = [
  { key: 'sprint',   label: 'Sprint',   sub: '750m / 20km / 5km',          color: '#22C55E' },
  { key: 'olympic',  label: 'Olympic',  sub: '1.5km / 40km / 10km',         color: '#0EA5E9' },
  { key: 'half',     label: 'Half',     sub: '1.9km / 90.1km / 21.1km',       color: '#F97316' },
  { key: 'king',  label: 'King',  sub: '3.8km / 180.2km / 42.2km',      color: '#EF4444' },
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
  const [viewMode, setViewMode] = useState('list') // list | calendar
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
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* 뷰 토글 */}
          <div style={{ display: 'flex', background: C.surfaceAlt, borderRadius: 10, padding: 3, border: `1px solid ${C.border}` }}>
            <button onClick={() => setViewMode('list')} style={{
              padding: '5px 10px', border: 'none', borderRadius: 7, cursor: 'pointer',
              background: viewMode === 'list' ? C.surfaceHigh : 'transparent',
              color: viewMode === 'list' ? C.text : C.text2, fontSize: 15,
            }}>☰</button>
            <button onClick={() => setViewMode('calendar')} style={{
              padding: '5px 10px', border: 'none', borderRadius: 7, cursor: 'pointer',
              background: viewMode === 'calendar' ? C.surfaceHigh : 'transparent',
              color: viewMode === 'calendar' ? C.accent : C.text2, fontSize: 15,
            }}>📅</button>
          </div>
          {user?.role === 'admin' && (
            <button onClick={showForm ? closeForm : openNew} style={{
              padding: '8px 16px', border: 'none', borderRadius: 100,
              background: showForm ? C.surfaceAlt : C.accent,
              color: showForm ? C.text2 : '#fff',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}>
              {showForm ? '취소' : '+ 등록'}
            </button>
          )}
        </div>
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

      {/* 대회 목록 / 달력 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: C.text2 }}>⏳ 불러오는 중...</div>
      ) : races.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 56, color: C.text2 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🏁</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>등록된 대회가 없습니다</div>
          {user?.role === 'admin' && <div style={{ fontSize: 12, marginTop: 6, color: C.text3 }}>위 버튼으로 대회를 등록해보세요.</div>}
        </div>
      ) : viewMode === 'calendar' ? (
        <CalendarView races={races} isAdmin={user?.role === 'admin'} onEdit={openEdit} onDelete={handleDelete} />
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

const WEEK_DAYS = ['일','월','화','수','목','금','토']
const MONTH_NAMES = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월']

function CalendarView({ races, isAdmin, onEdit, onDelete }) {
  const now = new Date()
  const [current, setCurrent] = useState(new Date(now.getFullYear(), now.getMonth(), 1))
  const [selected, setSelected] = useState(null)

  const year = current.getFullYear()
  const month = current.getMonth()

  // 이번 달 races
  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`
  const racesByDay = {}
  races.forEach(r => {
    if (r.date.startsWith(monthStr)) {
      const day = parseInt(r.date.slice(8, 10))
      if (!racesByDay[day]) racesByDay[day] = []
      racesByDay[day].push(r)
    }
  })

  // 달력 그리드 생성 (월요일 시작)
  const firstDow = new Date(year, month, 1).getDay() // 0=일
  const startOffset = firstDow                        // 일요일 기준 offset
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = [...Array(startOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]

  const todayStr = now.toISOString().slice(0, 10)
  const selectedRaces = selected ? (racesByDay[selected] || []) : []

  return (
    <div style={{ padding: 12 }}>
      {/* 월 네비게이션 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button onClick={() => { setCurrent(new Date(year, month - 1, 1)); setSelected(null) }}
          style={{ background: C.surfaceAlt, border: 'none', borderRadius: 10, padding: '8px 14px', color: C.text, fontSize: 16, cursor: 'pointer', fontWeight: 700 }}>‹</button>
        <span style={{ fontSize: 16, fontWeight: 800, color: C.text }}>{year}년 {MONTH_NAMES[month]}</span>
        <button onClick={() => { setCurrent(new Date(year, month + 1, 1)); setSelected(null) }}
          style={{ background: C.surfaceAlt, border: 'none', borderRadius: 10, padding: '8px 14px', color: C.text, fontSize: 16, cursor: 'pointer', fontWeight: 700 }}>›</button>
      </div>

      {/* 요일 헤더 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
        {WEEK_DAYS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: C.text2, padding: '4px 0' }}>{d}</div>
        ))}
      </div>

      {/* 달력 셀 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const dayRaces = racesByDay[day] || []
          const hasRace = dayRaces.length > 0
          const isSelected = selected === day
          const dayStr = `${monthStr}-${String(day).padStart(2, '0')}`
          const isToday = dayStr === todayStr

          return (
            <div key={i} onClick={() => hasRace && setSelected(isSelected ? null : day)} style={{
              minHeight: 52, borderRadius: 10, padding: '4px 3px',
              background: isSelected ? C.accentBg : hasRace ? C.surfaceAlt : 'transparent',
              border: isSelected ? `1.5px solid ${C.accentBorder}` : `1.5px solid transparent`,
              cursor: hasRace ? 'pointer' : 'default',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                background: isToday ? C.accent : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: isToday ? 900 : 500,
                color: isToday ? '#fff' : C.text,
              }}>{day}</div>
              {dayRaces.slice(0, 2).map(r => {
                const dc = DIST_MAP[r.distance]?.color || C.accent
                return (
                  <div key={r.id} style={{
                    width: '100%', borderRadius: 3, padding: '1px 2px',
                    background: dc + '30', fontSize: 8, color: dc,
                    fontWeight: 700, textAlign: 'center',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {DIST_MAP[r.distance]?.label}
                  </div>
                )
              })}
              {dayRaces.length > 2 && (
                <div style={{ fontSize: 8, color: C.text2 }}>+{dayRaces.length - 2}</div>
              )}
            </div>
          )
        })}
      </div>

      {/* 선택된 날의 대회 상세 */}
      {selected && selectedRaces.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.text2, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            {monthStr}-{String(selected).padStart(2,'0')} 대회
          </div>
          {selectedRaces.map(r => (
            <RaceCard key={r.id} race={r} isAdmin={isAdmin} onEdit={onEdit} onDelete={onDelete}
              today={todayStr} isPast={r.date < todayStr} />
          ))}
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
