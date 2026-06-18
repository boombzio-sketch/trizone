import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'
import { api } from '../utils/api'
import { C } from '../utils/theme'

// 카테고리별 종목(거리) 옵션. key는 전 카테고리에서 유일해야 함 (DIST_MAP 조회용)
const DISTANCES_BY_CAT = {
  triathlon: [
    { key: 'sprint',   label: 'Sprint',   sub: '750m / 20km / 5km',          color: '#22C55E' },
    { key: 'olympic',  label: 'Olympic',  sub: '1.5km / 40km / 10km',        color: '#0EA5E9' },
    { key: 'half',     label: 'Half',     sub: '1.9km / 90.1km / 21.1km',    color: '#F97316' },
    { key: 'king',     label: 'King',     sub: '3.8km / 180.2km / 42.2km',   color: '#EF4444' },
  ],
  swim: [
    { key: 'swim_750',  label: '750m',  sub: '오픈워터 750m',  color: '#22D3EE' },
    { key: 'swim_1500', label: '1.5km', sub: '오픈워터 1.5km', color: '#06B6D4' },
    { key: 'swim_3000', label: '3km',   sub: '오픈워터 3km',   color: '#0EA5E9' },
    { key: 'swim_5000', label: '5km',   sub: '오픈워터 5km',   color: '#6366F1' },
  ],
  bike: [
    { key: 'bike_50',   label: '50km',   sub: '단축 코스',          color: '#FACC15' },
    { key: 'bike_100',  label: '메디오',  sub: '메디오폰도 100km',   color: '#F59E0B' },
    { key: 'bike_gran', label: '그란폰도', sub: '그란폰도 200km',     color: '#F97316' },
    { key: 'bike_200',  label: '200km+', sub: '울트라 장거리',       color: '#EA580C' },
  ],
  run: [
    { key: 'run_5k',   label: '5km',   sub: '5km',       color: '#34D399' },
    { key: 'run_10k',  label: '10km',  sub: '10km',      color: '#22C55E' },
    { key: 'run_half', label: '하프',  sub: '21.1km',    color: '#F97316' },
    { key: 'run_full', label: '풀코스', sub: '42.195km',  color: '#EF4444' },
  ],
}

const DIST_MAP = Object.fromEntries(Object.values(DISTANCES_BY_CAT).flat().map(d => [d.key, d]))

const CATEGORIES = [
  { key: 'triathlon', label: '철인3종', icon: '🏅', color: '#0EA5E9' },
  { key: 'swim',      label: '수영',    icon: '🏊', color: '#06B6D4' },
  { key: 'bike',      label: '자전거',  icon: '🚴', color: '#F59E0B' },
  { key: 'run',       label: '달리기',  icon: '🏃', color: '#EF4444' },
]

const CAT_MAP = Object.fromEntries(CATEGORIES.map(c => [c.key, c]))

const ETC_COLOR = '#94A3B8'

// distance 컬럼은 원래 단일 키였지만, 이제 복수 종목 + 기타(직접 입력)를 지원하려고
// JSON 배열 문자열로 저장한다. 과거 단일 문자열("olympic")도 호환 파싱한다.
function parseDistances(distance) {
  if (Array.isArray(distance)) return distance
  if (distance == null || distance === '') return []
  try {
    const v = JSON.parse(distance)
    if (Array.isArray(v)) return v.map(String)
    return [String(v)]
  } catch {
    return [String(distance)]
  }
}

const empty = { name: '', date: '', location: '', category: 'triathlon', distances: ['olympic'], etcText: '', entry_fee: '', reg_url: '', capacity: '', reg_start: '', reg_end: '' }

function raceToForm(r) {
  const all = parseDistances(r.distance)
  return {
    name: r.name, date: r.date, location: r.location,
    category: r.category || 'triathlon',
    distances: all.filter(k => DIST_MAP[k]),       // 프리셋 종목 키
    etcText: all.filter(k => !DIST_MAP[k]).join(', '), // 기타(직접 입력) 항목
    entry_fee: r.entry_fee || '', reg_url: r.reg_url || '',
    capacity: r.capacity || '', reg_start: r.reg_start || '', reg_end: r.reg_end || '',
  }
}

export default function RacePage() {
  const { user } = useAuth()
  const [races, setRaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('list') // list | calendar
  const [catFilter, setCatFilter] = useState('all') // all | triathlon | swim | bike | run
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null) // null = 신규, id = 수정
  const [form, setForm] = useState(empty)
  const [etcOn, setEtcOn] = useState(false) // 기타(직접 입력) 사용 여부
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try { setRaces(await api.getRaces()) }
    finally { setLoading(false) }
  }

  function f(k) { return e => setForm(p => ({ ...p, [k]: e.target.value })) }

  // 종목 복수 선택 토글
  function toggleDistance(key) {
    setForm(p => ({
      ...p,
      distances: p.distances.includes(key) ? p.distances.filter(k => k !== key) : [...p.distances, key],
    }))
  }
  function toggleEtc() {
    const next = !etcOn
    setEtcOn(next)
    if (!next) setForm(p => ({ ...p, etcText: '' }))
  }
  // 카테고리 변경: 종목 프리셋은 해당 카테고리 기본 1개로 초기화(기타 입력은 유지)
  function selectCategory(key) {
    setForm(p => ({ ...p, category: key, distances: [DISTANCES_BY_CAT[key][0].key] }))
  }

  function openNew() { setEditingId(null); setForm(empty); setEtcOn(false); setError(''); setShowForm(true) }
  function openEdit(race) {
    const fm = raceToForm(race)
    setEditingId(race.id); setForm(fm); setEtcOn(!!fm.etcText); setError(''); setShowForm(true)
  }
  function closeForm() { setShowForm(false); setEditingId(null); setForm(empty); setEtcOn(false); setError('') }

  async function handleSubmit(e) {
    e.preventDefault()
    const etc = etcOn ? form.etcText.trim() : ''
    const distancesFinal = [...form.distances, ...(etc ? [etc] : [])]
    if (distancesFinal.length === 0) { setError('종목을 1개 이상 선택하거나 기타에 입력하세요.'); return }
    setSaving(true); setError('')
    const { distances, etcText, ...rest } = form
    const body = { ...rest, distance: JSON.stringify(distancesFinal), entry_fee: parseInt(form.entry_fee) || 0, capacity: parseInt(form.capacity) || 0 }
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
  const visible  = catFilter === 'all' ? races : races.filter(r => (r.category || 'triathlon') === catFilter)
  const upcoming = visible.filter(r => r.date >= today)
  const past     = visible.filter(r => r.date < today)

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

      {/* 카테고리 필터 탭 */}
      <div style={{ display: 'flex', gap: 6, padding: '10px 12px', overflowX: 'auto', borderBottom: `1px solid ${C.border}`, background: C.surface }}>
        {[{ key: 'all', label: '전체', icon: '🏁', color: C.accent }, ...CATEGORIES].map(c => {
          const active = catFilter === c.key
          return (
            <button key={c.key} onClick={() => setCatFilter(c.key)} style={{
              flexShrink: 0, padding: '7px 14px', borderRadius: 100, cursor: 'pointer',
              border: active ? `1.5px solid ${c.color}` : `1.5px solid ${C.border}`,
              background: active ? c.color + '20' : C.surfaceAlt,
              color: active ? c.color : C.text2,
              fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
            }}>{c.icon} {c.label}</button>
          )
        })}
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

          <Field label="카테고리 *">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
              {CATEGORIES.map(c => (
                <button key={c.key} type="button" onClick={() => selectCategory(c.key)} style={{
                  padding: '10px 4px', border: 'none', borderRadius: 12, cursor: 'pointer',
                  background: form.category === c.key ? c.color + '20' : C.surfaceAlt,
                  outline: form.category === c.key ? `2px solid ${c.color}` : '2px solid transparent',
                  color: form.category === c.key ? c.color : C.text2,
                  fontSize: 12, fontWeight: 700,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                }}>
                  <span style={{ fontSize: 16 }}>{c.icon}</span>
                  <span>{c.label}</span>
                </button>
              ))}
            </div>
          </Field>

          <Field label="종목 * (복수 선택 가능)">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
              {(DISTANCES_BY_CAT[form.category] || DISTANCES_BY_CAT.triathlon).map(d => {
                const on = form.distances.includes(d.key)
                return (
                  <button key={d.key} type="button" onClick={() => toggleDistance(d.key)} style={{
                    padding: '10px 4px', border: 'none', borderRadius: 12, cursor: 'pointer',
                    background: on ? d.color + '20' : C.surfaceAlt,
                    outline: on ? `2px solid ${d.color}` : '2px solid transparent',
                    color: on ? d.color : C.text2,
                    fontSize: 12, fontWeight: 700,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                  }}>
                    <span>{d.label}</span>
                    <span style={{ fontSize: 9, fontWeight: 400, opacity: 0.7 }}>{d.sub}</span>
                  </button>
                )
              })}
              {/* 기타: 직접 입력 토글 (전 카테고리 공통) */}
              <button type="button" onClick={toggleEtc} style={{
                padding: '10px 4px', border: 'none', borderRadius: 12, cursor: 'pointer',
                background: etcOn ? ETC_COLOR + '20' : C.surfaceAlt,
                outline: etcOn ? `2px solid ${ETC_COLOR}` : '2px solid transparent',
                color: etcOn ? ETC_COLOR : C.text2,
                fontSize: 12, fontWeight: 700,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              }}>
                <span>기타</span>
                <span style={{ fontSize: 9, fontWeight: 400, opacity: 0.7 }}>직접 입력</span>
              </button>
            </div>
            {etcOn && (
              <input value={form.etcText} onChange={f('etcText')}
                placeholder="예: 2.5km / 사이클 120km / 하프+ (여러 개는 쉼표로 구분)"
                style={{ ...iSt, marginTop: 8 }} />
            )}
            <div style={{ fontSize: 11, color: C.text3, marginTop: 6 }}>여러 종목이 있으면 모두 선택하세요. 정확한 거리가 없으면 “기타”에 직접 입력.</div>
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
      ) : visible.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 56, color: C.text2 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🏁</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>
            {catFilter === 'all' ? '등록된 대회가 없습니다' : `${CAT_MAP[catFilter]?.label} 대회가 없습니다`}
          </div>
          {user?.role === 'admin' && <div style={{ fontSize: 12, marginTop: 6, color: C.text3 }}>위 버튼으로 대회를 등록해보세요.</div>}
        </div>
      ) : viewMode === 'calendar' ? (
        <CalendarView races={visible} isAdmin={user?.role === 'admin'} onEdit={openEdit} onDelete={handleDelete} />
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
                const first = parseDistances(r.distance)[0]
                const dm = DIST_MAP[first]
                const dc = dm?.color || (CAT_MAP[r.category]?.color) || C.accent
                return (
                  <div key={r.id} style={{
                    width: '100%', borderRadius: 3, padding: '1px 2px',
                    background: dc + '30', fontSize: 8, color: dc,
                    fontWeight: 700, textAlign: 'center',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {dm?.label || first || ''}
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
  const cat = CAT_MAP[r.category || 'triathlon'] || CAT_MAP.triathlon
  const dists = parseDistances(r.distance).map(k => DIST_MAP[k] || { label: k, color: ETC_COLOR, sub: '' })
  const accent = isPast ? C.text3 : cat.color
  const regOpen = r.reg_start && r.reg_end
    ? `${r.reg_start} ~ ${r.reg_end}`
    : r.reg_start ? `${r.reg_start}부터`
    : r.reg_end ? `~${r.reg_end}` : null
  const today = new Date().toISOString().slice(0, 10)
  const dDay = Math.ceil((new Date(r.date) - new Date(today)) / 86400000)
  const dDayStr = dDay === 0 ? 'D-Day' : dDay > 0 ? `D-${dDay}` : `D+${Math.abs(dDay)}`

  return (
    <div style={{
      background: isPast ? C.surfaceAlt : C.surface,
      borderRadius: 16, marginBottom: 10, overflow: 'hidden',
      borderLeft: `4px solid ${accent}`,
      opacity: isPast ? 0.7 : 1,
    }}>
      <div style={{ padding: '14px 16px' }}>
        {/* 카테고리 + 종목 배지(복수) + 대회명 */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: 10, fontWeight: 700, borderRadius: 6, padding: '2px 7px',
                background: cat.color + '18', color: cat.color,
              }}>{cat.icon} {cat.label}</span>
              {dists.map((d, i) => (
                <span key={i} style={{
                  fontSize: 10, fontWeight: 800, borderRadius: 6, padding: '2px 7px',
                  background: d.color + '20', color: d.color,
                }}>{d.label}</span>
              ))}
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.text, lineHeight: 1.3 }}>{r.name}</div>
            {dists.length === 1 && dists[0].sub && (
              <div style={{ fontSize: 10, color: dists[0].color, marginTop: 2 }}>{dists[0].sub}</div>
            )}
          </div>
          {!isPast && (
            <span style={{
              fontSize: 12, fontWeight: 800, flexShrink: 0,
              color: dDay <= 30 ? '#EF4444' : C.text2,
            }}>{dDayStr}</span>
          )}
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
            background: accent, color: '#fff', textDecoration: 'none',
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
