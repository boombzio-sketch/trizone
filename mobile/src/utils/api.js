import * as SecureStore from 'expo-secure-store'

const BASE = 'https://trizone-server.onrender.com/api'
const TOKEN_KEY = 'tz_token'

export async function getToken() {
  return await SecureStore.getItemAsync(TOKEN_KEY)
}

export async function setToken(token) {
  await SecureStore.setItemAsync(TOKEN_KEY, token)
}

export async function removeToken() {
  await SecureStore.deleteItemAsync(TOKEN_KEY)
}

async function request(path, options = {}) {
  const token = await getToken()
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
  register:      (body) => request('/auth/register', { method: 'POST', body }),
  login:         (body) => request('/auth/login', { method: 'POST', body }),
  me:            ()     => request('/auth/me'),
  updateProfile: (body) => request('/users/me', { method: 'PUT', body }),

  // 훈련 기록
  getWorkouts:  (params = '') => request(`/workouts?${params}`),
  addWorkout:   (body)        => request('/workouts', { method: 'POST', body }),
  editWorkout:  (id, body)    => request(`/workouts/${id}`, { method: 'PUT', body }),
  deleteWorkout:(id)          => request(`/workouts/${id}`, { method: 'DELETE' }),
  myStats:      ()            => request('/workouts/stats/me'),

  // 랭킹
  getRanking: (period, sport, scope = 'club', club_id) =>
    request(`/ranking?period=${period}&sport=${sport}&scope=${scope}${club_id ? `&club_id=${club_id}` : ''}`),
  getRankingCustom: (from, to, sport, scope = 'club', club_id) =>
    request(`/ranking?period=custom&from=${from}&to=${to}&sport=${sport}&scope=${scope}${club_id ? `&club_id=${club_id}` : ''}`),

  // 클럽
  getClubs:        (region) => request(`/clubs${region && region !== '전체' ? `?region=${encodeURIComponent(region)}` : ''}`),
  getClub:         (id)     => request(`/clubs/${id}`),
  getMyClubs:      ()       => request('/clubs/mine'),
  getMyLeaderApp:  ()       => request('/clubs/my-leader-app'),
  createClub:      (body)   => request('/clubs', { method: 'POST', body }),
  getClubMembership:     (id)            => request(`/clubs/${id}/membership`),
  getClubMembers:        (id)            => request(`/clubs/${id}/members`),
  getClubPendingMembers: (id)            => request(`/clubs/${id}/pending-members`),
  setClubMemberStatus:   (cid,uid,s)     => request(`/clubs/${cid}/members/${uid}/status`, { method:'PUT', body:{ status:s } }),
  joinClubById:          (id, message)   => request(`/clubs/${id}/join`, { method: 'POST', body: { message } }),
  leaveClubById:         (id)            => request(`/clubs/${id}/leave`, { method: 'DELETE' }),
  getClubAnnouncements:  (id)            => request(`/clubs/${id}/announcements`),
  postClubAnnouncement:  (id, body)      => request(`/clubs/${id}/announcements`, { method:'POST', body }),
  deleteClubAnnouncement:(cid,aid)       => request(`/clubs/${cid}/announcements/${aid}`, { method:'DELETE' }),
  getClubTrainings:      (id)            => request(`/clubs/${id}/trainings`),
  createClubTraining:    (id, body)      => request(`/clubs/${id}/trainings`, { method:'POST', body }),
  updateClubTraining:    (id,tid,body)   => request(`/clubs/${id}/trainings/${tid}`, { method:'PUT', body }),
  deleteClubTraining:    (id,tid)        => request(`/clubs/${id}/trainings/${tid}`, { method:'DELETE' }),
  joinClubTraining:      (id,tid)        => request(`/clubs/${id}/trainings/${tid}/join`, { method:'POST' }),
  leaveClubTraining:     (id,tid)        => request(`/clubs/${id}/trainings/${tid}/leave`, { method:'DELETE' }),
  getTrainingParticipants:(id,tid)       => request(`/clubs/${id}/trainings/${tid}/participants`),
  updateClub:            (id, body)      => request(`/clubs/${id}`, { method:'PUT', body }),
  deleteClub:            (id)            => request(`/clubs/${id}`, { method:'DELETE' }),
  transferClubLeader:    (id, newLeaderId) => request(`/clubs/${id}/transfer-leader`, { method:'PUT', body:{ new_leader_id: newLeaderId } }),
  setClubMemberClubRole: (cid,uid,role)  => request(`/clubs/${cid}/members/${uid}/club-role`, { method:'PUT', body:{ club_role: role } }),

  // 대회
  getRaces:    ()           => request('/races'),
  addRace:     (body)       => request('/races', { method: 'POST', body }),
  updateRace:  (id, body)   => request(`/races/${id}`, { method: 'PUT', body }),
  deleteRace:  (id)         => request(`/races/${id}`, { method: 'DELETE' }),

  // 소셜 - 피드
  getFeed:        () => request('/social/feed'),
  getClubFeed:    () => request('/social/feed/club'),
  getMyFeed:      () => request('/social/feed/mine'),
  getAllFeed:      () => request('/social/feed/all'),

  // 소셜 - 좋아요/댓글
  likeWorkout:    (id)         => request(`/social/like/${id}`, { method: 'POST' }),
  getLikes:       (id)         => request(`/social/likes/${id}`),
  getComments:    (id)         => request(`/social/comments/${id}`),
  postComment:    (id, body)   => request(`/social/comments/${id}`, { method: 'POST', body }),
  deleteComment:  (id)         => request(`/social/comments/${id}`, { method: 'DELETE' }),

  // 소셜 - 프로필/팔로우
  getProfile:     (id)         => request(`/social/profile/${id}`),
  getFollowers:   (id)         => request(`/social/followers/${id}`),
  getFollowing:   (id)         => request(`/social/following/${id}`),
  follow:         (id)         => request(`/social/follow/${id}`, { method: 'POST' }),
  unfollow:       (id)         => request(`/social/follow/${id}`, { method: 'DELETE' }),
  searchUsers:    (q)          => request(`/social/users/search?q=${encodeURIComponent(q)}`),

  // 쪽지
  sendMessage:  (body) => request('/messages', { method: 'POST', body: { body } }),
  getMyMessages: ()    => request('/messages/mine'),
  getThread:    (id)   => request(`/messages/${id}/thread`),

  // 비밀번호 재설정
  requestReset:     (email) => request('/auth/request-reset', { method: 'POST', body: { email } }),
  resetPassword:    (body)  => request('/auth/reset-password', { method: 'POST', body }),

  // 관리자
  issueResetToken:   (id)          => request(`/admin/members/${id}/reset-token`, { method: 'POST' }),
  getPendingWorkouts: ()           => request('/admin/pending'),
  setWorkoutStatus:  (id, status)  => request(`/admin/workouts/${id}/status`, { method: 'PUT', body: { status } }),
  getAdminMembers:   ()            => request('/admin/members'),
  updateAdminMember: (id, body)    => request(`/admin/members/${id}`, { method: 'PUT', body }),
  setAdminMemberRole:(id, role)    => request(`/admin/members/${id}/role`, { method: 'PUT', body: { role } }),
  deleteAdminMember: (id)          => request(`/admin/members/${id}`, { method: 'DELETE' }),
  getInbox:          ()            => request('/messages/inbox'),
  getThread:         (id)          => request(`/messages/${id}/thread`),
  replyMessage:      (id, body)    => request(`/messages/${id}/reply`, { method: 'POST', body: { body } }),
  getPendingMemberships: ()        => request('/admin/memberships'),
  setMembershipStatus: (clubId, userId, status) =>
    request(`/admin/memberships/${clubId}/${userId}/status`, { method: 'PUT', body: { status } }),
}
