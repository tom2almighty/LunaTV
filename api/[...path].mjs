import { handleApiRequest } from '../server/router.mjs';

export default { fetch: (request) => handleApiRequest(request) };
export const GET = (request) => handleApiRequest(request);
export const POST = (request) => handleApiRequest(request);
export const OPTIONS = (request) => handleApiRequest(request);

export const config = { runtime: 'edge' };
