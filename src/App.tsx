import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import MainPage from './pages/MainPage';
import ProfilePage from './pages/ProfilePage';
import TravelPlanWrapper from './pages/TravelPlanWrapper';
import MyTripsWrapper from './pages/MyTripsWrapper';
import ProtectedRoute from './components/ProtectedRoute';
import AdminProtectedRoute from './components/AdminProtectedRoute';
import AdminLayout from './components/AdminLayout';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import PreStageManagement from './pages/admin/PreStageManagement';
import UserManagement from './pages/admin/UserManagement';
import SessionManagement from './pages/admin/SessionManagement';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* 공개 라우트 */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          
          {/* 보호된 라우트 - 로그인이 필요한 페이지들 */}
          <Route path="/" element={
            <ProtectedRoute>
              <MainPage />
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          } />
          <Route path="/my-trips" element={
            <ProtectedRoute>
              <MyTripsWrapper />
            </ProtectedRoute>
          } />
          <Route path="/travel-plan" element={
            <ProtectedRoute>
              <TravelPlanWrapper />
            </ProtectedRoute>
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <div>Dashboard (Coming Soon)</div>
            </ProtectedRoute>
          } />

          {/* 어드민 전용 로그인 - 별도 진입점 */}
          <Route path="/admin-login" element={<AdminLoginPage />} />

          {/* 어드민 라우트 - 어드민 전용 인증 */}
          <Route path="/admin" element={
            <AdminProtectedRoute>
              <AdminLayout />
            </AdminProtectedRoute>
          }>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="pre-stage" element={<PreStageManagement />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="sessions" element={<SessionManagement />} />
          </Route>

          {/* 기본 경로는 메인 페이지로 리다이렉트 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
