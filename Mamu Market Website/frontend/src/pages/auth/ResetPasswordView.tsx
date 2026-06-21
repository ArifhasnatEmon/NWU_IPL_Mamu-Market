import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import PageTitle from '../../components/PageTitle';
import { motion } from 'motion/react';
import { supabase } from '../../lib/supabase';

const ResetPasswordView: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (resetErr) throw resetErr;

      setMessage('If an account exists with this email, a reset link has been sent.');
    } catch (err: any) {
      setError(err?.message || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <PageTitle title="Reset Password" />
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-900 via-brand-700 to-purple-500" />
      
      {/* Decorative blurred orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-brand-400/30 blur-[120px]" />
      <div className="absolute bottom-[-15%] right-[-5%] w-[400px] h-[400px] rounded-full bg-purple-400/25 blur-[100px]" />
      <div className="absolute top-[30%] right-[10%] w-[250px] h-[250px] rounded-full bg-pink-400/15 blur-[80px]" />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="bg-white/90 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.3)] border border-white/40 p-10">
          {/* Logo */}
          <div className="text-center mb-8">
            <button onClick={() => navigate('/')} className="inline-flex items-center gap-3 group mb-6">
              <div className="w-12 h-12 gradient-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand-500/30 group-hover:scale-105 transition-transform">
                <i className="fas fa-store text-lg"></i>
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xl font-black tracking-tighter text-gray-900 leading-none text-gradient">Mamu</span>
                <span className="text-[8px] font-black text-brand-600 tracking-[0.2em] uppercase">Market</span>
              </div>
            </button>
            <div className="w-14 h-14 bg-gradient-to-br from-brand-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <i className="fas fa-envelope text-brand-600 text-xl"></i>
            </div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Reset Password</h2>
            <p className="text-sm text-gray-400 mt-2 font-medium leading-relaxed">Enter your email and we'll send you a<br/>secure link to reset your password.</p>
          </div>

          <form onSubmit={handleReset} className="space-y-5">
            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 block ml-1">Email Address</label>
              <div className="relative">
                <i className="fas fa-at absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 text-sm"></i>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-gray-50/80 rounded-2xl pl-12 pr-6 py-4 outline-none focus:ring-4 focus:ring-brand-500/20 focus:bg-white font-bold border border-gray-100 focus:border-brand-300 transition-all"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {error && (
              <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 p-4 bg-red-50 text-red-500 text-sm font-bold rounded-xl border border-red-100">
                <i className="fas fa-exclamation-circle"></i>
                {error}
              </motion.div>
            )}
            {message && (
              <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 p-4 bg-emerald-50 text-emerald-600 text-sm font-bold rounded-xl border border-emerald-100">
                <i className="fas fa-check-circle"></i>
                {message}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full gradient-primary text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-brand-500/25 disabled:opacity-70 disabled:hover:scale-100"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <i className="fas fa-spinner fa-spin"></i> Sending...
                </span>
              ) : (
                'Send Reset Link'
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button onClick={() => navigate('/user-login')} className="text-sm font-bold text-gray-400 hover:text-brand-600 transition-colors inline-flex items-center gap-2">
              <i className="fas fa-arrow-left text-xs"></i>
              Back to Login
            </button>
          </div>
        </div>

        {/* Bottom branding */}
        <p className="text-center text-white/40 text-[10px] font-bold uppercase tracking-widest mt-6">
          © {new Date().getFullYear()} Mamu Market
        </p>
      </motion.div>
    </div>
  );
};

export default ResetPasswordView;
