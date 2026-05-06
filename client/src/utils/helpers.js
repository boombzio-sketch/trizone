export function formatDuration(sec) {
  if (!sec) return '-'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  return `${m}:${String(s).padStart(2,'0')}`
}

export function parseDuration(str) {
  if (!str) return 0
  const parts = str.split(':').map(Number)
  if (parts.length === 3) return parts[0]*3600 + parts[1]*60 + parts[2]
  if (parts.length === 2) return parts[0]*60 + parts[1]
  return Number(str) || 0
}

export function formatPace(sport, pace) {
  if (!pace) return '-'
  if (sport === 'bike') return `${pace.toFixed(1)} km/h`
  if (sport === 'swim') {
    const min = Math.floor(pace)
    const sec = Math.round((pace - min) * 60)
    return `${min}:${String(sec).padStart(2,'0')} /100m`
  }
  const min = Math.floor(pace)
  const sec = Math.round((pace - min) * 60)
  return `${min}:${String(sec).padStart(2,'0')} /km`
}

export const SPORT_LABEL = { swim: '수영', bike: '사이클', run: '런', brick: '브릭' }
export const SPORT_COLOR = { swim: '#0EA5E9', bike: '#22C55E', run: '#F97316', brick: '#A855F7' }
export const SPORT_ICON  = { swim: '🏊', bike: '🚴', run: '🏃', brick: '🧱' }

export function formatScore(score) {
  if (!score) return '0'
  return score.toFixed(1)
}

export function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const days = ['일','월','화','수','목','금','토']
  return `${d.getMonth()+1}/${d.getDate()}(${days[d.getDay()]})`
}

export function getWeekStart() {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const mon = new Date(now)
  mon.setDate(now.getDate() + diff)
  return mon.toISOString().slice(0,10)
}

export function getInitial(nickname) {
  return nickname ? nickname.charAt(0) : '?'
}
