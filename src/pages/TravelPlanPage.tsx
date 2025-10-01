import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import chatService, { Message } from '../services/chatService';
import { followUpService } from '../services/followUpService';
import './TravelPlanPage.css';

interface TravelPlace {
  id?: string;
  name?: string;
  address?: string;
  category?: string;
  description?: string;
  lat?: number;
  lng?: number;
  rating?: number;
  isUserSelected?: boolean;
  time?: string;
  duration?: number;
}

interface ItineraryDay {
  day?: number;
  date?: string;
  timeBlocks?: Record<string, TravelPlace[]>;
  totalPlaces?: number;
  estimatedDuration?: number;
  weather?: {
    temp?: string;
    condition?: string;
    icon?: string;
  };
}

interface ItineraryPayload {
  itinerary?: ItineraryDay[];
  totalDays?: number;
  totalDistance?: number;
  totalTime?: number;
  destination?: string;
  budget?: {
    accommodation: number;
    food: number;
    transportation: number;
    activities: number;
    total: number;
  };
}

const CompassBadge: React.FC = () => (
  <div className="compass-badge" aria-hidden="true">
    <svg viewBox="0 0 64 64" role="img">
      <defs>
        <linearGradient id="compassGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#667eea" />
          <stop offset="100%" stopColor="#764ba2" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="url(#compassGradient)" opacity="0.85" />
      <circle cx="32" cy="32" r="22" fill="#0f172a" opacity="0.9" />
      <path
        d="M32 12 L40 32 L32 52 L24 32 Z"
        fill="#f8fafc"
        stroke="#c4b5fd"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="32" r="4" fill="#facc15" />
    </svg>
  </div>
);

// Mock data for Seoul 3박 4일 여행
const mockItinerary: ItineraryPayload = {
  destination: '서울',
  totalDays: 4,
  totalDistance: 85.2,
  totalTime: 1680,
  budget: {
    accommodation: 450000,
    food: 320000,
    transportation: 80000,
    activities: 150000,
    total: 1000000
  },
  itinerary: [
    {
      day: 1,
      date: '2024-03-15',
      weather: { temp: '15°C', condition: '맑음', icon: '☀️' },
      totalPlaces: 5,
      estimatedDuration: 540, // 9시간
      timeBlocks: {
        '08:00': [{
          id: '1-0',
          name: '인천종합터미널 출발',
          address: '인천 미추홀구 매소홀로 482',
          category: '출발',
          time: '08:00',
          duration: 0,
          rating: 4.5
        }],
        '09:00': [{
          id: '1-1',
          name: '경복궁',
          address: '서울 종로구 사직로 161',
          category: '역사',
          time: '09:00',
          duration: 120,
          rating: 4.6
        }],
        '11:30': [{
          id: '1-2',
          name: '북촌 한옥마을',
          address: '서울 종로구 계동길 37',
          category: '관광',
          time: '11:30',
          duration: 90,
          rating: 4.4
        }],
        '13:30': [{
          id: '1-3',
          name: '삼청동 수제비',
          address: '서울 종로구 삼청로 101-1',
          category: '맛집',
          time: '13:30',
          duration: 60,
          rating: 4.5
        }],
        '15:00': [{
          id: '1-4',
          name: '인사동 쌈지길',
          address: '서울 종로구 인사동길 44',
          category: '쇼핑',
          time: '15:00',
          duration: 90,
          rating: 4.3
        }],
        '18:00': [{
          id: '1-5',
          name: '광장시장',
          address: '서울 종로구 창경궁로 88',
          category: '맛집',
          time: '18:00',
          duration: 90,
          rating: 4.4
        }],
        '20:00': [{
          id: '1-6',
          name: '롯데호텔서울 체크인',
          address: '서울 중구 을지로 30',
          category: '숙박',
          time: '20:00',
          duration: 30,
          rating: 4.7
        }]
      }
    },
    {
      day: 2,
      date: '2024-03-16',
      weather: { temp: '17°C', condition: '구름 조금', icon: '⛅' },
      totalPlaces: 5,
      estimatedDuration: 540, // 9시간
      timeBlocks: {
        '09:00': [{
          id: '2-0',
          name: '롯데호텔서울 체크아웃',
          address: '서울 중구 을지로 30',
          category: '숙박',
          time: '09:00',
          duration: 30,
          rating: 4.7
        }],
        '10:00': [{
          id: '2-1',
          name: 'N서울타워',
          address: '서울 용산구 남산공원길 105',
          category: '관광',
          time: '10:00',
          duration: 150,
          rating: 4.5
        }],
        '13:00': [{
          id: '2-2',
          name: '명동 교자',
          address: '서울 중구 명동10길 29',
          category: '맛집',
          time: '13:00',
          duration: 60,
          rating: 4.3
        }],
        '14:30': [{
          id: '2-3',
          name: '명동 쇼핑거리',
          address: '서울 중구 명동길',
          category: '쇼핑',
          time: '14:30',
          duration: 120,
          rating: 4.4
        }],
        '17:00': [{
          id: '2-4',
          name: '청계천',
          address: '서울 종로구 창신동',
          category: '관광',
          time: '17:00',
          duration: 60,
          rating: 4.2
        }],
        '19:00': [{
          id: '2-5',
          name: '동대문 디자인 플라자',
          address: '서울 중구 을지로 281',
          category: '문화',
          time: '19:00',
          duration: 90,
          rating: 4.3
        }]
      }
    },
    {
      day: 3,
      date: '2024-03-17',
      weather: { temp: '14°C', condition: '흐림', icon: '☁️' },
      totalPlaces: 5,
      estimatedDuration: 570, // 9시간 30분
      timeBlocks: {
        '09:30': [{
          id: '3-1',
          name: '한강 유람선',
          address: '서울 영등포구 여의동로 330',
          category: '액티비티',
          time: '09:30',
          duration: 90,
          rating: 4.4
        }],
        '11:30': [{
          id: '3-2',
          name: '여의도 한강공원',
          address: '서울 영등포구 여의동로 330',
          category: '자연',
          time: '11:30',
          duration: 60,
          rating: 4.5
        }],
        '13:00': [{
          id: '3-3',
          name: '더현대 서울',
          address: '서울 영등포구 여의대로 108',
          category: '쇼핑/맛집',
          time: '13:00',
          duration: 150,
          rating: 4.6
        }],
        '16:00': [{
          id: '3-4',
          name: '강남 코엑스',
          address: '서울 강남구 봉은사로 524',
          category: '쇼핑',
          time: '16:00',
          duration: 120,
          rating: 4.4
        }],
        '19:00': [{
          id: '3-5',
          name: '가로수길',
          address: '서울 강남구 신사동 가로수길',
          category: '맛집/쇼핑',
          time: '19:00',
          duration: 120,
          rating: 4.5
        }]
      }
    },
    {
      day: 4,
      date: '2024-03-18',
      weather: { temp: '16°C', condition: '맑음', icon: '☀️' },
      totalPlaces: 4,
      estimatedDuration: 390, // 6시간 30분
      timeBlocks: {
        '10:00': [{
          id: '4-1',
          name: '이태원 거리',
          address: '서울 용산구 이태원동',
          category: '쇼핑/문화',
          time: '10:00',
          duration: 120,
          rating: 4.3
        }],
        '12:30': [{
          id: '4-2',
          name: '이태원 브런치 카페',
          address: '서울 용산구 이태원로 145',
          category: '맛집',
          time: '12:30',
          duration: 90,
          rating: 4.4
        }],
        '14:30': [{
          id: '4-3',
          name: '한남동 카페거리',
          address: '서울 용산구 한남대로',
          category: '카페',
          time: '14:30',
          duration: 90,
          rating: 4.5
        }],
        '16:30': [{
          id: '4-4',
          name: '서울역',
          address: '서울 용산구 한강대로 405',
          category: '교통',
          time: '16:30',
          duration: 30,
          rating: 4.2
        }]
      }
    }
  ]
};

const TravelPlanPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedDay, setSelectedDay] = useState(1);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itinerary, setItinerary] = useState<ItineraryDay[]>([]);
  const [meta, setMeta] = useState<{
    totalDays?: number;
    totalDistance?: number;
    totalTime?: number;
    destination?: string;
    budget?: {
      accommodation: number;
      food: number;
      transportation: number;
      activities: number;
      total: number;
    };
  }>({});

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get('threadId');
    setThreadId(id);

    setLoading(true);

    // localStorage에서 실제 데이터 가져오기
    if (id) {
      const storedData = localStorage.getItem(`itinerary_${id}`);
      if (storedData) {
        try {
          const parsedData = JSON.parse(storedData);
          hydrateItinerary(parsedData);
        } catch (error) {
          console.error('Failed to parse itinerary data:', error);
          hydrateItinerary(mockItinerary);
        }
      } else {
        // localStorage에 데이터가 없으면 mock 데이터 사용
        hydrateItinerary(mockItinerary);
      }
    } else {
      hydrateItinerary(mockItinerary);
    }

    setLoading(false);
  }, [location.search]);

  const hydrateItinerary = (payload: ItineraryPayload | undefined) => {
    if (!payload || !payload.itinerary || payload.itinerary.length === 0) {
      setError('생성된 여행 일정이 없습니다. AI에게 여행 계획 생성을 다시 요청해보세요.');
      setItinerary([]);
      return;
    }

    setItinerary(payload.itinerary);
    setMeta({
      totalDays: payload.totalDays ?? payload.itinerary.length,
      totalDistance: payload.totalDistance,
      totalTime: payload.totalTime,
      destination: payload.destination,
      budget: payload.budget
    });
  };

  const findFinalItineraryMessage = (messages: Message[]): Message | undefined => {
    return [...messages].reverse().find((msg) => {
      const hasItineraryData = Boolean(msg.data && (msg.data as any).itinerary);
      return msg.type === 'FINAL_ITINERARY_CREATED' || hasItineraryData;
    });
  };

  const formattedMeta = useMemo(() => {
    const formatDistance = (distance?: number) => {
      if (!distance || Number.isNaN(distance)) return '-';
      return `${distance.toFixed(1)} km`;
    };

    const formatDuration = (minutes?: number) => {
      if (!minutes || Number.isNaN(minutes)) return '-';
      const hrs = Math.floor(minutes / 60);
      const mins = Math.round(minutes % 60);
      if (hrs === 0) {
        return `${mins}분`;
      }
      if (mins === 0) {
        return `${hrs}시간`;
      }
      return `${hrs}시간 ${mins}분`;
    };

    return {
      days: meta.totalDays ?? itinerary.length,
      distance: formatDistance(meta.totalDistance),
      duration: formatDuration(meta.totalTime),
    };
  }, [meta, itinerary.length]);

  const formatDisplayDate = (date?: string) => {
    if (!date) return null;
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toLocaleDateString('ko-KR', {
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    });
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes || Number.isNaN(minutes)) return '-';
    const hrs = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hrs === 0) {
      return `${mins}분`;
    }
    if (mins === 0) {
      return `${hrs}시간`;
    }
    return `${hrs}시간 ${mins}분`;
  };

  const handleBackToChat = () => {
    if (threadId) {
      navigate('/', { state: { focusThreadId: threadId } });
      return;
    }
    navigate('/');
  };

  const currentDayData = itinerary[selectedDay - 1];

  return (
    <div className="travel-plan-container">
      {loading ? (
        <div className="plan-status">여행 일정을 불러오는 중입니다...</div>
      ) : error ? (
        <div className="plan-error">
          <p>{error}</p>
          <button type="button" className="primary-button" onClick={handleBackToChat}>
            채팅으로 돌아가기
          </button>
        </div>
      ) : (
        <>
          <header className="travel-header">
            <h1>✈️ 내 여정 - {meta.destination}</h1>
            <p>{meta.totalDays}일간의 여행 계획</p>
          </header>

          <nav className="day-tabs">
            {itinerary.map((day, index) => (
              <button
                key={`day-${day.day}`}
                className={`day-tab ${selectedDay === day.day ? 'active' : ''}`}
                onClick={() => setSelectedDay(day.day || index + 1)}
              >
                <span className="day-label">Day {day.day}</span>
                <span className="day-date">{formatDisplayDate(day.date) || ''}</span>
              </button>
            ))}
          </nav>

          <div className="travel-content">
            <div className="timeline-section">
              {currentDayData && currentDayData.timeBlocks && (
                <>
                  <div className="timeline-header">
                    <h2>Day {currentDayData.day} 일정</h2>
                    <div className="weather-info">
                      {currentDayData.weather && (
                        <>
                          <span className="weather-icon">{currentDayData.weather.icon}</span>
                          <span className="weather-temp">{currentDayData.weather.temp}</span>
                          <span className="weather-condition">{currentDayData.weather.condition}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="timeline">
                    {Object.entries(currentDayData.timeBlocks).map(([time, places], index) => (
                      <div key={`${time}-${index}`} className="timeline-item">
                        <div className="timeline-time">
                          <span>{time}</span>
                        </div>
                        <div className="timeline-marker">
                          <div className="marker-circle"></div>
                          {index < Object.entries(currentDayData.timeBlocks || {}).length - 1 && (
                            <div className="marker-line"></div>
                          )}
                        </div>
                        <div className="timeline-content">
                          {places.map((place) => (
                            <div key={place.id} className="place-card">
                              <div className="place-header">
                                <h3>{place.name}</h3>
                                <span className="place-category">{place.category}</span>
                              </div>
                              <p className="place-address">{place.address}</p>
                              <div className="place-meta">
                                {place.duration && (
                                  <span className="duration">⏱️ {place.duration}분</span>
                                )}
                                {place.rating && (
                                  <span className="rating">⭐ {place.rating.toFixed(1)}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <aside className="side-panel">
              <div className="map-placeholder">
                <div className="map-icon">🗺️</div>
                <p>지도가 여기에 표시됩니다</p>
              </div>

              <div className="day-summary">
                <h3>일정 요약</h3>
                <div className="summary-items">
                  <div className="summary-row">
                    <span>방문 장소</span>
                    <span>{currentDayData?.totalPlaces || 0}곳</span>
                  </div>
                  <div className="summary-row">
                    <span>예상 시간</span>
                    <span>{formatDuration(currentDayData?.estimatedDuration)}</span>
                  </div>
                </div>
              </div>

              {meta.budget && (
                <div className="budget-summary">
                  <h3>예산</h3>
                  <div className="budget-items">
                    <div className="budget-row">
                      <span>숙박</span>
                      <span>{meta.budget.accommodation.toLocaleString()}원</span>
                    </div>
                    <div className="budget-row">
                      <span>식비</span>
                      <span>{meta.budget.food.toLocaleString()}원</span>
                    </div>
                    <div className="budget-row">
                      <span>교통</span>
                      <span>{meta.budget.transportation.toLocaleString()}원</span>
                    </div>
                    <div className="budget-row">
                      <span>활동</span>
                      <span>{meta.budget.activities.toLocaleString()}원</span>
                    </div>
                    <div className="budget-row total">
                      <span>총 예산</span>
                      <span>{meta.budget.total.toLocaleString()}원</span>
                    </div>
                  </div>
                </div>
              )}
            </aside>
          </div>
        </>
      )}
    </div>
  );
};

export default TravelPlanPage;
