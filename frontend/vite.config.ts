import { readFileSync } from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 앱 버전의 단일 출처는 package.json의 version이다(git 태그 v{version}과 항상 같게 유지).
const { version } = JSON.parse(readFileSync(path.resolve(import.meta.dirname, './package.json'), 'utf-8')) as {
  version: string
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    // 기본 5173은 Windows가 Hyper-V/WSL용으로 동적 예약하는 포트 제외 범위(5082-5181)에 걸려
    // EACCES가 날 수 있어(`netsh interface ipv6 show excludedportrange protocol=tcp`로 확인),
    // 그 범위 밖의 포트를 기본값으로 쓴다.
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
  },
})
