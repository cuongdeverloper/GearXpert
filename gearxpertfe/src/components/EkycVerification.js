import React, { useRef, useState, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';
import axios from '../service/AxiosCustomize';

const EkycVerification = () => {
    const webcamRef = useRef(null);
    const [cccdFile, setCccdFile] = useState(null);
    const [previewCccd, setPreviewCccd] = useState(null);
    const [status, setStatus] = useState("Vui lòng nhìn thẳng và QUAY TỪ TỪ SANG TRÁI");
    const [isCaptured, setIsCaptured] = useState(false);
    const [result, setResult] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    // Xử lý khi chọn ảnh CCCD
    const handleCccdChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setCccdFile(file);
            setPreviewCccd(URL.createObjectURL(file));
        }
    };

    // LOGIC AI: Phát hiện hành động quay đầu
    const onResults = useCallback((results) => {
        if (!cccdFile) return;

        if (isCaptured || isLoading || !results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) return;

        const landmarks = results.multiFaceLandmarks[0];
        const nose = landmarks[1];
        const rightEar = landmarks[234];

        const distance = Math.abs(nose.x - rightEar.x);

        if (distance < 0.05) {
            setIsCaptured(true);
            setStatus("✅ Đã phát hiện người thật! Đang gửi dữ liệu...");
            captureAndVerify();
        }
    }, [isCaptured, isLoading, cccdFile]);

    // Setup Camera & MediaPipe
    useEffect(() => {
        if (!cccdFile) return;

        const faceMesh = new FaceMesh({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
        });
        faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.5 });
        faceMesh.onResults(onResults);

        if (webcamRef.current && webcamRef.current.video) {
            const camera = new Camera(webcamRef.current.video, {
                onFrame: async () => {
                    if (webcamRef.current?.video) await faceMesh.send({ image: webcamRef.current.video });
                },
                width: 640, height: 480
            });
            camera.start();
        }
    }, [onResults, cccdFile]);

    // HÀM GỌI API BACKEND
    const captureAndVerify = async () => {
        setIsLoading(true);
        try {
            const imageSrc = webcamRef.current.getScreenshot();
            const blob = await (await fetch(imageSrc)).blob();

            const formData = new FormData();
            formData.append('cccd', cccdFile);
            formData.append('selfie', blob, 'selfie.jpg');

            const response = await axios.post("/api/ekyc/verify", formData);

            setResult(response.data ? response.data : response);
            setIsLoading(false);

        } catch (error) {
            console.error("Lỗi upload:", error);
            if (error.response) {
                setStatus(`❌ Lỗi: ${error.response.data.message || "Bad Request"}`);
            } else {
                setStatus("❌ Lỗi kết nối Server");
            }
            setIsLoading(false);
            setIsCaptured(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
            <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl overflow-hidden">
                {/* HEADER */}
                <div className="bg-indigo-600 p-6 text-center">
                    <h2 className="text-2xl font-bold text-white tracking-wide uppercase">
                        Xác thực danh tính (eKYC)
                    </h2>
                    <p className="text-indigo-100 text-sm mt-1">Hệ thống nhận diện khuôn mặt tự động</p>
                </div>

                <div className="p-8">
                    {/* BƯỚC 1: UPLOAD CCCD */}
                    {!result && (
                        <div className={`transition-all duration-500 ${cccdFile ? 'mb-8 opacity-50 pointer-events-none' : 'mb-0'}`}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-700 flex items-center">
                                    <span className="bg-indigo-600 text-white w-8 h-8 rounded-full flex items-center justify-center mr-2 text-sm">1</span>
                                    Tải lên ảnh CCCD/CMND
                                </h3>
                                {previewCccd && <span className="text-green-600 text-sm font-medium">✓ Đã chọn ảnh</span>}
                            </div>

                            <div className="flex flex-col md:flex-row gap-6 items-center">
                                <label className="flex-1 w-full flex flex-col items-center justify-center h-48 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 hover:border-indigo-400 transition-colors group">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <svg className="w-10 h-10 mb-3 text-gray-400 group-hover:text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                                        <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Nhấn để tải lên</span> hoặc kéo thả</p>
                                        <p className="text-xs text-gray-400">PNG, JPG (Tối đa 5MB)</p>
                                    </div>
                                    <input type="file" className="hidden" accept="image/*" onChange={handleCccdChange} />
                                </label>

                                {previewCccd && (
                                    <div className="w-full md:w-1/3 h-48 border border-gray-200 rounded-xl overflow-hidden shadow-sm relative bg-gray-100">
                                        <img src={previewCccd} alt="CCCD Preview" className="w-full h-full object-contain" />
                                        <button 
                                            onClick={() => {setCccdFile(null); setPreviewCccd(null);}}
                                            className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md hover:bg-red-50 text-red-500"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* BƯỚC 2: CAMERA QUÉT MẶT */}
                    {cccdFile && !result && (
                        <div className="animate-fade-in-up">
                             <div className="flex items-center mb-4">
                                <h3 className="text-lg font-semibold text-gray-700 flex items-center">
                                    <span className="bg-indigo-600 text-white w-8 h-8 rounded-full flex items-center justify-center mr-2 text-sm">2</span>
                                    Xác thực khuôn mặt
                                </h3>
                            </div>

                            <div className={`p-4 rounded-lg mb-4 text-center font-medium border ${isLoading ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-yellow-50 text-yellow-800 border-yellow-200'}`}>
                                {isLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-5 w-5 text-blue-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Đang xử lý AI...
                                    </span>
                                ) : status}
                            </div>
                            
                            <div className="relative w-full max-w-lg mx-auto aspect-[4/3] bg-black rounded-2xl overflow-hidden shadow-2xl border-4 border-gray-800 group">
                                <Webcam
                                    ref={webcamRef}
                                    screenshotFormat="image/jpeg"
                                    className="w-full h-full object-cover transform -scale-x-100"
                                />
                                
                                {/* Overlay khung mặt */}
                                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                    <div className="w-48 h-64 border-4 border-dashed border-green-400/70 rounded-[50%] shadow-[0_0_1000px_0_rgba(0,0,0,0.5)] z-10 relative">
                                        {/* Scanner effect line */}
                                        <div className="absolute w-full h-1 bg-green-400/50 top-0 animate-scan"></div>
                                    </div>
                                </div>

                                {/* Text hướng dẫn */}
                                <div className="absolute bottom-4 left-0 right-0 text-center z-20">
                                    <p className="text-white/80 text-sm bg-black/50 inline-block px-3 py-1 rounded-full backdrop-blur-sm">
                                        Giữ khuôn mặt trong khung hình
                                    </p>
                                </div>
                            </div>
                            <p className="text-center text-gray-400 text-sm italic mt-3">
                                Hệ thống sẽ tự động chụp khi bạn quay mặt sang trái.
                            </p>
                        </div>
                    )}

                    {/* KẾT QUẢ */}
                    {result && (
                        <div className="animate-fade-in text-center py-8">
                            <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full mb-6 ${result.success ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                {result.success ? (
                                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                ) : (
                                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                )}
                            </div>

                            <h2 className={`text-3xl font-bold mb-2 ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                                {result.success ? 'Xác thực thành công!' : 'Xác thực thất bại'}
                            </h2>
                            
                            <div className="bg-gray-50 rounded-lg p-4 max-w-sm mx-auto mb-8 border border-gray-200">
                                <p className="text-gray-600 mb-1">Độ khớp khuôn mặt</p>
                                <p className="text-2xl font-bold text-gray-800">{result.confidence}%</p>
                                <p className="text-sm text-gray-500 mt-2 border-t pt-2 border-gray-200">{result.message}</p>
                            </div>

                            {result.success ? (
                                <button 
                                    onClick={() => alert("Chuyển trang tiếp theo...")}
                                    className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-lg hover:bg-indigo-700 transform hover:-translate-y-0.5 transition-all focus:ring-4 focus:ring-indigo-300"
                                >
                                    Tiếp tục
                                </button>
                            ) : (
                                <button 
                                    onClick={() => window.location.reload()}
                                    className="px-8 py-3 bg-gray-800 text-white font-semibold rounded-lg shadow-lg hover:bg-gray-900 transform hover:-translate-y-0.5 transition-all focus:ring-4 focus:ring-gray-300"
                                >
                                    Thử lại
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
            
            {/* Custom Styles cho animation scan */}
            <style jsx>{`
                @keyframes scan {
                    0% { top: 0%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
                .animate-scan {
                    animation: scan 2s linear infinite;
                }
            `}</style>
        </div>
    );
};

export default EkycVerification;