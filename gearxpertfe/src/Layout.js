import { Suspense, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { useSelector } from "react-redux";
import { ToastContainer } from "react-toastify";
import Aos from "aos";

import Homepage from "./pages/Homepage/Homepage";
import GlobalLoadingOverlay from "./components/common/GlobalLoadingOverlay";
import RouteHandler from "./components/common/RouteHandler";
import ScrollToTop from "./components/common/ScrollToTop";

// Supplier layout + pages
import SupplierLayout from "./components/layout/SupplierLayout";
import SupplierDashboard from "./pages/Supplier/SupplierDashboard";
import SupplierDevicesList from "./pages/Supplier/SupplierDevicesList";
import SupplierDeviceDetailPage from "./pages/Supplier/SupplierDeviceDetailPage";
import SupplierEditDevicePage from "./pages/Supplier/SupplierEditDevicePage";
import SupplierAddDevicePage from "./pages/Supplier/SupplierAddDevicePage";
import SupplierRentalRequests from "./pages/Supplier/SupplierRentalRequests";
import SupplierRentalDetailPage from "./pages/Supplier/SupplierRentalDetailPage";
import SupplierExtensionRequests from "./pages/Supplier/SupplierExtensionRequests";
import SupplierMaintenance from "./pages/Supplier/SupplierMaintenance";
import SupplierRevenue from "./pages/Supplier/SupplierRevenue";
import SupplierInventoryPage from "./pages/Supplier/SupplierInventoryPage";
import SupplierVouchersPage from "./pages/Supplier/SupplierVouchersPage";
import SupplierIssuesPage from "./pages/Supplier/SupplierIssuesPage";
import SupplierIssueDetailPage from "./pages/Supplier/SupplierIssueDetailPage";
import SupplierCalendarPage from "./pages/Supplier/SupplierCalendarPage";
import SupplierAiPricingPage from "./pages/Supplier/SupplierAiPricingPage";
import SupplierAdsPage from "./pages/Supplier/SupplierAdsPage";
import SupplierNotificationsPage from "./pages/Supplier/SupplierNotificationsPage";
import SupplierReviewsPage from "./pages/Supplier/SupplierReviewsPage";

import AdminLayout from "./components/layout/AdminLayout";
import DashboardPage from "./pages/Admin/DashboardPage";
import UsersPage from "./pages/Admin/UsersPage";
import SuppliersPage from "./pages/Admin/SuppliersPage";
import SupplierOnboardingPage from "./pages/Admin/SupplierOnboardingPage";
import DevicesModerationPage from "./pages/Admin/DevicesModerationPage";
import RentalsPage from "./pages/Admin/RentalsPage";
import ReportsPage from "./pages/Admin/ReportsPage";
import SettingsPage from "./pages/Admin/SettingsPage";
import AdminVouchersPage from "./pages/Admin/AdminVouchersPage";
import AdminAdsPage from "./pages/Admin/AdminAdsPage";
import BlogManagement from "./pages/Admin/BlogManagement";
import CommentManagement from "./pages/Admin/CommentManagement";
import AdminBroadcastPage from "./pages/Admin/AdminBroadcastPage";
import AdminShopReports from "./pages/Admin/AdminShopReports";
import AdminWalletPage from "./pages/Admin/AdminWalletPage";
import AdminWithdrawalsPage from "./pages/Admin/AdminWithdrawalsPage";
import AdminCompensationReviewsPage from "./pages/Admin/AdminCompensationReviewsPage";
import AdminPendingIssueReviewsPage from "./pages/Admin/AdminPendingIssueReviewsPage";
import AdminIssueInvestigationPage from "./pages/Admin/AdminIssueInvestigationPage";
import AdminSupplierDetailPage from "./pages/Admin/AdminSupplierDetailPage";
import OperationStaffPage from "./pages/Admin/OperationStaffPage";

// pages
import RentalCheckout from "./pages/Rental/RentalCheckout";
import ProductDetailPage from "./pages/Device/ProductDetailPage";
import WalletPage from "./pages/User/WalletPage";
import SignIn from "./components/Auth/Sign in/SignIn";
import EnterOTPRegister from "./components/Auth/OTP/EnterOTPRegister";
import VerifyAccount from "./components/Auth/VerifyAccount";
import AuthCallback from "./components/Auth/AuthCallback";
import ResetPassword from "./components/Auth/reset password/ResetPassword";
import RentalReviewPage from "./pages/Rental/RentalReviewPage";
import ProfilePage from "./pages/User/ProfilePage";
import RankPage from "./pages/User/RankPage";
import CartPage from "./pages/Rental/CartPage";
import FavoritesPage from "./pages/Favorites/FavoritesPage";
import ProductsPage from "./pages/Products/ProductsPage";
import VouchersPage from "./pages/Voucher/VouchersPage";
import PaymentSuccess from "./pages/Rental/status/PaymentSuccess";
import PaymentCancel from "./pages/Rental/status/PaymentCancel";
import WalletSuccess from "./pages/User/Wallet/WalletSuccess";
import WalletCancel from "./pages/User/Wallet/WalletCancel";
import EkycVerification from "./components/EkycVerification";

import MyRentals from "./pages/User/MyRentals";
import MyReviews from "./pages/User/MyReviews";
import Messenger from "./components/Message Socket/Page/Messenger";
import Chatbot from "./components/chatbot/Chatbot";
import PrivacyPolicyPage from "./pages/Policy/PrivacyPolicyPage";
import TermsOfServicePage from "./pages/Policy/TermsOfServicePage";
import RentalPolicyPage from "./pages/Policy/RentalPolicyPage";
import AboutPage from "./pages/About/AboutPage";
import FAQPage from "./pages/FAQ/FAQPage";
import ContactPage from "./pages/Contact/ContactPage";
import BlogPage from "./pages/Blog/BlogPage";
import BlogDetailPage from "./pages/Blog/BlogDetailPage";
import ChatWindowManager from "./components/Message Socket/MiniChat/ChatWindowManager";
import StaffLayout from "./pages/OperationStaff/StaffLayout";
import SmartGearPage from "./pages/SmartGear/SmartGearPage";
import SupplierProfileEdit from "./pages/Supplier/SupplierProfileEdit";
import SupplierPublicProfile from "./pages/User/SupplierPublicProfile";
import FollowedStoresPage from "./pages/User/FollowedStoresPage";
import SupplierListPage from "./pages/User/SupplierListPage";
import BecomeSupplierPage from "./pages/User/BecomeSupplierPage";
import RentalDetail from "./pages/Rental/RentalDetail";

const ChatbotWrapper = () => {
  const location = useLocation();

  const hideOnPaths = ["/admin", "/supplier", "/messenger", "/staff"];

  const shouldHide = hideOnPaths.some((path) =>
    location.pathname.startsWith(path)
  );

  if (shouldHide) {
    return null;
  }

  return <Chatbot />;
};

const StaffRoute = ({ children }) => {
  const { account, isAuthenticated } = useSelector((state) => state.user);
  if (!isAuthenticated) return <Navigate to="/signin" replace />;
  if (account.role !== "OPERATION_STAFF")
    return <Navigate to="/" replace />;
  return children;
};

const AdminRoute = ({ children }) => {
  const { account, isAuthenticated } = useSelector((state) => state.user);
  if (!isAuthenticated) return <Navigate to="/signin" replace />;
  if (account.role !== "ADMIN")
    return <Navigate to="/" replace />;
  return children;
};

const ChatWindowWrapper = () => {
  const location = useLocation();

  const hideOnPaths = ["/messenger", "/admin", "/staff"];

  const shouldHide = hideOnPaths.some((path) =>
    location.pathname.startsWith(path)
  );

  if (shouldHide) {
    return null;
  }

  return <ChatWindowManager />;
};

export default function Layout() {
  useEffect(() => {
    Aos.init({ duration: 1000 });
  }, []);

  return (
    <BrowserRouter>
      <ScrollToTop />
      <RouteHandler />
      <GlobalLoadingOverlay />
      <ChatbotWrapper />
      <ChatWindowWrapper />
      <Suspense fallback={<div className="p-6">Loading...</div>}>
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />

        <Routes>
          <Route path="/" element={<Homepage />} />

          <Route path="/signin" element={<SignIn />} />
          <Route path="/otp-verify" element={<EnterOTPRegister />} />
          <Route path="auth/callback" element={<AuthCallback />} />
          {/* Forgot Password is now a modal on SignIn, route removed */}
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-account" element={<VerifyAccount />} />

          <Route path="/device/:slug" element={<ProductDetailPage />} />
          <Route path="/user/wallet" element={<WalletPage />} />
          <Route path="/wallet/success" element={<WalletSuccess />} />
          <Route path="/wallet/cancel" element={<WalletCancel />} />
          <Route path="/rental/checkout" element={<RentalCheckout />} />
          <Route
            path="/rental/checkout/review"
            element={<RentalReviewPage />}
          />
          <Route path="/my-rentals/:rentalId" element={<RentalDetail />} />
          <Route
            path="/my-rentals"
            element={<Navigate to="/user/myrental" replace />}
          />
          <Route path="/user/myrental" element={<MyRentals />} />
          <Route path="/user/my-reviews" element={<MyReviews />} />
          <Route path="/user/cart" element={<CartPage />} />
          <Route path="/user/followed-stores" element={<FollowedStoresPage />} />
          <Route path="/payment/success" element={<PaymentSuccess />} />
          <Route path="/payment/cancel" element={<PaymentCancel />} />
          <Route path="/supplier/:id" element={<SupplierPublicProfile />} />
          <Route path="/suppliers" element={<SupplierListPage />} />
          <Route path="/become-supplier" element={<BecomeSupplierPage />} />
          <Route path="/supplier" element={<SupplierLayout />}>
            <Route
              index
              element={<Navigate to="/supplier/dashboard" replace />}
            />
            <Route path="dashboard" element={<SupplierDashboard />} />
            <Route path="notifications" element={<SupplierNotificationsPage />} />
            <Route path="devices" element={<SupplierDevicesList />} />
            <Route path="devices/new" element={<SupplierAddDevicePage />} />
            <Route
              path="devices/:id/edit"
              element={<SupplierEditDevicePage />}
            />
            <Route path="devices/:id" element={<SupplierDeviceDetailPage />} />
            <Route path="inventory" element={<SupplierInventoryPage />} />
            <Route
              path="rental-requests/:rentalId"
              element={<SupplierRentalDetailPage />}
            />
            <Route
              path="rental-requests"
              element={<SupplierRentalRequests />}
            />
            <Route path="extension-requests" element={<SupplierExtensionRequests />} />
            <Route path="maintenance" element={<SupplierMaintenance />} />
            <Route path="revenue" element={<SupplierRevenue />} />
            <Route
              path="wallet"
              element={<WalletPage embeddedInSupplier />}
            />
            <Route path="vouchers" element={<SupplierVouchersPage />} />
            <Route path="reviews" element={<SupplierReviewsPage />} />
            <Route path="issues" element={<SupplierIssuesPage />} />
            <Route path="issues/:issueId" element={<SupplierIssueDetailPage />} />
            <Route
              path="delivery/incidents"
              element={<Navigate to="/supplier/issues?tab=DELIVERY" replace />}
            />
            <Route path="calendar" element={<SupplierCalendarPage />} />
            <Route path="ai-pricing" element={<SupplierAiPricingPage />} />
            <Route path="advertisements" element={<SupplierAdsPage />} />
            <Route path="profile/edit" element={<SupplierProfileEdit />} />
          </Route>

          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="suppliers" element={<SuppliersPage />} />
            <Route path="suppliers/:id" element={<AdminSupplierDetailPage />} />
            <Route path="staff" element={<OperationStaffPage />} />
            <Route path="shop-reports" element={<AdminShopReports />} />
            <Route path="supplier-onboarding" element={<SupplierOnboardingPage />} />
            <Route path="devices" element={<DevicesModerationPage />} />
            <Route path="rentals" element={<RentalsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="vouchers" element={<AdminVouchersPage />} />
            <Route path="advertisements" element={<AdminAdsPage />} />
            <Route path="blogs" element={<BlogManagement />} />
            <Route path="comments" element={<CommentManagement />} />
            <Route path="notifications" element={<AdminBroadcastPage />} />
            <Route path="wallet" element={<AdminWalletPage />} />
            <Route path="withdrawals" element={<AdminWithdrawalsPage />} />
            <Route path="pending-issue-reviews" element={<AdminPendingIssueReviewsPage />} />
            <Route path="issue-investigation/:issueId" element={<AdminIssueInvestigationPage />} />
            <Route path="compensation-proposals" element={<AdminCompensationReviewsPage />} />
          </Route>

          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsOfServicePage />} />
          <Route path="/rental-policy" element={<RentalPolicyPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route
            path="/staff"
            element={
              <StaffRoute>
                <StaffLayout />
              </StaffRoute>
            }
          />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/blog/:id" element={<BlogDetailPage />} />
          <Route path="/vouchers" element={<VouchersPage />} />

          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/user/rank" element={<RankPage />} />
          <Route path="/ekyc" element={<EkycVerification />} />

          <Route path="/messenger" element={<Messenger />} />
          <Route path="/messenger/:conversationId" element={<Messenger />} />
          <Route path="/smartgear" element={<SmartGearPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}