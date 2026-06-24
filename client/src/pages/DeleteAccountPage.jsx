import { useNavigate } from 'react-router-dom'
import { C } from '../utils/theme'

export default function DeleteAccountPage() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100dvh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, overflowY: 'auto' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.05em', color: C.text }}>
            TRI<span style={{ color: C.accent }}>ZONE</span>
          </div>
          <div style={{ fontSize: 13, color: C.text2, marginTop: 6 }}>계정 삭제 안내</div>
        </div>

        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 16 }}>
            계정 및 데이터 삭제 방법
          </div>
          <ol style={{ paddingLeft: 20, margin: 0, color: C.text2, fontSize: 14, lineHeight: 2 }}>
            <li>TRIZONE에 <strong style={{ color: C.text }}>로그인</strong>합니다.</li>
            <li>하단 탭에서 <strong style={{ color: C.text }}>마이페이지</strong>로 이동합니다.</li>
            <li>화면 하단의 <strong style={{ color: C.error }}>회원 탈퇴</strong> 버튼을 누릅니다.</li>
            <li>안내에 따라 확인 후 탈퇴를 완료합니다.</li>
          </ol>
          <div style={{ marginTop: 18, background: C.errorBg, border: `1px solid ${C.errorBorder}`, borderRadius: 10, padding: '12px 14px', fontSize: 13, color: C.error, lineHeight: 1.6 }}>
            탈퇴 시 계정과 운동기록, 게시물 등 모든 데이터가 영구 삭제되며 복구할 수 없습니다.
          </div>
        </div>

        <button onClick={() => navigate('/login')} style={{ width: '100%', marginTop: 24, padding: '15px', background: C.accent, color: '#fff', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>
          로그인하러 가기
        </button>
      </div>
    </div>
  )
}
