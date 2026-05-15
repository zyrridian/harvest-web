import { NextRequest } from "next/server";

/**
 * Parse the request body from either JSON or multipart/form-data.
 * Returns a plain object with all form fields.
 */
export async function parseBody<T = Record<string, unknown>>(
  request: NextRequest,
): Promise<T> {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const body: Record<string, unknown> = {};
    formData.forEach((value, key) => {
      body[key] = value;
    });
    return body as T;
  }

  return await request.json();
}
