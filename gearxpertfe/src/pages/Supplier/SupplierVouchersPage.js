import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
    getVouchersBySupplier,
    createVoucherBySupplier,
    updateVoucherStatusBySupplier
} from "../../service/ApiService/VoucherApi";
import { toast } from "react-toastify";
import { 
    FiPlus, 
    FiClock, 
    FiTag, 
    FiSearch, 
    FiMoreVertical, 
    FiEye, 
    FiEyeOff, 
    FiRefreshCw, 
    FiCalendar, 
    FiDollarSign, 
    FiHash, 
    FiFileText, 
    FiX 
} from "react-icons/fi";

export default function SupplierVouchersPage() {
    const [vouchers, setVouchers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);

    // State for active dropdown
    const [activeDropdown, setActiveDropdown] = useState(null);
    const dropdownRef = useRef(null);

    const [formData, setFormData] = useState({
        code: "",
        description: "",
        discountType: "PERCENT",
        discountValue: "",
        minOrderValue: 0,
        maxDiscount: "",
        usageLimit: 1,
        expiredAt: ""
    });

    useEffect(() => {
        fetchVouchers();

        // Close dropdown when clicking outside
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setActiveDropdown(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchVouchers = async () => {
        try {
            setLoading(true);
            const response = await getVouchersBySupplier();
            if (response && response.success) {
                setVouchers(response.vouchers);
            }
        } catch (error) {
            console.error("Fetch vouchers error:", error);
            toast.error("Không thể tải danh sách voucher");
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async (voucher) => {
        const newStatus = voucher.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
        try {
            const response = await updateVoucherStatusBySupplier(voucher._id, newStatus);
            if (response && response.success) {
                toast.success(`Đã ${newStatus === "ACTIVE" ? "kích hoạt" : "tạm ngưng"} voucher`);
                setVouchers(vouchers.map(v => v._id === voucher._id ? { ...v, status: newStatus } : v));
            }
        } catch (error) {
            toast.error("Lỗi khi thay đổi trạng thái");
        } finally {
            setActiveDropdown(null);
        }
    };

    const handleOpenCreate = () => {
        setFormData({
            code: "",
            description: "",
            discountType: "PERCENT",
            discountValue: "",
            minOrderValue: 0,
            maxDiscount: "",
            usageLimit: 1,
            expiredAt: ""
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await createVoucherBySupplier(formData);
            if (response && response.success) {
                toast.success("Tạo voucher thành công");
                setIsModalOpen(false);
                fetchVouchers();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Lỗi khi tạo voucher");
        }
    };

    const generateRandomCode = () => {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let result = "";
        for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setFormData({ ...formData, code: result });
    };

    const filteredVouchers = vouchers.filter(v =>
        v.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Quản lý Voucher</h1>
                    <p className="text-sm text-slate-500">Xem và quản lý các chương trình khuyến mãi của bạn</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleOpenCreate}
                        className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/20"
                    >
                        <FiPlus /> Tạo Voucher mới
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <div className="relative flex-1 max-w-md">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Tìm theo mã hoặc mô tả..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="border-b border-slate-100 text-left">
                            <th className="px-4 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Mã Voucher</th>
                            <th className="px-4 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ưu đãi</th>
                            <th className="px-4 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Trạng thái</th>
                            <th className="px-4 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Giới hạn / Đã dùng</th>
                            <th className="px-4 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ngày hết hạn</th>
                            <th className="px-4 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-sm">
                        {loading ? (
                            [1, 2, 3].map(i => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan="6" className="px-4 py-8">
                                        <div className="h-4 bg-slate-100 rounded mb-2 w-32"></div>
                                        <div className="h-4 bg-slate-50 rounded w-48"></div>
                                    </td>
                                </tr>
                            ))
                        ) : filteredVouchers.length > 0 ? (
                            filteredVouchers.map(voucher => (
                                <tr key={voucher._id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-4 py-5">
                                        <div className="font-bold text-slate-900 mb-1">{voucher.code}</div>
                                        <div className="text-xs text-slate-500 max-w-[200px] truncate" title={voucher.description}>
                                            {voucher.description || "Không có mô tả"}
                                        </div>
                                    </td>
                                    <td className="px-4 py-5">
                                        <div className="flex items-center gap-2 text-slate-700 font-medium">
                                            <FiTag className="text-primary" />
                                            {voucher.discountType === 'PERCENT' ? `${voucher.discountValue}%` : `${voucher.discountValue?.toLocaleString()}đ`}
                                        </div>
                                        {voucher.maxDiscount && (
                                            <div className="text-[11px] text-slate-500 mt-1">Giảm tối đa {voucher.maxDiscount.toLocaleString()}đ</div>
                                        )}
                                        <div className="text-[11px] text-slate-400">Đơn tối thiểu: {voucher.minOrderValue?.toLocaleString()}đ</div>
                                    </td>
                                    <td className="px-4 py-5 text-center">
                                        <span className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-wide ${voucher.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-600'
                                            }`}>
                                            {voucher.status === 'ACTIVE' ? 'ĐANG CHẠY' : 'TẠM NGƯNG'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-5">
                                        <div className="text-slate-700">{voucher.usedCount} / {voucher.usageLimit}</div>
                                        <div className="w-24 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                            <div
                                                className="h-full bg-primary"
                                                style={{ width: `${Math.min(100, (voucher.usedCount / voucher.usageLimit) * 100)}%` }}
                                            />
                                        </div>
                                    </td>
                                    <td className="px-4 py-5">
                                        <div className="flex items-center gap-2 text-slate-700">
                                            <FiClock className={new Date(voucher.expiredAt) < new Date() ? 'text-red-500' : 'text-slate-400'} />
                                            {new Date(voucher.expiredAt).toLocaleDateString("vi-VN")}
                                        </div>
                                        {new Date(voucher.expiredAt) < new Date() && (
                                            <span className="text-[10px] text-red-500 font-bold uppercase truncate">Đã hết hạn</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-5 text-right relative">
                                        <button
                                            onClick={() => setActiveDropdown(activeDropdown === voucher._id ? null : voucher._id)}
                                            className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                                        >
                                            <FiMoreVertical size={20} />
                                        </button>

                                        {activeDropdown === voucher._id && (
                                            <div
                                                ref={dropdownRef}
                                                className="absolute right-4 top-12 z-[50] w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 animate-in fade-in slide-in-from-top-2 duration-200"
                                            >
                                                <button
                                                    onClick={() => handleToggleStatus(voucher)}
                                                    className="w-full px-4 py-2.5 text-left text-sm text-slate-600 hover:bg-slate-50 hover:text-primary flex items-center gap-3 transition-colors"
                                                >
                                                    {voucher.status === "ACTIVE" ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                                                    {voucher.status === "ACTIVE" ? "Tạm ngưng" : "Kích hoạt lại"}
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" className="px-4 py-12 text-center text-slate-400 italic">
                                    Chưa có voucher nào được tạo.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Create Voucher Modal */}
            {isModalOpen && createPortal(
                <div
                    className="fixed top-0 left-0 w-full h-screen z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300 overflow-hidden cursor-pointer"
                    onClick={() => setIsModalOpen(false)}
                >
                    <div
                        className="bg-white/95 rounded-[32px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.25)] w-full max-w-xl border border-white relative animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh] overflow-hidden cursor-default"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header with Gradient Backdrop */}
                        <div className="relative h-32 flex items-end p-8 overflow-hidden shrink-0">
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-violet-700 opacity-90"></div>
                            <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                            <div className="absolute bottom-[-20%] left-[-10%] w-48 h-48 bg-indigo-400/20 rounded-full blur-2xl"></div>

                            <div className="relative z-10 w-full flex items-center justify-between">
                                <div>
                                    <h2 className="text-2xl font-black text-white uppercase italic tracking-tight leading-none">
                                        Tạo Voucher Mới
                                    </h2>
                                    <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest mt-2 opacity-80">
                                        Thiết lập ưu đãi cho cửa hàng của bạn
                                    </p>
                                </div>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl backdrop-blur-md transition-all border border-white/10 hover:rotate-90 duration-300"
                                >
                                    <FiX size={20} />
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto hide-scroll flex-1">
                            {/* SECTION: THÔNG TIN CHI TIẾT */}
                            <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                        <FiHash size={12} className="text-indigo-500" /> Mã Voucher
                                    </label>
                                    <div className="relative group">
                                        <input
                                            required
                                            type="text"
                                            placeholder="SẢN PHẨM MỚI"
                                            className="w-full pl-4 pr-12 py-3.5 bg-slate-50 border-2 border-transparent rounded-[20px] focus:bg-white focus:border-indigo-500/20 outline-none transition-all font-black uppercase text-slate-700 placeholder:text-slate-300 focus:ring-4 ring-indigo-500/5 shadow-sm"
                                            value={formData.code}
                                            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                        />
                                        <button
                                            type="button"
                                            onClick={generateRandomCode}
                                            title="Tạo mã ngẫu nhiên"
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all"
                                        >
                                            <FiRefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-700" />
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                        <FiCalendar size={12} className="text-indigo-500" /> Hạn sử dụng
                                    </label>
                                    <div className="relative">
                                        <input
                                            required
                                            type="date"
                                            className="w-full px-4 py-3.5 bg-slate-50 border-2 border-transparent rounded-[20px] focus:bg-white focus:border-indigo-500/20 outline-none transition-all font-bold text-slate-700 focus:ring-4 ring-indigo-500/5 shadow-sm"
                                            value={formData.expiredAt}
                                            onChange={(e) => setFormData({ ...formData, expiredAt: e.target.value })}
                                            min={new Date().toISOString().split('T')[0]}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                    <FiFileText size={12} className="text-indigo-500" /> Mô tả ngắn gọn
                                </label>
                                <textarea
                                    placeholder="Nhập nội dung ưu đãi cho khách hàng thấy..."
                                    className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-[24px] focus:bg-white focus:border-indigo-500/20 outline-none transition-all h-24 resize-none font-medium text-slate-600 placeholder:text-slate-300 focus:ring-4 ring-indigo-500/5 shadow-sm"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            {/* SECTION: CƠ CHẾ GIẢM GIÁ */}
                            <div className="p-5 bg-indigo-50/50 rounded-[28px] border border-indigo-100/50 space-y-5">
                                <div className="grid grid-cols-2 gap-5">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Loại giảm giá</label>
                                        <select
                                            className="w-full px-4 py-3.5 bg-white border-2 border-transparent rounded-[18px] focus:border-indigo-500/20 outline-none transition-all font-bold text-slate-700 shadow-sm"
                                            value={formData.discountType}
                                            onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                                        >
                                            <option value="PERCENT">Phần trăm (%)</option>
                                            <option value="FIXED">Số tiền (đ)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Giá trị giảm</label>
                                        <div className="relative">
                                            <input
                                                required
                                                type="number"
                                                className="w-full pl-4 pr-10 py-3.5 bg-white border-2 border-transparent rounded-[18px] focus:border-indigo-500/20 outline-none transition-all font-black text-slate-800 shadow-sm"
                                                value={formData.discountValue}
                                                onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-indigo-500">
                                                {formData.discountType === 'PERCENT' ? '%' : 'đ'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-5">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Lượt dùng tối đa</label>
                                        <input
                                            type="number"
                                            className="w-full px-4 py-3.5 bg-white border-2 border-transparent rounded-[18px] focus:border-indigo-500/20 outline-none transition-all font-bold text-slate-700 shadow-sm"
                                            value={formData.usageLimit}
                                            onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Giảm tối đa (đ)</label>
                                        <input
                                            type="number"
                                            placeholder="Không giới hạn"
                                            className="w-full px-4 py-3.5 bg-white border-2 border-transparent rounded-[18px] focus:border-indigo-500/20 outline-none transition-all font-bold text-slate-700 shadow-sm placeholder:text-slate-200"
                                            value={formData.maxDiscount}
                                            onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">
                                        <FiDollarSign size={12} /> Giá trị đơn tối thiểu (đ)
                                    </label>
                                    <input
                                        type="number"
                                        className="w-full px-4 py-3.5 bg-white border-2 border-transparent rounded-[18px] focus:border-indigo-500/20 outline-none transition-all font-bold text-slate-700 shadow-sm"
                                        value={formData.minOrderValue}
                                        onChange={(e) => setFormData({ ...formData, minOrderValue: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex items-center gap-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-6 py-4 bg-slate-100 text-slate-500 rounded-[24px] font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all active:scale-[0.98]"
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    type="submit"
                                    className="flex-[2] px-6 py-4 bg-slate-900 text-white rounded-[24px] font-black uppercase tracking-[0.15em] text-xs hover:bg-indigo-600 transition-all shadow-xl shadow-indigo-100 hover:-translate-y-1 active:scale-[0.98]"
                                >
                                    Tạo Voucher Ngay
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
