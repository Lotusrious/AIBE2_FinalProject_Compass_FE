import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import adminAuthService from '../../services/adminAuthService';
import '../../styles/AdminLogin.css';

const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await adminAuthService.login({ email, password });

      // 관리자 권한 확인
      if (!adminAuthService.isAdmin()) {
        setError('관리자 권한이 없습니다.');
        adminAuthService.logout();
        return;
      }

      // 관리자 대시보드로 이동
      navigate('/admin/dashboard');
    } catch (err: any) {
      setError(err.message || '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-container">
        <div className="admin-login-header">
          <h1>Compass Admin</h1>
          <p>관리자 전용 페이지</p>
        </div>

        <form className="admin-login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">관리자 이메일</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@compass.com"
              required
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">비밀번호</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="admin-login-button"
            disabled={loading}
          >
            {loading ? '로그인 중...' : '관리자 로그인'}
          </button>
        </form>

        <div className="admin-login-footer">
          <p className="security-notice">
            🔒 이 페이지는 관리자 전용입니다.
            <br />
            무단 접근 시도는 기록되고 추적됩니다.
          </p>
          <a href="/" className="back-to-main">
            일반 사용자 로그인으로 돌아가기
          </a>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;