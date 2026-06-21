import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSupportTickets } from '../../hooks/useSupport';
import { useGlobalSettings } from '../../hooks/useMarketing';
import { SupportTicket } from '../../types';
import PageTitle from '../../components/PageTitle';
import { compressImageFile, validateFileSize } from '../../utils/fileHelpers';
import { uploadImage } from '../../utils/imageUpload';

const DEFAULT_VENDOR_CATEGORIES = [
  { value: 'payout', label: 'Payout Issue', icon: 'fa-money-bill-wave' },
  { value: 'verification', label: 'Store Verification', icon: 'fa-id-badge' },
  { value: 'technical', label: 'Technical Bug', icon: 'fa-bug' },
  { value: 'policy', label: 'Policy Question', icon: 'fa-file-contract' },
  { value: 'other', label: 'Other', icon: 'fa-ellipsis-h' },
];

const VendorSupportView: React.FC = () => {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const user = authUser || {} as any;
  
  const { tickets: rawTickets, isLoading, createTicket, replyToTicket } = useSupportTickets();
  // Only show tickets created by this vendor role
  const myTickets = rawTickets.filter(t => t.userRole === 'vendor');

  const { setting: vendorCatSetting } = useGlobalSettings('vendor_ticket_categories');
  const VENDOR_CATEGORIES = vendorCatSetting?.categories?.length > 0 ? vendorCatSetting.categories : DEFAULT_VENDOR_CATEGORIES;

  const [category, setCategory] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'new' | 'my'>('new');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  
  const [ticketAttachment, setTicketAttachment] = useState<File | null>(null);
  const [replyAttachment, setReplyAttachment] = useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const replyFileInputRef = React.useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    if (!category) { setError('Please select a category.'); return; }
    if (!subject.trim()) { setError('Please enter a subject.'); return; }
    if (message.trim().length < 20 && !ticketAttachment) { setError('Message must be at least 20 characters or include an attachment.'); return; }
    if (!user?.id) { navigate('/vendor-login'); return; }

    setIsSubmitting(true);
    let attachmentUrl = undefined;
    if (ticketAttachment) {
      const validation = validateFileSize(ticketAttachment);
      if (!validation.valid) { setError(validation.error || 'File too large'); setIsSubmitting(false); return; }
      try {
        const compressedBase64 = await compressImageFile(ticketAttachment);
        attachmentUrl = await uploadImage(compressedBase64, 'store-assets', `tkt_${Date.now()}_${ticketAttachment.name}`);
      } catch (err) { setError('Failed to upload attachment'); setIsSubmitting(false); return; }
    }

    const ticket = {
      id: 'V-TKT-' + Date.now(),
      userId: user.id,
      userName: user.storeName || user.name || 'Vendor',
      userEmail: user.email,
      userRole: 'vendor' as const,
      category,
      subject: subject.trim(),
      message: message.trim() + (referenceId.trim() ? `\n\nReference: ${referenceId.trim()}` : ''),
      status: 'open' as const,
      priority: 'high',
      createdAt: new Date().toISOString(),
      replies: [],
      attachment: attachmentUrl
    };

    const success = await createTicket(ticket);
    setIsSubmitting(false);
    
    if (success) {
      setSubmitted(true);
      setCategory(''); setSubject(''); setMessage(''); setReferenceId(''); setError('');
      setTicketAttachment(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } else {
      setError('Failed to submit ticket. Please try again later.');
    }
  };

  const handleReply = async () => {
    if ((!replyText.trim() && !replyAttachment) || !selectedTicket || isReplying) return;
    setIsReplying(true);
    
    let attachmentUrl = undefined;
    if (replyAttachment) {
      const validation = validateFileSize(replyAttachment);
      if (!validation.valid) { /* Silent fail or standard error */ setIsReplying(false); return; }
      try {
        const compressedBase64 = await compressImageFile(replyAttachment);
        attachmentUrl = await uploadImage(compressedBase64, 'store-assets', `tkt_${Date.now()}_${replyAttachment.name}`);
      } catch (err) { setIsReplying(false); return; }
    }

    const success = await replyToTicket(selectedTicket.id, replyText.trim(), 'user', attachmentUrl);
    if (success) {
      setReplyText('');
      setReplyAttachment(null);
      if (replyFileInputRef.current) replyFileInputRef.current.value = '';
      setSelectedTicket(prev => prev ? {
        ...prev,
        replies: [...(prev.replies || []), { from: 'user', text: replyText.trim(), at: new Date().toISOString(), attachment: attachmentUrl }]
      } : null);
    }
    setIsReplying(false);
  };

  const STATUS_COLORS: Record<string, string> = {
    open: 'bg-amber-100 text-amber-700',
    'in-progress': 'bg-blue-100 text-blue-700',
    resolved: 'bg-emerald-100 text-emerald-700',
    closed: 'bg-gray-100 text-gray-500',
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="min-h-screen pb-20 bg-[#F5F5F8]">
      <PageTitle title="Partner Support" />
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-800 pt-16 pb-24 px-4 relative overflow-hidden">
        <div className="absolute top-[-30%] right-[-10%] w-[350px] h-[350px] rounded-full bg-white/5 blur-[60px]" />
        <div className="absolute bottom-[-40%] left-[-5%] w-[300px] h-[300px] rounded-full bg-indigo-400/10 blur-[50px]" />
        <div className="max-w-[860px] mx-auto relative z-10">
          <div className="w-14 h-14 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6 border border-white/20">
            <i className="fas fa-store text-white text-xl"></i>
          </div>
          <h1 className="text-[40px] font-[900] text-white mb-3 leading-tight tracking-tighter">Partner Support</h1>
          <p className="text-white/60 font-medium text-base max-w-lg leading-relaxed">Dedicated support for our sellers. We reply within 12 hours.</p>
        </div>
      </div>

      <div className="max-w-[860px] mx-auto px-4 -mt-14 relative z-20">
        <div className="bg-white rounded-[24px] shadow-[0_2px_32px_rgba(0,0,0,0.10)] overflow-hidden">
          <div className="p-8 pb-0">
            <div className="flex gap-1 bg-gray-100 rounded-2xl p-1 w-fit mb-8">
              {(['new', 'my'] as const).map(t => (
                <button key={t} onClick={() => { setTab(t); setSubmitted(false); }}
                  className={`px-5 py-2.5 rounded-xl font-black text-sm transition-all ${tab === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                  {t === 'new' ? '+ New Request' : `My Requests ${myTickets.length > 0 ? `(${myTickets.length})` : ''}`}
                </button>
              ))}
            </div>
          </div>

          <div className="p-8 pt-0">
            {tab === 'new' && (
              submitted ? (
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
                    <i className="fas fa-check-circle text-emerald-500 text-4xl"></i>
                  </div>
                  <h2 className="text-xl font-black text-gray-900 mb-2">Request Submitted!</h2>
                  <p className="text-gray-400 font-medium text-sm mb-6">Our partner team will get back to you within 12 hours at <span className="text-indigo-600 font-black">{user.email}</span>.</p>
                  <div className="flex gap-3 justify-center">
                    <button onClick={() => setSubmitted(false)} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 transition-all">Submit Another</button>
                    <button onClick={() => setTab('my')} className="px-6 py-3 bg-gray-100 text-gray-600 rounded-2xl font-black text-sm hover:bg-gray-200 transition-all">View Requests</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {!user?.id && (
                    <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                      <i className="fas fa-info-circle text-amber-500"></i>
                      <p className="text-sm font-bold text-amber-700">Please <button onClick={() => navigate('/vendor-login')} className="underline">sign in as a Vendor</button> to submit a ticket.</p>
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-3 block">Category</label>
                    <div className="flex flex-wrap gap-3">
                      {VENDOR_CATEGORIES.map(c => (
                        <button key={c.value} type="button" onClick={() => { setCategory(c.value); setError(''); }}
                          className={`flex items-center gap-2 px-5 py-3 rounded-2xl border-2 text-sm font-black transition-all whitespace-nowrap ${category === c.value ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-indigo-200'}`}>
                          <i className={`fas ${c.icon} text-xs`}></i>
                          <span>{c.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={`grid grid-cols-1 ${category && VENDOR_CATEGORIES.find(c => c.value === category)?.extraField && VENDOR_CATEGORIES.find(c => c.value === category)?.extraField !== 'none' ? 'md:grid-cols-2' : ''} gap-6`}>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 block">Subject</label>
                      <input type="text" value={subject} onChange={e => { setSubject(e.target.value); setError(''); }}
                        placeholder="Brief description of your issue"
                        className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-5 py-4 outline-none focus:border-indigo-400 focus:bg-white transition-all font-semibold text-sm" />
                    </div>

                    {category && VENDOR_CATEGORIES.find(c => c.value === category)?.extraField === 'order' ? (
                      <div className="animate-in fade-in slide-in-from-bottom-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 block">Order ID / Payout Ref <span className="text-gray-300 normal-case font-bold">(optional)</span></label>
                        <input type="text" value={referenceId} onChange={e => setReferenceId(e.target.value)}
                          placeholder="e.g. ORD-123 or PO-456"
                          className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-5 py-4 outline-none focus:border-indigo-400 focus:bg-white transition-all font-semibold text-sm" />
                      </div>
                    ) : category && VENDOR_CATEGORIES.find(c => c.value === category)?.extraField === 'product' ? (
                      <div className="animate-in fade-in slide-in-from-bottom-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 block">Page URL / Product <span className="text-gray-300 normal-case font-bold">(optional)</span></label>
                        <input type="text" value={referenceId} onChange={e => setReferenceId(e.target.value)}
                          placeholder="e.g. /dashboard/inventory"
                          className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-5 py-4 outline-none focus:border-indigo-400 focus:bg-white transition-all font-semibold text-sm" />
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 block">Message</label>
                    <textarea value={message} onChange={e => { setMessage(e.target.value); setError(''); }}
                      placeholder="Please describe your issue in detail..."
                      rows={5} className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-5 py-4 outline-none focus:border-indigo-400 focus:bg-white transition-all font-semibold text-sm resize-none" />
                    <p className="text-xs text-gray-300 font-medium mt-1 ml-1">{message.length} chars (min 20)</p>
                  </div>
                  
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 block">Attachment (Optional)</label>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*,.pdf,.doc,.docx"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setTicketAttachment(e.target.files[0]);
                          setError('');
                        }
                      }} 
                    />
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="px-6 py-3 bg-indigo-50 text-indigo-600 rounded-xl font-black text-xs hover:bg-indigo-100 transition-all flex items-center"
                      >
                        <i className="fas fa-paperclip mr-2"></i> {ticketAttachment ? 'Change File' : 'Attach File'}
                      </button>
                      {ticketAttachment && (
                        <div className="flex items-center gap-2 text-sm font-bold text-gray-700 bg-gray-100 px-4 py-2 rounded-xl">
                          <i className={ticketAttachment.type.startsWith('image/') ? "fas fa-image text-indigo-500" : "fas fa-file-alt text-indigo-500"}></i>
                          <span className="truncate max-w-[150px]">{ticketAttachment.name}</span>
                          <button onClick={() => setTicketAttachment(null)} className="text-red-500 hover:text-red-700 ml-2">
                            <i className="fas fa-times"></i>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {error && <p className="text-red-500 text-xs font-bold flex items-center gap-2"><i className="fas fa-exclamation-circle"></i>{error}</p>}

                  <button disabled={isSubmitting} onClick={handleSubmit} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50">
                    <i className={isSubmitting ? "fas fa-spinner fa-spin mr-2" : "fas fa-paper-plane mr-2"}></i>{isSubmitting ? 'Submitting...' : 'Submit Ticket'}
                  </button>
                </div>
              )
            )}

            {tab === 'my' && (
              <div>
                {!user?.id ? (
                  <div className="text-center py-16">
                    <i className="fas fa-lock text-gray-200 text-4xl mb-4"></i>
                    <p className="font-black text-gray-400 mb-4">Sign in to view your tickets</p>
                    <button onClick={() => navigate('/vendor-login')} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm">Sign In as Vendor</button>
                  </div>
                ) : isLoading ? (
                  <div className="text-center py-16 text-gray-400 font-bold">Loading your tickets...</div>
                ) : myTickets.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <i className="fas fa-inbox text-gray-300 text-2xl"></i>
                    </div>
                    <p className="font-black text-gray-400 mb-2">No tickets yet</p>
                    <p className="text-sm text-gray-300 font-medium">Submit a ticket and our partner team will assist you.</p>
                  </div>
                ) : selectedTicket ? (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <button onClick={() => setSelectedTicket(null)} className="flex items-center gap-2 text-gray-400 hover:text-gray-600 font-bold text-xs mb-6 transition-colors">
                      <i className="fas fa-arrow-left"></i> Back to tickets
                    </button>
                    
                    <div className="bg-gray-50 rounded-2xl p-6 mb-6">
                      <div className="flex items-center justify-between gap-4 mb-4">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${STATUS_COLORS[selectedTicket.status] || STATUS_COLORS.open}`}>{selectedTicket.status}</span>
                        <span className="text-[10px] font-bold text-gray-400">{new Date(selectedTicket.createdAt).toLocaleString('en-GB')}</span>
                      </div>
                      <h3 className="font-black text-gray-900 text-lg mb-2">{selectedTicket.subject}</h3>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">{selectedTicket.message}</p>
                      {selectedTicket.attachment && (
                        <div className="mt-4">
                          {selectedTicket.attachment.match(/\.(jpeg|jpg|gif|png|webp)$/i) || selectedTicket.attachment.startsWith('http') ? (
                            <a href={selectedTicket.attachment} target="_blank" rel="noreferrer">
                              <img src={selectedTicket.attachment} alt="attachment" className="max-w-full rounded-xl max-h-64 object-cover cursor-pointer border border-gray-200 shadow-sm" />
                            </a>
                          ) : (
                            <a href={selectedTicket.attachment} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl hover:bg-indigo-100 transition-colors font-bold text-sm">
                              <i className="fas fa-file-download"></i> Download Attached File
                            </a>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="space-y-4 mb-8">
                      {(selectedTicket.replies || []).map((reply: any, idx: number) => (
                        <div key={idx} className={`flex gap-4 ${reply.from === 'user' ? 'flex-row-reverse' : ''}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${reply.from === 'user' ? 'bg-gray-200 text-gray-600' : 'bg-indigo-100 text-indigo-600'}`}>
                            <i className={`fas ${reply.from === 'user' ? 'fa-store' : 'fa-headset'} text-xs`}></i>
                          </div>
                          <div className={`flex flex-col ${reply.from === 'user' ? 'items-end' : 'items-start'}`}>
                            <div className={`max-w-[85%] rounded-2xl p-4 text-sm ${reply.from === 'user' ? 'bg-gray-900 text-white rounded-tr-none' : 'bg-white border border-gray-100 shadow-sm rounded-tl-none'}`}>
                              <p className="whitespace-pre-wrap">{reply.text}</p>
                              {reply.attachment && (
                                <div className="mt-3">
                                  {reply.attachment.match(/\.(jpeg|jpg|gif|png|webp)$/i) || reply.attachment.startsWith('http') ? (
                                    <a href={reply.attachment} target="_blank" rel="noreferrer">
                                      <img src={reply.attachment} alt="attachment" className="max-w-full rounded-lg max-h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity border border-white/20" />
                                    </a>
                                  ) : (
                                    <a href={reply.attachment} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-black/10 p-2 rounded-lg hover:bg-black/20 transition-colors">
                                      <i className="fas fa-file-download"></i>
                                      <span className="underline text-xs">Download Attachment</span>
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>
                            <span className="text-[9px] font-bold text-gray-400 mt-1 px-1">{new Date(reply.at).toLocaleString('en-GB')}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {['open', 'in-progress'].includes(selectedTicket.status) ? (
                      <div className="relative">
                        {replyAttachment && (
                          <div className="mb-3 flex items-center gap-3">
                            <div className="bg-white px-3 py-2 rounded-xl flex items-center gap-2 text-sm text-gray-700 shadow-sm border border-gray-200">
                              <i className={replyAttachment.type.startsWith('image/') ? "fas fa-image text-indigo-500" : "fas fa-file-alt text-indigo-500"}></i>
                              <span className="truncate max-w-[200px] font-bold">{replyAttachment.name}</span>
                              <button onClick={() => setReplyAttachment(null)} className="text-red-500 hover:text-red-700 ml-2 transition-colors">
                                <i className="fas fa-times"></i>
                              </button>
                            </div>
                          </div>
                        )}
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Type your reply here..."
                          className="w-full bg-white border border-gray-200 rounded-2xl p-4 pr-32 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm resize-none min-h-[100px]"
                        />
                        <div className="absolute bottom-4 right-4 flex items-center gap-2">
                          <input 
                            type="file" 
                            ref={replyFileInputRef} 
                            className="hidden" 
                            accept="image/*,.pdf,.doc,.docx"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                setReplyAttachment(e.target.files[0]);
                              }
                            }} 
                          />
                          <button 
                            onClick={() => replyFileInputRef.current?.click()}
                            className="w-10 h-10 shrink-0 text-gray-400 hover:text-indigo-600 bg-gray-50 hover:bg-indigo-50 rounded-xl flex items-center justify-center transition-all"
                            title="Attach Image or Document"
                          >
                            <i className="fas fa-paperclip text-lg"></i>
                          </button>
                          <button
                            onClick={handleReply}
                            disabled={isReplying || (!replyText.trim() && !replyAttachment)}
                            className="px-6 py-2 h-10 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-all flex items-center"
                          >
                            {isReplying ? <i className="fas fa-spinner fa-spin"></i> : 'Reply'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <p className="text-xs font-bold text-gray-500"><i className="fas fa-lock mr-2"></i>This ticket has been closed.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myTickets.map((ticket: SupportTicket) => (
                      <div key={ticket.id} onClick={() => setSelectedTicket(ticket)} className="border border-gray-100 rounded-2xl p-5 hover:shadow-md cursor-pointer transition-all bg-white hover:border-indigo-200">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-black text-gray-300 uppercase">{ticket.id}</span>
                              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${STATUS_COLORS[ticket.status] || STATUS_COLORS.open}`}>{ticket.status}</span>
                            </div>
                            <p className="font-black text-gray-900 text-sm truncate">{ticket.subject}</p>
                            <p className="text-xs text-gray-400 font-medium mt-1">{VENDOR_CATEGORIES.find(c => c.value === ticket.category)?.label || ticket.category} · {new Date(ticket.createdAt).toLocaleDateString('en-GB')}</p>
                          </div>
                          <i className="fas fa-chevron-right text-gray-200 text-xs mt-1 shrink-0 group-hover:text-indigo-500 transition-colors"></i>
                        </div>
                        {ticket.replies?.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-50">
                            <p className="text-xs font-bold text-indigo-600"><i className="fas fa-reply mr-1"></i>{ticket.replies.length} reply from support</p>
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
            { icon: 'fa-clock', title: 'Priority Queue', desc: 'Fast track for vendors' },
            { icon: 'fa-envelope', title: 'Partner Email', desc: 'partners@mamumarket.com' },
            { icon: 'fa-calendar-check', title: 'Coverage', desc: '24/7 Dedicated Support' },
          ].map((item, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 flex items-center gap-4 shadow-sm border border-gray-50">
              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                <i className={`fas ${item.icon}`}></i>
              </div>
              <div className="min-w-0">
                <p className="font-black text-gray-900 text-sm">{item.title}</p>
                <p className="text-xs text-gray-400 font-medium truncate">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default VendorSupportView;
