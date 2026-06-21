import { Product } from './product';
import { User, VendorRequest, ProductUpdate, ReportedReview, ReportedProduct } from './user';

export interface AdminDashboardData {
  users: User[];
  pendingProducts: Product[];
  pendingUpdates: ProductUpdate[];
  removeRequests: VendorRequest[];
  categoryRequests: VendorRequest[];
  categorySuggestions: VendorRequest[];
  storeNameRequests: VendorRequest[];
  verificationRequests: VendorRequest[];
  accountDeleteRequests: VendorRequest[];
  approvedProducts: Product[];
  reportedReviews: ReportedReview[];
  reportedProducts: ReportedProduct[];
  vendorRequests: User[];
}
