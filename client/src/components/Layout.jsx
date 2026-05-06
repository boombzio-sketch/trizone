import { Outlet, NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { C } from '../utils/theme'

const TABS = [
  { to: '/',        icon: '⚡', label: '피드' },
  { to: '/ranking', icon: '🏆', label: '랭킹' },
  { to: '/races',   icon: '🏁', label: '대회' },
  { to: '/clubs',   icon: '👥', label: '클럽' },
]

export default function Layout() {
  const { user } = useAuth()

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

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {user?.role === 'admin' && (
            <NavLink to="/admin" style={({ isActive }) => ({
              padding: '6px 12px', borderRadius: 10, textDecoration: 'none',
              fontSize: 12, fontWeight: 700,
              background: isActive ? C.accentBg : C.surfaceAlt,
              color: isActive ? C.accent : C.text2,
              border: `1px solid ${isActive ? C.accentBorder : C.border}`,
            })}>
              ⚙️ 관리
            </NavLink>
          )}
          <NavLink to="/my" style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: 7,
            background: isActive
              ? (user?.avatar_color || C.accent) + '25'
              : (user?.avatar_color || C.accent) + '15',
            border: `1.5px solid ${(user?.avatar_color || C.accent) + (isActive ? '90' : '60')}`,
            borderRadius: 100, padding: '5px 12px 5px 6px',
            textDecoration: 'none',
          })}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%',
              background: (user?.avatar_color || C.accent) + '30',
              border: `1.5px solid ${user?.avatar_color || C.accent}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 800, color: user?.avatar_color || C.accent, flexShrink: 0,
            }}>
              {user?.nickname?.charAt(0)}
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.text, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.nickname}
            </span>
          </NavLink>
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
        {TABS.map(t => (
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
