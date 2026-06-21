export interface TicketReply {
  id?: string;
  senderId?: string;
  senderName?: string;
  senderRole?: string;
  text: string;
  timestamp?: string;
  from?: string;
  at?: string;
  attachment?: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole?: string;
  subject: string;
  category: string;
  priority: string;
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  description: string;
  message?: string;
  orderId?: string;
  replies: TicketReply[];
  createdAt: string;
  attachment?: string;
}
