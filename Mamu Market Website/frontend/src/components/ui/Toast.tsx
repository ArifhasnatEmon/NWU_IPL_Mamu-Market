import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

const ERROR_KEYWORDS = [
  'invalid', 'incorrect', 'wrong', 'failed', 'error', 'denied',
  'rejected', 'not found', 'already registered', 'cannot', 'pending',
  'please sign in', 'please use', 'not a merchant', 'out of stock',
  'please fill', 'please add', 'please upload', 'please select',
  'storage limit', 'exceeded', 'too many', 'please wait', 'suspended',
  'unauthorized'
];

const Toast: React.FC<{ message: string, onClose: () => void }> = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const isError = ERROR_KEYWORDS.some(k => message.toLowerCase().includes(k));

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: 20, x: 20 }}
        animate={{ opacity: 1, y: 0, x: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed top-24 right-6 z-[100]"
      >
        <div className="glass px-6 py-4 rounded-[1.5rem] shadow-2xl flex items-center gap-4 border border-white/40">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg ${isError ? 'bg-red-500 shadow-red-500/20' : 'gradient-primary shadow-brand-500/20'}`}>
            <i className={`fas ${isError ? 'fa-times' : 'fa-check'}`}></i>
          </div>
          <div>
            <p className="font-black text-sm text-gray-900">{isError ? 'Error' : 'Success'}</p>
            <p className="text-xs font-medium text-gray-500">{message}</p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default Toast;
