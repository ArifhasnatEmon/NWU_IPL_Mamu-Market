import React, { useState } from 'react';
import { useSupportTickets, useMessages } from '../../hooks/useSupport';
import { SupportTicket, TicketReply, Message } from '../../types';

const CATEGORIES: Record<string, string> = {
  order: 'Order Issue',
  payment: 'Payment / Refund',
  account: 'Account Problem',
  product: 'Product Query',
  vendor: 'Vendor / Store Issue',
  other: 'Other',
};

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-amber-100 text-amber-700',
  'in-progress': 'bg-blue-100 text-blue-700',
  resolved: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-gray-100 text-gray-500',
};

const STATUS_OPTIONS = ['open', 'in-progress', 'resolved', 'closed'];

const SupportTicketsPanel: React.FC<{ setToast: (msg: string) => void }> = ({ setToast }) => {
  const { tickets: rawTickets, isLoading: isLoadingTickets, updateTicketStatus, replyToTicket } = useSupportTickets();
  const { messages: rawMessages, isLoading: isLoadingMessages } = useMessages();
  const isLoading = isLoadingTickets || isLoadingMessages;
  const [filter, setFilter] = useState<'all' | 'open' | 'in-progress' | 'resolved' | 'closed'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'vendor_inquiry'>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [selectedChat, setSelectedChat] = useState<any | null>(null);
  const [replyText, setReplyText] = useState('');

  // Sort tickets
  const tickets = [...rawTickets].reverse();

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    const success = await updateTicketStatus(ticketId, newStatus);
    if (success) {
      if (selected?.id === ticketId) setSelected((prev) => prev ? ({ ...prev, status: newStatus as SupportTicket['status'] }) : prev);
      setToast(`Ticket status updated to "${newStatus}"`);
    } else {
      setToast('Failed to update ticket status.');
    }
  };

  const handleReply = async (ticketId: string) => {
    if (!replyText.trim()) return;
    const success = await replyToTicket(ticketId, replyText.trim(), 'admin');
    if (success) {
      const updatedTicket = {
        ...selected,
        replies: [...(selected.replies || []), { from: 'admin', text: replyText.trim(), at: new Date().toISOString() }],
        status: selected.status === 'open' ? 'in-progress' : selected.status
      };
      setSelected(updatedTicket);
      setReplyText('');
      setToast('Reply sent.');
    } else {
      setToast('Failed to send reply.');
    }
  };

  const ticketsByType = tickets.filter(t => typeFilter === 'all' ? t.category !== 'vendor_inquiry' : t.category === 'vendor_inquiry');

  const monitoredChats = React.useMemo(() => {
    const chats: Record<string, { id: string, participants: string[], participantNames: string[], messages: Message[] }> = {};
    rawMessages.forEach((m) => {
      const participants = [m.senderId, m.receiverId].sort();
      const threadId = participants.join('_');
      if (!chats[threadId]) {
        chats[threadId] = {
          id: threadId,
          participants,
          participantNames: [m.senderName, m.receiverName],
          messages: []
        };
      }
      chats[threadId].messages.push(m);
    });
    return Object.values(chats).sort((a: any, b: any) => {
      const dateA = a.messages[a.messages.length - 1]?.date;
      const dateB = b.messages[b.messages.length - 1]?.date;
      return new Date(dateB || 0).getTime() - new Date(dateA || 0).getTime();
    });
  }, [rawMessages]);

  const filtered = ticketsByType.filter(t => {
    const matchFilter = filter === 'all' || t.status === filter;
    const matchSearch = !search ||
      t.subject?.toLowerCase().includes(search.toLowerCase()) ||
      t.userEmail?.toLowerCase().includes(search.toLowerCase()) ||
      t.id?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const counts = {
    all: ticketsByType.length,
    open: ticketsByType.filter(t => t.status === 'open').length,
    'in-progress': ticketsByType.filter(t => t.status === 'in-progress').length,
    resolved: ticketsByType.filter(t => t.status === 'resolved').length,
    closed: ticketsByType.filter(t => t.status === 'closed').length,
  };

  if (isLoading) return <div className="p-8 text-center text-gray-500 font-bold">Loading support tickets...</div>;

  if (selected) {
    return (
      <div>
        <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-brand-600 hover:opacity-80 mb-6 font-black text-sm">
          <i className="fas fa-arrow-left"></i> Back to Tickets
        </button>

        <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-4">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black text-gray-300 uppercase">{selected.id}</span>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${STATUS_COLORS[selected.status] || STATUS_COLORS.open}`}>{selected.status}</span>
                <span className="text-[10px] font-bold text-gray-300">{CATEGORIES[selected.category] || selected.category}</span>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">User Role</p>
                  <p className="text-sm font-bold text-gray-900 capitalize">{(selected as any).userRole || 'Customer'}</p>
                </div>
              </div>
              <h2 className="font-black text-gray-900 text-lg">{selected.subject}</h2>
              <p className="text-xs text-gray-400 font-medium mt-1">
                {selected.userName} · {selected.userEmail} · {selected.userRole} · {new Date(selected.createdAt).toLocaleString('en-GB')}
              </p>
              {selected.orderId && (
                <p className="text-xs font-bold text-brand-600 mt-1">Order: {selected.orderId}</p>
              )}
            </div>
            <select
              value={selected.status}
              onChange={e => handleStatusChange(selected.id, e.target.value)}
              className="text-xs font-black bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 outline-none focus:border-brand-400 shrink-0"
            >
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace('-', ' ')}</option>
              ))}
            </select>
          </div>

          <div className="bg-gray-50 rounded-2xl p-4 mb-6">
            <p className="text-sm text-gray-600 font-medium leading-relaxed">{selected.message}</p>
          </div>

          {/* Replies */}
          {selected.replies?.length > 0 && (
            <div className="space-y-3 mb-6">
              {selected.replies.map((r: TicketReply, i: number) => (
                <div key={i} className={`flex gap-3 ${r.from === 'admin' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-black ${r.from === 'admin' ? 'gradient-primary text-white' : 'bg-gray-100 text-gray-500'}`}>
                    {r.from === 'admin' ? 'A' : 'U'}
                  </div>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${r.from === 'admin' ? 'bg-brand-50 text-brand-900' : 'bg-gray-100 text-gray-700'}`}>
                    <p className="text-sm font-medium">{r.text}</p>
                    <p className="text-[10px] text-gray-400 font-medium mt-1">{new Date(r.at).toLocaleString('en-GB')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Reply box */}
          <div className="border-t border-gray-100 pt-4">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 block">Reply to User</label>
            <textarea
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder="Type your response..."
              rows={3}
              className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-5 py-4 outline-none focus:border-brand-400 focus:bg-white transition-all font-semibold text-sm resize-none mb-3"
            />
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleReply(selected.id)}
                disabled={!replyText.trim()}
                className="px-6 py-3 gradient-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:opacity-90 disabled:opacity-40 transition-all"
              >
                <i className="fas fa-paper-plane mr-2"></i>Send Reply
              </button>
              <button
                onClick={() => handleStatusChange(selected.id, 'resolved')}
                className="px-6 py-3 bg-emerald-50 text-emerald-600 rounded-2xl font-black text-sm hover:bg-emerald-100 transition-all"
              >
                <i className="fas fa-check mr-2"></i>Mark Resolved
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (selectedChat) {
    return (
      <div>
        <button onClick={() => setSelectedChat(null)} className="flex items-center gap-2 text-brand-600 hover:opacity-80 mb-6 font-black text-sm">
          <i className="fas fa-arrow-left"></i> Back to Chats
        </button>

        <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-4 flex flex-col h-[600px]">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Monitored P2P Chat</p>
              <h2 className="font-black text-gray-900 text-lg">
                {selectedChat.participantNames.filter(Boolean).join(' & ')}
              </h2>
            </div>
            <span className="bg-brand-100 text-brand-700 text-[10px] font-black uppercase px-3 py-1 rounded-full">Monitored</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {selectedChat.messages.map((msg: any, index: number) => {
              const isFirstUser = msg.senderId === selectedChat.participants[0];
              const prevMsg = index > 0 ? selectedChat.messages[index - 1] : null;
              
              let showWarningSeparator = false;
              if (prevMsg) {
                const timeDiff = new Date(msg.date || msg.timestamp || 0).getTime() - new Date(prevMsg.date || prevMsg.timestamp || 0).getTime();
                if (timeDiff > 86400000) showWarningSeparator = true;
              }

              return (
                <React.Fragment key={msg.id || index}>
                  {showWarningSeparator && (
                    <div className="flex justify-center my-6">
                      <div className="bg-gray-100 text-gray-500 text-[11px] font-bold px-4 py-2 rounded-2xl flex items-center gap-2 text-center border border-gray-200">
                        <i className="fas fa-history text-brand-500"></i>
                        <span>Conversation resumed after a period of inactivity</span>
                      </div>
                    </div>
                  )}
                  <div className={`flex ${isFirstUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] px-4 py-3 rounded-2xl text-sm font-medium shadow-sm ${isFirstUser ? 'bg-brand-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-900 rounded-bl-sm border border-gray-200'}`}>
                      <p className={`text-[10px] font-black mb-1 ${isFirstUser ? 'text-brand-200' : 'text-gray-500'}`}>{msg.senderName}</p>
                      <p>{msg.text}</p>
                      <p className={`text-[10px] mt-1 ${isFirstUser ? 'text-right text-brand-200' : 'text-left text-gray-400'}`}>
                        {new Date(msg.date || msg.timestamp || 0).toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                      </p>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(['all', 'open', 'in-progress', 'resolved', 'closed'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl font-black text-xs capitalize transition-all border-2 ${filter === f ? 'bg-brand-600 text-white border-brand-600' : 'bg-gray-50 text-gray-500 border-gray-100 hover:border-brand-300'}`}
          >
            {f.replace('-', ' ')}
            {counts[f] > 0 && (
              <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[9px] ${filter === f ? 'bg-white/20' : 'bg-gray-200'}`}>{counts[f]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex gap-2 p-1 bg-gray-100 rounded-xl w-fit">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-black transition-all ${typeFilter === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Support Tickets
            </button>
            <button
              onClick={() => setTypeFilter('vendor_inquiry')}
              className={`px-4 py-2 rounded-lg text-sm font-black transition-all ${typeFilter === 'vendor_inquiry' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Monitored Chats
            </button>
          </div>
          <div className="flex-1 relative">
            <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={`Search ${typeFilter === 'vendor_inquiry' ? 'chats' : 'tickets'} by subject, user, or ID...`}
              className="w-full pl-10 pr-4 py-3 bg-white border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-brand-500 text-sm font-medium"
            />
          </div>
        </div>
      </div>

      {/* Tickets/Chats list */}
      {typeFilter === 'vendor_inquiry' ? (
        monitoredChats.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-inbox text-gray-300 text-2xl"></i>
            </div>
            <p className="font-black text-gray-400">No monitored chats found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {monitoredChats.map(chat => (
              <div
                key={chat.id}
                onClick={() => setSelectedChat(chat)}
                className="bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-md hover:border-brand-100 transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-gray-900 text-sm truncate mb-1">
                      {chat.participantNames.filter(Boolean).join(' & ')}
                    </p>
                    <p className="text-xs text-gray-500 font-medium truncate">
                      {chat.messages[chat.messages.length - 1]?.text}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-gray-400 font-black tracking-widest uppercase">
                      {chat.messages.length} messages
                    </span>
                    <p className="text-[10px] text-gray-400 font-medium mt-1">
                      {new Date(chat.messages[chat.messages.length - 1]?.date || 0).toLocaleDateString('en-GB')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-inbox text-gray-300 text-2xl"></i>
          </div>
          <p className="font-black text-gray-400">No tickets found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(ticket => (
            <div
              key={ticket.id}
              onClick={() => { setSelected(ticket); setReplyText(''); }}
              className="bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-md hover:border-brand-100 transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-[10px] font-black text-gray-300 uppercase">{ticket.id}</span>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${STATUS_COLORS[ticket.status] || STATUS_COLORS.open}`}>{ticket.status}</span>
                    <span className="text-[10px] font-bold text-gray-300">{CATEGORIES[ticket.category] || ticket.category}</span>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${ticket.userRole === 'vendor' ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}>{ticket.userRole}</span>
                  </div>
                  <h4 className="font-bold text-gray-900 text-sm mb-1">{ticket.subject}</h4>
                  <p className="text-xs text-gray-500 font-medium line-clamp-2">{(ticket as any).message || ticket.description}</p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  {ticket.replies?.length > 0 && (
                    <span className="text-[10px] font-black text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
                      <i className="fas fa-reply mr-1"></i>{ticket.replies.length}
                    </span>
                  )}
                  <i className="fas fa-chevron-right text-gray-200 text-xs"></i>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SupportTicketsPanel;
