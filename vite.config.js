import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { headers: { 'Cache-Control': 'no-store' } },
  preview: {
    headers: { 'Cache-Control': 'no-store' },
    allowedHosts: ['.trycloudflare.com']
  }
});
