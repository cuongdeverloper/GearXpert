import { Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import Aos from "aos";

// Components
import Homepage from "./pages/Homepage/Homepage";
import Chatbot from "./components/chatbot/Chatbot"; 
import DashboardLayout from "./components/layout/DashboardLayout"; 

// Pages
import RentalCheckout from "./pages/Rental/RentalCheckout";
import ProductDetailPage from "./pages/Device/ProductDetailPage";
import RentalReviewPage from "./pages/Rental/RentalReviewPage";
import Messenger from "./components/Message Socket/Page/Messenger";
import EkycVerification from "./components/EkycVerification";

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

        {/* Đã thêm Chatbot vào đây (vì bạn đã import ở trên) */}
        <Chatbot />

        <Routes>
          {/* Nhóm các trang dùng chung Layout (Header/Footer) */}
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<Homepage />} />
            
            {/* Xử lý route chi tiết sản phẩm */}
            <Route path="/device" element={<ProductDetailPage />} />
            <Route path="/device/:id" element={<ProductDetailPage />} />

            <Route path="/rental/checkout" element={<RentalCheckout />} />
            <Route path="/rental/checkout/review" element={<RentalReviewPage />} />
          </Route>

          {/* Nhóm các trang riêng biệt (Full màn hình, không dính Layout chính) */}
          <Route path="/messenger" element={<Messenger />} />
          <Route path="/messenger/:conversationId" element={<Messenger />} />
          <Route path="/ekyc" element={<EkycVerification />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}