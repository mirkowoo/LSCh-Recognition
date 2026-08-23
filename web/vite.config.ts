import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // onnxruntime-web trae binarios .wasm que no deben pasar por el bundler.
  optimizeDeps: { exclude: ['onnxruntime-web'] },
  server: {
    headers: {
      // Habilitan WASM multihilo en desarrollo. En produccion dependen del
      // hosting: si Praxsuite no permite fijarlas, se cae a monohilo (ver plan A.4).
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
});
