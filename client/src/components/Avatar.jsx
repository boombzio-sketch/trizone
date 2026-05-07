import { C } from '../utils/theme'

export default function Avatar({ nickname, avatar_color, avatar_image, size = 36, fontSize, style = {}, onClick }) {
  const color = avatar_color || C.accent
  const fs = fontSize || Math.max(10, Math.round(size * 0.38))
  const base = { width: size, height: size, borderRadius: '50%', flexShrink: 0, border: `2px solid ${color}`, cursor: onClick ? 'pointer' : 'default', ...style }

  if (avatar_image) {
    return <img src={avatar_image} alt={nickname?.charAt(0) || '?'} onClick={onClick} style={{ ...base, objectFit: 'cover', display: 'block' }} />
  }
  return (
    <div onClick={onClick} style={{ ...base, background: color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: fs, fontWeight: 800, color }}>
      {nickname?.charAt(0) || '?'}
    </div>
  )
}
