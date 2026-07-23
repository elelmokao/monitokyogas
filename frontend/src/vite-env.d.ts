/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GITHUB_OWNER?: string;
  readonly VITE_GITHUB_REPO?: string;
  readonly VITE_DATA_BRANCH?: string;
  readonly VITE_BASE_PATH?: string;
  readonly VITE_HIGH_USAGE_KWH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
