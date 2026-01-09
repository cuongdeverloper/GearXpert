import { Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import Aos from "aos";

import Hello from "./components/Hello";
import Chatbot from "./components/chatbot/Chatbot"; // Giữ Chatbot của bạn
import DashboardLayout from "./components/layout/DashboardLayout"; // Giữ Layout từ main

// Supplier layout + pages
import SupplierLayout from "./components/layout/SupplierLayout";
import SupplierDevicesList from "./pages/Supplier/SupplierDevicesList";
import SupplierRentalRequests from "./pages/Supplier/SupplierRentalRequests";
import SupplierMaintenance from "./pages/Supplier/SupplierMaintenance";
import SupplierRevenue from "./pages/Supplier/SupplierRevenue";

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
            <Route path="/" element={<Hello />} />
             <Route path="/device/" element={<ProductDetailPage />} />

            <Route path="/rental/checkout" element={<RentalCheckout />} />
            <Route path="/rental/checkout/review" element={<RentalReviewPage />} />
            {/* <Route path="/rental/manage" element={<RentalManagementPage />} /> */}
          </Route>

            {/* Supplier Portal routes */}
          <Route path="/supplier" element={<SupplierLayout />}>
            <Route index element={<Navigate to="/supplier/devices" replace />} />
            <Route path="devices" element={<SupplierDevicesList />} />
            <Route path="rental-requests" element={<SupplierRentalRequests />} />
            <Route path="maintenance" element={<SupplierMaintenance />} />
            <Route path="revenue" element={<SupplierRevenue />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );

}