import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { compress } from 'hono/compress';
import apiApp from './server/app.mjs';

const app = new Hono();

app.use('*', compress());

app.route('/', apiApp);

app.use('/assets/*', serveStatic({ root: './dist' }));
app.use('*', serveStatic({ root: './dist' }));

// SPA fallback for client-side routes
app.get('*', serveStatic({ path: './dist/index.html' }));

const port = Number(process.env.PORT) || 3000;
serve({ fetch: app.fetch, port, hostname: '0.0.0.0' });
console.log(`vodhub running on port ${port}`);
