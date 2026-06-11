export const C = {
  bg:          '#060D18',
  surface:     '#0C1829',
  surfaceAlt:  '#091320',
  surfaceHigh: '#102038',
  border:      '#1A3050',
  borderLight: '#224068',

  accent:       '#38BDF8',
  accentBg:    'rgba(56,189,248,0.10)',
  accentBorder:'rgba(56,189,248,0.28)',

  text:  '#EFF6FF',
  text2: '#6490B8',
  text3: '#2E4A6A',

  swim:        '#22D3EE',
  swimBg:     'rgba(34,211,238,0.10)',
  swimBorder: 'rgba(34,211,238,0.28)',

  bike:        '#4ADE80',
  bikeBg:     'rgba(74,222,128,0.10)',
  bikeBorder: 'rgba(74,222,128,0.28)',

  run:         '#FB923C',
  runBg:      'rgba(251,146,60,0.10)',
  runBorder:  'rgba(251,146,60,0.28)',

  brick:       '#C084FC',
  brickBg:    'rgba(192,132,252,0.10)',
  brickBorder:'rgba(192,132,252,0.28)',

  error:       '#FF4D6A',
  errorBg:    'rgba(255,77,106,0.10)',
  errorBorder:'rgba(255,77,106,0.30)',

  success:       '#10F090',
  successBg:    'rgba(16,240,144,0.10)',
  successBorder:'rgba(16,240,144,0.28)',

  gold:       '#FBBF24',
  goldBg:    'rgba(251,191,36,0.12)',

  warn:       '#FB923C',
  warnBg:    'rgba(251,146,60,0.12)',
  warnBorder:'rgba(251,146,60,0.30)',
}

export const sportColor  = t => ({ swim: C.swim,  bike: C.bike,  run: C.run,  brick: C.brick  }[t] || C.accent)
export const sportBg     = t => ({ swim: C.swimBg, bike: C.bikeBg, run: C.runBg, brick: C.brickBg }[t] || C.accentBg)
export const sportBorder = t => ({ swim: C.swimBorder, bike: C.bikeBorder, run: C.runBorder, brick: C.brickBorder }[t] || C.accentBorder)
