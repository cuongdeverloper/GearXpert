import { Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import Aos from "aos";

import Hello from "./components/Hello";
import DashboardLayout from "./components/layout/DashboardLayout";

// pages
// import WalletPage from "./pages/Profile/WalletPage";
import RentalCheckout from "./pages/Rental/RentalCheckout";
// import RentalManagementPage from "./pages/Rental/RentalManagementPage";
import ProductDetailPage from "./pages/Device/ProductDetailPage";

export default function Layout() {
  useEffect(() => {
    Aos.init({ duration: 1000 });
  }, []);

  return (
    <BrowserRouter>
      <Suspense fallback={<div className="p-6">Loading...</div>}>
        <ToastContainer position="top-right" autoClose={3000} />

        <Routes>

          <Route element={<DashboardLayout />}>
            <Route path="/" element={<Hello />} />
             <Route path="/device/:id" element={<ProductDetailPage />} />
            {/*<Route path="/wallet" element={<WalletPage />} /> */}
            <Route path="/rental/checkout" element={<RentalCheckout />} />
            {/* <Route path="/rental/manage" element={<RentalManagementPage />} /> */}
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
