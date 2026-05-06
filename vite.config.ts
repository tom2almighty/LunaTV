import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — JS module shared by dev middleware and serverless functions
import { handleApiRequest } from './server/api-core.mjs';

async function sendWebResponse(webResp: Response, res: import('http').ServerResponse) {
  res.statusCode = webResp.status;
  webResp.headers.forEach((value, key) => res.setHeader(key, value));
  if (!webResp.body) {
    res.end();
    return;
  }
  const reader = webResp.body.getReader();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) res.write(Buffer.from(value));
    }
    res.end();
  } catch {
    if (!res.headersSent) res.statusCode = 500;
    res.end('api error');
  }
}

function createApiPlugin(env: Record<string, string>): Plugin {
  return {
    name: 'vodhub-api-functions-dev',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next();

        const origin = `http://${req.headers.host || 'localhost:3000'}`;
        const chunks: Buffer[] = [];
        req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        req.on('end', () => {
          const body = chunks.length ? Buffer.concat(chunks) : undefined;
          const request = new Request(new URL(req.url || '/', origin), {
            method: req.method,
            headers: req.headers as HeadersInit,
            body,
            // @ts-expect-error Node requires duplex for streamed/request bodies.
            duplex: body ? 'half' : undefined,
          });
          handleApiRequest(request, env).then((webResp: Response) => sendWebResponse(webResp, res));
        });
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), tailwindcss(), createApiPlugin(env)],
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
  };
});
