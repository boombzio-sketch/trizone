export function parseDuration(str) {
  if (!str) return 0
  const parts = str.split(':').map(Number)
  if (parts.length === 3) return parts[0]*3600 + parts[1]*60 + parts[2]
  if (parts.length === 2) return parts[0]*60 + parts[1]
  return Number(str) || 0
}

export function formatDuration(sec) {
  if (!sec) return '-'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  return `${m}:${String(s).padStart(2,'0')}`
}

export function formatPace(sport, pace) {
  if (!pace) return '-'
  if (sport === 'bike') return `${pace.toFixed(1)} km/h`
  const min = Math.floor(pace)
  const sec = Math.round((pace - min) * 60)
  return `${min}:${String(sec).padStart(2,'0')}${sport === 'swim' ? ' /100m' : ' /km'}`
}

export const SPORT_LABEL = { swim: '수영', bike: '사이클', run: '런', brick: '브릭' }
export const SPORT_COLOR = { swim: '#22D3EE', bike: '#4ADE80', run: '#FB923C', brick: '#C084FC' }
export const SPORT_ICON  = { swim: '🏊', bike: '🚴', run: '🏃', brick: '🧱' }
