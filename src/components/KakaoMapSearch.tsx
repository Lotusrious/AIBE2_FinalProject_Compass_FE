import React, { useState, useEffect, useRef } from 'react';
import './KakaoMapSearch.css';

declare global {
  interface Window {
    kakao: any;
  }
}

interface Location {
  place_name: string;
  address_name: string;
  road_address_name: string;
  x: string; // longitude
  y: string; // latitude
}

interface KakaoMapSearchProps {
  placeholder?: string;
  onLocationSelect: (location: Location) => void;
  value?: string;
  label?: string;
}

const KakaoMapSearch: React.FC<KakaoMapSearchProps> = ({
  placeholder = "장소를 검색하세요",
  onLocationSelect,
  value = "",
  label = "위치"
}) => {
  const [searchKeyword, setSearchKeyword] = useState(value);
  const [searchResults, setSearchResults] = useState<Location[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout>();
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearchKeyword(value);
  }, [value]);

  // 외부 클릭 감지하여 결과 목록 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (resultsRef.current && !resultsRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const searchLocation = (keyword: string) => {
    if (!keyword.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    if (!window.kakao || !window.kakao.maps || !window.kakao.maps.services) {
      console.error('Kakao Maps SDK가 로드되지 않았습니다.');
      return;
    }

    setIsSearching(true);
    const ps = new window.kakao.maps.services.Places();

    ps.keywordSearch(keyword, (data: any, status: any) => {
      setIsSearching(false);

      if (status === window.kakao.maps.services.Status.OK) {
        const results = data.map((place: any) => ({
          place_name: place.place_name,
          address_name: place.address_name,
          road_address_name: place.road_address_name,
          x: place.x,
          y: place.y
        }));
        setSearchResults(results);
        setShowResults(true);
      } else if (status === window.kakao.maps.services.Status.ZERO_RESULT) {
        setSearchResults([]);
        setShowResults(true);
      } else {
        console.error('장소 검색 실패:', status);
        setSearchResults([]);
        setShowResults(false);
      }
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const keyword = e.target.value;
    setSearchKeyword(keyword);

    // 디바운싱: 입력 후 500ms 후에 검색 실행
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    searchTimeout.current = setTimeout(() => {
      searchLocation(keyword);
    }, 500);
  };

  const handleLocationSelect = (location: Location) => {
    setSearchKeyword(location.place_name);
    setShowResults(false);
    onLocationSelect(location);
  };

  const handleInputFocus = () => {
    if (searchResults.length > 0) {
      setShowResults(true);
    }
  };

  return (
    <div className="kakao-map-search">
      {label && <label className="search-label">{label}</label>}
      <div className="search-input-wrapper">
        <input
          type="text"
          className="search-input"
          placeholder={placeholder}
          value={searchKeyword}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
        />
        {isSearching && (
          <span className="search-spinner">🔍</span>
        )}
      </div>

      {showResults && (
        <div className="search-results" ref={resultsRef}>
          {searchResults.length > 0 ? (
            searchResults.map((location, index) => (
              <div
                key={index}
                className="search-result-item"
                onClick={() => handleLocationSelect(location)}
              >
                <div className="result-name">{location.place_name}</div>
                <div className="result-address">
                  {location.road_address_name || location.address_name}
                </div>
              </div>
            ))
          ) : (
            searchKeyword && !isSearching && (
              <div className="no-results">
                검색 결과가 없습니다.
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
};

export default KakaoMapSearch;