import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { devApi } from './api/_lib/devApi.js';

export default defineConfig(({ mode }) => {
  const env = { ...process.env, ...loadEnv(mode, process.cwd(), ''), NODE_ENV: 'development' };
  return { plugins: [react(), devApi(env)] };
});
