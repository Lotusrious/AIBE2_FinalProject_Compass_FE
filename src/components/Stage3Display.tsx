import React, { useEffect, useRef } from 'react';
import './Stage3Display.css';

declare global {
  interface Window {
    kakao: any;
  }
}

interface Stage3Place {
  name: string;
  time: string;
  duration: string;
  category: string;
  description: string;
  latitude?: number;
  longitude?: number;
}

interface Stage3Day {
  day: number;
  date: string;
  theme: string;
  places: Stage3Place[];
}

interface Stage3DisplayProps {
  data: {
    totalDays: number;
    destination: string;
    itinerary: Stage3Day[];
    budget: {
      accommodation: number;
      food: number;
      transportation: number;
      activities: number;
      total: number;
    };
    qualityScore: number;
    startDate?: string;
    endDate?: string;
    travelers?: string;
  };
}

const Stage3Display: React.FC<Stage3DisplayProps> = ({ data }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  // 백엔드에서 모든 일정 데이터(출발지, 호텔 등 포함) 제공
  const enhancedItinerary = data.itinerary;

  useEffect(() => {
    if (mapContainerRef.current && window.kakao && window.kakao.maps) {
      window.kakao.maps.load(() => {
        const options = {
          center: new window.kakao.maps.LatLng(37.5665, 126.9780), // 서울 시청
          level: 8
        };

        mapRef.current = new window.kakao.maps.Map(mapContainerRef.current, options);

        // Mock 마커 추가 (나중에 실제 장소 좌표로 대체)
        enhancedItinerary.forEach((day, dayIndex) => {
          day.places.forEach((place, placeIndex) => {
            const lat = 37.5665 + (Math.random() - 0.5) * 0.1;
            const lng = 126.9780 + (Math.random() - 0.5) * 0.1;

            const markerPosition = new window.kakao.maps.LatLng(lat, lng);
            const marker = new window.kakao.maps.Marker({
              position: markerPosition,
              map: mapRef.current,
              title: place.name
            });

            // 인포윈도우 추가
            const infowindow = new window.kakao.maps.InfoWindow({
              content: `<div style="padding:5px;">${place.name}<br/>Day ${day.day} - ${place.time}</div>`
            });

            window.kakao.maps.event.addListener(marker, 'click', function() {
              infowindow.open(mapRef.current, marker);
            });
          });
        });
      });
    }
  }, [data]);

  return (
    <div className="stage3-display">
      <div className="stage3-header">
        <h2>🗺️ {data.destination} {data.totalDays}일 여행 일정</h2>
        <div className="stage3-meta">
          <span>📅 {data.startDate} ~ {data.endDate}</span>
          <span>👥 {data.travelers || '2'}명</span>
          <span>📊 품질 점수: {data.qualityScore}점</span>
        </div>
      </div>

      <div className="stage3-content">
        <div className="itinerary-section">
          <h3>📍 일정 상세</h3>
          <div className="days-container">
            {enhancedItinerary.map((day) => (
              <div key={day.day} className="day-card">
                <div className="day-header">
                  <span className="day-number">Day {day.day}</span>
                  <span className="day-date">{day.date}</span>
                </div>
                <div className="day-theme">{day.theme}</div>
                <div className="day-places">
                  {day.places.map((place, index) => (
                    <div key={index} className="place-item">
                      <div className="place-time">{place.time}</div>
                      <div className="place-info">
                        <div className="place-name">{place.name}</div>
                        <div className="place-meta">
                          <span className="place-category">{place.category}</span>
                          <span className="place-duration">{place.duration}</span>
                        </div>
                        <div className="place-description">{place.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="map-section">
          <h3>🗺️ 지도에서 보기</h3>
          <div ref={mapContainerRef} className="map-container" style={{ height: '400px' }}></div>
        </div>

        <div className="budget-section">
          <h3>💰 예상 비용</h3>
          <div className="budget-grid">
            <div className="budget-item">
              <span className="budget-label">숙박</span>
              <span className="budget-value">{data.budget.accommodation.toLocaleString()}원</span>
            </div>
            <div className="budget-item">
              <span className="budget-label">식사</span>
              <span className="budget-value">{data.budget.food.toLocaleString()}원</span>
            </div>
            <div className="budget-item">
              <span className="budget-label">교통</span>
              <span className="budget-value">{data.budget.transportation.toLocaleString()}원</span>
            </div>
            <div className="budget-item">
              <span className="budget-label">활동</span>
              <span className="budget-value">{data.budget.activities.toLocaleString()}원</span>
            </div>
            <div className="budget-item budget-total">
              <span className="budget-label">총 예상 비용</span>
              <span className="budget-value">{data.budget.total.toLocaleString()}원</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Stage3Display;