import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MyTripsPage from './MyTripsPage';
import chatService, { ChatThread } from '../services/chatService';
import tripService, { Trip } from '../services/tripService';
import authService from '../services/authService';
import { getUsernameFromToken } from '../utils/jwtUtils';
import './MainPage.css';

const MyTripsWrapper: React.FC = () => {
  const navigate = useNavigate();
  const [chatThreads, setChatThreads] = useState<ChatThread[]>([]);
  const [recentTrips, setRecentTrips] = useState<Trip[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number>(1);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const [currentThreadId, setCurrentThreadId] = useState<string | undefined>(undefined);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      if (!authService.isAuthenticated()) {
        navigate('/login');
        return;
      }

      const userId = authService.getCurrentUserId();
      setCurrentUserId(userId);

      const accessToken = authService.getAccessToken();
      if (accessToken) {
        const email = getUsernameFromToken(accessToken);
        setUserEmail(email);
      }

      try {
        const threads = await chatService.getThreads(userId, 0, 20);
        const validThreads = threads.filter(thread => thread && thread.id);
        setChatThreads(validThreads);
      } catch (error) {
        console.error('Error loading threads:', error);
        setChatThreads([]);
      }

      const trips = await tripService.getTripsByUserId(userId);
      setRecentTrips(trips);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handleNewChat = () => {
    navigate('/');
  };

  const handleThreadClick = (threadId: string) => {
    navigate('/', { state: { focusThreadId: threadId } });
  };

  return (
    <div className="main-container">
      <div className="main-layout">
        {/* Sidebar */}
        <div className="sidebar">
          <div className="sidebar-logo">
            <button className="logo-button" onClick={() => navigate('/')}>
              <span className="logo-icon">✈️</span>
              <span className="logo-text">Compass</span>
            </button>
          </div>

          <div className="sidebar-header">
            <button className="new-chat-btn" onClick={handleNewChat}>
              <span className="btn-icon">+</span>
              <span>새 채팅</span>
            </button>
          </div>

          <div className="sidebar-section">
            <div className="section-title">최근 대화</div>
            {chatThreads.length > 0 ? (
              <>
                <div className="recent-chats">
                  {chatThreads.slice(0, 5).map((thread) => (
                    <button
                      key={thread.id}
                      className={`recent-chat-item ${currentThreadId === thread.id ? 'active' : ''}`}
                      onClick={() => handleThreadClick(thread.id)}
                    >
                      <div className="chat-item-title">{thread.title}</div>
                      <div className="chat-item-preview">{thread.lastMessage}</div>
                      <div className="chat-item-time">
                        {thread.lastMessageAt ? new Date(thread.lastMessageAt).toLocaleDateString() : ''}
                      </div>
                    </button>
                  ))}
                </div>
                {chatThreads.length > 5 && (
                  <button
                    className="show-more-btn"
                    onClick={() => setShowChatModal(true)}
                  >
                    더보기 ({chatThreads.length - 5}개)
                  </button>
                )}
              </>
            ) : (
              <div className="empty-recent">
                <span className="empty-icon">💬</span>
                <span className="empty-text">최근 대화가 없습니다</span>
              </div>
            )}
          </div>

          {/* 채팅 히스토리 모달 */}
          {showChatModal && (
            <div className="chat-modal-overlay" onClick={() => setShowChatModal(false)}>
              <div className="chat-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h3>전체 대화 목록</h3>
                  <button className="modal-close" onClick={() => setShowChatModal(false)}>✕</button>
                </div>
                <div className="modal-content">
                  {chatThreads.map((thread) => (
                    <button
                      key={thread.id}
                      className={`modal-chat-item ${currentThreadId === thread.id ? 'active' : ''}`}
                      onClick={() => {
                        handleThreadClick(thread.id);
                        setShowChatModal(false);
                      }}
                    >
                      <div className="chat-item-title">{thread.title}</div>
                      <div className="chat-item-preview">{thread.lastMessage}</div>
                      <div className="chat-item-time">
                        {thread.lastMessageAt ? new Date(thread.lastMessageAt).toLocaleDateString() : ''}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="sidebar-section">
            <div className="section-title">바로가기</div>
            <div className="quick-links">
              <button
                className="quick-link-item active"
                onClick={() => navigate('/my-trips')}
              >
                <span className="link-icon">✈️</span>
                <span>내 여정 ({recentTrips.length})</span>
              </button>
              <button className="quick-link-item">
                <span className="link-icon">📅</span>
                <span>캘린더</span>
              </button>
            </div>
          </div>

          <div className="sidebar-footer">
            <div
              className="user-profile"
              onClick={() => navigate('/profile')}
              style={{ cursor: 'pointer' }}
              title="프로필 설정"
            >
              <div className="user-avatar">
                {userEmail ? userEmail.charAt(0).toUpperCase() : '김'}
              </div>
              <div className="user-info">
                <div className="user-name">{userEmail?.split('@')[0] || '김여행'}</div>
                <div className="user-email">{userEmail || 'kimtravel@example.com'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="main-content">
          <MyTripsPage />
        </div>
      </div>
    </div>
  );
};

export default MyTripsWrapper;