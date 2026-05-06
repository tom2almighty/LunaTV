import express from 'express';
import { handleApiRequest } from './server/api-core.mjs';

const app = express();

async function sendWebResponse(webResp, res) {
  res.status(webResp.status);
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
    if (!res.headersSent) res.status(500);
    res.end('api error');
  }
}

// Development/legacy convenience only. Static SaaS deployments should use the
// platform functions in api/, functions/ or netlify/functions/.
app.use('/api', (req, res) => {
  const origin = `${req.protocol}://${req.headers.host || 'localhost'}`;
  const chunks = [];
  req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
  req.on('end', () => {
    const body = chunks.length ? Buffer.concat(chunks) : undefined;
    const request = new Request(new URL(req.originalUrl || req.url || '/', origin), {
      method: req.method,
      headers: req.headers,
      body,
      duplex: body ? 'half' : undefined,
    });
    handleApiRequest(request).then((webResp) => sendWebResponse(webResp, res));
  });
});

app.use(express.static('dist'));

app.use((_req, res) => {
  res.sendFile('dist/index.html', { root: process.cwd() });
});

app.listen(Number(process.env.PORT) || 3000, '0.0.0.0', () => {
  console.log(`vodhub running on port ${process.env.PORT || 3000}`);
});
