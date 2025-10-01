import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './ChatInterface.css';
import './PlaceSelectionForm.css'; // 시나리오용 - 장소 선택 폼 스타일
import chatService, { Message, ChatThread, FollowUpQuestion, QuickOption } from '../services/chatService';
import authService from '../services/authService';
import { followUpService, FollowUpResponse } from '../services/followUpService';
import DateRangePicker from './DateRangePicker';
import TravelFormModal, { TravelFormData, TravelFormInitialData } from './TravelFormModal';
import { Stage1Category, Stage1Data, Stage1Place, Stage2Data, Stage2Day, Stage2Place, Stage3Data } from './StageProgressPanel';
import QuickTravelForm from './QuickTravelForm';
import Stage3Display from './Stage3Display';
import tripService from '../services/tripService';

interface ChatInterfaceProps {
  threadId?: string;
  onNewChat?: () => void;
  isNewChat?: boolean;
  onThreadUpdate?: () => void;
  initialMessage?: string;
  onMessageSent?: () => void;
}

const TravelPlanLinkCard: React.FC<{ link: string }> = ({ link }) => {
  const handleOpenNewWindow = () => {
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="travel-plan-link-card">
      <div className="travel-plan-link-card__icon" aria-hidden="true">
        <svg viewBox="0 0 64 64">
          <defs>
            <linearGradient id="chatCompassGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
          </defs>
          <circle cx="32" cy="32" r="30" fill="url(#chatCompassGradient)" opacity="0.9" />
          <circle cx="32" cy="32" r="22" fill="#0f172a" opacity="0.92" />
          <path
            d="M32 14 L40 32 L32 50 L24 32 Z"
            fill="#fdf4ff"
            stroke="#c4b5fd"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <circle cx="32" cy="32" r="3.5" fill="#facc15" />
        </svg>
      </div>
      <div className="travel-plan-link-card__content">
        <h4>Compass 여행 계획</h4>
        <p>AI가 정리한 여행 일정을 한눈에 확인해보세요.</p>
        <button
          onClick={handleOpenNewWindow}
          className="travel-plan-link-card__cta"
        >
          새 창에서 여행 계획 열기 →
        </button>
      </div>
    </div>
  );
};

const ChatInterface: React.FC<ChatInterfaceProps> = ({ threadId, onNewChat, isNewChat, onThreadUpdate, initialMessage, onMessageSent }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentThread, setCurrentThread] = useState<ChatThread | null>(null);
  const [currentThreadId, setCurrentThreadId] = useState<string | undefined>(threadId);
  const [showSuggestions, setShowSuggestions] = useState(false); // 제안 버튼 숨김
  const [showWelcome, setShowWelcome] = useState(false); // 웰컴 화면도 숨김
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [currentFollowUp, setCurrentFollowUp] = useState<FollowUpQuestion | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);
  const [showTravelForm, setShowTravelForm] = useState(false);
  const [stageData, setStageData] = useState<{ stage1: Stage1Data | null; stage2: Stage2Data | null; stage3: Stage3Data | null }>({
    stage1: null,
    stage2: null,
    stage3: null
  });
  const [isStagePanelCollapsed, setIsStagePanelCollapsed] = useState(false);
  const [stageActionLoading, setStageActionLoading] = useState(false);
  const [travelPlanLink, setTravelPlanLink] = useState<string | null>(null);
  const [quickFormInitialData, setQuickFormInitialData] = useState<TravelFormInitialData | undefined>();
  const [quickFormData, setQuickFormData] = useState<any>(null); // 빠른 입력 폼 데이터 저장
  const [isScenarioMode, setIsScenarioMode] = useState(false); // 시나리오용 - 시나리오 모드 여부
  const [currentScenario, setCurrentScenario] = useState<'seoul' | 'busan' | 'quickform' | null>(null); // 시나리오용 - 현재 시나리오
  const [showPlaceSelectionModal, setShowPlaceSelectionModal] = useState(false); // 시나리오용 - 모달 표시 여부
  const [scenarioPlaces, setScenarioPlaces] = useState<Stage1Place[]>([]); // 시나리오용 - 모달에 표시할 장소들
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const stagePanelVisible = Boolean(stageData.stage1 || stageData.stage2 || stageData.stage3);

  const handleOpenTravelForm = () => {
    setQuickFormInitialData(undefined);
    setShowTravelForm(true);
  };

  const notifyThreadUpdate = () => {
    if (onThreadUpdate) {
      onThreadUpdate();
    }
  };

  const suggestions = [
    { icon: '🏝️', title: '제주도 여행', text: '제주도 3박 4일 여행 계획 짜줘' },
    { icon: '🍜', title: '부산 맛집', text: '부산 맛집 투어 추천해줘' },
    { icon: '🏛️', title: '경주 역사', text: '경주 역사 탐방 일정 짜줘' },
    { icon: '🚗', title: '당일치기', text: '당일치기 가평 드라이브 코스 추천' },
  ];

  // 시나리오용 - 서울 시나리오 데이터
  const seoulScenarioData = {
    totalDays: 3,
    totalDistance: 45.2,
    totalTime: 2160,
    itinerary: [
      {
        day: 1,
        theme: '서울의 전통과 현대',
        places: [
          { name: '경복궁', category: '관광지', duration: 120, cost: 3000, latitude: 37.5796, longitude: 126.9770, description: '조선시대 궁궐', rating: 4.6 },
          { name: '북촌한옥마을', category: '관광지', duration: 90, cost: 0, latitude: 37.5826, longitude: 126.9831, description: '전통 한옥마을', rating: 4.4 },
          { name: '인사동', category: '쇼핑', duration: 120, cost: 30000, latitude: 37.5732, longitude: 126.9874, description: '전통문화거리', rating: 4.3 },
          { name: '명동', category: '쇼핑', duration: 180, cost: 50000, latitude: 37.5636, longitude: 126.9869, description: '쇼핑과 맛집', rating: 4.5 }
        ]
      },
      {
        day: 2,
        theme: '한강과 강남 투어',
        places: [
          { name: 'N서울타워', category: '관광지', duration: 150, cost: 16000, latitude: 37.5512, longitude: 126.9882, description: '서울의 랜드마크', rating: 4.5 },
          { name: '한강공원', category: '관광지', duration: 120, cost: 0, latitude: 37.5175, longitude: 126.9707, description: '시민의 휴식처', rating: 4.6 },
          { name: '강남역', category: '쇼핑', duration: 180, cost: 40000, latitude: 37.4979, longitude: 127.0276, description: '쇼핑과 문화', rating: 4.4 },
          { name: '코엑스몰', category: '쇼핑', duration: 150, cost: 30000, latitude: 37.5115, longitude: 127.0595, description: '대형 복합몰', rating: 4.5 }
        ]
      },
      {
        day: 3,
        theme: '서울의 문화와 예술',
        places: [
          { name: '이태원', category: '관광지', duration: 150, cost: 35000, latitude: 37.5347, longitude: 126.9945, description: '다국적 문화거리', rating: 4.3 },
          { name: '서울숲', category: '관광지', duration: 120, cost: 0, latitude: 37.5444, longitude: 127.0374, description: '도심 속 자연', rating: 4.5 },
          { name: '성수동', category: '카페', duration: 120, cost: 20000, latitude: 37.5447, longitude: 127.0557, description: '카페거리', rating: 4.6 },
          { name: '동대문디자인플라자', category: '관광지', duration: 90, cost: 0, latitude: 37.5665, longitude: 127.0092, description: '디자인 랜드마크', rating: 4.4 }
        ]
      }
    ]
  };

  // 시나리오용 - 부산 시나리오 데이터
  const busanScenarioData = {
    totalDays: 2,
    totalDistance: 38.5,
    totalTime: 1440,
    itinerary: [
      {
        day: 1,
        theme: '부산의 바다와 맛집',
        places: [
          { name: '해운대해수욕장', category: '관광지', duration: 180, cost: 0, latitude: 35.1586, longitude: 129.1604, description: '부산 대표 해변', rating: 4.7 },
          { name: '광안리해수욕장', category: '관광지', duration: 120, cost: 0, latitude: 35.1531, longitude: 129.1187, description: '야경 명소', rating: 4.6 },
          { name: '자갈치시장', category: '식당', duration: 90, cost: 25000, latitude: 35.0965, longitude: 129.0306, description: '해산물 시장', rating: 4.4 },
          { name: '남포동', category: '쇼핑', duration: 150, cost: 30000, latitude: 35.0988, longitude: 129.0282, description: '쇼핑거리', rating: 4.3 }
        ]
      },
      {
        day: 2,
        theme: '부산의 문화와 역사',
        places: [
          { name: '감천문화마을', category: '관광지', duration: 120, cost: 0, latitude: 35.0975, longitude: 129.0106, description: '한국의 산토리니', rating: 4.5 },
          { name: '태종대', category: '관광지', duration: 150, cost: 2000, latitude: 35.0538, longitude: 129.0871, description: '절경 명소', rating: 4.6 },
          { name: '용두산공원', category: '관광지', duration: 90, cost: 0, latitude: 35.1001, longitude: 129.0324, description: '부산타워', rating: 4.3 },
          { name: '서면', category: '쇼핑', duration: 180, cost: 40000, latitude: 35.1578, longitude: 129.0603, description: '부산 중심가', rating: 4.4 }
        ]
      }
    ]
  };

  type StageUpdate = {
    stage1?: Stage1Data | null;
    stage2?: Stage2Data | null;
    stage3?: Stage3Data | null;
    travelPlanLink?: string | null;
    quickFormInitial?: TravelFormInitialData;
    showTravelForm?: boolean;
  };

  const toNumber = (value: any): number | undefined => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
        return parsed;
      }
    }
    return undefined;
  };

  const mapStage1Place = (raw: any): Stage1Place => ({
    id: String(raw?.id ?? raw?.placeId ?? raw?.name ?? `place_${Math.random().toString(36).slice(2)}`),
    name: raw?.name ?? raw?.placeName ?? '장소',
    category: raw?.category ?? raw?.subCategory ?? '',
    subCategory: raw?.subCategory,
    address: raw?.address ?? raw?.roadAddress ?? raw?.formattedAddress ?? '',
    latitude: toNumber(raw?.latitude ?? raw?.lat ?? raw?.y),
    longitude: toNumber(raw?.longitude ?? raw?.lng ?? raw?.x),
    rating: toNumber(raw?.rating),
    isRecommended: Boolean(raw?.isRecommended),
    description: raw?.description ?? ''
  });

  const mapStage2Place = (raw: any, dayFallback?: number): Stage2Place => ({
    id: String(raw?.id ?? raw?.placeId ?? raw?.name ?? `place_${Math.random().toString(36).slice(2)}`),
    name: raw?.name ?? raw?.placeName ?? '장소',
    category: raw?.category ?? raw?.type ?? raw?.subCategory ?? '',
    address: raw?.address ?? raw?.roadAddress ?? '',
    latitude: toNumber(raw?.latitude ?? raw?.lat ?? raw?.y),
    longitude: toNumber(raw?.longitude ?? raw?.lng ?? raw?.x ?? raw?.lon),
    rating: toNumber(raw?.rating),
    day: raw?.day ?? raw?.dayNumber ?? dayFallback,
    isRecommended: Boolean(raw?.isRecommended)
  });

  const extractStage1Data = (payload: any): Stage1Data | null => {
    if (!payload) return null;
    const categorized = payload.places || payload.categorizedPlaces;
    const allPlacesArray: any[] | undefined = Array.isArray(payload.allPlaces) ? payload.allPlaces : undefined;

    if (!categorized && !allPlacesArray) {
      return null;
    }

    if (categorized && typeof categorized === 'object') {
      const categories: Stage1Category[] = Object.entries(categorized)
        .map(([name, value]) => {
          const places = Array.isArray(value) ? value.map(mapStage1Place) : [];
          return {
            name: name || '기타',
            places
          };
        })
        .filter(category => category.places.length > 0)
        .sort((a, b) => b.places.length - a.places.length);

      return {
        categories,
        totalCount: payload.totalCount ?? categories.reduce((acc, c) => acc + c.places.length, 0),
        recommendedCount: payload.recommendedCount ?? categories.reduce((acc, c) => acc + c.places.filter((place) => place.isRecommended).length, 0)
      };
    }

    if (allPlacesArray) {
      const categoryMap = new Map<string, Stage1Place[]>();
      allPlacesArray.forEach(item => {
        const place = mapStage1Place(item);
        const key = place.category || '기타';
        if (!categoryMap.has(key)) {
          categoryMap.set(key, []);
        }
        categoryMap.get(key)!.push(place);
      });

      const categories: Stage1Category[] = Array.from(categoryMap.entries()).map(([name, places]) => ({
        name,
        places
      }));

      return {
        categories,
        totalCount: categories.reduce((acc, c) => acc + c.places.length, 0),
        recommendedCount: categories.reduce((acc, c) => acc + c.places.filter((place) => place.isRecommended).length, 0)
      };
    }

    return null;
  };

  const extractStage2Data = (payload: any): Stage2Data | null => {
    if (!payload) return null;
    const daily = payload.dailyDistribution || payload.dailyPlans;
    if (!Array.isArray(daily)) return null;

    const days: Stage2Day[] = daily.map((day: any, index: number) => {
      const dayNumber = Number(day?.day ?? day?.dayNumber ?? index + 1);
      const placesArray: any[] = Array.isArray(day?.places) ? day.places : [];
      return {
        day: dayNumber,
        placeCount: day?.placeCount ?? placesArray.length,
        places: placesArray.map(item => mapStage2Place(item, dayNumber))
      };
    });

    return {
      days,
      totalDays: payload.totalDays ?? days.length,
      selectedCount: payload.selectedCount ?? days.reduce((acc, d) => acc + (d.placeCount ?? d.places.length), 0)
    };
  };

  const extractStage3Data = (payload: any): Stage3Data | null => {
    if (!payload) return null;
    return {
      itinerary: Array.isArray(payload.itinerary) ? payload.itinerary : undefined,
      totalDays: payload.totalDays ?? payload.itinerary?.length,
      totalDistance: typeof payload.totalDistance === 'number' ? payload.totalDistance : toNumber(payload.totalDistance),
      totalTime: typeof payload.totalTime === 'number' ? payload.totalTime : toNumber(payload.totalTime)
    };
  };

  const extractQuickFormInitial = (payload: any): TravelFormInitialData | undefined => {
    if (!payload) return undefined;

    const initial: TravelFormInitialData = {};

    if (Array.isArray(payload.prefillDestinations)) {
      initial.destinations = payload.prefillDestinations;
    }
    if (payload.prefillDeparture) {
      initial.departureLocation = payload.prefillDeparture;
    }
    if (payload.prefillTravelDates) {
      initial.travelDates = {
        startDate: payload.prefillTravelDates.startDate ?? '',
        endDate: payload.prefillTravelDates.endDate ?? ''
      };
    }
    if (payload.prefillTravelStyle) {
      initial.travelStyle = Array.isArray(payload.prefillTravelStyle) ? payload.prefillTravelStyle : [payload.prefillTravelStyle];
    }
    if (payload.prefillTravelers) {
      initial.travelers = Number(payload.prefillTravelers);
    }
    if (payload.prefillBudget) {
      initial.budget = Number(payload.prefillBudget);
    }

    if (Object.keys(initial).length === 0) {
      return undefined;
    }

    return initial;
  };

  const evaluateStageMessage = (message: Message, fallbackThreadId?: string): StageUpdate | null => {
    if (!message || message.role !== 'assistant') {
      return null;
    }

    const payload = message.data;
    const derivedType = message.type || (payload && typeof payload === 'object' ? payload.type : undefined);
    const update: StageUpdate = {};

    switch (derivedType) {
      case 'STAGE1_PLACES_LOADED':
      case 'PLACE_DISPLAY': {
        const stage1Data = extractStage1Data(payload);
        if (stage1Data) {
          update.stage1 = stage1Data;
        }
        break;
      }
      case 'PLACES_DISTRIBUTED':
      case 'STAGE2_DAILY_DISTRIBUTION': {
        const stage2Data = extractStage2Data(payload);
        if (stage2Data) {
          update.stage2 = stage2Data;
        }
        break;
      }
      case 'FINAL_ITINERARY_CREATED':
      case 'TRAVEL_PLAN_GENERATED': {
        const stage3Data = extractStage3Data(payload);
        if (stage3Data) {
          update.stage3 = stage3Data;
        }
        if (fallbackThreadId) {
          update.travelPlanLink = `/travel-plan?threadId=${encodeURIComponent(fallbackThreadId)}`;
        }
        break;
      }
      case 'QUICK_FORM': {
        update.showTravelForm = true;
        const initial = extractQuickFormInitial(payload);
        if (initial) {
          update.quickFormInitial = initial;
        }
        break;
      }
      default: {
        if (payload && typeof payload === 'object') {
          if (payload.stage === 1 && payload.places) {
            const stage1Data = extractStage1Data(payload);
            if (stage1Data) update.stage1 = stage1Data;
          }
          if (payload.stage === 2 && payload.dailyDistribution) {
            const stage2Data = extractStage2Data(payload);
            if (stage2Data) update.stage2 = stage2Data;
          }
          if (payload.stage === 3 && payload.itinerary) {
            const stage3Data = extractStage3Data(payload);
            if (stage3Data) update.stage3 = stage3Data;
            if (fallbackThreadId) {
              update.travelPlanLink = `/travel-plan?threadId=${encodeURIComponent(fallbackThreadId)}`;
            }
          }
        }
        break;
      }
    }

    return update;
  };

  const processStagePayload = async (message: Message, fallbackThreadId?: string) => {
    const update = evaluateStageMessage(message, fallbackThreadId);
    if (!update) return;

    if (update.stage1 !== undefined || update.stage2 !== undefined || update.stage3 !== undefined) {
      setStageData(prev => ({
        stage1: update.stage1 !== undefined ? update.stage1 : prev.stage1,
        stage2: update.stage2 !== undefined ? update.stage2 : prev.stage2,
        stage3: update.stage3 !== undefined ? update.stage3 : prev.stage3
      }));
      setIsStagePanelCollapsed(false);

      // Phase3 완료 시 Trip 생성
      if (update.stage3) {
        try {
          const stage3 = update.stage3;
          const userId = authService.getCurrentUserId();

          // Stage3 데이터에서 날짜 추출
          const startDate = stage3.itinerary?.[0]?.date || new Date().toISOString().split('T')[0];
          const endDate = stage3.itinerary?.[stage3.itinerary.length - 1]?.date || startDate;

          await tripService.createTrip({
            userId,
            destination: stage3.destination || '서울',
            startDate,
            endDate,
            numberOfTravelers: 1,
            budget: stage3.budget?.total,
            tripStyle: 'CULTURAL'
          });

          console.log('Trip created successfully after Phase3 completion');
        } catch (error) {
          console.error('Failed to create trip:', error);
        }
      }
    }

    if (update.travelPlanLink !== undefined) {
      setTravelPlanLink(update.travelPlanLink);
    }

    if (update.quickFormInitial) {
      setQuickFormInitialData(update.quickFormInitial);
    }

    if (update.showTravelForm) {
      setShowTravelForm(true);
    }
  };

  const rebuildStageStateFromMessages = (msgs: Message[], threadIdentifier?: string) => {
    let stage1: Stage1Data | null = null;
    let stage2: Stage2Data | null = null;
    let stage3: Stage3Data | null = null;
    let link: string | null = null;

    msgs.forEach(msg => {
      const update = evaluateStageMessage(msg, threadIdentifier ?? msg.threadId);
      if (!update) return;
      if (update.stage1 !== undefined) stage1 = update.stage1 ?? null;
      if (update.stage2 !== undefined) stage2 = update.stage2 ?? null;
      if (update.stage3 !== undefined) stage3 = update.stage3 ?? null;
      if (update.travelPlanLink !== undefined) link = update.travelPlanLink ?? null;
    });

    setStageData({ stage1, stage2, stage3 });
    setTravelPlanLink(link);
  };

  const appendAssistantResponse = (response: Message, threadIdentifier?: string) => {
    const effectiveThreadId = threadIdentifier || response.threadId || currentThreadId || currentThread?.id || '';

    const baseMessage: Message = {
      id: response.id || `msg_${Date.now()}`,
      threadId: effectiveThreadId,
      role: response.role || 'assistant',
      content: response.content || '',
      timestamp: response.timestamp || new Date().toISOString(),
      data: response.data,
      type: response.type,
      nextAction: response.nextAction,
      phase: response.phase
    };

    if (response.type === 'FINAL_ITINERARY_CREATED') {
      const itineraryLink = `/travel-plan?threadId=${encodeURIComponent(effectiveThreadId)}`;
      baseMessage.content = response.content && response.content.trim().length > 0
        ? response.content
        : '✨ 여행 계획이 준비되었습니다! 아래 링크를 눌러 상세 일정을 확인해주세요.';
      baseMessage.data = {
        itineraryLink,
        ...(response.data || {})
      };
      setTravelPlanLink(itineraryLink);
    }

    setMessages(prev => [...prev, baseMessage]);
    processStagePayload(baseMessage, effectiveThreadId);
    notifyThreadUpdate();
  };

  const handleStage1Submit = async (selectedPlaces: Stage1Place[]) => {
    if (!currentThreadId) {
      alert('스레드가 준비되지 않았습니다. 먼저 여행 계획을 시작해주세요.');
      return;
    }

    if (!selectedPlaces.length) {
      alert('선택한 장소가 없습니다.');
      return;
    }

    setStageActionLoading(true);
    try {
      const metadata = {
        type: 'STAGE1_TO_STAGE2_TRANSFER',
        selectedPlaces: selectedPlaces.map(place => ({
          id: place.id,
          name: place.name,
          category: place.category,
          subCategory: place.subCategory,
          address: place.address,
          latitude: place.latitude,
          longitude: place.longitude,
          rating: place.rating,
          isRecommended: place.isRecommended
        }))
      };

      const assistantResponse = await chatService.sendMessage(currentThreadId, {
        message: `Stage 1에서 선택한 ${selectedPlaces.length}개 장소를 Stage 2로 진행합니다.`,
        metadata
      });

      appendAssistantResponse(assistantResponse, currentThreadId);
    } catch (error) {
      console.error('Stage 1 → Stage 2 전환 실패:', error);
      alert('Stage 2로 진행 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setStageActionLoading(false);
    }
  };

  const handleStage2Submit = async (selectedPlaces: Stage2Place[]) => {
    if (!currentThreadId) {
      alert('스레드가 준비되지 않았습니다. 먼저 Stage 1을 완료해주세요.');
      return;
    }

    if (!selectedPlaces.length) {
      alert('선택한 장소가 없습니다.');
      return;
    }

    setStageActionLoading(true);
    try {
      const metadata = {
        type: 'STAGE2_TO_STAGE3_TRANSFER',
        selectedPlaces: selectedPlaces.map(place => ({
          id: place.id,
          name: place.name,
          category: place.category,
          address: place.address,
          day: place.day,
          latitude: place.latitude,
          longitude: place.longitude,
          rating: place.rating
        }))
      };

      const assistantResponse = await chatService.sendMessage(currentThreadId, {
        message: `Stage 2의 ${selectedPlaces.length}개 장소로 Stage 3 최종 일정을 생성합니다.`,
        metadata
      });

      appendAssistantResponse(assistantResponse, currentThreadId);
    } catch (error) {
      console.error('Stage 2 → Stage 3 전환 실패:', error);
      alert('Stage 3 생성 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setStageActionLoading(false);
    }
  };

  useEffect(() => {
    if (threadId) {
      setCurrentThreadId(threadId);
      loadMessages(threadId);
      setShowSuggestions(false);
      setShowWelcome(false);
    } else if (isNewChat) {
      setMessages([]);
      setCurrentThread(null);
      setCurrentThreadId(undefined);
      setShowSuggestions(false); // 새 채팅 시 추천 카드 숨김
      setShowWelcome(false); // 새 채팅 시 웰컴 화면 숨김
      setCurrentFollowUp(null); // 새 채팅 시 follow-up 초기화
      setStageData({ stage1: null, stage2: null, stage3: null });
      setTravelPlanLink(null);
      setQuickFormInitialData(undefined);
    }
  }, [threadId, isNewChat]);

  useEffect(() => {
    if (initialMessage && !currentThreadId) {
      setInputMessage(initialMessage);
      // 다음 렌더 사이클에서 handleSendMessage 실행
      setTimeout(() => {
        handleSendMessage();
        if (onMessageSent) {
          onMessageSent();
        }
      }, 0);
    }
  }, [initialMessage]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async (threadId: string) => {
    try {
      const messages = await chatService.getMessages(threadId);
      setMessages(messages);
      rebuildStageStateFromMessages(messages, threadId);
    } catch (error: any) {
      console.error('Failed to load messages:', error);
      // If thread doesn't exist, clear messages
      if (error?.response?.status === 404) {
        setMessages([]);
        setStageData({ stage1: null, stage2: null, stage3: null });
        setTravelPlanLink(null);
      }
    }
  };

  const toFollowUpQuestion = (res: FollowUpResponse): FollowUpQuestion => ({
    sessionId: res.sessionId,
    currentStep: res.currentStep || 'INITIAL',
    primaryQuestion: res.question,
    helpText: res.helpText,
    exampleAnswers: res.exampleAnswers || [],
    quickOptions: res.quickOptions || [],
    inputType: (res.inputType || 'text') as FollowUpQuestion['inputType'],
    isRequired: true,
    canSkip: res.canGeneratePlan || false,
    progressPercentage: res.progressPercentage ?? 0,
    remainingQuestions: res.remainingQuestions ?? 0,
    collectedInfo: res.collectedInfo,
    uiType: res.uiType
  });

  const handleDateRangeSelect = (start: string, end: string) => {
    setDateRange({ start, end });
  };

  // 시나리오용 - 모달에서 장소 선택 완료 시
  // 시나리오용 - 장소 선택 폼 컴포넌트
  const PlaceSelectionForm: React.FC<{
    places: Stage1Place[];
    region: string;
    onConfirm: (places: Stage1Place[]) => void;
  }> = ({ places, region, onConfirm }) => {
    const [selectedPlaces, setSelectedPlaces] = useState<Set<string>>(new Set());
    const [currentBlock, setCurrentBlock] = useState(0); // 시간 블록 (0: 오전, 1: 오후, 2: 저녁)

    // 전체 장소 수 확인
    console.log('Total places received:', places.length);

    // 시간 블록별로 장소 분류 - 전체 장소를 3등분
    const blockSize = Math.ceil(places.length / 3);
    const timeBlocks = [
      { name: '오전 (Morning)', icon: '🌅', places: places.slice(0, blockSize) },
      { name: '오후 (Afternoon)', icon: '☀️', places: places.slice(blockSize, blockSize * 2) },
      { name: '저녁 (Evening)', icon: '🌙', places: places.slice(blockSize * 2) }
    ];

    console.log('Time blocks:', timeBlocks.map(b => ({ name: b.name, count: b.places.length })));

    const currentBlockData = timeBlocks[currentBlock];
    const hasPlaces = currentBlockData.places.length > 0;

    const togglePlace = (placeId: string) => {
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
      // 선택하지 않았으면 추천 장소만 선택
      if (selected.length === 0) {
        const recommended = places.filter(p => p.isRecommended);
        onConfirm(recommended);
      } else {
        onConfirm(selected);
      }
    };

    return (
      <div className="place-selection-form">
        <div className="form-header">
          <h3>🗺️ {region} 추천 여행지</h3>
          <p>시간대별로 추천 장소를 확인하고 선택해주세요</p>
        </div>

        {/* 시간 블록 탭 */}
        <div className="time-block-tabs">
          {timeBlocks.map((block, index) => (
            <button
              key={index}
              className={`time-tab ${currentBlock === index ? 'active' : ''}`}
              onClick={() => setCurrentBlock(index)}
            >
              <span style={{ fontSize: '20px' }}>{block.icon}</span>
              {block.name}
            </button>
          ))}
        </div>

        <div className="places-carousel">
          {currentBlock > 0 && (
            <button
              className="carousel-btn prev"
              onClick={() => setCurrentBlock(currentBlock - 1)}
            >
              ‹
            </button>
          )}

          <div className="places-grid">
            {hasPlaces ? currentBlockData.places.map(place => (
              <div
                key={place.id}
                className={`place-card ${selectedPlaces.has(place.id) ? 'selected' : ''} ${place.isRecommended ? 'recommended' : ''}`}
                onClick={() => togglePlace(place.id)}
              >
                <div className="place-header">
                  <h4>{place.name}</h4>
                  {place.isRecommended && <span className="badge">추천</span>}
                </div>
                <p className="place-category">{place.category}</p>
                <p className="place-address">{place.address}</p>
                {place.rating && (
                  <div className="place-rating">
                    ⭐ {place.rating.toFixed(1)}
                  </div>
                )}
              </div>
            )) : (
              <div style={{
                gridColumn: '1 / -1',
                textAlign: 'center',
                padding: '40px',
                color: 'rgba(255, 255, 255, 0.6)'
              }}>
                이 시간대에는 추가 장소가 없습니다
              </div>
            )}
          </div>

          {currentBlock < timeBlocks.length - 1 && (
            <button
              className="carousel-btn next"
              onClick={() => setCurrentBlock(currentBlock + 1)}
            >
              ›
            </button>
          )}
        </div>

        <div className="form-footer">
          <div className="selection-info">
            선택된 장소: {selectedPlaces.size}개
          </div>
          <button
            className="confirm-btn"
            onClick={handleConfirm}
          >
            {selectedPlaces.size > 0
              ? `선택한 ${selectedPlaces.size}개 장소로 계속`
              : '추천 장소로 계속'}
          </button>
        </div>
      </div>
    );
  };

  const handleQuickFormSubmit = async (formData: any) => {
    const userId = authService.getCurrentUserId() || 1;
    const threadId = currentThreadId || `thread_${Date.now()}`;
    setCurrentThreadId(threadId);
    setCurrentScenario('quickform');

    // 사용자가 입력한 정보를 메시지로 표시
    const userMsg: Message = {
      id: `msg_form_submission_${Date.now()}`,
      threadId,
      role: 'user',
      content: `여행 정보: ${formData.destination || '미지정'}, ${formData.startDate}~${formData.endDate}, ${formData.travelers}명`,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    // 처리 중 메시지 표시
    const processingMsg: Message = {
      id: `msg_processing_${Date.now()}`,
      threadId,
      role: 'assistant',
      content: '🔍 여행지를 검색하고 DB에서 추천 장소를 가져오고 있습니다...',
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, processingMsg]);

    const destination = formData.destination || '서울';

    // formData를 상태로 저장
    setQuickFormData(formData);

    // 백엔드 Function Calling으로 Stage1 데이터 가져오기
    try {
      const response = await chatService.sendUnifiedMessage(threadId, JSON.stringify(formData), userId);
      console.log('✅ Backend Function Calling Response:', response);

      // 처리 중 메시지 제거
      setMessages(prev => prev.filter(m => m.id !== processingMsg.id));

      // Function Calling으로 받은 Stage1 데이터 확인
      if (response && response.type === 'STAGE1_PLACES_LOADED' && response.data && response.data.allPlaces) {
        const backendPlaces: Stage1Place[] = response.data.allPlaces;
        console.log(`✅ DB에서 ${backendPlaces.length}개 장소 로드 완료`);

        const stage1FormMsg: Message = {
          id: `msg_stage1_form_${Date.now()}`,
          threadId,
          role: 'assistant',
          content: `📍 ${destination} 여행을 위한 추천 장소들입니다.\nDB에서 가져온 ${backendPlaces.length}개 장소 중에서 원하시는 곳을 선택해주세요!`,
          timestamp: new Date().toISOString(),
          scenarioForm: {
            type: 'placeSelection',
            places: backendPlaces,
            region: destination
          }
        };
        setMessages(prev => [...prev, stage1FormMsg]);
        setScenarioPlaces(backendPlaces);
        setIsLoading(false);
        return;
      }

      // Fallback: 백엔드 응답이 없거나 형식이 다를 경우 하드코딩 데이터 사용
      console.warn('⚠️ Backend에서 Stage1 데이터를 받지 못했습니다. Fallback 데이터 사용');
      const fallbackPlaces: Stage1Place[] = [
        { id: '1', name: '경복궁', category: '관광지', subCategory: '역사', address: '서울 종로구 사직로 161', latitude: 37.5796, longitude: 126.9770, rating: 4.6, isRecommended: true },
        { id: '2', name: '창덕궁', category: '관광지', subCategory: '역사', address: '서울 종로구 율곡로 99', latitude: 37.5794, longitude: 126.9910, rating: 4.7, isRecommended: true },
        { id: '3', name: '북촌한옥마을', category: '관광지', subCategory: '문화', address: '서울 종로구 계동길 37', latitude: 37.5826, longitude: 126.9831, rating: 4.4, isRecommended: true },
        { id: '4', name: '광장시장', category: '맛집', subCategory: '전통시장', address: '서울 종로구 창경궁로 88', latitude: 37.5701, longitude: 126.9998, rating: 4.5, isRecommended: true },
        { id: '5', name: '명동', category: '쇼핑', subCategory: '거리', address: '서울 중구 명동길', latitude: 37.5636, longitude: 126.9869, rating: 4.5, isRecommended: true },
        { id: '6', name: 'N서울타워', category: '관광지', subCategory: '전망대', address: '서울 용산구 남산공원길 105', latitude: 37.5512, longitude: 126.9882, rating: 4.5, isRecommended: true },
        { id: '7', name: '홍대', category: '관광지', subCategory: '문화', address: '서울 마포구 와우산로', latitude: 37.5563, longitude: 126.9270, rating: 4.4, isRecommended: true }
      ];

      const stage1FormMsg: Message = {
        id: `msg_stage1_form_${Date.now()}`,
        threadId,
        role: 'assistant',
        content: `📍 ${destination} 여행을 위한 추천 장소들입니다.\n원하시는 곳을 선택해주세요!`,
        timestamp: new Date().toISOString(),
        scenarioForm: {
          type: 'placeSelection',
          places: fallbackPlaces,
          region: destination
        }
      };
      setMessages(prev => [...prev, stage1FormMsg]);
      setScenarioPlaces(fallbackPlaces);
      setIsLoading(false);

    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScenarioPlaceSelection = async (selectedPlaces: Stage1Place[]) => {
    if (!currentScenario || !currentThreadId) return;

    // 선택 메시지 표시
    const selectionMsg: Message = {
      id: `msg_selection_${Date.now()}`,
      threadId: currentThreadId,
      role: 'assistant',
      content: `선택하신 ${selectedPlaces.length}개 장소로 최적의 여행 일정을 생성하고 있습니다...`,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, selectionMsg]);
    setIsLoading(true);

    // 2초 대기 후 최종 결과 표시
    await new Promise(resolve => setTimeout(resolve, 2000));

    // quickform 시나리오일 경우 다르게 처리
    if (currentScenario === 'quickform' && quickFormData) {
      // quickFormData에서 날짜 정보 가져오기
      const startDate = new Date(quickFormData.startDate);
      const endDate = new Date(quickFormData.endDate);
      // 날짜 차이 계산 (일 수)
      const timeDiff = endDate.getTime() - startDate.getTime();
      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1;
      const destination = quickFormData.destination || '서울';

      // 서울 고정 여정 데이터 (Day 1, 2, 3)
      const seoulFixedItinerary = [
        {
          day: 1,
          date: new Date(startDate.getTime()).toISOString().split('T')[0],
          timeBlocks: {
            '09:00': [
              { name: '경복궁', category: '관광지', address: '서울 종로구 사직로 161', latitude: 37.5796, longitude: 126.9770, rating: 4.6, duration: '1.5시간' }
            ],
            '11:00': [
              { name: '북촌한옥마을', category: '관광지', address: '서울 종로구 계동길 37', latitude: 37.5826, longitude: 126.9831, rating: 4.4, duration: '1시간' }
            ],
            '12:30': [
              { name: '광장시장', category: '맛집', address: '서울 종로구 창경궁로 88', latitude: 37.5701, longitude: 126.9998, rating: 4.5, duration: '1시간' }
            ],
            '14:00': [
              { name: '인사동', category: '쇼핑', address: '서울 종로구 인사동길', latitude: 37.5732, longitude: 126.9874, rating: 4.3, duration: '1.5시간' }
            ],
            '16:00': [
              { name: '청계천', category: '관광지', address: '서울 종로구 서린동', latitude: 37.5688, longitude: 126.9789, rating: 4.3, duration: '1시간' }
            ],
            '18:00': [
              { name: 'N서울타워', category: '관광지', address: '서울 용산구 남산공원길 105', latitude: 37.5512, longitude: 126.9882, rating: 4.5, duration: '2시간' }
            ],
            '20:30': [
              { name: '명동 맛집거리', category: '맛집', address: '서울 중구 명동길', latitude: 37.5636, longitude: 126.9869, rating: 4.4, duration: '1.5시간' }
            ]
          }
        },
        {
          day: 2,
          date: days >= 2 ? new Date(startDate.getTime() + 86400000).toISOString().split('T')[0] : '',
          timeBlocks: {
            '09:00': [
              { name: '창덕궁', category: '관광지', address: '서울 종로구 율곡로 99', latitude: 37.5794, longitude: 126.9910, rating: 4.7, duration: '2시간' }
            ],
            '11:30': [
              { name: '익선동 한식당', category: '맛집', address: '서울 종로구 익선동', latitude: 37.5720, longitude: 126.9886, rating: 4.5, duration: '1시간' }
            ],
            '13:00': [
              { name: '동대문디자인플라자', category: '관광지', address: '서울 중구 을지로 281', latitude: 37.5665, longitude: 127.0092, rating: 4.4, duration: '2시간' }
            ],
            '15:30': [
              { name: '명동', category: '쇼핑', address: '서울 중구 명동길', latitude: 37.5636, longitude: 126.9869, rating: 4.5, duration: '2시간' }
            ],
            '18:00': [
              { name: '한강공원', category: '관광지', address: '서울 여의도 한강공원', latitude: 37.5283, longitude: 126.9341, rating: 4.5, duration: '2시간' }
            ],
            '20:30': [
              { name: '홍대', category: '관광지', address: '서울 마포구 와우산로', latitude: 37.5563, longitude: 126.9270, rating: 4.4, duration: '2시간' }
            ]
          }
        },
        {
          day: 3,
          date: days >= 3 ? new Date(startDate.getTime() + 172800000).toISOString().split('T')[0] : '',
          timeBlocks: {
            '09:00': [
              { name: '서울숲', category: '관광지', address: '서울 성동구 뚝섬로 273', latitude: 37.5444, longitude: 127.0374, rating: 4.5, duration: '2시간' }
            ],
            '11:30': [
              { name: '성수동', category: '카페', address: '서울 성동구 성수동', latitude: 37.5447, longitude: 127.0561, rating: 4.4, duration: '1.5시간' }
            ],
            '13:30': [
              { name: '코엑스', category: '쇼핑', address: '서울 강남구 영동대로 513', latitude: 37.5115, longitude: 127.0595, rating: 4.4, duration: '2시간' }
            ],
            '16:00': [
              { name: '롯데월드타워', category: '관광지', address: '서울 송파구 올림픽로 300', latitude: 37.5127, longitude: 127.1024, rating: 4.6, duration: '2시간' }
            ],
            '18:30': [
              { name: '강남역', category: '쇼핑', address: '서울 강남구 강남대로', latitude: 37.4979, longitude: 127.0276, rating: 4.4, duration: '2시간' }
            ],
            '21:00': [
              { name: '이태원', category: '맛집', address: '서울 용산구 이태원로', latitude: 37.5347, longitude: 126.9945, rating: 4.3, duration: '1.5시간' }
            ]
          }
        }
      ];

      // Stage 3 일정 생성 (선택한 장소들로)
      const itinerary: Array<{
        day: number;
        date: string;
        theme: string;
        places: Array<{
          name: string;
          category: string | undefined;
          duration: number;
          cost: number;
          latitude: number;
          longitude: number;
          description: string;
          rating: number;
        }>;
      }> = [];
      const placesPerDay = Math.ceil(selectedPlaces.length / days);

      // 여행 스타일에 따른 시간 조정
      const getDuration = (category: string) => {
        const baseTime = category === '맛집' ? 90 : category === '쇼핑' ? 180 : 120;
        if (quickFormData.travelStyle === '빡빡한') return baseTime * 0.8;
        if (quickFormData.travelStyle === '여유로운') return baseTime * 1.3;
        return baseTime; // 균형잡힌
      };

      // 예산에 따른 비용 조정
      const getBudgetMultiplier = () => {
        if (quickFormData.budget === '럭셔리') return 3;
        if (quickFormData.budget === '고급') return 2;
        if (quickFormData.budget === '저예산') return 0.6;
        return 1; // 중간
      };

      const budgetMultiplier = getBudgetMultiplier();
      const formatDateToKorean = (dateStr: string) => {
        const date = new Date(dateStr);
        const month = date.getMonth() + 1;
        const dayOfMonth = date.getDate();
        const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
        return `${month}월 ${dayOfMonth}일 (${dayOfWeek})`;
      };

      for (let day = 1; day <= days; day++) {
        const dayStart = (day - 1) * placesPerDay;
        const dayEnd = Math.min(day * placesPerDay, selectedPlaces.length);
        const dayPlaces = selectedPlaces.slice(dayStart, dayEnd).map(place => ({
          name: place.name,
          category: place.category,
          duration: Math.round(getDuration(place.category || '관광지')),
          cost: Math.round((place.category === '맛집' ? 15000 : place.category === '쇼핑' ? 30000 : 5000) * budgetMultiplier),
          latitude: place.latitude || 0,
          longitude: place.longitude || 0,
          description: place.description || place.address || '',
          rating: place.rating || 4.0
        }));

        // 동행자와 여행 스타일에 따른 테마 생성
        const getTheme = () => {
          if (quickFormData.travelCompanion === '커플') return `Day ${day} - 로맨틱 ${destination} 여행`;
          if (quickFormData.travelCompanion === '가족') return `Day ${day} - 가족과 함께하는 ${destination}`;
          if (quickFormData.travelCompanion === '친구') return `Day ${day} - 친구들과 즐기는 ${destination}`;
          if (quickFormData.travelCompanion === '혼자') return `Day ${day} - 나만의 ${destination} 여행`;
          return `Day ${day} - ${destination} 탐험`;
        };

        // 현재 날짜 계산 (day - 1일 후)
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + (day - 1));

        itinerary.push({
          day,
          date: currentDate.toISOString().split('T')[0], // YYYY-MM-DD 형식
          theme: getTheme(),
          places: dayPlaces
        });
      }

      // 여정 기반 예산 계산 함수
      const calculateBudgetFromItinerary = () => {
        const travelers = parseInt(quickFormData.travelers) || 1;

        // 카테고리별 가격 정의
        const CATEGORY_PRICES: { [key: string]: number } = {
          '관광지': 15000,
          '명소': 15000,
          '맛집': 30000,
          '식당': 30000,
          '레스토랑': 30000,
          '카페': 8000,
          '쇼핑': 50000,
          '쇼핑몰': 50000,
          '박물관': 12000,
          '미술관': 15000,
          '공원': 0,
          '해변': 0,
          '시장': 20000,
          '테마파크': 50000,
          '액티비티': 40000,
          '체험': 30000
        };

        // 1. 숙박비: 1박당 가격 × (일수 - 1)
        const accommodationPerNight =
          quickFormData.accommodation === '호텔' ? 120000 :
          quickFormData.accommodation === '리조트' ? 150000 :
          quickFormData.accommodation === '펜션' ? 80000 :
          quickFormData.accommodation === '한옥' ? 100000 : 50000; // 게스트하우스
        const accommodationTotal = accommodationPerNight * Math.max(days - 1, 0);

        // 2. 식비: 하루 3끼 × 일수 × 인원 (맛집 포함)
        let foodCount = 0;
        itinerary.forEach(day => {
          day.places.forEach(place => {
            const category = (place.category || '').toLowerCase();
            if (category.includes('맛집') || category.includes('식당') || category.includes('레스토랑')) {
              foodCount++;
            }
          });
        });
        // 최소 하루 3끼 보장
        const minMeals = days * 3;
        const actualMeals = Math.max(foodCount, minMeals);
        const foodTotal = actualMeals * 30000 * travelers;

        // 3. 교통비: 1일당 기본 교통비
        const transportationPerDay =
          quickFormData.transportation === '렌터카' ? 50000 :
          quickFormData.transportation === '택시' ? 40000 :
          quickFormData.transportation === '도보중심' ? 5000 : 10000; // 대중교통
        const transportationTotal = transportationPerDay * days;

        // 4. 활동비: 여정의 실제 장소 카운트 기반
        let activitiesTotal = 0;
        itinerary.forEach(day => {
          day.places.forEach(place => {
            const category = place.category || '기타';
            const categoryLower = category.toLowerCase();

            // 식사 관련은 식비에 포함되므로 제외
            if (categoryLower.includes('맛집') || categoryLower.includes('식당') ||
                categoryLower.includes('레스토랑') || categoryLower.includes('카페')) {
              return;
            }

            // 카테고리별 가격 찾기
            let price = CATEGORY_PRICES[category] || 20000; // 기본값

            // 부분 매칭으로 가격 찾기
            if (price === 20000) {
              for (const [key, value] of Object.entries(CATEGORY_PRICES)) {
                if (categoryLower.includes(key.toLowerCase())) {
                  price = value;
                  break;
                }
              }
            }

            activitiesTotal += price * travelers;
          });
        });

        return {
          accommodation: accommodationTotal,
          food: foodTotal,
          transportation: transportationTotal,
          activities: activitiesTotal,
          total: accommodationTotal + foodTotal + transportationTotal + activitiesTotal
        };
      };

      // 총 소요 시간 계산 (여행 스타일 반영)
      const getTotalTime = () => {
        const baseHours = quickFormData.travelStyle === '빡빡한' ? 10 :
                         quickFormData.travelStyle === '여유로운' ? 6 : 8; // 균형잡힌
        return baseHours * 60 * days; // 분 단위
      };

      const stage3Data: Stage3Data = {
        totalDays: days,
        destination: destination,
        itinerary: itinerary,
        totalDistance: 25.5 + Math.random() * 20,
        totalTime: getTotalTime(),
        budget: calculateBudgetFromItinerary(), // 여정 기반 예산 계산
        qualityScore: 85 + Math.floor(Math.random() * 10),
        startDate: quickFormData.startDate,
        endDate: quickFormData.endDate,
        travelers: quickFormData.travelers,
        travelStyle: quickFormData.travelStyle,
        travelCompanion: quickFormData.travelCompanion
      };

      // Stage 데이터 설정
      const stage1Data: Stage1Data = {
        categories: [
          { name: '관광지', places: selectedPlaces.filter(p => p.category === '관광지') },
          { name: '맛집', places: selectedPlaces.filter(p => p.category === '맛집') },
          { name: '카페', places: selectedPlaces.filter(p => p.category === '카페') },
          { name: '쇼핑', places: selectedPlaces.filter(p => p.category === '쇼핑') }
        ]
      };

      setStageData({ stage1: stage1Data, stage2: null, stage3: stage3Data });

      // localStorage에 여행 계획 데이터 저장 (고정 여정 사용)
      // destination에 따라 고정 여정 선택 (현재는 서울만 지원)
      const fixedItinerary = destination.includes('서울') ? seoulFixedItinerary.slice(0, days) : [];

      const itineraryPayload = {
        destination: destination,
        totalDays: days,
        totalDistance: stage3Data.totalDistance,
        totalTime: stage3Data.totalTime,
        budget: stage3Data.budget,
        itinerary: fixedItinerary  // 고정 여정 사용
      };
      localStorage.setItem(`itinerary_${currentThreadId}`, JSON.stringify(itineraryPayload));

      // 여행 계획 링크 생성
      const planLink = `/travel-plan?threadId=${encodeURIComponent(currentThreadId)}`;
      setTravelPlanLink(planLink);

      // 완료 메시지
      const finalMsg: Message = {
        id: `msg_final_${Date.now()}`,
        threadId: currentThreadId,
        role: 'assistant',
        content: `✨ 여행 계획이 완성되었습니다!`,
        timestamp: new Date().toISOString(),
        data: { itineraryLink: planLink }
      };

      setMessages(prev => [...prev, finalMsg]);
      setIsLoading(false);
      notifyThreadUpdate();

      // quickform 데이터 초기화
      setQuickFormData(null);
      setCurrentScenario(null);
      return;
    }

    // 기존 seoul/busan 시나리오 처리
    // Stage 1 데이터 설정
    const stage1Data: Stage1Data = {
      categories: [
        { name: '관광지', places: selectedPlaces.filter(p => p.category === '관광지') },
        { name: '식당', places: selectedPlaces.filter(p => p.category === '식당') },
        { name: '카페', places: selectedPlaces.filter(p => p.category === '카페') },
        { name: '쇼핑', places: selectedPlaces.filter(p => p.category === '쇼핑') }
      ]
    };

    // Stage 2 데이터 설정 (시나리오용 - 숨김)
    const stage2Data: Stage2Data = {
      totalDays: currentScenario === 'seoul' ? 3 : 2,
      selectedCount: selectedPlaces.length,
      days: currentScenario === 'seoul' ? [
        { day: 1, places: [] },
        { day: 2, places: [] },
        { day: 3, places: [] }
      ] : [
        { day: 1, places: [] },
        { day: 2, places: [] }
      ]
    };

    // Stage 3 데이터 설정
    const scenarioData = currentScenario === 'seoul' ? seoulScenarioData : busanScenarioData;
    setStageData({ stage1: stage1Data, stage2: stage2Data, stage3: scenarioData });

    // 여정 기반 예산 계산 (시나리오용)
    const calculateScenarioBudget = () => {
      const days = scenarioData.totalDays;
      const travelers = 1; // 시나리오 기본값

      // 카테고리별 가격 정의
      const CATEGORY_PRICES: { [key: string]: number } = {
        '관광지': 15000,
        '명소': 15000,
        '맛집': 30000,
        '식당': 30000,
        '레스토랑': 30000,
        '카페': 8000,
        '쇼핑': 50000,
        '쇼핑몰': 50000,
        '박물관': 12000,
        '미술관': 15000,
        '공원': 0,
        '해변': 0,
        '시장': 20000,
        '테마파크': 50000,
        '액티비티': 40000,
        '체험': 30000
      };

      // 1. 숙박비: 기본 호텔 1박당 120,000원
      const accommodationTotal = 120000 * Math.max(days - 1, 0);

      // 2. 식비: itinerary의 식당 카운트 + 기본 3끼 보장
      let foodCount = 0;
      scenarioData.itinerary.forEach((day: any) => {
        day.places.forEach((place: any) => {
          const category = (place.category || '').toLowerCase();
          if (category.includes('맛집') || category.includes('식당') ||
              category.includes('레스토랑') || category.includes('카페')) {
            foodCount++;
          }
        });
      });
      const minMeals = days * 3;
      const actualMeals = Math.max(foodCount, minMeals);
      const foodTotal = actualMeals * 30000 * travelers;

      // 3. 교통비: 기본 대중교통 1일 10,000원
      const transportationTotal = 10000 * days;

      // 4. 활동비: itinerary의 실제 장소 카운트
      let activitiesTotal = 0;
      scenarioData.itinerary.forEach((day: any) => {
        day.places.forEach((place: any) => {
          const category = place.category || '기타';
          const categoryLower = category.toLowerCase();

          // 식사 관련은 식비에 포함되므로 제외
          if (categoryLower.includes('맛집') || categoryLower.includes('식당') ||
              categoryLower.includes('레스토랑') || categoryLower.includes('카페')) {
            return;
          }

          // 카테고리별 가격 찾기
          let price = CATEGORY_PRICES[category] || 20000;
          if (price === 20000) {
            for (const [key, value] of Object.entries(CATEGORY_PRICES)) {
              if (categoryLower.includes(key.toLowerCase())) {
                price = value;
                break;
              }
            }
          }

          activitiesTotal += price * travelers;
        });
      });

      return {
        accommodation: accommodationTotal,
        food: foodTotal,
        transportation: transportationTotal,
        activities: activitiesTotal,
        total: accommodationTotal + foodTotal + transportationTotal + activitiesTotal
      };
    };

    const budget = calculateScenarioBudget();

    const recommendations = currentScenario === 'seoul'
      ? ['서울시티투어버스 이용 추천', '지하철 일일권 구매하면 교통비 절약', '경복궁 야간개장 시 예약 필수']
      : ['부산시티투어 버스 활용', '해운대 숙박 추천', '돼지국밥 필수'];

    const finalMsg: Message = {
      id: `msg_final_${Date.now()}`,
      threadId: currentThreadId,
      role: 'assistant',
      content: `✨ ${currentScenario === 'seoul' ? '서울' : '부산'} ${scenarioData.totalDays}일 여행 계획이 완성되었습니다!

📍 **주요 일정**
${(scenarioData.itinerary || []).map((day: any) =>
  `Day ${day.day}: ${day.theme} - ${day.places.slice(0, 2).map((p: any) => p.name).join(', ')} 등`
).join('\n')}

💰 **예상 총 비용**: ${budget.total.toLocaleString()}원
- 숙박: ${budget.accommodation.toLocaleString()}원
- 식사: ${budget.food.toLocaleString()}원
- 교통: ${budget.transportation.toLocaleString()}원
- 활동: ${budget.activities.toLocaleString()}원

📊 **여행 품질 점수**: ${currentScenario === 'seoul' ? 92 : 89}점

💡 **추천 사항**
${recommendations.map(r => `• ${r}`).join('\n')}

아래 링크에서 상세한 일정을 확인하실 수 있습니다!`,
      timestamp: new Date().toISOString(),
      data: { itineraryLink: travelPlanLink }
    };

    setMessages(prev => [...prev, finalMsg]);
    setIsLoading(false);
    notifyThreadUpdate();
  };

  // 시나리오용 - 시나리오 실행 함수
  const executeScenario = async (scenario: 'seoul' | 'busan', userMessage: string) => {
    const userId = authService.getCurrentUserId() || 1;
    const threadId = `scenario_${scenario}_${Date.now()}`;
    const scenarioData = scenario === 'seoul' ? seoulScenarioData : busanScenarioData;

    // 사용자 메시지 표시
    const userMsg: Message = {
      id: `msg_user_${Date.now()}`,
      threadId,
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    };
    setMessages([userMsg]);

    // 새 스레드 설정
    setCurrentThread({
      id: threadId,
      userId,
      title: `${scenario === 'seoul' ? '서울' : '부산'} 여행 계획`,
      lastMessage: userMessage,
      lastMessageAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    setCurrentThreadId(threadId);

    // Stage 1 응답 (시나리오용)
    await new Promise(resolve => setTimeout(resolve, 500));

    // Stage 1 데이터 설정 (시나리오용 - 시간대별 75개 서울 장소)
    const mockPlaces: Stage1Place[] = scenario === 'seoul' ? [
      // 오전 블록 (Morning) - 25개
      { id: '1', name: '경복궁', category: '관광지', subCategory: '역사', address: '서울 종로구 사직로 161', latitude: 37.5796, longitude: 126.9770, rating: 4.6, isRecommended: true },
      { id: '2', name: '북촌한옥마을', category: '관광지', subCategory: '문화', address: '서울 종로구 계동길 37', latitude: 37.5826, longitude: 126.9831, rating: 4.4, isRecommended: true },
      { id: '3', name: '창덕궁', category: '관광지', subCategory: '역사', address: '서울 종로구 율곡로 99', latitude: 37.5794, longitude: 126.9910, rating: 4.7, isRecommended: true },
      { id: '4', name: '덕수궁', category: '관광지', subCategory: '역사', address: '서울 중구 세종대로 99', latitude: 37.5658, longitude: 126.9751, rating: 4.5, isRecommended: false },
      { id: '5', name: '종묘', category: '관광지', subCategory: '역사', address: '서울 종로구 종로 157', latitude: 37.5747, longitude: 126.9940, rating: 4.6, isRecommended: false },
      { id: '6', name: '서울숲', category: '자연', subCategory: '공원', address: '서울 성동구 뚝섬로 273', latitude: 37.5444, longitude: 127.0374, rating: 4.5, isRecommended: true },
      { id: '7', name: '남산공원', category: '자연', subCategory: '공원', address: '서울 중구 삼일대로 231', latitude: 37.5512, longitude: 126.9882, rating: 4.4, isRecommended: false },
      { id: '8', name: '광화문광장', category: '관광지', subCategory: '광장', address: '서울 종로구 세종대로 172', latitude: 37.5718, longitude: 126.9767, rating: 4.3, isRecommended: false },
      { id: '9', name: '청계천', category: '관광지', subCategory: '하천', address: '서울 중구 청계천로', latitude: 37.5688, longitude: 126.9789, rating: 4.2, isRecommended: false },
      { id: '10', name: '광장시장', category: '시장', subCategory: '전통시장', address: '서울 종로구 창경궁로 88', latitude: 37.5700, longitude: 126.9990, rating: 4.4, isRecommended: true },
      { id: '11', name: '남대문시장', category: '시장', subCategory: '전통시장', address: '서울 중구 남대문시장4길 21', latitude: 37.5598, longitude: 126.9778, rating: 4.3, isRecommended: false },
      { id: '12', name: '노량진수산시장', category: '시장', subCategory: '수산시장', address: '서울 동작구 노들로 674', latitude: 37.5134, longitude: 126.9408, rating: 4.3, isRecommended: false },
      { id: '13', name: '전쟁기념관', category: '박물관', subCategory: '역사', address: '서울 용산구 이태원로 29', latitude: 37.5369, longitude: 126.9770, rating: 4.5, isRecommended: false },
      { id: '14', name: '국립중앙박물관', category: '박물관', subCategory: '종합', address: '서울 용산구 서빙고로 137', latitude: 37.5240, longitude: 126.9804, rating: 4.6, isRecommended: true },
      { id: '15', name: '국립현대미술관', category: '박물관', subCategory: '미술', address: '서울 종로구 삼청로 30', latitude: 37.5789, longitude: 126.9809, rating: 4.4, isRecommended: false },
      { id: '16', name: '서울역사박물관', category: '박물관', subCategory: '역사', address: '서울 종로구 새문안로 55', latitude: 37.5717, longitude: 126.9682, rating: 4.3, isRecommended: false },
      { id: '17', name: '동대문디자인플라자', category: '관광지', subCategory: '건축', address: '서울 중구 을지로 281', latitude: 37.5665, longitude: 127.0092, rating: 4.3, isRecommended: false },
      { id: '18', name: '낙산공원', category: '자연', subCategory: '공원', address: '서울 종로구 낙산길 41', latitude: 37.5806, longitude: 127.0075, rating: 4.4, isRecommended: false },
      { id: '19', name: '효창공원', category: '자연', subCategory: '공원', address: '서울 용산구 효창원로 177-18', latitude: 37.5443, longitude: 126.9616, rating: 4.2, isRecommended: false },
      { id: '20', name: '선릉', category: '관광지', subCategory: '역사', address: '서울 강남구 선릉로100길 1', latitude: 37.5087, longitude: 127.0485, rating: 4.3, isRecommended: false },
      { id: '21', name: '봉은사', category: '사찰', subCategory: '불교', address: '서울 강남구 봉은사로 531', latitude: 37.5145, longitude: 127.0573, rating: 4.4, isRecommended: false },
      { id: '22', name: '조계사', category: '사찰', subCategory: '불교', address: '서울 종로구 우정국로 55', latitude: 37.5731, longitude: 126.9866, rating: 4.3, isRecommended: false },
      { id: '23', name: '명동성당', category: '종교', subCategory: '성당', address: '서울 중구 명동길 74', latitude: 37.5633, longitude: 126.9875, rating: 4.5, isRecommended: false },
      { id: '24', name: '서울시청', category: '관광지', subCategory: '건축', address: '서울 중구 세종대로 110', latitude: 37.5664, longitude: 126.9778, rating: 4.2, isRecommended: false },
      { id: '25', name: '숭례문', category: '관광지', subCategory: '역사', address: '서울 중구 세종대로 40', latitude: 37.5599, longitude: 126.9753, rating: 4.3, isRecommended: false },

      // 오후 블록 (Afternoon) - 25개
      { id: '26', name: '명동', category: '쇼핑', subCategory: '거리', address: '서울 중구 명동길', latitude: 37.5636, longitude: 126.9869, rating: 4.5, isRecommended: true },
      { id: '27', name: '인사동', category: '쇼핑', subCategory: '전통', address: '서울 종로구 인사동길', latitude: 37.5732, longitude: 126.9874, rating: 4.3, isRecommended: true },
      { id: '28', name: '코엑스', category: '쇼핑', subCategory: '복합몰', address: '서울 강남구 영동대로 513', latitude: 37.5115, longitude: 127.0595, rating: 4.4, isRecommended: false },
      { id: '29', name: '롯데월드타워', category: '관광지', subCategory: '전망대', address: '서울 송파구 올림픽로 300', latitude: 37.5127, longitude: 127.1024, rating: 4.6, isRecommended: true },
      { id: '30', name: '롯데월드', category: '테마파크', subCategory: '놀이공원', address: '서울 송파구 올림픽로 240', latitude: 37.5111, longitude: 127.0980, rating: 4.5, isRecommended: false },
      { id: '31', name: '강남역', category: '쇼핑', subCategory: '상권', address: '서울 강남구 강남대로', latitude: 37.4981, longitude: 127.0276, rating: 4.3, isRecommended: false },
      { id: '32', name: '가로수길', category: '쇼핑', subCategory: '거리', address: '서울 강남구 신사동 가로수길', latitude: 37.5203, longitude: 127.0228, rating: 4.4, isRecommended: true },
      { id: '33', name: '삼청동', category: '관광지', subCategory: '문화', address: '서울 종로구 삼청동', latitude: 37.5835, longitude: 126.9832, rating: 4.3, isRecommended: false },
      { id: '34', name: '이태원', category: '쇼핑', subCategory: '다국적', address: '서울 용산구 이태원로', latitude: 37.5347, longitude: 126.9945, rating: 4.3, isRecommended: false },
      { id: '35', name: '한강공원', category: '자연', subCategory: '공원', address: '서울 여의도 한강공원', latitude: 37.5283, longitude: 126.9341, rating: 4.5, isRecommended: false },
      { id: '36', name: '서울타워', category: '관광지', subCategory: '전망대', address: '서울 용산구 남산공원길 105', latitude: 37.5512, longitude: 126.9882, rating: 4.5, isRecommended: true },
      { id: '37', name: '63빌딩', category: '관광지', subCategory: '전망대', address: '서울 영등포구 63로 50', latitude: 37.5195, longitude: 126.9403, rating: 4.3, isRecommended: false },
      { id: '38', name: '여의도공원', category: '자연', subCategory: '공원', address: '서울 영등포구 여의공원로 68', latitude: 37.5244, longitude: 126.9234, rating: 4.3, isRecommended: false },
      { id: '39', name: '올림픽공원', category: '자연', subCategory: '공원', address: '서울 송파구 올림픽로 424', latitude: 37.5206, longitude: 127.1214, rating: 4.4, isRecommended: false },
      { id: '40', name: '서울대공원', category: '동물원', subCategory: '가족', address: '경기 과천시 대공원광장로 102', latitude: 37.4279, longitude: 127.0158, rating: 4.5, isRecommended: false },
      { id: '41', name: '어린이대공원', category: '공원', subCategory: '가족', address: '서울 광진구 능동로 216', latitude: 37.5483, longitude: 127.0815, rating: 4.4, isRecommended: false },
      { id: '42', name: '서울랜드', category: '테마파크', subCategory: '놀이공원', address: '경기 과천시 광명로 181', latitude: 37.4349, longitude: 127.0211, rating: 4.3, isRecommended: false },
      { id: '43', name: '통인시장', category: '시장', subCategory: '전통시장', address: '서울 종로구 자하문로15길 18', latitude: 37.5798, longitude: 126.9719, rating: 4.3, isRecommended: false },
      { id: '44', name: '익선동', category: '관광지', subCategory: '한옥마을', address: '서울 종로구 익선동', latitude: 37.5726, longitude: 126.9892, rating: 4.4, isRecommended: false },
      { id: '45', name: '성수동', category: '관광지', subCategory: '카페거리', address: '서울 성동구 성수동', latitude: 37.5447, longitude: 127.0558, rating: 4.3, isRecommended: false },
      { id: '46', name: '북서울꿈의숲', category: '자연', subCategory: '공원', address: '서울 강북구 월계로 173', latitude: 37.6207, longitude: 127.0408, rating: 4.4, isRecommended: false },
      { id: '47', name: '월드컵공원', category: '자연', subCategory: '공원', address: '서울 마포구 월드컵로 243-60', latitude: 37.5644, longitude: 126.8975, rating: 4.3, isRecommended: false },
      { id: '48', name: '서울식물원', category: '식물원', subCategory: '자연', address: '서울 강서구 마곡동로 161', latitude: 37.5695, longitude: 126.8345, rating: 4.4, isRecommended: false },
      { id: '49', name: '청와대', category: '관광지', subCategory: '역사', address: '서울 종로구 청와대로 1', latitude: 37.5866, longitude: 126.9748, rating: 4.5, isRecommended: true },
      { id: '50', name: '동묘시장', category: '시장', subCategory: '벼룩시장', address: '서울 종로구 숭인동', latitude: 37.5735, longitude: 127.0169, rating: 4.2, isRecommended: false },

      // 저녁 블록 (Evening) - 25개
      { id: '51', name: '홍대', category: '관광지', subCategory: '문화', address: '서울 마포구 와우산로', latitude: 37.5563, longitude: 126.9270, rating: 4.4, isRecommended: true },
      { id: '52', name: '강남대로', category: '야경', subCategory: '거리', address: '서울 강남구 강남대로', latitude: 37.4981, longitude: 127.0276, rating: 4.3, isRecommended: false },
      { id: '53', name: '반포한강공원', category: '야경', subCategory: '분수', address: '서울 서초구 신반포로11길 40', latitude: 37.5109, longitude: 126.9959, rating: 4.5, isRecommended: true },
      { id: '54', name: '청계천 야경', category: '야경', subCategory: '하천', address: '서울 중구 청계천로', latitude: 37.5688, longitude: 126.9789, rating: 4.3, isRecommended: false },
      { id: '55', name: '북악스카이웨이', category: '야경', subCategory: '전망', address: '서울 종로구 북악산로', latitude: 37.5967, longitude: 126.9680, rating: 4.4, isRecommended: false },
      { id: '56', name: '응봉산', category: '야경', subCategory: '전망', address: '서울 성동구 응봉동', latitude: 37.5488, longitude: 127.0318, rating: 4.3, isRecommended: false },
      { id: '57', name: '낙산야경', category: '야경', subCategory: '전망', address: '서울 종로구 낙산길', latitude: 37.5806, longitude: 127.0075, rating: 4.4, isRecommended: false },
      { id: '58', name: '경리단길', category: '맛집', subCategory: '거리', address: '서울 용산구 회나무로', latitude: 37.5346, longitude: 126.9892, rating: 4.3, isRecommended: false },
      { id: '59', name: '연남동', category: '맛집', subCategory: '거리', address: '서울 마포구 연남동', latitude: 37.5624, longitude: 126.9256, rating: 4.4, isRecommended: false },
      { id: '60', name: '망원동', category: '맛집', subCategory: '거리', address: '서울 마포구 망원동', latitude: 37.5556, longitude: 126.9020, rating: 4.3, isRecommended: false },
      { id: '61', name: '을지로', category: '술집', subCategory: '거리', address: '서울 중구 을지로', latitude: 37.5660, longitude: 126.9910, rating: 4.3, isRecommended: false },
      { id: '62', name: '종로포차거리', category: '술집', subCategory: '포차', address: '서울 종로구 종로8길', latitude: 37.5704, longitude: 126.9886, rating: 4.2, isRecommended: false },
      { id: '63', name: '건대입구', category: '술집', subCategory: '대학가', address: '서울 광진구 아차산로', latitude: 37.5403, longitude: 127.0702, rating: 4.3, isRecommended: false },
      { id: '64', name: '신촌', category: '술집', subCategory: '대학가', address: '서울 서대문구 신촌로', latitude: 37.5585, longitude: 126.9387, rating: 4.3, isRecommended: false },
      { id: '65', name: '대학로', category: '공연', subCategory: '연극', address: '서울 종로구 대학로', latitude: 37.5827, longitude: 127.0028, rating: 4.4, isRecommended: true },
      { id: '66', name: '예술의전당', category: '공연', subCategory: '음악', address: '서울 서초구 남부순환로 2406', latitude: 37.4778, longitude: 127.0119, rating: 4.5, isRecommended: false },
      { id: '67', name: '세종문화회관', category: '공연', subCategory: '음악', address: '서울 종로구 세종대로 175', latitude: 37.5725, longitude: 126.9760, rating: 4.4, isRecommended: false },
      { id: '68', name: '블루스퀘어', category: '공연', subCategory: '뮤지컬', address: '서울 용산구 이태원로 294', latitude: 37.5407, longitude: 126.9945, rating: 4.4, isRecommended: false },
      { id: '69', name: 'CGV용산', category: '영화관', subCategory: '아이맥스', address: '서울 용산구 한강대로23길 55', latitude: 37.5301, longitude: 126.9649, rating: 4.3, isRecommended: false },
      { id: '70', name: '롯데시네마', category: '영화관', subCategory: '멀티플렉스', address: '서울 송파구 올림픽로 300', latitude: 37.5127, longitude: 127.1024, rating: 4.3, isRecommended: false },
      { id: '71', name: '한강다리야경', category: '야경', subCategory: '다리', address: '서울 한강대교', latitude: 37.5173, longitude: 126.9633, rating: 4.4, isRecommended: false },
      { id: '72', name: 'DDP야경', category: '야경', subCategory: '건축', address: '서울 중구 을지로 281', latitude: 37.5665, longitude: 127.0092, rating: 4.4, isRecommended: false },
      { id: '73', name: '서울로7017', category: '야경', subCategory: '산책', address: '서울 중구 청파로 432', latitude: 37.5571, longitude: 126.9705, rating: 4.3, isRecommended: false },
      { id: '74', name: '노들섬', category: '문화', subCategory: '복합문화', address: '서울 용산구 양녕로 445', latitude: 37.5178, longitude: 126.9593, rating: 4.3, isRecommended: false },
      { id: '75', name: '세빛둥둥섬', category: '야경', subCategory: '수상', address: '서울 서초구 올림픽대로 683', latitude: 37.5117, longitude: 126.9958, rating: 4.2, isRecommended: false }
    ] : [
      { id: '1', name: '해운대해수욕장', category: '관광지', subCategory: '해변', address: '부산 해운대구', latitude: 35.1586, longitude: 129.1604, rating: 4.7, isRecommended: true },
      { id: '2', name: '광안리해수욕장', category: '관광지', subCategory: '해변', address: '부산 수영구', latitude: 35.1531, longitude: 129.1187, rating: 4.6, isRecommended: true },
      { id: '3', name: '감천문화마을', category: '관광지', subCategory: '문화', address: '부산 사하구', latitude: 35.0975, longitude: 129.0106, rating: 4.5, isRecommended: true },
      { id: '4', name: '자갈치시장', category: '식당', subCategory: '시장', address: '부산 중구', latitude: 35.0965, longitude: 129.0306, rating: 4.4, isRecommended: false },
      { id: '5', name: '태종대', category: '관광지', subCategory: '자연', address: '부산 영도구', latitude: 35.0538, longitude: 129.0871, rating: 4.6, isRecommended: true },
      { id: '6', name: '남포동', category: '쇼핑', subCategory: '거리', address: '부산 중구', latitude: 35.0988, longitude: 129.0282, rating: 4.3, isRecommended: false },
      { id: '7', name: '서면', category: '쇼핑', subCategory: '중심가', address: '부산 부산진구', latitude: 35.1578, longitude: 129.0603, rating: 4.4, isRecommended: false }
    ];

    // 시나리오용 - 인라인 폼으로 장소 선택 표시
    const formMsg: Message = {
      id: `msg_form_${Date.now()}`,
      threadId,
      role: 'assistant',
      content: `${scenario === 'seoul' ? '서울' : '부산'} 여행을 위한 추천 장소들입니다. 관심 있는 장소들을 선택해주세요!`,
      timestamp: new Date().toISOString(),
      scenarioForm: {
        type: 'placeSelection',
        places: mockPlaces,
        region: scenario === 'seoul' ? '서울' : '부산'
      }
    };
    setMessages(prev => [...prev, formMsg]);

    setScenarioPlaces(mockPlaces);
    setIsLoading(false);

    // 여행 계획 링크 생성
    const planLink = `/travel-plan?threadId=${encodeURIComponent(threadId)}`;
    setTravelPlanLink(planLink);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setShowSuggestions(false);
    setIsLoading(true);

    const userId = authService.getCurrentUserId() || 1;
    const tempMessageId = `msg_${Date.now()}`;
    const threadId = currentThread?.id || `thread_${Date.now()}`;

    const newUserMessage: Message = {
      id: tempMessageId,
      threadId: threadId,
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, newUserMessage]);

    try {
      // 백엔드 UnifiedChatController 호출
      const response = await chatService.sendUnifiedMessage(threadId, userMessage, userId);

      if (response) {
        // 스레드 생성/업데이트
        if (!currentThread) {
          setCurrentThread({
            id: threadId,
            userId,
            title: userMessage.substring(0, 50) || '새 대화',
            lastMessage: userMessage,
            lastMessageAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
          setCurrentThreadId(threadId);
        }

        // AI 응답 추가
        const aiMessage: Message = {
          id: `msg_${Date.now()}_ai`,
          threadId: threadId,
          role: 'assistant',
          content: response.content || response.response || response.message || '응답을 생성하고 있습니다...',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, aiMessage]);

        // Phase 확인 (백엔드에서 phase 정보가 있으면)
        console.log('Response from backend:', response);

        // Quick Form 표시 여부 확인
        if (response.type === 'QUICK_FORM' || response.phase === 'INFORMATION_COLLECTION') {
          console.log('Showing Quick Travel Form');

          // Quick Form을 메시지로 추가
          const quickFormMessage: Message = {
            id: `msg_${Date.now()}_quickform`,
            threadId,
            role: 'assistant',
            content: '',
            timestamp: new Date().toISOString(),
            quickForm: true  // 이 플래그로 Quick Form을 표시
          };
          setMessages(prev => [...prev, quickFormMessage]);
        }

        // Phase 확인 - PHASE_2 또는 INFORMATION_GATHERING 후에 장소 선택 폼 표시
        const currentPhase = response.phase || response.currentPhase;
        const shouldShowPlaceSelection =
          currentPhase === 'STAGE_1' ||
          currentPhase === 'CANDIDATE_SELECTION' ||
          response.showPlaceSelection === true ||
          (response.content && response.content.includes('장소를 선택'));

        if (shouldShowPlaceSelection) {
          console.log('Phase 2 - showing place selection form');

          // 1초 후 장소 선택 폼 표시
          setTimeout(() => {
            // 여행지 추출
            const destination = response.destination || '서울';
            const scenario = destination.includes('부산') ? 'busan' : 'seoul';

            console.log('Showing place selection form for:', scenario);

            // Mock places 데이터
            const mockPlaces: Stage1Place[] = scenario === 'seoul' ? [
              { id: '1', name: '경복궁', category: '관광지', subCategory: '역사', address: '서울 종로구 사직로 161', latitude: 37.5796, longitude: 126.9770, rating: 4.6, isRecommended: true },
              { id: '2', name: '북촌한옥마을', category: '관광지', subCategory: '문화', address: '서울 종로구 계동길 37', latitude: 37.5826, longitude: 126.9831, rating: 4.4, isRecommended: true },
              { id: '3', name: '덕수궁', category: '관광지', subCategory: '역사', address: '서울 중구 세종대로 99', latitude: 37.5658, longitude: 126.9751, rating: 4.5, isRecommended: false },
              { id: '4', name: '명동', category: '쇼핑', subCategory: '거리', address: '서울 중구 명동길', latitude: 37.5636, longitude: 126.9869, rating: 4.5, isRecommended: false },
              { id: '5', name: '인사동', category: '쇼핑', subCategory: '전통', address: '서울 종로구 인사동길', latitude: 37.5732, longitude: 126.9874, rating: 4.3, isRecommended: true },
              { id: '6', name: '성수동', category: '카페', subCategory: '트렌디', address: '서울 성동구 성수동', latitude: 37.5447, longitude: 127.0561, rating: 4.4, isRecommended: false },
              { id: '7', name: '익선동한옥거리', category: '관광지', subCategory: '문화', address: '서울 종로구 익선동', latitude: 37.5720, longitude: 126.9886, rating: 4.5, isRecommended: true },
              { id: '8', name: '청와대', category: '관광지', subCategory: '역사', address: '서울 종로구 청와대로 1', latitude: 37.5866, longitude: 126.9748, rating: 4.6, isRecommended: true }
            ] : [
              { id: '1', name: '해운대해수욕장', category: '관광지', subCategory: '해변', address: '부산 해운대구', latitude: 35.1586, longitude: 129.1604, rating: 4.7, isRecommended: true },
              { id: '2', name: '광안리해수욕장', category: '관광지', subCategory: '해변', address: '부산 수영구', latitude: 35.1531, longitude: 129.1187, rating: 4.6, isRecommended: true },
              { id: '3', name: '감천문화마을', category: '관광지', subCategory: '문화', address: '부산 사하구', latitude: 35.0975, longitude: 129.0106, rating: 4.5, isRecommended: true },
              { id: '4', name: '자갈치시장', category: '식당', subCategory: '시장', address: '부산 중구', latitude: 35.0965, longitude: 129.0306, rating: 4.4, isRecommended: false },
              { id: '5', name: '태종대', category: '관광지', subCategory: '자연', address: '부산 영도구', latitude: 35.0538, longitude: 129.0871, rating: 4.6, isRecommended: true },
              { id: '6', name: '남포동', category: '쇼핑', subCategory: '거리', address: '부산 중구', latitude: 35.0988, longitude: 129.0282, rating: 4.3, isRecommended: false },
              { id: '7', name: '서면', category: '쇼핑', subCategory: '중심가', address: '부산 부산진구', latitude: 35.1578, longitude: 129.0603, rating: 4.4, isRecommended: false }
            ];

            // 장소 선택 폼 메시지 (인라인 폼으로 표시)
            const formMessage: Message = {
              id: `msg_${Date.now()}_phase2_form`,
              threadId: threadId,
              role: 'assistant',
              content: '',
              timestamp: new Date().toISOString(),
              scenarioForm: {
                type: 'placeSelection',
                places: mockPlaces,
                region: scenario === 'seoul' ? '서울' : '부산'
              }
            };
            setMessages(prev => [...prev, formMessage]);
            setScenarioPlaces(mockPlaces);
          }, 1000);
        }
      }

    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage: Message = {
        id: `msg_error_${Date.now()}`,
        threadId: currentThread?.id || '',
        role: 'assistant',
        content: '죄송합니다. 메시지 전송 중 오류가 발생했습니다. 다시 시도해주세요.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (text: string) => {
    setInputMessage(text);
    setTimeout(() => {
      handleSendMessage();
    }, 100);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  };

  const formatTimestamp = (timestamp: string | undefined | null) => {
    // timestamp가 없거나 invalid한 경우 현재 시간 사용
    if (!timestamp) {
      return new Date().toLocaleTimeString('ko-KR', { 
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }
    
    const date = new Date(timestamp);
    
    // Invalid Date 체크
    if (isNaN(date.getTime())) {
      return new Date().toLocaleTimeString('ko-KR', { 
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }
    
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isYesterday = new Date(now.getTime() - 86400000).toDateString() === date.toDateString();
    
    // 오늘인 경우 시간만 표시
    if (isToday) {
      return date.toLocaleTimeString('ko-KR', { 
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }
    
    // 어제인 경우
    if (isYesterday) {
      return '어제 ' + date.toLocaleTimeString('ko-KR', { 
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }
    
    // 그 외의 경우 날짜와 시간 표시
    return date.toLocaleDateString('ko-KR', { 
      month: 'numeric', 
      day: 'numeric'
    }) + ' ' + date.toLocaleTimeString('ko-KR', { 
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatMessageContent = (content: string) => {
    // Simple formatting for better readability
    // Convert **text** to bold
    let formatted = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Convert numbered lists (1. 2. 3.) to formatted lists
    formatted = formatted.replace(/(\d+)\.\s/g, '<br/>$1. ');
    
    // Convert bullet points (- or •) to formatted lists
    formatted = formatted.replace(/^[-•]\s/gm, '<br/>• ');
    
    // Add line breaks for better readability
    formatted = formatted.replace(/\n\n/g, '<br/><br/>');
    formatted = formatted.replace(/\n/g, '<br/>');
    
    return formatted;
  };

  const renderMessageBody = (message: Message) => {
    const formatted = formatMessageContent(message.content);
    const itineraryLink = message.data?.itineraryLink as string | undefined;
    const stage3Data = message.data?.stage3 as Stage3Data | undefined;

    // Quick Travel Form 표시
    if (message.quickForm) {
      return (
        <div className="message-content quick-form-message">
          {message.content && (
            <div className="message-text" dangerouslySetInnerHTML={{ __html: formatted }} />
          )}
          <QuickTravelForm
            onSubmit={handleQuickFormSubmit}
          />
        </div>
      );
    }

    // Stage 3 데이터 표시 (Phase 3)
    if (stage3Data || (message.data?.phase === 'STAGE_3' && stageData?.stage3)) {
      const dataToDisplay = stage3Data || stageData?.stage3;
      return (
        <div className="message-content stage3-message">
          {message.content && (
            <div className="message-text" dangerouslySetInnerHTML={{ __html: formatted }} />
          )}
          {dataToDisplay && <Stage3Display data={dataToDisplay as any} />}
        </div>
      );
    }

    // 시나리오용 - 장소 선택 폼
    if (message.scenarioForm?.type === 'placeSelection') {
      return (
        <div className="message-content scenario-form-message">
          {message.content && (
            <div className="message-text" dangerouslySetInnerHTML={{ __html: formatted }} />
          )}
          <PlaceSelectionForm
            places={message.scenarioForm.places}
            region={message.scenarioForm.region}
            onConfirm={handleScenarioPlaceSelection}
          />
        </div>
      );
    }

    if (itineraryLink) {
      return (
        <div className="message-content travel-plan-message">
          <div
            className="message-text"
            dangerouslySetInnerHTML={{ __html: formatted }}
          />
          <TravelPlanLinkCard link={itineraryLink} />
        </div>
      );
    }

    return (
      <div
        className="message-content"
        dangerouslySetInnerHTML={{ __html: formatted }}
      />
    );
  };

  const copyToClipboard = async (text: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  // Follow-up 질문에 대한 응답 처리
  const handleFollowUpResponse = async (response: string) => {
    if (!sessionId) {
      setInputMessage(response);
      await handleSendMessage();
      return;
    }
    
    // 사용자 메시지 표시
    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      threadId: currentThread?.id || '',
      role: 'user',
      content: response,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    try {
      const followUpResponse = await followUpService.respondToFollowUp(sessionId, response, authService.getCurrentUserId() || 1);
      
      if (followUpResponse.questionType === 'follow_up' || followUpResponse.questionType === 'clarification') {
        const followUpQuestion: FollowUpQuestion = {
          sessionId: followUpResponse.sessionId,
          currentStep: followUpResponse.currentStep || 'INITIAL',
          primaryQuestion: followUpResponse.question,
          helpText: followUpResponse.helpText,
          exampleAnswers: followUpResponse.exampleAnswers,
          quickOptions: followUpResponse.quickOptions,
          inputType: (followUpResponse.inputType || 'text') as 'text' | 'select' | 'multi-select' | 'date-range' | 'confirm',
          uiType: followUpResponse.uiType, // uiType 추가
          isRequired: true,
          canSkip: followUpResponse.canGeneratePlan || false,
          progressPercentage: followUpResponse.progressPercentage,
          remainingQuestions: followUpResponse.remainingQuestions || 0,
          collectedInfo: followUpResponse.collectedInfo
        };
        console.log('Setting follow-up question:', followUpQuestion); // 디버깅용
        setCurrentFollowUp(followUpQuestion);
        
        const aiMessage: Message = {
          id: `msg_${Date.now()}_ai`,
          threadId: currentThread?.id || '',
          role: 'assistant',
          content: followUpResponse.question,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, aiMessage]);
      } else if (followUpResponse.isComplete || followUpResponse.questionType === 'complete') {
        setCurrentFollowUp(null);
        setSessionId(null);
        
        const completionMessage: Message = {
          id: `msg_${Date.now()}_complete`,
          threadId: currentThread?.id || '',
          role: 'assistant',
          content: followUpResponse.message || '모든 정보가 수집되었습니다! 여행 계획을 생성하고 있습니다...',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, completionMessage]);
      }
    } catch (error) {
      console.error('Failed to respond to follow-up:', error);
      const errorMessage: Message = {
        id: `msg_error_${Date.now()}`,
        threadId: currentThread?.id || '',
        role: 'assistant',
        content: '죄송합니다. 응답 처리 중 오류가 발생했습니다.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // 옵션 선택 처리 (단일 선택)
  const handleOptionSelect = (value: string) => {
    // 다중 선택 타입이 아닌 경우에만 바로 전송
    if (currentFollowUp && 
        currentFollowUp.uiType !== 'checkbox-group' && 
        currentFollowUp.inputType !== 'multi-select') {
      handleFollowUpResponse(value);
    }
  };

  // 옵션 선택 처리 (중복 선택)
  const handleMultiSelect = (value: string) => {
    let newSelectedOptions: string[];
    if (selectedOptions.includes(value)) {
      newSelectedOptions = selectedOptions.filter(v => v !== value);
    } else {
      newSelectedOptions = [...selectedOptions, value];
    }
    setSelectedOptions(newSelectedOptions);
    
    // 선택된 항목들을 입력창에 표시
    if (newSelectedOptions.length > 0) {
      setInputMessage(newSelectedOptions.join(', '));
    } else {
      setInputMessage('');
    }
  };

  // 중복 선택 전송
  const handleMultiSelectSubmit = () => {
    if (selectedOptions.length > 0) {
      const response = selectedOptions.join(', ');
      handleFollowUpResponse(response);
      setSelectedOptions([]);
      setInputMessage('');  // 입력창 초기화
    }
  };

  // 날짜 선택 처리
  const handleDateRangeSubmit = () => {
    if (dateRange.start && dateRange.end) {
      const response = `${dateRange.start}부터 ${dateRange.end}까지`;
      handleFollowUpResponse(response);
      setDateRange({ start: '', end: '' });
    }
  };

  // 여행계획 생성하기 버튼 클릭 처리
  const handleTravelFormSubmit = async (formData: TravelFormData) => {
    setShowTravelForm(false);
    setIsLoading(true);

    try {
      const userId = authService.getCurrentUserId();
      let threadIdentifier = currentThreadId;
      let threadRef = currentThread;

      if (!threadIdentifier) {
        const thread = await chatService.createThread({
          userId,
          initialMessage: '여행 계획을 생성해주세요'
        });
        threadIdentifier = thread.id;
        threadRef = thread;
        setCurrentThread(thread);
        setCurrentThreadId(threadIdentifier);
      }

      const response = await chatService.sendMessage(threadIdentifier!, {
        message: '여행 계획을 생성해주세요',
        metadata: {
          type: 'TRAVEL_FORM_SUBMIT',
          formData: {
            destinations: formData.destinations,
            destinationUndecided: formData.destinationUndecided,
            departureLocation: formData.departureLocation,
            travelDates: formData.travelDates,
            departureTime: formData.departureTime,
            endTime: formData.endTime,
            companionType: formData.companionType,
            travelers: formData.travelers,
            budget: formData.budget,
            travelStyle: formData.travelStyle
          }
        }
      });

      if (threadRef) {
        setCurrentThread(threadRef);
      }

      appendAssistantResponse(response, threadIdentifier);
    } catch (error) {
      console.error('Failed to submit travel form:', error);
      const errorMessage: Message = {
        id: `msg_error_${Date.now()}`,
        threadId: '',
        role: 'assistant',
        content: '죄송합니다. 여행 계획 생성 중 오류가 발생했습니다. 다시 시도해주세요.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
      notifyThreadUpdate();
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateTravelPlan = async () => {
    if (!currentFollowUp || !currentFollowUp.collectedInfo) return;
    
    // 수집된 정보를 정리하여 표시
    const collectedInfo = currentFollowUp.collectedInfo;
    let summaryMessage = "🎯 **수집된 여행 정보**\n\n";
    
    if (collectedInfo.origin) {
      summaryMessage += `📍 **출발지**: ${collectedInfo.origin}\n`;
    }
    if (collectedInfo.destination) {
      summaryMessage += `🌍 **목적지**: ${collectedInfo.destination}\n`;
    }
    if (collectedInfo.startDate && collectedInfo.endDate) {
      summaryMessage += `📅 **여행 날짜**: ${collectedInfo.startDate} ~ ${collectedInfo.endDate}\n`;
    }
    if (collectedInfo.durationNights) {
      summaryMessage += `⏱️ **여행 기간**: ${collectedInfo.durationNights}박 ${collectedInfo.durationNights + 1}일\n`;
    }
    if (collectedInfo.numberOfTravelers) {
      summaryMessage += `👥 **인원**: ${collectedInfo.numberOfTravelers}명\n`;
    }
    if (collectedInfo.companionType) {
      const companionTypeMap: { [key: string]: string } = {
        'solo': '혼자',
        'couple': '커플',
        'family': '가족',
        'friends': '친구',
        'business': '비즈니스'
      };
      summaryMessage += `👫 **동행 유형**: ${companionTypeMap[collectedInfo.companionType] || collectedInfo.companionType}\n`;
    }
    if (collectedInfo.budgetLevel) {
      const budgetLevelMap: { [key: string]: string } = {
        'budget': '예산 절약형',
        'moderate': '적정 수준',
        'luxury': '럭셔리'
      };
      summaryMessage += `💰 **예산 수준**: ${budgetLevelMap[collectedInfo.budgetLevel] || collectedInfo.budgetLevel}\n`;
    }
    if (collectedInfo.budgetPerPerson) {
      summaryMessage += `💵 **1인당 예산**: ${collectedInfo.budgetPerPerson.toLocaleString()}원\n`;
    }
    
    summaryMessage += "\n\n📋 **선택 가능한 여행 템플릿:**\n";
    summaryMessage += "1. 🏖️ 휴양 중심 여행\n";
    summaryMessage += "2. 🏛️ 문화 탐방 여행\n";
    summaryMessage += "3. 🍽️ 미식 투어\n";
    summaryMessage += "4. 🎢 액티비티 중심 여행\n";
    summaryMessage += "5. 🛍️ 쇼핑 중심 여행\n";
    
    // 수집된 정보 메시지 추가
    const summaryMsg: Message = {
      id: `msg_summary_${Date.now()}`,
      threadId: currentThread?.id || '',
      role: 'assistant',
      content: summaryMessage,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, summaryMsg]);
    
    // Follow-up 초기화
    setCurrentFollowUp(null);
    
    // 여행 계획 생성 요청 메시지
    setTimeout(() => {
      const planningMsg: Message = {
        id: `msg_planning_${Date.now()}`,
        threadId: currentThread?.id || '',
        role: 'assistant',
        content: '원하시는 템플릿 번호를 선택하시거나, 특별한 요청사항을 말씀해 주세요! 맞춤형 여행 계획을 생성해드리겠습니다. 🚀',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, planningMsg]);
    }, 1000);
  };

  return (
    <div className="chat-interface">

      {/* 메시지 영역 */}
      <div className="chat-messages">
        {messages.length === 0 && !currentFollowUp && showWelcome && (
          <div className="welcome-message">
            <div className="welcome-content">
              <div className="welcome-logo">
                <span className="logo-icon">✈️</span>
                <span className="logo-text">Compass</span>
              </div>
              <h2 className="welcome-title">
                AI와 함께 특별한 여행을 계획해보세요!
              </h2>
              <p className="welcome-subtitle">
                어떤 여행을 꿈꾸시나요? 목적지, 일정, 취향을 알려주시면 맞춤형 여행 계획을 만들어드립니다.
              </p>
              <div className="welcome-features">
                <div className="feature-item">
                  <span className="feature-icon">🎯</span>
                  <span className="feature-text">맞춤형 일정</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">💰</span>
                  <span className="feature-text">예산 최적화</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">🗺️</span>
                  <span className="feature-text">실시간 정보</span>
                </div>
              </div>
              <button
                className="travel-form-button"
                onClick={handleOpenTravelForm}
                style={{
                  marginTop: '20px',
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                📝 여행 정보 입력하기
              </button>
            </div>
            {showSuggestions && (
              <div className="suggestion-grid">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    className="suggestion-card"
                    onClick={() => handleSuggestionClick(suggestion.text)}
                  >
                    <span className="suggestion-icon">{suggestion.icon}</span>
                    <span className="suggestion-title">{suggestion.title}</span>
                    <span className="suggestion-text">{suggestion.text}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        
        {messages.map((message) => (
          <div key={message.id} className={`message-container ${message.role}`}>
            <div className="message-wrapper">
              <div className="message-avatar">
                {message.role === 'user' ? '👤' : '🧭'}
              </div>
              <div className="message-content-wrapper">
                {renderMessageBody(message)}
                <div className="message-footer">
                  <span className="message-time">
                    {formatTimestamp(message.timestamp)}
                  </span>
                  {message.role === 'assistant' && (
                    <button
                      className="action-button"
                      onClick={() => copyToClipboard(message.content, message.id)}
                    >
                  {copiedMessageId === message.id ? '✅' : '📋'}
                  </button>
                )}
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="message-container assistant">
            <div className="message-wrapper">
              <div className="message-avatar">🧭</div>
              <div className="message-content-wrapper">
                <div className="message-content typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Follow-up 질문 UI - 완전히 숨김 */}
      {false ? (
        <div className="follow-up-container">
          <div className="follow-up-header">
            <h3>{currentFollowUp?.primaryQuestion}</h3>
            {currentFollowUp?.helpText && (
              <p className="help-text">{currentFollowUp?.helpText}</p>
            )}
          </div>

          {/* 빠른 선택 옵션 (단일 선택) */}
          {currentFollowUp?.inputType === 'select' &&
           currentFollowUp?.quickOptions && (
            <div className="quick-options">
              {currentFollowUp?.quickOptions?.map((option: QuickOption, index: number) => (
                <button
                  key={index}
                  className="option-button"
                  onClick={() => handleOptionSelect(option.value)}
                >
                  {option.icon && <span className="option-icon">{option.icon}</span>}
                  <div className="option-content">
                    <span className="option-label">{option.label}</span>
                    {option.description && (
                      <span className="option-description">{option.description}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* 다중 선택 옵션 (uiType이 checkbox-group일 때) */}
          {(currentFollowUp?.uiType === 'checkbox-group' ||
            currentFollowUp?.inputType === 'multi-select') && currentFollowUp?.quickOptions && (
            <div className="multi-select-container">
              <div className="quick-options multi-select">
                {currentFollowUp?.quickOptions?.map((option: QuickOption, index: number) => (
                  <button
                    key={index}
                    className={`option-button ${selectedOptions.includes(option.value) ? 'selected' : ''}`}
                    onClick={() => handleMultiSelect(option.value)}
                  >
                    {option.icon && <span className="option-icon">{option.icon}</span>}
                    <div className="option-content">
                      <span className="option-label">{option.label}</span>
                      {option.description && (
                        <span className="option-description">{option.description}</span>
                      )}
                    </div>
                    {selectedOptions.includes(option.value) && (
                      <span className="check-mark">✓</span>
                    )}
                  </button>
                ))}
              </div>
              <button
                className="submit-button"
                onClick={handleMultiSelectSubmit}
                disabled={selectedOptions.length === 0}
              >
                여행계획 생성하기 ({selectedOptions.length}개 선택됨)
              </button>
            </div>
          )}

          {/* 날짜 선택 - 개선된 캘린더 */}
          {(currentFollowUp?.currentStep === 'DATES' ||
            currentFollowUp?.inputType === 'date-range' ||
            currentFollowUp?.uiType === 'calendar' ||
            currentFollowUp?.progressPercentage === 33 ||
            (currentFollowUp?.primaryQuestion &&
             (currentFollowUp?.primaryQuestion?.includes('언제') ||
              currentFollowUp?.primaryQuestion?.includes('날짜') ||
              currentFollowUp?.primaryQuestion?.includes('기간') ||
              currentFollowUp?.primaryQuestion?.includes('일정') ||
              currentFollowUp?.primaryQuestion?.includes('예정')))) && (
            <div style={{ 
              display: 'block', 
              visibility: 'visible',
              width: '100%',
              minHeight: '400px',
              padding: '10px',
              backgroundColor: '#f8f9fa',
              borderRadius: '12px',
              marginBottom: '10px'
            }}>
              <DateRangePicker
                onDateSelect={(start, end) => {
                  handleDateRangeSelect(start, end);
                  handleFollowUpResponse(`${start},${end}`);
                }}
                startDate={dateRange.start}
                endDate={dateRange.end}
              />
            </div>
          )}

          {/* 예시 답변 */}
          {currentFollowUp?.exampleAnswers && (currentFollowUp?.exampleAnswers?.length ?? 0) > 0 && (
            <div className="example-answers">
              <span className="example-label">예시:</span>
              {currentFollowUp?.exampleAnswers?.map((example, index) => (
                <button
                  key={index}
                  className="example-button"
                  onClick={() => handleFollowUpResponse(example)}
                >
                  {example}
                </button>
              ))}
            </div>
          )}
          
          {/* 여행계획 생성하기 버튼 - canSkip이 true이고 충분한 정보가 수집되었을 때 표시 */}
          {currentFollowUp?.canSkip && (currentFollowUp?.progressPercentage ?? 0) >= 70 && (
            <div className="generate-plan-container" style={{
              marginTop: '20px',
              padding: '15px',
              background: '#f0f8ff',
              borderRadius: '8px',
              border: '1px solid #007bff'
            }}>
              <p style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
                충분한 정보가 수집되었습니다. 지금 여행 계획을 생성하시겠습니까?
              </p>
              <button
                className="generate-plan-button"
                onClick={() => handleGenerateTravelPlan()}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                🎯 여행계획 생성하기
              </button>
            </div>
          )}
        </div>
      ) : null}

      {/* 입력 영역 */}
      <div className="chat-input-container">
        <div className="chat-input-wrapper">
          <textarea
            ref={textareaRef}
            className="chat-input"
            placeholder={currentFollowUp ? "답변을 입력하세요..." : "여행에 대해 물어보세요..."}
            value={inputMessage}
            onChange={(e) => {
              setInputMessage(e.target.value);
              adjustTextareaHeight();
            }}
            onKeyDown={handleKeyPress}
            disabled={isLoading}
            rows={1}
          />
          <button
            className="chat-send-button"
            onClick={handleSendMessage}
            disabled={isLoading || !inputMessage.trim()}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Travel Form Modal */}
      <TravelFormModal
        isOpen={showTravelForm}
        onClose={() => setShowTravelForm(false)}
        onSubmit={handleTravelFormSubmit}
        initialData={quickFormInitialData}
      />

    </div>
  );
};

export default ChatInterface;
