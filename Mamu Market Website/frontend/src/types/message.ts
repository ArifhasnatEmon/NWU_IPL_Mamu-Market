export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  senderAvatar?: string;
  receiverId: string;
  receiverName: string;
  receiverAvatar?: string;
  text: string;
  read?: boolean;
  date: string;
  timestamp?: string;
  attachment?: string;
}

export interface Conversation {
  otherId: string;
  otherName: string;
  otherAvatar?: string;
  messages: Message[];
  unread: number;
  lastMessage?: Message;
  orderId?: string;
  participantIds?: string[];
}
