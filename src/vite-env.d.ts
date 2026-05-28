/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FFLOGS_PROXY_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
