import React, { useState, useEffect, useRef } from "react";
import {
    getVouchersBySupplier,
    createVoucherBySupplier,
    updateVoucherStatusBySupplier
} from "../../service/ApiService/VoucherApi";
import { toast } from "react-toastify";
import { FiPlus, FiClock, FiTag, FiSearch, FiMoreVertical, FiEye, FiEyeOff } from "react-icons/fi";

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
                <button
                    onClick={handleOpenCreate}
                    className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/20"
                >
                    <FiPlus /> Tạo Voucher mới
                </button>
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
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <FiPlus className="text-primary" />
                                Tạo Voucher mới
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mã Voucher</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="VD: GIAMGIA10"
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hạn dùng</label>
                                    <input
                                        required
                                        type="date"
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                        value={formData.expiredAt}
                                        onChange={(e) => setFormData({ ...formData, expiredAt: e.target.value })}
                                        min={new Date().toISOString().split('T')[0]}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mô tả</label>
                                <textarea
                                    placeholder="Mô tả ưu đãi (VD: Giảm 10% cho mọi đơn hàng của shop)"
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all h-20 resize-none"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loại giảm giá</label>
                                    <select
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                        value={formData.discountType}
                                        onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                                    >
                                        <option value="PERCENT">Phần trăm (%)</option>
                                        <option value="FIXED">Số tiền cố định (đ)</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Giá trị giảm</label>
                                    <input
                                        required
                                        type="number"
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                        value={formData.discountValue}
                                        onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lượt dùng tối đa</label>
                                    <input
                                        type="number"
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                        value={formData.usageLimit}
                                        onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Giảm tối đa (đ)</label>
                                    <input
                                        type="number"
                                        placeholder="Không giới hạn"
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                        value={formData.maxDiscount}
                                        onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Giá trị đơn hàng tối thiểu (đ)</label>
                                <input
                                    type="number"
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                    value={formData.minOrderValue}
                                    onChange={(e) => setFormData({ ...formData, minOrderValue: e.target.value })}
                                />
                            </div>

                            <div className="pt-6 flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-6 py-3 border border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 transition-all"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-6 py-3 bg-primary text-white rounded-2xl font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/20"
                                >
                                    Tạo Voucher
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
