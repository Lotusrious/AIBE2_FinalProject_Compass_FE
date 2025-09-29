import React, { useState, useEffect } from 'react';
import '../../styles/SessionManagement.css';

interface ChatSession {
  id: number;
  userId: number;
  userEmail: string;
  phase: number;
  stage: number;
  status: 'active' | 'completed' | 'abandoned';
  messageCount: number;
  startedAt: string;
  lastActivityAt: string;
  destination?: string;
  travelDates?: string;
}

const SessionManagement: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [filterPhase, setFilterPhase] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      // TODO: API 호출로 실제 세션 데이터 가져오기
      // 임시 데이터
      const mockSessions: ChatSession[] = [
        {
          id: 1,
          userId: 1,
          userEmail: 'user1@example.com',
          phase: 1,
          stage: 2,
          status: 'active',
          messageCount: 15,
          startedAt: '2024-01-19 10:00',
          lastActivityAt: '2024-01-19 10:30',
          destination: '제주도',
          travelDates: '2024-02-15 ~ 2024-02-18'
        },
        {
          id: 2,
          userId: 2,
          userEmail: 'user2@example.com',
          phase: 2,
          stage: 1,
          status: 'active',
          messageCount: 23,
          startedAt: '2024-01-19 09:00',
          lastActivityAt: '2024-01-19 11:15',
          destination: '부산',
          travelDates: '2024-03-01 ~ 2024-03-03'
        },
        {
          id: 3,
          userId: 3,
          userEmail: 'user3@example.com',
          phase: 3,
          stage: 3,
          status: 'completed',
          messageCount: 45,
          startedAt: '2024-01-18 14:00',
          lastActivityAt: '2024-01-18 16:30',
          destination: '강원도',
          travelDates: '2024-02-20 ~ 2024-02-22'
        }
      ];
      setSessions(mockSessions);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    }
  };

  const handleTerminateSession = async (sessionId: number) => {
    if (window.confirm('정말로 이 세션을 종료하시겠습니까?')) {
      try {
        // TODO: API 호출로 세션 종료
        console.log(`Terminating session ${sessionId}`);
        setSessions(sessions.map(session =>
          session.id === sessionId
            ? { ...session, status: 'abandoned' as const }
            : session
        ));
      } catch (error) {
        console.error('Failed to terminate session:', error);
      }
    }
  };

  const handleViewDetails = (session: ChatSession) => {
    setSelectedSession(session);
  };

  const getPhaseText = (phase: number) => {
    const phases = {
      1: '여행지 확정',
      2: '정보 수집',
      3: '일정 생성'
    };
    return phases[phase as keyof typeof phases] || `Phase ${phase}`;
  };

  const getStatusClass = (status: string) => {
    return `status-badge status-${status}`;
  };

  const filteredSessions = sessions.filter(session => {
    const matchesPhase = filterPhase === 'all' || session.phase.toString() === filterPhase;
    const matchesStatus = filterStatus === 'all' || session.status === filterStatus;
    return matchesPhase && matchesStatus;
  });

  return (
    <div className="session-management">
      <h1>채팅 세션 관리</h1>

      <div className="controls">
        <div className="filter-bar">
          <select
            value={filterPhase}
            onChange={(e) => setFilterPhase(e.target.value)}
          >
            <option value="all">모든 단계</option>
            <option value="1">Phase 1 - 여행지 확정</option>
            <option value="2">Phase 2 - 정보 수집</option>
            <option value="3">Phase 3 - 일정 생성</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">모든 상태</option>
            <option value="active">활성</option>
            <option value="completed">완료</option>
            <option value="abandoned">포기됨</option>
          </select>
        </div>

        <div className="stats-summary">
          <span>활성 세션: {sessions.filter(s => s.status === 'active').length}</span>
          <span>전체 세션: {sessions.length}</span>
        </div>
      </div>

      <div className="session-table-container">
        <table className="session-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>사용자</th>
              <th>단계</th>
              <th>상태</th>
              <th>메시지 수</th>
              <th>시작 시간</th>
              <th>마지막 활동</th>
              <th>여행지</th>
              <th>작업</th>
            </tr>
          </thead>
          <tbody>
            {filteredSessions.map(session => (
              <tr key={session.id}>
                <td>{session.id}</td>
                <td>{session.userEmail}</td>
                <td>
                  <span className="phase-badge">
                    {getPhaseText(session.phase)} - Stage {session.stage}
                  </span>
                </td>
                <td>
                  <span className={getStatusClass(session.status)}>
                    {session.status === 'active' ? '활성' :
                     session.status === 'completed' ? '완료' : '포기됨'}
                  </span>
                </td>
                <td>{session.messageCount}</td>
                <td>{session.startedAt}</td>
                <td>{session.lastActivityAt}</td>
                <td>{session.destination || '-'}</td>
                <td>
                  <button
                    className="action-btn view-btn"
                    onClick={() => handleViewDetails(session)}
                  >
                    상세
                  </button>
                  {session.status === 'active' && (
                    <button
                      className="action-btn terminate-btn"
                      onClick={() => handleTerminateSession(session.id)}
                    >
                      종료
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedSession && (
        <div className="session-detail-modal" onClick={() => setSelectedSession(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>세션 상세 정보</h2>
            <div className="detail-grid">
              <div className="detail-item">
                <label>세션 ID:</label>
                <span>{selectedSession.id}</span>
              </div>
              <div className="detail-item">
                <label>사용자:</label>
                <span>{selectedSession.userEmail}</span>
              </div>
              <div className="detail-item">
                <label>현재 단계:</label>
                <span>{getPhaseText(selectedSession.phase)} - Stage {selectedSession.stage}</span>
              </div>
              <div className="detail-item">
                <label>상태:</label>
                <span className={getStatusClass(selectedSession.status)}>
                  {selectedSession.status}
                </span>
              </div>
              <div className="detail-item">
                <label>여행지:</label>
                <span>{selectedSession.destination || '미정'}</span>
              </div>
              <div className="detail-item">
                <label>여행 일정:</label>
                <span>{selectedSession.travelDates || '미정'}</span>
              </div>
              <div className="detail-item">
                <label>메시지 수:</label>
                <span>{selectedSession.messageCount}</span>
              </div>
              <div className="detail-item">
                <label>세션 시작:</label>
                <span>{selectedSession.startedAt}</span>
              </div>
              <div className="detail-item">
                <label>마지막 활동:</label>
                <span>{selectedSession.lastActivityAt}</span>
              </div>
            </div>
            <button className="close-btn" onClick={() => setSelectedSession(null)}>
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionManagement;