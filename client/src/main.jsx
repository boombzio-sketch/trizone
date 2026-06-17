import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// 첫 워밍 ping은 index.html <head>에서 이미 실행됨(번들 로드와 병렬).
// 여기서는 세션 유지용 주기적 재ping만 담당 (Render 15분 슬립 방지).
const HEALTH = (import.meta.env.VITE_API_URL || '') + '/api/health'
setInterval(() => { fetch(HEALTH).catch(() => {}) }, 10 * 60 * 1000)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// 첫 화면에 필요한 청크를 유휴 시간에 선행 로드 → 인증 해소 후 라우팅 시 추가 왕복 제거.
// (App이 lazy로 부르는 것과 동일 모듈이라 Vite가 청크를 중복 없이 재사용)
function warmFirstScreenChunks() {
  import('./components/Layout.jsx')
  import('./pages/FeedPage.jsx')
  import('./pages/LoginPage.jsx')
}
if ('requestIdleCallback' in window) requestIdleCallback(warmFirstScreenChunks, { timeout: 2000 })
else setTimeout(warmFirstScreenChunks, 1200)
