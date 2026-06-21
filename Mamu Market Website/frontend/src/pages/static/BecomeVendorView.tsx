import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import PageTitle from '../../components/PageTitle';
import { useSharedCategories } from '../../context/DataContext';
import { Category } from '../../types';
import { VendorRegistrationData } from '../../types';

const BecomeVendorView: React.FC = () => {
  const { setToast } = useApp();
  const { verifyVendorOtp, resendVerificationEmail, register } = useAuth();
  const navigate = useNavigate();
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);
  const [catError, setCatError] = useState('');
  const [cat1, setCat1] = useState('');
  const [cat2, setCat2] = useState('');
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const { categories: customCategories } = useSharedCategories();

  // ── OTP Verification State ──
  const [verificationStep, setVerificationStep] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [pendingVendorData, setPendingVendorData] = useState<VendorRegistrationData | null>(null);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '', '', '']);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);
    setOtpError('');
    if (value && index < 7) otpRefs.current[index + 1]?.focus();
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
    if (code.length !== 8) { setOtpError('Please enter all 8 digits.'); return; }
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;
    if (password.length < 8) { setToast('Password must be at least 8 characters.'); return; }
    if (password !== confirmPassword) { setToast('Passwords do not match!'); return; }
    
    const cat1 = formData.get('storeCategory1') as string || '';
    const cat2 = formData.get('storeCategory2') as string || '';
    if (!cat1 && !cat2) { setCatError('Please select at least 1 main category.'); return; }
    const combinedCategories = [cat1, cat2].filter(Boolean).join(',');

    if (!termsChecked) { setToast('Please agree to Merchant Terms first.'); return; }

    const san = (s: string) => (s || '').trim().replace(/[<>]/g, '');
    const email = san(formData.get('email') as string);
    const name = san(`${formData.get('firstName')} ${formData.get('lastName')}`);
    const storeName = san(formData.get('storeName') as string);

    setSubmitLoading(true);

    // Actual registration via Supabase
    const result = await register({
      email,
      password,
      name,
      role: 'vendor',
      phone: san(formData.get('phone') as string),
      storeName,
      storeCategory: combinedCategories,
      storeCity: san(formData.get('storeCity') as string),
      storeDescription: san(formData.get('storeDescription') as string)
    });

    setSubmitLoading(false);

    if (result.success) {
      setVerificationEmail(email);
      setVerificationStep(true);
      setToast('Please check your email for the verification code.');
    } else {
      setToast(result.error || 'Registration failed. Please try again.');
    }
  };
  // ── OTP Verification Screen ──
  if (verificationStep) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{background:'#f4f6fb'}}>
        <div className="w-full max-w-[480px]">
          <div className="bg-white rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-gray-50 p-10 pb-8 relative z-10">
            <div className="text-center mb-8">
              <div className="w-[4.5rem] h-[4.5rem] rounded-[1.25rem] flex items-center justify-center mx-auto mb-6 shadow-lg shadow-purple-500/20" style={{background:'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)'}}>
                <i className="fas fa-envelope-open-text text-white text-3xl"></i>
              </div>
              <h2 className="text-[26px] font-black text-gray-900 tracking-tight mb-2">Verify Your Email</h2>
              <p className="text-gray-400 text-[15px] font-medium">
                We sent an 8-digit code to<br/>
                <span className="text-gray-800 font-bold">{verificationEmail}</span>
              </p>
            </div>

            <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-8" onPaste={handleOtpPaste}>
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
                  className={`w-11 h-14 sm:w-12 sm:h-[60px] text-center text-xl font-bold rounded-2xl outline-none transition-all border ${
                    digit ? 'border-brand-400 text-gray-900 shadow-[0_0_15px_rgba(124,58,237,0.08)]' : 'border-gray-200 text-gray-900'
                  } focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10`}
                />
              ))}
              <div className="w-3 flex items-center justify-center text-gray-300 font-black text-xl">-</div>
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
                  className={`w-11 h-14 sm:w-12 sm:h-[60px] text-center text-xl font-bold rounded-2xl outline-none transition-all border ${
                    digit ? 'border-brand-400 text-gray-900 shadow-[0_0_15px_rgba(124,58,237,0.08)]' : 'border-gray-200 text-gray-900'
                  } focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10`}
                />
              ))}
            </div>

            {otpError && (
              <div className="p-3 bg-red-50 text-red-500 text-sm font-bold rounded-xl mb-6 text-center">
                {otpError}
              </div>
            )}

            <button
              onClick={handleVerifyOtp}
              disabled={otpLoading || otpDigits.join('').length !== 8}
              className="w-full py-4 text-white rounded-2xl font-black text-[13px] uppercase tracking-wider hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 mb-6 shadow-xl shadow-purple-500/20"
              style={{background:'linear-gradient(to right, #c084fc, #f472b6)'}}
            >
              {otpLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <i className="fas fa-spinner fa-spin"></i> Verifying...
                </span>
              ) : 'Verify & Submit Application'}
            </button>

            <div className="flex items-center justify-between px-1">
              <button
                onClick={() => {
                  setVerificationStep(false);
                  setOtpDigits(['', '', '', '', '', '', '', '']);
                  setOtpError('');
                }}
                className="text-xs font-black text-gray-400 hover:text-gray-700 transition-colors flex items-center gap-1.5"
              >
                <i className="fas fa-arrow-left"></i> Back to form
              </button>
              <button
                onClick={handleResendCode}
                disabled={resendCooldown > 0}
                className={`text-xs font-black transition-colors ${resendCooldown > 0 ? 'text-gray-300' : 'text-[#a855f7] hover:text-purple-700'}`}
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
              </button>
            </div>
          </div>

          <p className="text-center text-gray-400 text-[13px] font-medium mt-6 relative z-10">
            Didn't receive the email? Check your spam folder.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row lg:h-screen lg:overflow-hidden">
      <PageTitle title="Become a Vendor" />

      {/* ── LEFT PANEL ── */}
      <div className="hidden lg:flex lg:w-[42%] xl:w-[45%] flex-col justify-between p-12 relative overflow-hidden lg:sticky lg:top-0 lg:h-screen" style={{background:'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)'}}>
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-white/8 rounded-full blur-3xl pointer-events-none" />

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

          <h1 className="text-5xl xl:text-6xl font-black text-white leading-[1.05] tracking-tighter mb-5 max-w-xs">
            Grow your business with us.
          </h1>
          <p className="text-white/70 text-base font-medium leading-relaxed mb-10 max-w-xs">
            Join thousands of merchants selling on Mamu Market across Bangladesh.
          </p>

          <div className="space-y-3">
            {[
              { emoji: '🏪', title: 'Easy Setup', desc: 'Your store live in minutes' },
              { emoji: '📊', title: 'Sales Analytics', desc: 'Track orders & revenue' },
              { emoji: '🔒', title: 'Secure Payouts', desc: 'Fast & protected payments' },
            ].map((f, i) => (
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

        <div className="mt-10 text-white/40 text-xs font-semibold">
          Already have an account?{' '}
          <button onClick={() => navigate('/vendor-login')} className="text-white/70 hover:text-white underline transition-colors">Sign In</button>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex-1 flex flex-col bg-white lg:h-screen lg:overflow-y-auto">

        {/* Top bar */}
        <div className="flex items-center justify-between px-8 pt-8 pb-4">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-400 hover:text-brand-600 transition-all group">
            <div className="w-9 h-9 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center group-hover:shadow transition-all">
              <i className="fas fa-arrow-left text-sm group-hover:-translate-x-0.5 transition-transform"></i>
            </div>
            <span className="text-xs font-black uppercase tracking-widest text-gray-400 group-hover:text-brand-600 transition-colors hidden sm:block">Back</span>
          </button>
          <div className="flex items-center gap-2 lg:hidden">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background:'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)'}}>
              <i className="fas fa-shopping-bag text-white text-sm"></i>
            </div>
            <span className="font-black text-gray-900 text-base tracking-tight">Mamu Market</span>
          </div>
          <div className="w-9 lg:hidden" />
        </div>

        <div className="flex-1 flex items-start justify-center px-6 py-8 overflow-y-auto">
          <div className="w-full max-w-md">

            <div className="mb-8">
              <h2 className="text-2xl font-black text-gray-900 tracking-tighter mb-1">Seller Application</h2>
              <p className="text-gray-400 font-medium text-sm">Start your business journey today.</p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-2 mb-2 block">First Name</label>
                  <input required name="firstName" type="text" placeholder="John" className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-brand-500/10 focus:bg-white transition-all font-bold" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-2 mb-2 block">Last Name</label>
                  <input required name="lastName" type="text" placeholder="Doe" className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-brand-500/10 focus:bg-white transition-all font-bold" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-2 mb-2 block">Store Name</label>
                <input required name="storeName" type="text" placeholder="TechWorld Official" className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-brand-500/10 focus:bg-white transition-all font-bold" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-2 mb-2 block">Business Email</label>
                <input required name="email" type="email" placeholder="vendor@yourstore.com" className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-brand-500/10 focus:bg-white transition-all font-bold" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-2 mb-2 block">Phone Number</label>
                <input required name="phone" type="tel" placeholder="01XXXXXXXXX" className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-brand-500/10 focus:bg-white transition-all font-bold" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-2 mb-2 block">Password</label>
                <div className="relative">
                  <input required name="password" type={showPass ? 'text' : 'password'} placeholder="••••••••" minLength={8} className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-brand-500/10 focus:bg-white transition-all font-bold pr-14" />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-600 transition-colors">
                    <i className={`fas ${showPass ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 font-medium mt-1.5 ml-2 flex items-center gap-1"><i className="fas fa-info-circle text-gray-300"></i> Must be at least 8 characters long</p>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-2 mb-2 block">Confirm Password</label>
                <div className="relative">
                  <input required name="confirmPassword" type={showConfirmPass ? 'text' : 'password'} placeholder="••••••••" className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-brand-500/10 focus:bg-white transition-all font-bold pr-14" />
                  <button type="button" onClick={() => setShowConfirmPass(!showConfirmPass)} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-600 transition-colors">
                    <i className={`fas ${showConfirmPass ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
              </div>
              {(() => {
                const defaultCats = ['Electronics', 'Fashion', 'Home & Living', 'Beauty & Health', 'Sports & Outdoor'];
                const dbCatNames = customCategories.map((c: Category) => c.name);
                const allCats = [...new Set([...defaultCats, ...dbCatNames])];
                return (
                  <div>
                    <div className="mb-3 ml-2 mt-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 block mb-1">Store Categories</label>
                      <p className="text-[10px] text-gray-400 font-medium leading-relaxed">Select your main product category. You may also add a second category if your store spans multiple types (completely optional).</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-1">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-2 mb-2 block">
                          Main Category <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="storeCategory1"
                          required
                          value={cat1}
                          onChange={(e) => { setCat1(e.target.value); setCatError(''); }}
                          className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-brand-500/10 focus:bg-white transition-all font-bold appearance-none cursor-pointer text-gray-700 text-sm"
                        >
                          <option value="" disabled>Select main...</option>
                          {allCats.filter(cat => cat !== cat2).map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-2 mb-2 block">
                          2nd Category (Optional)
                        </label>
                        <select
                          name="storeCategory2"
                          value={cat2}
                          onChange={(e) => { setCat2(e.target.value); setCatError(''); }}
                          className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-brand-500/10 focus:bg-white transition-all font-bold appearance-none cursor-pointer text-gray-700 text-sm"
                        >
                          <option value="">None</option>
                          {allCats.filter(cat => cat !== cat1).map(cat => (
                            <option key={`opt-${cat}`} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {catError && <p className="text-red-500 text-xs font-bold mt-2 ml-2">{catError}</p>}
                  </div>
                );
              })()}
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-2 mb-2 block">Store Location / City</label>
                <input required name="storeCity" type="text" placeholder="e.g. Dhaka, Chittagong, Khulna" className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-brand-500/10 focus:bg-white transition-all font-bold" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-2 mb-2 block">Store Description <span className="text-gray-300 normal-case font-bold">(optional)</span></label>
                <textarea name="storeDescription" placeholder="Tell customers what your store sells..." className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-brand-500/10 focus:bg-white transition-all font-bold resize-none" rows={2} />
              </div>
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="terms"
                  checked={termsChecked}
                  onChange={e => setTermsChecked(e.target.checked)}
                  className="w-5 h-5 mt-0.5 accent-brand-600 cursor-pointer shrink-0"
                />
                <label htmlFor="terms" className="text-[11px] text-gray-400 font-bold leading-relaxed cursor-pointer">
                  I have read and agree to the <button type="button" onClick={() => setShowTermsModal(true)} className="text-brand-600 hover:underline">Merchant Terms</button>. Submitting without reading is your responsibility.
                </label>
              </div>
              <button type="submit" disabled={submitLoading} className="w-full py-5 text-white rounded-[2rem] font-black text-lg hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50" style={{background:'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)', boxShadow:'0 8px 32px rgba(124,58,237,.3)'}}>
                {submitLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <i className="fas fa-spinner fa-spin"></i> Processing...
                  </span>
                ) : 'Submit Application'}
              </button>
            </form>
            </motion.div>
          </div>
        </div>
      </div>
      {showTermsModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowTermsModal(false)}>
          <div className="bg-white rounded-3xl p-10 w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-2xl font-black text-gray-900 mb-6">Merchant Terms</h3>
            <div className="text-sm text-gray-500 font-medium space-y-4 leading-relaxed">
              <p>1. You agree to provide accurate product information at all times.</p>
              <p>2. All products must comply with Mamu Market's quality standards.</p>
              <p>3. Vendors are responsible for timely order fulfillment.</p>
              <p>4. Mamu Market reserves the right to remove listings that violate policies.</p>
              <p>5. Vendor accounts found in violation may be suspended or terminated.</p>
              <p>6. Commission rates and payment terms are subject to change with notice.</p>
              <p>7. All disputes will be handled through Mamu Market's resolution process.</p>
            </div>
            <button
              onClick={() => { setShowTermsModal(false); setTermsChecked(true); }}
              className="w-full mt-8 py-4 bg-gray-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-800 transition-all"
            >
              I Understand & Agree
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BecomeVendorView;
