import React, { useEffect, useState } from 'react';
import './DateRangePicker.css';

interface DateRangePickerProps {
  onDateSelect: (start: string, end: string) => void;
  startDate?: string;
  endDate?: string;
  initialDates?: {
    startDate: string;
    endDate: string;
  };
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({ 
  onDateSelect, 
  startDate: initialStart,
  endDate: initialEnd,
  initialDates
}) => {
  const defaultStart = initialStart ?? initialDates?.startDate ?? '';
  const defaultEnd = initialEnd ?? initialDates?.endDate ?? '';

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [showQuickOptions, setShowQuickOptions] = useState(true);

  useEffect(() => {
    setStartDate(defaultStart);
    setEndDate(defaultEnd);
  }, [defaultStart, defaultEnd]);

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // 다음 주말 계산
  const getNextWeekend = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilSaturday = (6 - dayOfWeek + 7) % 7;
    const nextSaturday = new Date(today);
    nextSaturday.setDate(today.getDate() + (daysUntilSaturday || 7));
    const nextSunday = new Date(nextSaturday);
    nextSunday.setDate(nextSaturday.getDate() + 1);
    return { saturday: nextSaturday, sunday: nextSunday };
  };

  // 날짜를 YYYY-MM-DD 형식으로 변환
  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 날짜를 한국어 형식으로 표시
  const formatDateKorean = (dateStr: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}월 ${date.getDate()}일`;
  };

  // 빠른 선택 옵션 처리
  const handleQuickOption = (option: string) => {
    let start: Date, end: Date;
    
    switch (option) {
      case 'next-weekend':
        const weekend = getNextWeekend();
        start = weekend.saturday;
        end = weekend.sunday;
        break;
      case 'this-week':
        start = new Date();
        end = new Date();
        end.setDate(start.getDate() + 6);
        break;
      case 'next-week':
        start = new Date();
        start.setDate(start.getDate() + 7);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        break;
      case 'next-month':
        start = new Date();
        start.setMonth(start.getMonth() + 1);
        start.setDate(1);
        end = new Date(start);
        end.setDate(end.getDate() + 6);
        break;
      default:
        return;
    }
    
    const startStr = formatDate(start);
    const endStr = formatDate(end);
    setStartDate(startStr);
    setEndDate(endStr);
    setShowQuickOptions(false);
  };

  // 날짜 선택 완료
  const handleSubmit = () => {
    if (startDate && endDate) {
      // YYYY-MM-DD ~ YYYY-MM-DD 형식으로 전송
      onDateSelect(startDate, endDate);
    }
  };

  // 날짜 범위 계산
  const calculateNights = () => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    }
    return 0;
  };

  const nights = calculateNights();

  return (
    <div className="date-range-picker">
      {showQuickOptions && (
        <div className="quick-date-options">
          <button 
            className="quick-option" 
            onClick={() => handleQuickOption('next-weekend')}
          >
            <span className="option-icon">🗓️</span>
            <span className="option-text">다음 주말</span>
          </button>
          <button 
            className="quick-option" 
            onClick={() => handleQuickOption('this-week')}
          >
            <span className="option-icon">📅</span>
            <span className="option-text">이번 주</span>
          </button>
          <button 
            className="quick-option" 
            onClick={() => handleQuickOption('next-week')}
          >
            <span className="option-icon">📆</span>
            <span className="option-text">다음 주</span>
          </button>
          <button 
            className="quick-option" 
            onClick={() => handleQuickOption('next-month')}
          >
            <span className="option-icon">🗓️</span>
            <span className="option-text">다음 달</span>
          </button>
        </div>
      )}
      
      <div className="date-inputs-container">
        <div className="date-input-wrapper">
          <label htmlFor="start-date">출발일</label>
          <input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setShowQuickOptions(false);
            }}
            min={formatDate(today)}
          />
          {startDate && (
            <span className="date-display">{formatDateKorean(startDate)}</span>
          )}
        </div>
        
        <div className="date-separator">→</div>
        
        <div className="date-input-wrapper">
          <label htmlFor="end-date">도착일</label>
          <input
            id="end-date"
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setShowQuickOptions(false);
            }}
            min={startDate || formatDate(today)}
          />
          {endDate && (
            <span className="date-display">{formatDateKorean(endDate)}</span>
          )}
        </div>
      </div>
      
      {startDate && endDate && (
        <div className="date-summary">
          <span className="nights-display">{nights}박 {nights + 1}일 여행</span>
        </div>
      )}
      
      <button
        className="date-submit-button"
        onClick={handleSubmit}
        disabled={!startDate || !endDate}
      >
        날짜 선택 완료
      </button>
    </div>
  );
};

export default DateRangePicker;
