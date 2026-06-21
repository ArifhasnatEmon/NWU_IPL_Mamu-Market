import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { supabase } from '../../lib/supabase';
import PageTitle from '../../components/PageTitle';

const UpdatePasswordView: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Recovery mode activated
    setHasRecoverySession(true);
    setMessage('Please enter your new password below.');
    setCheckingSession(false);
  }, []);

  const getPasswordStrength = (pwd: string): { label: string; color: string; width: string; bgColor: string } => {
    if (pwd.length === 0) return { label: '', color: '', width: '0%', bgColor: '' };
    if (pwd.length < 8) return { label: 'Too short', color: 'text-red-400', width: '20%', bgColor: 'bg-red-400' };
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^A-Za-z0-9]/.test(pwd)) strength++;

    if (strength <= 1) return { label: 'Weak', color: 'text-orange-400', width: '40%', bgColor: 'bg-orange-400' };
    if (strength === 2) return { label: 'Fair', color: 'text-yellow-500', width: '60%', bgColor: 'bg-yellow-400' };
    if (strength === 3) return { label: 'Good', color: 'text-blue-400', width: '80%', bgColor: 'bg-blue-400' };
    return { label: 'Strong', color: 'text-emerald-500', width: '100%', bgColor: 'bg-emerald-500' };
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please try again.');
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
    } else {
      setMessage('Password updated successfully! Redirecting to login...');
      // Force logout
      setTimeout(() => navigate('/user-login'), 2500);
    }
  };

  const strength = getPasswordStrength(password);

  // Background
  const Background = () => (
    <>
      <div className="absolute inset-0 bg-gradient-to-br from-brand-900 via-brand-700 to-purple-500" />
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-brand-400/30 blur-[120px]" />
      <div className="absolute bottom-[-15%] right-[-5%] w-[400px] h-[400px] rounded-full bg-purple-400/25 blur-[100px]" />
      <div className="absolute top-[30%] right-[10%] w-[250px] h-[250px] rounded-full bg-pink-400/15 blur-[80px]" />
    </>
  );

  // Logo
  const Logo = () => (
    <button onClick={() => navigate('/')} className="inline-flex items-center gap-3 group mb-6">
      <div className="w-12 h-12 gradient-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand-500/30 group-hover:scale-105 transition-transform">
        <i className="fas fa-store text-lg"></i>
      </div>
      <div className="flex flex-col text-left">
        <span className="text-xl font-black tracking-tighter text-gray-900 leading-none text-gradient">Mamu</span>
        <span className="text-[8px] font-black text-brand-600 tracking-[0.2em] uppercase">Market</span>
      </div>
    </button>
  );

  // Loading UI
  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        <Background />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 w-full max-w-md mx-4"
        >
          <div className="bg-white/90 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.3)] border border-white/40 p-10 text-center">
            <Logo />
            <div className="w-14 h-14 bg-gradient-to-br from-brand-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-5 animate-pulse">
              <i className="fas fa-spinner fa-spin text-brand-600 text-xl"></i>
            </div>
            <p className="text-gray-500 font-bold">Verifying your reset link...</p>
          </div>
        </motion.div>
      </div>
    );
  }

  // Invalid session
  if (!hasRecoverySession) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        <Background />
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="relative z-10 w-full max-w-md mx-4"
        >
          <div className="bg-white/90 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.3)] border border-white/40 p-10 text-center">
            <Logo />
            <div className="w-14 h-14 bg-gradient-to-br from-red-100 to-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <i className="fas fa-exclamation-triangle text-red-500 text-xl"></i>
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">Invalid Reset Link</h2>
            <p className="text-gray-400 font-medium text-sm mb-8 leading-relaxed">
              This link has expired or is invalid.<br/>Please request a new password reset.
            </p>
            <button
              onClick={() => navigate('/reset-password')}
              className="w-full gradient-primary text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-brand-500/25"
            >
              Request New Reset Link
            </button>
            <button
              onClick={() => navigate('/user-login')}
              className="mt-4 w-full py-3 text-gray-400 font-bold text-xs hover:text-gray-900 transition-colors inline-flex items-center justify-center gap-2"
            >
              <i className="fas fa-arrow-left text-xs"></i>
              Back to Login
            </button>
          </div>
          <p className="text-center text-white/40 text-[10px] font-bold uppercase tracking-widest mt-6">
            © {new Date().getFullYear()} Mamu Market
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <PageTitle title="Update Password" />
      <Background />
      
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="bg-white/90 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.3)] border border-white/40 p-10">
          {/* Logo + Header */}
          <div className="text-center mb-8">
            <Logo />
            <div className="w-14 h-14 bg-gradient-to-br from-brand-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <i className="fas fa-key text-brand-600 text-xl"></i>
            </div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Set New Password</h2>
            <p className="text-gray-400 text-sm font-medium mt-2">Create a strong, unique password</p>
          </div>

          <form onSubmit={handleUpdate} className="space-y-5">
            {/* New Password */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 block ml-1">New Password</label>
              <div className="relative">
                <i className="fas fa-lock absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 text-sm"></i>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-gray-50/80 rounded-2xl pl-12 pr-14 py-4 outline-none focus:ring-4 focus:ring-brand-500/20 focus:bg-white font-bold border border-gray-100 focus:border-brand-300 transition-all"
                  placeholder="Min 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
              {/* Password strength indicator */}
              {password.length > 0 && (
                <div className="mt-3">
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: strength.width }}
                      className={`h-full ${strength.bgColor} rounded-full`}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <p className={`text-[10px] font-bold mt-1.5 ${strength.color}`}>
                    {strength.label}
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 block ml-1">Confirm Password</label>
              <div className="relative">
                <i className="fas fa-lock absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 text-sm"></i>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className={`w-full bg-gray-50/80 rounded-2xl pl-12 pr-14 py-4 outline-none focus:ring-4 font-bold border transition-all ${
                    confirmPassword.length > 0 && password !== confirmPassword
                      ? 'focus:ring-red-300/30 border-red-200 bg-red-50/30'
                      : confirmPassword.length > 0 && password === confirmPassword
                      ? 'focus:ring-emerald-300/30 border-emerald-200 bg-emerald-50/30'
                      : 'focus:ring-brand-500/20 border-gray-100 focus:border-brand-300'
                  }`}
                  placeholder="Re-enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  <i className={`fas ${showConfirm ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
              {confirmPassword.length > 0 && (
                <p className={`text-[10px] font-bold mt-1.5 ${password === confirmPassword ? 'text-emerald-500' : 'text-red-400'}`}>
                  {password === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                </p>
              )}
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
              disabled={loading || password.length < 8 || password !== confirmPassword}
              className="w-full gradient-primary text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-brand-500/25 disabled:opacity-70 disabled:hover:scale-100"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <i className="fas fa-spinner fa-spin"></i> Updating...
                </span>
              ) : (
                'Update Password'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-white/40 text-[10px] font-bold uppercase tracking-widest mt-6">
          © {new Date().getFullYear()} Mamu Market
        </p>
      </motion.div>
    </div>
  );
};

export default UpdatePasswordView;
