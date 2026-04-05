import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'mask-icon.svg'],
        manifest: {
          name: 'WK Prognose 2026 De Lijn',
          short_name: 'WK 2026',
          description: 'Voorspel de WK 2026 uitslagen met collega\'s van De Lijn.',
          theme_color: '#10b981',
          background_color: '#0f172a',
          display: 'standalone',
          icons: [
            {
              src: 'https://api.dicebear.com/7.x/avataaars/svg?seed=WK2026&backgroundColor=10b981',
              sizes: '192x192',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            },
            {
              src: 'https://api.dicebear.com/7.x/avataaars/svg?seed=WK2026&backgroundColor=10b981',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
