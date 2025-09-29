const DEFAULT_BASE_URL = process.env.NODE_ENV === 'development'
  ? 'http://localhost:8080'
  : '';

/**
 * Unified backend API base URL.
 * - Use `REACT_APP_API_URL` when provided
 * - Fall back to localhost:8080 during development
 * - Use relative path (empty string) in production so the frontend and backend
 *   can live behind the same domain without code changes.
 */
export const API_BASE_URL = process.env.REACT_APP_API_URL || DEFAULT_BASE_URL;

export default API_BASE_URL;
