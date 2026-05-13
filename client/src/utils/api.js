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
  updateProfile: (body) => request('/users/me', { method: 'PUT', body }),
  requestReset: (email) => request('/auth/request-reset', { method: 'POST', body: { email } }),
  resetPassword: (body) => request('/auth/reset-password', { method: 'POST', body }),

  // 훈련 기록
  getWorkouts: (params = '') => request(`/workouts?${params}`),
  getAllWorkouts: (params = '') => request(`/workouts/all?${params}`),
  addWorkout: (body) => request('/workouts', { method: 'POST', body }),
  editWorkout: (id, body) => request(`/workouts/${id}`, { method: 'PUT', body }),
  deleteWorkout: (id) => request(`/workouts/${id}`, { method: 'DELETE' }),
  myStats: () => request('/workouts/stats/me'),

  // 랭킹
  getRanking: (period, sport, scope = 'club', club_id) => request(`/ranking?period=${period}&sport=${sport}&scope=${scope}${club_id ? `&club_id=${club_id}` : ''}`),
  getRankingCustom: (from, to, sport, scope = 'club', club_id) => request(`/ranking?period=custom&from=${from}&to=${to}&sport=${sport}&scope=${scope}${club_id ? `&club_id=${club_id}` : ''}`),
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
  updateRace: (id, body) => request(`/races/${id}`, { method: 'PUT', body }),
  deleteRace: (id) => request(`/races/${id}`, { method: 'DELETE' }),

  // 클럽 멤버십 (구 단일 클럽)
  getMyMembership: () => request('/club/membership'),
  joinClub: (message) => request('/club/join', { method: 'POST', body: { message } }),
  leaveClub: () => request('/club/leave', { method: 'DELETE' }),

  // 다중 클럽
  getMyClubs: () => request('/clubs/mine'),
  getClubs: (region) => request(`/clubs${region && region !== '전체' ? `?region=${encodeURIComponent(region)}` : ''}`),
  getClub: (id) => request(`/clubs/${id}`),
  createClub: (body) => request('/clubs', { method: 'POST', body }),
  updateClub: (id, body) => request(`/clubs/${id}`, { method: 'PUT', body }),
  deleteClub: (id) => request(`/clubs/${id}`, { method: 'DELETE' }),
  getMyLeaderApp: () => request('/clubs/my-leader-app'),
  applyClubLeader: (message) => request('/clubs/my-leader-app', { method: 'POST', body: { message } }),
  getClubMembership: (id) => request(`/clubs/${id}/membership`),
  joinClubById: (id, message) => request(`/clubs/${id}/join`, { method: 'POST', body: { message } }),
  leaveClubById: (id) => request(`/clubs/${id}/leave`, { method: 'DELETE' }),
  getClubMembers: (id) => request(`/clubs/${id}/members`),
  getClubPendingMembers: (id) => request(`/clubs/${id}/pending-members`),
  setClubMemberStatus: (clubId, userId, status) => request(`/clubs/${clubId}/members/${userId}/status`, { method: 'PUT', body: { status } }),
  getClubAnnouncements: (id) => request(`/clubs/${id}/announcements`),
  postClubAnnouncement: (id, body) => request(`/clubs/${id}/announcements`, { method: 'POST', body }),
  deleteClubAnnouncement: (clubId, annId) => request(`/clubs/${clubId}/announcements/${annId}`, { method: 'DELETE' }),
  transferClubLeader: (clubId, newLeaderId) => request(`/clubs/${clubId}/transfer-leader`, { method: 'PUT', body: { new_leader_id: newLeaderId } }),
  setClubMemberClubRole: (clubId, userId, club_role) => request(`/clubs/${clubId}/members/${userId}/club-role`, { method: 'PUT', body: { club_role } }),
  getClubTrainings: (clubId) => request(`/clubs/${clubId}/trainings`),
  createClubTraining: (clubId, body) => request(`/clubs/${clubId}/trainings`, { method: 'POST', body }),
  updateClubTraining: (clubId, tid, body) => request(`/clubs/${clubId}/trainings/${tid}`, { method: 'PUT', body }),
  deleteClubTraining: (clubId, tid) => request(`/clubs/${clubId}/trainings/${tid}`, { method: 'DELETE' }),
  joinClubTraining: (clubId, tid) => request(`/clubs/${clubId}/trainings/${tid}/join`, { method: 'POST' }),
  leaveClubTraining: (clubId, tid) => request(`/clubs/${clubId}/trainings/${tid}/leave`, { method: 'DELETE' }),
  setTrainingAttendance: (clubId, tid, userId, status) => request(`/clubs/${clubId}/trainings/${tid}/attendance/${userId}`, { method: 'PUT', body: { status } }),
  getTrainingParticipants: (clubId, tid) => request(`/clubs/${clubId}/trainings/${tid}/participants`),
  getClubTrainingStats: (clubId) => request(`/clubs/${clubId}/training-stats`),
  updateAdminMember: (id, body) => request(`/admin/members/${id}`, { method: 'PUT', body }),
  getClubLeaderApps: () => request('/admin/club-leader-apps'),
  setClubLeaderAppStatus: (userId, status) => request(`/admin/club-leader-apps/${userId}/status`, { method: 'PUT', body: { status } }),

  // 관리자
  issueResetToken: (id) => request(`/admin/members/${id}/reset-token`, { method: 'POST' }),
  getAdminMembers: () => request('/admin/members'),
  setAdminMemberRole: (id, role) => request(`/admin/members/${id}/role`, { method: 'PUT', body: { role } }),
  setApprovePermission: (id, can_approve) => request(`/admin/members/${id}/can-approve`, { method: 'PUT', body: { can_approve } }),
  deleteAdminMember: (id) => request(`/admin/members/${id}`, { method: 'DELETE' }),
  getPendingWorkouts: () => request('/admin/pending'),
  getLikes: (workoutId) => request(`/social/likes/${workoutId}`),
  getUnreadCount: (since) => request(`/social/notifications/unread?since=${encodeURIComponent(since)}`),

  // 쪽지
  sendMessage: (body) => request('/messages', { method: 'POST', body: { body } }),
  getMyMessages: () => request('/messages/mine'),
  getInbox: () => request('/messages/inbox'),
  getThread: (id) => request(`/messages/${id}/thread`),
  replyMessage: (id, body) => request(`/messages/${id}/reply`, { method: 'POST', body: { body } }),
  deleteMessage: (id) => request(`/messages/${id}`, { method: 'DELETE' }),
  setWorkoutStatus: (id, status) => request(`/admin/workouts/${id}/status`, { method: 'PUT', body: { status } }),
  editAdminWorkout: (id, body) => request(`/admin/workouts/${id}/edit`, { method: 'PUT', body }),
  getPendingMemberships: () => request('/admin/memberships'),
  setMembershipStatus: (clubId, userId, status) => request(`/admin/memberships/${clubId}/${userId}/status`, { method: 'PUT', body: { status } }),
}

export function setToken(token) {
  localStorage.setItem('tz_token', token)
}
export function removeToken() {
  localStorage.removeItem('tz_token')
}
