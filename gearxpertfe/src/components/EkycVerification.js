import React, { useRef, useState, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';
import axios from '../service/AxiosCustomize';
import { useNavigate } from 'react-router-dom';
import imageCompression from 'browser-image-compression';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import Header from './navigation/Header';

const EkycVerification = ({ isModal = false, onClose, onSuccess }) => {
    const navigate = useNavigate();
    const user = useSelector(state => state.user.account);
    const webcamRef = useRef(null);
    const mediaPipeCameraRef = useRef(null);

    const [frontFile, setFrontFile] = useState(null);
    const [backFile, setBackFile] = useState(null);
    const [previewFront, setPreviewFront] = useState(null);
    const [previewBack, setPreviewBack] = useState(null);

    const [status, setStatus] = useState("Vui lòng nhìn thẳng và QUAY TỪ TỪ SANG TRÁI");
    const [isCaptured, setIsCaptured] = useState(false);
    const [result, setResult] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (user && user.isVerified && user.isVerifiedEkyc === true) {
            if (isModal) {
                if (onSuccess) onSuccess();
                if (onClose) onClose();
            } else {
                toast.info("Tài khoản của bạn đã được xác thực rồi! Không cần làm lại.");
                navigate('/');
            }
        }
    }, [user, navigate, isModal, onClose, onSuccess]);

    const handleFileChange = (e, type) => {
        const file = e.target.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            if (type === 'front') {
                setFrontFile(file);
                setPreviewFront(url);
            } else {
                setBackFile(file);
                setPreviewBack(url);
            }
        }
    };

    const captureAndVerify = useCallback(async () => {
        if (isLoading) return;
        setIsLoading(true);

        try {
            const imageSrc = webcamRef.current.getScreenshot();

            if (mediaPipeCameraRef.current) await mediaPipeCameraRef.current.stop();
            setIsCaptured(true);

            const res = await fetch(imageSrc);
            const selfieBlob = await res.blob();
            const selfieFile = new File([selfieBlob], "selfie.jpg", { type: "image/jpeg" });

            const options = {
                maxSizeMB: 0.2,
                maxWidthOrHeight: 1024,
                useWebWorker: true
            };

            const compressedFront = await imageCompression(frontFile, options);
            const compressedBack = await imageCompression(backFile, options);
            const compressedSelfie = await imageCompression(selfieFile, options);

            const formData = new FormData();
            formData.append('cccdFront', compressedFront);
            formData.append('cccdBack', compressedBack);
            formData.append('selfie', compressedSelfie);

            const response = await axios.post("/api/ekyc/verify", formData, {
                timeout: 300000
            });

            setResult(response.data ? response.data : response);

        } catch (error) {
            console.error("Lỗi upload:", error);

            if (error.response) {
                setResult({
                    success: false,
                    message: error.response.data.message || "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại CCCD."
                });
            } else {
                setResult({
                    success: false,
                    message: "Lỗi kết nối: Mạng yếu hoặc Server không phản hồi."
                });
            }
        } finally {
            setIsLoading(false);
            setIsCaptured(false);
        }
    }, [isLoading, frontFile, backFile]);

    const onResults = useCallback((results) => {
        if (!frontFile || !backFile) return;
        if (isCaptured || isLoading || !results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) return;

        const landmarks = results.multiFaceLandmarks[0];
        const nose = landmarks[1];
        const rightEar = landmarks[234];
        const distance = Math.abs(nose.x - rightEar.x);

        if (distance < 0.05) {
            setStatus("✅ Đã phát hiện người thật! Đang xử lý...");
            captureAndVerify();
        }
    }, [isCaptured, isLoading, frontFile, backFile, captureAndVerify]);

    useEffect(() => {
        if (!frontFile || !backFile) return;

        const faceMesh = new FaceMesh({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
        });
        faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.5 });
        faceMesh.onResults(onResults);

        if (webcamRef.current && webcamRef.current.video) {
            const camera = new Camera(webcamRef.current.video, {
                onFrame: async () => {
                    if (webcamRef.current?.video) {
                        await faceMesh.send({ image: webcamRef.current.video });
                    }
                },
                width: 640, height: 480
            });
            camera.start();
            mediaPipeCameraRef.current = camera;
        }

        return () => {
            if (mediaPipeCameraRef.current) mediaPipeCameraRef.current.stop();
        };
    }, [onResults, frontFile, backFile]);

    const handleSuccessClick = () => {
        if (isModal) {
            if (onSuccess) onSuccess();
            if (onClose) onClose();
        } else {
            navigate('/profile');
        }
    };

    const UploadBox = ({ label, preview, onChange, id }) => (
        <div className="flex-1">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 text-center">{label}</h4>
            <label htmlFor={id} className={`group relative flex flex-col items-center justify-center h-32 rounded-2xl border-2 border-dashed transition-all duration-300 overflow-hidden cursor-pointer ${preview ? 'border-indigo-400 bg-indigo-50/30' : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50'}`}>
                {preview ? (
                    <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                    <div className="text-center p-4">
                        <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:bg-indigo-100 transition-colors">
                            <span className="material-symbols-outlined text-slate-400 group-hover:text-indigo-600">upload_file</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 group-hover:text-indigo-600 transition-colors">CHỌN ẢNH</span>
                    </div>
                )}
                <input type="file" id={id} className="hidden" accept="image/*" onChange={onChange} />
                {preview && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-white text-[10px] font-bold">THAY ĐỔI</span>
                    </div>
                )}
            </label>
        </div>
    );

    const MainContent = () => {
        return (
            <AnimatePresence mode="wait">
                {result?.success ? (
                    <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="p-10 text-center"
                    >
                        <div className="relative inline-block mb-6">
                            <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto relative z-10">
                                <span className="material-symbols-outlined text-5xl">task_alt</span>
                            </div>
                            <div className="absolute inset-0 bg-emerald-400 rounded-full blur-2xl opacity-20 animate-pulse"></div>
                        </div>
                        <h2 className="text-3xl font-bold text-slate-900 mb-2 font-display">Xác thực thành công!</h2>
                        <p className="text-slate-600 mb-8 max-w-sm mx-auto">{result.message}</p>
                        <button
                            onClick={handleSuccessClick}
                            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-200 hover:shadow-indigo-300 hover:scale-[1.02] transition-all"
                        >
                            Hoàn tất & Quay lại
                        </button>
                    </motion.div>
                ) : result?.success === false ? (
                    <motion.div
                        key="failure"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="p-10 text-center"
                    >
                        <div className="relative inline-block mb-6">
                            <div className="w-24 h-24 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto relative z-10">
                                <span className="material-symbols-outlined text-5xl">error</span>
                            </div>
                            <div className="absolute inset-0 bg-rose-400 rounded-full blur-2xl opacity-20 animate-pulse"></div>
                        </div>
                        <h2 className="text-3xl font-bold text-slate-900 mb-2 font-display">Xác thực thất bại</h2>
                        <p className="text-slate-600 mb-8 max-w-sm mx-auto">{result.message || "Đã có lỗi xảy ra trong quá trình xác thực. Vui lòng thử lại."}</p>
                        <button
                            onClick={() => {
                                setResult(null);
                                setFrontFile(null);
                                setPreviewFront(null);
                                setBackFile(null);
                                setPreviewBack(null);
                                setStatus("Vui lòng nhìn thẳng và QUAY TỪ TỪ SANG TRÁI");
                            }}
                            className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-lg hover:bg-slate-800 hover:scale-[1.02] transition-all"
                        >
                            Thử lại ngay
                        </button>
                    </motion.div>
                ) : (
                    <motion.div
                        key="form"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="p-8"
                    >
                        {/* Step 1: CCCD Upload */}
                        <div className={`transition-all duration-700 ease-in-out ${(frontFile && backFile) ? 'opacity-40 grayscale blur-[1px] -translate-y-4 scale-95 origin-top' : 'opacity-100'}`}>
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-bold shadow-lg shadow-indigo-200 rotate-3">1</div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900 leading-none">Ảnh CCCD</h3>
                                        <p className="text-xs text-slate-500 mt-1">Vui lòng tải lên cả hai mặt của CCCD</p>
                                    </div>
                                </div>
                                {frontFile && backFile && (
                                    <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full text-xs font-bold ring-1 ring-emerald-100">
                                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                                        ĐÃ CHỌN
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-4">
                                <UploadBox id="frontCccd" label="Mặt trước" preview={previewFront} onChange={(e) => handleFileChange(e, 'front')} />
                                <UploadBox id="backCccd" label="Mặt sau" preview={previewBack} onChange={(e) => handleFileChange(e, 'back')} />
                            </div>
                        </div>

                        {/* Step 2: Face Scan */}
                        {frontFile && backFile && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-8 border-t border-slate-100 pt-8"
                            >
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-bold shadow-lg shadow-indigo-200 -rotate-3">2</div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900 leading-none">Quét khuôn mặt</h3>
                                        <p className="text-xs text-slate-500 mt-1">AI sẽ tự động nhận diện khuôn mặt của bạn</p>
                                    </div>
                                </div>

                                <div className={`relative p-4 rounded-3xl mb-6 text-center text-sm font-bold border-2 transition-all duration-300 ${isLoading ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-slate-50 text-slate-700 border-slate-100'}`}>
                                    {isLoading ? (
                                        <div className="flex items-center justify-center gap-3">
                                            <div className="flex gap-1">
                                                <span className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                                <span className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                                <span className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"></span>
                                            </div>
                                            ĐANG XỬ LÝ DỮ LIỆU...
                                        </div>
                                    ) : (
                                        <span className="flex items-center justify-center gap-2">
                                            <span className="material-symbols-outlined animate-pulse text-[18px]">visibility</span>
                                            {status}
                                        </span>
                                    )}
                                </div>

                                <div className="relative w-full max-w-sm mx-auto aspect-[4/3] bg-slate-900 rounded-[40px] overflow-hidden shadow-2xl border-4 border-white ring-1 ring-slate-100 transform transition-transform hover:scale-[1.01]">
                                    {!isCaptured ? (
                                        <>
                                            <Webcam
                                                ref={webcamRef}
                                                screenshotFormat="image/jpeg"
                                                className="w-full h-full object-cover transform -scale-x-100"
                                            />
                                            {/* AI Scanning Frame */}
                                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                                <div className="w-48 h-64 border-2 border-indigo-400/50 rounded-[50%] shadow-[0_0_0_1000px_rgba(15,23,42,0.6)] z-10 relative">
                                                    {/* Animated Corners */}
                                                    <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-indigo-400 rounded-tl-2xl"></div>
                                                    <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-indigo-400 rounded-tr-2xl"></div>
                                                    <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-indigo-400 rounded-bl-2xl"></div>
                                                    <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-indigo-400 rounded-br-2xl"></div>

                                                    {/* Scanning Line */}
                                                    <div className="absolute w-full h-1 bg-gradient-to-r from-transparent via-indigo-400 to-transparent top-0 animate-scan z-20 shadow-[0_0_15px_rgba(99,102,241,0.5)]"></div>

                                                    {/* Progress Points */}
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <div className="relative w-full h-full opacity-20">
                                                            {[...Array(8)].map((_, i) => (
                                                                <div
                                                                    key={i}
                                                                    className="absolute bg-indigo-400 w-1 h-1 rounded-full"
                                                                    style={{
                                                                        top: `${50 + 40 * Math.sin(i * Math.PI / 4)}%`,
                                                                        left: `${50 + 40 * Math.cos(i * Math.PI / 4)}%`
                                                                    }}
                                                                ></div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="absolute bottom-6 left-0 right-0 text-center z-20">
                                                <div className="bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-full inline-flex items-center gap-2 border border-white/10">
                                                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                                                    <span className="text-white text-[10px] font-bold tracking-widest uppercase">AI Nhận Diện Hoạt Động</span>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-white gap-4">
                                            <div className="w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center animate-bounce shadow-glow-indigo">
                                                <span className="material-symbols-outlined text-4xl">face</span>
                                            </div>
                                            <div className="text-center">
                                                <p className="font-bold tracking-widest text-indigo-300">DỮ LIỆU ĐÃ CHỤP</p>
                                                <p className="text-xs text-white/60 mt-1 uppercase">Đang tiến hành đối soát...</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        );
    };

    if (isModal) {
        return (
            <div className="bg-white rounded-[40px] overflow-hidden max-h-[95vh] flex flex-col relative">
                {/* Decorative Background Blur */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-100 rounded-full blur-[100px] opacity-40 -mr-32 -mt-32"></div>

                <div className="bg-white/80 backdrop-blur-xl p-6 sticky top-0 z-[100] flex justify-between items-center border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 flex-shrink-0 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg ring-4 ring-indigo-50">
                            <span className="material-symbols-outlined text-white text-[24px]">person_check</span>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 font-display uppercase tracking-tight">Xác thực eKYC</h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Hệ thống bảo mật GearXpert</p>
                        </div>
                    </div>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="w-10 h-10 flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-900 rounded-full transition-all"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    )}
                </div>

                <div className="flex-grow overflow-y-auto">
                    <MainContent />
                </div>

                <div className="p-4 bg-slate-50/50 border-t border-slate-100 text-center">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-[12px]">security</span>
                        Mã hóa đầu cuối SSL 256-bit
                    </p>
                </div>

                <style jsx>{`
                    @keyframes scan {
                        0% { top: 10%; opacity: 0; }
                        50% { opacity: 1; }
                        100% { top: 90%; opacity: 0; }
                    }
                    .animate-scan { animation: scan 2.5s ease-in-out infinite; }
                    .shadow-glow-indigo { box-shadow: 0 0 20px rgba(99, 102, 241, 0.4); }
                `}</style>
            </div>
        );
    }

    return (
        <>
            <Header />
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden">
                {/* Background Decorations */}
                <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-indigo-100/50 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-cyan-100/30 rounded-full blur-[100px] translate-x-1/2 translate-y-1/2"></div>

                <div className="w-full max-w-xl bg-white/90 backdrop-blur-2xl rounded-[48px] shadow-2xl border border-white relative z-10 overflow-hidden">
                    <div className="bg-indigo-600 p-10 text-center relative overflow-hidden">
                        {/* Abstract Shapes */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/5 rounded-full -ml-12 -mb-12"></div>

                        <div className="w-16 h-16 flex-shrink-0 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center mb-6 ring-1 ring-white/20 mx-auto">
                            <span className="material-symbols-outlined text-white text-4xl">verified_user</span>
                        </div>
                        <h2 className="text-3xl font-bold text-white font-display uppercase tracking-tight">Xác thực danh tính</h2>
                        <p className="text-indigo-100/80 text-sm mt-2 max-w-xs mx-auto">
                            Quy trình eKYC chuẩn quốc tế, bảo mật tuyệt đối thông tin cá nhân của bạn.
                        </p>
                    </div>
                    <MainContent />

                    <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">
                            Powered by GearXpert Security System v2.0
                        </p>
                    </div>
                </div>

                <style jsx>{`
                    @keyframes scan {
                        0% { top: 10%; opacity: 0; }
                        50% { opacity: 1; }
                        100% { top: 90%; opacity: 0; }
                    }
                    .animate-scan { animation: scan 2.5s ease-in-out infinite; }
                `}</style>
            </div>
        </>
    );
};

export default EkycVerification;