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
