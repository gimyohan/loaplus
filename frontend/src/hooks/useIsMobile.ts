import { useEffect, useState } from 'react'

// Sidebar가 접히고 펼쳐지는 기준(Tailwind md, Sidebar.tsx의 `hidden md:flex`)과 똑같이 맞춰서
// "모바일"의 정의가 레이아웃 전체에서 하나로 일관되게 한다.
const MOBILE_QUERY = '(max-width: 767px)'

/** 현재 뷰포트가 모바일 폭(md 미만)인지 실시간으로 반환한다. */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches,
  )

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_QUERY)
    const handleChange = () => setIsMobile(mediaQuery.matches)
    handleChange()
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return isMobile
}
