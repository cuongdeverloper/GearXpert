import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { showAdminLoading, hideAdminLoading } from "../../redux/action/appAction";
import { FiSearch, FiEdit2, FiTrash2, FiCheck, FiX } from "react-icons/fi";
import { getAdminSuppliers } from "../../service/ApiService/AdminDashboardApi";

export default function SuppliersPage() {
  const dispatch = useDispatch();
  const [searchTerm, setSearchTerm] = useState("");
  const [suppliers, setSuppliers] = useState([]);

  useEffect(() => {
    const fetchSuppliers = async () => {
      dispatch(showAdminLoading());
      try {
        const res = await getAdminSuppliers();
        setSuppliers(res?.suppliers || []);
      } catch (error) {
        console.error("Failed to load suppliers:", error);
      } finally {
        dispatch(hideAdminLoading());
      }
    };

    fetchSuppliers();
  }, [dispatch]);

  const filteredSuppliers = suppliers.filter((supplier) => {
    return (
      supplier.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

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
    return status === "ACTIVE"
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
              placeholder="Search suppliers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
            />
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredSuppliers.map((supplier) => (
          <div
            key={supplier.id}
            className="rounded-xl border border-slate-200 bg-white p-4 hover:shadow-md transition"
          >
            {/* Header */}
            <div className="mb-4 flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900">{supplier.fullName}</h3>
                <p className="text-xs text-slate-500">{supplier.email}</p>
              </div>
              <span
                className={`inline-block px-3 py-1 rounded-lg text-xs font-medium ${getStatusColor(
                  supplier.status
                )}`}
              >
                {supplier.status === "ACTIVE" ? "Active" : "Blocked"}
              </span>
            </div>

            {/* Info Grid */}
            <div className="mb-4 grid grid-cols-2 gap-3 border-t border-b border-slate-200 py-3">
              <div>
                <p className="text-xs text-slate-500">Devices</p>
                <p className="font-semibold text-slate-900">
                  {supplier.totalDevices}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Active Rentals</p>
                <p className="font-semibold text-slate-900">
                  {supplier.activeRentals}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Rank</p>
                <p className="font-semibold text-slate-900">{supplier.rank}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Verified</p>
                <div className="flex gap-1">
                  {supplier.isVerified ? (
                    <FiCheck className="w-5 h-5 text-green-600" />
                  ) : (
                    <FiX className="w-5 h-5 text-red-600" />
                  )}
                </div>
              </div>
            </div>

            {/* Rank Badge */}
            <div className="mb-4">
              <span className={`inline-block px-3 py-1 rounded-lg text-xs font-medium ${getRankColor(supplier.rank)}`}>
                {supplier.rank}
              </span>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-100 transition">
                <FiEdit2 className="inline mr-1.5" size={14} />
                Edit
              </button>
              <button className="flex-1 px-3 py-2 rounded-lg border border-red-200 text-sm font-medium text-red-600 hover:bg-red-50 transition">
                <FiTrash2 className="inline mr-1.5" size={14} />
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredSuppliers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-500">No suppliers found</p>
        </div>
      )}
    </div>
  );
}