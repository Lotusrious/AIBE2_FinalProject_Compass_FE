import React, { useState, useEffect, useRef } from 'react';
import './QuickTravelForm.css';

declare global {
  interface Window {
    kakao: any;
  }
}

interface QuickTravelFormProps {
  onSubmit: (formData: any) => void;
  onClose?: () => void;
}

const QuickTravelForm: React.FC<QuickTravelFormProps> = ({ onSubmit, onClose }) => {
  const [formData, setFormData] = useState({
    destination: '',
    destinationUndecided: false,
    departureLocation: '',
    departureLat: 0,
    departureLng: 0,
    startDate: '',
    departureTime: '09:00',
    endDate: '',
    endTime: '18:00',
    travelCompanion: '커플',
    travelers: '2',
    travelStyle: '균형잡힌',
    budget: '중간',
    accommodation: '호텔',
    transportation: '대중교통',
    interests: [] as string[]
  });

  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrData, setOcrData] = useState<any>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const placesServiceRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // 카카오 지도 API 초기화
    if (window.kakao && window.kakao.maps) {
      window.kakao.maps.load(() => {
        placesServiceRef.current = new window.kakao.maps.services.Places();
      });
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // 출발지 검색
    if (name === 'departureLocation' && value.length > 0) {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      searchTimeoutRef.current = setTimeout(() => {
        searchPlaces(value);
      }, 300);
    } else if (name === 'departureLocation' && value.length === 0) {
      setShowSearchResults(false);
      setSearchResults([]);
    }
  };

  const searchPlaces = (keyword: string) => {
    if (!placesServiceRef.current) return;

    placesServiceRef.current.keywordSearch(keyword, (data: any, status: any) => {
      if (status === window.kakao.maps.services.Status.OK) {
        setSearchResults(data.slice(0, 5)); // 최대 5개 결과만 표시
        setShowSearchResults(true);
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
      }
    });
  };

  const selectPlace = (place: any) => {
    setFormData(prev => ({
      ...prev,
      departureLocation: place.place_name,
      departureLat: parseFloat(place.y),
      departureLng: parseFloat(place.x)
    }));
    setShowSearchResults(false);
    setSearchResults([]);
  };

  const toggleDestinationUndecided = () => {
    setFormData(prev => ({
      ...prev,
      destinationUndecided: !prev.destinationUndecided,
      destination: !prev.destinationUndecided ? '' : prev.destination
    }));
  };

  const handleInterestToggle = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      setOcrLoading(true);

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('http://localhost:8080/api/v1/ocr/extract', {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          const result = await response.json();
          setOcrData(result);

          // OCR 결과로 폼 자동 입력
          if (result.hotelName) {
            setFormData(prev => ({ ...prev, accommodation: result.hotelName }));
          }
          if (result.checkIn) {
            setFormData(prev => ({ ...prev, startDate: result.checkIn }));
          }
          if (result.checkInTime) {
            setFormData(prev => ({ ...prev, departureTime: result.checkInTime }));
          }
          if (result.checkOut) {
            setFormData(prev => ({ ...prev, endDate: result.checkOut }));
          }
          if (result.checkOutTime) {
            setFormData(prev => ({ ...prev, endTime: result.checkOutTime }));
          }
          if (result.address) {
            setFormData(prev => ({ ...prev, destination: result.region || result.address }));
          }

          console.log('OCR extraction successful:', result);
        } else {
          console.error('OCR extraction failed:', response.statusText);
        }
      } catch (error) {
        console.error('OCR API call error:', error);
      } finally {
        setOcrLoading(false);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setUploadedFile(file);
      setOcrLoading(true);

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('http://localhost:8080/api/v1/ocr/extract', {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          const result = await response.json();
          setOcrData(result);

          // OCR 결과로 폼 자동 입력
          if (result.hotelName) {
            setFormData(prev => ({ ...prev, accommodation: result.hotelName }));
          }
          if (result.checkIn) {
            setFormData(prev => ({ ...prev, startDate: result.checkIn }));
          }
          if (result.checkInTime) {
            setFormData(prev => ({ ...prev, departureTime: result.checkInTime }));
          }
          if (result.checkOut) {
            setFormData(prev => ({ ...prev, endDate: result.checkOut }));
          }
          if (result.checkOutTime) {
            setFormData(prev => ({ ...prev, endTime: result.checkOutTime }));
          }
          if (result.address) {
            setFormData(prev => ({ ...prev, destination: result.region || result.address }));
          }

          console.log('OCR extraction successful:', result);
        } else {
          console.error('OCR extraction failed:', response.statusText);
        }
      } catch (error) {
        console.error('OCR API call error:', error);
      } finally {
        setOcrLoading(false);
      }
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
    setOcrData(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // OCR 파일이 있으면 formData와 함께 전송
    const submitData = {
      ...formData,
      ocrFile: uploadedFile,
      ocrData: ocrData  // OCR 추출 결과 포함
    };
    onSubmit(submitData);
  };

  const interests = ['맛집', '관광', '쇼핑', '문화', '자연', '액티비티', '휴식', '사진'];

  return (
    <div className="quick-travel-form">
      <div className="form-header">
        <h3 className="form-title">✈️ 빠른 여행 정보 입력</h3>
        {onClose && (
          <button type="button" className="form-close" onClick={onClose}>×</button>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          {/* 여행지 */}
          <div className="form-field">
            <label>여행지</label>
            <div className="destination-wrapper">
              <input
                type="text"
                name="destination"
                value={formData.destination}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault(); // 엔터키로 폼 제출 방지
                  }
                }}
                placeholder="예: 서울, 부산, 제주"
                disabled={formData.destinationUndecided}
                className={formData.destinationUndecided ? 'disabled' : ''}
              />
              <button
                type="button"
                className={`undecided-btn ${formData.destinationUndecided ? 'active' : ''}`}
                onClick={toggleDestinationUndecided}
              >
                {formData.destinationUndecided && <span className="check">✓</span>}
                여행지 미지정
              </button>
            </div>
          </div>

          {/* 출발지 */}
          <div className="form-field">
            <label>출발지</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                name="departureLocation"
                value={formData.departureLocation}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault(); // 엔터키로 폼 제출 방지
                  }
                }}
                placeholder="예: 서울역, 강남역, 서울시청, 인천공항"
                autoComplete="off"
              />
              {showSearchResults && searchResults.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  zIndex: 1000,
                  boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                  marginTop: '4px'
                }}>
                  {searchResults.map((place, index) => (
                    <div
                      key={index}
                      onClick={() => selectPlace(place)}
                      style={{
                        padding: '10px 12px',
                        cursor: 'pointer',
                        borderBottom: index < searchResults.length - 1 ? '1px solid #eee' : 'none'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                    >
                      <div style={{ fontWeight: '500', color: '#333' }}>{place.place_name}</div>
                      <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>{place.address_name}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 출발일 */}
          <div className="form-field">
            <label>출발일</label>
            <input
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleInputChange}
            />
          </div>

          {/* 출발 시간 */}
          <div className="form-field">
            <label>출발 시간</label>
            <input
              type="time"
              name="departureTime"
              value={formData.departureTime}
              onChange={handleInputChange}
            />
          </div>

          {/* 도착일 */}
          <div className="form-field">
            <label>도착일</label>
            <input
              type="date"
              name="endDate"
              value={formData.endDate}
              onChange={handleInputChange}
            />
          </div>

          {/* 종료 시간 */}
          <div className="form-field">
            <label>종료 시간</label>
            <input
              type="time"
              name="endTime"
              value={formData.endTime}
              onChange={handleInputChange}
            />
          </div>

          {/* 동행 */}
          <div className="form-field">
            <label>동행</label>
            <select
              name="travelCompanion"
              value={formData.travelCompanion}
              onChange={handleInputChange}
            >
              <option value="혼자">혼자</option>
              <option value="커플">커플</option>
              <option value="가족">가족</option>
              <option value="친구">친구</option>
              <option value="기타">기타</option>
            </select>
          </div>

          {/* 인원 */}
          <div className="form-field">
            <label>인원</label>
            <select
              name="travelers"
              value={formData.travelers}
              onChange={handleInputChange}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, '10+'].map(num => (
                <option key={num} value={num}>{num}명</option>
              ))}
            </select>
          </div>

          {/* 여행 스타일 */}
          <div className="form-field">
            <label>여행 스타일</label>
            <select
              name="travelStyle"
              value={formData.travelStyle}
              onChange={handleInputChange}
            >
              <option value="빡빡한">빡빡한 일정</option>
              <option value="균형잡힌">균형잡힌</option>
              <option value="여유로운">여유로운</option>
            </select>
          </div>

          {/* 예산 */}
          <div className="form-field">
            <label>예산</label>
            <select
              name="budget"
              value={formData.budget}
              onChange={handleInputChange}
            >
              <option value="저예산">저예산</option>
              <option value="중간">중간</option>
              <option value="고급">고급</option>
              <option value="럭셔리">럭셔리</option>
            </select>
          </div>

          {/* 숙소 유형 */}
          <div className="form-field">
            <label>숙소 유형</label>
            <select
              name="accommodation"
              value={formData.accommodation}
              onChange={handleInputChange}
            >
              <option value="호텔">호텔</option>
              <option value="펜션">펜션</option>
              <option value="리조트">리조트</option>
              <option value="게스트하우스">게스트하우스</option>
              <option value="한옥">한옥</option>
            </select>
          </div>

          {/* 교통수단 */}
          <div className="form-field">
            <label>교통수단</label>
            <select
              name="transportation"
              value={formData.transportation}
              onChange={handleInputChange}
            >
              <option value="대중교통">대중교통</option>
              <option value="렌터카">렌터카</option>
              <option value="도보중심">도보 중심</option>
              <option value="택시">택시/전세버스</option>
            </select>
          </div>
        </div>

        {/* 관심사 */}
        <div className="form-field-full">
          <label>관심사 (복수 선택 가능)</label>
          <div className="interests-grid">
            {interests.map(interest => (
              <button
                key={interest}
                type="button"
                className={`interest-chip ${formData.interests.includes(interest) ? 'active' : ''}`}
                onClick={() => handleInterestToggle(interest)}
              >
                {interest}
              </button>
            ))}
          </div>
        </div>

        {/* OCR 업로드 섹션 */}
        <div className="form-field-full ocr-section">
          <label>여행 일정표 이미지 업로드 (선택)</label>
          {!uploadedFile ? (
            <div
              className="ocr-upload-area"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              <div className="upload-icon">📷</div>
              <div className="upload-text">
                {ocrLoading ? 'OCR 처리 중...' : '클릭하거나 이미지를 드래그하여 업로드'}
              </div>
              <div className="upload-hint">
                여행 일정표, 티켓, 예약 확인서 등의 이미지를 업로드하면<br />
                자동으로 정보를 추출합니다
              </div>
            </div>
          ) : (
            <div className="uploaded-file">
              <div className="file-info">
                <span>📄</span>
                <span>{uploadedFile.name}</span>
                {ocrData && (
                  <div style={{ marginTop: '12px', width: '100%' }}>
                    <div style={{ marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#10b981' }}>
                      ✓ OCR 추출 완료
                    </div>
                    <table style={{
                      width: '100%',
                      fontSize: '12px',
                      borderCollapse: 'collapse',
                      marginTop: '8px'
                    }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
                          <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600' }}>항목</th>
                          <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600' }}>추출된 정보</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ocrData.hotelName && (
                          <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                            <td style={{ padding: '8px', fontWeight: '500', color: '#6b7280' }}>호텔명</td>
                            <td style={{ padding: '8px' }}>{ocrData.hotelName}</td>
                          </tr>
                        )}
                        {ocrData.address && (
                          <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                            <td style={{ padding: '8px', fontWeight: '500', color: '#6b7280' }}>주소</td>
                            <td style={{ padding: '8px' }}>{ocrData.address}</td>
                          </tr>
                        )}
                        {ocrData.checkIn && (
                          <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                            <td style={{ padding: '8px', fontWeight: '500', color: '#6b7280' }}>체크인 날짜</td>
                            <td style={{ padding: '8px' }}>{ocrData.checkIn}</td>
                          </tr>
                        )}
                        {ocrData.checkInTime && (
                          <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                            <td style={{ padding: '8px', fontWeight: '500', color: '#6b7280' }}>체크인 시간</td>
                            <td style={{ padding: '8px' }}>{ocrData.checkInTime}</td>
                          </tr>
                        )}
                        {ocrData.checkOut && (
                          <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                            <td style={{ padding: '8px', fontWeight: '500', color: '#6b7280' }}>체크아웃 날짜</td>
                            <td style={{ padding: '8px' }}>{ocrData.checkOut}</td>
                          </tr>
                        )}
                        {ocrData.checkOutTime && (
                          <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                            <td style={{ padding: '8px', fontWeight: '500', color: '#6b7280' }}>체크아웃 시간</td>
                            <td style={{ padding: '8px' }}>{ocrData.checkOutTime}</td>
                          </tr>
                        )}
                        {ocrData.reservationNumber && (
                          <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                            <td style={{ padding: '8px', fontWeight: '500', color: '#6b7280' }}>예약 번호</td>
                            <td style={{ padding: '8px' }}>{ocrData.reservationNumber}</td>
                          </tr>
                        )}
                        {ocrData.roomType && (
                          <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                            <td style={{ padding: '8px', fontWeight: '500', color: '#6b7280' }}>객실 타입</td>
                            <td style={{ padding: '8px' }}>{ocrData.roomType}</td>
                          </tr>
                        )}
                        {ocrData.guestName && (
                          <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                            <td style={{ padding: '8px', fontWeight: '500', color: '#6b7280' }}>투숙객명</td>
                            <td style={{ padding: '8px' }}>{ocrData.guestName}</td>
                          </tr>
                        )}
                        {ocrData.phone && (
                          <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                            <td style={{ padding: '8px', fontWeight: '500', color: '#6b7280' }}>전화번호</td>
                            <td style={{ padding: '8px' }}>{ocrData.phone}</td>
                          </tr>
                        )}
                        {ocrData.nights && (
                          <tr>
                            <td style={{ padding: '8px', fontWeight: '500', color: '#6b7280' }}>숙박 일수</td>
                            <td style={{ padding: '8px' }}>{ocrData.nights}박</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <button
                type="button"
                className="remove-file"
                onClick={removeFile}
                style={{ marginTop: ocrData ? '12px' : '0' }}
              >
                제거
              </button>
            </div>
          )}
        </div>

        <button type="submit" className="submit-btn">
          여행 계획 생성하기 🚀
        </button>
      </form>
    </div>
  );
};

export default QuickTravelForm;