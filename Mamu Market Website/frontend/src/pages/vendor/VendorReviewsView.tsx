import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import PageTitle from '../../components/PageTitle';
import { useApp } from '../../context/AppContext';
import { useReviews } from '../../hooks/useReviews';
import { Review } from '../../types';
import { supabase } from '../../lib/supabase';

const VendorReviewsView: React.FC = () => {
  const { user } = useAuth();
  const { setToast } = useApp();
  const { reviews: fetchedReviews, loading } = useReviews({ vendorId: user?.id });
  const [replyModal, setReplyModal] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [reportModal, setReportModal] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');

  // Use actual fetched reviews
  const reviewsToDisplay = fetchedReviews;

  const totalReviews = reviewsToDisplay.length;
  const avgRating = totalReviews > 0 
    ? (reviewsToDisplay.reduce((acc, r) => acc + Number(r.rating), 0) / totalReviews).toFixed(1) 
    : '0.0';
  
  const ratingCounts = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviewsToDisplay.filter(r => Math.round(Number(r.rating)) === star).length,
    percentage: totalReviews > 0 ? (reviewsToDisplay.filter(r => Math.round(Number(r.rating)) === star).length / totalReviews) * 100 : 0
  }));

  const handleReplySubmit = async () => {
    if (!replyText.trim() || !replyModal) return;
    
    const { error } = await supabase
      .from('reviews')
      .update({ 
        vendor_reply: replyText,
        vendor_reply_date: new Date().toISOString()
      })
      .eq('id', replyModal);

    if (error) {
      setToast('Failed to post reply.');
      console.error(error);
      return;
    }

    setToast('Reply posted successfully!');
    setReplyModal(null);
    setReplyText('');
  };

  const handleReportSubmit = () => {
    if (!reportReason) return;
    setToast('Review reported to Admin for review.');
    setReportModal(null);
    setReportReason('');
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };
  return (
    <div className="container mx-auto px-4 py-12 lg:py-20">
      <PageTitle title="Customer Reviews" />
      <div className="max-w-6xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl lg:text-5xl font-black text-gray-900 tracking-tighter mb-4">Customer Reviews</h1>
          <p className="text-xl text-gray-500 font-medium">Manage feedback, reply to customers, and track your product ratings.</p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center text-2xl shadow-inner">
              <i className="fas fa-star"></i>
            </div>
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Average Rating</p>
              <h3 className="text-4xl font-black text-gray-900">{avgRating}</h3>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center text-2xl shadow-inner">
              <i className="fas fa-comment-dots"></i>
            </div>
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Total Reviews</p>
              <h3 className="text-4xl font-black text-gray-900">{totalReviews}</h3>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm flex items-center gap-6">
             <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center text-2xl shadow-inner">
              <i className="fas fa-chart-line"></i>
            </div>
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Positive Rate</p>
              <h3 className="text-4xl font-black text-gray-900">
                {totalReviews > 0 ? Math.round(((ratingCounts[0].count + ratingCounts[1].count) / totalReviews) * 100) : 0}%
              </h3>
            </div>
          </motion.div>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Rating Distribution */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-[3rem] p-8 border border-gray-100 shadow-sm sticky top-24">
              <h3 className="text-xl font-black text-gray-900 mb-8 tracking-tight">Rating Breakdown</h3>
              <div className="space-y-4">
                {ratingCounts.map(item => (
                  <div key={item.star} className="flex items-center gap-4">
                    <span className="w-10 text-sm font-black text-gray-700 flex items-center gap-1">
                      {item.star} <i className="fas fa-star text-amber-400 text-[10px]"></i>
                    </span>
                    <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: item.percentage + '%' }}
                        transition={{ duration: 1, delay: 0.3 }}
                        className="h-full bg-amber-400 rounded-full"
                      />
                    </div>
                    <span className="w-8 text-right text-xs font-bold text-gray-400">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Review List */}
          <div className="lg:col-span-2 space-y-6">
            {reviewsToDisplay.length === 0 ? (
              <div className="bg-white rounded-[2.5rem] p-12 border border-gray-100 shadow-sm text-center">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <i className="fas fa-comment-slash text-3xl text-gray-300"></i>
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-2">No Reviews Yet</h3>
                <p className="text-gray-500 font-medium max-w-sm mx-auto">When customers leave reviews on your products, they will appear here.</p>
              </div>
            ) : (
              reviewsToDisplay.map((review, idx) => (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                key={review.id} 
                className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm group hover:shadow-xl transition-all"
              >
                {/* Product Context */}
                {review.productName && (
                  <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-50">
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                      {review.productImage ? (
                        <img src={review.productImage} alt={review.productName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300"><i className="fas fa-box"></i></div>
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Review on</p>
                      <p className="text-sm font-bold text-gray-900">{review.productName}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-5">
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-100 shrink-0 border-4 border-white shadow-md">
                    {review.userAvatar ? (
                      <img src={review.userAvatar} alt={review.userName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 font-black text-xl">
                        {review.userName.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-lg font-black text-gray-900">{review.userName}</h4>
                      <span className="text-xs font-bold text-gray-400">{formatDate(review.date)}</span>
                    </div>
                    <div className="flex text-amber-400 gap-0.5 mb-4">
                      {[1, 2, 3, 4, 5].map(s => (
                        <i key={s} className={`fas fa-star text-xs ${s <= review.rating ? '' : 'text-gray-100'}`}></i>
                      ))}
                    </div>
                    <p className="text-gray-600 font-medium leading-relaxed mb-6">
                      "{review.comment}"
                    </p>
                    {review.vendorReply && (
                      <div className="bg-gray-50 rounded-2xl p-5 mb-6 border border-gray-100">
                        <div className="flex items-center gap-2 mb-2">
                          <i className="fas fa-store text-brand-600 text-xs"></i>
                          <span className="text-xs font-black uppercase tracking-widest text-brand-600">Your Reply</span>
                          {review.vendorReplyDate && (
                            <span className="text-[10px] text-gray-400 font-bold ml-auto">{formatDate(review.vendorReplyDate)}</span>
                          )}
                        </div>
                        <p className="text-gray-600 text-sm font-medium leading-relaxed">{review.vendorReply}</p>
                      </div>
                    )}
                    <div className="flex gap-3">
                      <button 
                        onClick={() => setReplyModal(review.id)}
                        className="px-5 py-2.5 bg-brand-50 text-brand-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-brand-600 hover:text-white transition-all flex items-center gap-2"
                      >
                        <i className="fas fa-reply"></i> Reply
                      </button>
                      <button 
                        onClick={() => setReportModal(review.id)}
                        className="px-5 py-2.5 bg-gray-50 text-gray-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-50 hover:text-red-500 transition-all flex items-center gap-2"
                      >
                        <i className="fas fa-flag"></i> Report
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Reply Modal */}
      <AnimatePresence>
        {replyModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[3rem] p-10 w-full max-w-lg shadow-2xl"
            >
              <div className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center text-2xl mb-6">
                <i className="fas fa-reply"></i>
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-2">Reply to Customer</h3>
              <p className="text-gray-500 font-medium mb-8">Your reply will be visible to everyone on the product page.</p>
              
              <div className="mb-8">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-3 block">Your Message</label>
                <textarea 
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Thank you for your review..."
                  className="w-full bg-gray-50 rounded-2xl px-6 py-4 outline-none font-medium border-none resize-none focus:ring-4 focus:ring-brand-500/10 transition-all"
                  rows={4}
                />
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => { setReplyModal(null); setReplyText(''); }} 
                  className="flex-1 py-4 bg-gray-100 text-gray-900 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleReplySubmit}
                  disabled={!replyText.trim()}
                  className="flex-1 py-4 bg-brand-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Post Reply
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Report Modal */}
      <AnimatePresence>
        {reportModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[3rem] p-10 w-full max-w-lg shadow-2xl"
            >
              <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center text-2xl mb-6">
                <i className="fas fa-flag"></i>
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-2">Report Review</h3>
              <p className="text-gray-500 font-medium mb-8">Why are you reporting this review to the admin team?</p>
              
              <div className="space-y-3 mb-8">
                {['Fake / Spam Review', 'Inappropriate Content', 'Harassment / Abuse', 'Unrelated to Product'].map(reason => (
                  <button
                    key={reason}
                    onClick={() => setReportReason(reason)}
                    className={`w-full text-left px-6 py-4 rounded-2xl font-bold transition-all border-2 ${reportReason === reason ? 'border-red-500 bg-red-50 text-red-600' : 'border-gray-100 bg-gray-50 text-gray-700 hover:border-gray-300'}`}
                  >
                    {reason}
                  </button>
                ))}
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => { setReportModal(null); setReportReason(''); }} 
                  className="flex-1 py-4 bg-gray-100 text-gray-900 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleReportSubmit}
                  disabled={!reportReason}
                  className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Submit Report
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VendorReviewsView;
