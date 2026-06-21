import { sendCustomEmail } from './emailService';

export const emailTemplates = {
  // Welcome Emails
  welcomeVendor: async (email: string, name: string) => {
    const title = 'Welcome to Mamu Affiliate Program! 🚀';
    const message = `
      <h2>Congratulations, ${name}!</h2>
      <p>Your vendor account is now active.</p>
      <br/>
      <b>Your Next Steps:</b><br/>
      1. Setup your store profile<br/>
      2. Upload your products<br/>
      3. Start selling to millions of customers!
      <br/><br/>
      <a href="https://mamumarket.com/vendor/dashboard" style="display:inline-block; background:#7c3aed; color:#fff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:bold;">Go to Vendor Dashboard</a>
    `;
    return await sendCustomEmail(email, name, title, message);
  },

  welcomeUser: async (email: string, name: string) => {
    const title = 'Welcome to Mamu Market! 🎉';
    const message = `
      <h2>Hi ${name}, welcome to the family!</h2>
      <p>Your account has been successfully created. You are now ready to explore millions of products from world-class vendors.</p>
      <br/>
      <a href="https://mamumarket.com" style="display:inline-block; background:#7c3aed; color:#fff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:bold;">Start Shopping</a>
    `;
    return await sendCustomEmail(email, name, title, message);
  },

  // Order Emails
  orderConfirmation: async (email: string, name: string, orderId: string, itemsListHtml: string, total: string) => {
    const title = `Order Confirmation #${orderId}`;
    const message = `
      <h2>Thank you for your order, ${name}!</h2>
      <p>We have received your order and are processing it now.</p>
      <div style="background:#f9fafb; padding:20px; border-radius:8px; margin:20px 0; border: 1px solid #e5e7eb;">
        ${itemsListHtml}
        <hr style="border:none; border-top:1px solid #e5e7eb; margin:16px 0;"/>
        <strong style="font-size: 18px;">Total: ৳${total}</strong>
      </div>
    `;
    return await sendCustomEmail(email, name, title, message);
  },

  // Vendor & Product Updates
  productStatusUpdate: async (email: string, name: string, productName: string, status: 'Approved' | 'Rejected', reason?: string) => {
    const title = `Product Update: ${productName}`;
    const color = status === 'Approved' ? '#10b981' : '#ef4444';
    const message = `
      <h2>Product <span style="color:${color}">${status}</span></h2>
      <p>Hi ${name},</p>
      <p>Your product listing for <strong>"${productName}"</strong> has been reviewed by our admin team.</p>
      ${reason ? `<div style="background:#fef2f2; padding:16px; border-left:4px solid #ef4444; margin:16px 0;"><strong>Reason:</strong> ${reason}</div>` : ''}
      <br/>
      <a href="https://mamumarket.com/vendor/inventory" style="display:inline-block; background:#111827; color:#fff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:bold;">View Inventory</a>
    `;
    return await sendCustomEmail(email, name, title, message);
  },

  vendorRequestStatus: async (email: string, name: string, requestType: string, status: 'Approved' | 'Rejected' | 'Acknowledged') => {
    const title = `${requestType} Request ${status}`;
    const color = status === 'Approved' ? '#10b981' : '#ef4444';
    const message = `
      <h2>Request <span style="color:${color}">${status}</span></h2>
      <p>Hi ${name},</p>
      <p>Your recent request regarding <strong>${requestType}</strong> has been <strong>${status.toLowerCase()}</strong> by our admin team.</p>
      <br/>
      <a href="https://mamumarket.com/vendor/dashboard" style="display:inline-block; background:#111827; color:#fff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:bold;">View Dashboard</a>
    `;
    return await sendCustomEmail(email, name, title, message);
  },

  // Feedback & Delivery
  feedbackRequest: async (email: string, name: string) => {
    const title = `How was your experience? ⭐`;
    const message = `
      <h2>We'd love your feedback!</h2>
      <p>Hi ${name}, your recent Mamu Market order has been delivered.</p>
      <p>Please take 2 minutes to rate your experience and help us improve our service.</p>
      <br/>
      <a href="https://mamumarket.com/feedback" style="display:inline-block; background:#fbbf24; color:#fff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:bold; font-size:18px;">★★★★★ Rate Us</a>
    `;
    return await sendCustomEmail(email, name, title, message);
  },

  // Support Tickets
  ticketReplyAdmin: async (email: string, name: string, ticketId: string, replyText: string) => {
    const title = `Support Ticket Updated: ${ticketId}`;
    const message = `
      <h2>New Reply from Support</h2>
      <p>Hi ${name},</p>
      <p>An admin has replied to your support ticket <strong>${ticketId}</strong>:</p>
      <div style="background:#f9fafb; padding:20px; border-radius:8px; margin:20px 0; border: 1px solid #e5e7eb; font-style: italic;">
        "${replyText}"
      </div>
      <br/>
      <a href="https://mamumarket.com/contact" style="display:inline-block; background:#7c3aed; color:#fff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:bold;">View My Tickets</a>
    `;
    return await sendCustomEmail(email, name, title, message);
  }
};
