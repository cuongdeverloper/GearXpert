import { Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import Aos from "aos";

import Homepage from "./pages/Homepage/Homepage";
import Chatbot from "./components/chatbot/Chatbot"; // Giữ Chatbot của bạn
import DashboardLayout from "./components/layout/DashboardLayout"; // Giữ Layout từ main

// pages
import RentalCheckout from "./pages/Rental/RentalCheckout";
import ProductDetailPage from "./pages/Device/ProductDetailPage";
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
            <Route path="/" element={<Homepage />} />
             <Route path="/device/:id" element={<ProductDetailPage />} />

            <Route path="/rental/checkout" element={<RentalCheckout />} />
            <Route path="/rental/checkout/review" element={<RentalReviewPage />} />
            {/* <Route path="/rental/manage" element={<RentalManagementPage />} /> */}
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );

}