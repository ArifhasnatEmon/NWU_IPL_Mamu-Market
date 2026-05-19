export interface Notification {
  id: string;
  userId?: string;
  orderId?: string;
  title?: string;
  message: string;
  type?: 'order' | 'approval' | 'marketing' | 'system' | 'message' | 'cancel_approved' | 'cancel_rejected';
  link?: string;
  read: boolean;
  date?: string;
  createdAt?: string;
}
