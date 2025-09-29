import axios from 'axios';
import { LoginRequest, SignupRequest, JwtResponse, User } from '../types/auth.types';
import { getUserIdFromToken, getUserRoleFromToken } from '../utils/jwtUtils';
import { API_BASE_URL } from '../config/api';

class AuthService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    // Load tokens from localStorage on initialization
    this.accessToken = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');

    // Set up axios interceptor for auth headers
    axios.interceptors.request.use(
      (config) => {
        if (this.accessToken && config.headers) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Set up response interceptor for token refresh
    axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        // Skip auth redirect for chat API endpoints (they have permitAll in backend)
        if (originalRequest?.url?.includes('/api/chat/')) {
          return Promise.reject(error);
        }
        
        if (error.response?.status === 401 && !originalRequest._retry && this.refreshToken) {
          originalRequest._retry = true;
          
          try {
            const response = await this.refreshAccessToken();
            if (response) {
              originalRequest.headers.Authorization = `Bearer ${response.accessToken}`;
              return axios(originalRequest);
            }
          } catch (refreshError) {
            this.logout();
            // Only redirect to login if not already on login page
            if (!window.location.pathname.includes('/login')) {
              window.location.href = '/login';
            }
          }
        }
        
        return Promise.reject(error);
      }
    );
  }

  async login(credentials: LoginRequest): Promise<JwtResponse> {
    try {
      const response = await axios.post<JwtResponse>(
        `${API_BASE_URL}/api/auth/login`,
        credentials
      );

      const { accessToken, refreshToken } = response.data;
      
      // Save tokens
      this.accessToken = accessToken;
      this.refreshToken = refreshToken;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || '로그인에 실패했습니다.');
    }
  }

  async signup(userData: SignupRequest): Promise<User> {
    try {
      const response = await axios.post<User>(
        `${API_BASE_URL}/api/auth/signup`,
        userData
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 409) {
        throw new Error('이미 사용 중인 이메일입니다.');
      }
      throw new Error(error.response?.data?.message || '회원가입에 실패했습니다.');
    }
  }

  async refreshAccessToken(): Promise<JwtResponse | null> {
    if (!this.refreshToken) return null;

    try {
      const response = await axios.post<JwtResponse>(
        `${API_BASE_URL}/api/auth/refresh`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${this.refreshToken}`
          }
        }
      );

      const { accessToken, refreshToken } = response.data;
      
      // Update tokens
      this.accessToken = accessToken;
      this.refreshToken = refreshToken;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);

      return response.data;
    } catch (error) {
      this.logout();
      return null;
    }
  }

  logout(): void {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  getCurrentUser(): User | null {
    // This would typically decode the JWT token or make an API call
    // For now, return null
    return null;
  }

  getCurrentUserId(): number {
    // First try to get from access token
    const accessToken = this.getAccessToken();
    console.log('Access token from memory:', accessToken ? 'exists' : 'null');
    if (accessToken) {
      const userId = getUserIdFromToken(accessToken);
      console.log('User ID from memory token:', userId);
      if (userId) {
        return userId;
      }
    }

    // If no valid token or userId not in token, check localStorage
    const storedToken = localStorage.getItem('accessToken');
    console.log('Access token from localStorage:', storedToken ? 'exists' : 'null');
    if (storedToken) {
      const userId = getUserIdFromToken(storedToken);
      console.log('User ID from stored token:', userId);
      if (userId) {
        return userId;
      }
    }

    // Fallback to default user ID 4 for testing
    console.warn('No valid JWT token found, using default user ID 4');
    return 4;
  }

  getUserRole(): string {
    // First try to get from access token
    const accessToken = this.getAccessToken();
    if (accessToken) {
      return getUserRoleFromToken(accessToken);
    }

    // If no valid token, check localStorage
    const storedToken = localStorage.getItem('accessToken');
    if (storedToken) {
      return getUserRoleFromToken(storedToken);
    }

    // Default to USER role
    return 'USER';
  }
}

export default new AuthService();
