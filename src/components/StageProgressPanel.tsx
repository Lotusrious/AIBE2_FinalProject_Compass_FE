import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import './StageProgressPanel.css';

export interface Stage1Place {
  id: string;
  name: string;
  category?: string;
  subCategory?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  rating?: number | null;
  isRecommended?: boolean;
  description?: string;
}

export interface Stage2Place extends Stage1Place {
  day?: number;
}

export interface Stage1Category {
  name: string;
  places: Stage1Place[];
}

export interface Stage2Day {
  day: number;
  placeCount?: number;
  places: Stage2Place[];
}

export interface Stage1Data {
  categories: Stage1Category[];
  totalCount?: number;
  recommendedCount?: number;
}

export interface Stage2Data {
  days: Stage2Day[];
  totalDays?: number;
  selectedCount?: number;
}

export interface Stage3Data {
  itinerary?: any[];
  totalDays?: number;
  totalDistance?: number;
  totalTime?: number;
}

interface StageProgressPanelProps {
  stage1?: Stage1Data | null;
  stage2?: Stage2Data | null;
  stage3?: Stage3Data | null;
  travelPlanLink?: string;
  collapsed?: boolean;
  isProcessing?: boolean;
  onToggleCollapse?: (collapsed: boolean) => void;
  onSubmitStage1?: (places: Stage1Place[]) => void;
  onSubmitStage2?: (places: Stage2Place[]) => void;
}

interface CategoryExpansionState {
  [category: string]: boolean;
}

const StageProgressPanel: React.FC<StageProgressPanelProps> = ({
  stage1,
  stage2,
  stage3,
  travelPlanLink,
  collapsed = false,
  isProcessing,
  onToggleCollapse,
  onSubmitStage1,
  onSubmitStage2
}) => {
  const [isCollapsed, setIsCollapsed] = useState(collapsed);
  const [expandedCategories, setExpandedCategories] = useState<CategoryExpansionState>({});
  const [selectedStage1, setSelectedStage1] = useState<Record<string, Stage1Place>>({});
  const [selectedStage2, setSelectedStage2] = useState<Record<string, Stage2Place>>({});

  useEffect(() => {
    setIsCollapsed(collapsed);
  }, [collapsed]);

  useEffect(() => {
    if (!stage1 || stage1.categories.length === 0) {
      setExpandedCategories({});
      setSelectedStage1({});
      return;
    }

    const initialExpansion: CategoryExpansionState = {};
    stage1.categories.slice(0, 2).forEach(category => {
      initialExpansion[category.name || '기타'] = true;
    });
    setExpandedCategories(initialExpansion);

    const recommended: Record<string, Stage1Place> = {};
    stage1.categories.forEach(category => {
      category.places
        .filter(place => place.isRecommended)
        .forEach(place => {
          recommended[place.id] = place;
        });
    });
    setSelectedStage1(recommended);
  }, [stage1]);

  useEffect(() => {
    if (!stage2 || stage2.days.length === 0) {
      setSelectedStage2({});
      return;
    }

    const initial: Record<string, Stage2Place> = {};
    stage2.days.forEach(day => {
      day.places.forEach(place => {
        initial[place.id] = { ...place, day: place.day ?? day.day };
      });
    });
    setSelectedStage2(initial);
  }, [stage2]);

  const totalStage1Places = useMemo(() => {
    if (!stage1) return 0;
    return stage1.categories.reduce((acc, category) => acc + category.places.length, 0);
  }, [stage1]);

  const totalStage2Places = useMemo(() => {
    if (!stage2) return 0;
    return stage2.days.reduce((acc, day) => acc + day.places.length, 0);
  }, [stage2]);

  const handleCategoryToggle = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const toggleStage1Place = (place: Stage1Place) => {
    setSelectedStage1(prev => {
      const exists = prev[place.id];
      const updated = { ...prev };
      if (exists) {
        delete updated[place.id];
      } else {
        updated[place.id] = place;
      }
      return updated;
    });
  };

  const toggleStage2Place = (place: Stage2Place, day: number) => {
    setSelectedStage2(prev => {
      const exists = prev[place.id];
      const updated = { ...prev };
      if (exists) {
        delete updated[place.id];
      } else {
        updated[place.id] = { ...place, day: place.day ?? day };
      }
      return updated;
    });
  };

  const selectAllStage1 = () => {
    if (!stage1) return;
    const all: Record<string, Stage1Place> = {};
    stage1.categories.forEach(category => {
      category.places.forEach(place => {
        all[place.id] = place;
      });
    });
    setSelectedStage1(all);
  };

  const selectRecommendedStage1 = () => {
    if (!stage1) return;
    const recommended: Record<string, Stage1Place> = {};
    stage1.categories.forEach(category => {
      category.places
        .filter(place => place.isRecommended)
        .forEach(place => {
          recommended[place.id] = place;
        });
    });
    setSelectedStage1(recommended);
  };

  const clearStage1 = () => {
    setSelectedStage1({});
  };

  const selectAllStage2 = () => {
    if (!stage2) return;
    const all: Record<string, Stage2Place> = {};
    stage2.days.forEach(day => {
      day.places.forEach(place => {
        all[place.id] = { ...place, day: place.day ?? day.day };
      });
    });
    setSelectedStage2(all);
  };

  const clearStage2 = () => {
    setSelectedStage2({});
  };

  const handleStage1Submit = () => {
    if (onSubmitStage1) {
      const selected = Object.values(selectedStage1);
      onSubmitStage1(selected);
    }
  };

  const handleStage2Submit = () => {
    if (onSubmitStage2) {
      const selected = Object.values(selectedStage2);
      onSubmitStage2(selected);
    }
  };

  const renderStage1Section = () => {
    if (!stage1 || stage1.categories.length === 0) {
      return (
        <div className="stage-section__empty">빠른 입력 폼을 제출하면 추천 장소가 여기에 나타납니다.</div>
      );
    }

    return (
      <div className="stage-section">
        <header className="stage-section__header">
          <div>
            <h3>Stage 1 · 장소 선별</h3>
            <p>{stage1.totalCount ?? totalStage1Places}개 장소 중 {stage1.recommendedCount ?? 0}개 추천</p>
          </div>
          <div className="stage-section__actions">
            <button type="button" onClick={selectRecommendedStage1}>추천 전체 선택</button>
            <button type="button" onClick={selectAllStage1}>전체 선택</button>
            <button type="button" onClick={clearStage1}>선택 해제</button>
          </div>
        </header>

        <div className="stage-selection-summary">
          <span>선택된 장소</span>
          <strong>{Object.keys(selectedStage1).length}</strong>
          <span>/</span>
          <span>{totalStage1Places}</span>
        </div>

        <div className="stage1-category-list">
          {stage1.categories.map(category => {
            const categoryKey = category.name || '기타';
            const expanded = expandedCategories[categoryKey] ?? false;

            return (
              <div className="stage1-category" key={categoryKey}>
                <button
                  type="button"
                  className="stage1-category__header"
                  onClick={() => handleCategoryToggle(categoryKey)}
                >
                  <div>
                    <h4>{categoryKey}</h4>
                    <span>{category.places.length}개 장소</span>
                  </div>
                  <span className={`chevron ${expanded ? 'chevron--open' : ''}`}>⌃</span>
                </button>

                {expanded && (
                  <div className="stage1-category__grid">
                    {category.places.map(place => {
                      const selected = Boolean(selectedStage1[place.id]);
                      return (
                        <button
                          type="button"
                          key={place.id}
                          className={`place-card ${selected ? 'place-card--selected' : ''}`}
                          onClick={() => toggleStage1Place(place)}
                          disabled={isProcessing}
                        >
                          <div className="place-card__header">
                            <span className="place-card__name">{place.name}</span>
                            {place.isRecommended && <span className="place-card__badge">추천</span>}
                          </div>
                          {place.address && <p className="place-card__address">{place.address}</p>}
                          <div className="place-card__meta">
                            {place.category && <span>{place.category}</span>}
                            {typeof place.rating === 'number' && place.rating > 0 && (
                              <span>⭐ {place.rating.toFixed(1)}</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="stage-section__footer">
          <button
            type="button"
            className="primary"
            onClick={handleStage1Submit}
            disabled={isProcessing || Object.keys(selectedStage1).length === 0}
          >
            {isProcessing ? '처리 중...' : '선택한 장소로 Stage 2 진행'}
          </button>
        </div>
      </div>
    );
  };

  const renderStage2Section = () => {
    if (!stage2 || stage2.days.length === 0) {
      return (
        <div className="stage-section__empty">Stage 1에서 장소를 선택하면 날짜별 분배 결과가 표시됩니다.</div>
      );
    }

    return (
      <div className="stage-section">
        <header className="stage-section__header">
          <div>
            <h3>Stage 2 · 날짜별 분배</h3>
            <p>{stage2.totalDays ?? stage2.days.length}일 일정 / {totalStage2Places}개 장소</p>
          </div>
          <div className="stage-section__actions">
            <button type="button" onClick={selectAllStage2}>전체 선택</button>
            <button type="button" onClick={clearStage2}>선택 해제</button>
          </div>
        </header>

        <div className="stage-selection-summary">
          <span>선택된 장소</span>
          <strong>{Object.keys(selectedStage2).length}</strong>
          <span>/</span>
          <span>{totalStage2Places}</span>
        </div>

        <div className="stage2-day-list">
          {stage2.days.map(day => (
            <div className="stage2-day-card" key={`day-${day.day}`}>
              <header>
                <h4>Day {day.day}</h4>
                <span>{day.placeCount ?? day.places.length}곳</span>
              </header>
              <div className="stage2-day-card__places">
                {day.places.map(place => {
                  const selected = Boolean(selectedStage2[place.id]);
                  return (
                    <button
                      type="button"
                      key={`${day.day}-${place.id}`}
                      className={`stage2-place ${selected ? 'stage2-place--selected' : ''}`}
                      onClick={() => toggleStage2Place(place, day.day)}
                      disabled={isProcessing}
                    >
                      <div className="stage2-place__title">
                        <span>{place.name}</span>
                        {place.category && <span className="stage2-place__category">{place.category}</span>}
                      </div>
                      {place.address && <p className="stage2-place__address">{place.address}</p>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="stage-section__footer">
          <button
            type="button"
            className="primary"
            onClick={handleStage2Submit}
            disabled={isProcessing || Object.keys(selectedStage2).length === 0}
          >
            {isProcessing ? '처리 중...' : '선택한 장소로 Stage 3 생성'}
          </button>
        </div>
      </div>
    );
  };

  const renderStage3Section = () => {
    if (!stage3) {
      return (
        <div className="stage-section__empty">Stage 3 결과가 준비되면 여행 일정 요약이 여기에 표시됩니다.</div>
      );
    }

    return (
      <div className="stage-section">
        <header className="stage-section__header">
          <div>
            <h3>Stage 3 · 최종 일정</h3>
            <p>{stage3.totalDays ?? (stage3.itinerary?.length ?? 0)}일 일정 완성</p>
          </div>
        </header>

        <div className="stage3-summary">
          <div>
            <span>총 일수</span>
            <strong>{stage3.totalDays ?? stage3.itinerary?.length ?? '-'}</strong>
          </div>
          <div>
            <span>이동 거리</span>
            <strong>{stage3.totalDistance ? `${stage3.totalDistance.toFixed(1)} km` : '-'}</strong>
          </div>
          <div>
            <span>예상 시간</span>
            <strong>{formatDuration(stage3.totalTime)}</strong>
          </div>
        </div>

        {travelPlanLink && (
          <div className="stage-section__footer">
            <Link to={travelPlanLink} className="primary-link">
              여행 계획 상세보기 →
            </Link>
          </div>
        )}
      </div>
    );
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes || Number.isNaN(minutes)) return '-';
    const hrs = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hrs === 0) return `${mins}분`;
    if (mins === 0) return `${hrs}시간`;
    return `${hrs}시간 ${mins}분`;
  };

  const handleCollapseToggle = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    onToggleCollapse?.(next);
  };

  const hasAnyStageData = Boolean(stage1 || stage2 || stage3);

  if (!hasAnyStageData) {
    return null;
  }

  return (
    <aside className={`stage-progress-panel ${isCollapsed ? 'stage-progress-panel--collapsed' : ''}`}>
      <header className="stage-progress-panel__header">
        <div>
          <span className="panel-kicker">AI Compass</span>
          <h2>단계별 여행 계획</h2>
        </div>
        <button type="button" onClick={handleCollapseToggle} className="collapse-toggle">
          {isCollapsed ? '펼치기' : '숨기기'}
        </button>
      </header>

      {!isCollapsed && (
        <div className="stage-progress-panel__content">
          <section>
            {renderStage1Section()}
          </section>
          <section>
            {renderStage2Section()}
          </section>
          <section>
            {renderStage3Section()}
          </section>
        </div>
      )}
    </aside>
  );
};

export default StageProgressPanel;
