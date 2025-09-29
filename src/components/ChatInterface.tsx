import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './ChatInterface.css';
import chatService, { Message, ChatThread, FollowUpQuestion, QuickOption } from '../services/chatService';
import authService from '../services/authService';
import { followUpService, FollowUpResponse } from '../services/followUpService';
import DateRangePicker from './DateRangePicker';
import TravelFormModal, { TravelFormData, TravelFormInitialData } from './TravelFormModal';
import StageProgressPanel, { Stage1Category, Stage1Data, Stage1Place, Stage2Data, Stage2Day, Stage2Place, Stage3Data } from './StageProgressPanel';

interface ChatInterfaceProps {
  threadId?: string;
  onNewChat?: () => void;
  isNewChat?: boolean;
  onThreadUpdate?: () => void;
}

const TravelPlanLinkCard: React.FC<{ link: string }> = ({ link }) => (
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
      <Link to={link} className="travel-plan-link-card__cta">
        여행 계획 열기 →
      </Link>
    </div>
  </div>
);

const ChatInterface: React.FC<ChatInterfaceProps> = ({ threadId, onNewChat, isNewChat, onThreadUpdate }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentThread, setCurrentThread] = useState<ChatThread | null>(null);
  const [currentThreadId, setCurrentThreadId] = useState<string | undefined>(threadId);
  const [showSuggestions, setShowSuggestions] = useState(!threadId);
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

  const processStagePayload = (message: Message, fallbackThreadId?: string) => {
    const update = evaluateStageMessage(message, fallbackThreadId);
    if (!update) return;

    if (update.stage1 !== undefined || update.stage2 !== undefined || update.stage3 !== undefined) {
      setStageData(prev => ({
        stage1: update.stage1 !== undefined ? update.stage1 : prev.stage1,
        stage2: update.stage2 !== undefined ? update.stage2 : prev.stage2,
        stage3: update.stage3 !== undefined ? update.stage3 : prev.stage3
      }));
      setIsStagePanelCollapsed(false);
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
    } else if (isNewChat) {
      setMessages([]);
      setCurrentThread(null);
      setCurrentThreadId(undefined);
      setShowSuggestions(true);
      setStageData({ stage1: null, stage2: null, stage3: null });
      setTravelPlanLink(null);
      setQuickFormInitialData(undefined);
    }
  }, [threadId, isNewChat]);

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

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setShowSuggestions(false);
    setIsLoading(true);

    const userId = authService.getCurrentUserId() || 1;
    const tempMessageId = `msg_${Date.now()}`;

    const newUserMessage: Message = {
      id: tempMessageId,
      threadId: currentThread?.id || '',
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, newUserMessage]);

    try {
      if (!sessionId) {
        const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setCurrentRequestId(requestId);

        const followUpResponse = await followUpService.startFollowUp(userMessage, userId, requestId);
        const threadIdentifier = followUpResponse.threadId || followUpResponse.sessionId;

        if (threadIdentifier) {
          setCurrentThread({
            id: threadIdentifier,
            userId,
            title: userMessage.substring(0, 50) || '새 대화',
            lastMessage: userMessage,
            lastMessageAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
          setCurrentThreadId(threadIdentifier);
          setMessages(prev => prev.map(msg => msg.id === tempMessageId ? { ...msg, threadId: threadIdentifier } : msg));
          notifyThreadUpdate();
        }

        setSessionId(followUpResponse.sessionId);

        if (followUpResponse.questionType === 'follow_up' || followUpResponse.questionType === 'clarification') {
          setCurrentFollowUp(toFollowUpQuestion(followUpResponse));

          const aiMessage: Message = {
            id: `msg_${Date.now()}_ai`,
            threadId: threadIdentifier || '',
            role: 'assistant',
            content: followUpResponse.question,
            timestamp: new Date().toISOString()
          };
          setMessages(prev => [...prev, aiMessage]);
          notifyThreadUpdate();
        } else if (followUpResponse.isComplete) {
          setCurrentFollowUp(null);
          setSessionId(null);
          notifyThreadUpdate();
        }
      } else {
        const followUpResponse = await followUpService.respondToFollowUp(sessionId, userMessage, userId);
        const threadIdentifier = followUpResponse.threadId || followUpResponse.sessionId;

        if (threadIdentifier && !currentThreadId) {
          setCurrentThreadId(threadIdentifier);
        }

        if (followUpResponse.questionType === 'follow_up' || followUpResponse.questionType === 'clarification') {
          setCurrentFollowUp(toFollowUpQuestion(followUpResponse));

          const aiMessage: Message = {
            id: `msg_${Date.now()}_ai`,
            threadId: threadIdentifier || '',
            role: 'assistant',
            content: followUpResponse.question,
            timestamp: new Date().toISOString()
          };
          setMessages(prev => [...prev, aiMessage]);
          notifyThreadUpdate();
        } else if (followUpResponse.isComplete || followUpResponse.questionType === 'complete') {
          setCurrentFollowUp(null);
          setSessionId(null);

          const completionMessage: Message = {
            id: `msg_${Date.now()}_complete`,
            threadId: threadIdentifier || '',
            role: 'assistant',
            content: followUpResponse.message || '모든 정보가 수집되었습니다! 여행 계획을 생성하고 있습니다...',
            timestamp: new Date().toISOString()
          };
          setMessages(prev => [...prev, completionMessage]);
          notifyThreadUpdate();
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
      {stagePanelVisible && (
        <StageProgressPanel
          stage1={stageData.stage1}
          stage2={stageData.stage2}
          stage3={stageData.stage3}
          travelPlanLink={stageData.stage3 ? (travelPlanLink ?? (currentThreadId ? `/travel-plan?threadId=${encodeURIComponent(currentThreadId)}` : undefined)) : undefined}
          collapsed={isStagePanelCollapsed}
          isProcessing={stageActionLoading}
          onToggleCollapse={setIsStagePanelCollapsed}
          onSubmitStage1={stageData.stage1 ? handleStage1Submit : undefined}
          onSubmitStage2={stageData.stage2 ? handleStage2Submit : undefined}
        />
      )}

      {/* 메시지 영역 */}
      <div className="chat-messages">
        {messages.length === 0 && !currentFollowUp && (
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

      {/* Follow-up 질문 UI */}
      {currentFollowUp && (
        <div className="follow-up-container">
          <div className="follow-up-header">
            <h3>{currentFollowUp.primaryQuestion}</h3>
            {currentFollowUp.helpText && (
              <p className="help-text">{currentFollowUp.helpText}</p>
            )}
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${currentFollowUp.progressPercentage}%` }}
              />
            </div>
            <p className="progress-text">
              진행률: {currentFollowUp.progressPercentage}% 
              {currentFollowUp.remainingQuestions > 0 && 
                ` (남은 질문: ${currentFollowUp.remainingQuestions}개)`}
            </p>
          </div>

          {/* 빠른 선택 옵션 (단일 선택) */}
          {currentFollowUp.inputType === 'select' && 
           currentFollowUp.quickOptions && (
            <div className="quick-options">
              {currentFollowUp.quickOptions.map((option: QuickOption, index: number) => (
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
          {(currentFollowUp.uiType === 'checkbox-group' || 
            currentFollowUp.inputType === 'multi-select') && currentFollowUp.quickOptions && (
            <div className="multi-select-container">
              <div className="quick-options multi-select">
                {currentFollowUp.quickOptions.map((option: QuickOption, index: number) => (
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
          {(currentFollowUp.currentStep === 'DATES' ||
            currentFollowUp.inputType === 'date-range' ||
            currentFollowUp.uiType === 'calendar' ||
            currentFollowUp.progressPercentage === 33 ||
            (currentFollowUp.primaryQuestion &&
             (currentFollowUp.primaryQuestion.includes('언제') ||
              currentFollowUp.primaryQuestion.includes('날짜') ||
              currentFollowUp.primaryQuestion.includes('기간') ||
              currentFollowUp.primaryQuestion.includes('일정') ||
              currentFollowUp.primaryQuestion.includes('예정')))) && (
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
          {currentFollowUp.exampleAnswers && currentFollowUp.exampleAnswers.length > 0 && (
            <div className="example-answers">
              <span className="example-label">예시:</span>
              {currentFollowUp.exampleAnswers.map((example, index) => (
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
          {currentFollowUp.canSkip && currentFollowUp.progressPercentage >= 70 && (
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
      )}

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
