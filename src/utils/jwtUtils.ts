/**
 * JWT 토큰 관련 유틸리티 함수들
 */

interface JwtPayload {
  sub: string;           // username (email)
  userId?: string;       // 사용자 ID
  roles?: string[];      // 권한 목록
  iat?: number;          // 발급 시간
  exp?: number;          // 만료 시간
}

/**
 * JWT 토큰을 디코딩하여 payload를 반환
 * @param token JWT 토큰 문자열
 * @returns 디코딩된 payload 또는 null
 */
export function decodeJwt(token: string): JwtPayload | null {
  try {
    // JWT는 3개의 파트로 구성: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('Invalid JWT format');
      return null;
    }

    // payload 부분을 Base64 디코딩
    const payload = parts[1];
    // Base64 URL-safe를 일반 Base64로 변환
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    // 패딩 추가
    const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
    
    // Base64 디코딩 후 JSON 파싱
    const decoded = atob(padded);
    const result = JSON.parse(decoded);
    
    return result as JwtPayload;
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
}

/**
 * JWT 토큰에서 사용자 ID 추출
 * @param token JWT 토큰 문자열
 * @returns 사용자 ID 또는 null
 */
export function getUserIdFromToken(token: string): number | null {
  const payload = decodeJwt(token);
  console.log('JWT Payload:', payload);
  if (!payload || !payload.userId) {
    console.log('No userId in payload');
    return null;
  }
  
  const userId = parseInt(payload.userId, 10);
  console.log('Parsed userId:', userId);
  return isNaN(userId) ? null : userId;
}

/**
 * JWT 토큰에서 username(email) 추출
 * @param token JWT 토큰 문자열
 * @returns username 또는 null
 */
export function getUsernameFromToken(token: string): string | null {
  const payload = decodeJwt(token);
  return payload?.sub || null;
}

/**
 * JWT 토큰이 만료되었는지 확인
 * @param token JWT 토큰 문자열
 * @returns 만료 여부
 */
export function isTokenExpired(token: string): boolean {
  const payload = decodeJwt(token);
  if (!payload || !payload.exp) {
    return true;
  }
  
  // exp는 초 단위이므로 1000을 곱해서 밀리초로 변환
  const expirationTime = payload.exp * 1000;
  return Date.now() >= expirationTime;
}

/**
 * JWT 토큰의 남은 유효 시간 계산 (분 단위)
 * @param token JWT 토큰 문자열
 * @returns 남은 시간(분) 또는 0
 */
export function getTokenRemainingTime(token: string): number {
  const payload = decodeJwt(token);
  if (!payload || !payload.exp) {
    return 0;
  }

  const expirationTime = payload.exp * 1000;
  const remainingTime = expirationTime - Date.now();
  return Math.max(0, Math.floor(remainingTime / 60000)); // 분 단위로 변환
}

/**
 * JWT 토큰에서 사용자 역할(role) 추출
 * @param token JWT 토큰 문자열
 * @returns 사용자 역할 또는 'USER' (기본값)
 */
export function getUserRoleFromToken(token: string): string {
  const payload = decodeJwt(token);
  if (!payload || !payload.roles || payload.roles.length === 0) {
    return 'USER';
  }
  // 첫 번째 역할 반환 (보통 하나의 역할만 가짐)
  return payload.roles[0];
}