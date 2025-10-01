import axios from 'axios';
import authService from './authService';
import { API_BASE_URL } from '../config/api';

const followUpAxios = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true
});

followUpAxios.interceptors.request.use((config) => {
  const token = authService.getAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface FollowUpResponse {
  sessionId: string;
  threadId?: string;
  questionType: 'follow_up' | 'clarification' | 'complete';
  question: string;
  helpText?: string;
  quickOptions?: Array<{
    value: string;
    label: string;
    description?: string;
    icon?: string;
  }>;
  exampleAnswers?: string[];
  inputType?: 'text' | 'select' | 'multi-select' | 'date-range' | 'confirm';
  uiType?: string; // UI type hint from backend (calendar, checkbox-group, etc.)
  currentStep?: string;
  phase?: string; // Phase 정보 추가
  progressPercentage: number;
  remainingQuestions?: number;
  collectedInfo?: Record<string, any>;
  canGeneratePlan?: boolean;
  isComplete: boolean;
  message?: string;
  dedupeKey?: string; // For duplicate request prevention
}

class FollowUpService {
  private pendingRequests = new Map<string, Promise<FollowUpResponse>>();
  
  /**
   * Start follow-up question flow
   */
  async startFollowUp(initialMessage: string, userId?: number, requestId?: string): Promise<FollowUpResponse> {
    // Get user ID from auth service if not provided
    const effectiveUserId = userId ?? authService.getCurrentUserId();
    // Generate requestId if not provided
    const reqId = requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Check if we have a pending request with the same ID
    if (this.pendingRequests.has(reqId)) {
      console.log(`Duplicate request prevented: ${reqId}`);
      return this.pendingRequests.get(reqId)!;
    }
    
    try {
      const requestPromise = followUpAxios.post('/api/chat/follow-up/start', {
        message: initialMessage,
        userId: effectiveUserId,
        dedupeKey: reqId // Send requestId to backend for additional duplicate prevention
      }).then(response => {
        this.pendingRequests.delete(reqId); // Clean up after completion
        return normalizeFollowUpResponse(response.data);
      });
      
      this.pendingRequests.set(reqId, requestPromise);
      return await requestPromise;
    } catch (error) {
      this.pendingRequests.delete(reqId); // Clean up on error
      console.error('Error starting follow-up:', error);
      throw error;
    }
  }

  /**
   * Respond to follow-up question
   */
  async respondToFollowUp(sessionId: string, response: string, userId?: number): Promise<FollowUpResponse> {
    // Get user ID from auth service if not provided
    const effectiveUserId = userId ?? authService.getCurrentUserId();
    try {
      const result = await followUpAxios.post('/api/chat/follow-up/respond', {
        sessionId,
        response,
        userId: effectiveUserId
      });
      return normalizeFollowUpResponse(result.data);
    } catch (error) {
      console.error('Error responding to follow-up:', error);
      throw error;
    }
  }

  /**
   * Get current session status
   */
  async getSessionStatus(sessionId: string): Promise<FollowUpResponse> {
    try {
      const response = await followUpAxios.get(`/api/chat/follow-up/status/${sessionId}`);
      return normalizeFollowUpResponse(response.data);
    } catch (error) {
      console.error('Error getting session status:', error);
      throw error;
    }
  }

  /**
   * Generate travel plan from collected info
   */
  async generateTravelPlan(sessionId: string): Promise<any> {
    try {
      const response = await followUpAxios.post('/api/chat/follow-up/generate-plan', {
        sessionId
      });
      return response.data;
    } catch (error) {
      console.error('Error generating travel plan:', error);
      throw error;
    }
  }
}

export const followUpService = new FollowUpService();

function normalizeFollowUpResponse(raw: any): FollowUpResponse {
  if (!raw) {
    throw new Error('Invalid follow-up response payload');
  }

  const sessionId = raw.sessionId || raw.threadId;
  if (!sessionId) {
    throw new Error('Follow-up response is missing sessionId');
  }

  return {
    sessionId,
    threadId: raw.threadId || sessionId,
    questionType: (raw.questionType || 'follow_up') as FollowUpResponse['questionType'],
    question: raw.question || raw.message || '',
    helpText: raw.helpText,
    quickOptions: raw.quickOptions || [],
    exampleAnswers: raw.exampleAnswers || [],
    inputType: raw.inputType,
    uiType: raw.uiType,
    currentStep: raw.currentStep,
    progressPercentage: raw.progressPercentage ?? 0,
    remainingQuestions: raw.remainingQuestions ?? 0,
    collectedInfo: raw.collectedInfo,
    canGeneratePlan: raw.canGeneratePlan ?? false,
    isComplete: raw.isComplete ?? false,
    message: raw.message || raw.question,
    dedupeKey: raw.dedupeKey
  };
}
