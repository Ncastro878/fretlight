import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

// Two apps in one repo: Fretlight at / and Tone Lab at /tone/.
// Tone Lab lives entirely under src/tone/ so it can move to its own repo later.
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        tone: resolve(__dirname, 'tone/index.html'),
      },
    },
  },
})
