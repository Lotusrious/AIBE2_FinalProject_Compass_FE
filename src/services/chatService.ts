import axios from 'axios';
import authService from './authService';
import { API_BASE_URL } from '../config/api';

// Create a separate axios instance for chat API to avoid auth interceptors
const chatAxios = axios.create({
  baseURL: API_BASE_URL
});

// Types based on requirements document
export interface ChatThread {
  id: string;
  userId: number;
  title: string;
  lastMessage?: string;
  lastMessageAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuickOption {
  value: string;
  label: string;
  description?: string;
  icon?: string;
}

export interface FollowUpQuestion {
  sessionId: string;
  currentStep: string;
  primaryQuestion: string;
  helpText?: string;
  exampleAnswers?: string[];
  quickOptions?: QuickOption[];
  inputType: 'text' | 'select' | 'multi-select' | 'date-range' | 'confirm';
  uiType?: string; // UI type hint from backend (calendar, checkbox-group, etc.)
  isRequired: boolean;
  canSkip: boolean;
  progressPercentage: number;
  remainingQuestions: number;
  collectedInfo?: Record<string, any>;
}

export interface Message {
  id: string;
  threadId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  model?: string;
  type?: string;
  nextAction?: string;
  data?: any;
  phase?: string;
  followUpQuestion?: FollowUpQuestion | null; // Follow-up 질문 정보
  quickForm?: boolean;  // Quick Travel Form 표시 여부
  scenarioForm?: {  // 시나리오용 - 인라인 폼 데이터
    type: 'placeSelection';
    places: any[];
    region: string;
  };
}

export interface CreateThreadRequest {
  userId: number;
  initialMessage?: string;
}

export interface SendMessageRequest {
  message: string;
  model?: 'gemini' | 'openai';
  metadata?: Record<string, any>;
}

class ChatService {
  /**
   * REQ-CHAT-001: 채팅방 생성 API
   * Status: ✅ IMPLEMENTED in backend
   * POST /api/chat/threads
   */
  async createThread(request: CreateThreadRequest): Promise<ChatThread> {
    const accessToken = localStorage.getItem('accessToken');
    const response = await chatAxios.post(`/api/chat/threads`, {
      userId: request.userId,
      initialMessage: request.initialMessage,
      title: request.initialMessage?.substring(0, 50)
    }, {
      headers: {
        ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
      }
    });

    const threadData = response.data;
    return {
      id: threadData.id,
      userId: threadData.userId ?? request.userId,
      title: threadData.title || request.initialMessage?.substring(0, 50) || '새 대화',
      lastMessage: threadData.lastMessage ?? request.initialMessage,
      lastMessageAt: threadData.lastMessageAt,
      createdAt: threadData.createdAt,
      updatedAt: threadData.updatedAt || threadData.createdAt
    };
  }

  /**
   * REQ-CHAT-002: 채팅 목록 조회
   * Status: ✅ IMPLEMENTED in backend
   * GET /api/chat/threads
   */
  async getThreads(userId: number, skip: number = 0, limit: number = 20): Promise<ChatThread[]> {
    try {
      // JWT token in Authorization header will be used by backend to get userId from email
      const accessToken = localStorage.getItem('accessToken');
      console.log('[chatService.getThreads] Getting threads');
      
      const response = await chatAxios.get(
        `/api/chat/threads`,
        {
          params: { skip, limit },
          headers: {
            ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
          }
        }
      );
      
      // Transform backend ThreadDto to frontend ChatThread
      return response.data.map((thread: any) => ({
        id: thread.id,
        userId: userId,
        title: thread.title || '새 대화',
        lastMessage: thread.lastMessage,
        lastMessageAt: thread.lastMessageAt || thread.updatedAt,
        createdAt: thread.createdAt,
        updatedAt: thread.updatedAt
      }));
    } catch (error) {
      console.error('Error fetching threads:', error);
      // Return empty array if API fails
      return [];
    }
  }

  /**
   * REQ-CHAT-003: 메시지 전송 API (Follow-up question 지원 추가)
   * Status: ✅ IMPLEMENTED in backend
   * POST /api/chat/threads/{threadId}/messages
   */
  async sendMessage(threadId: string, request: SendMessageRequest): Promise<Message> {
    try {
      // JWT token in Authorization header will be used by backend to get userId from email
      const accessToken = localStorage.getItem('accessToken');
      
      // Send message to thread
      const response = await chatAxios.post(
        `/api/chat/threads/${threadId}/messages`,
        {
          content: request.message,
          role: 'user',
          metadata: request.metadata
        },
        {
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
          }
        }
      );

      const messages = response.data as any[];
      if (!messages || messages.length === 0) {
        throw new Error('Empty response from chat API');
      }

      const aiRaw = messages[messages.length - 1];
      const followUpQuestion = mapFollowUpQuestion(aiRaw.followUpQuestion, threadId, aiRaw);

      const mapped: Message = {
        id: String(aiRaw.id ?? `msg_${Date.now()}`),
        threadId,
        role: aiRaw.role || 'assistant',
        content: aiRaw.content,
        timestamp: aiRaw.timestamp || aiRaw.createdAt || new Date().toISOString(),
        model: aiRaw.model,
        type: aiRaw.type,
        nextAction: aiRaw.nextAction,
        data: aiRaw.data,
        phase: aiRaw.phase,
        followUpQuestion
      };

      return mapped;
    } catch (error) {
      console.error('Error sending message to thread:', error);
      
      // Fallback to direct Gemini API
      try {
        const geminiResponse = await chatAxios.post(`/api/chat/gemini`, {
          message: request.message
        });
        
        return {
          id: `msg_${Date.now()}`,
          threadId: threadId,
          role: 'assistant',
          content: geminiResponse.data.response,
          timestamp: new Date().toISOString(),
          model: geminiResponse.data.model || 'gemini-2.0-flash'
        };
      } catch (fallbackError) {
        console.error('Fallback to Gemini API also failed:', fallbackError);
        
        // Final MOCK FALLBACK
        const mockResponse: Message = {
          id: `msg_${Date.now()}`,
          threadId: threadId,
          role: 'assistant',
          content: '죄송합니다. 현재 AI 서비스에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.',
          timestamp: new Date().toISOString(),
          model: 'mock'
        };
        
        return mockResponse;
      }
    }
  }

  /**
   * UnifiedChatController를 통한 메시지 전송
   * POST /api/chat/unified
   */
  async sendUnifiedMessage(threadId: string, message: string, userId?: number): Promise<any> {
    // 먼저 실제 백엔드 호출 시도
    try {
      const accessToken = localStorage.getItem('accessToken');
      console.log('[chatService.sendUnifiedMessage] Trying backend API');

      const response = await chatAxios.post(
        `/api/chat/unified`,
        {
          threadId,
          message,
          userId
        },
        {
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
          }
        }
      );

      console.log('[chatService.sendUnifiedMessage] Backend response:', response.data);

      // 백엔드 응답을 그대로 반환 (content, phase 등 포함)
      return response.data;

    } catch (error) {
      console.log('[chatService.sendUnifiedMessage] Backend failed, using enhanced mock data', error);

      // 향상된 Mock 데이터 - 실제 백엔드 동작과 유사하게
      const lowerMessage = message.toLowerCase();

      // 여행 키워드 감지
      const isTravelQuery = lowerMessage.includes('여행') ||
                           lowerMessage.includes('서울') ||
                           lowerMessage.includes('부산') ||
                           lowerMessage.includes('제주') ||
                           lowerMessage.includes('강릉') ||
                           lowerMessage.includes('경주');

      // Phase 관리를 위한 세션 스토리지 사용
      let currentPhase = sessionStorage.getItem(`phase_${threadId}`) || 'PHASE_1';

      if (isTravelQuery && currentPhase === 'PHASE_1') {
        // Phase 1: 의도 파악 및 초기 응답
        sessionStorage.setItem(`phase_${threadId}`, 'PHASE_1_PROCESSING');

        const destination = lowerMessage.includes('서울') ? '서울' :
                          lowerMessage.includes('부산') ? '부산' :
                          lowerMessage.includes('제주') ? '제주' :
                          lowerMessage.includes('강릉') ? '강릉' :
                          lowerMessage.includes('경주') ? '경주' : '서울';

        return {
          response: `안녕하세요! ${destination} 여행을 계획 중이시군요! 🎉\n\n완벽한 여행 일정을 만들어드리기 위해 몇 가지 정보가 필요해요.\n\n먼저 여행 날짜와 인원수를 알려주시겠어요?\n예) 12월 20일부터 3일간, 2명이서 갈 예정이에요`,
          phase: 'PHASE_1',
          intent: 'TRAVEL_PLANNING',
          destination: destination,
          threadId
        };
      }

      // 날짜/인원 정보가 포함된 경우 Phase 2로 전환
      const hasDateInfo = lowerMessage.includes('일') ||
                         lowerMessage.includes('월') ||
                         lowerMessage.includes('주') ||
                         lowerMessage.includes('명') ||
                         lowerMessage.includes('사람');

      if (hasDateInfo && sessionStorage.getItem(`phase_${threadId}`) === 'PHASE_1_PROCESSING') {
        // Phase 2 완료 - 장소 선택 폼 표시
        sessionStorage.setItem(`phase_${threadId}`, 'PHASE_2');

        return {
          response: `좋습니다! 여행 정보를 확인했어요.\n\n이제 방문하고 싶은 장소들을 선택해주세요. 아래에서 관심 있는 장소들을 골라보세요! 🗺️\n\n추천 장소들은 오렌지색 배지로 표시되어 있어요.`,
          phase: 'PHASE_2',
          showPlaceSelection: true,
          threadId
        };
      }

      // Phase 2 상태에서의 일반 메시지
      if (currentPhase === 'PHASE_2') {
        return {
          response: '장소를 선택해주시면 최적의 동선으로 일정을 짜드릴게요! 원하시는 장소들을 선택해주세요.',
          phase: 'PHASE_2',
          showPlaceSelection: true,
          threadId
        };
      }

      // 기본 응답 (Phase 1)
      return {
        response: '무엇을 도와드릴까요? 여행 계획이 필요하시면 "서울 여행 가고 싶어" 같이 말씀해주세요!',
        phase: 'PHASE_1',
        threadId
      };
    }
  }

  private messageCounter: number = 0;

  /**
   * REQ-CHAT-004: 대화 조회 API
   * Status: ✅ IMPLEMENTED in backend
   * GET /api/chat/threads/{threadId}/messages
   */
  async getMessages(threadId: string, limit: number = 50, before?: number): Promise<Message[]> {
    try {
      // JWT token in Authorization header will be used by backend to get userId from email
      const accessToken = localStorage.getItem('accessToken');
      console.log('[chatService.getMessages] Getting messages for thread:', threadId);
      
      const response = await chatAxios.get(
        `/api/chat/threads/${threadId}/messages`,
        {
          params: { limit, before },
          headers: {
            ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
          }
        }
      );
      
      // Transform backend MessageDto to frontend Message
      return response.data.map((msg: any) => {
        console.log('[chatService] Message from backend:', msg);
        return {
          id: String(msg.id ?? `msg_${Date.now()}`),
          threadId,
          role: (msg.role || 'assistant') as Message['role'],
          content: msg.content || '',
          timestamp: msg.createdAt || msg.timestamp || new Date().toISOString(),
          model: msg.model,
          type: msg.type,
          nextAction: msg.nextAction,
          data: msg.data,
          phase: msg.phase,
          followUpQuestion: msg.followUpQuestion
        } as Message;
      });
    } catch (error) {
      console.error('Error fetching messages:', error);
      // Return empty array if API fails
      return [];
    }
  }

  /**
   * REQ-CHAT-005: 채팅 삭제 API
   * Status: ❌ NOT IMPLEMENTED in backend
   * Using MOCK DATA
   */
  async deleteThread(threadId: string): Promise<void> {
    // TODO: Replace with real API when backend implements DELETE /api/chat/threads/{id}
    console.warn('[MOCK DATA] deleteThread - Backend API not implemented');
    
    // MOCK IMPLEMENTATION
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log(`[MOCK] Thread ${threadId} deleted`);
  }

  /**
   * REQ-LLM-002: Gemini 연동
   * Status: ✅ IMPLEMENTED in backend
   */
  async chatWithGemini(message: string): Promise<string> {
    try {
      const response = await chatAxios.post(`/api/chat/gemini`, {
        message: message
      });
      return response.data.response;
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      throw error;
    }
  }

  /**
   * REQ-LLM-003: OpenAI 연동
   * Status: ✅ IMPLEMENTED in backend
   */
  async chatWithOpenAI(message: string): Promise<string> {
    try {
      const response = await chatAxios.post(`/api/chat/openai`, {
        message: message
      });
      return response.data.response;
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      throw error;
    }
  }
}

export default new ChatService();

function mapFollowUpQuestion(raw: any, threadId: string, source: any): FollowUpQuestion | null {
  if (!raw && source?.nextAction !== 'AWAIT_USER_INPUT') {
    return null;
  }

  const base = raw || {};
  const questionText = base.primaryQuestion || base.question || source?.content;

  if (!questionText) {
    return null;
  }

  return {
    sessionId: base.sessionId || base.threadId || threadId,
    currentStep: base.currentStep || source?.phase || 'INFORMATION_COLLECTION',
    primaryQuestion: questionText,
    helpText: base.helpText,
    exampleAnswers: base.exampleAnswers || [],
    quickOptions: base.quickOptions || [],
    inputType: (base.inputType || 'text') as FollowUpQuestion['inputType'],
    uiType: base.uiType,
    isRequired: base.isRequired !== false,
    canSkip: Boolean(base.canSkip || base.canGeneratePlan),
    progressPercentage: base.progressPercentage ?? 0,
    remainingQuestions: base.remainingQuestions ?? 0,
    collectedInfo: base.collectedInfo
  };
}
