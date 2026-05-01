import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import { postAdvertisement } from '../../service/ApiService/AdvertisementApi';
import { getSupplierDevices } from '../../service/ApiService/DeviceApi';
import { FiX, FiUpload, FiCheckCircle, FiInfo, FiLayout, FiLayers, FiLink, FiPackage, FiSearch } from 'react-icons/fi';

export default function AdvertisementModal({ isOpen, onClose, onSuccess, preselectSlug, preselectName }) {
    const navigate = useNavigate();
    const userAccount = useSelector((state) => state.user.account);
    const [loading, setLoading] = useState(false);
    const [imagePreview, setImagePreview] = useState(null);
    const [linkMode, setLinkMode] = useState('MANUAL'); // 'MANUAL' or 'PRODUCT'
    const [devices, setDevices] = useState([]);
    const [loadingDevices, setLoadingDevices] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedName, setSelectedName] = useState('');
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        link: '',
        adsType: [],
        startDate: '',
        endDate: '',
        dailyBudget: 100000, // Default 100k
    });

    const fetchDevices = useCallback(async () => {
        setLoadingDevices(true);
        try {
            const response = await getSupplierDevices(userAccount.id, { limit: 100 });
            if (response && response.devices) {
                setDevices(response.devices);
            }
        } catch (error) {
            console.error("Error fetching supplier devices:", error);
            // toast.error("Không thể tải danh sách sản phẩm");
        } finally {
            setLoadingDevices(false);
        }
    }, [userAccount?.id]);

    useEffect(() => {
        if (isOpen) {
            if (preselectSlug) {
                setLinkMode('PRODUCT');
                setFormData(prev => ({ ...prev, link: `/device/${preselectSlug}` }));
                if (preselectName) setSelectedName(preselectName);
            }
            
            if (linkMode === 'PRODUCT' && userAccount?.id) {
                fetchDevices();
            }
        }
    }, [isOpen, linkMode, userAccount?.id, preselectSlug, preselectName, fetchDevices]);

    const filteredDevices = devices.filter(d => 
        d.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const calculateDays = () => {
        if (!formData.startDate || !formData.endDate) return 0;
        const start = new Date(formData.startDate);
        const end = new Date(formData.endDate);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return diffDays > 0 ? diffDays : 0;
    };

    const days = calculateDays();
    const multiplier = formData.adsType.length >= 2 ? 2 : 1;
    const effectiveDailyBudget = formData.dailyBudget * multiplier;

    const totalCost = days * effectiveDailyBudget;

    const getPriority = (budget) => {
        if (budget < 100000) return { label: 'Đồng', color: 'text-orange-400' };
        if (budget < 300000) return { label: 'Bạc', color: 'text-slate-300' };
        if (budget < 500000) return { label: 'Vàng', color: 'text-amber-400' };
        return { label: 'Kim cương', color: 'text-cyan-400' };
    };

    const priority = getPriority(formData.dailyBudget);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCheckboxChange = (e) => {
        const { value, checked } = e.target;
        setFormData(prev => {
            if (checked) {
                return { ...prev, adsType: [...prev.adsType, value] };
            } else {
                return { ...prev, adsType: prev.adsType.filter(type => type !== value) };
            }
        });
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error('Kích thước ảnh không được vượt quá 5MB');
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.adsType.length === 0) {
            toast.error('Vui lòng chọn ít nhất một loại quảng cáo');
            return;
        }

        const fileInput = document.getElementById('ads-image-upload');
        if (!fileInput.files[0]) {
            toast.error('Vui lòng tải lên ảnh quảng cáo');
            return;
        }

        setLoading(true);
        try {
            const submitData = new FormData();
            submitData.append('title', formData.title);
            submitData.append('description', formData.description);
            submitData.append('link', formData.link);
            submitData.append('image', fileInput.files[0]);
            formData.adsType.forEach(type => submitData.append('adsType', type));

            submitData.append('totalCost', totalCost);
            submitData.append('startDate', formData.startDate);
            submitData.append('endDate', formData.endDate);
            submitData.append('dailyBudget', formData.dailyBudget);

            const response = await postAdvertisement(submitData);
            if (response.errorCode === 0) {
                toast.success(response.message || 'Đã gửi yêu cầu đăng quảng cáo!');
                if (onSuccess) onSuccess();
                onClose();
                // Reset form
                setFormData({ title: '', description: '', link: '', adsType: [], startDate: '', endDate: '', dailyBudget: 100000 });
                setImagePreview(null);
                setSelectedName('');
                setLinkMode('PRODUCT'); // Default back to product
            } else if (response.errorCode === 2) {
                toast.error(response.message);
                if (window.confirm("Số dư không đủ. Bạn có muốn nạp thêm tiền không?")) {
                    onClose();
                    navigate('/user/wallet');
                }
            } else {
                toast.error(response.message || 'Có lỗi xảy ra');
            }
        } catch (error) {
            console.error('Error posting ads:', error);
            const errorMessage = error.response?.data?.message;
            const errorCode = error.response?.data?.errorCode;

            if (errorCode === 2) {
                toast.error(errorMessage);
                if (window.confirm("Số dư không đủ. Bạn có muốn nạp thêm tiền không?")) {
                    onClose();
                    navigate('/user/wallet');
                }
            } else {
                toast.error(errorMessage || 'Có lỗi xảy ra khi đăng quảng cáo');
            }
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                ></motion.div>

                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="relative w-full max-w-4xl bg-white rounded-[32px] shadow-2xl overflow-hidden border border-slate-100 max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                >
                    <div className="h-2 bg-gradient-to-r from-primary via-indigo-500 to-accent-cyan w-full"></div>

                    <div className="p-8">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-2xl font-bold text-slate-900 font-display flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">campaign</span>
                                    Đăng quảng cáo mới
                                </h3>
                                <p className="text-slate-500 text-sm mt-1">Gửi yêu cầu quảng cáo để tiếp cận khách hàng tiềm năng</p>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                                <FiX size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-8">
                                {/* Left Column */}
                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            Tiêu đề quảng cáo <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="title"
                                            value={formData.title}
                                            onChange={handleInputChange}
                                            required
                                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-slate-400"
                                            placeholder="VD: Thuê máy ảnh giảm 50%"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            Mô tả ngắn <span className="text-slate-400 font-normal">(Tùy chọn)</span>
                                        </label>
                                        <textarea
                                            name="description"
                                            value={formData.description}
                                            onChange={handleInputChange}
                                            rows="2"
                                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-slate-400 resize-none"
                                            placeholder="Mô tả ngắn gọn về chương trình..."
                                        ></textarea>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-3">
                                            Đường dẫn quảng bá <span className="text-rose-500">*</span>
                                        </label>
                                        
                                        {/* Link mode switcher */}
                                        <div className="flex p-1 bg-slate-100 rounded-xl mb-4">
                                            <button
                                                type="button"
                                                onClick={() => setLinkMode('PRODUCT')}
                                                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
                                                    linkMode === 'PRODUCT' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                                }`}
                                            >
                                                <FiPackage size={14} />
                                                Chọn sản phẩm
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setLinkMode('MANUAL')}
                                                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
                                                    linkMode === 'MANUAL' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                                }`}
                                            >
                                                <FiLink size={14} />
                                                Link tùy chỉnh
                                            </button>
                                        </div>

                                        {linkMode === 'PRODUCT' ? (
                                            <div className="space-y-3">
                                                <div className="relative">
                                                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                    <input
                                                        type="text"
                                                        placeholder="Tìm kiếm sản phẩm của bạn..."
                                                        value={searchTerm}
                                                        onChange={(e) => setSearchTerm(e.target.value)}
                                                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                                                    />
                                                </div>

                                                <div className="max-h-[200px] overflow-y-auto border border-slate-200 rounded-xl bg-slate-50 p-2 space-y-1 custom-scrollbar">
                                                    {loadingDevices ? (
                                                        <div className="py-8 text-center">
                                                            <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
                                                        </div>
                                                    ) : filteredDevices.length > 0 ? (
                                                        filteredDevices.map(device => (
                                                            <div
                                                                key={device._id}
                                                                onClick={() => {
                                                                    setFormData(prev => ({ ...prev, link: `/device/${device.slug}` }));
                                                                    setSelectedName(device.name);
                                                                }}
                                                                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all ${
                                                                    formData.link === `/device/${device.slug}`
                                                                        ? 'bg-primary/10 border border-primary/20'
                                                                        : 'hover:bg-white border border-transparent'
                                                                }`}
                                                            >
                                                                <img src={device.images?.[0] || 'https://via.placeholder.com/150'} alt="" className="w-10 h-10 rounded-md object-cover" />
                                                                <div className="min-w-0">
                                                                    <p className="text-xs font-bold text-slate-900 truncate">{device.name}</p>
                                                                    <p className="text-[10px] text-slate-500">{device.rentPrice?.perDay?.toLocaleString()}₫/ngày</p>
                                                                </div>
                                                                {formData.link === `/device/${device.slug}` && (
                                                                    <FiCheckCircle className="ml-auto text-primary" size={16} />
                                                                )}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <p className="text-center py-8 text-xs text-slate-400 italic">Không tìm thấy sản phẩm nào</p>
                                                    )}
                                                </div>
                                                
                                                {formData.link && formData.link.startsWith('/device/') && (
                                                    <div className="flex items-center gap-2 p-2 bg-emerald-50 border border-emerald-100 rounded-lg animate-fade-in">
                                                        <FiCheckCircle className="text-emerald-500 shrink-0" size={14} />
                                                        <p className="text-[10px] text-emerald-700 font-bold truncate">Đã chọn: {selectedName || formData.link}</p>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                <input
                                                    type="text"
                                                    name="link"
                                                    value={formData.link}
                                                    onChange={handleInputChange}
                                                    required
                                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-slate-400 text-sm"
                                                    placeholder="Dán đường dẫn (https://... hoặc /device/...)"
                                                />
                                                <p className="text-[10px] text-slate-400 italic">
                                                    * Bạn có thể dán link trang shop, link bộ sưu tập hoặc bất kỳ trang nào hợp lệ.
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                                Ngày bắt đầu <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                type="date"
                                                name="startDate"
                                                value={formData.startDate}
                                                onChange={handleInputChange}
                                                required
                                                min={new Date().toISOString().split('T')[0]}
                                                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all shadow-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                                Ngày kết thúc <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                type="date"
                                                name="endDate"
                                                value={formData.endDate}
                                                onChange={handleInputChange}
                                                required
                                                min={formData.startDate || new Date().toISOString().split('T')[0]}
                                                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all shadow-sm"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="block text-sm font-semibold text-slate-700">
                                                Ngân sách hàng ngày <span className="text-rose-500">*</span>
                                            </label>
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${priority.color.replace('text-', 'bg-').replace('400', '100')} ${priority.color}`}>
                                                {priority.label}
                                            </span>
                                        </div>
                                        <div className="relative mb-3">
                                            <input
                                                type="number"
                                                name="dailyBudget"
                                                value={formData.dailyBudget}
                                                onChange={handleInputChange}
                                                required
                                                min="10000"
                                                step="1000"
                                                className="w-full pl-10 pr-16 py-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all font-bold text-slate-900 text-lg shadow-sm"
                                            />
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₫</div>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold uppercase">VND</div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {[50000, 100000, 200000, 500000].map((budget) => (
                                                <button
                                                    key={budget}
                                                    type="button"
                                                    onClick={() => setFormData(prev => ({ ...prev, dailyBudget: budget }))}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${Number(formData.dailyBudget) === budget
                                                        ? 'bg-primary/10 border-primary text-primary'
                                                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
                                                        }`}
                                                >
                                                    {budget.toLocaleString('vi-VN')}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            Vị trí hiển thị <span className="text-rose-500">*</span>
                                        </label>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div
                                                className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ${formData.adsType.includes('BANNER')
                                                    ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                                                    : 'border-slate-200 bg-white hover:border-slate-300'
                                                    }`}
                                                onClick={() => {
                                                    const isChecked = formData.adsType.includes('BANNER');
                                                    const mockEvent = { target: { value: 'BANNER', checked: !isChecked } };
                                                    handleCheckboxChange(mockEvent);
                                                }}
                                            >
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${formData.adsType.includes('BANNER') ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'
                                                    }`}>
                                                    <FiLayout size={20} />
                                                </div>
                                                <h4 className={`font-bold mb-1 ${formData.adsType.includes('BANNER') ? 'text-primary' : 'text-slate-700'}`}>Banner</h4>
                                                <p className="text-xs text-slate-500 leading-snug">Hiển thị nổi bật tại đầu trang chủ</p>

                                                {formData.adsType.includes('BANNER') && (
                                                    <div className="absolute top-3 right-3 text-primary">
                                                        <FiCheckCircle size={18} />
                                                    </div>
                                                )}
                                            </div>

                                            <div
                                                className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ${formData.adsType.includes('POPUP')
                                                    ? 'border-accent-cyan bg-accent-cyan/5 shadow-md shadow-accent-cyan/10'
                                                    : 'border-slate-200 bg-white hover:border-slate-300'
                                                    }`}
                                                onClick={() => {
                                                    const isChecked = formData.adsType.includes('POPUP');
                                                    const mockEvent = { target: { value: 'POPUP', checked: !isChecked } };
                                                    handleCheckboxChange(mockEvent);
                                                }}
                                            >
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${formData.adsType.includes('POPUP') ? 'bg-accent-cyan text-white' : 'bg-slate-100 text-slate-500'
                                                    }`}>
                                                    <FiLayers size={20} />
                                                </div>
                                                <h4 className={`font-bold mb-1 ${formData.adsType.includes('POPUP') ? 'text-slate-900' : 'text-slate-700'}`}>Popup</h4>
                                                <p className="text-xs text-slate-500 leading-snug">Xuất hiện giữa màn hình khi truy cập</p>

                                                {formData.adsType.includes('POPUP') && (
                                                    <div className="absolute top-3 right-3 text-accent-cyan">
                                                        <FiCheckCircle size={18} />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column */}
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            Hình ảnh quảng cáo <span className="text-rose-500">*</span>
                                        </label>
                                        <div className="relative group h-[200px]">
                                            <input
                                                type="file"
                                                id="ads-image-upload"
                                                onChange={handleImageChange}
                                                accept="image/*"
                                                className="hidden"
                                            />
                                            <label
                                                htmlFor="ads-image-upload"
                                                className={`w-full h-full rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all duration-300 ${imagePreview ? 'border-primary' : 'border-slate-200 hover:border-primary bg-slate-50'
                                                    }`}
                                            >
                                                {imagePreview ? (
                                                    <div className="relative w-full h-full">
                                                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <FiUpload className="text-white text-3xl" />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-center p-6">
                                                        <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-3 border border-slate-100">
                                                            <FiUpload className="text-primary text-xl" />
                                                        </div>
                                                        <p className="text-sm font-semibold text-slate-700">Tải ảnh lên</p>
                                                        <p className="text-[11px] text-slate-400 mt-1">PNG, JPG tối đa 5MB</p>
                                                    </div>
                                                )}
                                            </label>
                                        </div>
                                    </div>

                                    <div className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-slate-700 shadow-xl overflow-hidden relative">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                                        <div className="relative z-10 space-y-4">
                                            <div className="flex justify-between items-center text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                                                <span>Tóm tắt ngân sách</span>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center text-xs text-slate-300">
                                                    <span>Thời gian:</span>
                                                    <span className="font-semibold text-white">{days} ngày</span>
                                                </div>
                                                <div className="flex justify-between items-center text-xs text-slate-300">
                                                    <span>Tổng phí:</span>
                                                    <span className="font-semibold text-white">{totalCost.toLocaleString('vi-VN')}₫</span>
                                                </div>
                                            </div>
                                            <div className="pt-3 border-t border-slate-700 flex justify-between items-end">
                                                <div>
                                                    <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider mb-1">Thanh toán</p>
                                                    <p className="text-2xl font-bold text-white leading-none">{totalCost.toLocaleString('vi-VN')}₫</p>
                                                    <p className="text-[9px] text-slate-400 mt-2 italic font-medium">
                                                        Hủy sớm sẽ được hoàn tiền các ngày chưa sử dụng
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] text-slate-500 font-medium">Độ ưu tiên: <span className={`${priority.color} font-bold`}>{priority.label}</span></p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex gap-3">
                                        <FiInfo className="text-amber-500 shrink-0 mt-0.5" />
                                        <p className="text-[11px] text-amber-800 leading-relaxed italic">
                                            Bạn sẽ chi tiêu trung bình {Number(formData.dailyBudget).toLocaleString('vi-VN')}đ/ngày. Ngân sách càng cao, quảng cáo của bạn càng được ưu tiên hiển thị.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-6 py-2.5 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 transition-all font-display"
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-8 py-2.5 bg-gradient-to-r from-primary to-accent-cyan text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 flex items-center gap-2 font-display"
                                >
                                    {loading ? (
                                        <>
                                            <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                                            Đang xử lý...
                                        </>
                                    ) : (
                                        <>
                                            <FiCheckCircle />
                                            Gửi yêu cầu
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}