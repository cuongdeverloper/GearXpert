import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { mockDevices } from "../../mocks/adminMock";
import { showAdminLoading, hideAdminLoading } from "../../redux/action/appAction";
import AddDeviceModal from "../../components/admin/AddDeviceModal";
import { FiSearch, FiFilter, FiStar, FiEdit2, FiTrash2, FiCheckCircle, FiAlertCircle, FiPlus } from "react-icons/fi";

export default function DevicesModerationPage() {
  const dispatch = useDispatch();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Simulate data loading
  useEffect(() => {
    dispatch(showAdminLoading());
    const timer = setTimeout(() => {
      dispatch(hideAdminLoading());
    }, 300);
    return () => clearTimeout(timer);
  }, [dispatch, categoryFilter, statusFilter]);

  const filteredDevices = mockDevices.filter((device) => {
    const matchesSearch =
      device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.supplierName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "ALL" || device.category === categoryFilter;
    const matchesStatus = statusFilter === "ALL" || device.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getStatusColor = (status) => {
    const colors = {
      AVAILABLE: "bg-green-100 text-green-700",
      RENTED: "bg-blue-100 text-blue-700",
      MAINTENANCE: "bg-yellow-100 text-yellow-700",
      BROKEN: "bg-red-100 text-red-700",
      STOPPED: "bg-slate-100 text-slate-700",
    };
    return colors[status] || "bg-slate-100 text-slate-700";
  };

  const getCategoryColor = (category) => {
    const colors = {
      CAMERA: "bg-purple-100 text-purple-700",
      AUDIO: "bg-indigo-100 text-indigo-700",
      OFFICE: "bg-blue-100 text-blue-700",
      GAMING: "bg-orange-100 text-orange-700",
      ACCESSORY: "bg-cyan-100 text-cyan-700",
    };
    return colors[category] || "bg-slate-100 text-slate-700";
  };

  const getStatusIcon = (status) => {
    if (status === "AVAILABLE") return <FiCheckCircle className="w-4 h-4" />;
    if (status === "MAINTENANCE" || status === "BROKEN") return <FiAlertCircle className="w-4 h-4" />;
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 gap-3 flex-wrap lg:flex-nowrap">
          <div className="relative flex-1 max-w-md">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search devices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition bg-white"
          >
            <option value="ALL">All Categories</option>
            <option value="CAMERA">Camera</option>
            <option value="AUDIO">Audio</option>
            <option value="OFFICE">Office</option>
            <option value="GAMING">Gaming</option>
            <option value="ACCESSORY">Accessory</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition bg-white"
          >
            <option value="ALL">All Status</option>
            <option value="AVAILABLE">Available</option>
            <option value="RENTED">Rented</option>
            <option value="MAINTENANCE">Maintenance</option>
            <option value="BROKEN">Broken</option>
            <option value="STOPPED">Stopped</option>
          </select>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-primary-dark transition whitespace-nowrap"
        >
          <FiPlus size={18} />
          Add Device
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-6 py-3 text-left font-semibold text-slate-700">Device</th>
              <th className="px-6 py-3 text-left font-semibold text-slate-700">Supplier</th>
              <th className="px-6 py-3 text-left font-semibold text-slate-700">Category</th>
              <th className="px-6 py-3 text-center font-semibold text-slate-700">Stock</th>
              <th className="px-6 py-3 text-right font-semibold text-slate-700">Daily Rate</th>
              <th className="px-6 py-3 text-center font-semibold text-slate-700">Rating</th>
              <th className="px-6 py-3 text-center font-semibold text-slate-700">Status</th>
              <th className="px-6 py-3 text-center font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredDevices.map((device) => (
              <tr key={device.id} className="border-b border-slate-200 hover:bg-slate-50 transition">
                <td className="px-6 py-3">
                  <div className="font-medium text-slate-900">{device.name}</div>
                  <div className="text-xs text-slate-500">{device.location.city}</div>
                </td>
                <td className="px-6 py-3 text-slate-600">{device.supplierName}</td>
                <td className="px-6 py-3">
                  <span className={`inline-block px-3 py-1 rounded-lg text-xs font-medium ${getCategoryColor(device.category)}`}>
                    {device.category}
                  </span>
                </td>
                <td className="px-6 py-3 text-center">
                  <span className={`font-medium ${device.stockQuantity === 0 ? "text-red-600" : "text-slate-900"}`}>
                    {device.stockQuantity}
                  </span>
                </td>
                <td className="px-6 py-3 text-right font-medium text-slate-900">
                  ${device.rentPrice.perDay}/day
                </td>
                <td className="px-6 py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <FiStar className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{device.ratingAvg}</span>
                    <span className="text-xs text-slate-500">({device.reviewCount})</span>
                  </div>
                </td>
                <td className="px-6 py-3 text-center">
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-medium ${getStatusColor(device.status)}`}>
                    {getStatusIcon(device.status)}
                    {device.status}
                  </div>
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

      {filteredDevices.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-500">No devices found</p>
        </div>
      )}

      {/* Add Device Modal */}
      <AddDeviceModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
