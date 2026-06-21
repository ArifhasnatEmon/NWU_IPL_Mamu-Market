export interface Review {
  id: string;
  userId?: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  date: string;
  productId?: string;
  productName?: string;
  productImage?: string;
  vendorReply?: string;
  vendorReplyDate?: string;
}

export interface ColorVariant {
  name: string;
  value: string;
  image: string;
  images?: string[];
}

export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice: number;
  rating: number;
  reviewsCount: number;
  reviews: Review[];
  image: string;
  images?: string[];
  category: string;
  categoryId: string;
  subcategory?: string;
  vendor: string;
  vendorId: string;
  isNew: boolean;
  isSale: boolean;
  dealType?: 'none' | 'flash' | 'daily' | 'weekly' | 'monthly';
  inStock: boolean;
  stockStatus?: 'in_stock' | 'out_of_stock' | 'discontinued';
  description: string;
  colors?: ColorVariant[];
  keywords?: string[];
  specifications?: { label: string, value: string }[];
  vendorName?: string;
  status?: string;
  approvedAt?: string;
  units?: number;
  stock?: number;
  mainImage?: string;
  productName?: string;
  extraImage1?: string;
  extraImage2?: string;
  extraImage3?: string;
  rejectReason?: string;
  quantity?: number;
  shortDescription?: string;
  shippingReturnPolicy?: string;
}

export interface ProductFormData {
  productName: string;
  category: string;
  subCategory: string;
  price: string;
  originalPrice: string;
  units: string;
  description: string;
  shortDescription?: string;
  shippingReturnPolicy?: string;
  mainImage: string;
  extraImage1: string;
  extraImage2: string;
  extraImage3: string;
  color1name: string; color1image: string; color1hex: string;
  color2name: string; color2image: string; color2hex: string;
  color3name: string; color3image: string; color3hex: string;
  color4name: string; color4image: string; color4hex: string;
  dealType: 'none' | 'flash' | 'weekly' | 'monthly';
  stockStatus: 'in_stock' | 'out_of_stock' | 'discontinued';
  [key: string]: string;
}

