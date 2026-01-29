import React, { useEffect, useState } from "react";
import {
  Package,
  Clock,
  CheckCircle2,
  Truck,
  AlertCircle,
  Calendar,
  MapPin,
  Loader2,
  XCircle,
  ShieldCheck,
  Receipt,
  ChevronDown,
  RefreshCcw,
  Camera,
  Star,
  FileText,
  Send,
  Wrench,
  X,
  Check,ArrowRight,ArrowLeft
} from "lucide-react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import * as rentalService from "../../service/ApiService/RentalApi";
import Header from "../../components/navigation/Header";
import { hasReviewedRental } from "../../service/ApiService/RentalApi";
const STATUS_TABS = [
  { id: "ALL", label: "Tất cả" },
  { id: "PENDING", label: "Chờ duyệt" },
  { id: "DELIVERING", label: "Đang giao" },
  { id: "RENTING", label: "Đang thuê" },
  { id: "COMPLETED", label: "Hoàn thành" },
  { id: "CANCELLED", label: "Đã hủy" },
];

const REPORT_REASON_MAP = {
  "Thiết bị bị hỏng": "DAMAGED",
  "Thiết bị không đúng mô tả": "WRONG_ITEM",
  "Thiếu phụ kiện": "MISSING",
  Khác: "OTHER",
};

const REPORT_REASONS = Object.keys(REPORT_REASON_MAP);

export default function MyRentals() {
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("ALL");
  const navigate = useNavigate();
  const [reviewSelectedItems, setReviewSelectedItems] = useState([]); // array rentalItemId
  const [hasReviewed, setHasReviewed] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const ITEMS_PER_PAGE = 5;
  const [currentPage, setCurrentPage] = useState(1);


  
  const [reportDetailModal, setReportDetailModal] = useState({
    isOpen: false,
    report: null,
    itemName: "",
  });
  const [damageDetailModal, setDamageDetailModal] = useState({
    isOpen: false,
    report: null,
    itemName: "",
  });
  const [damageReportModal, setDamageReportModal] = useState({
    isOpen: false,
    rentalId: null,
    selectedItems: [], // array rentalItemId
    severity: "MEDIUM", // LOW | MEDIUM | HIGH
    description: "",
    files: [],
    order: null,
  });
  // Modal State cho Confirm/Cancel
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    type: "",
    selectedId: null,
    title: "",
    description: "",
  });
  // Modal State cho Detail
  const [detailModal, setDetailModal] = useState({
    isOpen: false,
    order: null,
  });
  // --- NEW MODAL STATES ---
  const [trackingModal, setTrackingModal] = useState({
    isOpen: false,
    order: null,
  });
  // ===== UPDATED: REPORT MODAL =====
  const [DeliReportModal, setDeliReportModal] = useState({
    isOpen: false,
    rentalId: null,
    selectedItems: [], // Array của rentalItemId (item._id)
    // FIX: Xóa deviceId nếu không cần, hoặc làm array nếu multiple
    reasonType: "",
    description: "",
    files: [],
    order: null, // FIX: Thêm order vào state để hiển thị items
  });

  const toggleItemSelection = (rentalItemId) => {
    // FIX: Sử dụng rentalItemId (item._id) thay vì deviceId
    const currentSelected = DeliReportModal.selectedItems || [];
    const nextSelected = currentSelected.includes(rentalItemId)
      ? currentSelected.filter((id) => id !== rentalItemId)
      : [...currentSelected, rentalItemId];
    setDeliReportModal({
      ...DeliReportModal,
      selectedItems: nextSelected,
    });
  };

  // ===== UPDATED: REVIEW MODAL =====
  const [reviewModal, setReviewModal] = useState({
    isOpen: false,
    orderId: null,
    rating: 5,
    comment: "",
    files: [],
  });
  // ===== NEW: EXTEND RENTAL MODAL =====
  const [extendModal, setExtendModal] = useState({
    isOpen: false,
    orderId: null,
    currentEndDate: null,
    newEndDate: "",
    dailyPrice: 0,
    extraAmount: 0,
    note: "", // thêm để lưu ghi chú
    order: null, // <--- THÊM DÒNG NÀY
  });
  // Hàm tính tiền khi khách chọn ngày mới
  const handleDateChange = (date) => {
    const start = new Date(extendModal.currentEndDate);
    const end = new Date(date);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const diffDays = (end - start) / (1000 * 60 * 60 * 24);
    setExtendModal({
      ...extendModal,
      newEndDate: date,
      extraAmount: diffDays > 0 ? diffDays * extendModal.dailyPrice : 0,
    });
  };
  // const [incidentModal, setIncidentModal] = useState({
  //   isOpen: false,
  //   orderId: null,
  //   issueType: "technical", // technical | physical | power
  //   severity: "medium", // low | medium | critical
  //   description: "",
  //   errorCode: "",
  //   files: [], // Khởi tạo mảng rỗng để không bị lỗi map
  // });
  useEffect(() => {
    fetchRentals();
  }, []);
  const fetchRentals = async () => {
    try {
      setLoading(true);
      const res = await rentalService.getMyRentals();
      setRentals(res.rentals || []);
    } catch (error) {
      toast.error("Không thể tải danh sách đơn thuê");
    } finally {
      setLoading(false);
    }
  };
  // ================= HELPERS =================
  const handleFileUpload = (files, setter) => {
    setter((prev) => ({
      ...prev,
      files: [...prev.files, ...Array.from(files)],
    }));
  };
  const renderFilePreview = (file) => {
    const url = URL.createObjectURL(file);
    if (file.type.startsWith("image"))
      return (
        <img src={url} alt="preview" className="w-20 h-20 rounded-xl object-cover border" />
      );
    if (file.type.startsWith("video"))
      return <video src={url} className="w-20 h-20 rounded-xl" controls />;
    return null;
  };
  // ================= SUBMIT =================
  const handleSubmitDeliReport = async () => {
    if (!DeliReportModal.reasonType) {
      return toast.warning("Vui lòng chọn lý do");
    }
    if (!DeliReportModal.selectedItems.length) {
      return toast.warning("Vui lòng chọn ít nhất một item");
    }
    try {
      const formData = new FormData();
      formData.append("rentalId", DeliReportModal.rentalId);
      // FIX: Append array selectedItems (rentalItemIds) thay vì một rentalItemId
      DeliReportModal.selectedItems.forEach((rentalItemId) => {
        formData.append("rentalItemIds[]", rentalItemId); // Dạng array cho backend (hoặc JSON.stringify nếu backend yêu cầu)
      });
      // FIX: Nếu cần deviceIds, loop tương tự (dựa trên selectedItems map ra deviceId từ order.items)
      // Ví dụ: const selectedDevices = DeliReportModal.order.items.filter(item => DeliReportModal.selectedItems.includes(item._id)).map(item => item.deviceId?._id);
      // selectedDevices.forEach(id => formData.append("deviceIds[]", id));
      formData.append(
        "issueType",
        REPORT_REASON_MAP[DeliReportModal.reasonType]
      );
      formData.append("description", DeliReportModal.description);
      DeliReportModal.files.forEach((file) => {
        formData.append("images", file);
      });
      await rentalService.reportDeliveryIssue(formData);
      toast.success("Báo cáo đã được gửi");
      setDeliReportModal({
        isOpen: false,
        rentalId: null,
        selectedItems: [],
        reasonType: "",
        description: "",
        files: [],
        order: null, // FIX: Reset order
      });
    } catch (err) {
      toast.error(err.response?.data?.message || "Gửi báo cáo thất bại");
    }
  };
  // const handleTabChange = (tabId) => {
  //   setActiveTab(tabId);
  //   setCurrentPage(1); // reset về trang 1 khi đổi tab
  // };
  const handleSubmitReview = async () => {
    if (reviewModal.rating === 0) {
      return toast.warning("Vui lòng chọn số sao!");
    }

    setReviewLoading(true);

    try {
      const itemsToReview =
        reviewSelectedItems.length > 0
          ? reviewSelectedItems
          : reviewModal.order?.items?.map((item) => item._id) || []; // Nếu không chọn → review hết

      if (itemsToReview.length === 0) {
        return toast.warning("Không có thiết bị nào để đánh giá");
      }

      const formData = new FormData();
      formData.append("rating", reviewModal.rating);
      formData.append("comment", reviewModal.comment.trim());
      formData.append("rentalId", reviewModal.orderId);

      // Gửi array rentalItemIds
      itemsToReview.forEach((id) => formData.append("rentalItemIds[]", id));

      reviewModal.files.forEach((file) => formData.append("images", file));

      await rentalService.submitReview(reviewModal.orderId, formData);

      toast.success(`Đã gửi đánh giá cho ${itemsToReview.length} thiết bị!`);

      setHasReviewed(true);
      setReviewModal({
        isOpen: false,
        orderId: null,
        rating: 5,
        comment: "",
        files: [],
        order: null,
      });
      setReviewSelectedItems([]);
      fetchRentals();
    } catch (err) {
      console.error("Review error:", err);
      toast.error(err.response?.data?.message || "Gửi đánh giá thất bại");
    } finally {
      setReviewLoading(false);
    }
  };

  const openReviewModal = async (order) => {
    try {
      const res = await hasReviewedRental(order._id);
      setHasReviewed(res.hasReviewed);
    } catch (err) {
      setHasReviewed(false);
      toast.warning(
        "Không thể kiểm tra trạng thái đánh giá, bạn vẫn có thể đánh giá"
      );
    }

    // Reset selected items khi mở modal
    setReviewSelectedItems([]);

    setReviewModal({
      isOpen: true,
      orderId: order._id,
      rating: 5,
      comment: "",
      files: [],
      order: order, // Thêm order để lấy items
    });
  };
  const handleSubmitExtend = async () => {
    if (!extendModal.newEndDate) {
      return toast.warning("Vui lòng chọn ngày gia hạn mới");
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const newEnd = new Date(extendModal.newEndDate);
    newEnd.setHours(0, 0, 0, 0);

    if (newEnd <= today) {
      return toast.warning("Ngày gia hạn phải lớn hơn hôm nay");
    }

    // Tính phí (chỉ để hiển thị, không dùng để trừ tiền ngay)
    const selectedItem = extendModal.order?.items?.[0];
    if (!selectedItem) return toast.error("Không tìm thấy thông tin đơn");

    const dailyPrice = selectedItem.rentPrice / selectedItem.totalDays;
    const extensionDays = Math.ceil(
      (newEnd - new Date(extendModal.currentEndDate)) / (1000 * 60 * 60 * 24)
    );
    const extraAmount = Math.round(
      extensionDays * dailyPrice * selectedItem.quantity
    );

    if (extraAmount <= 0) {
      return toast.warning("Không có ngày gia hạn hợp lệ");
    }

    // Xác nhận trước khi gửi
    if (
      !window.confirm(
        `Bạn muốn gửi yêu cầu gia hạn ${extensionDays} ngày với phí phát sinh ${extraAmount.toLocaleString()} ₫?`
      )
    ) {
      return;
    }

    try {
      const payload = {
        newEndDate: extendModal.newEndDate,
        requestedDays: extensionDays,
        extraAmount, // gửi để supplier xem
        note: extendModal.note || "",
      };

      await rentalService.extendRental(extendModal.orderId, payload);

      toast.success(
        "Yêu cầu gia hạn đã được gửi! Chúng tôi sẽ thông báo khi bên cho thuê duyệt."
      );

      setExtendModal({
        isOpen: false,
        orderId: null,
        currentEndDate: null,
        newEndDate: "",
        dailyPrice: 0,
        extraAmount: 0,
        note: "",
        order: null,
      });

      fetchRentals(); // refresh để xem status mới
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Gửi yêu cầu gia hạn thất bại"
      );
    }
  };
  const handleOpenModal = (type, id) => {
    const config =
      type === "CANCEL"
        ? {
          title: "Xác nhận hủy đơn?",
          description:
            "Tiền sẽ được hoàn về ví nếu bạn đã thanh toán thành công.",
        }
        : {
          title: "Xác nhận nhận hàng?",
          description:
            "Vui lòng chỉ xác nhận khi bạn đã kiểm tra kỹ thiết bị.",
        };
    setModalConfig({ isOpen: true, type, selectedId: id, ...config });
  };
  const handleModalConfirm = async () => {
    const { type, selectedId } = modalConfig;
    console.log("Đang thực hiện action:", type, "cho đơn:", selectedId); // Kiểm tra log này

    try {
      if (type === "CANCEL") {
        await rentalService.cancelRental(selectedId);
        toast.success("Đã hủy đơn thành công!");
      } else {
        await rentalService.confirmReceived(selectedId);
        toast.success("Xác nhận đã nhận hàng thành công!");
      }

      // Đóng modal và load lại data
      setModalConfig({ ...modalConfig, isOpen: false });
      fetchRentals();

    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "Lỗi thao tác, vui lòng thử lại";
      toast.error(errorMsg);
      setModalConfig({ ...modalConfig, isOpen: false });
    }
  };
  const handleReRent = (order) => {
    if (order.items && order.items.length > 0) {
      navigate(`/device/${order.items[0].deviceId?._id || ""}`);
    } else {
      navigate("/devices");
    }
  };
  // const extensionInfo = {
  //   days:
  //     extendModal.currentEndDate && extendModal.newEndDate
  //       ? Math.max(
  //         0,
  //         (new Date(extendModal.newEndDate) -
  //           new Date(extendModal.currentEndDate)) /
  //         (1000 * 60 * 60 * 24)
  //       )
  //       : 0,
  //   cost: extendModal.extraAmount || 0,
  // };

  const filteredRentals = rentals.filter((r) => {
    if (activeTab === "ALL") return true;
    if (activeTab === "DELIVERING") {
      return r.status === "DELIVERING" || r.status === "APPROVED";
    }
    return r.status === activeTab;
  });
  const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
  const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
  const currentRentals = filteredRentals.slice(
    indexOfFirstItem,
    indexOfLastItem
  );
  const totalPages = Math.ceil(filteredRentals.length / ITEMS_PER_PAGE);
  const minExtendDate = extendModal.currentEndDate
    ? new Date(
      new Date(extendModal.currentEndDate).getTime() + 24 * 60 * 60 * 1000
    )
      .toISOString()
      .split("T")[0]
    : "";
  return (
    <div className="min-h-screen bg-[#F8F9FB] pb-20 font-sans">
      <Header />
      <div className="max-w-5xl mx-auto px-4 pt-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <h1 className="text-5xl font-black text-gray-900 tracking-tighter italic uppercase">
              My <span className="text-indigo-600 not-italic">Orders</span>
            </h1>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-[0.3em] mt-2">
              Lịch sử thuê và trạng thái thiết bị thực tế
            </p>
          </div>
        </div>
        {/* Tab Selection */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-8 no-scrollbar">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 rounded-2xl text-[11px] font-black uppercase transition-all whitespace-nowrap ${activeTab === tab.id
                ? "bg-gray-900 text-white shadow-2xl shadow-gray-300 scale-105"
                : "bg-white text-gray-400 border border-gray-100 hover:bg-gray-50"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {loading ? (
          <div className="flex flex-col items-center py-20">
            <Loader2 className="animate-spin text-indigo-600 mb-4" size={32} />
            <span className="text-[10px] font-bold uppercase text-gray-400 tracking-widest italic">
              Loading your assets...
            </span>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Pagination */}
            {!loading && filteredRentals.length > 0 && totalPages > 1 && (
              <div className="flex justify-center items-center gap-3 mt-12">
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                  className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ${
                    currentPage === 1
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-white border border-gray-200 hover:bg-gray-50 shadow-sm"
                  }`}
                >
                  <ArrowLeft size={16} /> Trước
                </button>

                <div className="flex gap-2">
                  {[...Array(totalPages)].map((_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-10 h-10 rounded-xl font-bold text-sm transition-all ${
                          currentPage === pageNum
                            ? "bg-indigo-600 text-white shadow-md"
                            : "bg-white border border-gray-200 hover:bg-gray-50 text-gray-700"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                  className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ${
                    currentPage === totalPages
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-white border border-gray-200 hover:bg-gray-50 shadow-sm"
                  }`}
                >
                  Sau <ArrowRight size={16} />
                </button>
              </div>
            )}
            {currentRentals.length > 0 ? (
              currentRentals.map((order) => (
                <div
                  key={order._id}
                  className="group bg-white rounded-[3rem] border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500"
                >
                  {/* Top Bar – Thêm thông tin Supplier */}
                  <div className="px-8 py-5 border-b border-gray-50 flex flex-wrap items-center justify-between gap-4 bg-[#FCFCFE]">
                    <div className="flex items-center gap-4">
                      {/* Avatar Supplier */}
                      <div className="relative">
                        {!order.items?.[0]?.deviceId?.supplierId?.avatar ? (
                          <div className="w-12 h-12 rounded-2xl bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-xl">
                            Shop
                          </div>
                        ) : (
                          <img
                            src={order.items?.[0]?.deviceId?.supplierId?.avatar}
                            alt={
                              order.items?.[0]?.deviceId?.supplierId
                                ?.fullName || "Supplier"
                            }
                            className="w-12 h-12 rounded-2xl object-cover"
                            onError={(e) => {
                              e.target.onerror = null; // ngăn loop
                              e.target.src =
                                "https://placehold.co/48x48?text=Shop";
                            }}
                          />
                        )}
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white"></div>
                      </div>

                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                          Từ nhà cung cấp
                        </p>
                        <h3 className="text-base font-bold text-gray-900 tracking-tight">
                          {order.items?.[0]?.deviceId?.supplierId?.fullName ||
                            "Unknown Supplier"}
                        </h3>
                        <p className="text-[11px] text-gray-500">
                          #{order._id?.slice(-8).toUpperCase()}
                        </p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-3">
                      <div
                        className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-sm ${order.status === "PENDING"
                          ? "bg-amber-100 text-amber-600"
                          : order.status === "DELIVERING"
                            ? "bg-blue-100 text-blue-600"
                            : order.status === "RENTING"
                              ? "bg-emerald-100 text-emerald-600"
                              : "bg-gray-100 text-gray-500"
                          }`}
                      >
                        {order.status === "APPROVED"
                          ? "Đã duyệt"
                          : order.status}
                      </div>
                    </div>
                  </div>
                  <div className="p-8">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                      {/* Left Side */}
                      <div className="lg:col-span-7 space-y-6">
                        <div className="space-y-4">
                          {order.items?.map((item, i) => {
                            // Debug (comment sau khi fix)
                            // console.log(`Item ${i}:`, item);

                            let latestReport = null;
                            let reportType = null;

                            if (order.status === "DELIVERING") {
                              latestReport = item.deliveryIssues?.[0] || null;
                              reportType = "delivery";
                            } else if (order.status === "RENTING") {
                              latestReport = item.damageReports?.[0] || null;
                              reportType = "damage";
                            }

                            const hasReport = !!latestReport;
                            const reportStatus = latestReport?.status || null;

                            // isActiveReport an toàn
                            const isActiveReport =
                              hasReport &&
                              reportStatus &&
                              ((order.status === "DELIVERING" &&
                                (reportStatus === "OPEN" ||
                                  reportStatus === "PROCESSING")) ||
                                (order.status === "RENTING" &&
                                  (reportStatus === "OPEN" ||
                                    reportStatus === "VERIFIED")));

                            // Badge label an toàn 100%
                            let reportStatusLabel = null;
                            if (hasReport) {
                              if (isActiveReport) {
                                reportStatusLabel = "Đang xử lý khiếu nại";
                              } else if (reportStatus === "RESOLVED") {
                                reportStatusLabel = "Đã giải quyết";
                              } else if (reportStatus === "REJECTED") {
                                reportStatusLabel = "Bị từ chối";
                              } else {
                                reportStatusLabel = "Đã báo cáo";
                              }
                            }

                            return (
                              <div
                                key={i}
                                onClick={() =>
                                  navigate(`/device/${item.deviceId?._id}`)
                                }
                                className={`relative flex items-center gap-5 p-4 rounded-[2rem] transition-all cursor-pointer group/item ${hasReport
                                  ? isActiveReport
                                    ? "bg-red-50/70 border-2 border-red-300 shadow-sm shadow-red-100"
                                    : "bg-green-50/60 border border-green-200"
                                  : "bg-gray-50 border border-transparent hover:border-indigo-200 hover:shadow-md"
                                  }`}
                              >
                                {/* Ảnh + icon */}
                                <div className="relative w-16 h-16 shrink-0">
                                  <div className="w-full h-full bg-white rounded-2xl overflow-hidden border border-gray-100 group-hover/item:scale-105 transition-transform">
                                    <img
                                      src={
                                        item.deviceId?.images?.[0] ||
                                        "https://via.placeholder.com/64?text=No+Image"
                                      }
                                      alt={item.deviceId?.name || "Thiết bị"}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>

                                  {hasReport && (
                                    <div className="absolute -top-2 -right-2 z-10">
                                      <div
                                        className={`p-1.5 rounded-full ${isActiveReport
                                          ? "bg-red-500"
                                          : "bg-green-500"
                                          } shadow-md`}
                                      >
                                        <AlertCircle
                                          size={16}
                                          className="text-white"
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Thông tin */}
                                <div className="flex-grow min-w-0">
                                  <h4 className="text-[13px] font-black text-gray-800 uppercase leading-none mb-1 group-hover/item:text-indigo-600 truncate">
                                    {item.deviceId?.name ||
                                      "Thiết bị không xác định"}
                                  </h4>

                                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-gray-500 text-[10px]">
                                    <div className="flex items-center gap-1">
                                      <Calendar size={12} />
                                      <span>
                                        {new Date(
                                          item.rentalStartDate
                                        ).toLocaleDateString("vi-VN")}{" "}
                                        -{" "}
                                        {new Date(
                                          item.rentalEndDate
                                        ).toLocaleDateString("vi-VN")}
                                      </span>
                                    </div>
                                    <span className="font-black text-indigo-600">
                                      x{item.quantity}
                                    </span>
                                  </div>

                                  {hasReport && reportStatusLabel && (
                                    <div className="mt-2">
                                      <span
                                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wide ${isActiveReport
                                          ? "bg-red-100 text-red-700 border border-red-200"
                                          : "bg-green-100 text-green-700 border border-green-200"
                                          }`}
                                      >
                                        {reportStatusLabel}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* Button hành động */}
                                {(order.status === "DELIVERING" ||
                                  order.status === "RENTING") &&
                                  reportType && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (hasReport) {
                                          if (reportType === "delivery") {
                                            setReportDetailModal({
                                              isOpen: true,
                                              report: latestReport,
                                              itemName:
                                                item.deviceId?.name ||
                                                "Thiết bị",
                                            });
                                          } else if (reportType === "damage") {
                                            setDamageDetailModal({
                                              isOpen: true,
                                              report: latestReport,
                                              itemName:
                                                item.deviceId?.name ||
                                                "Thiết bị",
                                            });
                                          }
                                        } else {
                                          if (order.status === "DELIVERING") {
                                            setDeliReportModal({
                                              isOpen: true,
                                              rentalId: order._id,
                                              selectedItems: [item._id],
                                              reasonType: "",
                                              description: "",
                                              files: [],
                                              order: order,
                                            });
                                          } else if (
                                            order.status === "RENTING"
                                          ) {
                                            setDamageReportModal({
                                              isOpen: true,
                                              rentalId: order._id,
                                              selectedItems: [item._id],
                                              severity: "MEDIUM",
                                              description: "",
                                              files: [],
                                              order: order,
                                            });
                                          }
                                        }
                                      }}
                                      className={`min-w-[140px] py-2.5 px-4 rounded-xl text-[11px] font-black uppercase transition-all flex items-center justify-center gap-1.5 shadow-sm ${hasReport
                                        ? reportType === "delivery"
                                          ? "bg-blue-600 text-white hover:bg-blue-700"
                                          : "bg-orange-600 text-white hover:bg-orange-700"
                                        : reportType === "delivery"
                                          ? "bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-200"
                                          : "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                                        }`}
                                    >
                                      {hasReport ? (
                                        <>
                                          <FileText size={14} /> Xem{" "}
                                          {reportType === "delivery"
                                            ? "khiếu nại"
                                            : "sự cố"}
                                        </>
                                      ) : (
                                        <>
                                          <AlertCircle size={14} /> Báo cáo{" "}
                                          {reportType === "delivery"
                                            ? "vấn đề"
                                            : "sự cố"}
                                        </>
                                      )}
                                    </button>
                                  )}
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex flex-wrap gap-6 pt-2">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                              <MapPin size={14} />
                            </div>
                            <span className="text-[11px] font-bold text-gray-500 truncate max-w-[200px]">
                              {order.deliveryAddress?.fullAddress}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                              <Receipt size={14} />
                            </div>
                            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-tighter">
                              Paid via {order.paymentMethod}
                            </span>
                          </div>
                        </div>
                      </div>
                      {/* Right Side */}
                      <div className="lg:col-span-5 flex flex-col justify-between">
                        {/* Tổng quan tài chính - giữ nguyên, đẹp rồi */}
                        <div className="bg-gray-900 rounded-[2.5rem] p-6 text-white mb-6 relative overflow-hidden shadow-xl shadow-gray-200">
                          <div className="relative z-10 space-y-3">
                            <div className="flex justify-between items-center opacity-60">
                              <span className="text-[10px] font-bold uppercase tracking-[0.2em]">
                                Net Rent
                              </span>
                              <span className="text-xs font-bold">
                                {order.rentPriceTotal?.toLocaleString()} ₫
                              </span>
                            </div>
                            <div className="flex justify-between items-center opacity-60">
                              <span className="text-[10px] font-bold uppercase tracking-[0.2em]">
                                Deposit (Cọc)
                              </span>
                              <span className="text-xs font-bold">
                                {order.depositAmount?.toLocaleString()} ₫
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-emerald-400">
                              <span className="text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-1">
                                <ShieldCheck size={12} /> Insurance
                              </span>
                              <span className="text-xs font-bold">
                                +{order.insuranceAmount?.toLocaleString()} ₫
                              </span>
                            </div>
                            <div className="pt-3 border-t border-white/10 flex justify-between items-end">
                              <span className="text-[11px] font-black uppercase italic">
                                Total Charged
                              </span>
                              <span className="text-xl font-black tracking-tighter">
                                {order.totalAmount?.toLocaleString()} ₫
                              </span>
                            </div>
                          </div>
                          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-indigo-500/20 rounded-full blur-2xl"></div>
                        </div>

                        {/* Các trạng thái & action – phần chính để lấp đầy */}
                        <div className="space-y-4">
                          {/* Badge trạng thái đặc biệt */}
                          <div className="flex flex-wrap gap-2">
                            {order.extensionStatus === "PENDING" && (
                              <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-300">
                                <Clock size={14} className="mr-1.5" /> Đang chờ
                                duyệt gia hạn
                              </span>
                            )}
                            {order.status === "PENDING" && (
                              <button
                                onClick={() =>
                                  handleOpenModal("CANCEL", order._id)
                                }
                                className="w-full py-4 rounded-2xl bg-red-600 text-white text-[11px] font-black uppercase italic shadow-lg shadow-red-200 hover:bg-red-700 transition-all flex items-center justify-center gap-2"
                              >
                                <XCircle size={16} /> Hủy đơn
                              </button>
                            )}
                            {order.status === "RENTING" &&
                              order.items?.some(
                                (item) =>
                                  item.damageReports?.length > 0 &&
                                  item.damageReports[0].status === "OPEN"
                              ) && (
                                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-300">
                                  <AlertCircle size={14} className="mr-1.5" />{" "}
                                  Có sự cố đang xử lý
                                </span>
                              )}
                            {order.status === "DELIVERING" &&
                              order.items?.some(
                                (item) =>
                                  item.deliveryIssues?.length > 0 &&
                                  item.deliveryIssues[0].status === "OPEN"
                              ) && (
                                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-300">
                                  <Truck size={14} className="mr-1.5" /> Khiếu
                                  nại giao hàng đang xử lý
                                </span>
                              )}
                          </div>

                          {/* Action buttons – nhóm theo status */}
                          <div className="grid grid-cols-1 gap-3">
                            {/* DELIVERING: Báo cáo giao hàng + Xác nhận nhận */}
                            {order.status === "DELIVERING" && (
                              <>
                                <button
                                  onClick={() =>
                                    handleOpenModal("CONFIRM", order._id)
                                  }
                                  className="w-full py-4 rounded-2xl bg-indigo-600 text-white text-[11px] font-black uppercase italic shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                                >
                                  <CheckCircle2 size={16} /> Xác nhận đã nhận
                                  hàng
                                </button>
                                <button
                                  onClick={() =>
                                    setTrackingModal({ isOpen: true, order })
                                  }
                                  className="w-full py-4 rounded-2xl bg-blue-50 text-blue-600 text-[11px] font-black uppercase italic border border-blue-100 hover:bg-blue-100 transition-all flex items-center justify-center gap-2"
                                >
                                  <Truck size={14} /> Theo dõi vận chuyển
                                </button>
                              </>
                            )}

                            {/* RENTING: Gia hạn + Báo cáo sự cố */}
                            {order.status === "RENTING" && (
                              <>
                                <button
                                  onClick={() =>
                                    setExtendModal({
                                      isOpen: true,
                                      orderId: order._id,
                                      currentEndDate:
                                        order.items?.[0]?.rentalEndDate,
                                      dailyPrice:
                                        order.items?.[0]?.rentPrice /
                                        (order.items?.[0]?.totalDays *
                                          order.items?.[0]?.quantity),
                                      newEndDate: "",
                                      extraAmount: 0,
                                      note: "",
                                      order: order,
                                    })
                                  }
                                  className="w-full py-4 rounded-2xl bg-indigo-50 text-indigo-600 text-[11px] font-black uppercase italic border border-indigo-100 hover:bg-indigo-100 transition-all flex items-center justify-center gap-2"
                                >
                                  <Clock size={14} /> Yêu cầu gia hạn thuê
                                </button>

                                {/* Báo cáo sự cố – nếu có nhiều item thì hiển thị nút chung, hoặc per item */}
                                <button
                                  onClick={() => {
                                    // Nếu có item chưa báo cáo sự cố → mở modal báo cáo
                                    const hasUnreported = order.items?.some(
                                      (item) => !item.damageReports?.length
                                    );
                                    if (hasUnreported) {
                                      setDamageReportModal({
                                        isOpen: true,
                                        rentalId: order._id,
                                        selectedItems: [], // Cho phép chọn nhiều item
                                        severity: "MEDIUM",
                                        description: "",
                                        files: [],
                                        order: order,
                                      });
                                    } else {
                                      toast.info(
                                        "Tất cả thiết bị đã có báo cáo sự cố!"
                                      );
                                    }
                                  }}
                                  className="w-full py-4 rounded-2xl bg-red-50 text-red-600 text-[11px] font-black uppercase italic border border-red-100 hover:bg-red-100 transition-all flex items-center justify-center gap-2"
                                >
                                  <Wrench size={14} /> Báo cáo sự cố / hư hỏng
                                </button>
                              </>
                            )}

                            {/* COMPLETED / CANCELLED */}
                            {(order.status === "COMPLETED" ||
                              order.status === "CANCELLED") && (
                                <>
                                  <button
                                    onClick={() => handleReRent(order)}
                                    className="w-full py-4 rounded-2xl bg-gray-900 text-white text-[11px] font-black uppercase italic hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                                  >
                                    <RefreshCcw size={14} /> Thuê lại thiết bị
                                  </button>
                                  {order.status === "COMPLETED" && (
                                    <button
                                      onClick={() => openReviewModal(order)}
                                      disabled={hasReviewed || reviewLoading}
                                      className={`w-full py-4 rounded-2xl text-[11px] font-black uppercase italic flex items-center justify-center gap-2 transition-all border ${hasReviewed
                                        ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                                        : "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100"
                                        }`}
                                    >
                                      <Star size={14} />
                                      {hasReviewed
                                        ? "Đã đánh giá"
                                        : reviewLoading
                                          ? "Đang gửi..."
                                          : "Đánh giá dịch vụ"}
                                    </button>
                                  )}
                                </>
                              )}

                            {/* Luôn có nút chi tiết */}
                            <button
                              onClick={() =>
                                setDetailModal({ isOpen: true, order })
                              }
                              className="w-full py-4 rounded-2xl bg-gray-100 text-gray-900 text-[11px] font-black uppercase italic hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                            >
                              <FileText size={14} /> Chi tiết hóa đơn
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white rounded-[3rem] p-20 text-center border-2 border-dashed border-gray-100">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-200">
                  <Package size={40} />
                </div>
                <h3 className="text-xl font-black text-gray-900 uppercase italic">
                  Giỏ đơn trống
                </h3>
                <p className="text-gray-400 text-[10px] font-bold uppercase mt-2">
                  Bạn chưa có giao dịch nào trong mục này
                </p>
                <button
                  onClick={() => navigate("/devices")}
                  className="mt-8 px-8 py-3 bg-gray-900 text-white text-[11px] font-black uppercase italic rounded-xl hover:scale-105 transition-all"
                >
                  Khám phá thiết bị ngay
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {/* --- MODAL CHI TIẾT ĐƠN HÀNG --- */}
      {detailModal.isOpen && detailModal.order && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/80 backdrop-blur-md"
            onClick={() => setDetailModal({ isOpen: false, order: null })}
          />
          <div className="relative bg-white w-full max-w-2xl rounded-[3rem] overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            <div className="bg-gray-900 p-8 text-white flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black italic uppercase tracking-tighter">
                  Order Details
                </h2>
                <p className="text-indigo-400 text-[10px] font-bold uppercase tracking-[0.3em]">
                  ID: {detailModal.order._id}
                </p>
              </div>
              <button
                onClick={() => setDetailModal({ isOpen: false, order: null })}
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all"
              >
                <XCircle size={20} />
              </button>
            </div>
            <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-8">
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Danh sách thiết bị
                  </p>
                  {detailModal.order.items?.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100"
                    >
                      <div className="flex items-center gap-4">
                        <img
                          src={item.deviceId?.images?.[0]}
                          className="w-12 h-12 rounded-lg object-cover bg-white border"
                          alt=""
                        />
                        <div>
                          <p className="text-sm font-bold text-gray-900">
                            {item.deviceId?.name}
                          </p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase">
                            x{item.quantity} thiết bị
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-gray-900">
                          {(
                            item.rentPrice /
                            (item.totalDays * item.quantity)
                          ).toLocaleString()}{" "}
                          ₫{" "}
                          <span className="text-[9px] text-gray-400">
                            /ngày
                          </span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Thời gian thuê
                    </p>
                    <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-700 text-xs font-bold">
                      {new Date(
                        detailModal.order.items?.[0]?.rentalStartDate
                      ).toLocaleDateString("vi-VN")}{" "}
                      -{" "}
                      {new Date(
                        detailModal.order.items?.[0]?.rentalEndDate
                      ).toLocaleDateString("vi-VN")}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Thanh toán
                    </p>
                    <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-700 text-xs font-bold uppercase">
                      {detailModal.order.paymentMethod} -{" "}
                      {detailModal.order.paymentStatus}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Địa chỉ nhận hàng
                  </p>
                  <div className="p-5 border border-gray-100 rounded-[2rem] flex items-start gap-3">
                    <MapPin size={16} className="text-indigo-600 mt-1" />
                    <div>
                      <p className="text-xs font-bold text-gray-800">
                        {detailModal.order.deliveryAddress?.fullAddress}
                      </p>
                      <p className="text-[10px] text-gray-400 font-medium mt-1">
                        Người nhận:{" "}
                        {detailModal.order.deliveryAddress?.receiverName} |{" "}
                        {detailModal.order?.phoneNumber}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-[2rem] p-6 space-y-3">
                  <div className="flex justify-between text-xs font-bold text-gray-500">
                    <span>Tổng tiền thuê</span>
                    <span>
                      {detailModal.order.rentPriceTotal?.toLocaleString()} ₫
                    </span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-gray-500">
                    <span>Tiền đặt cọc</span>
                    <span>
                      {detailModal.order.depositAmount?.toLocaleString()} ₫
                    </span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-emerald-600">
                    <span>Bảo hiểm thiết bị</span>
                    <span>
                      +{detailModal.order.insuranceAmount?.toLocaleString()} ₫
                    </span>
                  </div>
                  <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
                    <span className="text-sm font-black uppercase italic">
                      Tổng thanh toán
                    </span>
                    <span className="text-xl font-black text-indigo-600">
                      {detailModal.order.totalAmount?.toLocaleString()} ₫
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* --- MODAL THEO DÕI VẬN CHUYỂN (MỚI) --- */}
      {trackingModal.isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/80 backdrop-blur-md"
            onClick={() => setTrackingModal({ isOpen: false, order: null })}
          />
          <div className="relative bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl animate-in slide-in-from-bottom-10 duration-500">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-2xl font-black italic uppercase italic">
                Tracking
              </h2>
              <button
                onClick={() => setTrackingModal({ isOpen: false, order: null })}
                className="text-gray-400 hover:text-gray-900"
              >
                <XCircle />
              </button>
            </div>
            <div className="space-y-8">
              {[
                {
                  label: "Đơn hàng đã đặt",
                  time: "10:30, 20/01/2026",
                  done: true,
                },
                {
                  label: "Đã xác nhận & Đóng gói",
                  time: "14:20, 20/01/2026",
                  done: true,
                },
                {
                  label: "Đang trên đường giao đến bạn",
                  time: "08:15, 21/01/2026",
                  done: true,
                  active: true,
                },
                {
                  label: "Giao hàng thành công",
                  time: "Dự kiến chiều nay",
                  done: false,
                },
              ].map((step, idx, arr) => (
                <div key={idx} className="flex gap-4 relative">
                  {idx !== arr.length - 1 && (
                    <div
                      className={`absolute left-[11px] top-6 w-[2px] h-12 ${step.done ? "bg-indigo-600" : "bg-gray-100"
                        }`}
                    />
                  )}
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center z-10 ${step.active
                      ? "bg-indigo-600 ring-4 ring-indigo-100"
                      : step.done
                        ? "bg-indigo-600"
                        : "bg-gray-100"
                      }`}
                  >
                    <CheckCircle2 size={14} className="text-white" />
                  </div>
                  <div>
                    <p
                      className={`text-[12px] font-black uppercase italic ${step.active ? "text-indigo-600" : "text-gray-900"
                        }`}
                    >
                      {step.label}
                    </p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      {step.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <button
              className="w-full mt-10 py-4 bg-gray-900 text-white rounded-2xl text-[11px] font-black uppercase italic"
              onClick={() => setTrackingModal({ isOpen: false, order: null })}
            >
              Đóng
            </button>
          </div>
        </div>
      )}
      {/* --- MODAL BÁO CÁO VẤN ĐỀ (MỚI) --- */}
      {/* --- MODAL BÁO CÁO / ĐỔI TRẢ (REPORT) --- */}
      {DeliReportModal.isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/80 backdrop-blur-md"
            onClick={() =>
              setDeliReportModal({ ...DeliReportModal, isOpen: false })
            }
          />
          <div className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                  <AlertCircle size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 uppercase italic">
                    Báo cáo vấn đề
                  </h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                    Chúng tôi sẽ hỗ trợ bạn trong 24h
                  </p>
                </div>
              </div>
              <div className="space-y-2 mb-6">
                <label className="text-xs font-bold text-gray-700 ml-3 uppercase tracking-wider">
                  Chọn sản phẩm cần báo cáo (
                  {DeliReportModal.selectedItems?.length || 0})
                </label>
                <div className="grid gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                  {DeliReportModal.order?.items?.map((item, idx) => {
                    // FIX: Sử dụng DeliReportModal.order (đã set)
                    const isSelected = DeliReportModal.selectedItems?.includes(
                      item._id // FIX: Sử dụng item._id (rentalItemId)
                    );
                    return (
                      <div
                        key={idx}
                        onClick={() => toggleItemSelection(item._id)} // FIX: Toggle rentalItemId
                        className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all cursor-pointer ${isSelected
                          ? "border-amber-500 bg-amber-50"
                          : "border-gray-100 bg-white hover:border-gray-200"
                          }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected
                            ? "bg-amber-500 border-amber-500"
                            : "border-gray-300"
                            }`}
                        >
                          {isSelected && (
                            <Check
                              size={12}
                              className="text-white"
                              strokeWidth={4}
                            />
                          )}
                        </div>
                        <img
                          src={item.deviceId?.images?.[0]}
                          className="w-10 h-10 rounded-lg object-cover bg-gray-100"
                          alt=""
                        />
                        <div className="flex-1">
                          <p className="text-[11px] font-black text-gray-800 line-clamp-1">
                            {item.deviceId?.name}
                          </p>
                          <p className="text-[9px] text-gray-400 font-bold uppercase">
                            Số lượng: {item.quantity}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-4">
                {/* Select Reason */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-700 ml-3">
                    Vấn đề gặp phải
                  </label>
                  <div className="relative">
                    <select
                      className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none outline-none appearance-none font-bold text-sm text-gray-700"
                      value={DeliReportModal.reasonType}
                      onChange={(e) =>
                        setDeliReportModal({
                          ...DeliReportModal,
                          reasonType: e.target.value,
                        })
                      }
                    >
                      <option value="">Chọn lý do...</option>
                      {REPORT_REASONS.map((reason, idx) => (
                        <option key={idx} value={reason}>
                          {reason}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                      size={16}
                    />
                  </div>
                </div>
                {/* Description */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-700 ml-3">
                    Mô tả chi tiết
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Vui lòng mô tả chi tiết tình trạng..."
                    className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none outline-none resize-none text-sm"
                    value={DeliReportModal.description}
                    onChange={(e) =>
                      setDeliReportModal({
                        ...DeliReportModal,
                        description: e.target.value,
                      })
                    }
                  />
                </div>
                {/* File Upload */}
                <div>
                  <label className="text-xs font-bold text-gray-700 ml-3 mb-2 block">
                    Hình ảnh/Video minh chứng
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {DeliReportModal.files.map((file, idx) => (
                      <div key={idx} className="relative group">
                        {renderFilePreview(file)}
                        <button
                          onClick={() => {
                            const newFiles = DeliReportModal.files.filter(
                              (_, i) => i !== idx
                            );
                            setDeliReportModal({
                              ...DeliReportModal,
                              files: newFiles,
                            });
                          }}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <XCircle size={12} />
                        </button>
                      </div>
                    ))}
                    <label className="w-20 h-20 rounded-xl bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors text-gray-400">
                      <Camera size={20} />
                      <span className="text-[8px] font-bold uppercase mt-1">
                        Thêm ảnh
                      </span>
                      <input
                        type="file"
                        multiple
                        accept="image/*,video/*"
                        className="hidden"
                        onChange={(e) =>
                          handleFileUpload(e.target.files, setDeliReportModal)
                        }
                      />
                    </label>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-8">
                <button
                  onClick={() =>
                    setDeliReportModal({ ...DeliReportModal, isOpen: false })
                  }
                  className="py-4 rounded-xl bg-gray-100 text-gray-500 font-bold uppercase text-[11px] hover:bg-gray-200 transition-colors"
                >
                  Đóng
                </button>
                <button
                  disabled={
                    !DeliReportModal.selectedItems?.length ||
                    !DeliReportModal.reasonType
                  }
                  onClick={handleSubmitDeliReport}
                  className={`py-4 rounded-xl font-black uppercase italic text-[11px] flex items-center justify-center gap-2 transition-all ${DeliReportModal.selectedItems?.length > 0 &&
                    DeliReportModal.reasonType
                    ? "bg-amber-500 text-white shadow-lg shadow-amber-200 hover:bg-amber-600"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    }`}
                >
                  Gửi báo cáo <Send size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* --- MODAL ĐÁNH GIÁ (REVIEW) --- */}
      {reviewModal.isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/80 backdrop-blur-md"
            onClick={() => setReviewModal({ ...reviewModal, isOpen: false })}
          />
          <div className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-8 text-center">
              <h3 className="text-2xl font-black text-gray-900 uppercase italic mb-2">
                Đánh giá dịch vụ
              </h3>
              <p className="text-gray-400 text-xs font-medium mb-8">
                Chia sẻ trải nghiệm thuê thiết bị của bạn
              </p>

              {/* Star Rating */}
              <div className="flex justify-center gap-3 mb-8">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() =>
                      setReviewModal({ ...reviewModal, rating: star })
                    }
                    disabled={hasReviewed || reviewLoading}
                    className="transition-transform hover:scale-110 active:scale-95 disabled:opacity-50"
                  >
                    <Star
                      size={32}
                      className={
                        star <= reviewModal.rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-200"
                      }
                    />
                  </button>
                ))}
              </div>
              {reviewModal.order?.items?.length > 0 && ( // Chỉ hiện nếu có nhiều items
                <div className="space-y-2 mb-6">
                  <label className="text-xs font-bold text-gray-700 ml-3 uppercase tracking-wider">
                    Chọn thiết bị để đánh giá ({reviewSelectedItems.length})
                  </label>
                  <div className="grid gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                    {reviewModal.order.items.map((item) => {
                      const isSelected = reviewSelectedItems.includes(item._id);
                      return (
                        <div
                          key={item._id}
                          onClick={() => {
                            const current = reviewSelectedItems || [];
                            const next = current.includes(item._id)
                              ? current.filter((id) => id !== item._id)
                              : [...current, item._id];
                            setReviewSelectedItems(next);
                          }}
                          className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all cursor-pointer ${isSelected
                            ? "border-emerald-500 bg-emerald-50"
                            : "border-gray-100 bg-white hover:border-gray-200"
                            }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected
                              ? "bg-emerald-500 border-emerald-500"
                              : "border-gray-300"
                              }`}
                          >
                            {isSelected && (
                              <Check
                                size={12}
                                className="text-white"
                                strokeWidth={4}
                              />
                            )}
                          </div>
                          <img
                            src={item.deviceId?.images?.[0]}
                            className="w-10 h-10 rounded-lg object-cover bg-gray-100"
                            alt=""
                          />
                          <div className="flex-1">
                            <p className="text-[11px] font-black text-gray-800 line-clamp-1">
                              {item.deviceId?.name}
                            </p>
                            <p className="text-[9px] text-gray-400 font-bold uppercase">
                              Số lượng: {item.quantity}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* Comment */}
              <textarea
                rows={3}
                placeholder="Bạn cảm thấy thiết bị thế nào? Hãy chia sẻ nhé..."
                className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none outline-none resize-none text-sm mb-4 disabled:opacity-50"
                value={reviewModal.comment}
                onChange={(e) =>
                  setReviewModal({ ...reviewModal, comment: e.target.value })
                }
                disabled={hasReviewed || reviewLoading}
              />
              <div className="flex flex-wrap gap-3 mb-8 justify-center">
                {reviewModal.files.map((file, idx) => (
                  <div key={idx} className="relative group">
                    {renderFilePreview(file)}
                    <button
                      onClick={() => {
                        const newFiles = reviewModal.files.filter(
                          (_, i) => i !== idx
                        );
                        setReviewModal({ ...reviewModal, files: newFiles });
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <XCircle size={12} />
                    </button>
                  </div>
                ))}
                <label className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 text-[10px] font-bold uppercase cursor-pointer flex items-center gap-2 hover:bg-gray-200 transition-colors">
                  <Camera size={14} /> Thêm ảnh thực tế
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      handleFileUpload(e.target.files, setReviewModal)
                    }
                    disabled={hasReviewed || reviewLoading}
                  />
                </label>
              </div>
              {/* Thông báo đã review */}
              {hasReviewed && (
                <p className="text-sm text-emerald-600 font-medium mb-4">
                  Bạn đã đánh giá đơn hàng này. Cảm ơn bạn!
                </p>
              )}

              {/* Button submit */}
              <button
                onClick={handleSubmitReview}
                disabled={reviewLoading || hasReviewed}
                className={`w-full py-4 rounded-2xl text-white font-black uppercase italic shadow-xl transition-transform ${reviewLoading || hasReviewed
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-gray-900 hover:scale-[1.02]"
                  }`}
              >
                {reviewLoading
                  ? "Đang gửi..."
                  : hasReviewed
                    ? "Đã đánh giá"
                    : "Gửi đánh giá"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* --- CONFIRMATION MODAL (Generic) --- */}
      {modalConfig.isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
            onClick={() => setModalConfig({ ...modalConfig, isOpen: false })}
          />
          <div className="relative bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl animate-in fade-in zoom-in-95 text-center">
            <h3 className="text-lg font-black text-gray-900 uppercase italic mb-2">
              {modalConfig.title}
            </h3>
            <p className="text-gray-500 text-sm mb-6">
              {modalConfig.description}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() =>
                  setModalConfig({ ...modalConfig, isOpen: false })
                }
                className="py-3 rounded-xl bg-gray-100 text-gray-700 font-bold text-xs uppercase"
              >
                Quay lại
              </button>
              <button
                onClick={handleModalConfirm}
                className={`py-3 rounded-xl text-white font-bold text-xs uppercase shadow-lg ${modalConfig.type === "CANCEL"
                  ? "bg-red-500 shadow-red-200"
                  : "bg-indigo-600 shadow-indigo-200"
                  }`}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
      {reportDetailModal.isOpen && reportDetailModal.report && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() =>
              setReportDetailModal({
                isOpen: false,
                report: null,
                itemName: "",
              })
            }
          />
          <div className="relative bg-white w-full max-w-md sm:max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-amber-50 to-red-50 p-6 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertCircle className="text-amber-600" size={28} />
                  <h3 className="text-xl font-black text-gray-900">
                    Chi tiết khiếu nại
                  </h3>
                </div>
                <button
                  onClick={() =>
                    setReportDetailModal({
                      isOpen: false,
                      report: null,
                      itemName: "",
                    })
                  }
                  className="p-2 hover:bg-white/50 rounded-full transition-colors"
                >
                  <X size={24} className="text-gray-700" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">
                  Trạng thái:
                </span>
                <span
                  className={`px-4 py-1.5 rounded-full text-sm font-bold ${reportDetailModal.report.status === "OPEN"
                    ? "bg-red-100 text-red-700"
                    : reportDetailModal.report.status === "PROCESSING"
                      ? "bg-amber-100 text-amber-700"
                      : reportDetailModal.report.status === "RESOLVED"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                >
                  {reportDetailModal.report.status === "OPEN"
                    ? "Chờ xử lý"
                    : reportDetailModal.report.status === "PROCESSING"
                      ? "Đang xử lý"
                      : reportDetailModal.report.status === "RESOLVED"
                        ? "Đã giải quyết"
                        : "Từ chối"}
                </span>
              </div>

              <div>
                <span className="text-sm font-medium text-gray-600 block mb-1">
                  Sản phẩm:
                </span>
                <p className="text-base font-semibold">
                  {reportDetailModal.itemName || "Nhiều sản phẩm"}
                </p>
              </div>

              <div>
                <span className="text-sm font-medium text-gray-600 block mb-1">
                  Lý do:
                </span>
                <p className="text-base">
                  {reportDetailModal.report.issueType}
                </p>
              </div>

              <div>
                <span className="text-sm font-medium text-gray-600 block mb-1">
                  Mô tả chi tiết:
                </span>
                <p className="text-gray-800 whitespace-pre-line">
                  {reportDetailModal.report.description ||
                    "Không có mô tả thêm"}
                </p>
              </div>

              {reportDetailModal.report.images?.length > 0 && (
                <div>
                  <span className="text-sm font-medium text-gray-600 block mb-2">
                    Hình ảnh minh chứng:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {reportDetailModal.report.images.map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt={`Evidence ${idx + 1}`}
                        className="w-full h-32 object-cover rounded-xl border shadow-sm hover:scale-105 transition-transform cursor-pointer"
                        onClick={() => window.open(img, "_blank")}
                      />
                    ))}
                  </div>
                </div>
              )}

              {reportDetailModal.report.resolvedNote && (
                <div className="pt-4 border-t">
                  <span className="text-sm font-medium text-gray-600 block mb-1">
                    Ghi chú xử lý từ bên cho thuê:
                  </span>
                  <p className="text-gray-800 italic bg-gray-50 p-4 rounded-2xl border">
                    {reportDetailModal.report.resolvedNote}
                  </p>
                </div>
              )}

              <div className="text-xs text-gray-500 italic pt-2">
                Báo cáo gửi lúc:{" "}
                {new Date(reportDetailModal.report.createdAt).toLocaleString(
                  "vi-VN"
                )}
                {reportDetailModal.report.updatedAt !==
                  reportDetailModal.report.createdAt && (
                    <>
                      {" "}
                      • Cập nhật lần cuối:{" "}
                      {new Date(
                        reportDetailModal.report.updatedAt
                      ).toLocaleString("vi-VN")}
                    </>
                  )}
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t flex justify-end">
              <button
                onClick={() =>
                  setReportDetailModal({
                    isOpen: false,
                    report: null,
                    itemName: "",
                  })
                }
                className="px-8 py-3 bg-gray-800 text-white rounded-2xl font-bold uppercase text-sm hover:bg-gray-900 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
      {/* --- MODAL GIA HẠN THUÊ (EXTEND) --- */}
      {extendModal.isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/80 backdrop-blur-md"
            onClick={() => setExtendModal({ ...extendModal, isOpen: false })}
          />
          <div className="relative bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="text-center mb-6">
              <div className="w-14 h-14 mx-auto bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4">
                <Clock size={28} />
              </div>
              <h3 className="text-xl font-black text-gray-900 uppercase italic">
                Gia hạn thời gian thuê
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Ngày trả hiện tại:{" "}
                {new Date(extendModal.currentEndDate).toLocaleDateString(
                  "vi-VN"
                )}
              </p>
            </div>
            <div className="space-y-4">
              {/* Chọn ngày mới */}
              <div>
                <label className="text-xs font-bold text-gray-500 ml-3 mb-1 block uppercase">
                  Ngày trả dự kiến mới
                </label>
                <input
                  type="date"
                  min={minExtendDate}
                  value={extendModal.newEndDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="w-full px-6 py-4 rounded-2xl bg-gray-50 border border-gray-200 outline-none text-sm font-bold"
                />
              </div>
              {/* --- PHẦN TÍNH TIỀN (MỚI THÊM) --- */}
              {extendModal.extraAmount > 0 && (
                <div className="p-5 rounded-[2rem] bg-indigo-600 text-white space-y-2 shadow-inner">
                  <div className="flex justify-between items-center text-xs opacity-80 uppercase font-bold">
                    <span>Số ngày gia hạn:</span>
                    <span>
                      {Math.round(
                        extendModal.extraAmount / extendModal.dailyPrice
                      )}{" "}
                      ngày
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs opacity-80 uppercase font-bold">
                      Phí phát sinh:
                    </span>
                    <span className="text-lg font-black italic">
                      {extendModal.extraAmount.toLocaleString()} VND
                    </span>
                  </div>
                </div>
              )}
              <div>
                <label className="text-xs font-bold text-gray-500 ml-3 mb-1 block uppercase">
                  Ghi chú (Tùy chọn)
                </label>
                <textarea
                  className="w-full px-6 py-4 rounded-2xl bg-gray-50 border border-gray-100 outline-none text-sm focus:ring-2 focus:ring-indigo-500"
                  placeholder="Lý do gia hạn..."
                  rows={2}
                  value={extendModal.note}
                  onChange={(e) =>
                    setExtendModal({ ...extendModal, note: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-8">
              <button
                onClick={() =>
                  setExtendModal({ ...extendModal, isOpen: false })
                }
                className="py-4 rounded-2xl bg-gray-100 text-gray-600 font-bold uppercase text-[11px] hover:bg-gray-200 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                disabled={extendModal.extraAmount <= 0}
                onClick={handleSubmitExtend}
                className={`py-4 rounded-2xl font-black uppercase italic text-[11px] shadow-lg transition-all ${extendModal.extraAmount > 0
                  ? "bg-indigo-600 text-white shadow-indigo-200 hover:scale-105 active:scale-95"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
              >
                Gửi yêu cầu gia hạn
              </button>
            </div>
          </div>
        </div>
      )}
      {damageReportModal.isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/80 backdrop-blur-md"
            onClick={() =>
              setDamageReportModal({ ...damageReportModal, isOpen: false })
            }
          />
          <div className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden">
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                  <Wrench size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 uppercase italic">
                    Báo sự cố / Hư hỏng
                  </h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                    Chúng tôi sẽ xử lý nhanh chóng
                  </p>
                </div>
              </div>

              <div className="space-y-2 mb-6">
                <label className="text-xs font-bold text-gray-700 ml-3 uppercase tracking-wider">
                  Chọn thiết bị bị hỏng (
                  {damageReportModal.selectedItems?.length || 0})
                </label>
                <div className="grid gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                  {damageReportModal.order?.items?.map((item, idx) => {
                    const isSelected =
                      damageReportModal.selectedItems?.includes(item._id);
                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          const current = damageReportModal.selectedItems || [];
                          const next = current.includes(item._id)
                            ? current.filter((id) => id !== item._id)
                            : [...current, item._id];
                          setDamageReportModal({
                            ...damageReportModal,
                            selectedItems: next,
                          });
                        }}
                        className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all cursor-pointer ${isSelected
                          ? "border-red-500 bg-red-50"
                          : "border-gray-100 bg-white hover:border-gray-200"
                          }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected
                            ? "bg-red-500 border-red-500"
                            : "border-gray-300"
                            }`}
                        >
                          {isSelected && (
                            <Check
                              size={12}
                              className="text-white"
                              strokeWidth={4}
                            />
                          )}
                        </div>
                        <img
                          src={item.deviceId?.images?.[0]}
                          className="w-10 h-10 rounded-lg object-cover bg-gray-100"
                          alt=""
                        />
                        <div className="flex-1">
                          <p className="text-[11px] font-black text-gray-800 line-clamp-1">
                            {item.deviceId?.name}
                          </p>
                          <p className="text-[9px] text-gray-400 font-bold uppercase">
                            Số lượng: {item.quantity}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4">
                {/* Severity */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-700 ml-3">
                    Mức độ nghiêm trọng
                  </label>
                  <select
                    className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none outline-none font-bold text-sm"
                    value={damageReportModal.severity}
                    onChange={(e) =>
                      setDamageReportModal({
                        ...damageReportModal,
                        severity: e.target.value,
                      })
                    }
                  >
                    <option value="LOW">Nhẹ (vẫn dùng được)</option>
                    <option value="MEDIUM">Trung bình</option>
                    <option value="HIGH">Nghiêm trọng (hỏng hẳn)</option>
                  </select>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-700 ml-3">
                    Mô tả chi tiết
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Mô tả tình trạng hư hỏng, thời điểm xảy ra..."
                    className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none outline-none resize-none text-sm"
                    value={damageReportModal.description}
                    onChange={(e) =>
                      setDamageReportModal({
                        ...damageReportModal,
                        description: e.target.value,
                      })
                    }
                  />
                </div>

                {/* File Upload */}
                <div>
                  <label className="text-xs font-bold text-gray-700 ml-3 mb-2 block">
                    Hình ảnh/Video minh chứng
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {damageReportModal.files.map((file, idx) => (
                      <div key={idx} className="relative group">
                        {renderFilePreview(file)}
                        <button
                          onClick={() => {
                            const newFiles = damageReportModal.files.filter(
                              (_, i) => i !== idx
                            );
                            setDamageReportModal({
                              ...damageReportModal,
                              files: newFiles,
                            });
                          }}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <XCircle size={12} />
                        </button>
                      </div>
                    ))}
                    <label className="w-20 h-20 rounded-xl bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors text-gray-400">
                      <Camera size={20} />
                      <span className="text-[8px] font-bold uppercase mt-1">
                        Thêm ảnh
                      </span>
                      <input
                        type="file"
                        multiple
                        accept="image/*,video/*"
                        className="hidden"
                        onChange={(e) =>
                          handleFileUpload(e.target.files, setDamageReportModal)
                        }
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-8">
                <button
                  onClick={() =>
                    setDamageReportModal({
                      ...damageReportModal,
                      isOpen: false,
                    })
                  }
                  className="py-4 rounded-xl bg-gray-100 text-gray-500 font-bold uppercase text-[11px] hover:bg-gray-200 transition-colors"
                >
                  Đóng
                </button>
                <button
                  disabled={
                    !damageReportModal.selectedItems?.length ||
                    !damageReportModal.description.trim()
                  }
                  onClick={async () => {
                    if (!damageReportModal.description.trim()) {
                      return toast.warning("Vui lòng mô tả chi tiết");
                    }

                    try {
                      const formData = new FormData();

                      formData.append("rentalId", damageReportModal.rentalId);

                      // Vì backend yêu cầu SINGLE rentalItemId → chỉ lấy item đầu tiên (hoặc sửa backend nếu muốn multiple)
                      if (damageReportModal.selectedItems.length === 0) {
                        return toast.warning(
                          "Vui lòng chọn ít nhất một thiết bị"
                        );
                      }
                      formData.append(
                        "rentalItemId",
                        damageReportModal.selectedItems[0]
                      ); // SINGLE

                      // Lấy deviceId từ order.items (phải có order trong state)
                      const selectedItem = damageReportModal.order?.items?.find(
                        (it) => it._id === damageReportModal.selectedItems[0]
                      );

                      if (!selectedItem?.deviceId?._id) {
                        return toast.error("Không tìm thấy thông tin thiết bị");
                      }
                      formData.append("deviceId", selectedItem.deviceId._id);

                      formData.append(
                        "description",
                        damageReportModal.description
                      );
                      formData.append("severity", damageReportModal.severity);

                      damageReportModal.files.forEach((file) => {
                        formData.append("images", file);
                      });

                      await rentalService.reportDamage(formData);
                      toast.success("Báo cáo sự cố thành công!");
                      fetchRentals(); // refresh danh sách
                      setDamageReportModal({
                        isOpen: false,
                        rentalId: null,
                        selectedItems: [],
                        severity: "MEDIUM",
                        description: "",
                        files: [],
                        order: null,
                      });
                    } catch (err) {
                      toast.error(
                        err.response?.data?.message || "Gửi báo cáo thất bại"
                      );
                    }
                  }}
                  className={`py-4 rounded-xl font-black uppercase italic text-[11px] flex items-center justify-center gap-2 transition-all ${damageReportModal.selectedItems?.length > 0 &&
                    damageReportModal.description.trim()
                    ? "bg-red-600 text-white shadow-lg shadow-red-200 hover:bg-red-700"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    }`}
                >
                  Gửi báo cáo <Send size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {damageDetailModal.isOpen && damageDetailModal.report && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() =>
              setDamageDetailModal({
                isOpen: false,
                report: null,
                itemName: "",
              })
            }
          />
          <div className="relative bg-white w-full max-w-md sm:max-w-lg rounded-3xl overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-red-50 to-orange-50 p-6 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Wrench className="text-red-600" size={28} />
                  <h3 className="text-xl font-black text-gray-900">
                    Chi tiết sự cố
                  </h3>
                </div>
                <button
                  onClick={() =>
                    setDamageDetailModal({
                      isOpen: false,
                      report: null,
                      itemName: "",
                    })
                  }
                  className="p-2 hover:bg-white/50 rounded-full transition-colors"
                >
                  <X size={24} className="text-gray-700" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">
                  Trạng thái:
                </span>
                <span
                  className={`px-4 py-1.5 rounded-full text-sm font-bold ${damageDetailModal.report.status === "OPEN"
                    ? "bg-red-100 text-red-700"
                    : damageDetailModal.report.status === "VERIFIED"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-green-100 text-green-700"
                    }`}
                >
                  {damageDetailModal.report.status === "OPEN"
                    ? "Chờ xác nhận"
                    : damageDetailModal.report.status === "VERIFIED"
                      ? "Đã xác nhận"
                      : "Đã xử lý"}
                </span>
              </div>

              <div>
                <span className="text-sm font-medium text-gray-600 block mb-1">
                  Sản phẩm:
                </span>
                <p className="text-base font-semibold">
                  {damageDetailModal.itemName || "Nhiều sản phẩm"}
                </p>
              </div>

              <div>
                <span className="text-sm font-medium text-gray-600 block mb-1">
                  Mức độ:
                </span>
                <p className="text-base font-bold">
                  {damageDetailModal.report.severity}
                </p>
              </div>

              <div>
                <span className="text-sm font-medium text-gray-600 block mb-1">
                  Mô tả:
                </span>
                <p className="text-gray-800 whitespace-pre-line">
                  {damageDetailModal.report.description}
                </p>
              </div>

              {damageDetailModal.report.images?.length > 0 && (
                <div>
                  <span className="text-sm font-medium text-gray-600 block mb-2">
                    Hình ảnh:
                  </span>
                  <div className="grid grid-cols-3 gap-3">
                    {damageDetailModal.report.images.map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt=""
                        className="w-full h-24 object-cover rounded-xl border cursor-pointer"
                        onClick={() => window.open(img, "_blank")}
                      />
                    ))}
                  </div>
                </div>
              )}

              {damageDetailModal.report.compensationAmount > 0 && (
                <div className="pt-4 border-t">
                  <span className="text-sm font-medium text-gray-600 block mb-1">
                    Bồi thường:
                  </span>
                  <p className="text-lg font-black text-red-600">
                    {damageDetailModal.report.compensationAmount.toLocaleString()}{" "}
                    ₫
                  </p>
                </div>
              )}

              <div className="text-xs text-gray-500 italic">
                Gửi lúc:{" "}
                {new Date(damageDetailModal.report.createdAt).toLocaleString(
                  "vi-VN"
                )}
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t flex justify-end">
              <button
                onClick={() =>
                  setDamageDetailModal({
                    isOpen: false,
                    report: null,
                    itemName: "",
                  })
                }
                className="px-8 py-3 bg-gray-800 text-white rounded-2xl font-bold uppercase text-sm hover:bg-gray-900"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
