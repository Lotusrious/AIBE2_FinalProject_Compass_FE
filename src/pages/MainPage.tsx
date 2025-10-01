import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './MainPage.css';
import ChatInterface from '../components/ChatInterface';
import chatService, { ChatThread, Message } from '../services/chatService';
import tripService, { Trip } from '../services/tripService';
import authService from '../services/authService';
import { getUsernameFromToken } from '../utils/jwtUtils';

interface ChatOption {
  id: string;
  icon: string;
  title: string;
  description: string;
}

const MainPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [chatThreads, setChatThreads] = useState<ChatThread[]>([]);
  const [recentTrips, setRecentTrips] = useState<Trip[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number>(1); // TODO: Get from auth context
  const [showChatInterface, setShowChatInterface] = useState(false);
  const [currentThreadId, setCurrentThreadId] = useState<string | undefined>(undefined);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Load user data and recent chats on component mount
  useEffect(() => {
    // Clear localStorage chat data
    const clearLocalStorageChats = () => {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('chat_') || key.includes('thread') || key.includes('message')) {
          localStorage.removeItem(key);
        }
      });
    };

    clearLocalStorageChats();
    loadUserData();

    // Remove auto-refresh to prevent excessive API calls
    // Only refresh when user performs actions
  }, []);

  useEffect(() => {
    const state = location.state as { focusThreadId?: string } | null;
    if (state?.focusThreadId) {
      setCurrentThreadId(state.focusThreadId);
      setShowChatInterface(true);
      setIsNewChat(false);
      navigate('.', { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  const loadUserData = async () => {
    try {
      // Check authentication
      if (!authService.isAuthenticated()) {
        navigate('/login');
        return;
      }

      // Get actual user ID from auth service
      const userId = authService.getCurrentUserId();
      console.log('[MainPage] Using userId from auth:', userId);
      setCurrentUserId(userId);
      
      // Get user email from JWT token
      const accessToken = authService.getAccessToken();
      if (accessToken) {
        const email = getUsernameFromToken(accessToken);
        setUserEmail(email);
      }

      // Load chat threads (REQ-CHAT-002: ✅ IMPLEMENTED)
      try {
        const threads = await chatService.getThreads(userId, 0, 20);
        // Filter out invalid threads
        const validThreads = threads.filter(thread => thread && thread.id);
        setChatThreads(validThreads);
      } catch (error) {
        console.error('Error loading threads:', error);
        setChatThreads([]);
      }

      // Load recent trips (REQ-TRIP-003: ✅ IMPLEMENTED)
      const trips = await tripService.getTripsByUserId(userId);
      setRecentTrips(trips);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const chatOptions: ChatOption[] = [
    {
      id: 'jeju',
      icon: '🏝️',
      title: '제주도 여행',
      description: '한국의 하와이에서 힐링'
    },
    {
      id: 'busan',
      icon: '🍜',
      title: '부산 맛집',
      description: '돼지국밥부터 밀면까지'
    },
    {
      id: 'gyeongju',
      icon: '🏛️',
      title: '경주 역사',
      description: '천년 고도의 문화유산'
    },
    {
      id: 'camping',
      icon: '🚗',
      title: '당일치기',
      description: '가까운 곳에서 즐기기'
    },
    {
      id: 'seoul',
      icon: '🌃',
      title: '서울 투어',
      description: '도심 속 핫플레이스'
    },
    {
      id: 'gangwon',
      icon: '⛰️',
      title: '강원도 자연',
      description: '산과 바다의 조화'
    },
    {
      id: 'jeonju',
      icon: '🍲',
      title: '전주 한옥마을',
      description: '전통과 맛의 고장'
    },
    {
      id: 'yeosu',
      icon: '🌊',
      title: '여수 밤바다',
      description: '낭만적인 해안 도시'
    },
    {
      id: 'sokcho',
      icon: '🦐',
      title: '속초 해변',
      description: '동해안의 신선한 해산물'
    }
  ];

  const handleChatSelect = async (id: string) => {
    setSelectedChat(id);
    const option = chatOptions.find(opt => opt.id === id);
    const message = `${option?.title}에 대해 자세히 알려주세요`;

    setInitialMessage(message);
    setShowChatInterface(true);
    setCurrentThreadId(undefined);
    setIsNewChat(true);
    setTimeout(() => setIsNewChat(false), 100);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    setShowChatInterface(true);
    setInputMessage('');
  };

  const [isNewChat, setIsNewChat] = useState(false);
  const [showAllChats, setShowAllChats] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [initialMessage, setInitialMessage] = useState<string | undefined>(undefined);
  
  const handleNewChat = () => {
    setCurrentThreadId(undefined);
    setShowChatInterface(true);
    setIsNewChat(true);
    setTimeout(() => setIsNewChat(false), 100);
  };

  const handleThreadClick = async (threadId: string) => {
    setCurrentThreadId(threadId);
    setShowChatInterface(true);
    setIsNewChat(false);
    
    // Reload chat threads to update the list
    try {
      const threads = await chatService.getThreads(currentUserId, 0, 20);
      setChatThreads(threads);
    } catch (error) {
      console.error('Error reloading threads:', error);
    }
  };

  return (
    <div className="main-container">
      {/* Main Layout */}
      <div className="main-layout">
        {/* Sidebar */}
        <div className="sidebar">
          {/* Logo */}
          <div className="sidebar-logo">
            <button className="logo-button" onClick={() => {
              setShowChatInterface(false);
              setCurrentThreadId(undefined);
              setSelectedChat(null);
            }}>
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
                {/* REQ-CHAT-002: ✅ IMPLEMENTED */}
                {chatThreads.slice(0, 5).map((thread) => (
                  <button
                    key={thread.id}
                    className={`recent-chat-item ${currentThreadId === thread.id ? 'active' : ''}`}
                    onClick={() => handleThreadClick(thread.id)}
                  >
                    <div className="chat-item-title">{thread.lastMessage || thread.title}</div>
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
                    <div className="chat-item-title">{thread.lastMessage || thread.title}</div>
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
              className="quick-link-item"
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
        <div className={`main-content ${!showChatInterface ? 'main-content--centered' : ''}`}>
          {showChatInterface ? (
            <ChatInterface
              threadId={currentThreadId}
              onNewChat={handleNewChat}
              isNewChat={isNewChat}
              initialMessage={initialMessage}
              onMessageSent={() => setInitialMessage(undefined)}
              onThreadUpdate={async () => {
                // Reload chat threads when a message is sent
                const threads = await chatService.getThreads(currentUserId, 0, 20);
                setChatThreads(threads);
              }}
            />
          ) : (
            <>
              <div className="welcome-section">
                <h1 className="welcome-title">
                  안녕하세요! 어디로 떠나볼까요? 
                  <span className="welcome-emoji">🌍</span>
                </h1>
                <p className="welcome-subtitle">
                  AI 여행 어시스턴트가 완벽한 여행을 계획해드릴게요
                </p>
              </div>

              <div className="chat-options-grid">
                {chatOptions.map((option) => (
                  <button
                    key={option.id}
                    className={`chat-option-card ${selectedChat === option.id ? 'selected' : ''}`}
                    onClick={() => handleChatSelect(option.id)}
                  >
                    <div className="option-icon">{option.icon}</div>
                    <div className="option-title">{option.title}</div>
                    <div className="option-description">{option.description}</div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div> {/* End of main-layout */}
    </div>
  );
};

export default MainPage;
