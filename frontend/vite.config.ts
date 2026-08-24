import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
