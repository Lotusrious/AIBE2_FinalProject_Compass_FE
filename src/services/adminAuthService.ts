import axios from 'axios';
import { getUserRoleFromToken, getUserIdFromToken } from '../utils/jwtUtils';
import { API_BASE_URL } from '../config/api';

interface AdminLoginRequest {
  email: string;
  password: string;
}

interface AdminLoginResponse {
  accessToken: string;
  refreshToken: string;
  userId: number;
  role: string;
}

class AdminAuthService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private readonly ADMIN_TOKEN_KEY = 'admin_access_token';
  private readonly ADMIN_REFRESH_KEY = 'admin_refresh_token';

  constructor() {
    // 어드민 토큰은 별도의 키로 저장
    this.accessToken = localStorage.getItem(this.ADMIN_TOKEN_KEY);
    this.refreshToken = localStorage.getItem(this.ADMIN_REFRESH_KEY);

    // 어드민 전용 axios 인터셉터 설정
    axios.interceptors.request.use(
      (config) => {
        // /admin 경로에만 어드민 토큰 사용
        if (config.url?.includes('/admin') && this.accessToken) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
  }

  async login(credentials: AdminLoginRequest): Promise<AdminLoginResponse> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/auth/login`,
        credentials
      );

      const { accessToken, refreshToken } = response.data;

      // 토큰에서 역할 확인
      const role = getUserRoleFromToken(accessToken);
      const userId = getUserIdFromToken(accessToken);

      // 관리자가 아니면 에러
      if (role !== 'ADMIN') {
        throw new Error('관리자 권한이 필요합니다.');
      }

      // 어드민 전용 토큰 저장
      this.accessToken = accessToken;
      this.refreshToken = refreshToken;
      localStorage.setItem(this.ADMIN_TOKEN_KEY, accessToken);
      localStorage.setItem(this.ADMIN_REFRESH_KEY, refreshToken);

      return {
        accessToken,
        refreshToken,
        userId: userId || 0,
        role
      };
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
      }
      throw new Error(error.message || '로그인에 실패했습니다.');
    }
  }

  logout(): void {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem(this.ADMIN_TOKEN_KEY);
    localStorage.removeItem(this.ADMIN_REFRESH_KEY);
  }

  isAuthenticated(): boolean {
    return !!this.accessToken && this.isAdmin();
  }

  isAdmin(): boolean {
    if (!this.accessToken) {
      return false;
    }
    const role = getUserRoleFromToken(this.accessToken);
    return role === 'ADMIN';
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  getCurrentAdminId(): number | null {
    if (!this.accessToken) {
      return null;
    }
    return getUserIdFromToken(this.accessToken);
  }

  // 어드민 세션 검증
  async verifyAdminSession(): Promise<boolean> {
    try {
      if (!this.accessToken) {
        return false;
      }

      // 토큰 유효성 확인 API 호출
      const response = await axios.get(
        `${API_BASE_URL}/api/admin/verify`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`
          }
        }
      );

      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  // 어드민 전용 토큰 갱신
  async refreshAdminToken(): Promise<boolean> {
    if (!this.refreshToken) {
      return false;
    }

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/auth/refresh`,
        {},
        {
          headers: {
            Authorization: `Bearer ${this.refreshToken}`
          }
        }
      );

      const { accessToken, refreshToken } = response.data;

      // 역할 확인
      const role = getUserRoleFromToken(accessToken);
      if (role !== 'ADMIN') {
        this.logout();
        return false;
      }

      // 토큰 업데이트
      this.accessToken = accessToken;
      this.refreshToken = refreshToken;
      localStorage.setItem(this.ADMIN_TOKEN_KEY, accessToken);
      localStorage.setItem(this.ADMIN_REFRESH_KEY, refreshToken);

      return true;
    } catch (error) {
      this.logout();
      return false;
    }
  }
}

export default new AdminAuthService();
