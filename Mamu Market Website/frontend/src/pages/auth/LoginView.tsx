import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import PageTitle from '../../components/PageTitle';
import { useApp } from '../../context/AppContext';
import { useSharedCategories } from '../../context/DataContext';
import { VendorRegistrationData } from '../../types';

const LoginView: React.FC<{ initialVendorMode?: boolean }> = ({ initialVendorMode = false }) => {
  const { authMode, setAuthMode, login, register, verifyVendorOtp, resendVerificationEmail, signInWithGoogle } = useAuth();
  const { setToast } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const { categories: customCategories } = useSharedCategories();
  const [isVendorMode, setIsVendorMode] = useState(() => initialVendorMode || location.state?.vendorMode || false);

  useEffect(() => {
    setIsVendorMode(initialVendorMode || location.state?.vendorMode || false);
  }, [initialVendorMode, location.state?.vendorMode]);
  const [showPass, setShowPass] = useState(false);
  const [confirmPass, setConfirmPass] = useState('');
  const [passError, setPassError] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [selectedVendorCats, setSelectedVendorCats] = useState<string[]>([]);

  const toggleVendorCat = (cat: string) => {
    setSelectedVendorCats(prev => {
      if (prev.includes(cat)) return prev.filter(c => c !== cat);
      if (prev.length >= 2) return prev;
      return [...prev, cat];
    });
  };

  const [phoneError, setPhoneError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);

  // OTP State
  const [verificationStep, setVerificationStep] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [pendingVendorData, setPendingVendorData] = useState<VendorRegistrationData | null>(null);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '', '', '']);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Signal Interception
  const handleToastSignal = (msg: string) => {
    if (msg === '__VENDOR_VERIFY__') {
      // Trigger verification
      setVerificationStep(true);
      setResendCooldown(60);
      return;
    }
    setToast(msg);
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch {
      setToast('Google login failed. Please try again.');
    }
  };
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // Validate digits
    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);
    setOtpError('');
    // Auto focus
    if (value && index < 7) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 8);
    if (pasted.length === 8) {
      setOtpDigits(pasted.split(''));
      otpRefs.current[7]?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const code = otpDigits.join('');
    if (code.length !== 8) {
      setOtpError('Please enter all 8 digits.');
      return;
    }
    setOtpLoading(true);
    setOtpError('');
    const result = await verifyVendorOtp(verificationEmail, code, pendingVendorData);
    setOtpLoading(false);
    if (result.success) {
      setVerificationStep(false);
      setOtpDigits(['', '', '', '', '', '', '', '']);
      setToast('Email verified! Application submitted. Await admin approval.');
      setTimeout(() => navigate('/vendor-login'), 1500);
    } else {
      setOtpError(result.error || 'Invalid code. Please try again.');
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    const result = await resendVerificationEmail(verificationEmail);
    if (result.success) {
      setResendCooldown(60);
      setToast('Verification code resent! Check your email.');
    } else {
      setOtpError(result.error || 'Failed to resend code.');
    }
  };

  // OTP Screen
  if (verificationStep) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-8" style={{background:'linear-gradient(135deg, #0f0f1a 0%, #1a1035 50%, #0f0f1a 100%)'}}>
        <div className="w-full max-w-lg">
          <div className="bg-white/[0.03] backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-white/10 p-8 sm:p-12">
            {/* Header */}
            <div className="text-center mb-10">
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 relative" style={{background:'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)'}}>
                <i className="fas fa-shield-halved text-white text-3xl"></i>
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-emerald-400 rounded-full flex items-center justify-center shadow-lg shadow-emerald-400/30">
                  <i className="fas fa-envelope text-white text-[8px]"></i>
                </div>
              </div>
              <h2 className="text-3xl font-black text-white tracking-tight mb-3">Verify Your Email</h2>
              <p className="text-white/40 text-sm font-medium leading-relaxed">
                We sent an 8-digit verification code to<br/>
                <span className="text-purple-300 font-bold">{verificationEmail}</span>
              </p>
            </div>

            {/* OTP Input — 4+4 split layout */}
            <div className="mb-8">
              <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-4 text-center">Enter Verification Code</label>
              <div className="flex items-center justify-center gap-1.5 sm:gap-2" onPaste={handleOtpPaste}>
                {otpDigits.slice(0, 4).map((digit, i) => (
                  <input
                    key={i}
                    ref={el => { otpRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    className={`w-9 h-11 sm:w-11 sm:h-13 text-center text-base sm:text-xl font-black rounded-xl sm:rounded-2xl border-2 outline-none transition-all duration-200 ${
                      digit ? 'border-purple-500 bg-purple-500/20 text-purple-300 shadow-lg shadow-purple-500/10' : 'border-white/10 bg-white/5 text-white'
                    } focus:border-purple-400 focus:ring-4 focus:ring-purple-500/20 focus:bg-purple-500/10 placeholder:text-white/10`}
                    placeholder="•"
                  />
                ))}
                <div className="w-4 sm:w-6 flex items-center justify-center">
                  <div className="w-3 sm:w-4 h-0.5 bg-white/20 rounded-full"></div>
                </div>
                {otpDigits.slice(4).map((digit, i) => (
                  <input
                    key={i + 4}
                    ref={el => { otpRefs.current[i + 4] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(i + 4, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i + 4, e)}
                    className={`w-9 h-11 sm:w-11 sm:h-13 text-center text-base sm:text-xl font-black rounded-xl sm:rounded-2xl border-2 outline-none transition-all duration-200 ${
                      digit ? 'border-purple-500 bg-purple-500/20 text-purple-300 shadow-lg shadow-purple-500/10' : 'border-white/10 bg-white/5 text-white'
                    } focus:border-purple-400 focus:ring-4 focus:ring-purple-500/20 focus:bg-purple-500/10 placeholder:text-white/10`}
                    placeholder="•"
                  />
                ))}
              </div>
            </div>

            {/* Error */}
            {otpError && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-300 text-sm font-bold rounded-2xl mb-6 text-center flex items-center justify-center gap-2">
                <i className="fas fa-exclamation-circle text-red-400"></i> {otpError}
              </div>
            )}

            {/* Verify Button */}
            <button
              onClick={handleVerifyOtp}
              disabled={otpLoading || otpDigits.join('').length !== 8}
              className="w-full py-4 sm:py-5 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-30 disabled:hover:scale-100 mb-6"
              style={{background:'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)', boxShadow:'0 12px 32px rgba(124,58,237,.3)'}}
            >
              {otpLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <i className="fas fa-spinner fa-spin"></i> Verifying...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <i className="fas fa-check-circle"></i> Verify & Submit Application
                </span>
              )}
            </button>

            {/* Resend & Back */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => {
                  setVerificationStep(false);
                  setOtpDigits(['', '', '', '', '', '', '', '']);
                  setOtpError('');
                }}
                className="text-xs font-black text-white/30 hover:text-white/70 transition-colors flex items-center gap-1.5"
              >
                <i className="fas fa-arrow-left text-[10px]"></i> Back to form
              </button>
              <button
                onClick={handleResendCode}
                disabled={resendCooldown > 0}
                className={`text-xs font-black transition-colors ${resendCooldown > 0 ? 'text-white/20' : 'text-purple-400 hover:text-purple-300'}`}
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
              </button>
            </div>
          </div>

          {/* Security footer */}
          <div className="flex items-center justify-center gap-2 mt-8 text-white/20 text-[10px] font-bold uppercase tracking-widest">
            <i className="fas fa-lock text-[8px]"></i>
            <span>Secured with end-to-end encryption</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row lg:h-screen lg:overflow-hidden">
      <PageTitle title={initialVendorMode ? "Vendor Login" : "Login"} />

      {/* ── LEFT PANEL ── */}
      <div className="hidden lg:flex lg:w-[42%] xl:w-[45%] flex-col justify-between p-12 relative overflow-hidden lg:sticky lg:top-0 lg:h-screen" style={{background:'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)'}}>
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-white/8 rounded-full blur-3xl pointer-events-none" />

        {/* Logo */}
        <div>
          <button onClick={() => navigate('/')} className="flex items-center gap-3 mb-16 group">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/20">
              <i className="fas fa-shopping-bag text-white text-lg"></i>
            </div>
            <div>
              <div className="text-white font-black text-lg tracking-tight leading-none">Mamu</div>
              <div className="text-white/60 font-black text-[10px] uppercase tracking-[0.2em]">Market</div>
            </div>
          </button>

          <h1 className={`font-black text-white leading-[1.05] tracking-tighter mb-5 ${isVendorMode ? 'text-5xl xl:text-6xl max-w-xs' : 'text-4xl xl:text-5xl'}`}>
            {isVendorMode ? 'Grow your business with us.' : "Bangladesh's\nfavorite\nmarketplace."}
          </h1>
          <p className="text-white/70 text-base font-medium leading-relaxed mb-10 max-w-xs">
            {isVendorMode
              ? 'Join thousands of merchants selling on Mamu Market across Bangladesh.'
              : 'Discover thousands of products from verified local vendors. Fast delivery, secure payments.'}
          </p>

          <div className="space-y-3">
            {(isVendorMode ? [
              { emoji: '🏪', title: 'Easy Setup', desc: 'Your store live in minutes' },
              { emoji: '📊', title: 'Sales Analytics', desc: 'Track orders & revenue' },
              { emoji: '🔒', title: 'Secure Payments', desc: 'Fast & protected payments' },
            ] : [
              { emoji: '🚚', title: 'Free Delivery', desc: 'On orders over ৳10,000' },
              { emoji: '🏪', title: 'Trusted Vendors', desc: 'Verified local merchants' },
              { emoji: '🔒', title: 'Secure Payments', desc: 'bKash, Nagad & more' },
            ]).map((f, i) => (
              <div key={i} className="flex items-center gap-3 rounded-2xl px-4 py-3.5" style={{background:'rgba(255,255,255,0.1)'}}>
                <span className="text-xl shrink-0">{f.emoji}</span>
                <div>
                  <p className="text-white font-black text-sm leading-tight">{f.title}</p>
                  <p className="text-white/60 text-xs font-medium">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex-1 flex flex-col bg-gray-50 lg:bg-white lg:h-screen lg:overflow-y-auto">
        {/* Top bar */}
        <div className="flex items-center justify-between px-8 pt-8 pb-4">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-400 hover:text-brand-600 transition-all group">
            <div className="w-9 h-9 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center group-hover:shadow transition-all">
              <i className="fas fa-arrow-left text-sm group-hover:-translate-x-0.5 transition-transform"></i>
            </div>
            <span className="text-xs font-black uppercase tracking-widest text-gray-400 group-hover:text-brand-600 transition-colors hidden sm:block">Back</span>
          </button>
          {/* Mobile logo */}
          <div className="flex items-center gap-2 lg:hidden">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background:'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)'}}>
              <i className="fas fa-shopping-bag text-white text-sm"></i>
            </div>
            <span className="font-black text-gray-900 text-base tracking-tight">Mamu Market</span>
          </div>
          <div className="w-9 lg:hidden" />
        </div>

        {/* Form area */}
        <div className="flex-1 flex items-center justify-center px-6 py-8">
          <div className="w-full max-w-md">

            {/* Heading */}
            <div className="mb-8">
              <h2 className="text-2xl font-black text-gray-900 tracking-tighter mb-1">
                {authMode === 'login' ? (isVendorMode ? 'Merchant Sign In' : 'Welcome back') : 'Create your account'}
              </h2>
              <p className="text-gray-400 font-medium text-sm">
                {authMode === 'login' ? 'Good to see you again.' : 'Start shopping in minutes.'}
              </p>
            </div>

            {/* Auth Tabs */}
            {!isVendorMode && (
              <div className="flex bg-gray-100 rounded-2xl p-1 gap-1 mb-8">
                <button type="button" onClick={() => { setAuthMode('login'); navigate('/user-login'); }}
                  className={`flex-1 py-2.5 rounded-xl font-black text-sm transition-all ${authMode === 'login' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                  Sign In
                </button>
                <button type="button" onClick={() => { setAuthMode('signup'); navigate('/user-signup'); }}
                  className={`flex-1 py-2.5 rounded-xl font-black text-sm transition-all ${authMode === 'signup' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                  Sign Up
                </button>
              </div>
            )}

            {/* Google OAuth — Customers Only */}
            {!isVendorMode && (
              <>
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-full flex items-center justify-center gap-3 py-4 bg-white border-2 border-gray-200 rounded-2xl font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-300 hover:shadow-md transition-all"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Continue with Google
                </button>
                <div className="flex items-center gap-4 my-5">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">or continue with email</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
              </>
            )}

        <form className="space-y-4" onSubmit={async (e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const emailVal = formData.get('email') as string || '';
          const passwordVal = formData.get('password') as string || '';
          const roleVal = formData.get('role') as string || 'customer';
          
          if (authMode === 'signup') {
            const phoneVal = formData.get('phone') as string || '';
            // Password length
            if (passwordVal.length < 8) {
              setPassError('Password must be at least 8 characters.');
              return;
            }
            // Check match
            if (passwordVal !== confirmPass) {
              setPassError('Passwords do not match!');
              return;
            }
            
            // Phone validation
            const phoneDigits = phoneVal.replace(/[\s\-+]/g, '');
            if (phoneDigits && !/^(880)?01[3-9]\d{8}$/.test(phoneDigits)) {
              setPhoneError('Enter a valid Bangladesh phone number (e.g. 01XXXXXXXXX).');
              return;
            }
            
            const data = Object.fromEntries(formData.entries());

            // Normal customer registration
            const res = await register(data as Record<string, string>);
            if (res.success) {
              setToast('Registration successful! Please log in.');
              setAuthMode('login');
              navigate('/user-login');
            } else {
              setToast(res.error || 'Registration failed');
            }
          } else {
            // Login mode
            const res = await login(emailVal, passwordVal, roleVal);
            if (res.success && res.user) {
              setToast(`Welcome back, ${res.user.name}!`);
              setTimeout(() => navigate(res.user.role === 'admin' ? '/admin-dashboard' : res.user.role === 'vendor' ? '/dashboard' : '/'), 100);
            } else {
              setToast(res.error || 'Login failed');
            }
          }
        }}>
          {/* Hidden Role Input */}
          <input type="hidden" name="role" value={isVendorMode ? 'vendor' : 'customer'} />
          <input type="hidden" name="mode" value={authMode} />
          
          {authMode === 'signup' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-2 mb-2 block">Full Name</label>
                  <input required name="name" type="text" placeholder="John Doe" className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-brand-500/10 focus:bg-white transition-all font-bold" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-2 mb-2 block">Phone Number</label>
                  <input required name="phone" type="tel" placeholder="01XXXXXXXXX" onChange={() => setPhoneError('')} className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-brand-500/10 focus:bg-white transition-all font-bold" />
                  {phoneError && <p className="text-red-500 text-xs font-bold mt-2 ml-2">{phoneError}</p>}
                </div>
              </div>
            </>
          )}
          
          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-2 mb-2 block">Email Address</label>
            <div className="relative">
              <i className="fas fa-envelope absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 text-sm pointer-events-none"></i>
              <input required name="email" type="email" placeholder="name@example.com" onChange={() => setEmailError('')} className="w-full bg-gray-50 border-2 border-transparent rounded-2xl pl-12 pr-6 py-4 outline-none focus:ring-0 focus:border-brand-400 focus:bg-white transition-all font-bold" />
            </div>
            {emailError && <p className="text-red-500 text-xs font-bold mt-2 ml-2">{emailError}</p>}
          </div>

          {authMode === 'signup' && (
            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-2 mb-2 block">Delivery Address</label>
              <textarea required name="address" placeholder="House #, Road #, Area, City" className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-brand-500/10 focus:bg-white transition-all font-bold resize-none" rows={2} />
            </div>
          )}
          
          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-2 mb-2 block">Password</label>
            <div className="relative">
              <i className="fas fa-lock absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 text-sm pointer-events-none"></i>
              <input required name="password" type={showPass ? 'text' : 'password'} placeholder="••••••••" minLength={8} className="w-full bg-gray-50 border-2 border-transparent rounded-2xl pl-12 pr-14 py-4 outline-none focus:ring-0 focus:border-brand-400 focus:bg-white transition-all font-bold" />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-600 transition-colors">
                <i className={`fas ${showPass ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
            {authMode === 'signup' && <p className="text-[10px] text-gray-400 font-medium mt-1.5 ml-2 flex items-center gap-1"><i className="fas fa-info-circle text-gray-300"></i> Must be at least 8 characters long</p>}
          </div>

          {authMode === 'signup' && (
            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-2 mb-2 block">Confirm Password</label>
              <div className="relative">
                <input
                  required
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPass}
                  onChange={e => { setConfirmPass(e.target.value); setPassError(''); }}
                  className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-brand-500/10 focus:bg-white transition-all font-bold pr-14"
                />
              </div>
              {passError && <p className="text-red-500 text-xs font-bold mt-2 ml-2">{passError}</p>}
            </div>
          )}

          <div className="flex items-center justify-between text-xs font-black">
            <label className="flex items-center gap-2 cursor-pointer text-gray-500 hover:text-gray-700 transition-colors">
              <input type="checkbox" className="w-4 h-4 accent-brand-600 rounded-md" /> Remember me
            </label>
            {authMode === 'login' && (
              <button type="button" onClick={() => navigate('/reset-password')} className="text-brand-600 hover:underline">Forgot Password?</button>
            )}
          </div>

          <button type="submit" className="w-full py-4 text-white rounded-2xl font-black text-base shadow-lg hover:scale-[1.01] active:scale-95 transition-all" style={{background:'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)', boxShadow:'0 8px 24px rgba(124,58,237,.25)'}}>
            {isVendorMode ? 'Sign In to Merchant Portal' : authMode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {authMode === 'login' && (
          <div className="mt-8 text-center">
            <div className="border-t border-gray-100 pt-5">
              <button
                onClick={() => { isVendorMode ? navigate('/user-login') : navigate('/vendor-login'); }}
                className="w-full py-3.5 border-2 border-gray-100 rounded-2xl text-[11px] font-black text-gray-500 uppercase tracking-widest hover:border-brand-500 hover:text-brand-600 transition-all"
              >
                {isVendorMode ? '← Back to Customer Login' : 'Are you a merchant? Login here →'}
              </button>
            </div>
          </div>
        )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
