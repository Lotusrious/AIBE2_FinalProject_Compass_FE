import React from 'react';
import { Navigate } from 'react-router-dom';
import authService from '../services/authService';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requireAdmin = false }) => {
  const isAuthenticated = authService.isAuthenticated();
  const userRole = authService.getUserRole();

  if (!isAuthenticated) {
    // 인증되지 않은 사용자는 로그인 페이지로 리다이렉트
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && userRole !== 'ADMIN') {
    // 관리자 권한이 필요한데 일반 사용자인 경우 메인 페이지로 리다이렉트
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;