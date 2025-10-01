import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import tripService, { Trip } from '../services/tripService';
import authService from '../services/authService';
import './MyTripsPage.css';

// No mock data - only show actual trips from API

const MyTripsPage: React.FC = () => {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'전체' | '예정된 여행' | '진행 중' | '완료된 여행'>('전체');

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    try {
      setLoading(true);
      const userId = authService.getCurrentUserId();

      // Load actual trips from API
      const userTrips = await tripService.getTripsByUserId(userId);
      setTrips(userTrips);
    } catch (error) {
      console.error('Error loading trips:', error);
      setTrips([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTripClick = (trip: Trip) => {
    // Navigate to trip detail page with tripId
    navigate(`/travel-plan?tripId=${trip.id}`);
  };

  const handleNewTrip = () => {
    // Navigate to travel plan page to create a new trip
    navigate('/travel-plan');
  };

  const getStatusLabel = (status: Trip['status'], startDate: string) => {
    const today = new Date();
    const start = new Date(startDate);
    const daysUntil = Math.ceil((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (status === 'PLANNING') return 'PLANNING';
    if (status === 'CONFIRMED' && daysUntil > 0) return `D-${daysUntil}`;
    if (status === 'ONGOING') return '진행 중';
    if (status === 'COMPLETED') return '완료';
    return status;
  };

  const getStatusColor = (status: Trip['status'], startDate: string) => {
    const label = getStatusLabel(status, startDate);
    if (label.includes('D-')) return 'status-upcoming';
    if (label === '진행 중') return 'status-ongoing';
    if (label === '완료') return 'status-completed';
    return '';
  };

  const filteredTrips = trips.filter(trip => {
    if (selectedFilter === '전체') return true;
    const label = getStatusLabel(trip.status, trip.startDate);
    if (selectedFilter === '예정된 여행') return label.includes('D-') || trip.status === 'PLANNING';
    if (selectedFilter === '진행 중') return trip.status === 'ONGOING';
    if (selectedFilter === '완료된 여행') return trip.status === 'COMPLETED';
    return true;
  });

  return (
    <div className="my-trips-container">
      <div className="trips-header">
        <h1>내 여정</h1>
        <button className="new-trip-btn" onClick={handleNewTrip}>
          <span>+</span> 새 여행 계획
        </button>
      </div>

      <div className="filter-tabs">
        {['전체', '예정된 여행', '진행 중', '완료된 여행'].map(filter => (
          <button
            key={filter}
            className={`filter-tab ${selectedFilter === filter ? 'active' : ''}`}
            onClick={() => setSelectedFilter(filter as any)}
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="trips-summary">
        <p>
          총 <strong>{filteredTrips.length}</strong>개의 여행
        </p>
      </div>

      {loading ? (
        <div className="trips-loading">여행 목록을 불러오는 중...</div>
      ) : filteredTrips.length === 0 ? (
        <div className="trips-empty">
          <div className="empty-icon">✈️</div>
          <h3>아직 여행 계획이 없습니다</h3>
          <p>새로운 여행을 계획해보세요!</p>
          <button className="empty-create-btn" onClick={handleNewTrip}>
            여행 계획 만들기
          </button>
        </div>
      ) : (
        <div className="trips-grid">
          {filteredTrips.map(trip => (
            <div
              key={trip.id}
              className="trip-card"
              onClick={() => handleTripClick(trip)}
            >
              <div className="trip-card-header">
                <div className="trip-emoji">
                  {trip.tripStyle === 'LEISURE' ? '🏖️' :
                   trip.tripStyle === 'ADVENTURE' ? '🏔️' :
                   trip.tripStyle === 'CULTURAL' ? '🏛️' :
                   trip.tripStyle === 'BUSINESS' ? '💼' : '✈️'}
                </div>
                <span className={`trip-status ${getStatusColor(trip.status, trip.startDate)}`}>
                  {getStatusLabel(trip.status, trip.startDate)}
                </span>
              </div>

              <div className="trip-card-body">
                <h3 className="trip-title">{trip.title}</h3>
                <p className="trip-dates">
                  {new Date(trip.startDate).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })} - {new Date(trip.endDate).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
                </p>
              </div>

              <div className="trip-card-footer">
                <div className="trip-info-item">
                  <span className="info-icon">📍</span>
                  <span>{trip.destination}</span>
                </div>
                {trip.details && (
                  <div className="trip-info-item">
                    <span className="info-icon">📅</span>
                    <span>{trip.details.length}일</span>
                  </div>
                )}
                {trip.budget && (
                  <div className="trip-info-item">
                    <span className="info-icon">💰</span>
                    <span>{(trip.budget / 10000).toFixed(0)}만원</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyTripsPage;