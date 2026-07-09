import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

/** Error contract: `{ error: { code, message } }` with the HTTP status (PLAN §8). */
export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export function json<T>(body: T, status = 200) {
  return NextResponse.json(body, { status });
}

export function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

type Handler<Ctx> = (req: Request, ctx: Ctx) => Promise<Response>;

/** Wraps a route handler: HttpError/ZodError → contract-shaped JSON errors. */
export function handle<Ctx>(fn: Handler<Ctx>): Handler<Ctx> {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (err) {
      if (err instanceof HttpError) {
        return errorResponse(err.status, err.code, err.message);
      }
      if (err instanceof ZodError) {
        const first = err.issues[0];
        return errorResponse(
          422,
          'VALIDATION_ERROR',
          first ? `${first.path.join('.')}: ${first.message}` : 'Invalid request body',
        );
      }
      console.error(err);
      return errorResponse(500, 'INTERNAL', 'Something went wrong');
    }
  };
}

export async function parseBody<T>(req: Request, schema: { parse: (v: unknown) => T }): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new HttpError(400, 'BAD_JSON', 'Request body must be JSON');
  }
  return schema.parse(raw);
}
