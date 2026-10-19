/// <reference types="vite/client" />

/** vite.config.ts의 define으로 빌드 시점에 package.json의 version이 박힌다. */
declare const __APP_VERSION__: string

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_GOOGLE_CLIENT_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
