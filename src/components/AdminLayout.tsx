import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import adminAuthService from '../services/adminAuthService';
import '../styles/AdminLayout.css';

const AdminLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { path: '/admin/dashboard', label: '대시보드' },
    { path: '/admin/pre-stage', label: 'Pre-Stage 관리' },
    { path: '/admin/users', label: '사용자 관리' },
    { path: '/admin/sessions', label: '세션 관리' },
  ];

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleLogout = () => {
    adminAuthService.logout();
    navigate('/admin-login');
  };

  return (
    <div className="admin-layout">
      <div className="admin-sidebar">
        <div className="sidebar-header">
          <h2>Compass Admin</h2>
        </div>
        <nav className="sidebar-nav">
          {menuItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button onClick={handleLogout} className="logout-button">
            🚪 로그아웃
          </button>
          <div style={{ marginTop: '10px', fontSize: '12px', color: '#999' }}>
            관리자 모드
          </div>
        </div>
      </div>
      <div className="admin-content">
        <Outlet />
      </div>
    </div>
  );
};

export default AdminLayout;