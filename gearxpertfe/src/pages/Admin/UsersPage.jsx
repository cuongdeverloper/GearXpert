import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { mockUsers } from "../../mocks/adminMock";
import { showAdminLoading, hideAdminLoading } from "../../redux/action/appAction";
import { FiSearch, FiFilter, FiMoreVertical, FiCheck, FiX, FiEdit2, FiTrash2 } from "react-icons/fi";

export default function UsersPage() {
  const dispatch = useDispatch();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  // Simulate data loading
  useEffect(() => {
    dispatch(showAdminLoading());
    const timer = setTimeout(() => {
      dispatch(hideAdminLoading());
    }, 300);
    return () => clearTimeout(timer);
  }, [dispatch, roleFilter]);

  const filteredUsers = mockUsers.filter((user) => {
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
      ADMIN: "bg-red-100 text-red-700",
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

  const getStatusColor = (status) => {
    return status === "active"
      ? "bg-green-100 text-green-700"
      : "bg-red-100 text-red-700";
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
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition bg-white"
          >
            <option value="ALL">All Roles</option>
            <option value="CUSTOMER">Customers</option>
            <option value="SUPPLIER">Suppliers</option>
            <option value="ADMIN">Admins</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-6 py-3 text-left font-semibold text-slate-700">User</th>
              <th className="px-6 py-3 text-left font-semibold text-slate-700">Email</th>
              <th className="px-6 py-3 text-left font-semibold text-slate-700">Role</th>
              <th className="px-6 py-3 text-left font-semibold text-slate-700">Rank</th>
              <th className="px-6 py-3 text-left font-semibold text-slate-700">Rewards</th>
              <th className="px-6 py-3 text-center font-semibold text-slate-700">Verified</th>
              <th className="px-6 py-3 text-center font-semibold text-slate-700">Status</th>
              <th className="px-6 py-3 text-center font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id} className="border-b border-slate-200 hover:bg-slate-50 transition">
                <td className="px-6 py-3">
                  <div className="font-medium text-slate-900">{user.fullName}</div>
                  <div className="text-xs text-slate-500">{user.address.city}</div>
                </td>
                <td className="px-6 py-3 text-slate-600">{user.email}</td>
                <td className="px-6 py-3">
                  <span className={`inline-block px-3 py-1 rounded-lg text-xs font-medium ${getRoleColor(user.role)}`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-3">
                  <span className={`inline-block px-3 py-1 rounded-lg text-xs font-medium ${getRankColor(user.rank)}`}>
                    {user.rank}
                  </span>
                </td>
                <td className="px-6 py-3">
                  <div className="text-slate-900 font-medium">{user.rewardPoints}</div>
                  <div className="text-xs text-slate-500">points</div>
                </td>
                <td className="px-6 py-3 text-center">
                  {user.isVerified ? (
                    <FiCheck className="w-5 h-5 text-green-600 mx-auto" />
                  ) : (
                    <FiX className="w-5 h-5 text-red-600 mx-auto" />
                  )}
                </td>
                <td className="px-6 py-3 text-center">
                  <span className={`inline-block px-3 py-1 rounded-lg text-xs font-medium ${getStatusColor(user.status)}`}>
                    {user.status === "active" ? "Active" : "Blocked"}
                  </span>
                </td>
                <td className="px-6 py-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 transition">
                      <FiEdit2 size={16} />
                    </button>
                    <button className="p-1.5 rounded-lg hover:bg-red-100 text-slate-600 hover:text-red-600 transition">
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-500">No users found</p>
        </div>
      )}
    </div>
  );
}
