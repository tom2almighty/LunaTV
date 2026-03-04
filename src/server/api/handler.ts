import { NextRequest, NextResponse } from 'next/server';

import { ApiAuthError, requireActiveUsername } from '@/server/api/guards';
import { jsonApiError, jsonApiSuccess } from '@/server/api/http';

type ApiResponseShape = 'standard' | 'raw';

type ApiHandlerContext<TParams> = {
  request: NextRequest;
  params?: TParams;
  username?: string;
};

type ApiHandlerResult<TPayload> =
  | TPayload
  | {
      data: TPayload;
      status?: number;
    }
  | Response
  | NextResponse;

type MappedApiError = {
  status: number;
  code: string;
  message: string;
  details?: unknown;
};

type ApiHandlerOptions<TParams> = {
  requireAuth?: boolean;
  params?: TParams;
  successStatus?: number;
  responseShape?: ApiResponseShape;
  onError?: (
    error: unknown,
    mappedError: MappedApiError,
  ) => NextResponse | undefined;
};

export class ApiBusinessError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(
    message: string,
    status = 400,
    code = 'BUSINESS_ERROR',
    details?: unknown,
  ) {
    super(message);
    this.name = 'ApiBusinessError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class ApiValidationError extends ApiBusinessError {
  constructor(message: string, details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ApiValidationError';
  }
}

function isNextResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}

function isResponse(value: unknown): value is Response {
  return value instanceof Response;
}

function isPayloadWithStatus<TPayload>(
  value: unknown,
): value is { data: TPayload; status?: number } {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const maybe = value as { data?: unknown; status?: unknown };
  if (!('data' in maybe)) {
    return false;
  }
  if (maybe.status === undefined) {
    return true;
  }
  return typeof maybe.status === 'number';
}

export function mapApiError(error: unknown): MappedApiError {
  if (error instanceof ApiAuthError) {
    return {
      status: error.status,
      code: 'UNAUTHORIZED',
      message: error.message,
    };
  }

  if (error instanceof ApiValidationError) {
    return {
      status: error.status,
      code: error.code,
      message: error.message,
      details: error.details,
    };
  }

  if (error instanceof ApiBusinessError) {
    return {
      status: error.status,
      code: error.code,
      message: error.message,
      details: error.details,
    };
  }

  if (
    error instanceof Error &&
    error.message.toLowerCase().includes('invalid resource identity')
  ) {
    return {
      status: 400,
      code: 'VALIDATION_ERROR',
      message: error.message,
    };
  }

  return {
    status: 500,
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Internal Server Error',
  };
}

export async function executeApiHandler<TPayload, TParams = unknown>(
  request: NextRequest,
  handler: (
    context: ApiHandlerContext<TParams>,
  ) => Promise<ApiHandlerResult<TPayload>> | ApiHandlerResult<TPayload>,
  options: ApiHandlerOptions<TParams> = {},
): Promise<NextResponse> {
  const {
    requireAuth = false,
    params,
    successStatus = 200,
    responseShape = 'standard',
    onError,
  } = options;

  try {
    const username = requireAuth
      ? await requireActiveUsername(request)
      : undefined;
    const result = await handler({ request, params, username });

    if (isNextResponse(result)) {
      return result;
    }
    if (isResponse(result)) {
      return result;
    }

    if (isPayloadWithStatus<TPayload>(result)) {
      if (responseShape === 'raw') {
        return NextResponse.json(result.data, {
          status: result.status ?? successStatus,
        });
      }
      return jsonApiSuccess(result.data, result.status ?? successStatus);
    }

    if (responseShape === 'raw') {
      return NextResponse.json(result, { status: successStatus });
    }
    return jsonApiSuccess(result, successStatus);
  } catch (error) {
    const mapped = mapApiError(error);
    const overridden = onError?.(error, mapped);
    if (overridden) {
      return overridden;
    }

    if (responseShape === 'raw') {
      return NextResponse.json(
        { error: mapped.message },
        { status: mapped.status },
      );
    }

    return jsonApiError(
      mapped.code,
      mapped.message,
      mapped.status,
      mapped.details,
    );
  }
}
