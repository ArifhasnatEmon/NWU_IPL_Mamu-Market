export interface OrderItem {
  productId: string;
  productName: string;
  name?: string;
  price: number;
  quantity: number;
  image: string;
  vendorId: string;
  vendorName: string;
}

export interface VendorStatus {
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  updatedAt: string;
}

export interface CancelRequest {
  status: 'pending' | 'approved_by_admin' | 'approved' | 'rejected';
  reason: string;
  requestedAt: string;
}

export interface Order {
  id: string;
  parentOrderId?: string;
  vendorId?: string;
  userId: string;
  userName?: string;
  items: OrderItem[];
  total: number;
  subtotal?: number;
  deliveryFee?: number;
  paymentMethod?: string;
  paymentStatus?: 'unpaid' | 'paid' | 'failed' | 'refunded' | string;
  address?: string;
  shippingAddress?: string;
  status: string;
  vendorStatuses?: Record<string, VendorStatus | string>;
  cancelRequest?: CancelRequest | string;
  cancelReason?: string;
  promoCode?: string;
  discount?: number;
  date?: string;
  createdAt: string;
}
