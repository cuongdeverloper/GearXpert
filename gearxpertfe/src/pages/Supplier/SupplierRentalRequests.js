import {
  FiCheck,
  FiX,
  FiClock,
  FiCheckCircle,
  FiRotateCw,
  FiAlertTriangle,
  FiEye,
  FiSearch,
  FiFilter,
} from "react-icons/fi";
import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { getSupplierRentalRequests } from "../../service/ApiService/RentalApi";
import { approveRental, rejectRental } from "../../service/ApiService/RentalActionApi";
import { toast } from "react-toastify";
import { confirmDialog } from "../../utils/confirmDialog";
import RentalDetail from "../../components/common/RentalDetail";
import RejectRentalModal from "../../components/supplier/RejectRentalModal";

const STATUS_LABELS = {
  PENDING: "Pending",
  APPROVED: "Confirmed",
  REJECTED: "Rejected",
  DELIVERING: "Delivering",
  RENTING: "Renting",
  RETURNING: "Returning",
  INSPECTING: "Inspecting",
  COMPLETED: "Returned",
  CANCELLED: "Cancelled",
};

const STATUS_STYLES = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  APPROVED: "bg-green-50 text-green-700 border-green-200",
  REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
  DELIVERING: "bg-indigo-50 text-indigo-700 border-indigo-200",
  RENTING: "bg-indigo-50 text-indigo-700 border-indigo-200",
  RETURNING: "bg-purple-50 text-purple-700 border-purple-200",
  INSPECTING: "bg-slate-50 text-slate-700 border-slate-200",
  COMPLETED: "bg-green-50 text-green-700 border-green-200",
  CANCELLED: "bg-red-50 text-red-700 border-red-200",
};

const STATUS_GROUPS = {
  PENDING: ["PENDING"],
  APPROVED: ["APPROVED"],
  RENTING: ["DELIVERING", "RENTING", "RETURNING", "INSPECTING"],
  RETURNED: ["COMPLETED"],
  CANCELLED: ["CANCELLED", "REJECTED"],
};

const TABS = [
  { key: "ALL", label: "All", statuses: [] },
  { key: "PENDING", label: "Pending", statuses: STATUS_GROUPS.PENDING },
  { key: "APPROVED", label: "Confirmed", statuses: STATUS_GROUPS.APPROVED },
  { key: "RENTING", label: "Renting", statuses: STATUS_GROUPS.RENTING },
  { key: "RETURNED", label: "Returned", statuses: STATUS_GROUPS.RETURNED },
  { key: "CANCELLED", label: "Cancelled/Dispute", statuses: STATUS_GROUPS.CANCELLED },
];

const formatMoney = (value) =>
  new Intl.NumberFormat("vi-VN").format(value || 0);

const getRentalCode = (rental, index) => {
  if (rental.orderCode) {
    return `BK${String(rental.orderCode).padStart(4, "0")}`;
  }
  if (rental._id) {
    return `BK${rental._id.slice(-4).toUpperCase()}`;
  }
  return `BK${String(index + 1).padStart(4, "0")}`;
};

const getPrimaryItem = (rental) => {
  const items = rental.rentalItems || [];
  return items[0] || null;
};

export default function SupplierRentalRequests() {
  const user = useSelector((state) => state.user.account);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(8);
  const [detailModal, setDetailModal] = useState({ open: false, rental: null });
  const [rejectModal, setRejectModal] = useState({ open: false, rental: null });
  const [rejectSubmitting, setRejectSubmitting] = useState(false);

  const fetchRequests = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await getSupplierRentalRequests(user.id, {
        status:
          "PENDING,APPROVED,REJECTED,DELIVERING,RENTING,RETURNING,INSPECTING,COMPLETED,CANCELLED",
      });
      setRequests(res?.rentals || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load rental requests");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [user?.id]);

  const handleApprove = async (req) => {
    const result = await confirmDialog({
      title: "Confirm approval?",
      text: "Are you sure you want to approve this rental request?",
      icon: "question",
      confirmText: "Approve",
      cancelText: "Cancel",
      confirmColor: "#16a34a",
    });
    if (result.isConfirmed) {
      try {
        await approveRental(req._id);
        toast.success("Rental request approved!");
        fetchRequests();
      } catch (err) {
        toast.error(err?.response?.data?.message || "Approve failed");
      }
    }
  };

  const handleReject = async (req) => {
    setRejectModal({ open: true, rental: req });
  };

  const submitReject = async (payload) => {
    if (!rejectModal.rental?._id) return;
    const result = await confirmDialog({
      title: "Send rejection?",
      text: "This will notify the customer and reject the booking.",
      icon: "warning",
      confirmText: "Reject booking",
      cancelText: "Cancel",
      confirmColor: "#dc2626",
    });
    if (!result.isConfirmed) return;

    setRejectSubmitting(true);
    try {
      await rejectRental(rejectModal.rental._id, payload);
      toast.success("Rental request rejected!");
      setRejectModal({ open: false, rental: null });
      fetchRequests();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Reject failed");
    } finally {
      setRejectSubmitting(false);
    }
  };

  const counts = useMemo(() => {
    const base = {
      ALL: requests.length,
      PENDING: 0,
      APPROVED: 0,
      RENTING: 0,
      RETURNED: 0,
      CANCELLED: 0,
    };
    requests.forEach((r) => {
      if (STATUS_GROUPS.PENDING.includes(r.status)) base.PENDING += 1;
      if (STATUS_GROUPS.APPROVED.includes(r.status)) base.APPROVED += 1;
      if (STATUS_GROUPS.RENTING.includes(r.status)) base.RENTING += 1;
      if (STATUS_GROUPS.RETURNED.includes(r.status)) base.RETURNED += 1;
      if (STATUS_GROUPS.CANCELLED.includes(r.status)) base.CANCELLED += 1;
    });
    return base;
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const tab = TABS.find((t) => t.key === activeTab);
    return requests
      .filter((rental) => {
        if (!tab || tab.statuses.length === 0) return true;
        return tab.statuses.includes(rental.status);
      })
      .filter((rental) => {
        if (!term) return true;
        const primaryItem = getPrimaryItem(rental);
        const productName = primaryItem?.deviceId?.name || "";
        const customerName = rental.customerId?.fullName || "";
        const phone = rental.phoneNumber || "";
        const code = getRentalCode(rental, 0);
        return [code, productName, customerName, phone]
          .join(" ")
          .toLowerCase()
          .includes(term);
      });
  }, [requests, activeTab, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / pageSize));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, searchTerm]);

  const pagedRequests = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRequests.slice(start, start + pageSize);
  }, [filteredRequests, page, pageSize]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 font-display tracking-tight">
          Bookings / Booking
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Manage all rental requests from customers
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center gap-3">
          <span className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 inline-flex items-center justify-center">
            <FiClock size={18} />
          </span>
          <div>
            <p className="text-xs text-slate-500">Pending</p>
            <p className="text-lg font-bold text-slate-900">{counts.PENDING}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center gap-3">
          <span className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 inline-flex items-center justify-center">
            <FiCheckCircle size={18} />
          </span>
          <div>
            <p className="text-xs text-slate-500">Renting</p>
            <p className="text-lg font-bold text-slate-900">{counts.RENTING}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center gap-3">
          <span className="h-10 w-10 rounded-xl bg-green-50 text-green-600 inline-flex items-center justify-center">
            <FiRotateCw size={18} />
          </span>
          <div>
            <p className="text-xs text-slate-500">Returned</p>
            <p className="text-lg font-bold text-slate-900">{counts.RETURNED}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center gap-3">
          <span className="h-10 w-10 rounded-xl bg-red-50 text-red-600 inline-flex items-center justify-center">
            <FiAlertTriangle size={18} />
          </span>
          <div>
            <p className="text-xs text-slate-500">Cancelled/Dispute</p>
            <p className="text-lg font-bold text-slate-900">{counts.CANCELLED}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="p-4 border-b border-slate-100 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Booking list</h3>
            <p className="text-sm text-slate-500">
              Total {requests.length} bookings
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
            <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <FiFilter size={16} />
              Filter
            </button>
          </div>
        </div>

        <div className="px-4 pt-2">
          <div className="inline-flex flex-wrap gap-2 rounded-xl bg-slate-50 p-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all ${
                  activeTab === tab.key
                    ? "bg-white text-slate-900 border-slate-200 shadow-sm"
                    : "bg-transparent text-slate-600 border-transparent hover:text-slate-900"
                }`}
              >
                {tab.label} <span className="ml-2 text-xs text-slate-500">{counts[tab.key] || 0}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-slate-500 border-b border-slate-200">
              <tr className="text-left">
                <th className="px-4 py-3 font-semibold">Order ID</th>
                <th className="px-4 py-3 font-semibold">Product</th>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Rental period</th>
                <th className="px-4 py-3 font-semibold">Rental fee</th>
                <th className="px-4 py-3 font-semibold">Deposit</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-left"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagedRequests.map((rental, index) => {
                const primaryItem = getPrimaryItem(rental);
                const deviceName = primaryItem?.deviceId?.name || "Device";
                const extraCount = (rental.rentalItems?.length || 0) - 1;
                const rentalStart = primaryItem?.rentalStartDate || rental.rentalStartDate;
                const rentalEnd = primaryItem?.rentalEndDate || rental.rentalEndDate;
                const statusLabel = STATUS_LABELS[rental.status] || rental.status;
                const statusClass = STATUS_STYLES[rental.status] || STATUS_STYLES.INSPECTING;
                const code = getRentalCode(rental, index + (page - 1) * pageSize);
                return (
                  <tr key={rental._id || rental.id} className="hover:bg-slate-50">
                    <td className="px-4 py-4 font-semibold text-slate-900">{code}</td>
                    <td className="px-4 py-4 text-slate-900">
                      <span className="font-medium">{deviceName}</span>
                      {extraCount > 0 && (
                        <span className="text-xs text-slate-500 ml-2">
                          +{extraCount} more
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-slate-900">{rental.customerId?.fullName || "Customer"}</div>
                      <div className="text-xs text-slate-500">{rental.phoneNumber || "-"}</div>
                    </td>
                    <td className="px-4 py-4 text-slate-700">
                      {rentalStart?.slice(0, 10)} - {rentalEnd?.slice(0, 10)}
                    </td>
                    <td className="px-4 py-4 font-semibold text-slate-900">
                      {formatMoney(rental.rentPriceTotal)} ₫
                    </td>
                    <td className="px-4 py-4 text-slate-700">
                      {formatMoney(rental.depositAmount)} ₫
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold border ${statusClass}`}>
                        {statusLabel}
                      </span>
                    </td>
                    <td className="px-4 py-4 align-middle text-left">
                      <div className="inline-flex items-center justify-start gap-3">
                        <button
                          onClick={() => setDetailModal({ open: true, rental })}
                          className="text-slate-500 hover:text-slate-900"
                          title="View"
                        >
                          <FiEye size={16} />
                        </button>
                        {rental.status === "PENDING" && (
                          <>
                            <button
                              onClick={() => handleApprove(rental)}
                              className="text-emerald-600 hover:text-emerald-700"
                              title="Approve"
                            >
                              <FiCheck size={16} />
                            </button>
                            <button
                              onClick={() => handleReject(rental)}
                              className="text-red-600 hover:text-red-700"
                              title="Reject"
                            >
                              <FiX size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && filteredRequests.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                    No matching bookings.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                    Loading...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filteredRequests.length > 0 && (
          <div className="flex items-center justify-between px-4 py-4 border-t border-slate-100 text-sm text-slate-600">
            <span>
              Showing {(page - 1) * pageSize + 1}-
              {Math.min(page * pageSize, filteredRequests.length)} of{" "}
              {filteredRequests.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                Prev
              </button>
              <span className="text-slate-500">
                Page {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
      <RejectRentalModal
        open={rejectModal.open}
        rental={rejectModal.rental}
        onClose={() => setRejectModal({ open: false, rental: null })}
        onSubmit={submitReject}
        isSubmitting={rejectSubmitting}
      />
      {/* Rental Detail Modal */}
      <RentalDetail
        open={detailModal.open}
        onClose={() => setDetailModal({ open: false, rental: null })}
        rental={detailModal.rental}
      />
    </div>
  );
}
