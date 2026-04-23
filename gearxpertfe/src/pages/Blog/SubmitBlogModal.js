import React, { useState, useRef, useEffect } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import { Editor } from "@tinymce/tinymce-react";
import { createBlog, updateBlog } from "../../service/ApiService/BlogApi";
import { CATEGORY_MAP } from "./BlogConstants";
import { useTranslation } from "react-i18next";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const customDatePickerStyle = `
.custom-calendar {
    font-family: 'Inter', sans-serif !important;
    border: none !important;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
    border-radius: 1.5rem !important;
    padding: 12px !important;
    background: #ffffff !important;
}

.custom-calendar .react-datepicker__header {
    background-color: transparent !important;
    border-bottom: 1px dashed #e2e8f0 !important;
    padding-top: 10px !important;
    border-top-left-radius: 1.5rem !important;
    border-top-right-radius: 1.5rem !important;
}

.custom-calendar .react-datepicker__current-month {
    font-weight: 900 !important;
    font-size: 1.15rem !important;
    color: #0f172a !important;
    margin-bottom: 12px !important;
    font-family: 'Space Grotesk', sans-serif !important;
}

.custom-calendar .react-datepicker__day-name {
    color: #94a3b8 !important;
    font-weight: 800 !important;
    font-size: 0.7rem !important;
    text-transform: uppercase !important;
    letter-spacing: 0.05em !important;
    width: 2.2rem !important;
    margin: 0.15rem !important;
}

.custom-calendar .react-datepicker__day {
    color: #334155 !important;
    font-weight: 600 !important;
    border-radius: 50% !important;
    width: 2.2rem !important;
    height: 2.2rem !important;
    line-height: 2.2rem !important;
    margin: 0.15rem !important;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
    font-size: 0.9rem !important;
}

.custom-calendar .react-datepicker__day:hover {
    background-color: #f8fafc !important;
    color: #6366F1 !important;
    transform: scale(1.15);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05) !important;
}

.custom-calendar .react-datepicker__day--disabled,
.custom-calendar .react-datepicker__day--disabled:hover {
    color: #cbd5e1 !important; /* Mờ đi */
    background-color: transparent !important;
    cursor: not-allowed !important;
    transform: none !important;
    box-shadow: none !important;
    font-weight: 500 !important;
}

.custom-calendar .react-datepicker__day--selected,
.custom-calendar .react-datepicker__day--keyboard-selected {
    background-color: #6366F1 !important;
    color: white !important;
    box-shadow: 0 8px 16px -4px rgba(99, 102, 241, 0.5) !important;
    transform: scale(1.1) !important;
    font-weight: 700 !important;
}

.custom-calendar .react-datepicker__navigation {
    top: 20px !important;
}

.custom-calendar .react-datepicker__navigation-icon::before {
    border-color: #94a3b8 !important;
    border-width: 2px 2px 0 0 !important;
    transition: all 0.2s !important;
}

.custom-calendar .react-datepicker__navigation:hover .react-datepicker__navigation-icon::before {
    border-color: #6366F1 !important;
    border-width: 3px 3px 0 0 !important;
}

.custom-calendar .react-datepicker__input-time-container {
    margin: 15px 0 5px 0 !important;
    background: #f8fafc !important;
    padding: 14px 16px !important;
    border-radius: 1rem !important;
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    border: 1px solid #f1f5f9 !important;
}

.custom-calendar .react-datepicker-time__caption {
    font-weight: 800 !important;
    color: #475569 !important;
    font-size: 0.75rem !important;
    text-transform: uppercase !important;
    letter-spacing: 0.05em !important;
}

.custom-calendar .react-datepicker-time__input {
    margin-left: auto !important;
}

.custom-calendar input[type="time"] {
    background: white !important;
    border: 2px solid #e2e8f0 !important;
    border-radius: 0.75rem !important;
    padding: 8px 14px !important;
    font-weight: 800 !important;
    color: #0f172a !important;
    font-family: 'Space Grotesk', sans-serif !important;
    font-size: 1.1rem !important;
    outline: none !important;
    transition: all 0.2s !important;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05) !important;
    cursor: pointer !important;
}

.custom-calendar input[type="time"]:focus {
    border-color: #6366F1 !important;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2) !important;
}

.custom-calendar input[type="time"]::-webkit-calendar-picker-indicator {
    cursor: pointer;
    background-color: #f1f5f9;
    padding: 5px;
    border-radius: 5px;
    transition: 0.2s;
}

.custom-calendar input[type="time"]::-webkit-calendar-picker-indicator:hover {
    background-color: #e2e8f0;
}
`;

const SubmitBlogModal = ({ isOpen, onClose, onSuccess, initialData }) => {
    const { t } = useTranslation();
    const userAccount = useSelector((state) => state.user.account);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCategoryOpen, setIsCategoryOpen] = useState(false);
    const [isScheduled, setIsScheduled] = useState(!!initialData?.scheduledPublishDate);
    const dropdownRef = useRef(null);

    const [submitFormData, setSubmitFormData] = useState({
        title: initialData?.title || "",
        description: initialData?.description || "",
        content: initialData?.content || "",
        category: initialData?.category || "CAMERA",
        readTime: initialData?.readTime || 0,
        scheduledPublishDate: initialData?.scheduledPublishDate ? new Date(initialData.scheduledPublishDate).toISOString().slice(0, 16) : "",
    });

    const [selectedImages, setSelectedImages] = useState([]); // Array of { file, preview, isExisting }

    // Sync initial data when editing
    React.useEffect(() => {
        if (initialData) {
            setSubmitFormData({
                title: initialData.title,
                description: initialData.description,
                content: initialData.content,
                category: initialData.category,
                readTime: initialData.readTime,
                scheduledPublishDate: initialData.scheduledPublishDate ? new Date(initialData.scheduledPublishDate).toISOString().slice(0, 16) : "",
            });
            setIsScheduled(!!initialData.scheduledPublishDate);

            // Handle existing images
            if (initialData.images && initialData.images.length > 0) {
                const existing = initialData.images.map(url => ({
                    file: null,
                    preview: url,
                    isExisting: true
                }));
                setSelectedImages(existing);
            } else if (initialData.coverImage) {
                setSelectedImages([{
                    file: null,
                    preview: initialData.coverImage,
                    isExisting: true
                }]);
            }
        }
    }, [initialData]);

    // Handle clicks outside dropdown to close it
    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsCategoryOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fileInputRef = useRef(null);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setSubmitFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleEditorChange = (content) => {
        setSubmitFormData(prev => {
            const newData = { ...prev, content: content };

            // Strip HTML to count words accurately for read time
            const plainText = content.replace(/<[^>]*>/g, "");
            const words = plainText.trim().split(/\s+/).filter(Boolean).length;
            newData.readTime = words > 0 ? Math.max(1, Math.ceil(words / 275)) : 0;

            return newData;
        });
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        handleFiles(files);
    };

    const handleFiles = (files) => {
        const newImages = files.map(file => ({
            file,
            preview: URL.createObjectURL(file)
        }));
        setSelectedImages(prev => [...prev, ...newImages]);
    };

    const removeImage = (index) => {
        const newImages = [...selectedImages];
        if (!newImages[index].isExisting) {
            URL.revokeObjectURL(newImages[index].preview);
        }
        newImages.splice(index, 1);
        setSelectedImages(newImages);
    };

    const handleSubmitBlog = async (e) => {
        e.preventDefault();

        if (!submitFormData.title || !submitFormData.description || !submitFormData.content || selectedImages.length === 0) {
            toast.error("Vui lòng điền đầy đủ các thông tin và đăng ít nhất 1 hình ảnh hoặc video!");
            return;
        }

        setIsSubmitting(true);
        try {
            const formData = new FormData();

            // Append basic fields
            formData.append("title", submitFormData.title);
            formData.append("description", submitFormData.description);
            formData.append("content", submitFormData.content);
            formData.append("category", submitFormData.category);
            formData.append("readTime", submitFormData.readTime);

            // Validate scheduled time
            if (isScheduled && submitFormData.scheduledPublishDate) {
                const selectedTime = new Date(submitFormData.scheduledPublishDate);
                if (selectedTime <= new Date()) {
                    toast.error("Thời gian hẹn xuất bản phải lớn hơn thời gian hiện tại!");
                    setIsSubmitting(false);
                    return;
                }
                formData.append("scheduledPublishDate", submitFormData.scheduledPublishDate);
            }

            // Append author as JSON string
            formData.append("author", JSON.stringify({
                name: userAccount.username || userAccount.email,
                avatar: userAccount.image || ""
            }));

            // Separate existing images and new files
            const existingImages = selectedImages
                .filter(img => img.isExisting)
                .map(img => img.preview);

            formData.append("existingImages", JSON.stringify(existingImages));

            // Append image files (only new ones)
            selectedImages.forEach((img) => {
                if (img.file) {
                    formData.append("images", img.file);
                }
            });

            if (initialData) {
                await updateBlog(initialData._id, formData);
                toast.success("Cập nhật bài viết thành công!");
            } else {
                await createBlog(formData);
                toast.success("Bài viết của bạn đã được gửi thành công!");
            }
            onSuccess();
            handleClose();
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || "Có lỗi xảy ra khi gửi bài viết!");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setSubmitFormData({
            title: "",
            description: "",
            content: "",
            category: "CAMERA",
            readTime: 0,
            scheduledPublishDate: "",
        });
        setIsScheduled(false);
        setSelectedImages([]);
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
                    <style>{customDatePickerStyle}</style>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 30 }}
                        className="relative w-full max-w-4xl overflow-hidden rounded-[2.5rem] bg-white shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/20"
                    >
                        {/* Header Section */}
                        <div className="relative overflow-hidden bg-slate-900 px-8 py-8 md:px-12">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-accent-cyan/10 blur-[60px] rounded-full translate-y-1/2 -translate-x-1/2" />

                            <div className="relative z-10 flex items-center justify-between">
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-2 block">Trung tâm Sáng tạo Nội dung</span>
                                    <h2 className="font-display text-3xl md:text-4xl font-black text-white leading-tight">
                                        {initialData ? "Chỉnh sửa" : "Nâng tầm"} <br />
                                        <span className="text-primary italic">Bài viết</span>
                                    </h2>
                                </div>
                                <button
                                    onClick={handleClose}
                                    className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-white hover:bg-white/10 hover:rotate-90 transition-all duration-500 border border-white/5"
                                >
                                    <span className="material-symbols-outlined text-2xl">close</span>
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleSubmitBlog} className="max-h-[75vh] overflow-y-auto px-8 py-10 md:px-12 space-y-10 custom-scrollbar bg-slate-50/50">

                            {/* Section 1: Core Identity */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="h-8 w-1 bg-primary rounded-full" />
                                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">01. Thông tin cơ bản</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="md:col-span-2 group">
                                        <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-2 block ml-1 transition-colors group-focus-within:text-primary">Tiêu đề bài viết</label>
                                        <input
                                            name="title"
                                            value={submitFormData.title}
                                            onChange={handleInputChange}
                                            className="w-full rounded-2xl border-2 border-slate-100 bg-white px-5 py-4 text-sm font-medium outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/5 transition-all duration-300 shadow-sm"
                                            placeholder="Câu chuyện của bạn là gì?"
                                            required
                                        />
                                    </div>

                                    <div className="group" ref={dropdownRef}>
                                        <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-2 block ml-1 transition-colors group-focus-within:text-primary">Chuyên mục</label>
                                        <div className="relative">
                                            <button
                                                type="button"
                                                onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                                                className={`flex w-full items-center justify-between rounded-2xl border-2 px-5 py-4 text-sm font-bold transition-all duration-300 shadow-sm ${isCategoryOpen ? "border-primary/30 ring-4 ring-primary/5 bg-white" : "border-slate-100 bg-white hover:border-slate-200"
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`h-2.5 w-2.5 rounded-full ${CATEGORY_MAP[submitFormData.category]?.color || "bg-primary"}`} />
                                                    <span className="text-slate-700">{t(`blog.categories.${submitFormData.category}`, { defaultValue: "Chọn Chuyên mục" })}</span>
                                                </div>
                                                <span className={`material-symbols-outlined text-slate-400 transition-transform duration-300 ${isCategoryOpen ? "rotate-180" : ""}`}>expand_more</span>
                                            </button>

                                            <AnimatePresence>
                                                {isCategoryOpen && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                        transition={{ duration: 0.2 }}
                                                        className="absolute left-0 right-0 z-[110] mt-2 overflow-hidden rounded-[1.5rem] border border-slate-100 bg-white/90 p-2 shadow-2xl backdrop-blur-xl"
                                                    >
                                                        <div className="max-h-[240px] overflow-y-auto custom-scrollbar pr-1">
                                                            {Object.entries(CATEGORY_MAP).map(([key, { label, color }]) => (
                                                                <button
                                                                    key={key}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setSubmitFormData(prev => ({ ...prev, category: key }));
                                                                        setIsCategoryOpen(false);
                                                                    }}
                                                                    className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-bold transition-all hover:bg-slate-50 ${submitFormData.category === key ? "bg-primary/5 text-primary" : "text-slate-600"
                                                                        }`}
                                                                >
                                                                    <div className={`h-2 w-2 rounded-full ${color}`} />
                                                                    {t(`blog.categories.${key}`)}
                                                                    {submitFormData.category === key && (
                                                                        <span className="material-symbols-outlined ml-auto text-sm">check_circle</span>
                                                                    )}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>

                                    <div className="md:col-span-3 group bg-white p-5 rounded-2xl border-2 border-slate-100 shadow-sm transition-all hover:border-primary/20">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <label className="text-sm font-black text-slate-800 mb-1 block">Hẹn giờ xuất bản</label>
                                                <p className="text-[11px] text-slate-500 font-medium">Bật để lên lịch tự động xuất bản sau khi được duyệt</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsScheduled(!isScheduled);
                                                    if (isScheduled) {
                                                        setSubmitFormData(prev => ({ ...prev, scheduledPublishDate: "" }));
                                                    }
                                                }}
                                                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${isScheduled ? 'bg-primary' : 'bg-slate-200'}`}
                                            >
                                                <span
                                                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${isScheduled ? 'translate-x-6' : 'translate-x-1'}`}
                                                />
                                            </button>
                                        </div>

                                        <AnimatePresence>
                                            {isScheduled && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                                    animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                                                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                                    className="relative"
                                                >
                                                    <div className="relative mt-2">
                                                        <DatePicker
                                                            selected={submitFormData.scheduledPublishDate ? new Date(submitFormData.scheduledPublishDate) : null}
                                                            onChange={(date) => {
                                                                if (date === null) {
                                                                    handleInputChange({ target: { name: 'scheduledPublishDate', value: '' } });
                                                                    return;
                                                                }
                                                                // Verify if date is valid
                                                                if (date instanceof Date && !isNaN(date)) {
                                                                    handleInputChange({ target: { name: 'scheduledPublishDate', value: date.toISOString() } });
                                                                }
                                                            }}
                                                            onChangeRaw={(e) => e.preventDefault()} // Ngăn chặn gõ trực tiếp
                                                            showTimeInput
                                                            timeInputLabel="Nhập giờ:"
                                                            dateFormat="dd/MM/yyyy HH:mm"
                                                            placeholderText="Bấm vào để chọn ngày giờ"
                                                            minDate={new Date()}
                                                            wrapperClassName="w-full"
                                                            calendarClassName="custom-calendar"
                                                            portalId="root"
                                                            popperClassName="!z-[9999]"
                                                            className="w-full rounded-xl border-2 border-slate-100 bg-white px-5 py-3.5 pl-12 text-sm font-bold text-slate-700 outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all duration-300 shadow-sm cursor-pointer hover:border-primary/30"
                                                        />
                                                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-primary/60 pointer-events-none transition-colors">calendar_month</span>
                                                    </div>

                                                    {isScheduled && submitFormData.scheduledPublishDate && new Date(submitFormData.scheduledPublishDate) <= new Date() && (
                                                        <motion.p
                                                            initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                                                            className="text-[11px] text-red-500 mt-2 ml-2 font-bold flex items-center gap-1"
                                                        >
                                                            <span className="material-symbols-outlined text-[14px]">error</span>
                                                            Thời gian xuất bản phải lớn hơn thời điểm hiện tại.
                                                        </motion.p>
                                                    )}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Visual Elements */}
                            <div className="space-y-6">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-1 bg-accent-cyan rounded-full" />
                                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">02. Hình ảnh minh họa</h3>
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400 px-3 py-1 bg-slate-100 rounded-full">{selectedImages.length} {selectedImages.length === 1 ? 'ảnh' : 'ảnh'} đã thêm</span>
                                </div>

                                <div className="space-y-4">
                                    <div
                                        onClick={() => fileInputRef.current.click()}
                                        onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-primary', 'bg-primary/5', 'scale-[0.99]'); }}
                                        onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-primary', 'bg-primary/5', 'scale-[0.99]'); }}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            e.currentTarget.classList.remove('border-primary', 'bg-primary/5', 'scale-[0.99]');
                                            const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
                                            handleFiles(files);
                                        }}
                                        className="group relative flex flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-slate-200 bg-white p-12 transition-all duration-500 hover:border-primary/50 hover:bg-slate-50 cursor-pointer overflow-hidden shadow-sm active:scale-95"
                                    >
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            multiple
                                            accept="image/*,video/*"
                                            onChange={handleFileChange}
                                            className="hidden"
                                        />
                                        <div className="relative z-10 flex flex-col items-center gap-4">
                                            <div className="flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-lg shadow-primary/5">
                                                <span className="material-symbols-outlined text-3xl">add_photo_alternate</span>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-sm font-black text-slate-700 tracking-tight">Kéo thả hình ảnh vào đây</p>
                                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Định dạng PNG, JPG, hoặc WEBP chất lượng cao</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Scrollable Preview Bar */}
                                    {selectedImages.length > 0 && (
                                        <div className="flex gap-4 overflow-x-auto pb-4 pt-2 px-2 custom-scrollbar no-scrollbar">
                                            {selectedImages.map((img, idx) => {
                                                const isVideo = (img.file && img.file.type.startsWith('video/')) ||
                                                    (img.isExisting && /\.(mp4|mov|avi|webm)$/i.test(img.preview));

                                                return (
                                                    <motion.div
                                                        initial={{ opacity: 0, scale: 0.8 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        key={idx}
                                                        className="relative min-w-[120px] max-w-[120px] aspect-[4/5] rounded-2xl overflow-hidden border-2 border-slate-100 group shadow-md bg-slate-50"
                                                    >
                                                        {isVideo ? (
                                                            <video src={img.preview} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700" muted />
                                                        ) : (
                                                            <img src={img.preview} alt="preview" className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                                        )}

                                                        {/* Video Overlay */}
                                                        {isVideo && (
                                                            <div className="absolute inset-0 flex items-center justify-center bg-black/10 pointer-events-none">
                                                                <div className="h-8 w-8 rounded-full bg-white/80 flex items-center justify-center shadow-sm">
                                                                    <div className="w-0 h-0 border-t-[5px] border-t-transparent border-l-[8px] border-l-primary border-b-[5px] border-b-transparent ml-0.5" />
                                                                </div>
                                                            </div>
                                                        )}

                                                        {idx === 0 && (
                                                            <div className="absolute top-2 left-2 bg-primary/90 backdrop-blur-md text-white text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-widest shadow-lg">
                                                                {isVideo ? 'Video chính' : 'Ảnh bìa'}
                                                            </div>
                                                        )}
                                                        <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                                                                className="h-10 w-10 rounded-2xl bg-red-500 text-white flex items-center justify-center hover:scale-110 active:scale-90 transition-all shadow-xl shadow-red-500/30"
                                                            >
                                                                <span className="material-symbols-outlined text-xl">delete</span>
                                                            </button>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Section 3: Deep Dive */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="h-8 w-1 bg-emerald-400 rounded-full" />
                                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">03. Nội dung chi tiết</h3>
                                </div>

                                <div className="grid grid-cols-1 gap-8">
                                    <div className="group">
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 ml-1 transition-colors group-focus-within:text-primary">Tóm tắt nội dung</label>
                                            <span className="text-[10px] font-bold text-slate-300 uppercase letter-spacing-1">Ngắn gọn & Hấp dẫn</span>
                                        </div>
                                        <textarea
                                            name="description"
                                            value={submitFormData.description}
                                            onChange={handleInputChange}
                                            rows="3"
                                            className="w-full rounded-2xl border-2 border-slate-100 bg-white px-5 py-4 text-sm font-medium outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/5 transition-all duration-300 shadow-sm resize-none"
                                            placeholder="Tóm tắt tác động cốt lõi của bài viết..."
                                            required
                                        />
                                    </div>

                                    <div className="group">
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 ml-1 transition-colors group-focus-within:text-primary">Nội dung chi tiết</label>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Đọc trong: <span className="text-primary">{submitFormData.readTime} PHÚT</span></span>
                                            </div>
                                        </div>
                                        <div className="rounded-[2rem] overflow-hidden border-2 border-slate-100 bg-white shadow-sm ring-primary/5 focus-within:ring-4 transition-all overflow-hidden">
                                            <Editor
                                                apiKey={process.env.REACT_APP_TINYMCE_API_KEY}
                                                init={{
                                                    height: 480,
                                                    menubar: false,
                                                    plugins: "advlist autolink lists link image charmap preview anchor searchreplace visualblocks code fullscreen insertdatetime media table code help wordcount",
                                                    toolbar:
                                                        "undo redo | blocks | bold italic | " +
                                                        "alignleft aligncenter alignright | " +
                                                        "bullist numlist | removeformat",
                                                    content_style: `
                                                        body { 
                                                            font-family: 'Inter', Helvetica, Arial, sans-serif; 
                                                            font-size: 15px; 
                                                            color: #334155;
                                                            line-height: 1.6;
                                                            padding: 20px;
                                                        }
                                                        p { margin-bottom: 1em; }
                                                    `,
                                                    skin: "oxide",
                                                    toolbar_sticky: false,
                                                    promotion: false,
                                                    branding: false,
                                                    statusbar: false,
                                                    toolbar_location: 'top',
                                                }}
                                                value={submitFormData.content}
                                                onEditorChange={handleEditorChange}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer / Actions */}
                            <div className="pt-8 flex flex-col md:flex-row items-center gap-4">
                                <div className="space-y-4 w-full">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] text-center">
                                        Nội dung của bạn sẽ được quản trị viên kiểm duyệt trước khi xuất bản
                                    </p>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="relative group w-full overflow-hidden rounded-[1.5rem] bg-slate-900 py-6 font-black text-white text-lg transition-all duration-500 hover:scale-[1.02] active:scale-95 disabled:opacity-70 disabled:grayscale disabled:scale-100 disabled:cursor-not-allowed shadow-2xl shadow-slate-900/20"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-primary via-accent-cyan to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                                        <div className="relative z-10 flex items-center justify-center gap-3">
                                            {isSubmitting ? (
                                                <>
                                                    <div className="h-6 w-6 border-3 border-white/20 border-t-white rounded-full animate-spin" />
                                                    <span className="uppercase tracking-widest">{initialData ? "Đang cập nhật..." : "Đang xuất bản..."}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="material-symbols-outlined text-2xl">{initialData ? "auto_fix_high" : "rocket_launch"}</span>
                                                    <span className="uppercase tracking-[0.2em]">{initialData ? "Cập nhật bài viết" : "Xuất bản bài viết"}</span>
                                                </>
                                            )}
                                        </div>
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="md:w-auto w-full px-10 py-6 rounded-[1.5rem] bg-white border-2 border-slate-100 text-slate-400 font-black uppercase tracking-widest text-sm hover:bg-slate-50 hover:text-slate-600 transition-all active:scale-95"
                                >
                                    Hủy
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default SubmitBlogModal;
