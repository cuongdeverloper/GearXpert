import { Outlet } from "react-router-dom";
import { useState } from "react";
import { useSelector } from "react-redux";
import AdminTopbar from "./admin/AdminTopbar";
import AdminSidebar from "./admin/AdminSidebar";
import AdminMobileDrawer from "./admin/AdminMobileDrawer";
import AdminPageHeader from "./admin/AdminPageHeader";

export default function AdminLayout() {
  const [openDrawer, setOpenDrawer] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const me = useSelector((state) => state.user.account);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Topbar */}
      <AdminTopbar onMenuOpen={() => setOpenDrawer(true)} me={me} />

      {/* Main layout */}
      <div className="flex flex-1 w-full translate-z-0">
        {/* Sidebar (desktop) */}
        <AdminSidebar collapsed={collapsed} onToggleCollapsed={() => setCollapsed(!collapsed)} />

        {/* Mobile drawer */}
        <AdminMobileDrawer open={openDrawer} onClose={() => setOpenDrawer(false)} />

        {/* Main content */}
        <main className="flex-1 px-4 lg:px-6 py-8 overflow-y-auto">
          <AdminPageHeader />

          {/* Content container */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 lg:p-6 shadow-sm">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
