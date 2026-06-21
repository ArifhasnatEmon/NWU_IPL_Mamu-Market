import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate, useLocation } from 'react-router-dom';
import PageTitle from '../../components/PageTitle';

const TERMS_CONTENT = [
  { title: '1. Introduction', body: 'Welcome to Mamu Market. These Terms & Conditions govern your use of our platform and services. By accessing or using Mamu Market, you agree to be bound by these terms. If you do not agree, please refrain from using our platform.' },
  { title: '2. User Accounts', body: 'To access certain features, you must create an account. You are responsible for keeping your credentials confidential and for all activity under your account. You must be at least 18 years old to register.' },
  { title: '3. Purchases & Payments', body: 'All purchases are subject to product availability. We reserve the right to refuse or cancel any order. We accept bKash, Nagad, Rocket, debit/credit cards, and Cash on Delivery. You agree to provide accurate billing information for every purchase.' },
  { title: '4. Vendor Terms', body: 'All vendors must comply with our Merchant Guidelines — including maintaining product quality, timely order fulfillment, and professional customer communication. Mamu Market reserves the right to suspend accounts that violate these standards.' },
  { title: '5. Prohibited Activities', body: 'Users may not use the platform for any illegal or unauthorized purpose, including fraud, harassment, distributing malware, or infringing on intellectual property rights.' },
  { title: '6. Account Termination', body: 'We reserve the right to terminate or suspend your account at our sole discretion, without notice, for conduct that violates these Terms or is harmful to other users or our business.' },
  { title: '7. Governing Law', body: 'These Terms & Conditions are governed by the laws of Bangladesh. Any disputes will be settled in the appropriate courts of Bangladesh.' },
];

const PRIVACY_CONTENT = [
  { title: '1. Information We Collect', body: 'We collect information you provide when creating an account, making a purchase, or contacting support — including your name, email, phone number, delivery address, and payment details.' },
  { title: '2. How We Use Your Information', body: 'We use your information to process transactions, provide customer support, personalize your shopping experience, and send you important updates about your orders or our services.' },
  { title: '3. Data Security', body: 'We use industry-standard encryption to keep your personal information secure. Our systems are built to protect your data at all times.' },
  { title: '4. Third-Party Sharing', body: 'We do not sell your personal data. We only share necessary information with trusted partners — such as bKash, Nagad, and delivery services — solely to complete your transactions.' },
  { title: '5. Your Rights', body: 'You have the right to access, update, or delete your personal information at any time. Most details can be updated directly from your account\'s Settings page.' },
  { title: '6. Contact', body: 'If you have any questions about this Privacy Policy, please contact us at admin.mamumarket@gmail.com.' },
];

const TermsPrivacyView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [tab, setTab] = useState<'terms' | 'privacy'>(
    location.pathname === '/privacy' ? 'privacy' : 'terms'
  );

  const content = tab === 'terms' ? TERMS_CONTENT : PRIVACY_CONTENT;
  const title = tab === 'terms' ? 'Terms & Conditions' : 'Privacy Policy';

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="min-h-screen pb-20 bg-[#F5F5F8]">
      <PageTitle title={title} />
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-brand-700 via-brand-600 to-purple-500 pt-16 pb-20 px-4 relative overflow-hidden">
        <div className="absolute top-[-30%] right-[-10%] w-[350px] h-[350px] rounded-full bg-white/5 blur-[60px]" />
        <div className="absolute bottom-[-40%] left-[-5%] w-[300px] h-[300px] rounded-full bg-purple-400/10 blur-[50px]" />
        <div className="max-w-[900px] mx-auto relative z-10">
          <div className="w-14 h-14 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6 border border-white/20">
            <i className={`fas ${tab === 'terms' ? 'fa-file-alt' : 'fa-shield-alt'} text-white text-xl`}></i>
          </div>
          <h1 className="text-[40px] font-[900] text-white mb-3 leading-tight tracking-tighter">{title}</h1>
          <p className="text-white/60 font-medium text-base max-w-lg leading-relaxed">
            {tab === 'terms' ? 'The rules and guidelines governing your use of Mamu Market.' : 'How we collect, use, and protect your personal information.'}
          </p>
        </div>
      </div>

      <div className="max-w-[900px] mx-auto px-4 -mt-10 relative z-20">
        <div className="bg-white rounded-[24px] p-8 md:p-14 shadow-[0_2px_32px_rgba(0,0,0,0.10)]">

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-2xl p-1 w-fit mb-10">
            <button
              onClick={() => { setTab('terms'); navigate('/terms'); }}
              className={`px-5 py-2.5 rounded-xl font-black text-sm transition-all ${tab === 'terms' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <i className="fas fa-file-alt mr-2"></i>Terms & Conditions
            </button>
            <button
              onClick={() => { setTab('privacy'); navigate('/privacy'); }}
              className={`px-5 py-2.5 rounded-xl font-black text-sm transition-all ${tab === 'privacy' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <i className="fas fa-shield-alt mr-2"></i>Privacy Policy
            </button>
          </div>

          {/* Content sections */}
          <div className="space-y-4">
            {content.map((section, i) => (
              <div key={i} className="border border-gray-100 rounded-2xl p-6">
                <h2 className="font-black text-gray-900 text-base mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 gradient-primary text-white rounded-lg flex items-center justify-center text-[10px] font-black shrink-0">{i + 1}</span>
                  {section.title.replace(/^\d+\.\s/, '')}
                </h2>
                <p className="text-sm text-gray-500 font-medium leading-relaxed">{section.body}</p>
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-300 font-medium mt-8 text-center">Last updated: March 2026 · Mamu Market, Bangladesh</p>
          
          <div className="mt-16 bg-brand-50 rounded-2xl p-6 md:p-8 border border-brand-100 flex flex-col md:flex-row items-center gap-8">
            <div className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center shrink-0">
              <i className="fas fa-life-ring text-white text-2xl"></i>
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="font-black text-gray-900 text-lg mb-2">Still need help?</h3>
              <p className="text-gray-600 font-medium text-sm leading-relaxed mb-4">
                If you couldn't find the answer in our documentation, please open a support ticket. Our team is here to help you.
              </p>
              <a href="mailto:admin.mamumarket@gmail.com" className="text-brand-600 font-bold text-sm hover:underline">admin.mamumarket@gmail.com</a>
            </div>
            <button 
              onClick={() => window.location.href = '/contact'} 
              className="shrink-0 px-6 py-3 gradient-primary text-white font-black text-xs uppercase tracking-widest rounded-xl hover:opacity-90 transition-opacity"
            >
              Open Support Ticket
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default TermsPrivacyView;
