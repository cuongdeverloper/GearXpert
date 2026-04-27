import React, { useEffect, useMemo, useState } from "react";

import { useNavigate } from "react-router-dom";

import { toast } from "react-toastify";

import * as rentalService from "../../service/ApiService/RentalApi";

import { hasReviewedRental } from "../../service/ApiService/RentalApi";

import { getMyWallet } from "../../service/ApiService/WalletApi";
import { Clock, AlertCircle } from "lucide-react";
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

  const [showAllRentals, setShowAllRentals] = useState(false); // Mặc định chỉ hiện 7 ngày gần nhất

  const [isReportsExpanded, setIsReportsExpanded] = useState(false);

  const [isExtendExpanded, setIsExtendExpanded] = useState(false);



  useEffect(() => {

    fetchRentals();

    fetchWalletBalance();

  }, []);



  const fetchRentals = async () => {

    try {

      setLoading(true);

      const res = await rentalService.getMyRentals();

      // Handle axios response - could be res.rentals or res.data.rentals

      const rentalsData = res.rentals || res?.data?.rentals || [];

      setRentals(rentalsData);

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



    // Filter chỉ hiện đơn trong 7 ngày gần nhất nếu không chọn xem tất cả

    if (!showAllRentals) {

      const sevenDaysAgo = new Date();

      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      result = result.filter((r) => new Date(r.createdAt) >= sevenDaysAgo);

    }



    if (activeTab && activeTab !== "ALL") {

      result = result.filter((r) => {

        // IN_PROGRESS group: DELIVERING, DELIVERED, RENTING, RETURNING

        if (activeTab === "IN_PROGRESS") {

          return ["DELIVERING", "DELIVERED", "RENTING", "RETURNING"].includes(r.status);

        }

        // Individual status tabs

        return r.status === activeTab;

      });

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

  }, [rentals, activeTab, searchTerm, sortOption, showAllRentals]);



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

            rentalCode: rental.orderCode || rental._id?.toString().slice(-6),

            itemName: item.deviceId?.name,

            deviceImage: item.deviceId?.images?.[0],

            status: r.status,

            deviceItemIds: r.deviceItemIds || [],

            createdAt: r.createdAt,

            description: r.description,

            issueType: r.issueType,

            images: r.images || [],

            resolution: r.resolutionNote,

            resolvedAt: r.status === "RESOLVED" || r.status === "REJECTED" ? r.updatedAt : null,

            resolvedBy: r.assignedAdminId?.fullName || (r.resolvedBy?.name || r.resolvedBy),

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

            rentalCode: rental.orderCode || rental._id?.toString().slice(-6),

            itemName: item.deviceId?.name,

            deviceImage: item.deviceId?.images?.[0],

            status: r.status,

            createdAt: r.createdAt,

            description: r.description,

            severity: r.severity,

            compensationAmount: r.compensationAmount,

            images: r.images || [],

            deviceItemIds: r.deviceItemIds || [],

            productName: item.deviceId?.name,

            serialNumber: item.serialNumber,

            resolution: r.resolutionNote,

            resolvedAt: r.status === "RESOLVED" || r.status === "REJECTED" ? r.updatedAt : null,

            resolvedBy: r.assignedAdminId?.fullName || (r.resolvedBy?.name || r.resolvedBy),

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

    

    console.log("[extendRequests] Total rentals:", rentals.length);

    for (const rental of rentals) {

      console.log("[extendRequests] Rental:", rental._id, "items:", rental.items?.length, "extReqs:", rental.extensionRequests?.length);

      

      // Debug first item

      if (rental.items?.[0]) {

        const firstItem = rental.items[0];

        console.log("[extendRequests] First item deviceId:", typeof firstItem.deviceId, firstItem.deviceId?.name || firstItem.deviceId);

      }

      

      for (const extReq of rental.extensionRequests || []) {

        // Use devices from backend (already populated)

        const rentalId = rental._id;

        const rentalCode = rental.orderCode || rentalId?.toString().slice(-6);

        

        // Use devices from backend if available, otherwise map from rental items
        let devices = extReq.devices || [];
        if (!Array.isArray(devices) || devices.length === 0) {
          // If backend didn't enrich, or enriched with empty array, fallback to rental items
          const rentalItems = rental.items || [];
          devices = rentalItems.map(item => {
            const di = item.deviceId;
            const ds = item.deviceSnapshot;
            // di might be populated object OR ID string. ds is SNAPSHOT object.
            const diIsObj = di && typeof di === 'object' && !Array.isArray(di);
            return {
              name: (diIsObj ? di.name : null) || ds?.name || "Thiết bị",
              image: (diIsObj ? di.images?.[0] : null) || ds?.images?.[0] || "https://placehold.co/100x100?text=Gear",
              quantity: item.quantity || 1
            };
          }).filter(d => d.name);
        }
        
        reqs.push({
          _id: extReq._id,
          rentalId: rentalId,
          rentalCode: rentalCode,
          devices: devices,
          deviceCount: devices.length,
          requestedEndDate: extReq.requestedEndDate,
          requestedDays: extReq.requestedDays,
          proposedExtraAmount: extReq.proposedExtraAmount,
          status: extReq.status,
          note: extReq.note,
          createdAt: extReq.createdAt,
        });

      }

    }

    reqs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return reqs;

  }, [rentals]);



  // Calculate counts for StatusTabs badges

  const tabCounts = useMemo(() => {

    const counts = {

      PENDING: 0,

      DELIVERING: 0,

      DELIVERED: 0,

      RENTING: 0,

      RETURNING: 0,

      COMPLETED: 0,

      CANCELLED: 0,

    };

    rentals.forEach((r) => {

      if (counts[r.status] !== undefined) {

        counts[r.status]++;

      }

    });

    return counts;

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

          {/* LEFT SIDEBAR - Reports */}

          <aside className="lg:col-span-3 xl:col-span-3">

            <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden lg:sticky lg:top-24 transition-all duration-300 ease-in-out">

              {/* Collapsed Header */}

              <button

                onClick={() => setIsReportsExpanded(!isReportsExpanded)}

                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"

              >

                <div className="flex items-center gap-3">

                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">

                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />

                    </svg>

                  </div>

                  <div className="text-left">

                    <div className="text-xs font-black text-gray-900">Báo cáo</div>

                    <div className="text-[10px] text-gray-500">Delivery / Damage</div>

                  </div>

                </div>

                <div className="flex items-center gap-2">

                  {filteredReports.length > 0 && (

                    <span className="px-2 py-1 rounded-lg bg-amber-100 text-amber-700 text-[10px] font-black">

                      {filteredReports.length}

                    </span>

                  )}

                  <svg

                    className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isReportsExpanded ? 'rotate-180' : ''}`}

                    fill="none"

                    stroke="currentColor"

                    viewBox="0 0 24 24"

                  >

                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />

                  </svg>

                </div>

              </button>



              {/* Expanded Content with Animation */}

              <div

                className={`overflow-hidden transition-all duration-300 ease-in-out ${

                  isReportsExpanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'

                }`}

              >

                <div className="px-4 pb-4 border-t border-gray-100">

                  {/* Tabs for Reports */}

                  <div className="flex gap-1 mt-4 mb-4 bg-gray-100 p-1 rounded-xl">

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

                      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">

                        {currentReports.map((r, idx) => (

                          <div

                            key={`${r.type}-${idx}`}

                            onClick={() => setReportDetailModal({ isOpen: true, report: r })}

                            className="p-3 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"

                          >

                            {/* Header with Order Code and Report Type */}

                            <div className="flex items-center justify-between mb-3">

                              <div className="flex items-center gap-2">

                                <span className="text-xs font-black text-gray-400 uppercase tracking-wider">Đơn</span>

                                <span className="px-2 py-1 bg-gray-900 text-white rounded-lg text-xs font-black">

                                  {r.rentalCode ? `BK${String(r.rentalCode).padStart(4, "0")}` : "N/A"}

                                </span>

                              </div>

                              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${

                                r.type === "DELIVERY" 

                                  ? "bg-amber-100 text-amber-700" 

                                  : "bg-rose-100 text-rose-700"

                              }`}>

                                {r.type === "DELIVERY" ? "Giao hàng" : "Hư hỏng"}

                              </span>

                            </div>



                            {/* Device Info with Image */}

                            <div className="flex items-center gap-3 mb-3 p-2 bg-gray-50 rounded-xl">

                              <div className="w-12 h-12 rounded-lg bg-white overflow-hidden flex-shrink-0 border border-gray-100">

                                {r.deviceImage ? (

                                  <img

                                    src={r.deviceImage}

                                    alt={r.itemName || "Device"}

                                    className="w-full h-full object-cover"

                                  />

                                ) : (

                                  <div className="w-full h-full flex items-center justify-center bg-gray-100">

                                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />

                                    </svg>

                                  </div>

                                )}

                              </div>

                              <div className="flex-1 min-w-0">

                                <p className="text-xs font-bold text-gray-900 truncate">

                                  {r.itemName || "Thiết bị"}

                                </p>

                                <p className="text-[10px] text-gray-500">

                                  {r.createdAt 

                                    ? new Date(r.createdAt).toLocaleDateString("vi-VN") 

                                    : "-"}

                                </p>

                              </div>

                            </div>



                            {/* Report Details Grid */}

                            <div className="grid grid-cols-2 gap-2">

                              {/* Status */}

                              <div className={`p-2 rounded-lg ${

                                r.status === "RESOLVED" || r.status === "APPROVED"

                                  ? "bg-emerald-50" 

                                  : r.status === "REJECTED"

                                  ? "bg-red-50"

                                  : "bg-amber-50"

                              }`}>

                                <p className="text-[10px] text-gray-500">Trạng thái</p>

                                <p className={`text-xs font-bold ${

                                  r.status === "RESOLVED" || r.status === "APPROVED"

                                    ? "text-emerald-700" 

                                    : r.status === "REJECTED"

                                    ? "text-red-700"

                                    : "text-amber-700"

                                }`}>

                                  {r.status === "OPEN" ? "Chờ xử lý" :

                                   r.status === "PROCESSING" ? "Đang xử lý" :

                                   r.status === "RESOLVED" ? "Đã giải quyết" :

                                   r.status === "APPROVED" ? "Đã duyệt" :

                                   r.status === "REJECTED" ? "Từ chối" : 

                                   r.status || "Chờ xử lý"}

                                </p>

                              </div>



                              {/* Severity for Damage or Type for Delivery */}

                              {r.type === "DAMAGE" && r.severity ? (

                                <div className={`p-2 rounded-lg ${

                                  r.severity === "CRITICAL" || r.severity === "HIGH"

                                    ? "bg-rose-50"

                                    : r.severity === "MEDIUM"

                                    ? "bg-orange-50"

                                    : "bg-green-50"

                                }`}>

                                  <p className="text-[10px] text-gray-500">Mức độ</p>

                                  <p className={`text-xs font-bold ${

                                    r.severity === "CRITICAL" || r.severity === "HIGH"

                                      ? "text-rose-700"

                                      : r.severity === "MEDIUM"

                                      ? "text-orange-700"

                                      : "text-green-700"

                                  }`}>

                                    {r.severity === "CRITICAL" ? "Nghiêm trọng" :

                                     r.severity === "HIGH" ? "Cao" :

                                     r.severity === "MEDIUM" ? "Trung bình" : "Thấp"}

                                  </p>

                                </div>

                              ) : r.type === "DELIVERY" && r.issueType ? (

                                <div className="p-2 bg-blue-50 rounded-lg">

                                  <p className="text-[10px] text-gray-500">Loại vấn đề</p>

                                  <p className="text-xs font-bold text-blue-700 truncate">

                                    {r.issueType === "MISSING" ? "Thiếu hàng" :

                                     r.issueType === "DAMAGED" ? "Hư hỏng" :

                                     r.issueType === "WRONG_ITEM" ? "Sai sản phẩm" : r.issueType}

                                  </p>

                                </div>

                              ) : (

                                <div className="p-2 bg-gray-50 rounded-lg">

                                  <p className="text-[10px] text-gray-500">Mã báo cáo</p>

                                  <p className="text-xs font-bold text-gray-700">

                                    #{r.id?.slice(-6) || "N/A"}

                                  </p>

                                </div>

                              )}

                            </div>



                            {/* Description preview */}

                            {r.description && (

                              <div className="mt-2 p-2 bg-gray-50 rounded-lg">

                                <p className="text-[10px] text-gray-600 line-clamp-2">

                                  {r.description}

                                </p>

                              </div>

                            )}

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

              </div>

            </div>

          </aside>



          {/* CENTER */}

          <main className="lg:col-span-6 xl:col-span-6">

            <StatusTabs activeTab={activeTab} setActiveTab={setActiveTab} counts={tabCounts} />

            <SearchAndSortBar

              searchTerm={searchTerm}

              setSearchTerm={setSearchTerm}

              sortOption={sortOption}

              setSortOption={setSortOption}

            />



            {/* Toggle Xem tất cả / 7 ngày gần nhất - Professional Segmented Control */}

            {!loading && rentals.length > 0 && (

              <div className="flex items-center justify-between mb-5 px-1">

                <span className="text-sm font-medium text-gray-600">

                  {filteredAndSortedRentals.length} đơn hàng

                </span>

                <div className="flex items-center bg-gray-100 rounded-xl p-1">

                  <button

                    onClick={() => {

                      setShowAllRentals(false);

                      setCurrentPage(1);

                    }}

                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${

                      !showAllRentals

                        ? "bg-white text-gray-900 shadow-sm"

                        : "text-gray-500 hover:text-gray-700"

                    }`}

                  >

                    7 ngày qua

                  </button>

                  <button

                    onClick={() => {

                      setShowAllRentals(true);

                      setCurrentPage(1);

                    }}

                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${

                      showAllRentals

                        ? "bg-white text-gray-900 shadow-sm"

                        : "text-gray-500 hover:text-gray-700"

                    }`}

                  >

                    Tất cả

                  </button>

                </div>

              </div>

            )}



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

                    <p className="text-gray-500 mt-2">

                      {!showAllRentals

                        ? "Bạn không có đơn thuê nào trong 7 ngày qua"

                        : "Bạn chưa có giao dịch nào trong mục này"}

                    </p>

                    {!showAllRentals && rentals.length > 0 && (

                      <button

                        onClick={() => setShowAllRentals(true)}

                        className="mt-4 px-6 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl font-bold text-sm"

                      >

                        Xem tất cả đơn thuê

                      </button>

                    )}

                    <button

                      onClick={() => navigate("/devices")}

                      className="mt-8 px-10 py-4 bg-gray-900 hover:bg-black text-white rounded-2xl font-bold text-sm block mx-auto"

                    >

                      Khám phá thiết bị

                    </button>

                  </div>

                )}

              </div>

            )}

          </main>



          {/* RIGHT SIDEBAR - Extend Requests */}

          <aside className="lg:col-span-3">

            <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden lg:sticky lg:top-24 transition-all duration-300 ease-in-out">

              {/* Collapsed Header */}

              <button

                onClick={() => setIsExtendExpanded(!isExtendExpanded)}

                className="w-full p-4 flex items-center justify-between hover:bg-indigo-50/50 transition-colors"

              >

                <div className="flex items-center gap-3">

                  <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">

                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />

                    </svg>

                  </div>

                  <div className="text-left">

                    <div className="text-xs font-black text-gray-900">Gia hạn</div>

                    <div className="text-[10px] text-gray-500">Extend requests</div>

                  </div>

                </div>

                <div className="flex items-center gap-2">

                  {filteredExtendRequests.length > 0 && (

                    <span className="px-2 py-1 rounded-lg bg-indigo-100 text-indigo-700 text-[10px] font-black">

                      {filteredExtendRequests.length}

                    </span>

                  )}

                  <svg

                    className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isExtendExpanded ? 'rotate-180' : ''}`}

                    fill="none"

                    stroke="currentColor"

                    viewBox="0 0 24 24"

                  >

                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />

                  </svg>

                </div>

              </button>



              {/* Expanded Content with Animation */}

              <div

                className={`overflow-hidden transition-all duration-300 ease-in-out ${

                  isExtendExpanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'

                }`}

              >

                <div className="px-4 pb-4 border-t border-gray-100">

                  {/* Tabs for Extend */}

                  <div className="flex gap-1 mt-4 mb-4 bg-indigo-100 p-1 rounded-xl">

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
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-dashed border-gray-200">
                        <Clock size={24} className="text-gray-300" />
                      </div>
                      <p className="text-sm font-bold text-gray-900">
                        {extendTab === "processing" ? "Không có yêu cầu đang xử lý" : "Không có yêu cầu đã xử lý"}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">
                        Danh sách của bạn đang trống
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        {currentExtendRequests.map((r) => (
                          <div
                            key={r._id || `${r.rentalId}-${Math.random()}`}
                            className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 group"
                          >
                            {/* Header with Order Code and Status */}
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-1 bg-gray-900 text-white rounded-lg text-[10px] font-black tracking-tight">
                                  {r.rentalCode ? `BK${String(r.rentalCode).padStart(4, "0")}` : "N/A"}
                                </span>
                              </div>
                              <div className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 ${
                                r.status === "APPROVED" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                                r.status === "REJECTED" ? "bg-rose-50 text-rose-700 border border-rose-100" :
                                "bg-amber-50 text-amber-700 border border-amber-100"
                              }`}>
                                <div className={`w-1 h-1 rounded-full ${
                                  r.status === "APPROVED" ? "bg-emerald-500" :
                                  r.status === "REJECTED" ? "bg-rose-500" :
                                   "bg-amber-500"
                                }`} />
                                {r.status === "APPROVED" ? "Đã duyệt" :
                                 r.status === "REJECTED" ? "Từ chối" : "Chờ duyệt"}
                              </div>
                            </div>

                            {/* Device Info */}
                            <div className="mb-4 space-y-3">
                              {r.devices && r.devices.length > 0 ? (
                                <>
                                  {/* Thumbnails Row */}
                                  <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                                    {r.devices.map((device, dIdx) => (
                                      <div key={dIdx} className="relative flex-shrink-0 group/img">
                                        <img
                                          src={device.image || "https://placehold.co/40x40?text=Gear"}
                                          alt={device.name}
                                          className="w-10 h-10 rounded-lg object-cover border border-white shadow-sm"
                                          onError={(e) => { e.target.src = "https://placehold.co/40x40?text=Wait"; }}
                                        />
                                        {device.quantity > 1 && (
                                          <div className="absolute -bottom-1 -right-1 h-4 px-1 bg-white rounded-full flex items-center justify-center shadow-sm text-[8px] font-black text-gray-900 border border-gray-100 min-w-[1rem]">
                                            x{device.quantity}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                  {/* Device Name(s) */}
                                  <div className="bg-gray-50/50 rounded-xl p-2 border border-gray-100/50">
                                    <p className="text-[11px] font-bold text-gray-900 line-clamp-2 leading-relaxed">
                                      {r.devices[0].name}
                                      {r.devices.length > 1 && (
                                        <span className="text-gray-400 font-medium ml-1">
                                          & {r.devices.length - 1} khác
                                        </span>
                                      )}
                                    </p>
                                  </div>
                                </>
                              ) : (
                                <div className="flex items-center gap-2 text-gray-400 p-2 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                                  <AlertCircle size={14} />
                                  <span className="text-[10px] font-medium">Bản nháp thiết bị</span>
                                </div>
                              )}
                            </div>

                            {/* Extension Details */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="text-gray-500 font-medium">Ngày kết thúc mới</span>
                                <span className="text-gray-900 font-bold">
                                  {r.requestedEndDate
                                    ? new Date(r.requestedEndDate).toLocaleDateString("vi-VN")
                                    : "-"}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="text-gray-500 font-medium">Phí gia hạn</span>
                                <span className="text-indigo-600 font-black">
                                  {(r.proposedExtraAmount || 0).toLocaleString()} ₫
                                </span>
                              </div>
                            </div>

                            {r.note && (
                              <div className="mt-3 pt-3 border-t border-gray-50">
                                <p className="text-[10px] text-gray-500 italic line-clamp-2">
                                  "{r.note}"
                                </p>
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

              </div>

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



