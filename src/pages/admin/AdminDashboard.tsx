import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import adminAuthService from '../../services/adminAuthService';
import '../../styles/AdminDashboard.css';

interface DashboardStats {
  totalUsers: number;
  activeSessions: number;
  todayChats: number;
  totalChats: number;
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeSessions: 0,
    todayChats: 0,
    totalChats: 0
  });

  useEffect(() => {
    // TODO: API 호출로 실제 통계 데이터 가져오기
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // 임시 데이터
      setStats({
        totalUsers: 127,
        activeSessions: 23,
        todayChats: 45,
        totalChats: 1234
      });
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    }
  };

  return (
    <div className="admin-dashboard">
      <h1>관리자 대시보드</h1>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>전체 사용자</h3>
          <p className="stat-number">{stats.totalUsers}</p>
        </div>
        <div className="stat-card">
          <h3>활성 세션</h3>
          <p className="stat-number">{stats.activeSessions}</p>
        </div>
        <div className="stat-card">
          <h3>오늘의 채팅</h3>
          <p className="stat-number">{stats.todayChats}</p>
        </div>
        <div className="stat-card">
          <h3>전체 채팅</h3>
          <p className="stat-number">{stats.totalChats}</p>
        </div>
      </div>

      <div className="quick-actions">
        <h2>빠른 작업</h2>
        <div className="action-buttons">
          <button onClick={() => navigate('/admin/users')}>
            사용자 관리
          </button>
          <button onClick={() => navigate('/admin/sessions')}>
            세션 관리
          </button>
          <button onClick={() => navigate('/admin/analytics')}>
            통계 분석
          </button>
          <button onClick={() => navigate('/admin/settings')}>
            시스템 설정
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;