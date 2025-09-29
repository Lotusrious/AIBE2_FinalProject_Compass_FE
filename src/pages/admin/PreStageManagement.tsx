import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../../styles/PreStageManagement.css';

interface TravelCandidate {
  id: number;
  placeId: string;
  placeName: string;
  region: string;
  category: string;
  address: string;
  rating: number;
  reviewCount: number;
  photoUrl: string;
  timeBlock: string;
  collectedAt: string;
}

interface CollectionStatus {
  region: string;
  status: 'idle' | 'collecting' | 'completed' | 'error';
  savedCount?: number;
  message?: string;
}

interface RegionStats {
  totalCount: number;
  timeBlockDistribution: Record<string, number>;
  categoryDistribution: Record<string, number>;
  averageRating: string;
  averageReviewCount: string;
}

const PreStageManagement: React.FC = () => {
  const [newRegion, setNewRegion] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [collectionStatuses, setCollectionStatuses] = useState<Record<string, CollectionStatus>>({});
  const [places, setPlaces] = useState<TravelCandidate[]>([]);
  const [regionStats, setRegionStats] = useState<RegionStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterTimeBlock, setFilterTimeBlock] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // 미리 정의된 주요 지역 목록
  const predefinedRegions = [
    '서울', '부산', '제주', '강릉', '경주', '전주', '여수', '속초',
    '대구', '인천', '광주', '대전', '울산', '춘천', '통영'
  ];

  // 신규 도시 추가 및 데이터 수집
  const handleAddNewCity = async () => {
    if (!newRegion.trim()) {
      alert('도시 이름을 입력해주세요');
      return;
    }

    try {
      setCollectionStatuses(prev => ({
        ...prev,
        [newRegion]: { region: newRegion, status: 'collecting' }
      }));

      const response = await axios.post(
        `/api/v1/admin/pre-stage/collect/${encodeURIComponent(newRegion)}`,
        null,
        { params: { forceUpdate: false } }
      );

      setCollectionStatuses(prev => ({
        ...prev,
        [newRegion]: {
          region: newRegion,
          status: 'completed',
          savedCount: response.data.savedCount,
          message: response.data.message
        }
      }));

      // 성공 시 입력 필드 초기화
      setNewRegion('');

      // 3초 후 상태 초기화
      setTimeout(() => {
        setCollectionStatuses(prev => ({
          ...prev,
          [newRegion]: { region: newRegion, status: 'idle' }
        }));
      }, 3000);

    } catch (error) {
      console.error('도시 추가 실패:', error);
      setCollectionStatuses(prev => ({
        ...prev,
        [newRegion]: {
          region: newRegion,
          status: 'error',
          message: '데이터 수집 실패'
        }
      }));
    }
  };

  // 전체 지역 일괄 수집
  const handleCollectAll = async () => {
    if (!window.confirm('모든 지역의 데이터를 수집하시겠습니까? 시간이 오래 걸릴 수 있습니다.')) {
      return;
    }

    try {
      const response = await axios.post('/api/v1/admin/pre-stage/collect-all');
      alert(response.data.message);
    } catch (error) {
      console.error('전체 수집 실패:', error);
      alert('전체 수집 시작에 실패했습니다.');
    }
  };

  // 특정 지역 데이터 수집
  const handleCollectRegion = async (region: string) => {
    try {
      setCollectionStatuses(prev => ({
        ...prev,
        [region]: { region, status: 'collecting' }
      }));

      const response = await axios.post(
        `/api/v1/admin/pre-stage/collect/${encodeURIComponent(region)}`,
        null,
        { params: { forceUpdate: true } }
      );

      setCollectionStatuses(prev => ({
        ...prev,
        [region]: {
          region,
          status: 'completed',
          savedCount: response.data.savedCount,
          message: response.data.message
        }
      }));

      // 3초 후 상태 초기화
      setTimeout(() => {
        setCollectionStatuses(prev => ({
          ...prev,
          [region]: { region, status: 'idle' }
        }));
      }, 3000);

    } catch (error) {
      console.error(`${region} 수집 실패:`, error);
      setCollectionStatuses(prev => ({
        ...prev,
        [region]: {
          region,
          status: 'error',
          message: '수집 실패'
        }
      }));
    }
  };

  // 지역별 장소 데이터 조회
  const fetchPlacesByRegion = async (region: string) => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterTimeBlock !== 'all') params.timeBlock = filterTimeBlock;
      if (filterCategory !== 'all') params.category = filterCategory;

      const response = await axios.get(
        `/api/v1/admin/pre-stage/places/${encodeURIComponent(region)}`,
        { params }
      );
      setPlaces(response.data);
      setSelectedRegion(region);

      // 통계 데이터도 가져오기
      const statsResponse = await axios.get(
        `/api/v1/admin/pre-stage/statistics/${encodeURIComponent(region)}`
      );
      setRegionStats(statsResponse.data);
    } catch (error) {
      console.error('장소 데이터 조회 실패:', error);
      setPlaces([]);
      setRegionStats(null);
    } finally {
      setLoading(false);
    }
  };

  // 오래된 데이터 갱신
  const handleRefreshOldData = async () => {
    if (!window.confirm('7일 이상 된 데이터를 갱신하시겠습니까?')) {
      return;
    }

    try {
      const response = await axios.put('/api/v1/admin/pre-stage/refresh', null, {
        params: { daysOld: 7 }
      });
      alert(response.data.message);
    } catch (error) {
      console.error('데이터 갱신 실패:', error);
      alert('데이터 갱신에 실패했습니다.');
    }
  };

  const getStatusBadge = (status: CollectionStatus) => {
    const statusClass = status.status;
    const statusText = {
      idle: '대기',
      collecting: '수집 중...',
      completed: `완료 (${status.savedCount}개)`,
      error: '오류'
    };

    return (
      <span className={`status-badge status-${statusClass}`}>
        {statusText[status.status]}
      </span>
    );
  };

  return (
    <div className="pre-stage-management">
      <h1>Pre-Stage 도시 데이터 관리</h1>

      {/* 신규 도시 추가 섹션 */}
      <div className="new-city-section">
        <h2>신규 도시 추가</h2>
        <div className="add-city-form">
          <input
            type="text"
            placeholder="도시 이름 입력 (예: 포항, 안동)"
            value={newRegion}
            onChange={(e) => setNewRegion(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddNewCity()}
          />
          <button onClick={handleAddNewCity} className="btn-primary">
            도시 추가 및 데이터 수집
          </button>
        </div>
      </div>

      {/* 일괄 작업 섹션 */}
      <div className="bulk-actions">
        <h2>일괄 작업</h2>
        <div className="action-buttons">
          <button onClick={handleCollectAll} className="btn-secondary">
            전체 지역 일괄 수집
          </button>
          <button onClick={handleRefreshOldData} className="btn-secondary">
            오래된 데이터 갱신 (7일 이상)
          </button>
        </div>
      </div>

      {/* 지역별 관리 섹션 */}
      <div className="regions-section">
        <h2>지역별 데이터 관리</h2>
        <div className="regions-grid">
          {predefinedRegions.map(region => (
            <div key={region} className="region-card">
              <div className="region-header">
                <h3>{region}</h3>
                {collectionStatuses[region] && (
                  getStatusBadge(collectionStatuses[region])
                )}
              </div>
              <div className="region-actions">
                <button
                  onClick={() => handleCollectRegion(region)}
                  disabled={collectionStatuses[region]?.status === 'collecting'}
                  className="btn-collect"
                >
                  데이터 수집
                </button>
                <button
                  onClick={() => fetchPlacesByRegion(region)}
                  className="btn-view"
                >
                  데이터 조회
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 수집된 데이터 조회 섹션 */}
      {selectedRegion && (
        <div className="data-view-section">
          <h2>{selectedRegion} 수집 데이터</h2>

          {/* 통계 정보 */}
          {regionStats && (
            <div className="stats-panel">
              <div className="stat-item">
                <label>전체 장소:</label>
                <span>{regionStats.totalCount}개</span>
              </div>
              <div className="stat-item">
                <label>평균 평점:</label>
                <span>{regionStats.averageRating}</span>
              </div>
              <div className="stat-item">
                <label>평균 리뷰:</label>
                <span>{regionStats.averageReviewCount}개</span>
              </div>
            </div>
          )}

          {/* 필터 */}
          <div className="filters">
            <select
              value={filterTimeBlock}
              onChange={(e) => setFilterTimeBlock(e.target.value)}
            >
              <option value="all">모든 시간대</option>
              <option value="MORNING">아침</option>
              <option value="LUNCH">점심</option>
              <option value="AFTERNOON">오후</option>
              <option value="DINNER">저녁</option>
              <option value="NIGHT">야간</option>
            </select>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="all">모든 카테고리</option>
              <option value="관광지">관광지</option>
              <option value="식당">식당</option>
              <option value="카페">카페</option>
              <option value="숙소">숙소</option>
              <option value="액티비티">액티비티</option>
            </select>

            <button
              onClick={() => fetchPlacesByRegion(selectedRegion)}
              className="btn-refresh"
            >
              새로고침
            </button>
          </div>

          {/* 데이터 테이블 */}
          {loading ? (
            <div className="loading">데이터 로딩 중...</div>
          ) : (
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>장소명</th>
                    <th>카테고리</th>
                    <th>시간대</th>
                    <th>평점</th>
                    <th>리뷰수</th>
                    <th>주소</th>
                    <th>수집일</th>
                  </tr>
                </thead>
                <tbody>
                  {places.map(place => (
                    <tr key={place.id}>
                      <td>{place.placeName}</td>
                      <td>
                        <span className={`category-badge category-${place.category}`}>
                          {place.category}
                        </span>
                      </td>
                      <td>{place.timeBlock}</td>
                      <td>{place.rating?.toFixed(1)}</td>
                      <td>{place.reviewCount}</td>
                      <td className="address-cell">{place.address}</td>
                      <td>{new Date(place.collectedAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {places.length === 0 && (
                <div className="no-data">데이터가 없습니다.</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PreStageManagement;