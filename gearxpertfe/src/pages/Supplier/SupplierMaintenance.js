import { FiTool } from "react-icons/fi";
import { Link } from "react-router-dom";

export default function SupplierMaintenance() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 font-display tracking-tight">Bảo trì</h2>
        <p className="mt-1 text-sm text-slate-600">
          Theo dõi lịch sử và chỉ số bảo trì trên từng thiết bị trong danh sách sản phẩm.
        </p>
      </div>

      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-12 text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
          <FiTool size={28} />
        </div>
        <p className="text-slate-700 font-medium mb-2">Chưa có luồng quản lý bảo trì tập trung</p>
        <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
          Thông tin bảo trì (nếu có) hiển thị ở trang chi tiết từng thiết bị. Bạn có thể xem và cập nhật thiết bị từ danh sách.
        </p>
        <Link
          to="/supplier/devices"
          className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-primary text-white font-semibold hover:opacity-90 transition-opacity"
        >
          Đi tới danh sách thiết bị
        </Link>
      </div>
    </div>
  );
}
