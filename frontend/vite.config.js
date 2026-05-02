import path from "path";
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // 1. Add this import

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // 2. Add this to the plugins array
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src",),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5555',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            if (res.writeHead && !res.headersSent) {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ message: 'Backend unavailable. Please ensure the server is running.' }));
            }
          });
        },
      },
    },
  },
})
