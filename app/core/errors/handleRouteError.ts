import { NextResponse } from "next/server";
import { AppError } from "./AppError";
import { ZodError } from "zod";

/**
 * Centralized error handler for all API route catch blocks.
 * - AppError → returns the defined status code and message
 * - ZodError → returns 400 with validation details
 * - Unknown errors → logs internally, returns generic 500 to client
 */
export function handleRouteError(error: unknown, context: string) {
  // Always log server-side for debugging
  console.error(`[${context}]`, error);

  if (error instanceof AppError) {
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: error.statusCode },
    );
  }

  if (error instanceof ZodError) {
    const messages = error.issues.map((e) => `${e.path.join(".")}: ${e.message}`);
    return NextResponse.json(
      { status: "error", message: "Validation failed", errors: messages },
      { status: 400 },
    );
  }

  // Never leak internal error details to the client
  return NextResponse.json(
    { status: "error", message: "Internal server error" },
    { status: 500 },
  );
}
