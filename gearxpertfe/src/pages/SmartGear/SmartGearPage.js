import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { ShoppingCart, Loader2, CheckCircle, Calendar as CalendarIcon, Zap, ChevronRight } from "lucide-react";
import { getSmartGearSuggestion, addComboToCart } from "../../service/ApiService/SmartGearApi";
import Header from "../../components/navigation/Header";

const getTodayLocalDate = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().split("T")[0];
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(value) || 0);

const normalizeCombo = (comboData, fallbackName) => {
  if (!comboData || !Array.isArray(comboData.devices) || comboData.devices.length === 0) {
    return null;
  }

  const devices = comboData.devices
    .map((item) => ({
      ...item,
      quantity: Number(item.quantity) > 0 ? Number(item.quantity) : 1,
      price: Number(item.price) || 0,
    }))
    .filter((item) => item.deviceId);

  if (!devices.length) return null;

  const totalPriceFromItems = devices.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalPricePerDay = Number(comboData.totalPricePerDay) > 0
    ? Number(comboData.totalPricePerDay)
    : totalPriceFromItems;

  return {
    ...comboData,
    comboName: comboData.comboName || fallbackName,
    description: comboData.description || "Combo được AI đề xuất theo nhu cầu của bạn.",
    totalPricePerDay,
    devices,
  };
};

const getRentalDays = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diff = end.getTime() - start.getTime();
  if (Number.isNaN(diff) || diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const COMBO_STYLES = {
  budget: {
    title: "Gói Cơ Bản",
    accent: "from-emerald-500 to-teal-500",
    border: "border-emerald-200",
    chip: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  standard: {
    title: "Gói Tiêu Chuẩn",
    accent: "from-sky-500 to-indigo-500",
    border: "border-sky-200",
    chip: "bg-sky-50 text-sky-700 border-sky-200",
  },
  premium: {
    title: "Gói Cao Cấp",
    accent: "from-amber-500 to-orange-500",
    border: "border-amber-200",
    chip: "bg-amber-50 text-amber-700 border-amber-200",
  },
};

export default function SmartGearPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [combos, setCombos] = useState(null);
  const [resultMessage, setResultMessage] = useState("");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  const today = getTodayLocalDate();
  const rentalDays = useMemo(() => getRentalDays(startDate, endDate), [startDate, endDate]);

  const quickPrompts = [
    "Quay vlog du lịch ban đêm ở Đà Lạt",
    "Chụp lookbook thời trang ngoài trời",
    "Set up quay podcast 2 người trong phòng kín",
    "Quay TVC mỹ phẩm cần màu da đẹp và ánh sáng mềm",
    "Quay phỏng vấn doanh nghiệp với âm thanh sạch",
  ];

  useEffect(() => {
    const queryPrompt = searchParams.get("prompt");
    if (queryPrompt && queryPrompt.trim()) {
      setPrompt(queryPrompt.trim());
    }
  }, [searchParams]);

  const handleSuggest = async () => {
    if (!prompt.trim()) {
      return toast.warning("Vui lòng nhập nhu cầu của bạn!");
    }

    setLoading(true);
    setCombos(null);
    setResultMessage("");

    try {
      const res = await getSmartGearSuggestion({
        prompt,
        rentalStartDate: startDate || undefined,
        rentalEndDate: endDate || undefined,
      });

      const isSuccess = res.success || res.data?.success;
      const responseData = res.data?.data || res.data || res;

      if (isSuccess && responseData) {
        const normalized = {
          budget: normalizeCombo(responseData.budget, "Gói Cơ Bản"),
          standard: normalizeCombo(responseData.standard, "Gói Tiêu Chuẩn"),
          premium: normalizeCombo(responseData.premium, "Gói Cao Cấp"),
        };

        if (normalized.budget || normalized.standard || normalized.premium) {
          setCombos(normalized);
          toast.success("AI đã đề xuất combo phù hợp!");
        } else {
          setResultMessage("AI chưa tìm thấy combo hợp lệ từ dữ liệu hiện tại. Bạn hãy mô tả cụ thể hơn bối cảnh và mục tiêu quay/chụp.");
          toast.info("Chưa có combo phù hợp, hãy thử mô tả chi tiết hơn.");
        }
      } else {
        setResultMessage(res.message || res.data?.message || "Không thể lấy đề xuất từ AI.");
        toast.error(res.message || res.data?.message || "Không thể lấy đề xuất từ AI");
      }
    } catch (error) {
      console.error(error);
      setResultMessage(error?.response?.data?.message || "Lỗi kết nối đến server AI.");
      toast.error(error?.response?.data?.message || "Lỗi kết nối đến server AI.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddComboToCartClick = async (devicesList, comboKey) => {
    if (!Array.isArray(devicesList) || devicesList.length === 0) {
      return toast.warning("Combo này chưa có thiết bị hợp lệ để thêm vào giỏ.");
    }

    if (!startDate || !endDate) {
      return toast.warning("Vui lòng chọn ngày bắt đầu và ngày kết thúc thuê!");
    }

    if (new Date(startDate) >= new Date(endDate)) {
      return toast.warning("Ngày kết thúc phải sau ngày bắt đầu!");
    }

    setIsAddingToCart(comboKey);

    try {
      const comboItems = devicesList
        .filter((item) => item.deviceId)
        .map((item) => ({
          deviceId: item.deviceId,
          quantity: Number(item.quantity) > 0 ? Number(item.quantity) : 1,
        }));

      if (!comboItems.length) {
        setIsAddingToCart(false);
        return toast.warning("Không thể thêm combo vì thiếu thông tin thiết bị.");
      }

      const payload = {
        comboItems,
        rentalStartDate: startDate,
        rentalEndDate: endDate,
      };

      const res = await addComboToCart(payload);
      const isSuccess = res.success || res.data?.success;

      if (isSuccess) {
        toast.success(res.message || res.data?.message || "Đã thêm combo vào giỏ hàng!", {
          icon: <CheckCircle className="w-5 h-5 text-emerald-500" />
        });
        navigate("/user/cart");
      } else {
        toast.error(res.message || res.data?.message || "Có lỗi khi thêm vào giỏ");
      }
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.message || "Lỗi khi thêm vào giỏ hàng.");
    } finally {
      setIsAddingToCart(false);
    }
  };

  const renderComboCard = (key, comboData) => {
    if (!comboData) return null;

    const style = COMBO_STYLES[key];
    const estimatedTotal = rentalDays > 0 ? comboData.totalPricePerDay * rentalDays : 0;

    return (
      <article
        key={key}
        className={`relative overflow-hidden rounded-3xl border ${style.border} bg-white shadow-md hover:shadow-2xl transition-all duration-300 h-full flex flex-col`}
      >
        <div className={`h-1.5 w-full bg-gradient-to-r ${style.accent}`} />

        <div className="p-5 md:p-6 flex-1 flex flex-col">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${style.chip}`}>
                {style.title}
              </span>
              <h3 className="mt-3 text-xl font-black text-slate-900">{comboData.comboName || style.title}</h3>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-[0.14em]">Chi phí/ngày</p>
              <p className="text-lg md:text-xl font-black text-slate-900">{formatCurrency(comboData.totalPricePerDay)}</p>
            </div>
          </div>

          <p className="text-sm text-slate-600 italic mb-4">"{comboData.description}"</p>

          <div className="space-y-3 mb-5 flex-1">
            {comboData.devices.map((dev, idx) => (
              <div key={`${dev.deviceId}-${idx}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <h4 className="font-semibold text-slate-800 leading-snug">{dev.name}</h4>
                  <span className="shrink-0 rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-700">
                    x{dev.quantity}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  Giá thuê/ngày: <span className="font-bold text-slate-900">{formatCurrency(dev.price)}</span>
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Gợi ý từ AI: {dev.reason || "Thiết bị phù hợp với mục tiêu và bối cảnh bạn mô tả."}
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 mb-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-[0.14em]">Tạm tính</p>
            <p className="text-sm text-slate-700 mt-1">
              {rentalDays > 0
                ? `${rentalDays} ngày x ${formatCurrency(comboData.totalPricePerDay)}`
                : "Chọn ngày thuê để xem tổng chi phí ước tính"}
            </p>
            <p className="text-base font-black text-slate-900 mt-1">
              {rentalDays > 0 ? formatCurrency(estimatedTotal) : "-"}
            </p>
          </div>

          <button
            onClick={() => handleAddComboToCartClick(comboData.devices, key)}
            disabled={!startDate || !endDate || isAddingToCart === key}
            className={`w-full rounded-2xl py-3.5 font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
              isAddingToCart === key
                ? 'bg-slate-700 text-slate-300 cursor-wait'
                : 'bg-gradient-to-r from-slate-900 to-slate-800 text-white hover:from-slate-800 hover:to-slate-700 hover:shadow-lg hover:shadow-slate-900/20 active:scale-[0.98]'
            } disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            {isAddingToCart === key ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Đang thêm...
              </>
            ) : (
              <>
                <ShoppingCart className="w-5 h-5" />
                Thêm combo vào giỏ
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>

          {(!startDate || !endDate) && (
            <p className="mt-2 text-xs text-amber-600 flex items-center gap-1">
              <CalendarIcon className="w-3 h-3" />
              Bạn cần chọn lịch thuê trước khi thêm combo vào giỏ.
            </p>
          )}
        </div>
      </article>
    );
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_5%_0%,rgba(34,211,238,0.14),rgba(255,255,255,0)_45%),radial-gradient(circle_at_95%_10%,rgba(59,130,246,0.13),rgba(255,255,255,0)_40%),#f8fafc]" data-theme="light">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-8 md:pt-40 md:pb-12">
        <section className="relative overflow-hidden rounded-[34px] border border-slate-800 bg-slate-950 px-6 py-8 md:px-10 md:py-10 text-white shadow-2xl mb-8 md:mb-10" data-theme="dark">
          <div className="absolute -top-20 -left-24 w-80 h-80 bg-cyan-400/20 blur-3xl rounded-full" />
          <div className="absolute -bottom-28 -right-16 w-96 h-96 bg-indigo-500/25 blur-3xl rounded-full" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 mb-4">
                <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                <span className="text-[11px] font-black tracking-[0.16em] uppercase">SmartGear AI</span>
              </div>

              <h1 className="text-3xl md:text-5xl font-black leading-tight max-w-3xl">
                AI đề xuất combo thiết bị quay chụp theo đúng bối cảnh thực tế của bạn.
              </h1>
              <p className="mt-3 text-slate-200 max-w-2xl text-sm md:text-base">
                Mô tả mục tiêu nội dung, điều kiện ánh sáng, số người tham gia và lịch thuê. SmartGear sẽ gợi ý 3 phương án thiết bị tối ưu theo ngân sách.
              </p>
            </div>

            <div className="lg:col-span-4">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 md:p-5">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-300">Luồng sử dụng</p>
                <div className="mt-3 space-y-2 text-sm font-semibold">
                  <p className="text-white">1. Nhập nhu cầu quay/chụp.</p>
                  <p className="text-white">2. Chọn thời gian thuê.</p>
                  <p className="text-white">3. Nhận combo và thêm thẳng vào giỏ.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-12 gap-6 mb-8 md:mb-10">
          <div className="xl:col-span-8 rounded-3xl border border-slate-200 bg-white p-5 md:p-6 shadow-lg">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h2 className="text-xl md:text-2xl font-black text-slate-900">Mô tả nhu cầu của bạn</h2>
              <button
                onClick={() => navigate("/products")}
                className="text-xs md:text-sm px-3 py-1.5 rounded-full border border-slate-300 text-slate-700 hover:bg-slate-100 transition"
              >
                Xem toàn bộ thiết bị
              </button>
            </div>

            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ví dụ: Quay vlog cặp đôi ở biển 2 ngày, cần góc rộng, chống rung tốt, mic rõ giọng và pin trâu..."
              className="w-full min-h-[140px] rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm md:text-base focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 outline-none"
            />

            <div className="mt-4 flex flex-wrap gap-2">
              {quickPrompts.map((idea) => (
                <button
                  key={idea}
                  type="button"
                  onClick={() => setPrompt(idea)}
                  className="text-xs md:text-sm px-3 py-1.5 rounded-full border border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                >
                  {idea}
                </button>
              ))}
            </div>
          </div>

          <div className="xl:col-span-4 rounded-3xl border border-slate-200 bg-white p-5 md:p-6 shadow-lg">
            <h3 className="text-lg font-black text-slate-900 mb-4">Thời gian thuê</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-[0.12em] text-slate-500 mb-1.5">Ngày bắt đầu</label>
                <input
                  type="date"
                  value={startDate}
                  min={today}
                  onChange={(e) => {
                    const nextStartDate = e.target.value;
                    setStartDate(nextStartDate);
                    if (endDate && nextStartDate && new Date(endDate) <= new Date(nextStartDate)) {
                      setEndDate("");
                    }
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 focus:ring-2 focus:ring-cyan-500/30 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-[0.12em] text-slate-500 mb-1.5">Ngày kết thúc</label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate || today}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 focus:ring-2 focus:ring-cyan-500/30 outline-none"
                />
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Trạng thái lịch thuê</p>
              <p className="mt-1 text-sm text-slate-700">
                {rentalDays > 0
                  ? `Đang chọn lịch thuê ${rentalDays} ngày.`
                  : "Bạn chưa chọn đủ ngày, vẫn có thể nhận tư vấn combo trước."}
              </p>
            </div>

            <button
              onClick={handleSuggest}
              disabled={loading}
              className="mt-5 w-full rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-900 text-white py-3.5 font-bold hover:opacity-95 transition disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? "AI đang phân tích nhu cầu..." : "Phân tích và đề xuất combo"}
            </button>
          </div>
        </section>

        {combos && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-black text-slate-900">Kết quả đề xuất từ SmartGear</h2>
              <span className="text-xs md:text-sm rounded-full border border-slate-200 px-3 py-1 text-slate-600 bg-white">
                {rentalDays > 0 ? `Ước tính theo ${rentalDays} ngày thuê` : "Ước tính theo giá mỗi ngày"}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 md:gap-6">
              {renderComboCard("budget", combos.budget)}
              {renderComboCard("standard", combos.standard)}
              {renderComboCard("premium", combos.premium)}
            </div>
          </section>
        )}

        {!loading && !combos && resultMessage && (
          <div className="max-w-4xl mx-auto rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800 text-sm shadow-sm">
            {resultMessage}
          </div>
        )}
      </div>
    </div>
  );
}
