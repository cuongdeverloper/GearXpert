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
                    {/* Bọc các route trong DashboardLayout từ main */}
                    <Route element={<DashboardLayout />}>
                        <Route path="/" element={<Hello />} />
                        <Route path="/device/:id" element={<ProductDetailPage />} />
                        <Route path="/rental/checkout" element={<RentalCheckout />} />
                    </Route>
                </Routes>

                {/* Chatbot của bạn để ở đây để nó hiện xuyên suốt các trang */}
                <Chatbot /> 
            </Suspense>
        </BrowserRouter>
    );
}