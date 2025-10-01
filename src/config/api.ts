const DEFAULT_BASE_URL = process.env.NODE_ENV === 'development'
  ? 'http://localhost:8080'
  : 'http://Aibe2-team3-compass-env.eba-p7j2y3nb.ap-northeast-2.elasticbeanstalk.com';

/**
 * Unified backend API base URL.
 * - Use `REACT_APP_API_URL` when provided
 * - Fall back to localhost:8080 during development
 * - Use EB URL in production
 */
export const API_BASE_URL = process.env.REACT_APP_API_URL || DEFAULT_BASE_URL;

export default API_BASE_URL;
