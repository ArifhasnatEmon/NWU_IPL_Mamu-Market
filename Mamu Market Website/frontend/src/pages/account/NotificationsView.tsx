import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../hooks/useNotifications';

const NotificationsView: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { notifications: notifs, markRead, markAllRead, clearAll } = useNotifications(user?.id);
  const unreadCount = notifs.filter(n => !n.read).length;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 font-bold">Please sign in to view notifications.</p>
      </div>
    );
  }

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);
    if (days > 0) return `${days}d ago`;
    if (hrs > 0) return `${hrs}h ago`;
    if (mins > 0) return `${mins}m ago`;
    return 'Just now';
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="min-h-screen pt-36 pb-20 px-4 bg-[#F5F5F8]">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Notifications</h1>
            {unreadCount > 0 && <p className="text-xs font-bold text-brand-600 mt-1">{unreadCount} unread</p>}
          </div>
          <div className="flex gap-3">
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="px-4 py-2 bg-brand-50 text-brand-600 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-brand-100 transition-all">
                Mark All Read
              </button>
            )}
            {notifs.length > 0 && (
              <button onClick={clearAll} className="px-4 py-2 bg-gray-100 text-gray-500 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all">
                Clear All
              </button>
            )}
          </div>
        </div>

        {notifs.length === 0 ? (
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-16 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <i className="fas fa-bell text-gray-300 text-2xl"></i>
            </div>
            <p className="font-black text-gray-400 text-lg">No notifications yet</p>
            <p className="text-sm text-gray-300 font-medium mt-2">You'll see alerts here when admin takes action on your requests.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifs.map((n: any) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => markRead(n.id)}
                className={`bg-white rounded-[1.5rem] border p-5 flex gap-4 items-start cursor-pointer transition-all hover:shadow-md ${!n.read ? 'border-brand-200 bg-brand-50/30' : 'border-gray-100'}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${!n.read ? 'gradient-primary' : 'bg-gray-100'}`}>
                  <i className={`fas fa-bell text-sm ${!n.read ? 'text-white' : 'text-gray-400'}`}></i>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`font-black text-sm ${!n.read ? 'text-gray-900' : 'text-gray-600'}`}>{n.title}</p>
                    {!n.read && <span className="w-2 h-2 bg-brand-500 rounded-full shrink-0 mt-1.5"></span>}
                  </div>
                  <p className="text-xs text-gray-500 font-medium mt-1 leading-relaxed">{n.message}</p>
                  <p className="text-[10px] text-gray-300 font-bold mt-2">{getTimeAgo(n.createdAt)}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default NotificationsView;
