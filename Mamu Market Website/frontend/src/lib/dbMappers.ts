import { Product, Order, Review } from '../types';
import type { Database } from '../types/supabase';

import { getCategoryName } from '../config';

export function mapProduct(row: Partial<Database['public']['Tables']['products']['Row']> & Record<string, any>): Product {
  const price = row.price ? parseFloat(String(row.price)) : 0;
  const originalPrice = row.original_price ? parseFloat(String(row.original_price)) : price;
  const categoryRaw = row.category || '';
  const categoryId = row.category_id || categoryRaw.toLowerCase().replace(/\s+/g, '-') || 'general';
  
  // Calculate isNew if not explicitly set — 7-day window from approval/creation
  let isNew = row.is_new;
  if (isNew === undefined) {
    const referenceDate = row.approved_at || row.created_at;
    if (referenceDate) {
      const daysSince = (Date.now() - new Date(referenceDate).getTime()) / (1000 * 60 * 60 * 24);
      isNew = daysSince <= 2;
    } else {
      isNew = false;
    }
  }

  // Calculate inStock based on units if not explicitly set
  let inStock = row.in_stock;
  if (inStock === undefined) {
    inStock = (parseFloat(String(row.units)) || 0) > 0;
  }

  return {
    id: row.id || '',
    name: row.name || '',
    productName: row.name || '',
    price,
    originalPrice,
    rating: row.rating ? parseFloat(String(row.rating)) : 0,
    reviewsCount: row.reviews_count || 0,
    reviews: [],
    image: row.image || `https://picsum.photos/seed/${row.id}/400/400`,
    images: row.images || [],
    category: getCategoryName(categoryId) || categoryRaw || 'General',
    categoryId,
    subcategory: row.subcategory || '',
    vendor: row.vendor_name || row.vendor || 'Unknown Vendor',
    vendorId: row.vendor_id || '',
    vendorName: row.vendor_name || '',
    isNew: isNew ?? false,
    isSale: row.is_sale ?? false,
    dealType: (row.deal_type as Product['dealType']) || 'none',
    inStock: inStock ?? false,
    stockStatus: (row.stock_status as Product['stockStatus']) || (inStock ? 'in_stock' : 'out_of_stock'),
    description: row.description || '',
    colors: (row.colors as unknown as any[]) || [],
    keywords: (row.keywords as unknown as any[]) || [],
    specifications: (row.specifications as unknown as any[]) || [],
    status: row.status || 'pending',
    approvedAt: row.approved_at || '',
    units: row.units || 0,
    stock: row.stock || 0,
    mainImage: row.main_image || '',
    extraImage1: row.extra_image_1 || '',
    extraImage2: row.extra_image_2 || '',
    extraImage3: row.extra_image_3 || '',
    rejectReason: row.reject_reason || '',
    shortDescription: row.short_description || '',
    shippingReturnPolicy: row.shipping_return_policy || '',
  };
}


export function mapOrder(row: Partial<Database['public']['Tables']['orders']['Row']> & Record<string, any>): Order {
  return {
    id: row.id || '',
    parentOrderId: row.parent_order_id || '',
    vendorId: row.vendor_id || '',
    userId: row.user_id || '',
    userName: row.user_name || '',
    items: (row.items as unknown as any[]) || [],
    total: parseFloat(String(row.total)) || 0,
    subtotal: row.subtotal ? parseFloat(String(row.subtotal)) : undefined,
    deliveryFee: row.delivery_fee ? parseFloat(String(row.delivery_fee)) : undefined,
    paymentMethod: row.payment_method || '',
    paymentStatus: row.payment_status || 'unpaid',
    address: row.address || '',
    shippingAddress: row.shipping_address || '',
    status: row.status || 'pending',
    vendorStatuses: (row.vendor_statuses as any) || {},
    cancelRequest: (row.cancel_request as any) || undefined,
    cancelReason: row.cancel_reason || '',
    promoCode: row.promo_code || '',
    discount: row.discount ? parseFloat(String(row.discount)) : 0,
    date: row.date || '',
    createdAt: row.created_at || '',
  };
}


export function mapReview(row: Record<string, any>): Review {
  return {
    id: row.id,
    userId: row.user_id || '',
    userName: row.user_name || '',
    userAvatar: row.user_avatar || '',
    rating: row.rating || 0,
    comment: row.comment || '',
    date: row.created_at || row.date || '',
    productId: row.product_id || '',
    productName: row.product_name || '',
    productImage: row.product_image || '',
    vendorReply: row.vendor_reply || undefined,
    vendorReplyDate: row.vendor_reply_date || undefined,
  };
}





export function mapTicket(row: Record<string, any>) {
  return {
    id: row.id,
    userId: row.user_id || '',
    userName: row.user_name || '',
    userEmail: row.user_email || '',
    userRole: row.user_role || '',
    subject: row.subject || '',
    category: row.category || '',
    priority: row.priority || 'normal',
    status: row.status || 'open',
    description: row.description || '',
    message: row.message || '',
    orderId: row.order_id || '',
    replies: row.replies || [],
    createdAt: row.created_at || '',
  };
}


export function mapVendorRequest(row: Record<string, any>) {
  return {
    id: row.id,
    vendor_id: row.vendor_id || '',
    vendor_name: row.vendor_name || '',
    request_type: row.request_type || '',
    current_value: row.current_value || '',
    requested_value: row.requested_value || '',
    reason: row.reason || '',
    status: row.status || 'pending',
    created_at: row.created_at || '',
    updated_at: row.updated_at || '',
  };
}


export function mapReportedReview(row: Record<string, any>) {
  return {
    id: row.id,
    reviewId: row.review_id || '',
    productId: row.product_id || '',
    reviewerName: row.reviewer_name || '',
    reviewText: row.review_text || '',
    reportReason: row.report_reason || '',
    date: row.created_at || '',
  };
}


export function mapReportedProduct(row: Record<string, any>) {
  return {
    id: row.id,
    productId: row.product_id || '',
    productName: row.product_name || '',
    reporterName: row.reporter_name || '',
    reason: row.reason || '',
    date: row.created_at || '',
  };
}
