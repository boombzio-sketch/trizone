import { Outlet, NavLink } from 'react-router-dom'

const tabs = [
  { to: '/',        icon: '🏠', label: '피드' },
  { to: '/ranking', icon: '🏆', label: '랭킹' },
  { to: '/workout', icon: '💪', label: '훈련' },
  { to: '/club',    icon: '👥', label: '클럽' },
  { to: '/my',      icon: '👤', label: 'MY' },
]

export default function Layout() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', background: '#080B10' }}>
      <header style={{
        background: '#0C1420', borderBottom: '1px solid #16202E',
        padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.04em', color: '#E8E6E0' }}>
          TRI<span style={{ color: '#4DB8FF' }}>ZONE</span>
        </div>
        <div style={{ fontSize: 11, color: '#4A5A6A', fontWeight: 600 }}>철인3종 훈련 관리</div>
      </header>

      <main style={{ flex: 1, overflowY: 'auto', paddingBottom: 72 }}>
        <Outlet />
      </main>

      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#0C1420', borderTop: '1px solid #16202E',
        display: 'flex', zIndex: 100,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {tabs.map(t => (
          <NavLink key={t.to} to={t.to} end={t.to === '/'}
            style={({ isActive }) => ({
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '7px 4px', gap: 2, fontSize: 9, fontWeight: 600,
              color: isActive ? '#4DB8FF' : '#3A4A5A',
              textDecoration: 'none', transition: 'color 0.15s',
            })}
          >
            <span style={{ fontSize: 18 }}>{t.icon}</span>
            {t.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
