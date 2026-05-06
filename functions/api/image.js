import { handleApiRequest } from '../../server/api-core.mjs';

export const onRequest = ({ request, env }) => handleApiRequest(request, env);
