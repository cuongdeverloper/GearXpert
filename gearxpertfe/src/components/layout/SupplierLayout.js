import { Outlet } from "react-router-dom";
import { useState } from "react";
import { useSelector } from "react-redux";
import Header from "../navigation/Header";
import SupplierSidebar from "./supplier/SupplierSidebar";
import SupplierMobileDrawer from "./supplier/SupplierMobileDrawer";

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

export default function SupplierLayout() {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Lấy user info từ redux store
  const me = useSelector((state) => state.user.account);
  return (
    <div className="h-screen min-h-0 flex flex-col overflow-hidden bg-background-light text-[15px]">
      {/* HEADER — fixed; không chiếm chỗ trong luồng, body có pt để lọt phía dưới */}
      <Header onMenuOpen={() => setOpen(true)} />

      {/* BODY — min-h-0 để cột con overflow-y-auto hoạt động; chỉ main (và nav sidebar) cuộn riêng */}
      <div
        className={classNames(
          "flex-1 min-h-0 w-full flex flex-col lg:grid lg:grid-rows-1 pt-32 transition-all duration-500",
          collapsed
            ? "lg:grid-cols-[88px_minmax(0,1fr)]"
            : "lg:grid-cols-[280px_minmax(0,1fr)]"
        )}
      >
        {/* SIDEBAR Desktop */}
        <SupplierSidebar
          collapsed={collapsed}
          onCollapse={() => setCollapsed(!collapsed)}
          me={me}
        />

        {/* SIDEBAR Mobile drawer */}
        <SupplierMobileDrawer open={open} onClose={() => setOpen(false)} />

        {/* MAIN CONTENT — chỉ vùng này cuộn theo chiều dọc */}
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain px-5 lg:px-8 py-6">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 lg:p-6 min-h-0">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
