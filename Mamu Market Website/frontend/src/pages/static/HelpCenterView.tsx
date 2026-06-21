import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import PageTitle from '../../components/PageTitle';

const CUSTOMER_FAQS = [
  { id: 'shipping', category: 'Shipping & Delivery', icon: 'fa-truck', color: 'blue', items: [
    { q: 'How long does delivery take?', a: 'Inside Dhaka: 1–2 business days. Outside Dhaka: 3–5 business days. Remote areas may take 5–7 business days.' },
    { q: 'How much is the shipping fee?', a: 'Orders above ৳10,000 get free delivery. Orders ৳500–৳9,999 incur a ৳120 fee. Orders below ৳500 incur an ৳80 fee.' },
    { q: 'How do I track my order?', a: 'Log in and go to My Orders to see the current status of every order.' },
  ]},
  { id: 'returns', category: 'Returns & Refunds', icon: 'fa-undo', color: 'rose', items: [
    { q: 'How many days do I have to return a product?', a: 'You can return most items within 7 days of receiving them. The product must be unused and in its original packaging.' },
    { q: 'How will I receive my refund?', a: 'Once approved, the refund is sent to your original payment method (bKash, Nagad, or bank) within 5–7 business days.' },
    { q: 'What items cannot be returned?', a: 'Perishable goods, personal care items, and products with broken seals cannot be returned.' },
  ]},
  { id: 'payment', category: 'Payments & MFS', icon: 'fa-mobile-alt', color: 'emerald', items: [
    { q: 'Which payment methods are accepted?', a: 'We accept bKash, Nagad, Rocket, debit/credit cards, and Cash on Delivery (COD) nationwide.' },
    { q: 'How do I pay with bKash?', a: 'At checkout, select bKash, enter your number and confirm with your PIN. Payment is confirmed instantly.' },
    { q: 'Is Cash on Delivery available?', a: 'Yes, COD is available across all of Bangladesh. Please have the exact amount ready when your delivery arrives.' },
    { q: 'My bKash payment failed but money was deducted. What do I do?', a: 'Contact us within 24 hours with your transaction ID. We will reconcile it within 2–3 business days.' },
  ]},
  { id: 'account', category: 'Account & Login', icon: 'fa-user-circle', color: 'amber', items: [
    { q: 'I forgot my password. What do I do?', a: 'On the login page, click "Forgot Password" and follow the steps to reset via your registered email.' },
    { q: 'How do I update my profile?', a: 'Go to Settings → Profile from the dashboard to update your name, phone number, and address.' },
    { q: 'How do I change my delivery address?', a: 'Go to your account Settings and update your default address before placing an order.' },
  ]},
  { id: 'orders', category: 'Order Issues', icon: 'fa-box', color: 'purple', items: [
    { q: 'Can I cancel an order?', a: 'You can cancel an order while it is still in "Processing" status. Go to My Orders and select the order to cancel.' },
    { q: 'I received the wrong product. What should I do?', a: 'Contact us within 48 hours with a photo of the product. We will resolve it promptly.' },
    { q: 'My order is late. What should I do?', a: 'Check your order status in My Orders first. If it has been more than 7 days, contact our support team.' },
  ]},
];

const VENDOR_FAQS = [
  { id: 'payouts', category: 'Payouts & Fees', icon: 'fa-money-bill-wave', color: 'emerald', items: [
    { q: 'When do I receive my payout?', a: 'Payouts are processed weekly for completed orders past the 7-day return window. Funds are sent to your designated bKash, Nagad, or bank account.' },
    { q: 'What is the commission fee?', a: 'We charge a standard platform fee on successful sales. Please refer to your Seller Agreement for specific percentage details based on your category.' },
    { q: 'Why is my payout delayed?', a: 'Payouts may be delayed if there is an active customer dispute or if your banking details are incomplete. Please verify your settings.' },
  ]},
  { id: 'products', category: 'Products & Inventory', icon: 'fa-box-open', color: 'blue', items: [
    { q: 'How do I upload a product?', a: 'Go to Dashboard → Add Product, fill in the details, images, and price. The product goes live after a brief admin review.' },
    { q: 'Why was my product rejected?', a: 'Products are usually rejected for blurry images, prohibited items, or misleading descriptions. Check your registered email for the specific reason.' },
    { q: 'How do I update my stock?', a: 'Go to Dashboard → Inventory to quickly adjust stock levels or mark items as out of stock.' },
  ]},
  { id: 'orders', category: 'Order Management', icon: 'fa-truck', color: 'purple', items: [
    { q: 'How do I manage incoming orders?', a: 'Go to Dashboard → My Orders. You can review items, approve cancellations, and mark orders as Shipped once dispatched.' },
    { q: 'What happens if a customer cancels?', a: 'If a customer requests cancellation before you ship, you will be notified to review and approve the cancellation.' },
  ]},
  { id: 'account', category: 'Store & Verification', icon: 'fa-store', color: 'amber', items: [
    { q: 'How do I verify my store?', a: 'Complete your profile in Store Settings and upload your Trade License or NID. Verification takes 1-2 business days.' },
    { q: 'How do I become an Official Store?', a: 'Official status is granted to registered brands and top-performing vendors. Maintain a high rating and low dispute rate to qualify.' },
  ]},
];

const COLOR_MAP: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-600',
  rose: 'bg-rose-50 text-rose-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  indigo: 'bg-indigo-50 text-indigo-600',
  purple: 'bg-purple-50 text-purple-600',
};

const HelpCenterView: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [openItem, setOpenItem] = useState<string | null>(null);

  const activeFaqs = user?.role === 'vendor' ? VENDOR_FAQS : CUSTOMER_FAQS;

  const filtered = activeFaqs.map(cat => ({
    ...cat,
    items: cat.items.filter(
      item =>
        item.q.toLowerCase().includes(search.toLowerCase()) ||
        item.a.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(cat =>
    (activeCategory === null || cat.id === activeCategory) &&
    (search === '' || cat.items.length > 0)
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="min-h-screen pb-20 bg-[#F5F5F8]">
      <PageTitle title="Help Center" />
      {/* Hero Header with Search */}
      <div className="bg-gradient-to-br from-brand-700 via-brand-600 to-purple-500 pt-16 pb-24 px-4 relative overflow-hidden">
        <div className="absolute top-[-30%] right-[-10%] w-[350px] h-[350px] rounded-full bg-white/5 blur-[60px]" />
        <div className="absolute bottom-[-40%] left-[-5%] w-[300px] h-[300px] rounded-full bg-purple-400/10 blur-[50px]" />
        <div className="max-w-[860px] mx-auto relative z-10">
          <div className="w-14 h-14 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6 border border-white/20">
            <i className="fas fa-life-ring text-white text-xl"></i>
          </div>
          <h1 className="text-[40px] font-[900] text-white mb-3 leading-tight tracking-tighter">Help Center</h1>
          <p className="text-white/60 font-medium mb-8">Find answers to common questions about Mamu Market.</p>

          {/* Search inside hero */}
          <div className="relative max-w-lg">
            <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-white/40"></i>
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setActiveCategory(null); }}
              placeholder="Search help articles... (e.g. bKash, return, delivery)"
              className="w-full bg-white/15 backdrop-blur-sm border border-white/20 rounded-2xl pl-12 pr-12 py-4 outline-none focus:bg-white/25 focus:border-white/40 transition-all font-semibold text-sm text-white placeholder-white/40"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
                <i className="fas fa-times"></i>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-[860px] mx-auto px-4 -mt-10 relative z-20">
        <div className="bg-white rounded-[24px] p-8 md:p-14 shadow-[0_2px_32px_rgba(0,0,0,0.10)]">



          {/* Category chips */}
          {!search && (
            <div className="flex flex-wrap gap-2 mb-8">
              <button
                onClick={() => setActiveCategory(null)}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all border-2 ${activeCategory === null ? 'bg-brand-600 text-white border-brand-600' : 'bg-gray-50 text-gray-500 border-gray-100 hover:border-brand-300'}`}
              >
                All Topics
              </button>
              {activeFaqs.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all border-2 ${activeCategory === cat.id ? 'bg-brand-600 text-white border-brand-600' : 'bg-gray-50 text-gray-500 border-gray-100 hover:border-brand-300'}`}
                >
                  <i className={`fas ${cat.icon} mr-1.5`}></i>{cat.category}
                </button>
              ))}
            </div>
          )}

          {/* Search results count */}
          {search && (
            <p className="text-xs font-bold text-gray-400 mb-6">
              {filtered.reduce((acc, c) => acc + c.items.length, 0)} result(s) for "{search}"
            </p>
          )}

          {/* FAQ sections */}
          <div className="space-y-8">
            {filtered.map(cat => cat.items.length > 0 && (
              <div key={cat.id}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${COLOR_MAP[cat.color]}`}>
                    <i className={`fas ${cat.icon} text-sm`}></i>
                  </div>
                  <h2 className="font-black text-gray-900 text-lg">{cat.category}</h2>
                </div>
                <div className="space-y-2">
                  {cat.items.map((item, i) => {
                    const key = `${cat.id}-${i}`;
                    const isOpen = openItem === key;
                    return (
                      <div key={i} className="border border-gray-100 rounded-2xl overflow-hidden">
                        <button
                          onClick={() => setOpenItem(isOpen ? null : key)}
                          className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-all"
                        >
                          <span className="font-bold text-gray-800 text-sm pr-4">{item.q}</span>
                          <i className={`fas fa-chevron-down text-gray-300 text-xs transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`}></i>
                        </button>
                        {isOpen && (
                          <div className="px-6 pb-4 text-sm text-gray-500 font-medium leading-relaxed border-t border-gray-50">
                            <div className="pt-3">{item.a}</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {filtered.every(c => c.items.length === 0) && (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-search text-gray-300 text-2xl"></i>
                </div>
                <p className="font-black text-gray-400">No results found for "{search}"</p>
                <p className="text-sm text-gray-300 font-medium mt-1">Try different keywords or browse by category</p>
              </div>
            )}
          </div>

          {/* Contact box */}
          <div className={`border rounded-2xl p-8 mt-10 flex flex-col md:flex-row items-center justify-between gap-6 ${user?.role === 'vendor' ? 'bg-indigo-50 border-indigo-100' : 'bg-brand-50 border-brand-100'}`}>
            <div className="flex items-center gap-6">
              <div className={`w-14 h-14 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${user?.role === 'vendor' ? 'bg-indigo-600 shadow-indigo-500/20' : 'bg-brand-600 shadow-brand-500/20'}`}>
                <i className={`fas ${user?.role === 'vendor' ? 'fa-store' : 'fa-headset'} text-2xl`}></i>
              </div>
              <div>
                <h3 className="font-black text-gray-900 mb-1 text-lg">Still need help?</h3>
                <p className="text-sm text-gray-600 font-medium max-w-md mb-3">
                  {user?.role === 'vendor' 
                    ? "If you couldn't find the answer in our partner resources, please open a support ticket. We provide priority 12-hour response times for vendors."
                    : "If you couldn't find the answer above, feel free to contact our customer support team directly. Our dedicated support team is ready to assist you."}
                </p>
                <p className={`text-sm font-black ${user?.role === 'vendor' ? 'text-indigo-600' : 'text-brand-600'}`}>
                  admin.mamumarket@gmail.com
                </p>
              </div>
            </div>
            <button 
              onClick={() => navigate(user?.role === 'vendor' ? '/vendor-support' : '/contact')}
              className={`shrink-0 px-8 py-4 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all hover:-translate-y-1 ${user?.role === 'vendor' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/30' : 'gradient-primary hover:opacity-90 shadow-lg shadow-brand-500/30'}`}
            >
              {user?.role === 'vendor' ? 'Open Vendor Ticket' : 'Contact Support'}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default HelpCenterView;
