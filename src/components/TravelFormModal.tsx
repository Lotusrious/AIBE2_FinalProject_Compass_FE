import React, { useEffect, useState } from 'react';
import KakaoMapSearch from './KakaoMapSearch';
import DateRangePicker from './DateRangePicker';
import './TravelFormModal.css';

export interface TravelFormData {
  destinations: string[];
  departureLocation: string;
  departureCoordinates?: { lat: number; lng: number };
  travelDates: {
    startDate: string;
    endDate: string;
  };
  departureTime: string;
  endTime: string;
  companionType: string;
  travelers: number;
  budget: number;
  travelStyle: string[];
  destinationUndecided?: boolean;
}

export interface TravelFormInitialData extends Partial<TravelFormData> {}

interface TravelFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: TravelFormData) => void;
  initialData?: TravelFormInitialData;
}

const TravelFormModal: React.FC<TravelFormModalProps> = ({ isOpen, onClose, onSubmit, initialData }) => {
  const [formData, setFormData] = useState<TravelFormData>({
    destinations: [],
    departureLocation: '',
    travelDates: {
      startDate: '',
      endDate: ''
    },
    departureTime: '09:00',
    endTime: '18:00',
    companionType: '가족',
    travelers: 2,
    budget: 1000000,
    travelStyle: ['culture']
  });

  const [currentDestination, setCurrentDestination] = useState('');
  const [isDestinationUndecided, setIsDestinationUndecided] = useState(false);

  const handleDepartureSelect = (location: any) => {
    setFormData({
      ...formData,
      departureLocation: location.place_name,
      departureCoordinates: {
        lat: parseFloat(location.y),
        lng: parseFloat(location.x)
      }
    });
  };

  const handleAddDestination = () => {
    if (isDestinationUndecided) {
      return;
    }

    if (currentDestination && !formData.destinations.includes(currentDestination)) {
      setFormData({
        ...formData,
        destinations: [...formData.destinations, currentDestination]
      });
      setCurrentDestination('');
    }
  };

  const handleRemoveDestination = (index: number) => {
    const newDestinations = formData.destinations.filter((_, i) => i !== index);
    setFormData({ ...formData, destinations: newDestinations });
  };

  const handleDateRangeSelect = (startDate: string, endDate: string) => {
    setFormData(prev => ({
      ...prev,
      travelDates: {
        startDate,
        endDate
      }
    }));
  };

  const handleStyleToggle = (style: string) => {
    const newStyles = formData.travelStyle.includes(style)
      ? formData.travelStyle.filter(s => s !== style)
      : [...formData.travelStyle, style];
    setFormData({ ...formData, travelStyle: newStyles });
  };

  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      setFormData(prev => ({
        ...prev,
        destinations: initialData.destinations ?? prev.destinations,
        departureLocation: initialData.departureLocation ?? prev.departureLocation,
        departureCoordinates: initialData.departureCoordinates ?? prev.departureCoordinates,
        travelDates: {
          startDate: initialData.travelDates?.startDate ?? prev.travelDates.startDate,
          endDate: initialData.travelDates?.endDate ?? prev.travelDates.endDate
        },
        departureTime: initialData.departureTime ?? prev.departureTime,
        endTime: initialData.endTime ?? prev.endTime,
        companionType: initialData.companionType ?? prev.companionType,
        travelers: initialData.travelers ?? prev.travelers,
        budget: initialData.budget ?? prev.budget,
        travelStyle: initialData.travelStyle ?? prev.travelStyle,
        destinationUndecided: initialData.destinationUndecided
      }));
      setIsDestinationUndecided(Boolean(initialData.destinationUndecided));
      setCurrentDestination('');
    } else {
      setIsDestinationUndecided(false);
    }
  }, [initialData, isOpen]);

  const toggleDestinationUndecided = () => {
    setIsDestinationUndecided(prev => {
      const next = !prev;
      if (next) {
        setFormData(current => ({
          ...current,
          destinations: [],
          destinationUndecided: true
        }));
        setCurrentDestination('');
      } else {
        setFormData(current => ({
          ...current,
          destinationUndecided: false
        }));
      }
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.departureLocation) {
      alert('출발지를 선택해주세요.');
      return;
    }
    if (!isDestinationUndecided && formData.destinations.length === 0) {
      alert('최소 하나 이상의 여행지를 입력해주세요.');
      return;
    }
    if (!formData.travelDates.startDate || !formData.travelDates.endDate) {
      alert('여행 날짜를 선택해주세요.');
      return;
    }

    onSubmit({
      ...formData,
      destinations: isDestinationUndecided ? [] : formData.destinations,
      destinationUndecided: isDestinationUndecided
    });
  };

  if (!isOpen) return null;

  const travelStyles = [
    { id: 'culture', label: '문화/역사' },
    { id: 'nature', label: '자연/힐링' },
    { id: 'activity', label: '액티비티' },
    { id: 'food', label: '맛집' },
    { id: 'shopping', label: '쇼핑' }
  ];

  const companionTypes = ['혼자', '친구', '연인', '가족', '아이와 함께'];

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h2>여행 정보 입력</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="travel-form">
          {/* 출발지 - Kakao Map Search */}
          <div className="form-group">
            <KakaoMapSearch
              label="출발지"
              placeholder="출발지를 검색하세요"
              value={formData.departureLocation}
              onLocationSelect={handleDepartureSelect}
            />
          </div>

          {/* 여행지 */}
          <div className="form-group">
            <label>여행지</label>
            <div className="destination-input">
              <input
                type="text"
                placeholder="여행지를 입력하세요"
                value={currentDestination}
                onChange={(e) => setCurrentDestination(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddDestination();
                  }
                }}
                disabled={isDestinationUndecided}
              />
              <button type="button" onClick={handleAddDestination} disabled={isDestinationUndecided}>추가</button>
            </div>
            <button
              type="button"
              className={`undecided-toggle ${isDestinationUndecided ? 'active' : ''}`}
              onClick={toggleDestinationUndecided}
            >
              <span className="undecided-toggle__icon">{isDestinationUndecided ? '✓' : '○'}</span>
              여행지 미정 (AI 추천)
            </button>
            <div className="destination-list">
              {formData.destinations.map((dest, index) => (
                <div key={index} className="destination-tag">
                  {dest}
                  <button type="button" onClick={() => handleRemoveDestination(index)}>×</button>
                </div>
              ))}
            </div>
          </div>

          {/* 여행 날짜 */}
          <div className="form-group">
            <label>여행 날짜</label>
            <DateRangePicker
              onDateSelect={handleDateRangeSelect}
              initialDates={formData.travelDates}
            />
          </div>

          {/* 하루 일정 시간 */}
          <div className="form-group-row">
            <div className="form-group">
              <label>시작 시간</label>
              <input
                type="time"
                value={formData.departureTime}
                onChange={(e) => setFormData({ ...formData, departureTime: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>종료 시간</label>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              />
            </div>
          </div>

          {/* 동행자 정보 */}
          <div className="form-group-row">
            <div className="form-group">
              <label>동행자 유형</label>
              <select
                value={formData.companionType}
                onChange={(e) => setFormData({ ...formData, companionType: e.target.value })}
              >
                {companionTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>인원</label>
              <input
                type="number"
                min="1"
                max="20"
                value={formData.travelers}
                onChange={(e) => setFormData({ ...formData, travelers: parseInt(e.target.value) })}
              />
            </div>
          </div>

          {/* 예산 */}
          <div className="form-group">
            <label>예산 (원)</label>
            <input
              type="number"
              min="0"
              step="100000"
              value={formData.budget}
              onChange={(e) => setFormData({ ...formData, budget: parseInt(e.target.value) })}
            />
          </div>

          {/* 여행 스타일 */}
          <div className="form-group">
            <label>여행 스타일 (복수 선택 가능)</label>
            <div className="style-options">
              {travelStyles.map(style => (
                <button
                  key={style.id}
                  type="button"
                  className={`style-option ${formData.travelStyle.includes(style.id) ? 'selected' : ''}`}
                  onClick={() => handleStyleToggle(style.id)}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>

          {/* 제출 버튼 */}
          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>취소</button>
            <button type="submit" className="btn-submit">여행 계획 생성</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TravelFormModal;
