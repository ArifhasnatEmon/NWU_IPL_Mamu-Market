import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import PageTitle from '../../components/PageTitle';
import { useMessages } from '../../hooks/useSupport';
import { Conversation } from '../../types';
import { useApp } from '../../context/AppContext';
import { compressImageFile, validateFileSize } from '../../utils/fileHelpers';
import { uploadImage } from '../../utils/imageUpload';

const MessagesView: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { messages: rawMessages, isLoading, sendMessage, markAsRead, fetchMessages } = useMessages();

  // Realtime disabled — no backend
  useEffect(() => {
    // no-op
  }, [user?.id]);
  const { setToast } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) { navigate('/user-login'); return; }
  }, [user, navigate]);

  useEffect(() => {
    if (messagesEndRef.current) {
      const chatArea = messagesEndRef.current.closest('.overflow-y-auto');
      if (chatArea) {
        chatArea.scrollTop = chatArea.scrollHeight;
      }
    }
  }, [activeConv]);

  useEffect(() => {
    if (!user || isLoading) return;
    
    // Group messages
    const convMap: Record<string, any> = {};
    rawMessages.forEach((m: any) => {
      const isMine = m.senderId === user.id;
      const otherId = isMine ? m.receiverId : m.senderId;
      if (!otherId) return; // Guard
      
      const otherName = isMine ? m.receiverName : m.senderName;
      const otherAvatar = isMine ? m.receiverAvatar : m.senderAvatar;
      
      if (!convMap[otherId]) {
        convMap[otherId] = { otherId, otherName, otherAvatar, messages: [], unread: 0 };
      }
      convMap[otherId].messages.push(m);
      if (!m.read && !isMine) convMap[otherId].unread++;
    });

    Object.values(convMap).forEach((c: any) => {
      c.messages.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
      c.lastMessage = c.messages[c.messages.length - 1];
    });

    const sorted = Object.values(convMap).sort((a: any, b: any) =>
      new Date(b.lastMessage?.date || 0).getTime() - new Date(a.lastMessage?.date || 0).getTime()
    );
    
    setConversations(sorted);
    
    if (sorted.length > 0 && !activeConv) {
      setActiveConv(sorted[0]);
    } else if (activeConv) {
      // Update active
      const updatedConv = sorted.find(c => c.otherId === activeConv.otherId);
      if (updatedConv) setActiveConv(updatedConv);
    }
  }, [rawMessages, user, isLoading]);

  const handleSend = async () => {
    if ((!newMessage.trim() && !attachmentFile) || !activeConv || !user || isUploading) return;
    
    setIsUploading(true);
    let attachmentUrl = undefined;

    if (attachmentFile) {
      const validation = validateFileSize(attachmentFile);
      if (!validation.valid) {
        setToast(validation.error || 'File too large');
        setIsUploading(false);
        return;
      }

      try {
        const compressedBase64 = await compressImageFile(attachmentFile);
        attachmentUrl = await uploadImage(compressedBase64, 'store-assets', `msg_${Date.now()}_${attachmentFile.name}`);
      } catch (err) {
        setToast('Failed to upload attachment');
        setIsUploading(false);
        return;
      }
    }

    const msgData = {
      senderId: user.id,
      senderName: user.name || user.storeName || 'User',
      senderRole: user.role || 'customer',
      senderAvatar: user.avatar || '',
      receiverId: activeConv.otherId,
      receiverName: activeConv.otherName,
      receiverAvatar: activeConv.otherAvatar || '',
      text: newMessage.trim(),
      attachment: attachmentUrl
    };
    
    const success = await sendMessage(msgData);
    if (success) {
      setNewMessage('');
      setAttachmentFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => {
        if (messagesEndRef.current) {
          const chatArea = messagesEndRef.current.closest('.overflow-y-auto');
          if (chatArea) chatArea.scrollTop = chatArea.scrollHeight;
        }
      }, 100);
    } else {
      setToast('Failed to send message');
    }
    setIsUploading(false);
  };

  const handleMarkRead = async (conv: any) => {
    setActiveConv(conv);
    if (conv.unread > 0) {
      await markAsRead(conv.otherId);
    }
  };

  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString();
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <PageTitle title="Messages" />
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-black text-gray-900 tracking-tighter mb-8">Messages</h1>
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden" style={{ height: '70vh' }}>
          <div className="flex h-full">
            {/* Conversations List */}
            <div className="w-80 border-r border-gray-100 flex flex-col">
              <div className="p-4 border-b border-gray-100">
                <p className="font-black text-gray-500 text-xs uppercase tracking-widest">Conversations</p>
              </div>
              <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                  <div className="p-8 text-center text-gray-500 font-bold">Loading...</div>
                ) : conversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8">
                    <i className="fas fa-comment-slash text-4xl text-gray-200 mb-4"></i>
                    <p className="text-gray-400 font-bold text-sm">No messages yet</p>
                  </div>
                ) : (
                  conversations.map((conv: any) => (
                    <button key={conv.otherId} onClick={() => handleMarkRead(conv)}
                      className={`w-full text-left px-4 py-4 hover:bg-gray-50 transition-all border-b border-gray-50 ${activeConv?.otherId === conv.otherId ? 'bg-brand-50 border-l-4 border-l-brand-500' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        {conv.otherAvatar ? (
                          <img src={conv.otherAvatar || 'https://via.placeholder.com/150?text=User'} referrerPolicy="no-referrer" className="w-10 h-10 rounded-xl object-cover" alt={conv.otherName} />
                        ) : (
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-sm" style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}>
                            {(conv.otherName || 'U').charAt(0).toUpperCase()}
                          </div>
                        )}
                        {conv.unread > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-brand-600 text-white text-[9px] font-black rounded-full flex items-center justify-center">{conv.unread}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-gray-900 text-sm truncate">{conv.otherName}</p>
                        <p className="text-xs text-gray-400 font-medium truncate">{conv.lastMessage?.text}</p>
                      </div>
                      <span className="text-[10px] text-gray-400 font-medium shrink-0">{formatTime(conv.lastMessage?.date)}</span>
                    </div>
                  </button>
                  ))
                )}
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
              {!activeConv ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                  <i className="fas fa-comments text-5xl text-gray-200 mb-4"></i>
                  <p className="text-gray-400 font-bold">Select a conversation</p>
                </div>
              ) : (
                <>
                  {/* Chat Header */}
                  <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                    {activeConv.otherAvatar ? (
                      <img src={activeConv.otherAvatar || 'https://via.placeholder.com/150?text=User'} referrerPolicy="no-referrer" className="w-10 h-10 rounded-xl object-cover" alt={activeConv.otherName} />
                    ) : (
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-sm" style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}>
                        {(activeConv.otherName || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-black text-gray-900">{activeConv.otherName}</p>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* Security Warning at top of conversation */}
                    <div className="flex justify-center my-6">
                      <div className="bg-gray-100 text-gray-500 text-[11px] font-bold px-4 py-2 rounded-2xl flex items-center gap-2 max-w-[80%] text-center border border-gray-200">
                        <i className="fas fa-shield-alt text-brand-500"></i>
                        <span>This conversation is monitored by Mamu Market administrators for your safety. Please do not share sensitive financial information.</span>
                      </div>
                    </div>

                    {activeConv.messages?.map((msg: any, index: number) => {
                      const isMine = msg.senderId === user?.id;
                      const prevMsg = index > 0 ? activeConv.messages[index - 1] : null;
                      
                      // Show warning if it's been more than 24 hours since the last message
                      let showWarningSeparator = false;
                      if (prevMsg) {
                        const timeDiff = new Date(msg.date).getTime() - new Date(prevMsg.date).getTime();
                        if (timeDiff > 86400000) {
                          showWarningSeparator = true;
                        }
                      }

                      return (
                        <React.Fragment key={msg.id || index}>
                          {showWarningSeparator && (
                            <div className="flex justify-center my-8">
                              <div className="bg-gray-100 text-gray-500 text-[11px] font-bold px-4 py-2 rounded-2xl flex items-center gap-2 max-w-[80%] text-center border border-gray-200">
                                <i className="fas fa-lock text-brand-500"></i>
                                <span>Conversation resumed. All messages remain secured and monitored by administration.</span>
                              </div>
                            </div>
                          )}
                          <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[70%] px-4 py-3 rounded-2xl text-sm font-medium shadow-sm ${isMine ? 'bg-brand-600 text-white rounded-br-sm' : 'bg-white text-gray-900 rounded-bl-sm border border-gray-100'}`}>
                              <p>{msg.text}</p>
                              {msg.attachment && (
                                <div className="mt-2">
                                  {msg.attachment.match(/\.(jpeg|jpg|gif|png|webp)$/i) || msg.attachment.startsWith('http') ? (
                                    <a href={msg.attachment} target="_blank" rel="noreferrer">
                                      <img src={msg.attachment} alt="attachment" className="max-w-full rounded-lg max-h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity" />
                                    </a>
                                  ) : (
                                    <a href={msg.attachment} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-black/5 p-2 rounded-lg hover:bg-black/10 transition-colors">
                                      <i className="fas fa-file-download"></i>
                                      <span className="underline text-xs">Download Attachment</span>
                                    </a>
                                  )}
                                </div>
                              )}
                              <p className={`text-[10px] mt-1 text-right ${isMine ? 'text-brand-200' : 'text-gray-400'}`}>{formatTime(msg.date)}</p>
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input */}
                  {attachmentFile && (
                    <div className="px-6 pt-4 flex items-center gap-3 bg-white">
                      <div className="bg-gray-100 px-3 py-2 rounded-xl flex items-center gap-2 text-sm text-gray-700 shadow-sm border border-gray-200">
                        <i className={attachmentFile.type.startsWith('image/') ? "fas fa-image text-brand-500" : "fas fa-file-alt text-brand-500"}></i>
                        <span className="truncate max-w-[150px] font-bold">{attachmentFile.name}</span>
                        <button onClick={() => setAttachmentFile(null)} className="text-red-500 hover:text-red-700 ml-2 transition-colors">
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="px-6 py-4 border-t border-gray-100 flex gap-3 items-center bg-white">
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*,.pdf,.doc,.docx"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setAttachmentFile(e.target.files[0]);
                        }
                      }} 
                    />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-10 h-10 shrink-0 text-gray-400 hover:text-brand-600 bg-gray-50 hover:bg-brand-50 rounded-2xl flex items-center justify-center transition-all"
                      title="Attach Image or Document"
                    >
                      <i className="fas fa-paperclip text-lg"></i>
                    </button>
                    <input
                      type="text"
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSend()}
                      placeholder="Type a message..."
                      className="flex-1 bg-gray-50 rounded-2xl px-5 py-3 outline-none font-bold text-sm border-none focus:ring-2 focus:ring-brand-400"
                    />
                    <button onClick={handleSend} disabled={(!newMessage.trim() && !attachmentFile) || isUploading}
                      className="w-12 h-12 shrink-0 bg-brand-600 text-white rounded-2xl flex items-center justify-center hover:bg-brand-700 transition-all disabled:opacity-40 shadow-md">
                      {isUploading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-paper-plane text-sm"></i>}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessagesView;
