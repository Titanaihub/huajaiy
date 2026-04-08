import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { defineConfig } from 'vite'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/tailadmin-template/' : '/',
  plugins: [
    vue(),
    vueJsx(),
    vueDevTools(),
    {
      name: 'huajaiy-tailadmin-bridge',
      transformIndexHtml(html) {
        if (command !== 'build') return html
        return html.replace(
          '</body>',
          '    <script src="/tailadmin-template/huajaiy-tailadmin-bridge.js" defer></script>\n  </body>'
        )
      }
    }
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    /** ส่งออกตรงไปที่ Next `public` — deploy เว็บครั้งเดียว */
    outDir: fileURLToPath(new URL('../web/public/tailadmin-template', import.meta.url)),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
}))
