import {
  READ_PATH_COPY,
  classifyReadFailureKind,
  isReadQueryError,
} from "@/lib/read-path-policy"

export const QUERY_STATE_ERROR_FALLBACK = READ_PATH_COPY.unavailable

export function formatQueryStateError(error: unknown): string {
  if (isReadQueryError(error) && error.message.trim().length > 0) {
    return error.message
  }

  switch (classifyReadFailureKind(error)) {
    case "unauthorized":
      return "Your session no longer has access to this information. Sign in again and retry."
    case "forbidden":
      return "You do not have permission to view this information."
    case "not-found":
      return READ_PATH_COPY.notFound
    case "rate-limited":
      return "Too many requests. Wait a moment, then try again."
    case "validation":
    case "system":
    case "unknown":
      return QUERY_STATE_ERROR_FALLBACK
  }
}
