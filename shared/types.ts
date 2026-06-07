// ============================================
// PreserveLink — Shared TypeScript Types
// ============================================

export interface User {
  id: string;
  fullName: string;
  email: string;
  workingPlace: string;
  rphNumber: string;
  role: 'user' | 'admin' | 'true_admin';
  verificationStatus: 'pending' | 'verified' | 'rejected';
  apcFileUrl?: string;
  rememberMe?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
  workingPlace: string;
  rphNumber: string;
  agreedToTerms: boolean;
}

export interface TwoFactorRequest {
  email: string;
  code: string;
}

export interface CatalogueMedicine {
  id: string;
  genericName: string;
  category: string;
  strength: string;
  brandName: string;
  manufacturer: string;
  activeIngredient: string;
  mktAvailable: boolean;
  mktDetails?: string;
  stabilityData: StabilityEntry[];
  generalInfo: string;
  specificInfo: string;
  contributorName: string;
  salespersonEmail?: string;
  contactNumber?: string;
  createdAt: string;
}

export interface StabilityEntry {
  temperatureMin: number;
  temperatureMax: number;
  durationHours: number;
  verdict: 'safe' | 'short_shelf_life' | 'discard';
  shelfLife?: string;
  notes?: string;
}

export interface SearchQuery {
  medicineName: string;
  category?: string;
  temperature: number;
  duration: number;
  durationUnit: 'hours' | 'minutes';
}

export interface SearchResult {
  medicine: CatalogueMedicine;
  matchedStability: StabilityEntry | null;
  verdict: 'safe' | 'short_shelf_life' | 'discard';
  verdictMessage: string;
  verdictColor: 'green' | 'yellow' | 'red';
}

export interface Contribution {
  id: string;
  userId: string;
  contributorName: string;
  genericName: string;
  strength: string;
  brandName: string;
  manufacturer: string;
  category: string;
  mktAvailable: boolean;
  mktDetails?: string;
  stabilityStatements: StabilityStatement[];
  attachmentUrls: string[];
  status: 'pending' | 'approved' | 'rejected' | 'awaiting_reply';
  adminComment?: string;
  userResponse?: string;
  userResponseAttachment?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StabilityStatement {
  manufacturer: string;
  drugName: string;
  temperature: number;
  duration: number;
  durationUnit: 'hours' | 'minutes';
  stabilityPeriod: number;
  stabilityUnit: 'months' | 'weeks' | 'days' | 'hours';
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  link?: string;
  createdAt: string;
}

export interface CMSConfig {
  global: {
    siteName: string;
    tagline: string;
    logoUrl: string;
    colors: {
      primary: string;
      secondary: string;
      accent: string;
      background: string;
      safe: string;
      warning: string;
      critical: string;
    };
    contactInfo: string;
  };
  pages: Record<string, CMSPage>;
}

export interface CMSPage {
  title: string;
  blocks: CMSBlock[];
}

export interface CMSBlock {
  id: string;
  type: 'text' | 'image' | 'form' | 'hero' | 'table' | 'spacer';
  content: Record<string, any>;
  order: number;
  visible: boolean;
}

export interface AnalyticsEvent {
  id: string;
  eventType: 'page_view' | 'search' | 'login' | 'register' | 'contribution' | 'admin_action';
  userId?: string;
  metadata: Record<string, any>;
  timestamp: string;
}
