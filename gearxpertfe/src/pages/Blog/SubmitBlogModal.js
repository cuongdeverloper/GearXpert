import React, { useState, useRef } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import { Editor } from "@tinymce/tinymce-react";
import { createBlog } from "../../service/ApiService/BlogApi";
import { CATEGORY_MAP } from "./BlogConstants";

const SubmitBlogModal = ({ isOpen, onClose, onSuccess }) => {
    const userAccount = useSelector((state) => state.user.account);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitFormData, setSubmitFormData] = useState({
        title: "",
        description: "",
        content: "",
        category: "CAMERA",
        readTime: 0,
        tags: "",
    });
    const [selectedImages, setSelectedImages] = useState([]); // Array of { file, preview }
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
        URL.revokeObjectURL(newImages[index].preview);
        newImages.splice(index, 1);
        setSelectedImages(newImages);
    };

    const handleSubmitBlog = async (e) => {
        e.preventDefault();

        if (!submitFormData.title || !submitFormData.description || !submitFormData.content || selectedImages.length === 0) {
            toast.error("Vui lòng điền đầy đủ các thông tin và đăng ít nhất 1 ảnh!");
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

            // Append author as JSON string
            formData.append("author", JSON.stringify({
                name: userAccount.username || userAccount.email,
                avatar: userAccount.image || ""
            }));

            // Append tags as JSON stringified array
            const tagsArray = submitFormData.tags.split(",").map(tag => tag.trim()).filter(tag => tag !== "");
            formData.append("tags", JSON.stringify(tagsArray));

            // Append image files
            selectedImages.forEach((img) => {
                formData.append("images", img.file);
            });

            await createBlog(formData);
            toast.success("Bài viết của bạn đã được gửi thành công!");
            onSuccess(); // Triggers parent refresh
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
            tags: "",
        });
        setSelectedImages([]);
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl"
                    >
                        <div className="flex items-center justify-between border-b border-slate-100 px-8 py-5">
                            <h2 className="font-display text-2xl font-bold text-slate-900">Submit Your Insight</h2>
                            <button
                                onClick={handleClose}
                                className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition-colors"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleSubmitBlog} className="max-h-[70vh] overflow-y-auto px-8 py-6 space-y-6 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2 lg:col-span-2">
                                    <label className="text-sm font-bold text-slate-700">Article Title *</label>
                                    <input
                                        name="title"
                                        value={submitFormData.title}
                                        onChange={handleInputChange}
                                        className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                        placeholder="Catchy title for your gear insight..."
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Category *</label>
                                    <select
                                        name="category"
                                        value={submitFormData.category}
                                        onChange={handleInputChange}
                                        className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    >
                                        {Object.entries(CATEGORY_MAP).map(([key, { label }]) => (
                                            <option key={key} value={key}>{label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Estimated Read Time (min) <span className="text-[10px] font-normal text-slate-400 italic">(Auto-calculated)</span></label>
                                    <input
                                        name="readTime"
                                        type="number"
                                        value={submitFormData.readTime}
                                        readOnly
                                        className="w-full rounded-xl border-slate-100 bg-slate-100/50 px-4 py-3 text-sm outline-none cursor-not-allowed text-slate-500 font-semibold transition-all"
                                        min="1"
                                    />
                                </div>

                                <div className="space-y-2 lg:col-span-2">
                                    <label className="text-sm font-bold text-slate-700">Artice Images</label>

                                    <div
                                        onClick={() => fileInputRef.current.click()}
                                        onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-primary', 'bg-primary/5'); }}
                                        onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-primary', 'bg-primary/5'); }}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            e.currentTarget.classList.remove('border-primary', 'bg-primary/5');
                                            const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
                                            handleFiles(files);
                                        }}
                                        className="group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-10 transition-all hover:border-primary hover:bg-primary/5 cursor-pointer overflow-hidden"
                                    >
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            multiple
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            className="hidden"
                                        />
                                        <div className="flex flex-col items-center gap-3 text-slate-400 group-hover:text-primary transition-colors">
                                            <span className="material-symbols-outlined text-4xl">cloud_upload</span>
                                            <div className="text-center">
                                                <p className="text-sm font-bold">Click or drag images here</p>
                                                <p className="text-xs">Support for PNG, JPG, WEBP</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Image Previews */}
                                    {selectedImages.length > 0 && (
                                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 mt-4">
                                            {selectedImages.map((img, idx) => (
                                                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 group">
                                                    <img src={img.preview} alt="preview" className="h-full w-full object-cover" />
                                                    {idx === 0 && (
                                                        <div className="absolute top-1 left-1 bg-primary text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-tighter">
                                                            Cover
                                                        </div>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                                                        className="absolute top-1 right-1 h-5 w-5 rounded-full bg-slate-900/50 text-white flex items-center justify-center hover:bg-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                                    >
                                                        <span className="material-symbols-outlined text-xs">close</span>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2 lg:col-span-2">
                                    <label className="text-sm font-bold text-slate-700">Short Description *</label>
                                    <textarea
                                        name="description"
                                        value={submitFormData.description}
                                        onChange={handleInputChange}
                                        rows="2"
                                        className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                                        placeholder="A brief summary to hook readers..."
                                        required
                                    />
                                </div>

                                <div className="space-y-2 lg:col-span-2">
                                    <label className="text-sm font-bold text-slate-700">Full Content *</label>
                                    <div className="rounded-xl overflow-hidden border border-slate-200">
                                        <Editor
                                            apiKey={process.env.REACT_APP_TINYMCE_API_KEY}
                                            init={{
                                                height: 400,
                                                menubar: false,
                                                plugins: [
                                                    "advlist autolink lists link image charmap print preview anchor",
                                                    "searchreplace visualblocks code fullscreen",
                                                    "insertdatetime media table paste code help wordcount"
                                                ],
                                                toolbar:
                                                    "undo redo | formatselect | bold italic backcolor | " +
                                                    "alignleft aligncenter alignright alignjustify | " +
                                                    "bullist numlist outdent indent | removeformat | help",
                                                content_style: "body { font-family:Inter,Helvetica,Arial,sans-serif; font-size:14px }"
                                            }}
                                            value={submitFormData.content}
                                            onEditorChange={handleEditorChange}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2 lg:col-span-2">
                                    <label className="text-sm font-bold text-slate-700">Tags (comma separated)</label>
                                    <input
                                        name="tags"
                                        value={submitFormData.tags}
                                        onChange={handleInputChange}
                                        className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                        placeholder="ARRI, lighting, field test..."
                                    />
                                </div>
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full flex items-center justify-center gap-3 rounded-2xl bg-primary py-4 text-white font-bold text-lg hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="h-5 w-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                            <span>Publishing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined">send</span>
                                            <span>Submit Article</span>
                                        </>
                                    )}
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
