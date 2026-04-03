import { useLocation } from "react-router-dom";
import { useMemo } from "react";

const menu = [
  {
    to: "/supplier/dashboard",
    label: "Tổng quan",
    desc: "Doanh thu, đơn thuê, thiết bị và yêu cầu mới.",
  },
  {
    to: "/supplier/devices",
    label: "Sản phẩm",
    desc: "Quản lý thiết bị cho thuê, kho và trạng thái.",
  },
  {
    to: "/supplier/inventory",
    label: "Kho hàng",
    desc: "Theo dõi tồn kho, lượng thuê và sẵn có.",
  },
  {
    to: "/supplier/rental-requests",
    label: "Đặt thuê",
    desc: "Xem, duyệt và theo dõi yêu cầu đặt thuê.",
  },
  {
    to: "/supplier/maintenance",
    label: "Bảo trì",
    desc: "Quy trình bảo trì và sẵn có thiết bị.",
  },
  {
    to: "/supplier/revenue",
    label: "Tài chính",
    desc: "Doanh thu, tiền cọc, phí và rút tiền.",
  },
];

export default function SupplierPageHeader() {
  const location = useLocation();

  const current = useMemo(() => {
    return menu.find((m) => location.pathname.startsWith(m.to));
  }, [location.pathname]);

  return (
    <div className="mb-8">
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
        Trung tâm nhà cung cấp
      </div>
      <h1 className="text-3xl font-bold text-slate-900 font-display tracking-tight mb-2">
        {current?.label || "Bảng điều khiển"}
      </h1>
      <p className="text-sm text-slate-600">
        {current?.desc || "Quản lý hoạt động cung ứng của bạn trên GearXpert."}
      </p>
    </div>
  );
}
