import { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import {
    FiFileText,
    FiShield,
    FiCheck,
    FiEdit3,
    FiArrowRight,
    FiX,
    FiEye,
} from "react-icons/fi";
import SignatureCanvas from "react-signature-canvas";
import {
    previewSupplierContract,
    requestBecomeSupplier,
} from "../../service/ApiService/SupplierApi";

import Header from "../../components/navigation/Header";
import Footer from "../../components/homepage/Footer";
import { useI18n } from "../../i18n/I18nContext";

export default function BecomeSupplierPage() {
    const navigate = useNavigate();
    const userAccount = useSelector((state) => state.user.account);
    const isAuthenticated = useSelector((state) => state.user.isAuthenticated);
    const { t, locale } = useI18n();

    const [agreed, setAgreed] = useState(false);
    const [signature, setSignature] = useState("");
    const [signatureDataUrl, setSignatureDataUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);

    const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
    const termsRef = useRef(null);
    const sigCanvas = useRef(null);

    useEffect(() => {
        if (!isAuthenticated) {
            toast.warning(t("becomeSupplier.requireLogin"));
            navigate("/signin");
            return;
        }

        if (userAccount?.role === "SUPPLIER") {
            toast.info(t("becomeSupplier.alreadySupplier"));
            navigate("/supplier/dashboard");
            return;
        }

        if (!userAccount?.isVerifiedEkyc) {
            toast.error(t("becomeSupplier.requireEkyc"));
            navigate("/profile");
        }
    }, [isAuthenticated, userAccount, navigate, t]);

    useEffect(() => {
        if (userAccount?.fullName && !signature) {
            setSignature(userAccount.fullName);
        }
    }, [userAccount, signature]);

    const handleScroll = () => {
        if (termsRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = termsRef.current;
            if (scrollTop + clientHeight >= scrollHeight - 10) {
                setHasScrolledToBottom(true);
            }
        }
    };

    const handlePreviewContract = async () => {
        if (!hasScrolledToBottom) {
            return toast.warning(t("becomeSupplier.mustScroll"));
        }
        if (!agreed) {
            return toast.error(t("becomeSupplier.mustAgree"));
        }
        if (!signatureDataUrl) {
            return toast.error(t("becomeSupplier.mustSignBeforePreview"));
        }

        setIsPreviewLoading(true);
        try {
            const payload = {
                signerName: signature || userAccount?.fullName || "",
                currentDate: new Date().toLocaleDateString(locale),
                signatureDataUrl,
            };
            const blob = await previewSupplierContract(payload);
            const url = window.URL.createObjectURL(blob);
            window.open(url, "_blank");
        } catch (error) {
            console.error("Preview supplier contract error:", error);
            toast.error(error.response?.data?.message || t("becomeSupplier.previewFail"));
        } finally {
            setIsPreviewLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!hasScrolledToBottom) {
            toast.error(t("becomeSupplier.mustScroll"));
            return;
        }
        if (!agreed) {
            toast.error(t("becomeSupplier.mustAgree"));
            return;
        }
        if (!signature) {
            toast.error(t("becomeSupplier.mustEnterName"));
            return;
        }
        if (!signatureDataUrl) {
            toast.error(t("becomeSupplier.mustSignBeforeSubmit"));
            return;
        }

        setLoading(true);
        try {
            const response = await requestBecomeSupplier({
                agreedToTerms: agreed,
                signerName: signature,
                signatureDataUrl,
            });
            console.log(response)
            if (response.success === true) {
                if (response.signedPdfUrl) {
                    window.open(response.signedPdfUrl, "_blank");
                }
                toast.success(t("becomeSupplier.submitSuccess"));
                navigate("/profile");
            } else {
                toast.error(response.message || t("becomeSupplier.submitFail"));
            }
        } catch (error) {
            console.error("Error submitting contract:", error);
            toast.error(error.response?.data?.message || t("becomeSupplier.submitFail"));
        } finally {
            setLoading(false);
        }
    };

    if (!isAuthenticated || !userAccount?.isVerifiedEkyc) return null;

    return (
        <div className="min-h-screen flex flex-col bg-slate-50/50 relative overflow-hidden">
            <Header />

            {/* Ambient Background */}
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

                            {/* Khung chứa điều khoản có sự kiện cuộn */}
                            <div
                                ref={termsRef}
                                onScroll={handleScroll}
                                className="bg-slate-50/80 border border-slate-200 rounded-2xl p-6 h-72 overflow-y-auto text-sm text-slate-600 space-y-5 custom-scrollbar shadow-inner"
                            >
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
                            <label className={`flex items-start gap-4 ${hasScrolledToBottom ? 'cursor-pointer group' : 'cursor-not-allowed opacity-70'}`}>
                                <div className="relative flex items-center justify-center mt-0.5 shrink-0">
                                    <input
                                        type="checkbox"
                                        className="peer sr-only"
                                        checked={agreed}
                                        disabled={!hasScrolledToBottom}
                                        onChange={(e) => setAgreed(e.target.checked)}
                                    />
                                    <div className={`w-6 h-6 rounded-lg border-2 transition-all flex items-center justify-center shadow-sm ${hasScrolledToBottom ? 'border-slate-300 peer-checked:bg-primary peer-checked:border-primary group-hover:border-primary' : 'border-slate-200 bg-slate-100'}`}>
                                        <FiCheck className="text-white opacity-0 peer-checked:opacity-100 transition-opacity" size={14} />
                                    </div>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-slate-700 font-medium select-none leading-relaxed">
                                        Tôi đã đọc, hiểu rõ và đồng ý tuân thủ toàn bộ các Điều khoản & Nghĩa vụ của nền tảng GearXpert.
                                        <a
                                            href="/contracts/GearXpert_Contact_Supplier.pdf"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-primary hover:text-indigo-800 hover:underline font-bold ml-1 transition-colors"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            (Xem toàn văn hợp đồng tại đây)
                                        </a>
                                    </span>
                                    {!hasScrolledToBottom && (
                                        <span className="text-sm text-rose-500 font-medium mt-1">
                                            * Vui lòng cuộn xuống đọc hết tóm tắt điều khoản phía trên để xác nhận.
                                        </span>
                                    )}
                                </div>
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
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                                        Họ tên xác nhận
                                    </label>
                                    <input
                                        type="text"
                                        value={signature}
                                        onChange={(e) => setSignature(e.target.value)}
                                        placeholder="Nhập họ và tên của bạn..."
                                        required
                                        disabled={!hasScrolledToBottom}
                                        className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium text-slate-900 placeholder:text-slate-400 text-lg shadow-sm disabled:opacity-60 disabled:bg-slate-50 disabled:cursor-not-allowed"
                                    />
                                    <p className="mt-2 text-xs text-slate-500">
                                        * Nên trùng với họ tên đã eKYC để tránh tranh chấp.
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                                        Chữ ký điện tử (vẽ)
                                    </label>
                                    <div className="border-2 border-slate-300 rounded-2xl overflow-hidden bg-white">
                                        <SignatureCanvas
                                            ref={sigCanvas}
                                            penColor="black"
                                            canvasProps={{
                                                width: 520,
                                                height: 180,
                                                className:
                                                    "w-full touch-none cursor-crosshair",
                                            }}
                                        />
                                    </div>
                                    <div className="mt-3 flex gap-3 justify-end">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (sigCanvas.current) {
                                                    sigCanvas.current.clear();
                                                    setSignatureDataUrl(null);
                                                }
                                            }}
                                            disabled={!hasScrolledToBottom}
                                            className="px-5 py-2.5 bg-red-100 text-red-700 rounded-xl font-bold hover:bg-red-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                        >
                                            Xóa
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (
                                                    sigCanvas.current &&
                                                    !sigCanvas.current.isEmpty()
                                                ) {
                                                    let canvasToUse;
                                                    try {
                                                        canvasToUse =
                                                            sigCanvas.current.getTrimmedCanvas();
                                                    } catch (err) {
                                                        console.warn(
                                                            "getTrimmedCanvas failed, fallback to full canvas:",
                                                            err
                                                        );
                                                        canvasToUse =
                                                            sigCanvas.current.getCanvas();
                                                    }
                                                    const dataUrl =
                                                        canvasToUse.toDataURL("image/png");
                                                    setSignatureDataUrl(dataUrl);
                                                    toast.success(t("becomeSupplier.signatureSaved"));
                                                } else {
                                                    toast.warning(
                                                        t("becomeSupplier.mustDrawSignature")
                                                    );
                                                }
                                            }}
                                            disabled={!hasScrolledToBottom}
                                            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                        >
                                            {t("becomeSupplier.confirmSignature")}
                                        </button>
                                    </div>

                                    {signatureDataUrl && (
                                        <div className="mt-4 text-center">
                                            <p className="text-xs font-bold text-emerald-700 mb-2">
                                                {t("becomeSupplier.savedSignature")}
                                            </p>
                                            <img
                                                src={signatureDataUrl}
                                                alt="Chữ ký điện tử"
                                                className="border border-slate-300 rounded-xl max-w-full h-auto mx-auto shadow-sm bg-white"
                                            />
                                        </div>
                                    )}
                                </div>
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
                                {t("becomeSupplier.cancel")}
                            </button>
                            <button
                                type="button"
                                onClick={handlePreviewContract}
                                disabled={!agreed || !signatureDataUrl || isPreviewLoading}
                                className="w-full sm:w-auto px-8 py-4 bg-indigo-50 text-indigo-700 rounded-2xl font-bold hover:bg-indigo-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isPreviewLoading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-indigo-300 border-t-indigo-700 rounded-full animate-spin"></div>
                                        {t("becomeSupplier.previewing")}
                                    </>
                                ) : (
                                    <>
                                        <FiEye size={18} />
                                        {t("becomeSupplier.previewContract")}
                                    </>
                                )}
                            </button>
                            <button
                                type="submit"
                                disabled={!agreed || !signature || !signatureDataUrl || loading}
                                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-indigo-600 to-primary text-white rounded-2xl font-bold hover:shadow-[0_8px_30px_rgba(79,70,229,0.3)] hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center justify-center gap-2 group/btn"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        {t("becomeSupplier.processing")}
                                    </>
                                ) : (
                                    <>
                                        {t("becomeSupplier.signAndSubmit")}
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
