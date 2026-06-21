import React from 'react';
import { motion } from 'motion/react';
import { STATIC_CONTENT } from '../../staticContent';
import PageTitle from '../../components/PageTitle';
import HelpCenterView from './HelpCenterView';
import { useAuth } from '../../context/AuthContext';

const StaticPageView = ({ type }: { type: string }) => {
  const { user } = useAuth();
  if (type === 'help-center') return <HelpCenterView />;

  const STATIC_PAGE_META: Record<string, { icon: string; subtitle: string }> = {
    'about-us': { icon: 'fa-building', subtitle: 'Learn about our mission, story, and the team behind Mamu Market.' },
    'return-policy': { icon: 'fa-undo', subtitle: 'Our return and refund guidelines to ensure a hassle-free experience.' },
    'seller-policy': { icon: 'fa-file-contract', subtitle: 'Rules and guidelines for selling on Mamu Market.' },
  };

  const content = STATIC_CONTENT[type as keyof typeof STATIC_CONTENT];
  if (!content) return null;

  const meta = STATIC_PAGE_META[type] || { icon: 'fa-file-alt', subtitle: '' };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="min-h-screen pb-20 bg-[#F5F5F8]">
      <PageTitle title={content.title} />
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-brand-700 via-brand-600 to-purple-500 pt-16 pb-20 px-4 relative overflow-hidden">
        <div className="absolute top-[-30%] right-[-10%] w-[350px] h-[350px] rounded-full bg-white/5 blur-[60px]" />
        <div className="absolute bottom-[-40%] left-[-5%] w-[300px] h-[300px] rounded-full bg-purple-400/10 blur-[50px]" />
        <div className="max-w-[900px] mx-auto relative z-10">
          <div className="w-14 h-14 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6 border border-white/20">
            <i className={`fas ${meta.icon} text-white text-xl`}></i>
          </div>
          <h1 className="text-[40px] font-[900] text-white mb-3 leading-tight tracking-tighter">{content.title}</h1>
          {meta.subtitle && <p className="text-white/60 font-medium text-base max-w-lg leading-relaxed">{meta.subtitle}</p>}
        </div>
      </div>
      {/* Content */}
      <div className="max-w-[900px] mx-auto px-4 -mt-10 relative z-20">
        <div className="bg-white rounded-[24px] p-8 md:p-14 shadow-[0_2px_32px_rgba(0,0,0,0.10)] mb-16">
          <div className="inner-content-renderer text-left" dangerouslySetInnerHTML={{ __html: content.content }} />
          
          {(type !== 'seller-policy' || user?.role === 'vendor') && (
            <div className="mt-16 bg-brand-50 rounded-2xl p-6 md:p-8 border border-brand-100 flex flex-col md:flex-row items-center gap-8">
              <div className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center shrink-0">
                <i className={`fas ${type === 'seller-policy' ? 'fa-store' : 'fa-life-ring'} text-white text-2xl`}></i>
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="font-black text-gray-900 text-lg mb-2">Still need help?</h3>
                <p className="text-gray-600 font-medium text-sm leading-relaxed mb-4">
                  {type === 'seller-policy' 
                    ? "If you couldn't find the answer in our partner resources, please open a support ticket. We provide priority 12-hour response times for vendors."
                    : "If you couldn't find the answer in our documentation, please open a support ticket. Our team is here to help you."}
                </p>
                <a href="mailto:admin.mamumarket@gmail.com" className="text-brand-600 font-bold text-sm hover:underline">admin.mamumarket@gmail.com</a>
              </div>
              <button 
                onClick={() => window.location.href = type === 'seller-policy' ? '/vendor-support' : '/contact'} 
                className="shrink-0 px-6 py-3 gradient-primary text-white font-black text-xs uppercase tracking-widest rounded-xl hover:opacity-90 transition-opacity"
              >
                {type === 'seller-policy' ? 'Open Vendor Ticket' : 'Open Support Ticket'}
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default StaticPageView;
