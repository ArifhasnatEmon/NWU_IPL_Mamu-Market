export const STATIC_CONTENT = {
  'about-us': {
    title: 'About Mamu Market',
    content: `
      <div class="space-y-12">
        <section>
          <h2 class="text-gradient">Our Story</h2>
          <p>Mamu Market was founded in 2025 with one clear mission — to build a world-class digital marketplace for Bangladesh's growing community of entrepreneurs and small business owners. We saw that thousands of talented sellers lacked the tools to reach a wider audience, and we built Mamu Market to change that.</p>
          <p>Today, Mamu Market is one of Bangladesh's fastest-growing multi-vendor platforms, connecting buyers and sellers across the country with everything from fashion and electronics to handcrafts and home goods — all in one place.</p>
        </section>

        <section class="grid grid-cols-1 md:grid-cols-3 gap-6 my-12">
          <div class="p-8 bg-grad-soft rounded-2xl border border-brand-100 text-center">
            <div class="text-3xl font-black text-brand-600 mb-2">500+</div>
            <div class="text-xs font-black uppercase tracking-widest text-gray-400">Vendors</div>
          </div>
          <div class="p-8 bg-grad-soft rounded-2xl border border-brand-100 text-center">
            <div class="text-3xl font-black text-brand-600 mb-2">10,000+</div>
            <div class="text-xs font-black uppercase tracking-widest text-gray-400">Products Listed</div>
          </div>
          <div class="p-8 bg-grad-soft rounded-2xl border border-brand-100 text-center">
            <div class="text-3xl font-black text-brand-600 mb-2">50,000+</div>
            <div class="text-xs font-black uppercase tracking-widest text-gray-400">Happy Customers</div>
          </div>
        </section>

        <section>
          <h2 class="text-gradient">Our Mission</h2>
          <p>Our mission is to empower Bangladesh's small and medium entrepreneurs by connecting them to the digital economy. By removing barriers and leveraging technology, we aim to build a marketplace where every seller can grow and every buyer finds the best products at fair prices.</p>
        </section>

        <section>
          <h2 class="text-gradient">Our Values</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
            <div>
              <h3 class="font-bold text-gray-900 mb-2">Transparency</h3>
              <p>We believe in honest, open business practices. Our commission structure, policies, and processes are clearly communicated to every vendor and buyer on the platform.</p>
            </div>
            <div>
              <h3 class="font-bold text-gray-900 mb-2">Customer First</h3>
              <p>Every feature we build and every decision we make centers on the customer experience. Your satisfaction is our most important metric.</p>
            </div>
            <div>
              <h3 class="font-bold text-gray-900 mb-2">Empowering Sellers</h3>
              <p>We give our merchants advanced analytics, marketing tools, and dedicated support so they can focus on what they do best — building great products.</p>
            </div>
            <div>
              <h3 class="font-bold text-gray-900 mb-2">Sustainable Growth</h3>
              <p>We are committed to building a business that lasts — one that benefits our users, our team, and the communities we serve across Bangladesh.</p>
            </div>
          </div>
        </section>

        <section>
          <h2 class="text-gradient">Get in Touch</h2>
          <div class="grid grid-cols-1 md:grid-cols-1 gap-6 mt-6 max-w-sm">
            <div class="p-6 bg-gray-50 rounded-2xl flex items-start gap-4">
              <div class="w-10 h-10 bg-brand-100 text-brand-600 rounded-xl flex items-center justify-center shrink-0"><i class="fas fa-envelope"></i></div>
              <div><p class="font-black text-gray-900 text-sm mb-1">Email</p><p class="text-sm text-gray-500">admin.mamumarket@gmail.com</p></div>
            </div>
          </div>
        </section>
      </div>
    `
  },
  'help-center': {
    title: 'Help Center',
    content: `
      <div class="space-y-12">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <a href="#shipping" class="p-8 bg-white border border-gray-100 rounded-2xl hover:shadow-xl hover:-translate-y-1 transition-all group">
            <div class="w-14 h-14 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6 group-hover:gradient-primary group-hover:text-white transition-all"><i class="fas fa-truck text-2xl"></i></div>
            <h3 class="font-black text-gray-900 mb-2">Shipping & Delivery</h3>
            <p class="text-sm text-gray-500 font-medium">Delivery times, charges and order tracking.</p>
          </a>
          <a href="#returns" class="p-8 bg-white border border-gray-100 rounded-2xl hover:shadow-xl hover:-translate-y-1 transition-all group">
            <div class="w-14 h-14 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-6 group-hover:gradient-primary group-hover:text-white transition-all"><i class="fas fa-undo text-2xl"></i></div>
            <h3 class="font-black text-gray-900 mb-2">Returns & Refunds</h3>
            <p class="text-sm text-gray-500 font-medium">How to return products and get your money back.</p>
          </a>
          <a href="#payment" class="p-8 bg-white border border-gray-100 rounded-2xl hover:shadow-xl hover:-translate-y-1 transition-all group">
            <div class="w-14 h-14 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-6 group-hover:gradient-primary group-hover:text-white transition-all"><i class="fas fa-mobile-alt text-2xl"></i></div>
            <h3 class="font-black text-gray-900 mb-2">Payments & MFS</h3>
            <p class="text-sm text-gray-500 font-medium">bKash, Nagad, Rocket and other payment options.</p>
          </a>
          <a href="#account" class="p-8 bg-white border border-gray-100 rounded-2xl hover:shadow-xl hover:-translate-y-1 transition-all group">
            <div class="w-14 h-14 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-6 group-hover:gradient-primary group-hover:text-white transition-all"><i class="fas fa-user-circle text-2xl"></i></div>
            <h3 class="font-black text-gray-900 mb-2">Account & Login</h3>
            <p class="text-sm text-gray-500 font-medium">Profile, password and security settings.</p>
          </a>
          <a href="#vendor" class="p-8 bg-white border border-gray-100 rounded-2xl hover:shadow-xl hover:-translate-y-1 transition-all group">
            <div class="w-14 h-14 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-6 group-hover:gradient-primary group-hover:text-white transition-all"><i class="fas fa-store text-2xl"></i></div>
            <h3 class="font-black text-gray-900 mb-2">Vendor Support</h3>
            <p class="text-sm text-gray-500 font-medium">Store management, products and payouts.</p>
          </a>
          <a href="#orders" class="p-8 bg-white border border-gray-100 rounded-2xl hover:shadow-xl hover:-translate-y-1 transition-all group">
            <div class="w-14 h-14 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-6 group-hover:gradient-primary group-hover:text-white transition-all"><i class="fas fa-box text-2xl"></i></div>
            <h3 class="font-black text-gray-900 mb-2">Order Issues</h3>
            <p class="text-sm text-gray-500 font-medium">Cancellations, changes and order problems.</p>
          </a>
        </div>

        <div class="pt-8">
          <h2 id="shipping" class="text-gradient">Shipping & Delivery</h2>
          <h3 class="font-bold text-gray-900 mt-6">How long does delivery take?</h3>
          <p>Inside Dhaka: 1–2 business days. Outside Dhaka: 3–5 business days. Remote areas may take up to 5–7 business days.</p>
          <h3 class="font-bold text-gray-900 mt-6">How much is the shipping fee?</h3>
          <p>Orders above ৳10,000 get free delivery. Orders ৳500–৳9,999 incur a ৳120 shipping fee. Orders below ৳500 incur an ৳80 fee.</p>
          <h3 class="font-bold text-gray-900 mt-6">How do I track my order?</h3>
          <p>Log in to your account and go to <strong>My Orders</strong> to see the current status of every order.</p>

          <h2 id="returns" class="text-gradient mt-16">Returns & Refunds</h2>
          <h3 class="font-bold text-gray-900 mt-6">How many days do I have to return a product?</h3>
          <p>You can return most items within 7 days of receiving them. The product must be unused and in its original packaging.</p>
          <h3 class="font-bold text-gray-900 mt-6">How will I receive my refund?</h3>
          <p>Once your return is approved, the refund is sent to your original payment method (bKash, Nagad, or bank account) within 5–7 business days.</p>

          <h2 id="payment" class="text-gradient mt-16">Payments & MFS</h2>
          <h3 class="font-bold text-gray-900 mt-6">Which payment methods are accepted?</h3>
          <p>We accept bKash, Nagad, Rocket, debit/credit cards, and Cash on Delivery (COD) nationwide.</p>
          <h3 class="font-bold text-gray-900 mt-6">How do I pay with bKash?</h3>
          <p>At checkout, select bKash, enter your number and confirm with your PIN. Payment is confirmed instantly.</p>
          <h3 class="font-bold text-gray-900 mt-6">Is Cash on Delivery available?</h3>
          <p>Yes, COD is available all across Bangladesh. Please have the exact amount ready when your delivery arrives.</p>

          <h2 id="account" class="text-gradient mt-16">Account & Login</h2>
          <h3 class="font-bold text-gray-900 mt-6">I forgot my password. What do I do?</h3>
          <p>On the login page, click "Forgot Password" and follow the steps to reset your password via your registered email.</p>
          <h3 class="font-bold text-gray-900 mt-6">How do I update my profile?</h3>
          <p>Go to <strong>Settings → Profile</strong> from the top menu to update your name, phone number, and address.</p>

          <h2 id="vendor" class="text-gradient mt-16">Vendor Support</h2>
          <h3 class="font-bold text-gray-900 mt-6">How do I become a vendor?</h3>
          <p>Click "Become a Vendor" on the homepage, fill out the registration form and submit. Your account will be activated once admin approves your application.</p>
          <h3 class="font-bold text-gray-900 mt-6">How do I upload a product?</h3>
          <p>Go to <strong>Dashboard → Add Product</strong>, fill in the details, images and price. The product goes live after admin approval.</p>
          <h3 class="font-bold text-gray-900 mt-6">When do I receive my payout?</h3>
          <p>Payouts are processed weekly for completed orders past the 7-day return window, sent directly to your bKash, Nagad, or bank account.</p>

          <h2 id="orders" class="text-gradient mt-16">Order Issues</h2>
          <h3 class="font-bold text-gray-900 mt-6">Can I cancel an order?</h3>
          <p>You can cancel an order while it is still in "Processing" status. Go to <strong>My Orders</strong> and select the order to cancel.</p>
          <h3 class="font-bold text-gray-900 mt-6">I received the wrong product. What should I do?</h3>
          <p>Contact us within 48 hours at admin.mamumarket@gmail.com with a photo of the product. We will resolve it promptly.</p>
        </div>

        <div class="bg-brand-50 border border-brand-100 rounded-2xl p-8 mt-8 flex items-start gap-6">
          <div class="w-12 h-12 bg-brand-600 text-white rounded-xl flex items-center justify-center shrink-0"><i class="fas fa-headset text-xl"></i></div>
          <div>
            <h3 class="font-black text-gray-900 mb-1">Still need help?</h3>
            <p class="text-sm text-gray-600 font-medium mb-3">Our support team is available every day from 9 AM to 10 PM.</p>
            <p class="text-sm font-black text-brand-600">admin.mamumarket@gmail.com</p>
          </div>
        </div>
      </div>
    `
  },
  'terms': {
    title: 'Terms & Conditions',
    content: `
      <div class="space-y-8">
        <section>
          <h2 class="text-gradient">1. Introduction</h2>
          <p>Welcome to Mamu Market. These Terms & Conditions govern your use of our platform and services. By accessing or using Mamu Market, you agree to be bound by these terms. If you do not agree, please refrain from using our platform.</p>
        </section>
        <section>
          <h2 class="text-gradient">2. User Accounts</h2>
          <p>To access certain features, you must create an account. You are responsible for keeping your credentials confidential and for all activity under your account. You must be at least 18 years old to register.</p>
        </section>
        <section>
          <h2 class="text-gradient">3. Purchases & Payments</h2>
          <p>All purchases are subject to product availability. We reserve the right to refuse or cancel any order. We accept bKash, Nagad, Rocket, debit/credit cards, and Cash on Delivery. You agree to provide accurate billing information for every purchase.</p>
        </section>
        <section>
          <h2 class="text-gradient">4. Vendor Terms</h2>
          <p>All vendors must comply with our Merchant Guidelines — including maintaining product quality, timely order fulfillment, and professional customer communication. Mamu Market reserves the right to suspend accounts that violate these standards.</p>
        </section>
        <section>
          <h2 class="text-gradient">5. Prohibited Activities</h2>
          <p>Users may not use the platform for any illegal or unauthorized purpose, including fraud, harassment, distributing malware, or infringing on intellectual property rights.</p>
        </section>
        <section>
          <h2 class="text-gradient">6. Account Termination</h2>
          <p>We reserve the right to terminate or suspend your account at our sole discretion, without notice, for conduct that violates these Terms or is harmful to other users or our business.</p>
        </section>
        <section>
          <h2 class="text-gradient">7. Governing Law</h2>
          <p>These Terms & Conditions are governed by the laws of Bangladesh. Any disputes will be settled in the appropriate courts of Bangladesh.</p>
        </section>
      </div>
    `
  },
  'privacy': {
    title: 'Privacy Policy',
    content: `
      <div class="space-y-8">
        <section>
          <h2 class="text-gradient">1. Information We Collect</h2>
          <p>We collect information you provide when creating an account, making a purchase, or contacting support — including your name, email, phone number, delivery address, and payment details.</p>
        </section>
        <section>
          <h2 class="text-gradient">2. How We Use Your Information</h2>
          <p>We use your information to process transactions, provide customer support, personalize your shopping experience, and send you important updates about your orders or our services.</p>
        </section>
        <section>
          <h2 class="text-gradient">3. Data Security</h2>
          <p>We use industry-standard encryption to keep your personal information secure. Our systems are built to protect your data at all times.</p>
        </section>
        <section>
          <h2 class="text-gradient">4. Third-Party Sharing</h2>
          <p>We do not sell your personal data. We only share necessary information with trusted partners — such as bKash, Nagad, and delivery services — solely to complete your transactions.</p>
        </section>
        <section>
          <h2 class="text-gradient">5. Your Rights</h2>
          <p>You have the right to access, update, or delete your personal information at any time. Most details can be updated directly from your account's Settings page.</p>
        </section>
        <section>
          <h2 class="text-gradient">6. Contact</h2>
          <p>If you have any questions about this Privacy Policy, please contact us at admin.mamumarket@gmail.com.</p>
        </section>
      </div>
    `
  },
  'return-policy': {
    title: 'Return & Refund Policy',
    content: `
      <div class="space-y-8">
        <section>
          <h2 class="text-gradient">1. 7-Day Return Window</h2>
          <p>We want you to be completely satisfied with your purchase. If you're not, you can return most items within 7 days of receiving them for a full refund or exchange.</p>
        </section>
        <section>
          <h2 class="text-gradient">2. Eligibility</h2>
          <p>To be eligible for a return, your item must be unused, in its original condition with tags attached, in its original packaging, and accompanied by proof of purchase (order number).</p>
        </section>
        <section>
          <h2 class="text-gradient">3. Refund Process</h2>
          <p>Once we receive and inspect your return, we will notify you. If approved, your refund will be processed to your original payment method (bKash, Nagad, or bank account) within 5–7 business days.</p>
        </section>
        <section>
          <h2 class="text-gradient">4. Non-Returnable Items</h2>
          <p>The following cannot be returned: perishable goods, custom or personalized products, personal care items (cosmetics, undergarments), and digital products.</p>
        </section>
        <section>
          <h2 class="text-gradient">5. How to Start a Return</h2>
          <p>Email admin.mamumarket@gmail.com with your order number and photos of the item. We will guide you through the next steps and arrange pickup or drop-off if approved.</p>
        </section>
      </div>
    `
  },
  'seller-policy': {
    title: 'Seller Policies',
    content: `
      <div class="space-y-8">
        <section>
          <h2 class="text-gradient">1. Vendor Requirements</h2>
          <p>All merchants on Mamu Market must provide valid business information and maintain high standards of product quality and customer service. Vendors are required to respond to customer inquiries within 24 hours.</p>
        </section>
        <section>
          <h2 class="text-gradient">2. Commission Structure</h2>
          <p>Mamu Market operates on a transparent commission model. We charge a flat 10% fee on successful sales, covering platform maintenance, payment processing, and basic marketing support.</p>
        </section>
        <section>
          <h2 class="text-gradient">3. Prohibited Items</h2>
          <p>Vendors are prohibited from listing illegal, counterfeit, or hazardous items — including weapons, prescription drugs, and anything that infringes on intellectual property rights.</p>
        </section>
        <section>
          <h2 class="text-gradient">4. Payout Schedule</h2>
          <p>Payouts are processed weekly for all completed orders past the 7-day return window. Funds are sent directly to your registered bKash, Nagad, or bank account.</p>
        </section>
        <section>
          <h2 class="text-gradient">5. Product Approval</h2>
          <p>After uploading a product, the admin team reviews it within 24–48 hours. Approved products appear on the marketplace immediately. Products that don't meet our standards will be returned with feedback.</p>
        </section>
        <section>
          <h2 class="text-gradient">6. Dispute Resolution</h2>
          <p>In case of a dispute between a buyer and seller, Mamu Market provides a mediation service. We encourage amicable solutions but reserve the right to make a final binding decision.</p>
        </section>
        <section class="bg-brand-50 border border-brand-100 rounded-2xl p-8">
          <h3 class="font-black text-gray-900 mb-2">Interested in becoming a vendor?</h3>
          <p class="text-sm text-gray-600 mb-3">Join thousands of sellers already growing their business on Mamu Market.</p>
          <p class="font-black text-brand-600">admin.mamumarket@gmail.com</p>
        </section>
      </div>
    `
  },
  'promote-item': {
    title: 'Promote Items',
    content: ``
  }
};
