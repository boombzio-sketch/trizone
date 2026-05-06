import { Outlet, NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { C } from '../utils/theme'

const TABS = [
  { to: '/',        icon: '⚡', label: '피드' },
  { to: '/ranking', icon: '🏆', label: '랭킹' },
  { to: '/workout', icon: '💪', label: '훈련' },
  { to: '/races',   icon: '🏁', label: '대회' },
  { to: '/club',    icon: '👥', label: '클럽' },
  { to: '/my',      icon: '👤', label: 'MY' },
]

export default function Layout() {
  const { user } = useAuth()
  const tabs = user?.role === 'admin' ? [...TABS, { to: '/admin', icon: '⚙️', label: '관리' }] : TABS

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', background: C.bg }}>
      <header style={{
        background: C.surface, borderBottom: `1px solid ${C.border}`,
        height: 56, padding: '0 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.05em', color: C.text }}>
          TRI<span style={{ color: C.accent }}>ZONE</span>
        </div>
        <div style={{
          width: 34, height: 34, borderRadius: '50%',
          background: (user?.avatar_color || C.accent) + '22',
          border: `2px solid ${user?.avatar_color || C.accent}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 800, color: user?.avatar_color || C.accent,
        }}>
          {user?.nickname?.charAt(0)}
        </div>
      </header>

      <main style={{ flex: 1, overflowY: 'auto', paddingBottom: 72 }}>
        <Outlet />
      </main>

      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: C.surface, borderTop: `1px solid ${C.border}`,
        display: 'flex', zIndex: 100,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {tabs.map(t => (
          <NavLink key={t.to} to={t.to} end={t.to === '/'}
            style={({ isActive }) => ({
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '8px 4px 7px', gap: 3,
              fontSize: 9, fontWeight: 700, letterSpacing: '0.03em',
              color: isActive ? C.accent : C.text2,
              textDecoration: 'none',
              borderTop: isActive ? `2px solid ${C.accent}` : '2px solid transparent',
            })}
          >
            <span style={{ fontSize: 20, lineHeight: 1 }}>{t.icon}</span>
            {t.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
