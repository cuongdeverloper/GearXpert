import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { showAdminLoading, hideAdminLoading } from "../../redux/action/appAction";
import { FiSearch, FiFilter, FiCheckCircle, FiAlertCircle, FiClock, FiX } from "react-icons/fi";
import { getAdminRentals } from "../../service/ApiService/AdminDashboardApi";

export default function RentalsPage() {
  const dispatch = useDispatch();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [rentals, setRentals] = useState([]);

  useEffect(() => {
    const fetchRentals = async () => {
      dispatch(showAdminLoading());
      try {
        const res = await getAdminRentals();
        setRentals(res?.rentals || []);
      } catch (error) {
        console.error("Failed to load rentals:", error);
      } finally {
        dispatch(hideAdminLoading());
      }
    };

    fetchRentals();
  }, [dispatch, statusFilter]);

  const filteredRentals = rentals.filter((rental) => {
    const matchesSearch =
      (rental.customerName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rental.deviceName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rental.supplierName || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || rental.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    const colors = {
      PENDING: "bg-yellow-100 text-yellow-700",
      APPROVED: "bg-blue-100 text-blue-700",
      PAID: "bg-green-100 text-green-700",
      DELIVERING: "bg-indigo-100 text-indigo-700",
      RENTING: "bg-purple-100 text-purple-700",
      RETURNING: "bg-orange-100 text-orange-700",
      COMPLETED: "bg-green-100 text-green-700",
      CANCELLED: "bg-red-100 text-red-700",
    };
    return colors[status] || "bg-slate-100 text-slate-700";
  };

  const getStatusIcon = (status) => {
    if (status === "COMPLETED") return <FiCheckCircle className="w-4 h-4" />;
    if (status === "CANCELLED") return <FiX className="w-4 h-4" />;
    if (status === "PENDING") return <FiClock className="w-4 h-4" />;
    return <FiAlertCircle className="w-4 h-4" />;
  };

  const getPaymentStatusColor = (status) => {
    const colors = {
      PAID: "text-green-600",
      UNPAID: "text-red-600",
      REFUNDED: "text-blue-600",
    };
    return colors[status] || "text-slate-600";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "N/A";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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
              placeholder="Search rentals..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition bg-white"
          >
            <option value="ALL">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="RENTING">Renting</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-6 py-3 text-left font-semibold text-slate-700">Rental ID</th>
              <th className="px-6 py-3 text-left font-semibold text-slate-700">Customer</th>
              <th className="px-6 py-3 text-left font-semibold text-slate-700">Supplier</th>
              <th className="px-6 py-3 text-left font-semibold text-slate-700">Device</th>
              <th className="px-6 py-3 text-left font-semibold text-slate-700">Duration</th>
              <th className="px-6 py-3 text-right font-semibold text-slate-700">Amount</th>
              <th className="px-6 py-3 text-center font-semibold text-slate-700">Payment</th>
              <th className="px-6 py-3 text-center font-semibold text-slate-700">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredRentals.map((rental) => (
              <tr key={rental.id} className="border-b border-slate-200 hover:bg-slate-50 transition">
                <td className="px-6 py-3 font-medium text-slate-900">{rental.id}</td>
                <td className="px-6 py-3">
                  <div className="font-medium text-slate-900">{rental.customerName}</div>
                  <div className="text-xs text-slate-500">{rental.deliveryAddress?.city || "N/A"}</div>
                </td>
                <td className="px-6 py-3 text-slate-600">{rental.supplierName || "Unknown"}</td>
                <td className="px-6 py-3 text-slate-600">{rental.deviceName}</td>
                <td className="px-6 py-3 text-slate-600">
                  <div className="text-xs">
                    {formatDate(rental.rentalStartDate)} - {formatDate(rental.rentalEndDate)}
                  </div>
                </td>
                <td className="px-6 py-3 text-right font-medium text-slate-900">${rental.totalAmount}</td>
                <td className="px-6 py-3 text-center">
                  <span className={`font-medium text-sm ${getPaymentStatusColor(rental.paymentStatus)}`}>
                    {rental.paymentStatus}
                  </span>
                </td>
                <td className="px-6 py-3 text-center">
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-medium ${getStatusColor(rental.status)}`}>
                    {getStatusIcon(rental.status)}
                    {rental.status}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredRentals.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-500">No rentals found</p>
        </div>
      )}
    </div>
  );
}
