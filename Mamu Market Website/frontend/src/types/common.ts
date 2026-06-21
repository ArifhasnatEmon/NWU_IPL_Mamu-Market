// Common types used across the application

import { Message } from './message';

export interface TimerState {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

export interface SearchSuggestion {
  label: string;
  type: 'category' | 'brand' | 'keyword';
}



export interface UserAddress {
  id: string;
  label: string;
  text?: string;
  address?: string;
  isDefault?: boolean;
}

export interface Conversation {
  otherId: string;
  otherName: string;
  otherAvatar: string;
  messages: Message[];
  unread: number;
  lastMessage?: Message;
}

export interface VendorRegistrationData {
  storeName?: string;
  storeCategory?: string;
  storeCity?: string;
  phone?: string;
  address?: string;
}

export interface ImageCropState {
  src: string | ArrayBuffer | null;
  crop: { unit: string; width: number; height: number; x: number; y: number };
}

export interface FlashDealPin {
  id: string;
  pinnedAt: string;
}

export interface MonthlyAnalytics {
  month: string;
  sales: number;
}

export interface Announcement {
  id: string;
  message: string;
  subMessage?: string;
  icon?: string;
  badge?: string;
  ctaText?: string;
  ctaLink?: string;
  active: boolean;
  expiresAt?: string;
  createdAt?: string;
}
