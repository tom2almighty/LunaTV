import express from 'express';
import {
  handleCmsProxy,
  handleImageProxy,
  handleDoubanProxy,
} from './server/proxy-handlers.mjs';

const app = express();

// CMS API: search + detail. Video streams are NOT proxied.
app.use('/api/cms', (req, res) => handleCmsProxy(req, res));
// Douban images and API.
app.use('/api/image', (req, res) => handleImageProxy(req, res));
app.use('/api/douban', (req, res) => handleDoubanProxy(req, res));

app.use(express.static('dist'));

app.get('*', (_req, res) => {
  res.sendFile('dist/index.html', { root: process.cwd() });
});

app.listen(Number(process.env.PORT) || 3000, '0.0.0.0', () => {
  console.log(`vodhub running on port ${process.env.PORT || 3000}`);
});
