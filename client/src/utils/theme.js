export const C = {
  bg: '#0B0F1A',
  surface: '#111827',
  surfaceAlt: '#0E1624',
  surfaceHigh: '#172236',
  border: '#1E2D42',
  borderLight: '#24364E',

  accent: '#4F9CF9',
  accentBg: 'rgba(79,156,249,0.12)',
  accentBorder: 'rgba(79,156,249,0.3)',

  text: '#F1F5F9',
  text2: '#64748B',
  text3: '#334155',

  swim: '#0EA5E9',
  swimBg: 'rgba(14,165,233,0.12)',
  swimBorder: 'rgba(14,165,233,0.25)',

  bike: '#22C55E',
  bikeBg: 'rgba(34,197,94,0.12)',
  bikeBorder: 'rgba(34,197,94,0.25)',

  run: '#F97316',
  runBg: 'rgba(249,115,22,0.12)',
  runBorder: 'rgba(249,115,22,0.25)',

  brick: '#A855F7',
  brickBg: 'rgba(168,85,247,0.12)',
  brickBorder: 'rgba(168,85,247,0.25)',

  error: '#EF4444',
  errorBg: 'rgba(239,68,68,0.1)',
  errorBorder: 'rgba(239,68,68,0.3)',

  success: '#10B981',
  successBg: 'rgba(16,185,129,0.1)',
  successBorder: 'rgba(16,185,129,0.3)',

  gold: '#F59E0B',
  goldBg: 'rgba(245,158,11,0.15)',
  goldBorder: 'rgba(245,158,11,0.3)',

  warn: '#FB923C',
  warnBg: 'rgba(251,146,60,0.12)',
  warnBorder: 'rgba(251,146,60,0.3)',
}

export const sportC   = t => ({ swim: C.swim,       bike: C.bike,       run: C.run,       brick: C.brick       }[t] || C.accent)
export const sportBg  = t => ({ swim: C.swimBg,     bike: C.bikeBg,     run: C.runBg,     brick: C.brickBg     }[t] || C.accentBg)
export const sportBor = t => ({ swim: C.swimBorder, bike: C.bikeBorder, run: C.runBorder, brick: C.brickBorder }[t] || C.accentBorder)
