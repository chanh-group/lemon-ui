import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] }), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': import.meta.dirname + '/src',
    },
  },
  build: {
    rolldownOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react'
          }
          if (id.includes('node_modules/react-router')) {
            return 'vendor-router'
          }
          if (id.includes('node_modules/@tanstack')) {
            return 'vendor-query'
          }
          if (id.includes('node_modules/react-hook-form') || id.includes('node_modules/@hookform')) {
            return 'vendor-form'
          }
          if (id.includes('node_modules/radix-ui') || id.includes('node_modules/@radix-ui')) {
            return 'vendor-radix'
          }
          if (id.includes('node_modules/zod')) {
            return 'vendor-zod'
          }
          if (id.includes('node_modules/axios')) {
            return 'vendor-axios'
          }
          if (id.includes('node_modules/zustand')) {
            return 'vendor-zustand'
          }
        },
      },
    },
  },
})
