// 시나리오용 - Stage1 장소 선택 모달
import React, { useState } from 'react';
import { Stage1Place } from './StageProgressPanel';
import './Stage1PlaceSelectionModal.css';

interface Stage1PlaceSelectionModalProps {
  places: Stage1Place[];
  onClose: () => void;
  onConfirm: (selectedPlaces: Stage1Place[]) => void;
  region: string;
}

const Stage1PlaceSelectionModal: React.FC<Stage1PlaceSelectionModalProps> = ({
  places,
  onClose,
  onConfirm,
  region
}) => {
  const [selectedPlaces, setSelectedPlaces] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(0);
  const placesPerPage = 5;
  const totalPages = Math.ceil(places.length / placesPerPage);

  // 시나리오용 - 이미지 URL (실제로는 S3나 CDN에서 가져와야 함)
  const getPlaceImage = (place: Stage1Place) => {
    // 장소명에 따른 기본 이미지 반환
    const imageMap: { [key: string]: string } = {
      '경복궁': 'https://via.placeholder.com/300x200/4F46E5/ffffff?text=경복궁',
      '북촌한옥마을': 'https://via.placeholder.com/300x200/7C3AED/ffffff?text=북촌한옥마을',
      'N서울타워': 'https://via.placeholder.com/300x200/EC4899/ffffff?text=N서울타워',
      '명동': 'https://via.placeholder.com/300x200/F59E0B/ffffff?text=명동',
      '인사동': 'https://via.placeholder.com/300x200/10B981/ffffff?text=인사동',
      '강남역': 'https://via.placeholder.com/300x200/3B82F6/ffffff?text=강남역',
      '이태원': 'https://via.placeholder.com/300x200/8B5CF6/ffffff?text=이태원',
      '서울숲': 'https://via.placeholder.com/300x200/14B8A6/ffffff?text=서울숲',
      '해운대해수욕장': 'https://via.placeholder.com/300x200/0EA5E9/ffffff?text=해운대',
      '광안리해수욕장': 'https://via.placeholder.com/300x200/06B6D4/ffffff?text=광안리',
      '감천문화마을': 'https://via.placeholder.com/300x200/F97316/ffffff?text=감천문화마을',
      '자갈치시장': 'https://via.placeholder.com/300x200/EA580C/ffffff?text=자갈치시장',
      '태종대': 'https://via.placeholder.com/300x200/16A34A/ffffff?text=태종대',
      '남포동': 'https://via.placeholder.com/300x200/DC2626/ffffff?text=남포동',
      '서면': 'https://via.placeholder.com/300x200/9333EA/ffffff?text=서면'
    };
    return imageMap[place.name] || 'https://via.placeholder.com/300x200/6B7280/ffffff?text=Travel';
  };

  const togglePlaceSelection = (placeId: string) => {
    const newSelection = new Set(selectedPlaces);
    if (newSelection.has(placeId)) {
      newSelection.delete(placeId);
    } else {
      newSelection.add(placeId);
    }
    setSelectedPlaces(newSelection);
  };

  const handleConfirm = () => {
    const selected = places.filter(p => selectedPlaces.has(p.id));
    onConfirm(selected);
  };

  const currentPlaces = places.slice(
    currentPage * placesPerPage,
    (currentPage + 1) * placesPerPage
  );

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h2>{region} 여행지 선택</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="places-carousel">
            <button
              className="carousel-btn prev"
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
            >
              ‹
            </button>

            <div className="places-grid">
              {currentPlaces.map(place => (
                <div
                  key={place.id}
                  className={`place-card ${selectedPlaces.has(place.id) ? 'selected' : ''}`}
                  onClick={() => togglePlaceSelection(place.id)}
                >
                  <div className="place-image">
                    <img src={getPlaceImage(place)} alt={place.name} />
                    {place.isRecommended && (
                      <span className="recommended-badge">추천</span>
                    )}
                    {selectedPlaces.has(place.id) && (
                      <div className="selected-overlay">
                        <span className="checkmark">✓</span>
                      </div>
                    )}
                  </div>
                  <div className="place-info">
                    <h4>{place.name}</h4>
                    <p className="place-category">{place.category}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              className="carousel-btn next"
              onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
              disabled={currentPage === totalPages - 1}
            >
              ›
            </button>
          </div>

          <div className="pagination">
            {Array.from({ length: totalPages }).map((_, index) => (
              <button
                key={index}
                className={`pagination-dot ${index === currentPage ? 'active' : ''}`}
                onClick={() => setCurrentPage(index)}
              />
            ))}
          </div>
        </div>

        <div className="modal-footer">
          <div className="selection-info">
            선택된 장소: {selectedPlaces.size}개
          </div>
          <div className="modal-actions">
            <button className="btn-cancel" onClick={onClose}>취소</button>
            <button
              className="btn-confirm"
              onClick={handleConfirm}
              disabled={selectedPlaces.size === 0}
            >
              선택 완료 ({selectedPlaces.size}개)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Stage1PlaceSelectionModal;