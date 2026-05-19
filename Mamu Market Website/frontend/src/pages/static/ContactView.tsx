import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSupportTickets } from '../../hooks/useSupport';
import { SupportTicket } from '../../types';

const CATEGORIES = [
  { value: 'order', label: 'Order Issue', icon: 'fa-box' },
  { value: 'payment', label: 'Payment / Refund', icon: 'fa-mobile-alt' },
  { value: 'account', label: 'Account Problem', icon: 'fa-user-circle' },
  { value: 'product', label: 'Product Query', icon: 'fa-tag' },
  { value: 'vendor', label: 'Vendor / Store Issue', icon: 'fa-store' },
  { value: 'other', label: 'Other', icon: 'fa-ellipsis-h' },
];

const ContactView: React.FC = () => {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const user = authUser || {} as any;
  
  const { tickets: myTickets, isLoading, createTicket } = useSupportTickets();
  const [category, setCategory] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [orderId, setOrderId] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'new' | 'my'>('new');

  // State Management

  const handleSubmit = async () => {
    if (!category) { setError('Please select a category.'); return; }
    if (!subject.trim()) { setError('Please enter a subject.'); return; }
    if (message.trim().length < 20) { setError('Message must be at least 20 characters.'); return; }
    if (!user?.id) { navigate('/user-login'); return; }

    const ticket = {
      id: 'TKT-' + Date.now(),
      userId: user.id,
      userName: user.name || user.storeName || 'User',
      userEmail: user.email,
      userRole: user.role || 'customer',
      category,
      subject: subject.trim(),
      message: message.trim() + (orderId.trim() ? `\n\nOrder ID: ${orderId.trim()}` : ''), // Append Order ID
      status: 'open' as const,
      priority: 'medium',
      createdAt: new Date().toISOString(),
      replies: [],
    };

    const success = await createTicket(ticket);
    if (success) {
      setSubmitted(true);
      setCategory(''); setSubject(''); setMessage(''); setOrderId(''); setError('');
    } else {
      setError('Failed to submit ticket. Please try again later.');
    }
  };

  const STATUS_COLORS: Record<string, string> = {
    open: 'bg-amber-100 text-amber-700',
    'in-progress': 'bg-blue-100 text-blue-700',
    resolved: 'bg-emerald-100 text-emerald-700',
    closed: 'bg-gray-100 text-gray-500',
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="min-h-screen pb-20 bg-[#F5F5F8]">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-brand-700 via-brand-600 to-purple-500 pt-16 pb-24 px-4 relative overflow-hidden">
        <div className="absolute top-[-30%] right-[-10%] w-[350px] h-[350px] rounded-full bg-white/5 blur-[60px]" />
        <div className="absolute bottom-[-40%] left-[-5%] w-[300px] h-[300px] rounded-full bg-purple-400/10 blur-[50px]" />
        <div className="max-w-[860px] mx-auto relative z-10">
          <div className="w-14 h-14 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6 border border-white/20">
            <i className="fas fa-headset text-white text-xl"></i>
          </div>
          <h1 className="text-[40px] font-[900] text-white mb-3 leading-tight tracking-tighter">Contact Us</h1>
          <p className="text-white/60 font-medium text-base max-w-lg leading-relaxed">Submit a ticket — our team replies within 24 hours.</p>
        </div>
      </div>

      <div className="max-w-[860px] mx-auto px-4 -mt-14 relative z-20">

        <div className="bg-white rounded-[24px] shadow-[0_2px_32px_rgba(0,0,0,0.10)] overflow-hidden">

          {/* Header */}
          <div className="p-8 pb-0">

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 rounded-2xl p-1 w-fit mb-8">
              {(['new', 'my'] as const).map(t => (
                <button key={t} onClick={() => { setTab(t); setSubmitted(false); }}
                  className={`px-5 py-2.5 rounded-xl font-black text-sm transition-all ${tab === t ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                  {t === 'new' ? '+ New Ticket' : `My Tickets ${myTickets.length > 0 ? `(${myTickets.length})` : ''}`}
                </button>
              ))}
            </div>
          </div>

          <div className="p-8 pt-0">

            {/* New Ticket Form */}
            {tab === 'new' && (
              submitted ? (
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
                    <i className="fas fa-check-circle text-emerald-500 text-4xl"></i>
                  </div>
                  <h2 className="text-xl font-black text-gray-900 mb-2">Ticket Submitted!</h2>
                  <p className="text-gray-400 font-medium text-sm mb-6">Our support team will get back to you within 24 hours at <span className="text-brand-600 font-black">{user.email}</span>.</p>
                  <div className="flex gap-3 justify-center">
                    <button onClick={() => setSubmitted(false)} className="px-6 py-3 gradient-primary text-white rounded-2xl font-black text-sm">Submit Another</button>
                    <button onClick={() => setTab('my')} className="px-6 py-3 bg-gray-100 text-gray-600 rounded-2xl font-black text-sm hover:bg-gray-200 transition-all">View My Tickets</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-5 max-w-lg">
                  {!user?.id && (
                    <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                      <i className="fas fa-info-circle text-amber-500"></i>
                      <p className="text-sm font-bold text-amber-700">Please <button onClick={() => navigate('/user-login')} className="underline">sign in</button> to submit a ticket and track your requests.</p>
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-3 block">Category</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {CATEGORIES.map(c => (
                        <button key={c.value} type="button" onClick={() => { setCategory(c.value); setError(''); }}
                          className={`flex items-center gap-2 px-4 py-3 rounded-2xl border-2 text-sm font-black transition-all ${category === c.value ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-brand-200'}`}>
                          <i className={`fas ${c.icon} text-xs`}></i>{c.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 block">Subject</label>
                    <input type="text" value={subject} onChange={e => { setSubject(e.target.value); setError(''); }}
                      placeholder="Brief description of your issue"
                      className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-5 py-4 outline-none focus:border-brand-400 focus:bg-white transition-all font-semibold text-sm" />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 block">Order ID <span className="text-gray-300 normal-case font-bold">(optional)</span></label>
                    <input type="text" value={orderId} onChange={e => setOrderId(e.target.value)}
                      placeholder="e.g. ORD-1234567890"
                      className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-5 py-4 outline-none focus:border-brand-400 focus:bg-white transition-all font-semibold text-sm" />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 block">Message</label>
                    <textarea value={message} onChange={e => { setMessage(e.target.value); setError(''); }}
                      placeholder="Please describe your issue in detail..."
                      rows={5} className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-5 py-4 outline-none focus:border-brand-400 focus:bg-white transition-all font-semibold text-sm resize-none" />
                    <p className="text-xs text-gray-300 font-medium mt-1 ml-1">{message.length} chars (min 20)</p>
                  </div>

                  {error && <p className="text-red-500 text-xs font-bold flex items-center gap-2"><i className="fas fa-exclamation-circle"></i>{error}</p>}

                  <button onClick={handleSubmit} className="w-full py-4 gradient-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-brand-500/20">
                    <i className="fas fa-paper-plane mr-2"></i>Submit Ticket
                  </button>
                </div>
              )
            )}

            {/* My Tickets */}
            {tab === 'my' && (
              <div>
                {!user?.id ? (
                  <div className="text-center py-16">
                    <i className="fas fa-lock text-gray-200 text-4xl mb-4"></i>
                    <p className="font-black text-gray-400 mb-4">Sign in to view your tickets</p>
                    <button onClick={() => navigate('/user-login')} className="px-6 py-3 gradient-primary text-white rounded-2xl font-black text-sm">Sign In</button>
                  </div>
                ) : isLoading ? (
                  <div className="text-center py-16 text-gray-400 font-bold">Loading your tickets...</div>
                ) : myTickets.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <i className="fas fa-inbox text-gray-300 text-2xl"></i>
                    </div>
                    <p className="font-black text-gray-400 mb-2">No tickets yet</p>
                    <p className="text-sm text-gray-300 font-medium">Submit a ticket and we'll get back to you soon.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myTickets.map((ticket: SupportTicket) => (
                      <div key={ticket.id} className="border border-gray-100 rounded-2xl p-5 hover:shadow-sm transition-all">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-black text-gray-300 uppercase">{ticket.id}</span>
                              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${STATUS_COLORS[ticket.status] || STATUS_COLORS.open}`}>{ticket.status}</span>
                            </div>
                            <p className="font-black text-gray-900 text-sm truncate">{ticket.subject}</p>
                            <p className="text-xs text-gray-400 font-medium mt-1">{CATEGORIES.find(c => c.value === ticket.category)?.label} · {new Date(ticket.createdAt).toLocaleDateString('en-GB')}</p>
                          </div>
                          <i className="fas fa-chevron-right text-gray-200 text-xs mt-1 shrink-0"></i>
                        </div>
                        {ticket.replies?.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-50">
                            <p className="text-xs font-bold text-brand-600"><i className="fas fa-reply mr-1"></i>{ticket.replies.length} reply from support</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

        {/* Info box */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: 'fa-clock', title: 'Response Time', desc: 'Within 24 hours' },
            { icon: 'fa-envelope', title: 'Email Support', desc: 'support.mamumarket@gmail.com' },
            { icon: 'fa-calendar-check', title: 'Available', desc: '9 AM – 10 PM, 7 days' },
          ].map((item, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 flex items-center gap-4 shadow-sm border border-gray-50">
              <div className="w-10 h-10 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center shrink-0">
                <i className={`fas ${item.icon}`}></i>
              </div>
              <div>
                <p className="font-black text-gray-900 text-sm">{item.title}</p>
                <p className="text-xs text-gray-400 font-medium">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default ContactView;
