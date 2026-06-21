export interface User {
  id: string;
  name: string;
  email: string;
  role: 'customer' | 'vendor' | 'admin';
  avatar?: string;
  password?: string;
  status?: string;
  nickname?: string;
  address?: string;
  phone?: string;
  storeName?: string;
  storeDescription?: string;
  banner?: string;
  nidTradeLicense?: string;
  verified?: boolean;
  storeCategory?: string;
  storeCity?: string;
  socialFacebook?: string;
  socialInstagram?: string;
  socialYoutube?: string;
  socialWhatsapp?: string;
  promotion_enabled?: boolean;
  suspendReason?: string;
  addresses?: Address[];
  emailChangedAt?: string | null;
  loginAt?: number;
}

export interface Vendor {
  id: string;
  name: string;
  storeName?: string;
  avatar?: string;
  logo: string;
  banner?: string;
  category: string;
  rating: number;
  productsCount: number;
  verified: boolean;
  joinedDate: string;
  description: string;
  storeCity?: string;
  socialFacebook?: string;
  socialInstagram?: string;
  socialYoutube?: string;
  socialWhatsapp?: string;
  status?: string;
  phone?: string;
}

export interface Address {
  id: string;
  userId: string;
  label?: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  isDefault?: boolean;
}

export interface VendorRequest {
  id: string;
  vendor_id: string;
  vendor_name: string;
  request_type: 'store_name' | 'city_change' | 'category_add' | 'category_suggest' | 'category_remove' | 'verification' | 'email_change' | 'account_delete' | 'product_remove';
  current_value?: string;
  requested_value?: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at?: string;
}

export interface ProductUpdate {
  id: string;
  product_id: string;
  vendor_id: string;
  changes: Record<string, unknown>;
  status: 'pending' | 'approved' | 'rejected';
  productId?: string;
  vendorId?: string;
  date?: string;
  reason?: string;
}

export interface ReportedReview {
  id: string;
  reviewId: string;
  productId: string;
  reviewerName: string;
  reviewText: string;
  reportReason?: string;
  date: string;
}

export interface ReportedProduct {
  id: string;
  productId: string;
  productName: string;
  reporterName: string;
  reason: string;
  date: string;
}
