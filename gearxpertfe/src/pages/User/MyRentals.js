import React, { useEffect, useMemo, useState } from "react";

import { useNavigate } from "react-router-dom";

import { toast } from "react-toastify";

import * as rentalService from "../../service/ApiService/RentalApi";

import { hasReviewedRental } from "../../service/ApiService/RentalApi";

import { getMyWallet } from "../../service/ApiService/WalletApi";



import Header from "../../components/navigation/Header";



import StatusTabs from "../../components/my-rentals/StatusTabs";

import SearchAndSortBar from "../../components/my-rentals/SearchAndSortBar";

import RentalCard from "../../components/my-rentals/RentalCard";



import ConfirmationModal from "../../components/my-rentals/modals/ConfirmationModal";

import TrackingModal from "../../components/my-rentals/modals/TrackingModal";

import DetailModal from "../../components/my-rentals/modals/DetailModal";

import DeliveryReportModal from "../../components/my-rentals/modals/DeliveryReportModal";

import DamageReportModal from "../../components/my-rentals/modals/DamageReportModal";

import ExtendModal from "../../components/my-rentals/modals/ExtendModal";

import ReviewModal from "../../components/my-rentals/modals/ReviewModal";

import ExtendConfirmModal from "../../components/my-rentals/modals/ExtendConfirmModal";

import ReportDetailModal from "../../components/my-rentals/modals/ReportDetailModal";



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

  const [searchTerm, setSearchTerm] = useState("");

  const [sortOption, setSortOption] = useState("newest");



  const [modalConfig, setModalConfig] = useState({

    isOpen: false,

    type: "",

    selectedId: null,

    title: "",

    description: "",

  });



  const [trackingModal, setTrackingModal] = useState({

    isOpen: false,

    order: null,

  });

  const [detailModal, setDetailModal] = useState({

    isOpen: false,

    order: null,

  });



  const [DeliReportModal, setDeliReportModal] = useState({

    isOpen: false,

    rentalId: null,

    selectedItems: [],

    reasonType: "",

    description: "",

    files: [],

    order: null,

  });



  const [damageReportModal, setDamageReportModal] = useState({

    isOpen: false,

    rentalId: null,

    selectedItems: [],

    severity: "MEDIUM",

    description: "",

    files: [],

    order: null,

  });



  const [reviewModal, setReviewModal] = useState({

    isOpen: false,

    orderId: null,

    rating: 5,

    comment: "",

    files: [],

    order: null,

  });



  const [extendModal, setExtendModal] = useState({

    isOpen: false,

    orderId: null,

    currentEndDate: null,

    newEndDate: "",

    dailyPrice: 0,

    extraAmount: 0,

    note: "",

    order: null,

  });



  const [extendConfirmModal, setExtendConfirmModal] = useState({

    isOpen: false,

    extensionDays: 0,

    extraAmount: 0,

    newEndDate: "",

    orderId: null,

  });



  const [reportDetailModal, setReportDetailModal] = useState({

    isOpen: false,

    report: null,

  });



  const [reviewSelectedItems, setReviewSelectedItems] = useState([]);

  const [reviewStatusMap, setReviewStatusMap] = useState({});

  const [reviewLoading, setReviewLoading] = useState(false);

  const [walletBalance, setWalletBalance] = useState(0);

  const navigate = useNavigate();
  const ITEMS_PER_PAGE = 5;

  const [currentPage, setCurrentPage] = useState(1);



  // Pagination for sidebars

  const REPORTS_PER_PAGE = 5;

  const [reportsPage, setReportsPage] = useState(1);

  const EXTEND_PER_PAGE = 5;

  const [extendPage, setExtendPage] = useState(1);

  // Tabs for processing vs processed

  const [reportTab, setReportTab] = useState("processing"); // "processing" | "processed"

  const [extendTab, setExtendTab] = useState("processing"); // "processing" | "processed"



  useEffect(() => {

    fetchRentals();

    fetchWalletBalance();

  }, []);



  const fetchRentals = async () => {

    try {

      setLoading(true);

      const res = await rentalService.getMyRentals();

      setRentals(res.rentals || []);

    } catch {

      toast.error("Không thể tải danh sách đơn thuê");

    } finally {

      setLoading(false);

    }

  };



  const fetchWalletBalance = async () => {

    try {

      const res = await getMyWallet();

      setWalletBalance(res?.data?.balance || res?.balance || 0);

    } catch (err) {

      console.error("Failed to fetch wallet:", err);

    }

  };



  useEffect(() => {

    setCurrentPage(1);

  }, [activeTab, searchTerm, sortOption]);



  const handlePayNow = async (order) => {

    try {

      toast.info("Đang tạo link thanh toán...");

      const res = await rentalService.repaySingleRental(order._id);

      if (res?.success && res?.paymentLink) window.location.href = res.paymentLink;

      else toast.error("Không thể tạo link thanh toán");

    } catch (err) {

      toast.error(err.response?.data?.message || "Lỗi khi thanh toán");

    }

  };



  const handleOpenModal = (type, id) => {

    const config =

      type === "CANCEL"

        ? {

          title: "Xác nhận hủy đơn?",

          description: "Tiền sẽ được hoàn về ví nếu bạn đã thanh toán thành công.",

        }

        : {

          title: "Xác nhận nhận hàng?",

          description: "Vui lòng chỉ xác nhận khi bạn đã kiểm tra kỹ thiết bị.",

        };

    setModalConfig({ isOpen: true, type, selectedId: id, ...config });

  };



  const handleModalConfirm = async () => {

    const { type, selectedId } = modalConfig;

    try {

      if (type === "CANCEL") {

        await rentalService.cancelRental(selectedId);

        toast.success("Đã hủy đơn thành công!");

      } else {

        await rentalService.confirmReceived(selectedId);

        toast.success("Xác nhận đã nhận hàng thành công!");

      }

      setModalConfig((prev) => ({ ...prev, isOpen: false }));

      fetchRentals();

    } catch (error) {

      toast.error(error.response?.data?.message || "Lỗi thao tác");

    }

  };



  const toggleSerialSelection = (deviceItemId, modalSetter) => {

    if (!modalSetter) {

      // Default to delivery report modal if no setter provided

      setDeliReportModal((prev) => {

        const current = prev.selectedItems || [];

        const next = current.includes(deviceItemId)

          ? current.filter((id) => id !== deviceItemId)

          : [...current, deviceItemId];

        return { ...prev, selectedItems: next };

      });

    } else {

      modalSetter((prev) => {

        const current = prev.selectedItems || [];

        const next = current.includes(deviceItemId)

          ? current.filter((id) => id !== deviceItemId)

          : [...current, deviceItemId];

        return { ...prev, selectedItems: next };

      });

    }

  };



  const handleFileUpload = (files, setter) => {

    setter((prev) => ({

      ...prev,

      files: [...(prev.files || []), ...Array.from(files)],

    }));

  };



  const handleSubmitDeliReport = async () => {

    if (!DeliReportModal.reasonType) return toast.warning("Vui lòng chọn lý do");

    if (!DeliReportModal.selectedItems?.length)

      return toast.warning("Vui lòng chọn ít nhất một sản phẩm");



    try {

      const order = DeliReportModal.order;

      const items = order?.items || [];



      const rentalItemIdSet = new Set(items.map((i) => i._id?.toString()).filter(Boolean));



      const rentalItemIds = new Set();

      const deviceItemIds = [];



      for (const selectedIdRaw of DeliReportModal.selectedItems) {

        const selectedId = selectedIdRaw?.toString();

        if (!selectedId) continue;



        if (rentalItemIdSet.has(selectedId)) {

          rentalItemIds.add(selectedId);

          continue;

        }



        const matchedItem = items.find((it) =>

          (it.deviceItemIds || []).some((did) => {

            const didStr = did?._id?.toString?.() ?? did?.toString?.();

            return didStr === selectedId;

          })

        );

        if (matchedItem?._id) {

          rentalItemIds.add(matchedItem._id.toString());

          deviceItemIds.push(selectedId);

        }

      }

      if (rentalItemIds.size === 0) {

        return toast.warning("Không xác định được sản phẩm cần báo cáo");

      }



      const formData = new FormData();

      formData.append("rentalId", DeliReportModal.rentalId);

      // BE expects keys: rentalItemIds (array), deviceItemIds (array)

      Array.from(rentalItemIds).forEach((id) => formData.append("rentalItemIds", id));

      deviceItemIds.forEach((id) => formData.append("deviceItemIds", id));

      formData.append(

        "issueType",

        REPORT_REASON_MAP[DeliReportModal.reasonType]

      );

      formData.append("description", DeliReportModal.description);

      (DeliReportModal.files || []).forEach((file) => formData.append("images", file));



      await rentalService.reportDeliveryIssue(formData);

      toast.success("Báo cáo đã được gửi");

      setDeliReportModal({

        isOpen: false,

        rentalId: null,

        selectedItems: [],

        reasonType: "",

        description: "",

        files: [],

        order: null,

      });

      fetchRentals();

    } catch (err) {

      console.error("Delivery report error:", err);

      const errorMsg = err.response?.data?.message || err.message || "Gửi báo cáo thất bại";

      toast.error(errorMsg);

    }

  };



  const handleSubmitDamageReport = async () => {

    if (!damageReportModal.description?.trim())

      return toast.warning("Vui lòng nhập mô tả");

    if (!damageReportModal.selectedItems?.length)

      return toast.warning("Vui lòng chọn ít nhất một sản phẩm/serial");



    try {

      const order = damageReportModal.order;

      const items = order?.items || [];

      const rentalItemIdSet = new Set(items.map((i) => i._id?.toString()).filter(Boolean));



      let rentalItemId = null;

      const deviceItemIds = [];



      for (const selectedIdRaw of damageReportModal.selectedItems) {

        const selectedId = selectedIdRaw?.toString();

        if (!selectedId) continue;



        if (rentalItemIdSet.has(selectedId)) {

          if (rentalItemId && rentalItemId !== selectedId) {

            return toast.warning("Chỉ chọn báo cáo cho 1 sản phẩm mỗi lần");

          }

          rentalItemId = selectedId;

          continue;

        }



        const matchedItem = items.find((it) =>

          (it.deviceItemIds || []).some((did) => {

            const didStr = did?._id?.toString?.() ?? did?.toString?.();

            return didStr === selectedId;

          })

        );

        if (matchedItem?._id) {

          if (rentalItemId && rentalItemId !== matchedItem._id.toString()) {

            return toast.warning("Chỉ chọn báo cáo cho 1 sản phẩm mỗi lần");

          }

          rentalItemId = matchedItem._id.toString();

          deviceItemIds.push(selectedId);

        }

      }



      if (!rentalItemId) return toast.warning("Không xác định được sản phẩm bị hỏng");



      const formData = new FormData();

      formData.append("rentalId", damageReportModal.rentalId);

      formData.append("rentalItemId", rentalItemId);

      // BE expects key: deviceItemIds (array)

      deviceItemIds.forEach((id) => formData.append("deviceItemIds", id));

      formData.append("severity", damageReportModal.severity || "MEDIUM");

      formData.append("description", damageReportModal.description);

      (damageReportModal.files || []).forEach((file) => formData.append("images", file));



      await rentalService.reportDamage(formData);

      toast.success("Báo cáo hư hỏng đã được gửi");

      setDamageReportModal({

        isOpen: false,

        rentalId: null,

        selectedItems: [],

        severity: "MEDIUM",

        description: "",

        files: [],

        order: null,

      });

      fetchRentals();

    } catch (err) {

      console.error("Damage report error:", err);

      const errorMsg = err.response?.data?.message || err.message || "Gửi báo cáo thất bại";

      toast.error(errorMsg);

    }

  };



  const openReviewModal = async (order) => {

    try {

      const res = await hasReviewedRental(order._id);

      setReviewStatusMap(prev => ({

        ...prev,

        [order._id]: res?.hasReviewed ?? false

      }));

    } catch {

      setReviewStatusMap(prev => ({

        ...prev,

        [order._id]: false

      }));

    }

    setReviewSelectedItems([]);

    setReviewModal({

      isOpen: true,

      orderId: order._id,

      rating: 5,

      comment: "",

      files: [],

      order,

    });

  };



  const handleSubmitReview = async () => {

    try {

      const formData = new FormData();

      formData.append("rating", reviewModal.rating);

      formData.append("comment", reviewModal.comment);

      formData.append("rentalId", reviewModal.orderId);



      reviewModal.files.forEach((file) => {

        formData.append("images", file);

      });



      // If no items selected, select all rental items

      let itemsToReview = reviewSelectedItems;

      if (itemsToReview.length === 0 && reviewModal.order?.items) {

        itemsToReview = reviewModal.order.items.map(item => item._id);

      }



      itemsToReview.forEach((itemId) => {

        formData.append("rentalItemIds", itemId);

      });



      await rentalService.submitReview(reviewModal.orderId, formData);

      toast.success("Đánh giá đã được gửi!");

      setReviewStatusMap(prev => ({

        ...prev,

        [reviewModal.orderId]: true

      }));

      setReviewModal({

        isOpen: false,

        orderId: null,

        rating: 5,

        comment: "",

        files: [],

        order: null,

      });

      // Refresh rentals data to ensure UI updates

      fetchRentals();

    } catch (err) {

      toast.error(err.response?.data?.message || "Gửi đánh giá thất bại");

    }

  };



  const handleSubmitExtend = () => {

    if (!extendModal.newEndDate) return toast.warning("Vui lòng chọn ngày gia hạn mới");



    const currentEnd = new Date(extendModal.currentEndDate);

    const newEnd = new Date(extendModal.newEndDate);

    if (isNaN(currentEnd.getTime()) || isNaN(newEnd.getTime()))

      return toast.error("Ngày không hợp lệ. Vui lòng chọn lại.");



    const today = new Date();

    today.setHours(0, 0, 0, 0);

    newEnd.setHours(0, 0, 0, 0);



    if (newEnd <= today) return toast.warning("Ngày gia hạn phải lớn hơn hôm nay");

    if (newEnd <= currentEnd)

      return toast.warning("Ngày gia hạn phải sau ngày trả hiện tại");



    const extensionDays = Math.ceil(

      (newEnd - currentEnd) / (1000 * 60 * 60 * 24)

    );

    const quantity = extendModal.order?.items?.[0]?.quantity || 1;

    const extraAmount = Math.round(

      extensionDays * (extendModal.dailyPrice || 0) * quantity

    );



    if (extensionDays <= 0 || extraAmount <= 0)

      return toast.warning("Số ngày gia hạn hoặc phí phát sinh không hợp lệ");



    setExtendConfirmModal({

      isOpen: true,

      extensionDays,

      extraAmount,

      newEndDate: extendModal.newEndDate,

      orderId: extendModal.orderId,

    });

  };



  const handleConfirmExtend = async () => {

    try {

      const payload = {

        newEndDate: extendConfirmModal.newEndDate,

        requestedDays: extendConfirmModal.extensionDays,

        extraAmount: extendConfirmModal.extraAmount,

        note: extendModal.note || "",

      };



      await rentalService.extendRental(extendConfirmModal.orderId, payload);

      toast.success("Yêu cầu gia hạn đã được gửi thành công!");



      setExtendConfirmModal({

        isOpen: false,

        extensionDays: 0,

        extraAmount: 0,

        newEndDate: "",

        orderId: null,

      });

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

      fetchRentals();

    } catch (err) {

      console.error("Extend error:", err);

      const errorMsg = err.response?.data?.message || err.message || "Gửi yêu cầu gia hạn thất bại";

      toast.error(errorMsg);

    }

  };



  const handleReRent = (order) => {

    if (order.items?.[0]?.deviceId?.slug) navigate(`/device/${order.items[0].deviceId.slug}`);

    else navigate("/devices");

  };



  const handleDateChange = (date) => {

    if (!extendModal.currentEndDate || !date) return;

    const start = new Date(extendModal.currentEndDate);

    const end = new Date(date);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) return;

    start.setHours(0, 0, 0, 0);

    end.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

    const validDays = diffDays > 0 ? diffDays : 0;

    const dailyPrice = extendModal.dailyPrice || 0;

    const quantity = extendModal.order?.items?.[0]?.quantity || 1;

    setExtendModal((prev) => ({

      ...prev,

      newEndDate: date,

      extraAmount: validDays * dailyPrice * quantity,

    }));

  };



  const minExtendDate = useMemo(() => {

    if (!extendModal.currentEndDate) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    }
    const currentEnd = new Date(extendModal.currentEndDate);
    if (isNaN(currentEnd.getTime())) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    }
    const nextDay = new Date(currentEnd);
    nextDay.setDate(nextDay.getDate() + 1);
    return nextDay.toISOString().split('T')[0];
  }, [extendModal.currentEndDate]);



  const filteredAndSortedRentals = useMemo(() => {

    let result = [...rentals];



    if (activeTab !== "ALL") {

      result = result.filter((r) =>

        activeTab === "DELIVERING"

          ? r.status === "DELIVERING" || r.status === "APPROVED"

          : r.status === activeTab

      );

    }



    if (searchTerm.trim()) {

      const term = searchTerm.toLowerCase().trim();

      result = result.filter(

        (r) =>

          (r.orderCode ? `BK${String(r.orderCode).padStart(4, "0")}` : "").includes(term) ||

          (r.items || []).some((item) => item.deviceId?.name?.toLowerCase().includes(term))

      );

    }



    switch (sortOption) {

      case "newest":

        result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        break;

      case "oldest":

        result.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

        break;

      case "price-high":

        result.sort((a, b) => (b.totalAmount || 0) - (a.totalAmount || 0));

        break;

      case "price-low":

        result.sort((a, b) => (a.totalAmount || 0) - (b.totalAmount || 0));

        break;

      case "start-date":

        result.sort(

          (a, b) =>

            new Date(b.items?.[0]?.rentalStartDate || 0) -

            new Date(a.items?.[0]?.rentalStartDate || 0)

        );

        break;

      default:

        break;

    }



    return result;

  }, [rentals, activeTab, searchTerm, sortOption]);



  const reportsForSidebar = useMemo(() => {

    const reports = [];



    for (const rental of rentals) {

      // Debug logging

      if (rental.items?.some(item => item.deliveryIssues?.length > 0 || item.damageReports?.length > 0)) {

        console.log("[MyRentals] Rental with reports:", rental.orderCode);

        rental.items.forEach(item => {

          if (item.deliveryIssues?.length > 0) {

            console.log("[MyRentals] Delivery issues:", item.deliveryIssues.map(d => ({ 

              id: d._id, 

              deviceItemIds: d.deviceItemIds,

              deviceItemIdsLength: d.deviceItemIds?.length 

            })));

          }

          if (item.damageReports?.length > 0) {

            console.log("[MyRentals] Damage reports:", item.damageReports.map(d => ({ 

              id: d._id, 

              deviceItemIds: d.deviceItemIds,

              deviceItemIdsLength: d.deviceItemIds?.length 

            })));

          }

        });

      }

      for (const item of rental.items || []) {

        // Check delivery issues

        const deliveryIssues = item.deliveryIssues || [];

        // Debug log for delivery issues

        if (deliveryIssues.length > 0) {

          console.log("[MyRentals] Delivery issues for item:", item.deviceId?.name, deliveryIssues.map(d => ({ 

            id: d._id, 

            deviceItemIds: d.deviceItemIds,

            deviceItemIdsLength: d.deviceItemIds?.length 

          })));

        }

        for (const r of deliveryIssues) {

          reports.push({

            type: "DELIVERY",

            id: r._id,

            rentalId: rental._id,

            rentalCode: rental.orderCode,

            itemName: item.deviceId?.name,

            status: r.status,

            deviceItemIds: r.deviceItemIds || [],

            createdAt: r.createdAt,

            description: r.description,

            issueType: r.issueType,

            deviceItemIds: r.deviceItemIds || [],

            images: r.images || [],

            resolution: r.resolution,

            resolvedAt: r.resolvedAt,

            resolvedBy: r.resolvedBy?.name,

            rejectionReason: r.rejectionReason,

          });

        }

        // Check damage reports

        const damageReports = item.damageReports || [];

        for (const r of damageReports) {

          reports.push({

            type: "DAMAGE",

            id: r._id,

            rentalId: rental._id,

            rentalCode: rental.orderCode,

            itemName: item.deviceId?.name,

            status: r.status,

            createdAt: r.createdAt,

            description: r.description,

            severity: r.severity,

            compensationAmount: r.compensationAmount,

            images: r.images || [],

            deviceItemIds: r.deviceItemIds || [],

            productName: item.deviceId?.name,

            serialNumber: item.serialNumber,

            resolution: r.resolution,

            resolvedAt: r.resolvedAt,

            resolvedBy: r.resolvedBy?.name,

            rejectionReason: r.rejectionReason,

          });

        }

      }

    }



    reports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return reports;

  }, [rentals]);



  const extendRequestsForSidebar = useMemo(() => {

    const reqs = [];

    for (const rental of rentals) {

      for (const r of rental.extensionRequests || []) {

        reqs.push({

          rentalId: rental._id,

          rentalCode: rental.orderCode,

          requestedEndDate: r.requestedEndDate,

          requestedDays: r.requestedDays,

          proposedExtraAmount: r.proposedExtraAmount,

          status: r.status,

          note: r.note,

          createdAt: r.createdAt,

        });

      }

    }

    reqs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return reqs;

  }, [rentals]);



  const currentRentals = filteredAndSortedRentals.slice(

    (currentPage - 1) * ITEMS_PER_PAGE,

    currentPage * ITEMS_PER_PAGE

  );



  const totalPages = Math.ceil(filteredAndSortedRentals.length / ITEMS_PER_PAGE);



  // Filter and pagination for sidebars

  const processingStatuses = ["OPEN", "PROCESSING", "WAITING_EVIDENCE", "PENDING"];

  const processedStatuses = ["RESOLVED", "REJECTED", "APPROVED"];



  const filteredReports = useMemo(() => {

    const isProcessing = reportTab === "processing";

    return reportsForSidebar.filter(r =>

      isProcessing ? processingStatuses.includes(r.status) : processedStatuses.includes(r.status)

    );

  }, [reportsForSidebar, reportTab]);



  const filteredExtendRequests = useMemo(() => {

    const isProcessing = extendTab === "processing";

    return extendRequestsForSidebar.filter(r =>

      isProcessing ? processingStatuses.includes(r.status) : processedStatuses.includes(r.status)

    );

  }, [extendRequestsForSidebar, extendTab]);



  const currentReports = filteredReports.slice(

    (reportsPage - 1) * REPORTS_PER_PAGE,

    reportsPage * REPORTS_PER_PAGE

  );

  const totalReportsPages = Math.ceil(filteredReports.length / REPORTS_PER_PAGE);



  const currentExtendRequests = filteredExtendRequests.slice(

    (extendPage - 1) * EXTEND_PER_PAGE,

    extendPage * EXTEND_PER_PAGE

  );

  const totalExtendPages = Math.ceil(filteredExtendRequests.length / EXTEND_PER_PAGE);



  return (

    <div className="min-h-screen bg-[#F8F9FB] pb-20 font-sans">

      <Header />



      <div className="max-w-screen-2xl mx-auto px-4 lg:px-12 xl:px-16 pt-32">

        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">

          <div>

            <h1 className="text-5xl font-black text-gray-900 tracking-tighter italic uppercase">

              My <span className="text-indigo-600 not-italic">Orders</span>

            </h1>

            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-[0.3em] mt-2">

              Manage your rental history and device status

            </p>

          </div>

        </div>



        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8">

          {/* LEFT SIDEBAR */}

          <aside className="lg:col-span-3 xl:col-span-3">

            <div className="bg-white rounded-3xl border border-gray-100 p-6 lg:sticky lg:top-24">

              <div className="flex items-end justify-between mb-4">

                <div>

                  <div className="text-[11px] font-black uppercase tracking-widest text-gray-400">

                    Reports

                  </div>

                  <div className="text-lg font-black text-gray-900">

                    Delivery / Damage

                  </div>

                </div>

                <div className="text-[11px] font-bold text-gray-400">

                  {filteredReports.length} báo cáo

                </div>

              </div>



              {/* Tabs for Reports */}

              <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl">

                <button

                  onClick={() => { setReportTab("processing"); setReportsPage(1); }}

                  className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-black uppercase transition-all ${

                    reportTab === "processing"

                      ? "bg-white text-gray-900 shadow-sm"

                      : "text-gray-500 hover:text-gray-700"

                  }`}

                >

                  Đang xử lý

                </button>

                <button

                  onClick={() => { setReportTab("processed"); setReportsPage(1); }}

                  className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-black uppercase transition-all ${

                    reportTab === "processed"

                      ? "bg-white text-gray-900 shadow-sm"

                      : "text-gray-500 hover:text-gray-700"

                  }`}

                >

                  Đã xử lý

                </button>

              </div>



              {filteredReports.length === 0 ? (

                <div className="text-sm text-gray-500 text-center py-4">

                  {reportTab === "processing" ? "Không có báo cáo đang xử lý" : "Không có báo cáo đã xử lý"}

                </div>

              ) : (

                <>

                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">

                    {currentReports.map((r, idx) => (

                      <div

                        key={`${r.type}-${idx}`}

                        onClick={() => setReportDetailModal({ isOpen: true, report: r })}

                        className="p-4 rounded-2xl bg-gray-50 border border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors"

                      >

                        <div className="flex items-center justify-between gap-3">

                          <div className="min-w-0">

                            <div className="text-xs font-black text-gray-900 truncate">

                              {r.itemName || "Thiết bị"}{" "}

                              <span className="text-gray-400 font-bold">

                                {r.rentalCode

                                  ? `• BK${String(r.rentalCode).padStart(4, "0")}`

                                  : ""}

                              </span>

                            </div>

                            <div className="text-[11px] text-gray-500 mt-1 line-clamp-2">

                              {r.description || "-"}

                            </div>

                          </div>

                          <div className="flex flex-col items-end gap-1">

                            <div

                              className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase ${r.type === "DELIVERY"

                                  ? "bg-amber-100 text-amber-700"

                                  : "bg-red-100 text-red-700"

                                }`}

                            >

                              {r.type === "DELIVERY" ? "Delivery" : "Damage"}

                            </div>

                            <div className="text-[10px] font-bold text-gray-400">

                              {r.createdAt

                                ? new Date(r.createdAt).toLocaleDateString("vi-VN")

                                : ""}

                            </div>

                          </div>

                        </div>

                        <div className="mt-3 flex items-center justify-between">

                          <div className="text-[11px] font-bold text-gray-500">

                            Status:{" "}

                            <span className="text-gray-700">

                              {r.status || "OPEN"}

                            </span>

                          </div>

                          {r.type === "DAMAGE" && r.severity && (

                            <div className="text-[11px] font-bold text-gray-500">

                              Severity:{" "}

                              <span className="text-gray-700">{r.severity}</span>

                            </div>

                          )}

                          {r.type === "DELIVERY" && r.issueType && (

                            <div className="text-[11px] font-bold text-gray-500">

                              Type:{" "}

                              <span className="text-gray-700">{r.issueType}</span>

                            </div>

                          )}

                        </div>

                      </div>

                    ))}

                  </div>



                  {/* Pagination for Reports */}

                  {totalReportsPages > 1 && (

                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">

                      <button

                        disabled={reportsPage <= 1}

                        onClick={() => setReportsPage((p) => Math.max(1, p - 1))}

                        className={`px-3 py-1.5 rounded-lg text-xs font-bold ${reportsPage <= 1

                            ? "text-gray-300 cursor-not-allowed"

                            : "text-gray-600 hover:bg-gray-100"

                          }`}

                      >

                        ← Trước

                      </button>

                      <span className="text-xs font-semibold text-gray-500">

                        {reportsPage} / {totalReportsPages}

                      </span>

                      <button

                        disabled={reportsPage >= totalReportsPages}

                        onClick={() => setReportsPage((p) => Math.min(totalReportsPages, p + 1))}

                        className={`px-3 py-1.5 rounded-lg text-xs font-bold ${reportsPage >= totalReportsPages

                            ? "text-gray-300 cursor-not-allowed"

                            : "text-gray-600 hover:bg-gray-100"

                          }`}

                      >

                        Sau →

                      </button>

                    </div>

                  )}

                </>

              )}

            </div>

          </aside>



          {/* CENTER */}

          <main className="lg:col-span-6 xl:col-span-6">

            <StatusTabs activeTab={activeTab} setActiveTab={setActiveTab} />

            <SearchAndSortBar

              searchTerm={searchTerm}

              setSearchTerm={setSearchTerm}

              sortOption={sortOption}

              setSortOption={setSortOption}

            />



            {loading ? (

              <div className="flex flex-col items-center py-20">

                <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mb-4" />

                <span className="text-[10px] font-bold uppercase text-gray-400 tracking-widest italic">

                  Loading your orders...

                </span>

              </div>

            ) : (

              <div className="space-y-8">

                {currentRentals.length > 0 ? (

                  currentRentals.map((order) => (

                    <RentalCard

                      key={order._id}

                      order={order}

                      onPayNow={() => handlePayNow(order)}

                      onCancel={() => handleOpenModal("CANCEL", order._id)}

                      onConfirmReceived={() => handleOpenModal("CONFIRM", order._id)}

                      onTrack={() => setTrackingModal({ isOpen: true, order })}

                      onExtend={() =>

                        setExtendModal({

                          isOpen: true,

                          orderId: order._id,

                          currentEndDate: order.items?.[0]?.rentalEndDate || order.items?.[0]?.endDate,

                          newEndDate: "",

                          extraAmount: 0,

                          dailyPrice: order.items?.[0]?.rentPrice || order.rentPriceTotal / (order.items?.[0]?.totalDays || 1) || 0,

                          order,

                          items: order.items || [],

                          note: ""

                        })

                      }

                      onReportDelivery={(item) =>

                        setDeliReportModal({

                          isOpen: true,

                          rentalId: order._id,

                          selectedItems: [],

                          order,

                        })

                      }

                      onReportDamage={() =>

                        setDamageReportModal({

                          isOpen: true,

                          rentalId: order._id,

                          selectedItems: [],

                          severity: "MEDIUM",

                          description: "",

                          files: [],

                          order,

                        })

                      }

                      onReview={() => openReviewModal(order)}

                      onClickDetail={() => navigate(`/my-rentals/${order._id}`)}

                      onReRent={() => handleReRent(order)}

                      hasReviewed={order.isReviewed || false}

                    />

                  ))

                ) : (

                  <div className="bg-white rounded-3xl p-16 text-center border border-dashed border-gray-200">

                    <div className="mx-auto w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-gray-300 mb-6">

                      📦

                    </div>

                    <h3 className="text-2xl font-bold text-gray-900">Chưa có đơn thuê nào</h3>

                    <p className="text-gray-500 mt-2">Bạn chưa có giao dịch nào trong mục này</p>

                    <button

                      onClick={() => navigate("/devices")}

                      className="mt-8 px-10 py-4 bg-gray-900 hover:bg-black text-white rounded-2xl font-bold text-sm"

                    >

                      Khám phá thiết bị

                    </button>

                  </div>

                )}

              </div>

            )}

          </main>



          {/* RIGHT SIDEBAR */}

          <aside className="lg:col-span-3">

            <div className="bg-white rounded-3xl border border-gray-100 p-6 lg:sticky lg:top-24">

              <div className="flex items-end justify-between mb-4">

                <div>

                  <div className="text-[11px] font-black uppercase tracking-widest text-gray-400">

                    Extend requests

                  </div>

                  <div className="text-lg font-black text-gray-900">

                    Pending extensions

                  </div>

                </div>

                <div className="text-[11px] font-bold text-gray-400">

                  {filteredExtendRequests.length} yêu cầu

                </div>

              </div>



              {/* Tabs for Extend */}

              <div className="flex gap-1 mb-4 bg-indigo-100 p-1 rounded-xl">

                <button

                  onClick={() => { setExtendTab("processing"); setExtendPage(1); }}

                  className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-black uppercase transition-all ${

                    extendTab === "processing"

                      ? "bg-white text-indigo-900 shadow-sm"

                      : "text-indigo-600 hover:text-indigo-800"

                  }`}

                >

                  Đang xử lý

                </button>

                <button

                  onClick={() => { setExtendTab("processed"); setExtendPage(1); }}

                  className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-black uppercase transition-all ${

                    extendTab === "processed"

                      ? "bg-white text-indigo-900 shadow-sm"

                      : "text-indigo-600 hover:text-indigo-800"

                  }`}

                >

                  Đã xử lý

                </button>

              </div>



              {filteredExtendRequests.length === 0 ? (

                <div className="text-sm text-gray-500 text-center py-4">

                  {extendTab === "processing" ? "Không có yêu cầu đang xử lý" : "Không có yêu cầu đã xử lý"}

                </div>

              ) : (

                <>

                  <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">

                    {currentExtendRequests.map((r, idx) => (

                      <div

                        key={`${r.rentalId}-${idx}`}

                        className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100"

                      >

                        <div className="flex items-center justify-between gap-3">

                          <div className="min-w-0">

                            <div className="text-xs font-black text-gray-900 truncate">

                              {r.rentalCode

                                ? `BK${String(r.rentalCode).padStart(4, "0")}`

                                : r.rentalId}

                            </div>

                            <div className="text-[11px] text-gray-600 mt-1">

                              Đến ngày:{" "}

                              <span className="font-bold">

                                {r.requestedEndDate

                                  ? new Date(r.requestedEndDate).toLocaleDateString("vi-VN")

                                  : "-"}

                              </span>{" "}

                              • {r.requestedDays || 0} ngày

                            </div>

                          </div>

                          <div className="flex flex-col items-end gap-1">

                            <div className="px-3 py-1 rounded-xl text-[10px] font-black uppercase bg-indigo-600 text-white">

                              {r.status || "PENDING"}

                            </div>

                            <div className="text-[10px] font-bold text-indigo-700">

                              {(r.proposedExtraAmount || 0).toLocaleString()} ₫

                            </div>

                          </div>

                        </div>

                        {r.note && (

                          <div className="text-[11px] text-indigo-700 mt-2 line-clamp-2">

                            {r.note}

                          </div>

                        )}

                      </div>

                    ))}

                  </div>



                  {/* Pagination for Extend Requests */}

                  {totalExtendPages > 1 && (

                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">

                      <button

                        disabled={extendPage <= 1}

                        onClick={() => setExtendPage((p) => Math.max(1, p - 1))}

                        className={`px-3 py-1.5 rounded-lg text-xs font-bold ${extendPage <= 1

                            ? "text-gray-300 cursor-not-allowed"

                            : "text-gray-600 hover:bg-gray-100"

                          }`}

                      >

                        ← Trước

                      </button>

                      <span className="text-xs font-semibold text-gray-500">

                        {extendPage} / {totalExtendPages}

                      </span>

                      <button

                        disabled={extendPage >= totalExtendPages}

                        onClick={() => setExtendPage((p) => Math.min(totalExtendPages, p + 1))}

                        className={`px-3 py-1.5 rounded-lg text-xs font-bold ${extendPage >= totalExtendPages

                            ? "text-gray-300 cursor-not-allowed"

                            : "text-gray-600 hover:bg-gray-100"

                          }`}

                      >

                        Sau →

                      </button>

                    </div>

                  )}

                </>

              )}

            </div>

          </aside>

        </div>

      </div>



      <ConfirmationModal

        modalConfig={modalConfig}

        onClose={() => setModalConfig((p) => ({ ...p, isOpen: false }))}

        onConfirm={handleModalConfirm}

      />

      <TrackingModal trackingModal={trackingModal} setTrackingModal={setTrackingModal} />

      <DetailModal detailModal={detailModal} setDetailModal={setDetailModal} />

      <DeliveryReportModal

        DeliReportModal={DeliReportModal}

        setDeliReportModal={setDeliReportModal}

        handleSubmitDeliReport={handleSubmitDeliReport}

        handleFileUpload={handleFileUpload}

        toggleSerialSelection={toggleSerialSelection}

        REPORT_REASONS={REPORT_REASONS}

        REPORT_REASON_MAP={REPORT_REASON_MAP}

      />

      <DamageReportModal

        damageReportModal={damageReportModal}

        setDamageReportModal={setDamageReportModal}

        handleFileUpload={handleFileUpload}

        toggleSerialSelection={toggleSerialSelection}

        handleSubmitDamageReport={handleSubmitDamageReport}

      />

      <ExtendModal

        extendModal={extendModal}

        setExtendModal={setExtendModal}

        handleSubmitExtend={handleSubmitExtend}

        handleDateChange={handleDateChange}

        minExtendDate={minExtendDate}

        walletBalance={walletBalance}

      />

      <ReviewModal

        reviewModal={reviewModal}

        setReviewModal={setReviewModal}

        reviewSelectedItems={reviewSelectedItems}

        setReviewSelectedItems={setReviewSelectedItems}

        hasReviewed={reviewModal.orderId ? (reviewStatusMap[reviewModal.orderId] ?? false) : false}

        reviewLoading={reviewLoading}

        handleSubmitReview={handleSubmitReview}

        handleFileUpload={handleFileUpload}

      />

      <ExtendConfirmModal

        isOpen={extendConfirmModal.isOpen}

        onClose={() =>

          setExtendConfirmModal({

            isOpen: false,

            extensionDays: 0,

            extraAmount: 0,

            newEndDate: "",

            orderId: null,

          })

        }

        onConfirm={handleConfirmExtend}

        extensionDays={extendConfirmModal.extensionDays}

        extraAmount={extendConfirmModal.extraAmount}

        newEndDate={extendConfirmModal.newEndDate}

      />



      <ReportDetailModal

        isOpen={reportDetailModal.isOpen}

        onClose={() => setReportDetailModal({ isOpen: false, report: null })}

        report={reportDetailModal.report}

      />



      {totalPages > 1 && (

        <div className="max-w-5xl mx-auto px-4 mt-10">

          <div className="flex items-center justify-center gap-3">

            <button

              disabled={currentPage <= 1}

              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}

              className={`px-5 py-3 rounded-2xl text-sm font-bold border ${currentPage <= 1

                  ? "bg-gray-100 text-gray-400 border-gray-100 cursor-not-allowed"

                  : "bg-white text-gray-900 border-gray-200 hover:bg-gray-50"

                }`}

            >

              Trước

            </button>

            <div className="text-sm font-semibold text-gray-600">

              {currentPage} / {totalPages}

            </div>

            <button

              disabled={currentPage >= totalPages}

              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}

              className={`px-5 py-3 rounded-2xl text-sm font-bold border ${currentPage >= totalPages

                  ? "bg-gray-100 text-gray-400 border-gray-100 cursor-not-allowed"

                  : "bg-white text-gray-900 border-gray-200 hover:bg-gray-50"

                }`}

            >

              Sau

            </button>

          </div>

        </div>

      )}

    </div>

  );

}



