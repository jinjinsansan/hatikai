// API service for connecting to backend

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

// Generic fetch wrapper with auth
async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }

  return response.json();
}

// Tier APIs
export const tierAPI = {
  // Get all tiers
  getTiers: () => fetchAPI('/tiers'),

  // Get current user's tier
  getMyTier: () => fetchAPI('/tiers/my-tier'),

  // Initial tier assignment (roulette)
  assignInitialTier: () => fetchAPI('/tiers/assign', { method: 'POST' }),

  // Get tier distribution
  getTierDistribution: () => fetchAPI('/tiers/distribution'),
};

// Roulette APIs
export const rouletteAPI = {
  // Preview roulette probabilities
  preview: () => fetchAPI('/roulette/preview'),

  // Run initial roulette
  runInitial: () => fetchAPI('/roulette/initial', { method: 'POST' }),
};

// Obligation APIs
export const obligationAPI = {
  // Get my obligations
  getMyObligations: () => fetchAPI('/obligations/my'),

  // Complete an obligation
  complete: (id: string) =>
    fetchAPI(`/obligations/${id}/complete`, { method: 'POST' }),

  // Get obligation summary
  getSummary: () => fetchAPI('/obligations/summary'),
};

// User APIs
export const userAPI = {
  // Get current user profile
  getProfile: () => fetchAPI('/me/profile'),

  // Get user history
  getHistory: () => fetchAPI('/me/history'),

  // Get user floor status
  getFloorStatus: () => fetchAPI('/me/floor'),
};

// Types
export interface Tier {
  id: number;
  name: string;
  displayName: string;
  obligations: {
    purchases?: number;
    adViews?: number;
    period: 'day' | 'week' | 'month';
  };
  perks?: {
    featured?: boolean;
    boost?: string;
    auto?: string;
  };
}

export interface UserTier {
  userId: string;
  tierId: number;
  tier: Tier;
  assignedAt: string;
  lastRouletteAt: string;
  daysInTier: number;
  totalPoints: number;
}

export interface Obligation {
  id: string;
  type: 'purchase' | 'ad_view';
  status: 'pending' | 'completed' | 'expired';
  dueDate: string;
  completedAt?: string;
  metadata?: any;
}

export interface RoulettePreview {
  currentTier: Tier;
  probabilities: {
    tierId: number;
    tierName: string;
    probability: number;
    modifier: number;
    finalProbability: number;
  }[];
}