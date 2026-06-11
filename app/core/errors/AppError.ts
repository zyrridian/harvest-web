/**
 * Custom application error with HTTP status code.
 * Use this instead of plain Error to include status codes in error responses.
 */
export class AppError extends Error {
  public readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
  }

  // Common factory methods
  static badRequest(message: string) {
    return new AppError(400, message);
  }

  static unauthorized(message = "Unauthorized") {
    return new AppError(401, message);
  }

  static forbidden(message = "Forbidden") {
    return new AppError(403, message);
  }

  static notFound(message = "Not found") {
    return new AppError(404, message);
  }
}
