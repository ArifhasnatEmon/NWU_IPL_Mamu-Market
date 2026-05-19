export interface PromoCode {
  id: string;
  vendor_id?: string;
  vendor_name?: string;
  code: string;
  discount_type: '%' | 'flat' | 'free_delivery';
  discount_value: number;
  min_order_value?: number;
  max_uses?: number;
  used_count: number;
  is_active: boolean;
  expires_at?: string;
  status?: 'pending' | 'approved' | 'rejected';
  code_type: 'admin' | 'vendor';
  type?: 'admin' | 'vendor';
  note?: string;
  created_at?: string;
  assigned_vendor_id?: string;
  active?: boolean;
  vendorId?: string;
  assignedVendorId?: string;
  appliesTo?: 'products' | 'delivery' | 'both';
  discountType?: '%' | 'flat' | 'free_delivery';
  discount?: number;
  deliveryDiscountType?: 'free' | 'percentage';
  deliveryDiscount?: number;
  minOrder?: number;
  vendorName?: string;
  maxUses?: number;
  usedCount?: number;
  expiresAt?: string;
}

export interface HeroSlide {
  img: string;
  title: string;
  sub: string;
  buttonText?: string;
  buttonLink?: string;
}

export interface BannerSlot {
  message: string;
  subMessage?: string;
  icon?: string;
  badge?: string;
  ctaText?: string;
  ctaLink?: string;
  active: boolean;
  expiresAt?: string;
}

export interface GlobalSetting {
  id: string;
  key: string;
  value: string | number | boolean | null;
  updated_at: string;
}
