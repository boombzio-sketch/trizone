export const C = {
  // 배경 — 깊고 드라마틱한 네이비 블랙
  bg:          '#060D18',
  surface:     '#0C1829',
  surfaceAlt:  '#091320',
  surfaceHigh: '#102038',
  border:      '#1A3050',
  borderLight: '#224068',

  // 브랜드 강조색 — 일렉트릭 스카이 블루
  accent:       '#38BDF8',
  accentBg:    'rgba(56,189,248,0.10)',
  accentBorder:'rgba(56,189,248,0.28)',

  // 텍스트 — 약간 블루 틴트로 차갑고 선명하게
  text:  '#EFF6FF',
  text2: '#6490B8',
  text3: '#2E4A6A',

  // 종목 — 채도 높여 에너지감 강조
  swim:       '#22D3EE',   // 비비드 시안 — 물
  swimBg:    'rgba(34,211,238,0.10)',
  swimBorder:'rgba(34,211,238,0.28)',

  bike:       '#4ADE80',   // 일렉트릭 그린 — 스피드
  bikeBg:    'rgba(74,222,128,0.10)',
  bikeBorder:'rgba(74,222,128,0.28)',

  run:        '#FB923C',   // 파이어 오렌지 — 에너지
  runBg:     'rgba(251,146,60,0.10)',
  runBorder: 'rgba(251,146,60,0.28)',

  brick:      '#C084FC',   // 비비드 퍼플 — 멀티스포츠
  brickBg:   'rgba(192,132,252,0.10)',
  brickBorder:'rgba(192,132,252,0.28)',

  // 상태색
  error:       '#FF4D6A',
  errorBg:    'rgba(255,77,106,0.10)',
  errorBorder:'rgba(255,77,106,0.30)',

  success:       '#10F090',
  successBg:    'rgba(16,240,144,0.10)',
  successBorder:'rgba(16,240,144,0.28)',

  gold:       '#FBBF24',
  goldBg:    'rgba(251,191,36,0.12)',
  goldBorder:'rgba(251,191,36,0.30)',

  warn:       '#FB923C',
  warnBg:    'rgba(251,146,60,0.12)',
  warnBorder:'rgba(251,146,60,0.30)',
}

// 카드 공통 스타일 헬퍼
export const cardBase = {
  background: 'linear-gradient(160deg, #0E1E34 0%, #091320 100%)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 18,
  boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
}

export const cardSport = (color) => ({
  ...cardBase,
  borderTop: `2px solid ${color}`,
  boxShadow: `0 4px 24px rgba(0,0,0,0.5), 0 0 16px ${color}18`,
})

export const sportC   = t => ({ swim: C.swim,       bike: C.bike,       run: C.run,       brick: C.brick       }[t] || C.accent)
export const sportBg  = t => ({ swim: C.swimBg,     bike: C.bikeBg,     run: C.runBg,     brick: C.brickBg     }[t] || C.accentBg)
export const sportBor = t => ({ swim: C.swimBorder, bike: C.bikeBorder, run: C.runBorder, brick: C.brickBorder }[t] || C.accentBorder)
