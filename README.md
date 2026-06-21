# 🛒 Mamu Market

![Mamu Market Banner](https://via.placeholder.com/1200x400/111827/FFFFFF?text=Mamu+Market+-+Multi-Vendor+E-Commerce+Platform)

Mamu Market is a modern, high-performance **Multi-Vendor E-Commerce Platform** built for scale and aesthetic appeal. Featuring a cutting-edge tech stack, the platform offers a seamless shopping experience for customers, robust store management for vendors, and comprehensive oversight tools for platform administrators.

---

## ✨ Key Features

### 👤 For Customers
- **Dynamic Shopping Experience**: Beautiful, animated UI powered by React 19 and framer-motion.
- **Cart & Wishlist**: Real-time cart calculation, wishlist synchronization, and seamless checkout flows.
- **Order Tracking**: Interactive visual timeline to track order status (Processing, Shipped, Delivered).
- **Customer Support**: Built-in support ticket system for direct communication with admins.

### 🏪 For Vendors
- **Store Management**: Dedicated dashboard for inventory tracking, order fulfillment, and revenue analytics.
- **Product Submissions**: Easily list new products with built-in image cropping and category selection.
- **Customer Engagement**: Reply directly to customer reviews and manage promotional discount codes.

### ⚙️ For Administrators
- **Complete Oversight**: Centralized dashboard to monitor GMV, platform revenue, and user metrics.
- **Approval Workflows**: Review and approve/reject new vendors, products, and marketing campaigns.
- **Marketing Control**: Manage the homepage Hero Banners, Top Tickers, and global product categories.
- **Support & Moderation**: Integrated helpdesk for resolving tickets and monitoring user reports.

---

## 🛠 Tech Stack

**Frontend**
- **Framework**: [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Animations**: [Motion](https://motion.dev/) (formerly Framer Motion)
- **Routing**: [React Router v6](https://reactrouter.com/)
- **Data Visualization**: [Recharts](https://recharts.org/)
- **UI Components**: `react-image-crop`, `react-markdown`

**Backend / Infrastructure**
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL, Realtime Subscriptions, Edge Functions)
- **Storage**: Supabase Storage for secure product and profile image hosting
- **Email Service**: [EmailJS](https://www.emailjs.com/) for automated transactional emails

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- A Supabase Project (with Edge Functions enabled)
- An EmailJS Account

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up Environment Variables**
   Create a `.env` file in the `frontend` directory and add your credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   
   # EmailJS Configuration
   VITE_EMAILJS_SERVICE_ID=your_service_id
   VITE_EMAILJS_TEMPLATE_ID_STATUS=your_status_template
   VITE_EMAILJS_PUBLIC_KEY=your_public_key
   ```

3. **Start the Development Server**
   ```bash
   npm run dev
   ```

---

## 🛡️ Architecture & Security
- **Row Level Security (RLS)**: Strictly enforced at the Supabase PostgreSQL layer to ensure data privacy between vendors and customers.
- **Realtime Synchronization**: Utilizes Supabase Realtime channels to instantly push UI updates for orders, tickets, and inventory changes without manual page refreshes.
- **Stale-While-Revalidate**: Frontend caching implementation to ensure lightning-fast page loads while quietly updating data in the background.

---

## 📜 License
This project is proprietary and confidential. Unauthorized copying, distribution, or use of this source code is strictly prohibited.
