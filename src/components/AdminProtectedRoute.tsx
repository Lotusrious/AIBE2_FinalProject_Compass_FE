import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import adminAuthService from '../services/adminAuthService';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({ children }) => {
  const [isVerified, setIsVerified] = useState<boolean | null>(null);

  useEffect(() => {
    verifyAdmin();
  }, []);

  const verifyAdmin = async () => {
    // 먼저 로컬 체크
    if (!adminAuthService.isAuthenticated()) {
      setIsVerified(false);
      return;
    }

    // 서버 검증 (선택적 - 주석 처리 가능)
    // const valid = await adminAuthService.verifyAdminSession();
    // setIsVerified(valid);

    // 현재는 로컬 검증만 사용
    setIsVerified(true);
  };

  // 검증 중
  if (isVerified === null) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px',
        color: '#666'
      }}>
        관리자 권한 확인 중...
      </div>
    );
  }

  // 검증 실패
  if (!isVerified) {
    return <Navigate to="/admin-login" replace />;
  }

  return <>{children}</>;
};

export default AdminProtectedRoute;