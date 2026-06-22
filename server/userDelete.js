const { prepare } = require('./db');

// 한 회원과 그에 딸린 모든 데이터를 삭제한다.
// 회원 탈퇴(본인) 와 관리자 회원삭제가 공통으로 사용한다.
// 실제 FK 제약은 없지만 논리적 종속 순서로 자식 → 부모 순서로 지운다.
async function deleteUserCascade(uid) {
  // 1) 이 회원이 클럽장인 클럽 처리: 남은 승인 멤버에게 위임, 없으면 클럽 자체 삭제
  const ledClubs = await prepare('SELECT id FROM clubs WHERE leader_id = ?').all(uid);
  for (const club of ledClubs) {
    const heir = await prepare(
      `SELECT user_id FROM club_memberships
       WHERE club_id = ? AND user_id != ? AND status = 'approved'
       ORDER BY applied_at ASC LIMIT 1`
    ).get(club.id, uid);
    if (heir) {
      await prepare('UPDATE clubs SET leader_id = ? WHERE id = ?').run(heir.user_id, club.id);
    } else {
      // 남은 멤버가 없는 클럽은 종속 데이터와 함께 삭제
      const trainings = await prepare('SELECT id FROM club_trainings WHERE club_id = ?').all(club.id);
      for (const t of trainings) {
        await prepare('DELETE FROM club_training_participants WHERE training_id = ?').run(t.id);
      }
      await prepare('DELETE FROM club_trainings WHERE club_id = ?').run(club.id);
      await prepare('DELETE FROM club_announcements WHERE club_id = ?').run(club.id);
      await prepare('DELETE FROM club_memberships WHERE club_id = ?').run(club.id);
      await prepare('DELETE FROM clubs WHERE id = ?').run(club.id);
    }
  }

  // 2) 이 회원이 만든 클럽 훈련 + 참가자 삭제
  const myTrainings = await prepare('SELECT id FROM club_trainings WHERE created_by = ?').all(uid);
  for (const t of myTrainings) {
    await prepare('DELETE FROM club_training_participants WHERE training_id = ?').run(t.id);
  }
  await prepare('DELETE FROM club_trainings WHERE created_by = ?').run(uid);

  // 3) 이 회원의 운동기록에 달린 좋아요/댓글 먼저 삭제 후 기록 삭제
  await prepare('DELETE FROM likes WHERE workout_id IN (SELECT id FROM workout_logs WHERE user_id = ?)').run(uid);
  await prepare('DELETE FROM comments WHERE workout_id IN (SELECT id FROM workout_logs WHERE user_id = ?)').run(uid);
  await prepare('DELETE FROM workout_logs WHERE user_id = ?').run(uid);

  // 4) 이 회원이 남긴 좋아요/댓글/팔로우/차단/신고
  await prepare('DELETE FROM likes WHERE user_id = ?').run(uid);
  await prepare('DELETE FROM comments WHERE user_id = ?').run(uid);
  await prepare('DELETE FROM follows WHERE follower_id = ? OR following_id = ?').run(uid, uid);
  await prepare('DELETE FROM blocks WHERE blocker_id = ? OR blocked_id = ?').run(uid, uid);
  await prepare('DELETE FROM reports WHERE reporter_id = ?').run(uid);

  // 5) 클럽 멤버십 / 클럽장 신청 / 훈련 참가
  await prepare('DELETE FROM club_memberships WHERE user_id = ?').run(uid);
  await prepare('DELETE FROM club_leader_applications WHERE user_id = ?').run(uid);
  await prepare('DELETE FROM club_training_participants WHERE user_id = ?').run(uid);

  // 6) 공지(구/클럽) / 대회 / 운영 공지 / 포인트
  await prepare('DELETE FROM announcements WHERE user_id = ?').run(uid);
  await prepare('DELETE FROM club_announcements WHERE user_id = ?').run(uid);
  await prepare('DELETE FROM races WHERE created_by = ?').run(uid);
  await prepare('DELETE FROM notices WHERE created_by = ?').run(uid);
  await prepare('DELETE FROM point_transactions WHERE user_id = ?').run(uid);
  // 다른 회원에게 지급한 내역의 지급자(created_by) 참조는 NULL 처리해 내역 자체는 보존
  await prepare('UPDATE point_transactions SET created_by = NULL WHERE created_by = ?').run(uid);

  // 7) 마지막으로 회원 본체 삭제
  await prepare('DELETE FROM users WHERE id = ?').run(uid);
}

module.exports = { deleteUserCascade };
