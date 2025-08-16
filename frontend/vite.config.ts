import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const repoName = 'monitokyogas';

  return {
    base: mode === 'production' ? `/${repoName}/` : '/',
    plugins: [vue()],
  }
})
