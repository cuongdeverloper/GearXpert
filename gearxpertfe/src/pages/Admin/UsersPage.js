import { useState, useEffect, useCallback } from "react";
import { useDispatch } from "react-redux";
import { showAdminLoading, hideAdminLoading } from "../../redux/action/appAction";
import { FiSearch, FiCheck, FiX, FiLock, FiUnlock, FiEye, FiMoreVertical } from "react-icons/fi";
import { getAdminUsers, toggleUserStatus } from "../../service/ApiService/AdminUserApi";
import { confirmDialog } from "../../utils/confirmDialog";
import { toast } from "react-toastify";
import UserDetailModal from "../../components/admin/UserDetailModal";

export default function UsersPage() {
  const dispatch = useDispatch();
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [menuOpenId, setMenuOpenId] = useState(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      dispatch(showAdminLoading());
      const response = await getAdminUsers();
      if (response && response.success) {
        setUsers(response.users);
      }
    } catch (error) {
      console.error("Fetch users error:", error);
      toast.error("Không thể tải danh sách người dùng");
    } finally {
      setLoading(false);
      dispatch(hideAdminLoading());
    }
  }, [dispatch]); 

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);
  const handleToggleStatus = async (user) => {
    const isBlocking = user.status === "ACTIVE";
    const action = isBlocking ? "khóa" : "mở khóa";
    const result = await confirmDialog({
      title: `Xác nhận ${action} tài khoản?`,
      text: `Bạn có chắc chắn muốn ${action} người dùng này?`,
      icon: isBlocking ? "warning" : "question",
      confirmText: isBlocking ? "Khóa" : "Mở khóa",
      cancelText: "Hủy",
      confirmColor: isBlocking ? "#dc2626" : "#16a34a",
    });
    if (!result.isConfirmed) return;

    try {
      const response = await toggleUserStatus(user._id);
      if (response && response.success) {
        toast.success(response.message);
        setUsers(users.map(u => u._id === user._id ? { ...u, status: u.status === "ACTIVE" ? "BLOCKED" : "ACTIVE" } : u));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Lỗi khi cập nhật trạng thái");
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "ALL" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleColor = (role) => {
    const colors = {
      CUSTOMER: "bg-blue-100 text-blue-700",
      SUPPLIER: "bg-green-100 text-green-700",
      TECHNICIAN: "bg-purple-100 text-purple-700",
      DELIVERY_STAFF: "bg-orange-100 text-orange-700",
    };
    return colors[role] || "bg-slate-100 text-slate-700";
  };

  const getRankColor = (rank) => {
    const colors = {
      BRONZE: "bg-amber-100 text-amber-700",
      SILVER: "bg-slate-100 text-slate-700",
      GOLD: "bg-yellow-100 text-yellow-700",
      PLATINUM: "bg-purple-100 text-purple-700",
      DIAMOND: "bg-cyan-100 text-cyan-700",
    };
    return colors[rank] || "bg-slate-100 text-slate-700";
  };

  const roleMapping = {
    CUSTOMER: "Khách hàng",
    SUPPLIER: "Nhà cung cấp",
    TECHNICIAN: "Kỹ thuật viên",
    DELIVERY_STAFF: "Nhân viên giao hàng",
  };

  const rankMapping = {
    BRONZE: "Đồng",
    SILVER: "Bạc",
    GOLD: "Vàng",
    PLATINUM: "Bạch kim",
    DIAMOND: "Kim cương",
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 gap-3">
          <div className="relative flex-1 max-w-md">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm người dùng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition bg-white"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition bg-white"
          >
            <option value="ALL">Tất cả vai trò</option>
            <option value="CUSTOMER">Khách hàng</option>
            <option value="SUPPLIER">Nhà cung cấp</option>
            <option value="TECHNICIAN">Kỹ thuật viên</option>
            <option value="DELIVERY_STAFF">Nhân viên giao hàng</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-6 py-4 text-left font-semibold text-slate-700">Người dùng</th>
              <th className="px-6 py-4 text-left font-semibold text-slate-700">Liên hệ</th>
              <th className="px-6 py-4 text-left font-semibold text-slate-700">Vai trò</th>
              <th className="px-6 py-4 text-left font-semibold text-slate-700">Hạng / Điểm</th>
              <th className="px-6 py-4 text-center font-semibold text-slate-700">Xác minh</th>
              <th className="px-6 py-4 text-center font-semibold text-slate-700">Trạng thái</th>
              <th className="px-6 py-4 text-center font-semibold text-slate-700">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              [1, 2, 3, 4, 5].map(i => (
                <tr key={i} className="animate-pulse">
                  <td colSpan="7" className="px-6 py-4">
                    <div className="h-4 bg-slate-100 rounded w-full"></div>
                  </td>
                </tr>
              ))
            ) : filteredUsers.map((user) => (
              <tr key={user._id} className="hover:bg-slate-50 transition">
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-900">{user.fullName}</div>
                  <div className="text-xs text-slate-500">{user.address?.city || 'N/A'}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-slate-600">{user.email}</div>
                  <div className="text-xs text-slate-400">{user.phone || 'Chưa cập nhật'}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${getRoleColor(user.role)}`}>
                    {roleMapping[user.role] || user.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold mb-1 ${getRankColor(user.rank)}`}>
                    {rankMapping[user.rank] || user.rank}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">{user.rewardPoints} điểm</div>
                </td>
                <td className="px-6 py-4 text-center">
                  {user.isVerified ? (
                    <FiCheck className="w-5 h-5 text-emerald-500 mx-auto" />
                  ) : (
                    <FiX className="w-5 h-5 text-slate-300 mx-auto" />
                  )}
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${user.status === "ACTIVE"
                    ? "bg-emerald-100 text-emerald-600"
                    : "bg-red-100 text-red-600"
                    }`}>
                    {user.status === "ACTIVE" ? "Hoạt động" : "Đã khóa"}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="relative inline-flex">
                    <button
                      onClick={() => setMenuOpenId(menuOpenId === user._id ? null : user._id)}
                      className="inline-flex items-center justify-center rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
                      aria-label="More actions"
                    >
                      <FiMoreVertical />
                    </button>
                    {menuOpenId === user._id && (
                      <div className="absolute right-0 top-10 z-10 w-40 rounded-xl border border-slate-200 bg-white shadow-lg">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setMenuOpenId(null);
                          }}
                          className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                        >
                          <FiEye />
                          Xem chi tiết
                        </button>
                        <button
                          onClick={() => {
                            handleToggleStatus(user);
                            setMenuOpenId(null);
                          }}
                          className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm ${
                            user.status === "ACTIVE"
                              ? "text-red-600 hover:bg-red-50"
                              : "text-emerald-600 hover:bg-emerald-50"
                          }`}
                        >
                          {user.status === "ACTIVE" ? <FiLock /> : <FiUnlock />}
                          {user.status === "ACTIVE" ? "Khóa" : "Mở khóa"}
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && filteredUsers.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <p className="text-slate-500">Không tìm thấy người dùng nào</p>
        </div>
      )}

      <UserDetailModal user={selectedUser} onClose={() => setSelectedUser(null)} />
    </div>
  );
}
