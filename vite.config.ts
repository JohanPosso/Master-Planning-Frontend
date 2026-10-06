import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// En desarrollo /api se redirige al backend (jornada-backend) para evitar CORS.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { proxy: { '/api': process.env.API_PROXY_TARGET ?? 'http://localhost:3000' } }
});
