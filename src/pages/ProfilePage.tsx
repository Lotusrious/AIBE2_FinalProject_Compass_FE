import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import { getUsernameFromToken } from '../utils/jwtUtils';
import './ProfilePage.css';

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState({
    name: '',
    email: '',
    phone: '',
    birthDate: '',
    gender: '',
    travelStyle: [] as string[],
    profileImage: null as string | null
  });
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [currentUserId, setCurrentUserId] = useState<number>(1);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = () => {
    const userId = authService.getCurrentUserId();
    setCurrentUserId(userId);
    
    const accessToken = authService.getAccessToken();
    const userEmail = accessToken ? getUsernameFromToken(accessToken) : 'test@test.com';
    
    const mockUserInfo = {
      name: '김여행',
      email: userEmail || 'test@test.com',
      phone: '010-1234-5678',
      birthDate: '1990-01-01',
      gender: '남성',
      travelStyle: ['문화탐방', '미식여행'],
      profileImage: null
    };
    setUserInfo(mockUserInfo);
  };

  const travelStyleOptions = [
    { id: 'culture', label: '문화탐방', icon: '🏛️' },
    { id: 'food', label: '미식여행', icon: '🍜' },
    { id: 'nature', label: '자연힐링', icon: '🌿' },
    { id: 'adventure', label: '모험활동', icon: '🏔️' },
    { id: 'shopping', label: '쇼핑', icon: '🛍️' },
    { id: 'relaxation', label: '휴식', icon: '🏖️' },
    { id: 'photo', label: '사진촬영', icon: '📸' },
    { id: 'history', label: '역사탐방', icon: '📚' },
    { id: 'nightlife', label: '나이트라이프', icon: '🌃' },
    { id: 'sports', label: '스포츠', icon: '⚽' }
  ];

  const toggleTravelStyle = (style: string) => {
    if (!isEditing) return;
    
    if (userInfo.travelStyle.includes(style)) {
      setUserInfo({
        ...userInfo,
        travelStyle: userInfo.travelStyle.filter(s => s !== style)
      });
    } else {
      setUserInfo({
        ...userInfo,
        travelStyle: [...userInfo.travelStyle, style]
      });
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUserInfo({
          ...userInfo,
          profileImage: reader.result as string
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePasswordChange = () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('새 비밀번호가 일치하지 않습니다.');
      return;
    }
    
    // TODO: 백엔드 API 연동
    console.log('Changing password...');
    alert('비밀번호가 변경되었습니다.');
    setShowPasswordModal(false);
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
  };

  const handleSave = () => {
    console.log('Saving user info:', userInfo);
    setIsEditing(false);
    alert('프로필이 저장되었습니다.');
  };

  const handleLogout = () => {
    if (window.confirm('로그아웃 하시겠습니까?')) {
      authService.logout();
      navigate('/login');
    }
  };

  const handleDeleteAccount = () => {
    if (window.confirm('정말로 회원 탈퇴를 하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) {
      // TODO: 백엔드 API 연동
      console.log('Deleting account...');
      authService.logout();
      navigate('/login');
    }
  };

  return (
    <div className="profile-page-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-logo">
          <button className="logo-button" onClick={() => navigate('/')}>
            <span className="logo-icon">✈️</span>
            <span className="logo-text">Compass</span>
          </button>
        </div>
        
        <div className="sidebar-header">
          <button className="new-chat-btn" onClick={() => navigate('/')}>
            <span className="btn-icon">💬</span>
            <span>새 채팅</span>
          </button>
        </div>

        <div className="sidebar-section">
          <div className="section-title">바로가기</div>
          <div className="quick-links">
            <button 
              className="quick-link-item"
              onClick={() => navigate('/')}
            >
              <span className="link-icon">🏠</span>
              <span>홈으로</span>
            </button>
            <button className="quick-link-item active">
              <span className="link-icon">👤</span>
              <span>프로필 설정</span>
            </button>
            <button className="quick-link-item">
              <span className="link-icon">✈️</span>
              <span>내 여정</span>
            </button>
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar">
              {userInfo.profileImage ? (
                <img src={userInfo.profileImage} alt="Profile" />
              ) : (
                userInfo.name.charAt(0) || '김'
              )}
            </div>
            <div className="user-info">
              <div className="user-name">{userInfo.name || '김여행'}</div>
              <div className="user-email">{userInfo.email}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="profile-main-content">
        <div className="profile-header">
          <h1>프로필 설정</h1>
        </div>

        <div className="profile-content">
          {/* Profile Image Section */}
          <div className="profile-image-section">
            <div className="profile-image-container">
              {userInfo.profileImage ? (
                <img src={userInfo.profileImage} alt="Profile" className="profile-image" />
              ) : (
                <div className="profile-image-placeholder">
                  {userInfo.name.charAt(0) || '김'}
                </div>
              )}
            </div>
            {isEditing && (
              <label className="image-upload-btn">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                />
                📷 사진 변경
              </label>
            )}
          </div>

          {/* Basic Info Section */}
          <div className="profile-section">
            <h2>기본 정보</h2>
            <div className="profile-form">
              <div className="form-group">
                <label>이름</label>
                <input
                  type="text"
                  value={userInfo.name}
                  onChange={(e) => setUserInfo({ ...userInfo, name: e.target.value })}
                  disabled={!isEditing}
                />
              </div>

              <div className="form-group">
                <label>이메일</label>
                <input
                  type="email"
                  value={userInfo.email}
                  disabled
                  className="disabled-input"
                />
              </div>

              <div className="form-group">
                <label>전화번호</label>
                <input
                  type="tel"
                  value={userInfo.phone}
                  onChange={(e) => setUserInfo({ ...userInfo, phone: e.target.value })}
                  disabled={!isEditing}
                />
              </div>

              <div className="form-group">
                <label>생년월일</label>
                <input
                  type="date"
                  value={userInfo.birthDate}
                  onChange={(e) => setUserInfo({ ...userInfo, birthDate: e.target.value })}
                  disabled={!isEditing}
                />
              </div>

              <div className="form-group">
                <label>성별</label>
                <select
                  value={userInfo.gender}
                  onChange={(e) => setUserInfo({ ...userInfo, gender: e.target.value })}
                  disabled={!isEditing}
                >
                  <option value="">선택하세요</option>
                  <option value="남성">남성</option>
                  <option value="여성">여성</option>
                  <option value="기타">기타</option>
                </select>
              </div>
            </div>
          </div>

          {/* Travel Style Section */}
          <div className="profile-section">
            <h2>여행 스타일</h2>
            <p className="section-description">선호하는 여행 스타일을 모두 선택해주세요 (중복 선택 가능)</p>
            <div className="travel-style-grid">
              {travelStyleOptions.map(style => (
                <button
                  key={style.id}
                  className={`travel-style-item ${userInfo.travelStyle.includes(style.label) ? 'selected' : ''}`}
                  onClick={() => toggleTravelStyle(style.label)}
                  disabled={!isEditing}
                >
                  <span className="style-icon">{style.icon}</span>
                  <span className="style-label">{style.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="profile-actions">
            {isEditing ? (
              <>
                <button className="cancel-btn" onClick={() => {
                  setIsEditing(false);
                  loadUserData();
                }}>
                  취소
                </button>
                <button className="save-btn" onClick={handleSave}>
                  저장
                </button>
              </>
            ) : (
              <button className="edit-btn" onClick={() => setIsEditing(true)}>
                프로필 수정
              </button>
            )}
          </div>

          {/* Account Management Section */}
          <div className="profile-section danger-zone">
            <h2>계정 관리</h2>
            <div className="account-actions">
              <button 
                className="password-btn"
                onClick={() => setShowPasswordModal(true)}
              >
                🔐 비밀번호 변경
              </button>
              <button 
                className="logout-btn"
                onClick={handleLogout}
              >
                🚪 로그아웃
              </button>
              <button 
                className="delete-account-btn"
                onClick={handleDeleteAccount}
              >
                ⚠️ 회원 탈퇴
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>비밀번호 변경</h2>
            <div className="form-group">
              <label>현재 비밀번호</label>
              <input
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({
                  ...passwordData,
                  currentPassword: e.target.value
                })}
              />
            </div>
            <div className="form-group">
              <label>새 비밀번호</label>
              <input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({
                  ...passwordData,
                  newPassword: e.target.value
                })}
              />
            </div>
            <div className="form-group">
              <label>새 비밀번호 확인</label>
              <input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({
                  ...passwordData,
                  confirmPassword: e.target.value
                })}
              />
            </div>
            <div className="modal-actions">
              <button 
                className="cancel-btn"
                onClick={() => setShowPasswordModal(false)}
              >
                취소
              </button>
              <button 
                className="save-btn"
                onClick={handlePasswordChange}
              >
                변경
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;