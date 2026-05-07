import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { C } from '../utils/theme'
import Avatar from './Avatar.jsx'
import { useState, useEffect } from 'react'
import { api } from '../utils/api'

const NOTIF_KEY = 'tz_notif_last_check'

const TABS = [
  { to: '/',        icon: '⚡', label: '피드' },
  { to: '/ranking', icon: '🏆', label: '랭킹' },
  { to: '/clubs',   icon: '👥', label: '클럽' },
  { to: '/races',   icon: '🏁', label: '대회' },
]

export default function Layout() {
  const { user } = useAuth()
  const location = useLocation()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    if (!user) return
    const since = localStorage.getItem(NOTIF_KEY) || '1970-01-01'
    api.getUnreadCount(since).then(r => setUnread(r.count)).catch(() => {})
  }, [user])

  useEffect(() => {
    if (location.pathname === '/') {
      localStorage.setItem(NOTIF_KEY, new Date().toISOString())
      setUnread(0)
    }
  }, [location.pathname])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', background: C.bg }}>
      <header style={{
        background: C.surface, borderBottom: `1px solid ${C.border}`,
        height: 56, padding: '0 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <NavLink to="/" style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.05em', color: C.text, textDecoration: 'none' }}>
          TRI<span style={{ color: C.accent }}>ZONE</span>
        </NavLink>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {(user?.role === 'admin' || user?.can_approve) && (
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
            <Avatar nickname={user?.nickname} avatar_color={user?.avatar_color} avatar_image={user?.avatar_image} size={24} />
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
            <span style={{ fontSize: 20, lineHeight: 1, position: 'relative', display: 'inline-block' }}>
              {t.icon}
              {t.to === '/' && unread > 0 && (
                <span style={{ position: 'absolute', top: -2, right: -4, minWidth: 14, height: 14, borderRadius: 99, background: '#ef4444', color: '#fff', fontSize: 8, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </span>
            {t.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
