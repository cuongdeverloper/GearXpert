import { Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import Aos from "aos";

import Homepage from "./pages/Homepage/Homepage";
import Chatbot from "./components/chatbot/Chatbot"; // Giữ Chatbot của bạn
import DashboardLayout from "./components/layout/DashboardLayout"; // Giữ Layout từ main
import GlobalLoadingOverlay from "./components/common/GlobalLoadingOverlay";
import RouteHandler from "./components/common/RouteHandler";

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

export default function Layout() {
  useEffect(() => {
    Aos.init({ duration: 1000 });
  }, []);

  return (
    <BrowserRouter>
      <RouteHandler />
      <GlobalLoadingOverlay />
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
          {/* Homepage has its own Header and Footer */}
          <Route path="/" element={<Homepage />} />

          {/* Auth pages */}
          <Route path="/signin" element={<SignIn />} />
          <Route path="/otp-verify" element={<EnterOTPRegister />} />
          <Route path="auth/callback" element={<AuthCallback />} />
          {/* Forgot Password is now a modal on SignIn, route removed */}
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-account" element={<VerifyAccount />} />

  
            <Route path="/device/:id" element={<ProductDetailPage />} />
            <Route path="/wallet" element={<WalletPage />} />
            <Route path="/rental/checkout" element={<RentalCheckout />} />
            <Route path="/device/" element={<ProductDetailPage />} />
            <Route path="/rental/checkout/review" element={<RentalReviewPage />} />
            <Route path="/user/cart" element={<CartPage />} />
            {/* <Route path="/rental/manage" element={<RentalManagementPage />} /> */}
     


          {/* Favorites page */}
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/vouchers" element={<VouchersPage />} />

          {/* Profile page (has its own Header and Footer) */}
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );

}