import { handleApiRequest } from '../../server/router.mjs';

export const onRequest = ({ request, env }) => handleApiRequest(request, env);
