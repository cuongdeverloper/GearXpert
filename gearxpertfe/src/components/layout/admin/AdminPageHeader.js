import { useMemo } from "react";
import { useLocation } from "react-router-dom";

const navGroups = [
  {
    title: "DANH MỤC",
    items: [
      { to: "/admin", label: "Bảng điều khiển", description: "Theo dõi các chỉ số và KPI của hệ thống" },
      { to: "/admin/users", label: "Người dung", description: "Quản lý tài khoản người dùng và quyền hạn" },
      { to: "/admin/suppliers", label: "Nhà cung cấp", description: "Quản lý tài khoản nhà cung cấp" },
      { to: "/admin/devices", label: "Thiết bị", description: "Kiểm duyệt danh sách thiết bị" },
      { to: "/admin/rentals", label: "Đơn thuê", description: "Theo dõi các giao dịch đơn thuê" },
      { to: "/admin/reports", label: "Báo cáo", description: "Xem báo cáo hệ thống" },
    ],
  },
  {
    title: "CÀI ĐẶT",
    items: [{ to: "/admin/settings", label: "Cài đặt hệ thống", description: "Cấu hình cài đặt hệ thống" }],
  },
];

function isActivePath(pathname, to) {
  if (to === "/admin") return pathname === "/admin" || pathname === "/admin/";
  return pathname.startsWith(to);
}

export default function AdminPageHeader() {
  const location = useLocation();

  const currentPage = useMemo(() => {
    for (const g of navGroups) {
      const hit = g.items.find((it) => isActivePath(location.pathname, it.to));
      if (hit) return hit;
    }
    return { label: "Bảng điều khiển", description: "Theo dõi hoạt động hệ thống" };
  }, [location.pathname]);

  return (
    <div className="mb-8">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Cổng Quản trị
      </div>
      <h1 className="mt-2 text-3xl font-bold text-slate-900">{currentPage.label}</h1>
      <p className="mt-1 text-sm text-slate-600">{currentPage.description}</p>
    </div>
  );
}
