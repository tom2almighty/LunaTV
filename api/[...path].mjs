import { handleApiRequest } from '../server/router.mjs';

export const config = { runtime: 'edge' };

export default function handler(request) {
  return handleApiRequest(request);
}
