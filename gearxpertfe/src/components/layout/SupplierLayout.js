import { Outlet } from "react-router-dom";
import { useState } from "react";
import { useSelector } from "react-redux";
import SupplierTopbar from "./supplier/SupplierTopbar";
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
    <div className="min-h-screen bg-background-light flex flex-col">
      {/* TOPBAR */}
      <SupplierTopbar onMenuOpen={() => setOpen(true)} me={me} />

      {/* BODY */}
      <div className={classNames(
        "flex-1 flex lg:grid mx-auto w-full max-w-[1500px] transition-all duration-500",
        collapsed ? "lg:grid-cols-[100px_1fr]" : "lg:grid-cols-[320px_1fr]"
      )}>
        {/* SIDEBAR Desktop */}
        <SupplierSidebar 
          collapsed={collapsed} 
          onCollapse={() => setCollapsed(!collapsed)} 
          me={me} 
        />

        {/* SIDEBAR Mobile drawer */}
        <SupplierMobileDrawer open={open} onClose={() => setOpen(false)} />

        {/* MAIN CONTENT */}
        <main className="flex-1 px-6 lg:px-10 py-8 overflow-y-auto">
          {/* <SupplierPageHeader /> */}

          {/* Content container */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
