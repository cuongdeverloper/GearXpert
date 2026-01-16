import { Outlet } from "react-router-dom";
import { useState } from "react";
import SupplierTopbar from "./supplier/SupplierTopbar";
import SupplierSidebar from "./supplier/SupplierSidebar";
import SupplierMobileDrawer from "./supplier/SupplierMobileDrawer";
import SupplierPageHeader from "./supplier/SupplierPageHeader";

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

export default function SupplierLayout() {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [hidden, setHidden] = useState(false);

  // Mock user info (sau này lấy từ auth store)
  const me = { 
    name: "Supplier", 
    email: "supplier@gearxpert.com",
    revenue: 45500000,
    activeListings: 24,
    rating: 4.8
  };

  return (
    <div className="min-h-screen bg-background-light flex flex-col">
      {/* TOPBAR */}
      <SupplierTopbar 
        onMenuOpen={() => setOpen(true)} 
        hidden={hidden}
        onToggleHidden={() => setHidden(!hidden)}
        me={me} 
      />

      {/* BODY */}
      <div className={classNames(
        "flex-1 flex lg:grid mx-auto w-full max-w-[1500px] transition-all duration-500",
        hidden ? "lg:grid-cols-[1fr]" : collapsed ? "lg:grid-cols-[100px_1fr]" : "lg:grid-cols-[320px_1fr]"
      )}>
        {/* SIDEBAR Desktop */}
        <SupplierSidebar 
          collapsed={collapsed} 
          hidden={hidden}
          onCollapse={() => setCollapsed(!collapsed)}
          onToggleHidden={() => setHidden(!hidden)}
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
