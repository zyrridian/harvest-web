import { PAGINATION } from "@/core/config/constants";

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

/**
 * Parse pagination query parameters with defaults and bounds.
 */
export function parsePagination(searchParams: URLSearchParams): PaginationParams {
  const page = Math.max(
    1,
    parseInt(searchParams.get("page") || String(PAGINATION.DEFAULT_PAGE)),
  );
  const limit = Math.min(
    PAGINATION.MAX_LIMIT,
    Math.max(1, parseInt(searchParams.get("limit") || String(PAGINATION.DEFAULT_LIMIT))),
  );
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

/**
 * Build pagination metadata for the response.
 */
export function buildPaginationMeta(
  page: number,
  limit: number,
  totalItems: number,
) {
  return {
    current_page: page,
    total_pages: Math.ceil(totalItems / limit),
    total_items: totalItems,
    limit,
  };
}
