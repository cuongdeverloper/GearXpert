import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import { FiFileText, FiShield, FiCheck, FiEdit3, FiArrowRight, FiX } from "react-icons/fi";
import { requestBecomeSupplier } from "../../service/ApiService/SupplierApi"; 

import Header from "../../components/navigation/Header";
import Footer from "../../components/homepage/Footer";

export default function BecomeSupplierPage() {
    const navigate = useNavigate();
    const userAccount = useSelector((state) => state.user.account);
    const isAuthenticated = useSelector((state) => state.user.isAuthenticated);

    const [agreed, setAgreed] = useState(false);
    const [signature, setSignature] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isAuthenticated) {
            toast.warning("Vui lòng đăng nhập để tiếp tục");
            navigate("/signin");
            return;
        }

        if (userAccount?.role === "SUPPLIER") {
            toast.info("Bạn đã là Nhà cung cấp của GearXpert rồi!");
            navigate("/supplier/dashboard");
            return;
        }

        if (!userAccount?.isVerifiedEkyc) {
            toast.error("Vui lòng xác thực danh tính (eKYC) trước khi ký hợp đồng!");
            navigate("/profile");
        }
    }, [isAuthenticated, userAccount, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!agreed) {
            toast.error("Bạn cần đồng ý với điều khoản dịch vụ để tiếp tục.");
            return;
        }

        if (signature.trim().toLowerCase() !== userAccount?.fullName?.toLowerCase()) {
            toast.error("Chữ ký phải khớp chính xác với Họ và tên của bạn trên hệ thống.");
            return;
        }

        setLoading(true);
        try {
            const response = await requestBecomeSupplier({
                agreedToTerms: agreed,
                contractSignature: signature,
            });

            if (response.errorCode === 0) {
                toast.success("Gửi yêu cầu hợp đồng thành công! Vui lòng chờ Admin phê duyệt.");
                navigate("/profile");
            } else {
                toast.error(response.message || "Có lỗi xảy ra, vui lòng thử lại.");
            }
        } catch (error) {
            console.error("Error submitting contract:", error);
            toast.error(error.response?.data?.message || "Lỗi kết nối đến máy chủ.");
        } finally {
            setLoading(false);
        }
    };

    if (!isAuthenticated || !userAccount?.isVerifiedEkyc) return null;

    return (
        <div className="min-h-screen flex flex-col bg-slate-50/50 relative overflow-hidden">
            <Header />

            {/* Ambient Background (Khớp với style AdminAdsPage) */}
            <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-indigo-50/50 to-transparent -z-10"></div>
            <div className="absolute top-[-100px] right-[-100px] w-[500px] h-[500px] bg-purple-100/40 rounded-full blur-3xl -z-10"></div>
            <div className="absolute top-[200px] left-[-100px] w-[300px] h-[300px] bg-cyan-100/40 rounded-full blur-3xl -z-10"></div>

            <main className="flex-grow w-full py-12 px-6 lg:px-10 max-w-[1000px] mx-auto z-10">
                {/* Tiêu đề trang */}
                <div className="mb-10 text-center">
                    <div className="inline-flex items-center gap-3 mb-2 text-primary font-bold tracking-wider text-xs uppercase bg-indigo-50 px-4 py-1.5 rounded-full border border-indigo-100">
                        <FiShield size={14} />
                        Đối tác GearXpert
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-slate-900 font-display mt-4">
                        Hợp Đồng Trở Thành Nhà Cung Cấp
                    </h1>
                    <p className="text-slate-500 mt-4 max-w-2xl mx-auto text-lg font-light">
                        Nâng cấp tài khoản để bắt đầu cho thuê thiết bị công nghệ của bạn. Vui lòng đọc kỹ các điều khoản trước khi xác nhận chữ ký điện tử.
                    </p>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", bounce: 0.3 }}
                    className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/50 relative"
                >
                    <form onSubmit={handleSubmit} className="p-8 md:p-12">
                        {/* Terms Box */}
                        <div className="mb-8">
                            <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2 font-display">
                                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                                    <FiFileText size={16} />
                                </div>
                                Điều khoản & Nghĩa vụ
                            </h3>
                            <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-6 h-72 overflow-y-auto text-sm text-slate-600 space-y-5 custom-scrollbar shadow-inner">
                                <p><strong>1. Quy định chung:</strong> Nhà cung cấp (Supplier) cam kết các thiết bị đăng tải trên nền tảng GearXpert thuộc quyền sở hữu hợp pháp hoặc có quyền cho thuê hợp lệ.</p>
                                <p><strong>2. Chất lượng thiết bị:</strong> Supplier có trách nhiệm đảm bảo thiết bị hoạt động tốt, đúng như mô tả và hình ảnh cung cấp. Mọi hư hỏng có sẵn phải được thông báo rõ ràng trước khi giao máy.</p>
                                <p><strong>3. Quy trình Identity Guardian:</strong> Cả Supplier và Customer phải tuân thủ nghiêm ngặt quy trình quay video/chụp ảnh đồng kiểm trước và sau khi thuê để làm bằng chứng giải quyết tranh chấp do GearXpert bảo lãnh.</p>
                                <p><strong>4. Quy định về cọc (Escrow):</strong> Mọi giao dịch đặt cọc phải được thực hiện thông qua hệ thống ví GearXpert. Nghiêm cấm mọi hành vi giao dịch tiền mặt bên ngoài hệ thống.</p>
                                <p><strong>5. Phí dịch vụ:</strong> GearXpert sẽ thu một khoản phí nền tảng dựa trên tổng giá trị đơn thuê thành công (chi tiết theo bảng phí dịch vụ hiện hành được cập nhật trên website).</p>
                                <p><strong>6. Bảo mật thông tin:</strong> Supplier cam kết không sử dụng thông tin cá nhân của Customer (như CCCD, số điện thoại) cho bất kỳ mục đích nào ngoài việc giao dịch trên hệ thống GearXpert.</p>
                                <p className="pt-4 border-t border-slate-200 text-slate-800">
                                    <em>* Bằng việc ký tên dưới đây, bạn xác nhận đã đọc, hiểu và đồng ý chịu trách nhiệm pháp lý với mọi chính sách của GearXpert.</em>
                                </p>
                            </div>
                        </div>

                        {/* Agreement Checkbox */}
                        <div className="mb-10 bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100">
                            <label className="flex items-start gap-4 cursor-pointer group">
                                <div className="relative flex items-center justify-center mt-0.5 shrink-0">
                                    <input
                                        type="checkbox"
                                        className="peer sr-only"
                                        checked={agreed}
                                        onChange={(e) => setAgreed(e.target.checked)}
                                    />
                                    <div className="w-6 h-6 rounded-lg border-2 border-slate-300 peer-checked:bg-primary peer-checked:border-primary transition-all flex items-center justify-center group-hover:border-primary shadow-sm">
                                        <FiCheck className="text-white opacity-0 peer-checked:opacity-100 transition-opacity" size={14} />
                                    </div>
                                </div>
                                <span className="text-slate-700 font-medium select-none leading-relaxed">
                                    Tôi đã đọc, hiểu rõ và đồng ý tuân thủ toàn bộ các Điều khoản & Nghĩa vụ của nền tảng GearXpert.
                                </span>
                            </label>
                        </div>

                        {/* Signature Input */}
                        <div className="mb-10">
                            <label className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-2 uppercase tracking-wider">
                                <FiEdit3 className="text-primary" />
                                Chữ ký số xác nhận <span className="text-rose-500">*</span>
                            </label>
                            <div className="flex items-center justify-between mb-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <p className="text-xs text-slate-500">Họ tên đăng ký trên hệ thống eKYC:</p>
                                <strong className="text-primary font-bold px-3 py-1 bg-indigo-50 rounded-lg text-sm border border-indigo-100">
                                    {userAccount?.fullName}
                                </strong>
                            </div>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={signature}
                                    onChange={(e) => setSignature(e.target.value)}
                                    placeholder="Nhập chính xác họ và tên của bạn..."
                                    required
                                    className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium text-slate-900 placeholder:text-slate-400 text-lg shadow-sm"
                                />
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row items-center justify-end gap-4 border-t border-slate-100 pt-8 mt-8">
                            <button
                                type="button"
                                onClick={() => navigate("/profile")}
                                className="w-full sm:w-auto px-8 py-4 border border-slate-200 bg-slate-50 rounded-2xl text-slate-600 font-bold hover:bg-slate-100 hover:text-slate-900 transition-all flex items-center justify-center gap-2"
                            >
                                <FiX size={18} />
                                Hủy bỏ
                            </button>
                            <button
                                type="submit"
                                disabled={!agreed || !signature || loading}
                                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-indigo-600 to-primary text-white rounded-2xl font-bold hover:shadow-[0_8px_30px_rgba(79,70,229,0.3)] hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center justify-center gap-2 group/btn"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        Đang xử lý...
                                    </>
                                ) : (
                                    <>
                                        Ký & Gửi yêu cầu
                                        <FiArrowRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </main>

            <Footer />
        </div>
    );
}