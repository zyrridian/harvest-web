// ============================================
// Shared API Response Types
// ============================================

export interface ApiSuccessResponse<T = unknown> {
  status: "success";
  message?: string;
  data?: T;
}

export interface ApiErrorResponse {
  status: "error";
  message: string;
}

export interface PaginationMeta {
  current_page: number;
  total_pages: number;
  total_items: number;
  limit: number;
}

export interface PaginatedResponse<T = unknown> extends ApiSuccessResponse<T> {
  pagination: PaginationMeta;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;
