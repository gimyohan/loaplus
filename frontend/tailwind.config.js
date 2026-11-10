/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // 강조색 두 가지(docs/design.md) — primary(파랑) = 선택·활성·링크, secondary(초록) = 주요
        // 실행·성공. DEFAULT는 글씨·테두리용 밝은 톤, strong은 흰 글씨를 얹는 면용 짙은 톤.
        primary: {
          DEFAULT: 'rgb(var(--primary) / <alpha-value>)',
          strong: 'rgb(var(--primary-strong) / <alpha-value>)',
          foreground: 'rgb(var(--primary-foreground) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'rgb(var(--secondary) / <alpha-value>)',
          strong: 'rgb(var(--secondary-strong) / <alpha-value>)',
          foreground: 'rgb(var(--secondary-foreground) / <alpha-value>)',
        },
        sidebar: {
          DEFAULT: 'rgb(var(--sidebar) / <alpha-value>)',
          foreground: 'rgb(var(--sidebar-foreground) / <alpha-value>)',
        },
        // 레이드 위젯의 골드/귀속골드 색 구분 전용 — primary/secondary 두 색만 쓴다는 원칙(위 참고)의
        // 예외로, 재화 종류를 색으로 구분해야 하는 자리에서만 쓴다(차트 카테고리 색과 같은 성격).
        gold: 'rgb(var(--gold) / <alpha-value>)',
        // 레이아웃에 필요한 중립 톤 (라이트/다크 모드 대응)
        background: 'rgb(var(--background) / <alpha-value>)',
        foreground: 'rgb(var(--foreground) / <alpha-value>)',
        card: {
          DEFAULT: 'rgb(var(--card) / <alpha-value>)',
          foreground: 'rgb(var(--card-foreground) / <alpha-value>)',
        },
        border: 'rgb(var(--border) / <alpha-value>)',
        muted: {
          DEFAULT: 'rgb(var(--muted) / <alpha-value>)',
          foreground: 'rgb(var(--muted-foreground) / <alpha-value>)',
        },
        // 통계 차트 카테고리 색상 5슬롯(고정 순서) — docs/design.typ의 primary/secondary 제약은
        // UI 요소 대상이고, 카테고리를 구분해야 하는 차트에는 적용되지 않는다.
        chart: {
          1: 'rgb(var(--chart-1) / <alpha-value>)',
          2: 'rgb(var(--chart-2) / <alpha-value>)',
          3: 'rgb(var(--chart-3) / <alpha-value>)',
          4: 'rgb(var(--chart-4) / <alpha-value>)',
          5: 'rgb(var(--chart-5) / <alpha-value>)',
        },
      },
      fontFamily: {
        // 라틴/숫자는 Lato, 한글은 Noto Sans KR(index.html에서 Google Fonts로 불러옴)
        sans: ['Lato', '"Noto Sans KR"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        xl: 'calc(var(--radius) + 4px)',
      },
    },
  },
  plugins: [],
}
