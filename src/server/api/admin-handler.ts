import { NextRequest, NextResponse } from 'next/server';

import { AdminRole, requireAdminRoleByUsername } from '@/server/api/guards';
import { executeApiHandler } from '@/server/api/handler';

type AdminHandlerContext = {
  request: NextRequest;
  username: string;
  role: AdminRole;
};

export async function executeAdminApiHandler<TPayload>(
  request: NextRequest,
  handler: (
    context: AdminHandlerContext,
  ) =>
    | Promise<TPayload | NextResponse | Response>
    | TPayload
    | NextResponse
    | Response,
  options?: {
    ownerOnly?: boolean;
    forbiddenMessage?: string;
    ownerOnlyMessage?: string;
    onError?: (
      error: unknown,
      mappedError: {
        status: number;
        code: string;
        message: string;
        details?: unknown;
      },
    ) => NextResponse | undefined;
  },
) {
  return executeApiHandler(
    request,
    async ({ username }) => {
      const resolvedRole = await requireAdminRoleByUsername(
        username as string,
        options,
      );
      return handler({
        request,
        username: username as string,
        role: resolvedRole,
      });
    },
    {
      requireAuth: true,
      responseShape: 'raw',
      onError: options?.onError,
    },
  );
}
