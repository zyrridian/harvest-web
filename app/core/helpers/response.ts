import { NextResponse } from "next/server";

/**
 * Build a success JSON response with consistent shape.
 */
export function successResponse<T>(
  data?: T,
  options?: { message?: string; status?: number },
) {
  const body: Record<string, unknown> = { status: "success" };
  if (options?.message) body.message = options.message;
  if (data !== undefined) body.data = data;

  return NextResponse.json(body, { status: options?.status ?? 200 });
}

/**
 * Build an error JSON response with consistent shape.
 */
export function errorResponse(message: string, status = 400) {
  return NextResponse.json(
    { status: "error", message },
    { status },
  );
}
