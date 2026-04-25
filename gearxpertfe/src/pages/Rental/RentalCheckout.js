import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  CreditCard,
  Wallet,
  Ticket,
  MapPin,
  Home,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Phone,
  PackageCheck,
  Store,
  User,
  FileText,
  Truck,
  CheckCircle2,
  AlertCircle,
  FileSignature,
  ArrowRight,
  ShoppingBag,
  Receipt,
  MapPinHouse,
  Calendar,
  Trash2,
  Clock,
  Map,
  CreditCard as CreditCardIcon,
  Building,
  UserCheck,
  FileCheck,
  Check,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import SignatureCanvas from "react-signature-canvas";

import { getCart, removeCartItem } from "../../service/ApiService/CartApi";
import {
  validateVoucher,
  getAllVouchers,
  getBestVoucherForCart,
  getAvailableVouchersForCart,
  autoApplyBestVoucher,
} from "../../service/ApiService/VoucherApi.js";
import { checkout, previewContractWithData } from "../../service/ApiService/RentalApi";
import { getMyWallet } from "../../service/ApiService/WalletApi";
import { getCurrentUser } from "../../service/ApiService/AuthApi";
import { doLogin } from "../../redux/action/userAction";
import axios from "../../service/AxiosCustomize";

// --- MAP IMPORTS ---
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// --- CONSTANTS ---
const FPT_COORDS = { lat: 16.0445, lng: 108.2475 };
const MIN_DELIVERY_FEE = 10000;
const FEE_PER_KM = 5000;

// Hàm tính khoảng cách đường chim bay
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function CheckoutPage() {
  const { account } = useSelector((state) => state.user);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const CART_TYPE = location.state?.cartType || "NORMAL";

  // Current step: 1=Cart, 2=Info, 3=Payment, 4=Complete
  const [currentStep, setCurrentStep] = useState(1);
  const [orderResult, setOrderResult] = useState(null);

  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [address, setAddress] = useState({
    receiverName: "",
    street: "",
    district: "",
    city: "",
    fullAddress: "",
  });
  const [phoneNumber, setPhoneNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedPayment, setSelectedPayment] = useState("BANK");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [voucherCode, setVoucherCode] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [isApplyingVoucher, setIsApplyingVoucher] = useState(false);
  const [availableVouchers, setAvailableVouchers] = useState([]);
  const [isLoadingVouchers, setIsLoadingVouchers] = useState(false);
  const [showVoucherDropdown, setShowVoucherDropdown] = useState(false);
  const voucherInputRef = useRef(null);
  const [suggestedVoucher, setSuggestedVoucher] = useState(null);
  const [isLoadingBestVoucher, setIsLoadingBestVoucher] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [wallet, setWallet] = useState(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState(null);
  const sigCanvas = useRef({});
  const [mapPosition, setMapPosition] = useState([FPT_COORDS.lat, FPT_COORDS.lng]);
  const [distance, setDistance] = useState(0);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [useSavedSignature, setUseSavedSignature] = useState(false);

  // Initialize signature from account
  useEffect(() => {
    if (account?.signatureUrl) {
      setSignatureDataUrl(account.signatureUrl);
      setUseSavedSignature(true);
    }
  }, [account?.signatureUrl]);

  // Refresh user data to get latest signature
  useEffect(() => {
    const refreshData = async () => {
      try {
        const res = await getCurrentUser();
        if (res.errorCode === 0) {
          dispatch(doLogin({ 
            data: { 
              ...res.data, 
              access_token: account.access_token, 
              refresh_token: account.refresh_token 
            } 
          }));
        }
      } catch (err) {
        console.error("Error refreshing user data:", err);
      }
    };
    
    if (currentStep === 3) {
      refreshData();
    }
  }, [currentStep, dispatch, account?.access_token, account?.refresh_token]);

  // Fetch cart data and auto-apply best voucher
  useEffect(() => {
    const fetchCart = async () => {
      try {
        const res = await getCart(CART_TYPE);
        setCart(res.data?.items || res.items || []);
      } catch (err) {
        console.error("Failed to fetch cart:", err);
        toast.error("Không thể tải giỏ hàng");
      } finally {
        setLoading(false);
      }
    };

    fetchCart();
  }, [CART_TYPE]);

  // Auto-apply best voucher when cart loads
  useEffect(() => {
    const autoApplyVoucher = async () => {
      if (!cart || cart.length === 0) return;
      try {
        const res = await autoApplyBestVoucher(CART_TYPE);
        if (res?.voucher) {
          setAppliedVoucher({
            code: res.voucher.code,
            discount: res.voucher.discount,
          });
          toast.success(`Đã tự động áp dụng voucher ${res.voucher.code}: Giảm ${res.voucher.discount.toLocaleString()}đ`);
        }
      } catch (err) {
        console.log("No suitable voucher found or error:", err);
      }
    };

    autoApplyVoucher();
  }, [cart]);

  // Fetch available vouchers for cart when focusing input
  const fetchAvailableVouchers = async () => {
    setIsLoadingVouchers(true);
    try {
      const res = await getAvailableVouchersForCart(CART_TYPE);
      setAvailableVouchers(res?.vouchers || []);
    } catch (err) {
      console.error("Failed to fetch available vouchers:", err);
    } finally {
      setIsLoadingVouchers(false);
    }
  };

  const handleVoucherInputFocus = () => {
    setShowVoucherDropdown(true);
    if (availableVouchers.length === 0) {
      fetchAvailableVouchers();
    }
  };

  const handleSelectVoucher = (voucher) => {
    setVoucherCode(voucher.code);
    setAppliedVoucher({
      code: voucher.code,
      discount: voucher.potentialDiscount,
    });
    setShowVoucherDropdown(false);
    toast.success(`Đã chọn voucher ${voucher.code}: Giảm ${(voucher.potentialDiscount || 0).toLocaleString()}đ`);
  };

  // Fetch wallet
  useEffect(() => {
    const fetchWallet = async () => {
      try {
        const res = await getMyWallet();
        setWallet(res);
      } catch (err) {
        console.error("Failed to fetch wallet:", err);
      }
    };

    if (account?.id) {
      fetchWallet();
    }
  }, [account?.id]);

  // Fetch vouchers
  useEffect(() => {
    const fetchVouchers = async () => {
      setIsLoadingVouchers(true);
      try {
        const res = await getAvailableVouchersForCart(CART_TYPE);
        setAvailableVouchers(res?.vouchers || []);
      } catch (err) {
        console.error("Failed to fetch vouchers:", err);
      } finally {
        setIsLoadingVouchers(false);
      }
    };

    fetchVouchers();
  }, []);

  // Group cart items by supplier
  const groupedBySupplier = useMemo(() => {
    const groups = {};
    cart.forEach((item) => {
      const supplierId = item.deviceId?.supplierId?._id || "unknown";
      const supplierName = item.deviceId?.supplierId?.businessName || item.deviceId?.supplierId?.fullName || "Unknown Supplier";

      if (!groups[supplierId]) {
        groups[supplierId] = {
          supplierId,
          supplierName,
          items: [],
          subtotal: 0,
        };
      }

      groups[supplierId].items.push(item);
      // Use discountPrice if available and not expired, otherwise use regular rentPrice
      const now = new Date();
      const discountExpiry = item.deviceId?.discountExpiry ? new Date(item.deviceId.discountExpiry) : null;
      const isDiscountValid = item.deviceId?.discountPrice && discountExpiry && discountExpiry > now;
      const effectivePrice = isDiscountValid ? item.deviceId.discountPrice : (item.deviceId?.rentPrice?.perDay || 0);
      
      groups[supplierId].subtotal +=
        effectivePrice *
        item.totalDays *
        item.quantity;
    });

    return Object.values(groups);
  }, [cart]);

  // Calculate totals
  const { subtotal, totalDeposit, total } = useMemo(() => {
    const subtotal = groupedBySupplier.reduce((sum, group) => sum + group.subtotal, 0);
    const totalDeposit = cart.reduce((sum, item) => {
      return sum + ((item.deviceId?.depositAmount || item.deviceId?.deposit || 0) * item.quantity);
    }, 0);
    const total = subtotal + totalDeposit + deliveryFee - (appliedVoucher?.discount || 0);

    return { subtotal, totalDeposit, total };
  }, [groupedBySupplier, cart, deliveryFee, appliedVoucher]);

  // Apply voucher
  const handleApplyVoucher = useCallback(async (code = voucherCode) => {
    const trimmedCode = code?.trim();
    if (!trimmedCode) return;

    setIsApplyingVoucher(true);
    try {
      const res = await validateVoucher({ code: trimmedCode, cartType: CART_TYPE });
      setAppliedVoucher({
        code: trimmedCode,
        discount: res.discount,
      });
      toast.success(`Áp dụng voucher thành công! Giảm ${res.discount.toLocaleString()}đ`);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Voucher không hợp lệ");
    } finally {
      setIsApplyingVoucher(false);
    }
  }, [voucherCode, CART_TYPE]);

  // Apply suggested voucher
  const handleApplySuggestedVoucher = useCallback(() => {
    if (!suggestedVoucher) return;
    setVoucherCode(suggestedVoucher.code);
    handleApplyVoucher(suggestedVoucher.code);
  }, [suggestedVoucher, handleApplyVoucher]);

  // Remove item
  const handleRemoveItem = useCallback(async (itemId) => {
    try {
      await removeCartItem(itemId);
      setCart((prev) => prev.filter((item) => item._id !== itemId));
      toast.success("Đã xóa sản phẩm");
    } catch (err) {
      toast.error("Không thể xóa sản phẩm");
    }
  }, []);

  // Fill default user info
  const fillDefaultUserInfo = useCallback(() => {
    if (!account?.username) return;

    setAddress({
      receiverName: account.fullName || account.username,
      street: account.address?.street || "",
      district: account.address?.district || "",
      city: account.address?.city || "Đà Nẵng",
      fullAddress: account.address?.fullAddress || "",
    });
    setPhoneNumber(account.phone || "");
  }, [account]);

  // Validate step 2
  const validateStep2 = () => {
    if (!address.receiverName) {
      toast.error("Vui lòng nhập tên người nhận");
      return false;
    }
    if (!phoneNumber) {
      toast.error("Vui lòng nhập số điện thoại");
      return false;
    }
    if (!address.street || !address.district) {
      toast.error("Vui lòng nhập đầy đủ địa chỉ");
      return false;
    }
    // Check if shipping fee has been calculated (unless pickup at warehouse)
    if (address.street !== "Kho GearXpert") {
      if (distance === 0) {
        toast.error("Vui lòng kiểm tra địa chỉ và tính phí vận chuyển trước khi tiếp tục");
        return false;
      }
      if (deliveryFee === 0) {
        toast.error("Phí vận chuyển chưa được tính. Vui lòng kiểm tra lại địa chỉ.");
        return false;
      }
    }
    return true;
  };

  // Validate step 3
  const validateStep3 = () => {
    if (!agreeTerms) {
      toast.error("Vui lòng đồng ý với điều khoản");
      return false;
    }
    if (!signatureDataUrl) {
      toast.error("Vui lòng ký hợp đồng điện tử");
      return false;
    }
    return true;
  };

  // Handle next step
  const handleNextStep = () => {
    if (currentStep === 2 && !validateStep2()) return;
    if (currentStep === 3 && !validateStep3()) return;
    setCurrentStep((prev) => Math.min(prev + 1, 4));
  };

  // Handle previous step
  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // Preview contract
  const handlePreviewContract = async () => {
    if (!address.fullAddress || !phoneNumber || !address.receiverName) {
      return toast.warning("Vui lòng điền đầy đủ thông tin nhận hàng");
    }

    setIsPreviewLoading(true);
    try {
      const rentalData = {
        customerId: account.id,
        items: cart.map((item) => {
          // Get serial numbers from device items (for preview, we'll get first available)
          const deviceSerials = item.deviceId.deviceItems?.length > 0
            ? item.deviceId.deviceItems
              .filter(di => di.status === 'AVAILABLE')
              .slice(0, item.quantity)
              .map(di => di.serialNumber || di.internalCode || `SN-${di._id?.toString().slice(-6)}`)
              .join(', ')
            : `Chờ cấp serial (${item.quantity} cái)`;

          return {
            deviceId: item.deviceId._id,
            deviceName: item.deviceId.name,
            deviceSerial: deviceSerials,
            deviceCondition: item.deviceId.condition || "Good",
            quantity: item.quantity,
            rentPrice: (() => {
              const now = new Date();
              const discountExpiry = item.deviceId?.discountExpiry ? new Date(item.deviceId.discountExpiry) : null;
              const isDiscountValid = item.deviceId?.discountPrice && discountExpiry && discountExpiry > now;
              return isDiscountValid ? item.deviceId.discountPrice : (item.rentPrice?.perDay || item.deviceId?.rentPrice?.perDay || 0);
            })(),
            totalDays: item.totalDays,
            rentalStartDate: item.rentalStartDate,
            rentalEndDate: item.rentalEndDate,
          };
        }),
        deliveryAddress: {
          ...address,
          fullAddress: address.fullAddress || `${address.street}, ${address.district}, ${address.city}`
        },
        phoneNumber,
        customerName: account.fullName || account.username,
        customerEmail: account.email || "",
        customerCCCD: account.cccd || "",
        subtotal,
        totalDeposit,
        shippingFee: deliveryFee,
        total,
        customerSignature: signatureDataUrl,
      };

      const response = await axios.post("/api/contracts/preview-data", rentalData);
      if (response?.previewUrl) {
        window.open(response.previewUrl, "_blank");
      } else {
        toast.error("Không có URL preview");
      }
    } catch (err) {
      console.error("[FRONTEND DEBUG] Preview error:", err);
      toast.error(err.response?.message || "Không thể tạo hợp đồng xem trước");
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // Checkout
  const handleCheckout = async () => {
    // Validate cart items have dates
    const invalidItems = cart.filter(item => !item.rentalStartDate || !item.rentalEndDate);
    if (invalidItems.length > 0) {
      toast.error("Một số sản phẩm thiếu ngày thuê.");
      console.error("Items missing dates:", invalidItems);
      return;
    }

    setIsProcessing(true);
    try {
      const rentalData = {
        customerId: account.id,
        cartType: CART_TYPE,
        items: cart.map((item) => ({
          deviceId: item.deviceId._id,
          deviceName: item.deviceId.name,
          deviceSerial: item.deviceId.serialNumber || "N/A",
          deviceCondition: item.deviceId.condition || "Good",
          quantity: item.quantity,
          rentPrice: (() => {
            const now = new Date();
            const discountExpiry = item.deviceId?.discountExpiry ? new Date(item.deviceId.discountExpiry) : null;
            const isDiscountValid = item.deviceId?.discountPrice && discountExpiry && discountExpiry > now;
            return isDiscountValid ? item.deviceId.discountPrice : (item.rentPrice?.perDay || item.deviceId?.rentPrice?.perDay || 0);
          })(),
          totalDays: item.totalDays,
          rentalStartDate: new Date(item.rentalStartDate).toISOString(),
          rentalEndDate: new Date(item.rentalEndDate).toISOString(),
        })),
        deliveryAddress: {
          ...address,
          fullAddress: address.fullAddress || `${address.street}, ${address.district}, ${address.city}`
        },
        phoneNumber,
        customerSignature: signatureDataUrl,
        subtotal,
        totalDeposit,
        shippingFee: deliveryFee,
        total,
        customerName: account.fullName || account.username,
        customerEmail: account.email || "",
        customerCCCD: account.cccd || "",
        notes,
        voucherCode: appliedVoucher?.code,
        paymentMethod: selectedPayment,
      };
      const res = await checkout(rentalData);

      console.log('Checkout response:', res);
      console.log('Rental IDs:', res.rentalIds);
      console.log('First rental ID:', res.rentalIds?.[0]);
      setOrderResult(res);
      setCurrentStep(4);

      if (res.paymentLink?.checkoutUrl) {
        // Bank payment - redirect to payment link
        window.location.href = res.paymentLink.checkoutUrl;
      } else {
        // Wallet payment - show success
        toast.success("Dat thuê thành công!");
      }
    } catch (err) {
      toast.error(err.response?.message || "Thanh toán that bai");
    } finally {
      setIsProcessing(false);
    }
  };

  // Calculate driving distance using OSRM routing API
  const calculateDrivingDistance = async (lat1, lon1, lat2, lon2) => {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false&alternatives=false`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.code === "Ok" && data.routes && data.routes.length > 0) {
        // Distance in meters, convert to km
        return data.routes[0].distance / 1000;
      }
    } catch (err) {
      console.error("Routing error:", err);
    }
    // Fallback to straight-line distance if routing fails
    return calculateDistance(lat1, lon1, lat2, lon2);
  };

  // Calculate delivery fee for a given address using geocoding and driving distance
  const calculateDeliveryFeeForAddress = async (street, district, city = "Đà Nẵng") => {
    try {
      const query = encodeURIComponent(`${street}, ${district}, ${city}`);
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&accept-language=vi&limit=1`);
      const data = await res.json();

      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        const destLat = parseFloat(lat);
        const destLon = parseFloat(lon);

        // Use driving distance from OSRM
        const dist = await calculateDrivingDistance(FPT_COORDS.lat, FPT_COORDS.lng, destLat, destLon);
        const fee = Math.max(MIN_DELIVERY_FEE, Math.round(dist * FEE_PER_KM));

        setMapPosition([destLat, destLon]);
        setDistance(dist);
        setDeliveryFee(fee);

        return { distance: dist, fee, lat: destLat, lng: destLon };
      }
    } catch (err) {
      console.error("Geocoding error:", err);
    }
    return null;
  };

  // Map events handler
  const MapEventsHandler = () => {
    useMapEvents({
      click: async (e) => {
        const { lat, lng } = e.latlng;
        setMapPosition([lat, lng]);

        // Use driving distance instead of straight-line
        const dist = await calculateDrivingDistance(FPT_COORDS.lat, FPT_COORDS.lng, lat, lng);
        const fee = Math.max(MIN_DELIVERY_FEE, Math.round(dist * FEE_PER_KM));

        setDistance(dist);
        setDeliveryFee(fee);

        fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=vi`)
          .then(res => res.json())
          .then(data => {
            if (data?.address) {
              const addr = data.address;
              setAddress(prev => ({
                ...prev,
                city: "Đà Nẵng",
                district: addr.suburb || addr.district || "",
                street: addr.road || addr.house_number || "",
                fullAddress: data.display_name,
              }));
              toast.success(`Đã chọn vị trí: ${dist.toFixed(1)}km - Phí ship: ${fee.toLocaleString()}đ`);
            }
          })
          .catch(err => console.error("Geocoding error:", err));
      },
    });
  };

  // Step configuration
  const steps = [
    { id: 1, label: "Giỏ hàng", icon: ShoppingBag },
    { id: 2, label: "Thông tin", icon: MapPinHouse },
    { id: 3, label: "Thanh toán", icon: CreditCard },
    { id: 4, label: "Hoàn tất", icon: CheckCircle2 },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 font-medium">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => {
                if (currentStep > 1) {
                  handlePrevStep();
                } else {
                  navigate("/user/cart");
                }
              }}
              className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 font-medium transition-colors"
            >
              <ChevronLeft size={20} />
              {currentStep > 1 ? "Quay lại" : "Giỏ hàng"}
            </button>

            <h1 className="text-xl font-bold text-gray-900">
              {currentStep === 1 && "Xác nhận giỏ hàng"}
              {currentStep === 2 && "Thông tin giao hàng"}
              {currentStep === 3 && "Thanh toán"}
              {currentStep === 4 && "Đặt hàng thành công"}
            </h1>

            <div className="w-20"></div>
          </div>

          {/* Step Progress */}
          <div className="pb-4">
            <div className="flex items-center justify-center max-w-2xl mx-auto">
              {steps.map((step, idx) => {
                const Icon = step.icon;
                const isActive = step.id === currentStep;
                const isCompleted = step.id < currentStep;

                return (
                  <React.Fragment key={step.id}>
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isCompleted
                        ? "bg-emerald-500 text-white"
                        : isActive
                          ? "bg-indigo-600 text-white ring-4 ring-indigo-100"
                          : "bg-gray-100 text-gray-400"
                        }`}>
                        <Icon size={18} />
                      </div>
                      <span className={`text-xs mt-2 font-medium ${isActive ? "text-indigo-600" : isCompleted ? "text-emerald-600" : "text-gray-400"
                        }`}>
                        {step.label}
                      </span>
                    </div>
                    {idx < 3 && (
                      <div className={`w-16 h-0.5 mx-3 ${isCompleted ? "bg-emerald-500" : "bg-gray-200"
                        }`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ========== STEP 1: CART REVIEW ========== */}
        {currentStep === 1 && (
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Cart Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Cart Header */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                          <ShoppingBag size={24} className="text-white" />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-white">Giỏ hàng của bạn</h2>
                          <p className="text-indigo-100 text-sm">{cart.length} sản phẩm</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white/70 text-sm">Tạm tính</p>
                        <p className="text-2xl font-bold text-white">{subtotal.toLocaleString()}đ</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    {groupedBySupplier.map((group, groupIdx) => (
                      <div key={groupIdx} className={groupIdx > 0 ? "pt-6 border-t border-gray-200" : ""}>
                        {/* Supplier Header */}
                        <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-indigo-50 rounded-xl border border-indigo-100">
                          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
                            <Store size={20} className="text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-gray-900">{group.supplierName}</h3>
                            <p className="text-sm text-gray-600">{group.items.length} sản phẩm</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-500">Thành tiền</p>
                            <p className="font-bold text-indigo-600">{group.subtotal.toLocaleString()}đ</p>
                          </div>
                        </div>

                        {/* Items */}
                        <div className="space-y-4 mt-4">
                          {group.items.map((item) => (
                            <div key={item._id} className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-indigo-300 transition-colors">
                              <div className="flex gap-4">
                                <div className="relative">
                                  <img
                                    src={item.deviceId?.images?.[0]}
                                    alt={item.deviceId?.name}
                                    className="w-24 h-24 rounded-xl object-cover border border-gray-200"
                                  />
                                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                    {item.quantity}
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-bold text-gray-900 text-lg">{item.deviceId?.name}</h4>
                                  <div className="flex items-center gap-4 mt-2">
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                      {(() => {
                                        const now = new Date();
                                        const discountExpiry = item.deviceId?.discountExpiry ? new Date(item.deviceId.discountExpiry) : null;
                                        const isDiscountValid = item.deviceId?.discountPrice && discountExpiry && discountExpiry > now;
                                        const effectivePrice = isDiscountValid ? item.deviceId.discountPrice : item.deviceId?.rentPrice?.perDay;
                                        return effectivePrice?.toLocaleString() || 0;
                                      })()}đ/ngày
                                    </span>
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                      {item.totalDays} ngày
                                    </span>
                                  </div>
                                  <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
                                    <Calendar size={16} />
                                    <span>{new Date(item.rentalStartDate).toLocaleDateString("vi-VN")} - {new Date(item.rentalEndDate).toLocaleDateString("vi-VN")}</span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-2xl font-bold text-indigo-600">
                                    {(() => {
                                      const now = new Date();
                                      const discountExpiry = item.deviceId?.discountExpiry ? new Date(item.deviceId.discountExpiry) : null;
                                      const isDiscountValid = item.deviceId?.discountPrice && discountExpiry && discountExpiry > now;
                                      const effectivePrice = isDiscountValid ? item.deviceId.discountPrice : item.deviceId?.rentPrice?.perDay;
                                      return ((effectivePrice || 0) * item.totalDays * item.quantity).toLocaleString();
                                    })()}đ
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Order Summary Sidebar */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 sticky top-24">
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <Receipt size={20} className="text-indigo-600" />
                      Tóm tắt đơn hàng
                    </h3>
                  </div>

                  <div className="p-6 space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Tạm tính</span>
                        <span className="font-semibold text-gray-900">{subtotal.toLocaleString()}đ</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Tiền cọc</span>
                        <span className="font-semibold text-gray-900">{totalDeposit.toLocaleString()}đ</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Phí vận chuyển</span>
                        <span className="font-semibold text-emerald-600">Tính ở bước sau</span>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold text-gray-900">Tổng dự kiến</span>
                        <span className="text-2xl font-bold text-indigo-600">{(subtotal + totalDeposit).toLocaleString()}đ</span>
                      </div>
                    </div>

                    <div className="bg-indigo-50 rounded-xl p-4 mt-4">
                      <div className="flex items-center gap-3">
                        <ShieldCheck size={20} className="text-indigo-600" />
                        <div>
                          <p className="font-medium text-indigo-900">Bảo mật thanh toán</p>
                          <p className="text-sm text-indigo-700">Thông tin của bạn được bảo vệ</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 pt-0">
                    <button
                      onClick={handleNextStep}
                      disabled={cart.length === 0}
                      className="w-full py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl font-bold hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg"
                    >
                      Tiếp tục đến thông tin giao hàng
                      <ArrowRight size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========== STEP 2: INFORMATION ========== */}
        {currentStep === 2 && (
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Form Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Delivery Options */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                        <Truck size={24} className="text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">Thông tin giao hàng</h2>
                        <p className="text-emerald-100 text-sm">Chọn phương thức nhận hàng</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* Quick Selection */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                        <MapPin size={16} className="text-indigo-600" />
                        Chọn nơi nhận hàng
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                          onClick={() => {
                            setAddress({
                              receiverName: address.receiverName || account?.fullName || "",
                              street: "Kho GearXpert",
                              district: "Ngũ Hành Sơn",
                              city: "Đà Nẵng",
                              fullAddress: "Kho GearXpert - Trường Đại học FPT Đà Nẵng",
                            });
                            setDistance(0);
                            setDeliveryFee(0);
                            toast.success("Nhận tại kho - Miễn phí!");
                          }}
                          className={`p-6 rounded-2xl border-2 font-medium transition-all ${address.street === "Kho GearXpert"
                            ? "border-emerald-600 bg-emerald-50 text-emerald-700 shadow-lg"
                            : "border-gray-200 hover:border-emerald-300 bg-white text-gray-700"
                            }`}
                        >
                          <div className="flex flex-col items-center gap-3">
                            <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${address.street === "Kho GearXpert" ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-500"
                              }`}>
                              <Building size={32} />
                            </div>
                            <div className="text-center">
                              <p className="font-bold text-lg">Nhận tại kho</p>
                              <p className="text-sm opacity-75">Miễn phí vận chuyển</p>
                            </div>
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                              <Check size={12} className="mr-1" />
                              Miễn phí
                            </span>
                          </div>
                        </button>

                        <button
                          onClick={() => setShowMapModal(true)}
                          className={`p-6 rounded-2xl border-2 font-medium transition-all ${address.street && address.street !== "Kho GearXpert"
                            ? "border-indigo-600 bg-indigo-50 text-indigo-700 shadow-lg"
                            : "border-gray-200 hover:border-indigo-300 bg-white text-gray-700"
                            }`}
                        >
                          <div className="flex flex-col items-center gap-3">
                            <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${address.street && address.street !== "Kho GearXpert" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500"
                              }`}>
                              <Map size={32} />
                            </div>
                            <div className="text-center">
                              <p className="font-bold text-lg">Giao đến địa chỉ</p>
                              <p className="text-sm opacity-75">Chọn vị trí trên bản đồ</p>
                            </div>
                            {distance > 0 && (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                                {deliveryFee.toLocaleString()}đ
                              </span>
                            )}
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Distance Info */}
                    {distance > 0 && (
                      <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
                              <MapPin size={20} className="text-white" />
                            </div>
                            <div>
                              <p className="font-medium text-indigo-900">{address.fullAddress}</p>
                              <p className="text-sm text-indigo-600">Khoảng cách: {distance.toFixed(1)} km</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-indigo-600">Phí ship</p>
                            <p className="font-bold text-indigo-700 text-lg">{deliveryFee.toLocaleString()}đ</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Delivery Details Form */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <UserCheck size={20} className="text-indigo-600" />
                        Chi tiết người nhận
                      </h3>
                      <button
                        onClick={async () => {
                          fillDefaultUserInfo();
                          if (account?.address?.street && account?.address?.district) {
                            await calculateDeliveryFeeForAddress(account.address.street, account.address.district, account.address.city || "Đà Nẵng");
                          }
                        }}
                        disabled={!account?.username}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 disabled:opacity-50 transition-colors"
                      >
                        <User size={16} />
                        Dùng thông tin mặc định
                      </button>
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* Saved Address */}
                    {account?.address?.street && (
                      <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200">
                        <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                          <MapPinHouse size={16} className="text-indigo-600" />
                          Địa chỉ đã lưu
                        </label>
                        <button
                          onClick={async () => {
                            setAddress({
                              receiverName: account.fullName || account.username,
                              street: account.address.street,
                              district: account.address.district,
                              city: account.address.city || "Đà Nẵng",
                              fullAddress: account.address.fullAddress || `${account.address.street}, ${account.address.district}, ${account.address.city || "Đà Nẵng"}`,
                            });
                            setPhoneNumber(account.phone || "");
                            const result = await calculateDeliveryFeeForAddress(account.address.street, account.address.district, account.address.city || "Đà Nẵng");
                            if (result) {
                              toast.success(`Đã chọn địa chỉ mặc định: ${result.distance.toFixed(1)}km - Phí ship: ${result.fee.toLocaleString()}đ`);
                            } else {
                              toast.success("Đã chọn địa chỉ mặc định (không tính được phí ship)");
                            }
                          }}
                          className={`w-full p-4 rounded-xl border-2 text-left transition-all ${address.street === account.address.street
                            ? "border-indigo-600 bg-indigo-50"
                            : "border-indigo-200 hover:border-indigo-300 bg-white"
                            }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${address.street === account.address.street ? "bg-indigo-600 text-white" : "bg-indigo-100 text-indigo-600"
                              }`}>
                              <MapPinHouse size={20} />
                            </div>
                            <div className="flex-1">
                              <p className="font-bold text-gray-900">{account.fullName || account.username}</p>
                              <p className="text-sm text-gray-600 mt-1">{account.phone}</p>
                              <p className="text-sm text-gray-600 mt-1">
                                {account.address.street}, {account.address.district}, {account.address.city || "Đà Nẵng"}
                              </p>
                            </div>
                            {address.street === account.address.street && (
                              <CheckCircle2 size={20} className="text-indigo-600" />
                            )}
                          </div>
                        </button>
                        {address.street === account.address.street && (
                          <button
                            onClick={() => {
                              setAddress({
                                receiverName: "",
                                street: "",
                                district: "",
                                city: "Đà Nẵng",
                                fullAddress: "",
                              });
                              setPhoneNumber("");
                              setDistance(0);
                              setDeliveryFee(0);
                              toast.info("Đã hủy chọn địa chỉ mặc định");
                            }}
                            className="mt-3 w-full py-2 text-sm text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                          >
                            <X size={16} />
                            Hủy chọn địa chỉ này
                          </button>
                        )}
                      </div>
                    )}

                    {/* Address Form */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Tỉnh/Thành phố <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50"
                          value={address.city}
                          disabled
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Phường/Xã <span className="text-red-500">*</span>
                          <span className="text-xs font-normal text-gray-500 ml-1">(VD: Phường Hòa Minh)</span>
                        </label>
                        <input
                          type="text"
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          value={address.district}
                          onChange={(e) => {
                            setAddress({ ...address, district: e.target.value });
                            // Reset distance and delivery fee when user changes district
                            if (distance > 0 || deliveryFee > 0) {
                              setDistance(0);
                              setDeliveryFee(0);
                            }
                          }}
                          placeholder="Nhập tên phường/xã, ví dụ: Phường Hòa Minh"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Địa chỉ chi tiết <span className="text-red-500">*</span>
                        <span className="text-xs font-normal text-gray-500 ml-1">(VD: 123 Nguyễn Văn Linh)</span>
                      </label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Số nhà + tên đường, ví dụ: 123 Nguyễn Văn Linh"
                        value={address.street}
                        onChange={(e) => {
                          setAddress({ ...address, street: e.target.value });
                          // Reset distance and delivery fee when user changes street
                          if (distance > 0 || deliveryFee > 0) {
                            setDistance(0);
                            setDeliveryFee(0);
                          }
                        }}
                      />
                      <p className="text-xs text-gray-500 mt-1">Nhập số nhà và tên đường để tính phí ship chính xác</p>
                    </div>

                    {/* Calculate shipping fee button for manual address */}
                    {address.street && address.district && (
                      <div className="flex items-center gap-3 p-4 bg-indigo-50 rounded-xl border border-indigo-200">
                        <div className="flex-1">
                          <p className="text-sm text-gray-600">
                            {distance > 0 ? (
                              <span className="text-indigo-700">
                                Khoảng cách: {distance.toFixed(1)}km - Phí ship: {deliveryFee.toLocaleString()}đ
                              </span>
                            ) : (
                              "Kiểm tra địa chỉ và tính phí vận chuyển"
                            )}
                          </p>
                        </div>
                        <button
                          onClick={async () => {
                            if (!address.street || !address.district) {
                              toast.error("Vui lòng nhập đầy đủ địa chỉ");
                              return;
                            }
                            const result = await calculateDeliveryFeeForAddress(address.street, address.district, address.city || "Đà Nẵng");
                            if (result) {
                              setAddress(prev => ({
                                ...prev,
                                fullAddress: `${address.street}, ${address.district}, ${address.city || "Đà Nẵng"}`
                              }));
                              toast.success(`Địa chỉ hợp lệ: ${result.distance.toFixed(1)}km - Phí ship: ${result.fee.toLocaleString()}đ`);
                            } else {
                              toast.error("Không tìm thấy địa chỉ. Vui lòng kiểm tra lại hoặc chọn trên bản đồ");
                            }
                          }}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
                        >
                          <Map size={16} />
                          {distance > 0 ? "Tính lại" : "Kiểm tra & Tính phí"}
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Người nhận <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="Họ và tên"
                          value={address.receiverName}
                          onChange={(e) => setAddress({ ...address, receiverName: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Số điện thoại <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="tel"
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="0xxx xxx xxx"
                          value={phoneNumber}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, "");
                            if (value.length <= 10) setPhoneNumber(value);
                          }}
                        />
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Ghi chú cho nhà cung cấp
                        <span className="text-gray-400 font-normal"> (tùy chọn)</span>
                      </label>
                      <textarea
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-h-[100px] resize-none"
                        placeholder="VD: Giao hàng vào buổi chiều, gọi trước 30 phút..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Voucher Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <Ticket size={20} className="text-indigo-600" />
                      Mã giảm giá
                    </h3>
                  </div>
                  <div className="p-6">
                    {/* Suggested Best Voucher */}
                    {suggestedVoucher && !appliedVoucher && (
                      <div className="mb-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
                              <Ticket size={20} className="text-white" />
                            </div>
                            <div>
                              <p className="text-sm text-amber-700 font-medium">Voucher phù hợp nhất</p>
                              <p className="font-bold text-amber-800">{suggestedVoucher.code}</p>
                              <p className="text-xs text-amber-600">
                                Giảm {suggestedVoucher.discount.toLocaleString()}đ
                                {suggestedVoucher.type === 'SUPPLIER' && ' - Voucher shop'}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={handleApplySuggestedVoucher}
                            disabled={isApplyingVoucher}
                            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-semibold hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 transition-all text-sm"
                          >
                            {isApplyingVoucher ? "..." : "Dùng ngay"}
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <div className="relative flex-1 z-[60]">
                        <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                          ref={voucherInputRef}
                          type="text"
                          className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="Nhập mã giảm giá hoặc chọn từ danh sách"
                          value={voucherCode}
                          onChange={(e) => setVoucherCode(e.target.value.toUpperCase().trim())}
                          onFocus={handleVoucherInputFocus}
                          onBlur={() => setTimeout(() => setShowVoucherDropdown(false), 200)}
                        />
                        {/* Voucher Dropdown */}
                        {showVoucherDropdown && (
                          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-200 z-[100] max-h-80 overflow-y-auto">
                            <div className="p-3 border-b border-gray-100">
                              <p className="text-sm font-semibold text-gray-700">Voucher khả dụng cho đơn hàng này</p>
                            </div>
                            {isLoadingVouchers ? (
                              <div className="p-4 text-center text-gray-500">
                                <div className="animate-spin inline-block w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full mr-2"></div>
                                Đang tải...
                              </div>
                            ) : availableVouchers.length === 0 ? (
                              <div className="p-4 text-center text-gray-500 text-sm">
                                Không có voucher khả dụng
                              </div>
                            ) : (
                              <div className="p-2">
                                {availableVouchers.map((voucher) => (
                                  <button
                                    key={voucher._id}
                                    type="button"
                                    onClick={() => handleSelectVoucher(voucher)}
                                    className="w-full p-3 mb-2 rounded-lg border border-gray-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                                          <Ticket size={16} className="text-indigo-600" />
                                        </div>
                                        <div>
                                          <p className="font-bold text-gray-900">{voucher.code}</p>
                                          <p className="text-xs text-gray-500">
                                            {voucher.type === "GLOBAL" ? "Tất cả shop" : voucher.shopInfo?.businessName || "Shop voucher"}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <p className="font-bold text-indigo-600">
                                          -{(voucher.potentialDiscount || 0).toLocaleString()}đ
                                        </p>
                                        <p className="text-xs text-gray-500">
                                          {voucher.discountType === "PERCENT" ? `Giảm ${voucher.discountValue}%` : `Giảm ${voucher.discountValue.toLocaleString()}đ`}
                                        </p>
                                      </div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleApplyVoucher()}
                        disabled={isApplyingVoucher || !voucherCode}
                        className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 transition-all shadow-lg"
                      >
                        {isApplyingVoucher ? "..." : "Áp dụng"}
                      </button>
                    </div>
                    {appliedVoucher && (
                      <div className="mt-4 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-emerald-600 rounded-xl flex items-center justify-center">
                              <CheckCircle2 size={16} className="text-white" />
                            </div>
                            <div>
                              <span className="font-bold text-emerald-700">{appliedVoucher.code}</span>
                              <p className="text-xs text-emerald-600">Đã áp dụng</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-emerald-700 text-lg">-{appliedVoucher.discount.toLocaleString()}đ</span>
                            <button
                              type="button"
                              onClick={() => {
                                setAppliedVoucher(null);
                                setVoucherCode("");
                              }}
                              className="p-2 hover:bg-emerald-100 rounded-lg transition-colors text-emerald-600"
                              title="Xóa voucher"
                            >
                              <X size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Order Summary Sidebar */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 sticky top-24">
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <Receipt size={20} className="text-indigo-600" />
                      Tóm tắt đơn hàng
                    </h3>
                  </div>

                  <div className="p-6 space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Tạm tính ({cart.length} sản phẩm)</span>
                        <span className="font-semibold text-gray-900">{subtotal.toLocaleString()}đ</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Tiền cọc</span>
                        <span className="font-semibold text-gray-900">{totalDeposit.toLocaleString()}đ</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Phí vận chuyển</span>
                        <span className={`font-semibold ${deliveryFee === 0 ? "text-emerald-600" : "text-gray-900"}`}>
                          {deliveryFee === 0 ? "Miễn phí" : `${deliveryFee.toLocaleString()}đ`}
                        </span>
                      </div>
                      {appliedVoucher && (
                        <div className="flex justify-between items-center text-emerald-600">
                          <span>Giảm giá ({appliedVoucher.code})</span>
                          <span className="font-semibold">-{appliedVoucher.discount.toLocaleString()}đ</span>
                        </div>
                      )}
                    </div>

                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold text-gray-900">Tổng cộng</span>
                        <span className="text-2xl font-bold text-indigo-600">{total.toLocaleString()}đ</span>
                      </div>
                    </div>

                    <div className="bg-blue-50 rounded-xl p-4 mt-4">
                      <div className="flex items-center gap-3">
                        <Clock size={20} className="text-blue-600" />
                        <div>
                          <p className="font-medium text-blue-900">Thời gian giao hàng dự kiến</p>
                          <p className="text-sm text-blue-700">2-3 ngày làm việc</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 pt-0 space-y-3">
                    <button
                      onClick={handlePrevStep}
                      className="w-full py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:border-gray-400 transition-colors flex items-center justify-center gap-2"
                    >
                      <ChevronLeft size={20} />
                      Quay lại
                    </button>
                    <button
                      onClick={handleNextStep}
                      className="w-full py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl font-bold hover:from-indigo-700 hover:to-indigo-800 transition-all flex items-center justify-center gap-2 shadow-lg"
                    >
                      Tiếp tục thanh toán
                      <ArrowRight size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========== STEP 3: PAYMENT ========== */}
        {currentStep === 3 && (
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Payment Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Payment Methods */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                        <CreditCardIcon size={24} className="text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">Phương thức thanh toán</h2>
                        <p className="text-purple-100 text-sm">Chọn cách thức thanh toán</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    {/* Bank Transfer */}
                    <label
                      className={`block p-6 rounded-2xl border-2 cursor-pointer transition-all ${selectedPayment === "BANK"
                        ? "border-purple-600 bg-purple-50 shadow-lg"
                        : "border-gray-200 hover:border-purple-300 bg-white"
                        }`}
                    >
                      <input
                        type="radio"
                        className="sr-only"
                        checked={selectedPayment === "BANK"}
                        onChange={() => setSelectedPayment("BANK")}
                      />
                      <div className="flex items-center gap-4">
                        <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${selectedPayment === "BANK" ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-500"
                          }`}>
                          <CreditCardIcon size={32} />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-lg text-gray-900">Chuyển khoản ngân hàng</p>
                          <p className="text-sm text-gray-600 mt-1">Thanh toán qua VietQR / PayOS</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              An toàn
                            </span>
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                              Nhanh chóng
                            </span>
                          </div>
                        </div>
                        {selectedPayment === "BANK" && (
                          <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                            <CheckCircle2 size={16} className="text-white" />
                          </div>
                        )}
                      </div>
                    </label>

                    {/* Wallet */}
                    <label
                      className={`block p-6 rounded-2xl border-2 cursor-pointer transition-all ${selectedPayment === "WALLET"
                        ? "border-purple-600 bg-purple-50 shadow-lg"
                        : "border-gray-200 hover:border-purple-300 bg-white"
                        }`}
                    >
                      <input
                        type="radio"
                        className="sr-only"
                        checked={selectedPayment === "WALLET"}
                        onChange={() => setSelectedPayment("WALLET")}
                      />
                      <div className="flex items-center gap-4">
                        <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${selectedPayment === "WALLET" ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-500"
                          }`}>
                          <Wallet size={32} />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-lg text-gray-900">Ví GearXpert</p>
                          <p className={`text-sm mt-1 ${wallet?.balance >= total ? "text-emerald-600" : "text-red-500"
                            }`}>
                            Số dư: {wallet?.balance?.toLocaleString()}đ
                          </p>
                          {wallet?.balance >= total ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 mt-2">
                              Đủ số dư
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 mt-2">
                              Không đủ số dư
                            </span>
                          )}
                        </div>
                        {selectedPayment === "WALLET" && (
                          <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                            <CheckCircle2 size={16} className="text-white" />
                          </div>
                        )}
                      </div>
                    </label>

                    {selectedPayment === "WALLET" && wallet?.balance < total && (
                      <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center">
                            <AlertCircle size={20} className="text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-red-900">Số dư ví không đủ</p>
                            <p className="text-sm text-red-700">Vui lòng nạp tiền hoặc chọn phương thức khác</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Digital Signature */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                        <FileSignature size={28} className="text-white" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-white">Ký hợp đồng điện tử</h2>
                        <p className="text-blue-100 text-sm mt-1">Vui lòng ký tên đầy đủ của bạn vào ô dưới đây</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-8 bg-gray-50 signature-step-content">
                    {account?.signatureUrl ? (
                      <div className="space-y-6">
                        {/* Option 1: Use Saved Signature */}
                        <div
                          onClick={() => {
                            setUseSavedSignature(true);
                            setSignatureDataUrl(account.signatureUrl);
                          }}
                          className={`p-6 bg-white rounded-2xl border-2 transition-all cursor-pointer ${useSavedSignature ? 'border-indigo-600 shadow-lg ring-1 ring-indigo-500/20' : 'border-gray-200 hover:border-indigo-300 bg-gray-50/50'}`}
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center ${useSavedSignature ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-300 bg-white'}`}>
                                {useSavedSignature ? <CheckCircle2 size={16} /> : <div className="w-3 h-3 bg-transparent" />}
                              </div>
                              <span className={`font-bold text-lg ${useSavedSignature ? 'text-gray-900' : 'text-gray-500'}`}>Sử dụng chữ ký từ hồ sơ</span>
                            </div>
                            {useSavedSignature && (
                              <span className="bg-indigo-100 text-indigo-700 text-xs font-black px-3 py-1 rounded-full uppercase tracking-widest">
                                Đã chọn
                              </span>
                            )}
                          </div>

                          <div className={`p-4 rounded-xl border flex justify-center transition-all ${useSavedSignature ? 'bg-indigo-50/50 border-indigo-100' : 'bg-gray-100/50 border-gray-200 grayscale'}`}>
                            <img
                              src={account.signatureUrl}
                              alt="Saved Signature"
                              className="max-h-24 object-contain"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        </div>

                        {/* Option 2: Sign Manually */}
                        <div
                          onClick={() => {
                            if (useSavedSignature) {
                              setUseSavedSignature(false);
                              setSignatureDataUrl(null);
                            }
                          }}
                          className={`p-6 bg-white rounded-2xl border-2 transition-all cursor-pointer ${!useSavedSignature ? 'border-indigo-600 shadow-lg ring-1 ring-indigo-500/20' : 'border-gray-200 hover:border-indigo-300 bg-gray-50/50'}`}
                        >
                          <div className="flex items-center gap-3 mb-4">
                            <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center ${!useSavedSignature ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-300 bg-white'}`}>
                              {!useSavedSignature ? <CheckCircle2 size={16} /> : <div className="w-3 h-3 bg-transparent" />}
                            </div>
                            <span className={`font-bold text-lg ${!useSavedSignature ? 'text-gray-900' : 'text-gray-500'}`}>Ký tên thủ công cho đơn này</span>
                          </div>

                          {!useSavedSignature && (
                            <div className="space-y-4 animate-fade-in mt-4 border-t pt-6">
                              <div className="mb-4">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                  Vẽ chữ ký của bạn <span className="text-red-500">*</span>
                                </label>
                                <div className="border-3 border-dashed border-gray-400 rounded-2xl overflow-hidden bg-white shadow-inner">
                                  <SignatureCanvas
                                    ref={sigCanvas}
                                    penColor="black"
                                    penMinWidth={2}
                                    penMaxWidth={4}
                                    canvasProps={{
                                      width: 500,
                                      height: 150,
                                      className: "w-full h-32 touch-none cursor-crosshair bg-white",
                                      style: { maxWidth: '100%', height: 'auto' }
                                    }}
                                  />
                                </div>
                                <p className="text-xs text-gray-500 mt-2 italic">
                                  * Ký bằng ngón tay hoặc stylus. Hãy ký rõ ràng và đầy đủ.
                                </p>
                              </div>

                              <div className="flex gap-4">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (sigCanvas.current) {
                                      sigCanvas.current.clear();
                                      setSignatureDataUrl(null);
                                      toast.info("Đã xóa chữ ký");
                                    }
                                  }}
                                  className="flex-1 py-4 bg-red-50 text-red-600 rounded-xl font-semibold hover:bg-red-100 transition-all border-2 border-red-200"
                                >
                                  <div className="flex items-center justify-center gap-2">
                                    <Trash2 size={18} />
                                    Xóa
                                  </div>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
                                      let canvasToUse;
                                      try {
                                        canvasToUse = sigCanvas.current.getTrimmedCanvas();
                                      } catch (err) {
                                        canvasToUse = sigCanvas.current.getCanvas();
                                      }
                                      const dataUrl = canvasToUse.toDataURL("image/png");
                                      setSignatureDataUrl(dataUrl);
                                      toast.success("Đã xác nhận chữ ký!");
                                    } else {
                                      toast.warning("Vui lòng ký trước khi xác nhận");
                                    }
                                  }}
                                  className="flex-1 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg"
                                >
                                  <div className="flex items-center justify-center gap-2">
                                    <CheckCircle2 size={18} />
                                    Xác nhận
                                  </div>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="animate-fade-in">
                        <div className="mb-4">
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Chữ ký của bạn <span className="text-red-500">*</span>
                          </label>
                          <div className="border-3 border-dashed border-gray-400 rounded-2xl overflow-hidden bg-white shadow-inner">
                            <SignatureCanvas
                              ref={sigCanvas}
                              penColor="black"
                              penMinWidth={2}
                              penMaxWidth={4}
                              canvasProps={{
                                width: 500,
                                height: 150,
                                className: "w-full h-32 touch-none cursor-crosshair bg-white",
                                style: { maxWidth: '100%', height: 'auto' }
                              }}
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-2 italic">
                            * Ký bằng ngón tay hoặc stylus. Hãy ký rõ ràng và đầy đủ.
                          </p>
                        </div>

                        <div className="flex gap-4">
                          <button
                            type="button"
                            onClick={() => {
                              if (sigCanvas.current) {
                                sigCanvas.current.clear();
                                setSignatureDataUrl(null);
                                toast.info("Đã xóa chữ ký");
                              }
                            }}
                            className="flex-1 py-4 bg-red-50 text-red-600 rounded-xl font-semibold hover:bg-red-100 transition-all border-2 border-red-200"
                          >
                            <div className="flex items-center justify-center gap-2">
                              <Trash2 size={18} />
                              Xóa & Ký lại
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
                                let canvasToUse;
                                try {
                                  canvasToUse = sigCanvas.current.getTrimmedCanvas();
                                } catch (err) {
                                  canvasToUse = sigCanvas.current.getCanvas();
                                }
                                const dataUrl = canvasToUse.toDataURL("image/png");
                                setSignatureDataUrl(dataUrl);
                                toast.success("Đã ghi nhận chữ ký!");
                              } else {
                                toast.warning("Vui lòng ký trước khi lưu");
                              }
                            }}
                            className="flex-1 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg"
                          >
                            <div className="flex items-center justify-center gap-2">
                              <CheckCircle2 size={18} />
                              Lưu chữ ký
                            </div>
                          </button>
                        </div>
                      </div>
                    )}

                    {signatureDataUrl && !useSavedSignature && (
                      <div className="mt-6 p-5 bg-green-50 rounded-2xl border-2 border-green-200">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-600 rounded-2xl flex items-center justify-center">
                            <CheckCircle2 size={20} className="text-white" />
                          </div>
                          <div>
                            <span className="font-bold text-green-700 text-lg">Chữ ký thủ công đã sẵn sàng</span>
                            <p className="text-green-600 text-sm">Bạn có thể tiếp tục tiến hành đặt hàng</p>
                          </div>
                        </div>
                        <div className="mt-3 p-3 bg-white rounded-lg border border-green-200">
                          <img
                            src={signatureDataUrl}
                            alt="Signature"
                            className="h-16 mx-auto border border-gray-300 rounded"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Preview Contract */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                        <FileText size={24} className="text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">Xem trước hợp đồng</h2>
                        <p className="text-blue-100 text-sm">Kiểm tra hợp đồng trước khi thanh toán</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    <button
                      onClick={handlePreviewContract}
                      disabled={isPreviewLoading}
                      className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-bold hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg"
                    >
                      {isPreviewLoading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Tài preview...
                        </>
                      ) : (
                        <>
                          <FileText size={20} />
                          Xem trước hợp đồng
                        </>
                      )}
                    </button>
                  </div>
                </div>

              </div>

              {/* Order Summary Sidebar */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 sticky top-24">
                  {/* Terms - Moved above total payment */}
                  <div className="p-6 border-b border-gray-200 bg-indigo-50/50">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-0.5 w-5 h-5 rounded border-2 border-gray-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                        checked={agreeTerms}
                        onChange={(e) => setAgreeTerms(e.target.checked)}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900 mb-1">Điều khoản và điều kiện</p>
                        <p className="text-xs text-gray-600">
                          Tôi đồng ý với{" "}
                          <button
                            onClick={() => window.open('/terms', '_blank')}
                            className="text-indigo-600 underline hover:text-indigo-800 font-medium"
                          >
                            Điều khoản
                          </button>
                          {" và "}
                          <button
                            onClick={() => window.open('/privacy', '_blank')}
                            className="text-indigo-600 underline hover:text-indigo-800 font-medium"
                          >
                            Chính sách
                          </button>
                        </p>
                      </div>
                    </label>
                  </div>

                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <Receipt size={20} className="text-indigo-600" />
                      Tổng thanh toán
                    </h3>
                  </div>

                  <div className="p-6 space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Tạm tính</span>
                        <span className="font-semibold text-gray-900">{subtotal.toLocaleString()}đ</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Tiền cọc</span>
                        <span className="font-semibold text-gray-900">{totalDeposit.toLocaleString()}đ</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Phí vận chuyển</span>
                        <span className="font-semibold text-gray-900">
                          {deliveryFee === 0 ? "Miễn phí" : `${deliveryFee.toLocaleString()}đ`}
                        </span>
                      </div>
                      {appliedVoucher && (
                        <div className="flex justify-between items-center text-emerald-600">
                          <span>Giảm giá ({appliedVoucher.code})</span>
                          <span className="font-semibold">-{appliedVoucher.discount.toLocaleString()}đ</span>
                        </div>
                      )}
                    </div>

                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold text-gray-900">Tổng cộng</span>
                        <span className="text-2xl font-bold text-indigo-600">{total.toLocaleString()}đ</span>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 mt-4 border border-indigo-200">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedPayment === "BANK" ? "bg-purple-600 text-white" : "bg-emerald-600 text-white"
                          }`}>
                          {selectedPayment === "BANK" ? <CreditCardIcon size={20} /> : <Wallet size={20} />}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {selectedPayment === "BANK" ? "Chuyển khoản ngân hàng" : "Ví GearXpert"}
                          </p>
                          <p className="text-sm text-gray-600">
                            {selectedPayment === "BANK" ? "Thanh toán qua VietQR" : `Số dư: ${wallet?.balance?.toLocaleString()}đ`}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 pt-0 space-y-3">
                    <button
                      onClick={handleCheckout}
                      disabled={isProcessing || (selectedPayment === "WALLET" && wallet?.balance < total) || !agreeTerms || !signatureDataUrl}
                      className="w-full py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl font-bold hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg"
                    >
                      {isProcessing ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Đang xử lý...
                        </>
                      ) : (
                        <>
                          Thanh toán {total.toLocaleString()}đ
                          <ShieldCheck size={20} />
                        </>
                      )}
                    </button>
                    <button
                      onClick={handlePrevStep}
                      className="w-full py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:border-gray-400 transition-colors flex items-center justify-center gap-2"
                    >
                      <ChevronLeft size={20} />
                      Quay lại
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Success Header */}
              <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-8 text-center">
                <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={48} className="text-white" />
                </div>
                <h1 className="text-3xl font-bold text-white mb-2">Đặt hàng thành công!</h1>
                <p className="text-emerald-100 text-lg">Cảm ơn bạn đã sử dụng dịch vụ GearXpert</p>
              </div>

              {/* Order Details */}
              <div className="p-8">
                <div className="max-w-2xl mx-auto space-y-6">
                  {/* Success Message */}
                  <div className="text-center mb-8">
                    <p className="text-gray-600 text-lg">
                      Đơn hàng của bạn đã được xác nhận và sẽ được xử lý trong thời gian sớm nhất.
                    </p>
                  </div>

                  {/* Order Information */}
                  {orderResult && (
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-200">
                      <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <Receipt size={24} className="text-indigo-600" />
                        Thông tin đơn hàng
                      </h3>

                      <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-white rounded-xl">
                          <span className="text-gray-600 font-medium">Mã đơn hàng</span>
                          <span className="font-bold text-indigo-600 text-lg">
                            #{orderResult.rentalIds?.[0]?.toString().slice(-8).toUpperCase() || 'N/A'}
                          </span>
                        </div>

                        <div className="flex justify-between items-center p-3 bg-white rounded-xl">
                          <span className="text-gray-600 font-medium">Phương thức thanh toán</span>
                          <span className="font-medium text-gray-900">
                            {orderResult.paymentMethod === "WALLET" ? "Ví GearXpert" : "Chuyển khoản ngân hàng"}
                          </span>
                        </div>

                        <div className="flex justify-between items-center p-3 bg-white rounded-xl">
                          <span className="text-gray-600 font-medium">Tổng thanh toán</span>
                          <span className="font-bold text-indigo-600 text-lg">
                            {orderResult.totalAmount?.toLocaleString()}đ
                          </span>
                        </div>

                        <div className="flex justify-between items-center p-3 bg-white rounded-xl">
                          <span className="text-gray-600 font-medium">Trạng thái thanh toán</span>
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${orderResult.paymentMethod === "BANK"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-emerald-800"
                            }`}>
                            {orderResult.paymentMethod === "BANK" ? "Chờ thanh toán" : "Đã thanh toán"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Next Steps */}
                  <div className="bg-blue-50 rounded-2xl p-6 border border-blue-200">
                    <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
                      <Clock size={20} className="text-blue-600" />
                      Các bước tiếp theo
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-sm font-bold">1</span>
                        </div>
                        <div>
                          <p className="font-medium text-blue-900">Xác nhận đơn hàng</p>
                          <p className="text-sm text-blue-700">Nhà cung cấp sẽ xác nhận đơn hàng trong vòng 2-4 giờ</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-sm font-bold">2</span>
                        </div>
                        <div>
                          <p className="font-medium text-blue-900">Giao hàng</p>
                          <p className="text-sm text-blue-700">Thiết bị sẽ được giao đến địa chỉ của bạn trong 2-3 ngày làm việc</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-sm font-bold">3</span>
                        </div>
                        <div>
                          <p className="font-medium text-blue-900">Ký hợp đồng</p>
                          <p className="text-sm text-blue-700">Ký hợp đồng khi nhận thiết bị</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contact Support */}
                  <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Phone size={20} className="text-gray-600" />
                      Cần hỗ trợ?
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Nếu có bất kỳ câu hỏi nào về đơn hàng, vui lòng liên hệ với chúng tôi:
                    </p>
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Email:</span> support@gearxpert.com
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Hotline:</span> 1900-xxxx
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
                    <button
                      onClick={() => navigate("/user/myrental")}
                      className="flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl font-bold hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-lg"
                    >
                      <ShoppingBag size={20} />
                      Xem đơn hàng của tôi
                    </button>
                    <button
                      onClick={() => navigate("/")}
                      className="flex items-center justify-center gap-2 px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:border-gray-400 transition-colors"
                    >
                      <PackageCheck size={20} />
                      Tiếp tục mua sắm
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Map Modal */}
      {showMapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Chọn vị trí giao hàng</h3>
              <button onClick={() => setShowMapModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="h-[400px]">
              <MapContainer center={mapPosition} zoom={14} style={{ height: "100%", width: "100%", cursor: "crosshair" }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {/* Always show warehouse marker */}
                <Marker position={[FPT_COORDS.lat, FPT_COORDS.lng]}>
                  <Popup>
                    <div className="font-bold text-blue-600">🏭 Kho GearXpert</div>
                  </Popup>
                </Marker>
                {/* Show selected position marker when user clicks */}
                {mapPosition[0] !== FPT_COORDS.lat || mapPosition[1] !== FPT_COORDS.lng ? (
                  <Marker position={mapPosition}>
                    <Popup>
                      <div className="font-bold text-red-600">📍 Vị trí giao hàng</div>
                    </Popup>
                  </Marker>
                ) : null}
                <MapEventsHandler />
              </MapContainer>
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                <p>Khoảng cách: {distance.toFixed(1)} km</p>
                <p className="text-xs text-gray-500">Click vào bản đồ để chọn vị trí</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowMapModal(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300">
                  Hủy
                </button>
                <button
                  onClick={() => {
                    if (address.fullAddress) {
                      toast.success("Đã chọn vị trí");
                      setShowMapModal(false);
                    } else {
                      toast.warning("Vui lòng chọn vị trí trên bản đồ");
                    }
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                >
                  Xác nhận
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ToastContainer position="top-right" />
    </div>
  );
}
