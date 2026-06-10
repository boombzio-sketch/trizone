// Cloudinary 무서명 업로드 헬퍼.
//
// 셋업 (한 번만, 5분):
//   1. https://cloudinary.com 가입 (무료, 카드 불필요)
//   2. Dashboard 상단의 "Cloud name" 복사
//   3. Settings → Upload → "Add upload preset" 클릭
//      - Signing Mode: "Unsigned" 선택
//      - 저장 후 표시되는 preset 이름 복사
//   4. 아래 두 환경변수를 .env.production / .env.local 에 추가
//        VITE_CLOUDINARY_CLOUD_NAME=xxxxx
//        VITE_CLOUDINARY_UPLOAD_PRESET=xxxxx
//   5. (선택) 같은 preset에서 "Incoming Transformation"에
//        w_1600,q_auto,f_auto 를 설정해두면 업로드 직후 서버에서 자동 압축됨.

const CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

// 업로드 전에 클라이언트에서 1차 압축 (Cloudinary 무료 전송량 절약).
async function compressToBlob(file, maxW = 1600, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(1, maxW / img.width)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('압축 실패')), 'image/jpeg', quality)
    }
    img.onerror = reject
    img.src = url
  })
}

// 환경변수 미설정 시 폴백: 기존처럼 base64 반환 (앱이 안 깨지게).
// 화질보다 용량 우선 — 기록 확인용이라 작게 저장(평균 ~40KB/장 목표).
async function fallbackBase64(file, maxW = 860, quality = 0.5) {
  return new Promise(resolve => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(1, maxW / img.width)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.src = url
  })
}

export async function uploadImage(file, opts = {}) {
  if (!CLOUD || !PRESET) {
    console.warn('[upload] Cloudinary 환경변수 미설정 → base64 폴백')
    return fallbackBase64(file, opts.maxW, opts.quality)
  }
  const blob = await compressToBlob(file, opts.maxW ?? 1600, opts.quality ?? 0.85)
  const fd = new FormData()
  fd.append('file', blob)
  fd.append('upload_preset', PRESET)
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, {
    method: 'POST',
    body: fd,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error?.message || '이미지 업로드 실패')
  return data.secure_url
}

// 캔버스/Blob을 그대로 업로드 (아바타 크롭 결과 등).
export async function uploadBlob(blob) {
  if (!CLOUD || !PRESET) {
    return new Promise(resolve => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.readAsDataURL(blob)
    })
  }
  const fd = new FormData()
  fd.append('file', blob)
  fd.append('upload_preset', PRESET)
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, {
    method: 'POST',
    body: fd,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error?.message || '이미지 업로드 실패')
  return data.secure_url
}

// Cloudinary URL에 표시 사이즈/품질 변환을 주입 (피드 썸네일은 작게 받기).
// 비-Cloudinary URL이나 base64는 그대로 반환.
export function cldUrl(url, { w = 800, q = 'auto', f = 'auto' } = {}) {
  if (!url || typeof url !== 'string') return url
  if (!url.includes('res.cloudinary.com') || !url.includes('/upload/')) return url
  return url.replace('/upload/', `/upload/w_${w},q_${q},f_${f}/`)
}
