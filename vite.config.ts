import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import {
  handleCmsProxy,
  handleImageProxy,
  handleDoubanProxy,
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore — JS module
} from './server/proxy-handlers.mjs';

const apiProxyPlugin: Plugin = {
  name: 'vodhub-api-proxy',
  configureServer(server) {
    server.middlewares.use('/api/cms', handleCmsProxy);
    server.middlewares.use('/api/image', handleImageProxy);
    server.middlewares.use('/api/douban', handleDoubanProxy);
  },
};

export default defineConfig({
  plugins: [react(), tailwindcss(), apiProxyPlugin],
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
  resolve: {
    alias: {
      '@': '/src',
      '~': '/public',
      // @ouonnki/cms-core has a broken "development" export pointing to non-existent src/
      '@ouonnki/cms-core': '/node_modules/@ouonnki/cms-core/dist/index.js',
      '@ouonnki/cms-core/m3u8': '/node_modules/@ouonnki/cms-core/dist/m3u8/index.js',
    },
    conditions: ['import', 'module', 'browser', 'default'],
  },
});
