import { Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
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
import SupplierRentalRequests from "./pages/Supplier/SupplierRentalRequests";
import SupplierMaintenance from "./pages/Supplier/SupplierMaintenance";
import SupplierRevenue from "./pages/Supplier/SupplierRevenue";

import AdminLayout from "./components/layout/AdminLayout";
import DashboardPage from "./pages/Admin/DashboardPage";
import UsersPage from "./pages/Admin/UsersPage";
import SuppliersPage from "./pages/Admin/SuppliersPage";
import DevicesModerationPage from "./pages/Admin/DevicesModerationPage";
import RentalsPage from "./pages/Admin/RentalsPage";
import ReportsPage from "./pages/Admin/ReportsPage";
import SettingsPage from "./pages/Admin/SettingsPage";
import AdminVouchersPage from "./pages/Admin/AdminVouchersPage";
import AdminAdsPage from "./pages/Admin/AdminAdsPage";


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
import Messenger from "./components/Message Socket/Page/Messenger";
import Chatbot from "./components/chatbot/Chatbot";
import PrivacyPolicyPage from "./pages/Policy/PrivacyPolicyPage";
import TermsOfServicePage from "./pages/Policy/TermsOfServicePage";
import RentalPolicyPage from "./pages/Policy/RentalPolicyPage";

const ChatbotWrapper = () => {
  const location = useLocation();
  if (location.pathname.startsWith("/admin") || location.pathname.startsWith("/supplier")) {
    return null; 
  }

  return <Chatbot />;
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

          <Route path="/device/:id" element={<ProductDetailPage />} />
          <Route path="/user/wallet" element={<WalletPage />} />
          <Route path="/wallet/success" element={<WalletSuccess />} />
          <Route path="/wallet/cancel" element={<WalletCancel />} />
          <Route path="/rental/checkout" element={<RentalCheckout />} />
          <Route path="/device/" element={<ProductDetailPage />} />
          <Route
            path="/rental/checkout/review"
            element={<RentalReviewPage />}
          />
          <Route path="/user/myrental" element={<MyRentals />} />
          <Route path="/user/cart" element={<CartPage />} />
          <Route path="/payment/success" element={<PaymentSuccess />} />
          <Route path="/payment/cancel" element={<PaymentCancel />} />

          <Route path="/supplier" element={<SupplierLayout />}>
            <Route
              index
              element={<Navigate to="/supplier/dashboard" replace />}
            />
            <Route path="dashboard" element={<SupplierDashboard />} />
            <Route path="devices" element={<SupplierDevicesList />} />
            <Route
              path="rental-requests"
              element={<SupplierRentalRequests />}
            />
            <Route path="maintenance" element={<SupplierMaintenance />} />
            <Route path="revenue" element={<SupplierRevenue />} />
          </Route>

          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="suppliers" element={<SuppliersPage />} />
            <Route path="devices" element={<DevicesModerationPage />} />
            <Route path="rentals" element={<RentalsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="vouchers" element={<AdminVouchersPage />} />
            <Route path="advertisements" element={<AdminAdsPage />} />

          </Route>

          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsOfServicePage />} />
          <Route path="/rental-policy" element={<RentalPolicyPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/vouchers" element={<VouchersPage />} />

          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/ekyc" element={<EkycVerification />} />

          <Route path="/messenger" element={<Messenger />} />
          <Route path="/messenger/:conversationId" element={<Messenger />}
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}