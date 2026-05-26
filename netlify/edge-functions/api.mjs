import { handle } from 'hono/netlify';
import app from '../../server/app.mjs';

export default handle(app);

export const config = { path: '/api/*' };
