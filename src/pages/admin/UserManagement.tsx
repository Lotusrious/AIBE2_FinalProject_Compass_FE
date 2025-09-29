import React, { useState, useEffect } from 'react';
import '../../styles/UserManagement.css';

interface User {
  id: number;
  email: string;
  username: string;
  role: string;
  createdAt: string;
  lastLogin: string;
  status: 'active' | 'inactive' | 'blocked';
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // TODO: API 호출로 실제 사용자 데이터 가져오기
      // 임시 데이터
      const mockUsers: User[] = [
        {
          id: 1,
          email: 'user1@example.com',
          username: '사용자1',
          role: 'USER',
          createdAt: '2024-01-15',
          lastLogin: '2024-01-19 14:30',
          status: 'active'
        },
        {
          id: 2,
          email: 'user2@example.com',
          username: '사용자2',
          role: 'USER',
          createdAt: '2024-01-16',
          lastLogin: '2024-01-19 10:00',
          status: 'active'
        },
        {
          id: 3,
          email: 'admin@example.com',
          username: '관리자',
          role: 'ADMIN',
          createdAt: '2024-01-01',
          lastLogin: '2024-01-19 16:00',
          status: 'active'
        }
      ];
      setUsers(mockUsers);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const handleStatusChange = async (userId: number, newStatus: string) => {
    try {
      // TODO: API 호출로 사용자 상태 변경
      console.log(`Changing user ${userId} status to ${newStatus}`);

      // UI 업데이트
      setUsers(users.map(user =>
        user.id === userId
          ? { ...user, status: newStatus as 'active' | 'inactive' | 'blocked' }
          : user
      ));
    } catch (error) {
      console.error('Failed to update user status:', error);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (window.confirm('정말로 이 사용자를 삭제하시겠습니까?')) {
      try {
        // TODO: API 호출로 사용자 삭제
        console.log(`Deleting user ${userId}`);
        setUsers(users.filter(user => user.id !== userId));
      } catch (error) {
        console.error('Failed to delete user:', error);
      }
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="user-management">
      <h1>사용자 관리</h1>

      <div className="controls">
        <div className="search-bar">
          <input
            type="text"
            placeholder="이메일 또는 이름으로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-bar">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">모든 상태</option>
            <option value="active">활성</option>
            <option value="inactive">비활성</option>
            <option value="blocked">차단됨</option>
          </select>
        </div>
      </div>

      <div className="user-table-container">
        <table className="user-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>이메일</th>
              <th>사용자명</th>
              <th>역할</th>
              <th>가입일</th>
              <th>마지막 로그인</th>
              <th>상태</th>
              <th>작업</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.email}</td>
                <td>{user.username}</td>
                <td>
                  <span className={`role-badge role-${user.role.toLowerCase()}`}>
                    {user.role}
                  </span>
                </td>
                <td>{user.createdAt}</td>
                <td>{user.lastLogin}</td>
                <td>
                  <select
                    value={user.status}
                    onChange={(e) => handleStatusChange(user.id, e.target.value)}
                    className={`status-select status-${user.status}`}
                  >
                    <option value="active">활성</option>
                    <option value="inactive">비활성</option>
                    <option value="blocked">차단됨</option>
                  </select>
                </td>
                <td>
                  <button
                    className="action-btn edit-btn"
                    onClick={() => console.log('Edit user', user.id)}
                  >
                    수정
                  </button>
                  <button
                    className="action-btn delete-btn"
                    onClick={() => handleDeleteUser(user.id)}
                  >
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="summary">
        전체 {filteredUsers.length}명의 사용자
      </div>
    </div>
  );
};

export default UserManagement;