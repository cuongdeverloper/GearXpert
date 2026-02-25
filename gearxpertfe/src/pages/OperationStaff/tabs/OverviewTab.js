// src/pages/staff/tabs/OverviewTab.jsx
import React, { useState } from "react";
import { Truck, PackageCheck, FileText, AlertTriangle, Wrench, ArrowUpRight,XCircle,Eye} from "lucide-react";

const mockStats = {
  pendingDelivery: 12,
  pendingReturn: 7,
  pendingContracts: 5,
  openIssues: 9,
  openDamage: 4,
  pendingMaintenance: 6,
  totalTasksToday: 18,
  urgentTasks: 3,
};

const mockRecent = [
  { action: "Xác nhận giao hàng", target: "Đơn R127", time: "10 phút trước", staff: "Staff 1" },
  { action: "Xử lý khiếu nại", target: "Khiếu nại DI003", time: "45 phút trước", staff: "Staff 2" },
  { action: "Hoàn thành bảo trì", target: "Laptop XPS 13", time: "2 giờ trước", staff: "Staff 3" },
  { action: "Ký hợp đồng return", target: "Hợp đồng C005", time: "Hôm nay 09:15", staff: "Staff 1" },
  { action: "Từ chối đơn R130", target: "Lý do hết hàng", time: "Hôm nay 08:45", staff: "Staff 4" },
];

export default function OverviewTab() {
  const [stats] = useState(mockStats);
  const [recent] = useState(mockRecent);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
      
          <p className="text-gray-600 mt-1">Theo dõi công việc cần xử lý hôm nay</p>
        </div>

      </div>

      {/* Thống kê */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {[
          { label: "Giao hàng chờ", value: stats.pendingDelivery, icon: Truck, color: "blue" },
          { label: "Trả hàng chờ", value: stats.pendingReturn, icon: PackageCheck, color: "green" },
          { label: "Hợp đồng chờ ký", value: stats.pendingContracts, icon: FileText, color: "purple" },
          { label: "Khiếu nại mở", value: stats.openIssues, icon: AlertTriangle, color: "amber" },
          { label: "Hư hỏng chờ xử lý", value: stats.openDamage, icon: XCircle, color: "red" },
          { label: "Bảo trì chờ", value: stats.pendingMaintenance, icon: Wrench, color: "indigo" },
        ].map((item, idx) => (
          <div
            key={idx}
            className={`bg-white rounded-xl shadow-sm p-6 border border-${item.color}-100 hover:shadow-md transition-all group`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{item.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{item.value}</p>
              </div>
              <div className={`p-4 rounded-xl bg-${item.color}-50 text-${item.color}-600 group-hover:bg-${item.color}-100 transition-colors`}>
                <item.icon size={32} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Hoạt động gần đây */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Hoạt động gần đây</h2>
          <button className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
            Xem tất cả <ArrowUpRight size={16} />
          </button>
        </div>
        <div className="space-y-4">
          {recent.map((act, idx) => (
            <div key={idx} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="p-3 rounded-lg bg-indigo-50 text-indigo-600">
                {act.action.includes("giao") && <Truck size={20} />}
                {act.action.includes("trả") && <PackageCheck size={20} />}
                {act.action.includes("khiếu nại") && <AlertTriangle size={20} />}
                {act.action.includes("bảo trì") && <Wrench size={20} />}
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">
                  {act.action} <span className="text-indigo-600">{act.target}</span>
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {act.time} • {act.staff}
                </p>
              </div>
              <button className="text-indigo-600 hover:text-indigo-800">
                <Eye size={18} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Xác nhận giao hàng", icon: Truck, color: "blue", desc: "Xử lý task giao mới" },
          { label: "Xác nhận trả hàng", icon: PackageCheck, color: "green", desc: "Nhận và kiểm tra thiết bị" },
          { label: "Xử lý khiếu nại", icon: AlertTriangle, color: "amber", desc: "Giải quyết khiếu nại giao" },
          { label: "Lên lịch bảo trì", icon: Wrench, color: "indigo", desc: "Tạo task bảo trì" },
        ].map((action, idx) => (
          <button
            key={idx}
            className="bg-white border border-gray-200 rounded-xl p-6 text-left hover:shadow-lg hover:border-indigo-200 transition-all group"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className={`p-4 rounded-xl bg-${action.color}-50 text-${action.color}-600 group-hover:bg-${action.color}-100 transition-colors`}>
                <action.icon size={28} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">{action.label}</h3>
                <p className="text-sm text-gray-600 mt-1">{action.desc}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}