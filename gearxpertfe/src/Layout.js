import { Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import Aos from "aos";

import Hello from "./components/Hello";
import Chatbot from "./components/chatbot/Chatbot"; // Giữ Chatbot của bạn
import DashboardLayout from "./components/layout/DashboardLayout"; // Giữ Layout từ main

// pages
import RentalCheckout from "./pages/Rental/RentalCheckout";
import ProductDetailPage from "./pages/Device/ProductDetailPage";
import WalletPage from "./pages/User/WalletPage";
import SignIn from "./components/Auth/Sign in/SignIn";
import EnterOTPRegister from "./components/Auth/OTP/EnterOTPRegister";
import VerifyAccount from "./components/Auth/VerifyAccount";
import AuthCallback from "./components/Auth/AuthCallback";
import RequestPasswordReset from "./components/Auth/reset password/RequestPasswordReset";
import ResetPassword from "./components/Auth/reset password/ResetPassword";
import RentalReviewPage from "./pages/Rental/RentalReviewPage";

export default function Layout() {
  useEffect(() => {
    Aos.init({ duration: 1000 });
  }, []);

  return (
    <BrowserRouter>
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

          <Route element={<DashboardLayout />}>
            <Route path="/" element={<Hello />} />
             <Route path="/device/" element={<ProductDetailPage />} />

            <Route path="/rental/checkout" element={<RentalCheckout />} />
            <Route path="/rental/checkout/review" element={<RentalReviewPage />} />
            {/* <Route path="/rental/manage" element={<RentalManagementPage />} /> */}
          </Route>
          <Route path="/verify-account" element={<VerifyAccount />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );

}