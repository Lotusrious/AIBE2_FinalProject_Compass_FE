export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  nickname: string;
}

export interface User {
  id: number;
  email: string;
  nickname: string;
  profileImageUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface JwtResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}