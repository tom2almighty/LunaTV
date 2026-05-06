import { handleApiRequest } from '../../server/api-core.mjs';

export default { fetch: (request) => handleApiRequest(request) };
export const POST = (request) => handleApiRequest(request);
