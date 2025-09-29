import axios from 'axios';
import { API_BASE_URL } from '../config/api';

// Types based on requirements document
export interface Trip {
  id: number;
  userId: number;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget?: number;
  tripStyle?: 'LEISURE' | 'ADVENTURE' | 'CULTURAL' | 'BUSINESS';
  status: 'PLANNING' | 'CONFIRMED' | 'ONGOING' | 'COMPLETED';
  createdAt: string;
  updatedAt: string;
  details?: TripDetail[];
}

export interface TripDetail {
  day: number;
  date: string;
  activities: Activity[];
}

export interface Activity {
  time: string;
  title: string;
  location: string;
  description?: string;
  cost?: number;
  category: 'ACCOMMODATION' | 'FOOD' | 'ATTRACTION' | 'TRANSPORT' | 'ACTIVITY';
}

export interface UserPreference {
  userId: number;
  travelStyle: string[];
  budgetLevel: 'BUDGET' | 'STANDARD' | 'LUXURY';
  interests: string[];
  dietaryRestrictions?: string[];
  mobilityConsiderations?: string[];
}

export interface CreateTripRequest {
  userId: number;
  destination: string;
  startDate: string;
  endDate: string;
  numberOfTravelers: number;
  budget?: number;
  tripStyle?: string;
  preferences?: string[];
}

class TripService {
  /**
   * REQ-TRIP-001: 여행 계획 생성 API
   * Status: ✅ IMPLEMENTED in backend
   */
  async createTrip(request: CreateTripRequest): Promise<Trip> {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/trips`, request);
      return response.data;
    } catch (error) {
      console.error('Error creating trip:', error);
      
      // MOCK FALLBACK for testing
      console.warn('[MOCK FALLBACK] createTrip - Using mock data due to error');
      const mockTrip: Trip = {
        id: Date.now(),
        userId: request.userId,
        title: `${request.destination} 여행`,
        destination: request.destination,
        startDate: request.startDate,
        endDate: request.endDate,
        budget: request.budget,
        status: 'PLANNING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      return mockTrip;
    }
  }

  /**
   * REQ-TRIP-002: 여행 계획 조회 API
   * Status: ✅ IMPLEMENTED in backend
   */
  async getTripById(tripId: number): Promise<Trip> {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/trips/${tripId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching trip:', error);
      throw error;
    }
  }

  /**
   * REQ-TRIP-003: 내 여행 목록 조회
   * Status: ✅ IMPLEMENTED in backend
   */
  async getTripsByUserId(userId: number, page: number = 0, size: number = 10): Promise<Trip[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/trips`, {
        params: { userId, page, size }
      });
      return response.data.content || response.data;
    } catch (error) {
      console.error('Error fetching trips:', error);
      
      // MOCK FALLBACK for testing
      console.warn('[MOCK FALLBACK] getTripsByUserId - Using mock data due to error');
      const mockTrips: Trip[] = [
        {
          id: 1,
          userId: userId,
          title: '제주도 3박 4일',
          destination: '제주도',
          startDate: '2024-02-15',
          endDate: '2024-02-18',
          budget: 1500000,
          tripStyle: 'LEISURE',
          status: 'PLANNING',
          createdAt: '2024-01-15T09:00:00Z',
          updatedAt: '2024-01-15T10:30:00Z'
        },
        {
          id: 2,
          userId: userId,
          title: '도쿄 벚꽃 여행',
          destination: '도쿄',
          startDate: '2024-04-01',
          endDate: '2024-04-05',
          budget: 2000000,
          tripStyle: 'CULTURAL',
          status: 'PLANNING',
          createdAt: '2024-01-10T14:00:00Z',
          updatedAt: '2024-01-10T14:00:00Z'
        }
      ];
      return mockTrips;
    }
  }

  /**
   * REQ-TRIP-004: 여행 계획 수정 API
   * Status: ❌ NOT IMPLEMENTED in backend
   * Using MOCK DATA
   */
  async updateTrip(tripId: number, updates: Partial<Trip>): Promise<Trip> {
    // TODO: Replace with real API when backend implements PUT /api/trips/{id}
    console.warn('[MOCK DATA] updateTrip - Backend API not implemented');
    
    // MOCK IMPLEMENTATION
    const mockUpdatedTrip: Trip = {
      id: tripId,
      userId: updates.userId || 1,
      title: updates.title || 'Updated Trip',
      destination: updates.destination || 'Unknown',
      startDate: updates.startDate || new Date().toISOString(),
      endDate: updates.endDate || new Date().toISOString(),
      budget: updates.budget,
      tripStyle: updates.tripStyle,
      status: updates.status || 'PLANNING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockUpdatedTrip;
  }

  /**
   * REQ-PREF-001: 여행 스타일 설정
   * Status: ❌ NOT IMPLEMENTED in backend
   * Using MOCK DATA
   */
  async setTravelStyle(userId: number, styles: string[]): Promise<void> {
    // TODO: Replace with real API when backend implements preference APIs
    console.warn('[MOCK DATA] setTravelStyle - Backend API not implemented');
    
    // MOCK IMPLEMENTATION
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log(`[MOCK] Travel styles set for user ${userId}:`, styles);
  }

  /**
   * REQ-PREF-003: 선호도 조회 API
   * Status: ❌ NOT IMPLEMENTED in backend
   * Using MOCK DATA
   */
  async getUserPreferences(userId: number): Promise<UserPreference> {
    // TODO: Replace with real API when backend implements GET /api/users/preferences
    console.warn('[MOCK DATA] getUserPreferences - Backend API not implemented');
    
    // MOCK IMPLEMENTATION
    const mockPreferences: UserPreference = {
      userId: userId,
      travelStyle: ['휴양', '관광'],
      budgetLevel: 'STANDARD',
      interests: ['음식', '자연', '문화'],
      dietaryRestrictions: [],
      mobilityConsiderations: []
    };
    
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockPreferences;
  }

  /**
   * REQ-PREF-004: 선호도 업데이트 API
   * Status: ❌ NOT IMPLEMENTED in backend
   * Using MOCK DATA
   */
  async updateUserPreferences(userId: number, preferences: Partial<UserPreference>): Promise<UserPreference> {
    // TODO: Replace with real API when backend implements PUT /api/users/preferences
    console.warn('[MOCK DATA] updateUserPreferences - Backend API not implemented');
    
    // MOCK IMPLEMENTATION
    const mockUpdatedPreferences: UserPreference = {
      userId: userId,
      travelStyle: preferences.travelStyle || ['휴양'],
      budgetLevel: preferences.budgetLevel || 'STANDARD',
      interests: preferences.interests || ['음식'],
      dietaryRestrictions: preferences.dietaryRestrictions,
      mobilityConsiderations: preferences.mobilityConsiderations
    };
    
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockUpdatedPreferences;
  }

  /**
   * REQ-AI-003: 기본 일정 템플릿
   * Status: ❌ NOT IMPLEMENTED in backend
   * Using MOCK DATA
   */
  async getTemplates(duration: '당일치기' | '1박2일' | '2박3일' | '3박4일'): Promise<TripDetail[]> {
    // TODO: Replace with real API when backend implements template APIs
    console.warn('[MOCK DATA] getTemplates - Backend API not implemented');
    
    // MOCK IMPLEMENTATION
    const templates: Record<string, TripDetail[]> = {
      '당일치기': [
        {
          day: 1,
          date: new Date().toISOString().split('T')[0],
          activities: [
            { time: '09:00', title: '출발', location: '서울', category: 'TRANSPORT' },
            { time: '12:00', title: '점심', location: '현지 맛집', category: 'FOOD', cost: 20000 },
            { time: '14:00', title: '관광지 방문', location: '주요 명소', category: 'ATTRACTION', cost: 10000 },
            { time: '18:00', title: '저녁', location: '현지 레스토랑', category: 'FOOD', cost: 30000 },
            { time: '20:00', title: '귀가', location: '서울', category: 'TRANSPORT' }
          ]
        }
      ],
      '1박2일': [
        {
          day: 1,
          date: new Date().toISOString().split('T')[0],
          activities: [
            { time: '10:00', title: '출발', location: '서울', category: 'TRANSPORT' },
            { time: '12:00', title: '점심', location: '현지 맛집', category: 'FOOD', cost: 20000 },
            { time: '14:00', title: '숙소 체크인', location: '호텔', category: 'ACCOMMODATION', cost: 100000 },
            { time: '15:00', title: '관광', location: '명소 1', category: 'ATTRACTION', cost: 10000 },
            { time: '19:00', title: '저녁', location: '레스토랑', category: 'FOOD', cost: 40000 }
          ]
        },
        {
          day: 2,
          date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
          activities: [
            { time: '09:00', title: '조식', location: '호텔', category: 'FOOD' },
            { time: '10:00', title: '체크아웃', location: '호텔', category: 'ACCOMMODATION' },
            { time: '11:00', title: '관광', location: '명소 2', category: 'ATTRACTION', cost: 15000 },
            { time: '13:00', title: '점심', location: '맛집', category: 'FOOD', cost: 25000 },
            { time: '15:00', title: '귀가', location: '서울', category: 'TRANSPORT' }
          ]
        }
      ]
    };
    
    await new Promise(resolve => setTimeout(resolve, 500));
    return templates[duration] || templates['당일치기'];
  }
}

export default new TripService();
