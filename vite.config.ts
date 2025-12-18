import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import compression from 'vite-plugin-compression'

export default defineConfig({
  plugins: [
    react(),
    compression({
      algorithm: 'gzip',
      ext: '.gz',
    }),
  ],
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'speech-sdk': ['microsoft-cognitiveservices-speech-sdk'],
          'copilot-sdk': ['@microsoft/agents-copilotstudio-client'],
          'azure-auth': ['@azure/msal-browser', '@azure/msal-react'],
          'vendor': ['react', 'react-dom', 'react-markdown'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    cssCodeSplit: true,
  },
})
