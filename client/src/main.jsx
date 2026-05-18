import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// 앱 로드 즉시 서버 워밍업 ping (Render 콜드 스타트 대응)
const HEALTH = (import.meta.env.VITE_API_URL || '') + '/api/health'
function ping() { fetch(HEALTH).catch(() => {}) }
ping()
setInterval(ping, 10 * 60 * 1000) // 10분마다 재ping

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
