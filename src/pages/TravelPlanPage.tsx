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
}

interface ItineraryDay {
  day?: number;
  date?: string;
  timeBlocks?: Record<string, TravelPlace[]>;
  totalPlaces?: number;
  estimatedDuration?: number;
}

interface ItineraryPayload {
  itinerary?: ItineraryDay[];
  totalDays?: number;
  totalDistance?: number;
  totalTime?: number;
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

const TravelPlanPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [threadId, setThreadId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itinerary, setItinerary] = useState<ItineraryDay[]>([]);
  const [meta, setMeta] = useState<{ totalDays?: number; totalDistance?: number; totalTime?: number }>({});

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get('threadId');
    setThreadId(id);

    if (!id) {
      setError('여행 계획을 찾을 수 없습니다. 메인 화면으로 돌아가 다시 시도해주세요.');
      setLoading(false);
      return;
    }

    const loadItinerary = async () => {
      setLoading(true);
      setError(null);
      try {
        const messages = await chatService.getMessages(id, 200);
        const finalMessage = findFinalItineraryMessage(messages);

        if (finalMessage?.data?.itinerary) {
          hydrateItinerary(finalMessage.data as ItineraryPayload);
          return;
        }

        // Fallback: request itinerary generation directly if cached message not found
        const fallback = await followUpService.generateTravelPlan(id);
        hydrateItinerary(fallback as ItineraryPayload);
      } catch (fetchError) {
        console.error('Failed to load travel plan:', fetchError);
        setError('여행 계획을 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.');
      } finally {
        setLoading(false);
      }
    };

    loadItinerary();
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

  const handleBackToChat = () => {
    if (threadId) {
      navigate('/', { state: { focusThreadId: threadId } });
      return;
    }
    navigate('/');
  };

  return (
    <div className="travel-plan-page">
      <div className="plan-hero">
        <CompassBadge />
        <div className="hero-text">
          <h1>여행 계획 미리보기</h1>
          <p>AI Compass가 완성한 맞춤 일정입니다. 아래에서 일자별 추천 루트를 확인하세요.</p>
        </div>
      </div>

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
          <div className="plan-summary">
            <div className="summary-item">
              <span className="summary-label">일정 기간</span>
              <span className="summary-value">{formattedMeta.days}일</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">이동 거리</span>
              <span className="summary-value">{formattedMeta.distance}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">예상 소요 시간</span>
              <span className="summary-value">{formattedMeta.duration}</span>
            </div>
          </div>

          <div className="plan-content">
            {itinerary.map((day) => {
              const dayLabel = day.day ? `Day ${day.day}` : 'Day';
              const displayDate = formatDisplayDate(day.date);
              const timeBlocks = day.timeBlocks ? Object.entries(day.timeBlocks) : [];

              return (
                <section key={`${dayLabel}-${day.date ?? ''}`} className="day-card">
                  <header className="day-card__header">
                    <div>
                      <h2>{dayLabel}</h2>
                      {displayDate && <p className="day-card__date">{displayDate}</p>}
                    </div>
                    {typeof day.totalPlaces === 'number' && (
                      <span className="day-card__badge">{day.totalPlaces}곳 방문</span>
                    )}
                  </header>

                  <div className="time-blocks">
                    {timeBlocks.length === 0 ? (
                      <div className="empty-block">등록된 일정이 없습니다.</div>
                    ) : (
                      timeBlocks.map(([blockLabel, places]) => (
                        <div className="time-block" key={blockLabel}>
                          <div className="time-block__header">
                            <span className="time-block__slot">{blockLabel}</span>
                            {places && places.length > 0 && (
                              <span className="time-block__count">{places.length}곳</span>
                            )}
                          </div>
                          <ul className="place-list">
                            {(places || []).map((place, idx) => (
                              <li className="place-item" key={place.id || `${blockLabel}-${idx}`}>
                                <div className="place-item__title">
                                  <span>{place.name || '미정 장소'}</span>
                                  {place.isUserSelected && <span className="place-item__tag">직접 선택</span>}
                                </div>
                                {place.address && <p className="place-item__address">{place.address}</p>}
                                {(place.description || place.category || place.rating) && (
                                  <div className="place-item__meta">
                                    {place.category && <span>{place.category}</span>}
                                    {typeof place.rating === 'number' && place.rating > 0 && (
                                      <span>⭐ {place.rating.toFixed(1)}</span>
                                    )}
                                  </div>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              );
            })}
          </div>

          <div className="plan-actions">
            <button type="button" className="primary-button" onClick={handleBackToChat}>
              채팅으로 돌아가기
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default TravelPlanPage;
