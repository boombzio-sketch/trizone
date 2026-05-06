const BASE = (import.meta.env.VITE_API_URL || '') + '/api'

function getToken() {
  return localStorage.getItem('tz_token')
}

async function request(path, options = {}) {
  const token = getToken()
  const res = await fetch(BASE + path, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '오류가 발생했습니다.')
  return data
}

export const api = {
  // 인증
  register: (body) => request('/auth/register', { method: 'POST', body }),
  login: (body) => request('/auth/login', { method: 'POST', body }),
  me: () => request('/auth/me'),

  // 훈련 기록
  getWorkouts: (params = '') => request(`/workouts?${params}`),
  getAllWorkouts: (params = '') => request(`/workouts/all?${params}`),
  addWorkout: (body) => request('/workouts', { method: 'POST', body }),
  deleteWorkout: (id) => request(`/workouts/${id}`, { method: 'DELETE' }),
  myStats: () => request('/workouts/stats/me'),

  // 랭킹
  getRanking: (period, sport) => request(`/ranking?period=${period}&sport=${sport}`),
  getDashboard: () => request('/ranking/dashboard'),

  // 클럽
  getClubInfo: () => request('/club/info'),
  getMembers: () => request('/club/members'),
  getAnnouncements: () => request('/club/announcements'),
  postAnnouncement: (body) => request('/club/announcements', { method: 'POST', body }),
  deleteAnnouncement: (id) => request(`/club/announcements/${id}`, { method: 'DELETE' }),
  setMemberRole: (id, role) => request(`/club/members/${id}/role`, { method: 'PUT', body: { role } }),

  // 대회
  getRaces: () => request('/races'),
  addRace: (body) => request('/races', { method: 'POST', body }),
  deleteRace: (id) => request(`/races/${id}`, { method: 'DELETE' }),

  // 클럽 멤버십
  getMyMembership: () => request('/club/membership'),
  joinClub: (message) => request('/club/join', { method: 'POST', body: { message } }),
  leaveClub: () => request('/club/leave', { method: 'DELETE' }),

  // 관리자
  getAdminMembers: () => request('/admin/members'),
  setAdminMemberRole: (id, role) => request(`/admin/members/${id}/role`, { method: 'PUT', body: { role } }),
  deleteAdminMember: (id) => request(`/admin/members/${id}`, { method: 'DELETE' }),
  getPendingWorkouts: () => request('/admin/pending'),
  setWorkoutStatus: (id, status) => request(`/admin/workouts/${id}/status`, { method: 'PUT', body: { status } }),
  getPendingMemberships: () => request('/admin/memberships'),
  setMembershipStatus: (userId, status) => request(`/admin/memberships/${userId}/status`, { method: 'PUT', body: { status } }),
}

export function setToken(token) {
  localStorage.setItem('tz_token', token)
}
export function removeToken() {
  localStorage.removeItem('tz_token')
}
