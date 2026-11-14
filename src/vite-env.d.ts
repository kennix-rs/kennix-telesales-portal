/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** `api` uses the KENNIX backend; anything else (default) uses the local preview data. */
  readonly VITE_DATA_MODE?: 'local' | 'api'
  /** Backend base URL, default http://localhost:8000/api/v1. */
  readonly VITE_API_URL?: string
  /** `false` hides the preview accounts on the sign-in page in API mode. */
  readonly VITE_PREVIEW_LOGINS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
