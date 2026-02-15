// src/layouts/StaffLayout.jsx
import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Truck,
  PackageCheck,
  FileText,
  AlertTriangle,
  Wrench,
  ClipboardList,
  Menu,
  X,
  LogOut,
  UserCircle,
  Bell,XCircle
} from "lucide-react";

const menuItems = [
  { id: "dashboard", label: "Tổng quan", icon: LayoutDashboard },
  { id: "delivery", label: "Giao hàng", icon: Truck },
  { id: "return", label: "Trả hàng", icon: PackageCheck },
  { id: "contracts", label: "Hợp đồng", icon: FileText },
  { id: "issues", label: "Khiếu nại giao", icon: AlertTriangle },
  { id: "damage", label: "Hư hỏng / Bồi thường", icon: XCircle },
  { id: "maintenance", label: "Bảo trì", icon: Wrench },
];

export default function StaffLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");

  // Giả lập số lượng badge (bạn có thể fetch từ API sau)
  const badgeCounts = {
    delivery: 8,
    issues: 3,
    // Thêm các tab khác nếu cần
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[288px] bg-white shadow-2xl transform transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:w-[288px] lg:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Header Sidebar */}
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-bold text-xl">
                OP
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Operation</h1>
                <p className="text-xs text-gray-500 -mt-1">Staff Panel</p>
              </div>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-gray-600 hover:text-gray-900">
              <X size={24} />
            </button>
          </div>

          {/* Menu */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all ${
                  activeTab === item.id
                    ? "bg-indigo-600 text-white shadow-md"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <item.icon size={20} />
                <span className="flex-1 text-left">{item.label}</span>
                {/* Badge động */}
                {badgeCounts[item.id] > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full min-w-[20px] text-center">
                    {badgeCounts[item.id]}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-5 border-t border-gray-100">
            <div className="flex items-center gap-3">
              <UserCircle size={42} className="text-indigo-600" />
              <div>
                <p className="font-semibold text-gray-900">Nguyễn Văn Staff</p>
                <p className="text-xs text-gray-500">Operation Staff</p>
              </div>
            </div>
            <button className="mt-6 w-full flex items-center justify-center gap-2 py-3 bg-red-50 text-red-600 rounded-2xl hover:bg-red-100 transition-colors font-medium">
              <LogOut size={18} />
              Đăng xuất
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsSidebarOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-white p-3 rounded-2xl shadow-lg border border-gray-200"
      >
        <Menu size={24} />
      </button>

      {/* Main Content */}
      <div className="flex-1  min-h-screen">
        {/* Header cố định */}
        <header className="sticky top-0 z-40 bg-white shadow-sm border-b">
          <div className="px-6 lg:px-10 py-4 flex items-center justify-between">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 truncate">
              {activeTab === "dashboard" && "Tổng quan vận hành"}
              {activeTab === "delivery" && "Quản lý giao hàng"}
              {activeTab === "return" && "Quản lý trả hàng"}
              {activeTab === "contracts" && "Quản lý hợp đồng"}
              {activeTab === "issues" && "Khiếu nại giao hàng"}
              {activeTab === "damage" && "Hư hỏng & Bồi thường"}
              {activeTab === "maintenance" && "Bảo trì thiết bị"}
   
            </h1>
            <div className="flex items-center gap-4">
              <button className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm transition-colors">
                <ClipboardList size={18} />
                Tạo task mới
              </button>
              <button className="relative p-2 text-gray-600 hover:text-indigo-600">
                <Bell size={24} />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {badgeCounts.issues || 3}
                </span>
              </button>
            </div>
          </div>
        </header>

        {/* Nội dung chính */}
        <main className="px-6 lg:px-10 py-8">
          <Outlet context={{ activeTab, setActiveTab }} />
        </main>
      </div>
    </div>
  );
}