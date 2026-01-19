import React, { useRef, useState, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';
import axios from '../service/AxiosCustomize';
import { useNavigate } from 'react-router-dom';
import imageCompression from 'browser-image-compression';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import Header from './navigation/Header';

const EkycVerification = () => {
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
            toast.info("Tài khoản của bạn đã được xác thực rồi! Không cần làm lại.");
            navigate('/');
        }
    }, [user, navigate]);

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
                setStatus(`❌ Lỗi Server: ${error.response.data.message || "Xử lý thất bại"}`);
            } else {
                setStatus("❌ Lỗi kết nối: Mạng yếu hoặc Server không phản hồi.");
            }
        } finally {
            setIsLoading(false);
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
        navigate('/profile');
    };

    const UploadBox = ({ label, preview, onChange, id }) => (
        <div className="flex-1">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">{label}</h4>
            <label htmlFor={id} className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 hover:border-indigo-400 transition-colors relative overflow-hidden">
                {preview ? (
                    <img src={preview} alt="Preview" className="w-full h-full object-contain" />
                ) : (
                    <div className="text-center p-2">
                        <svg className="w-8 h-8 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                        <span className="text-xs text-gray-500">Chọn ảnh</span>
                    </div>
                )}
                <input type="file" id={id} className="hidden" accept="image/*" onChange={onChange} />
            </label>
        </div>
    );

    if (result?.success) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl text-center animate-fade-in">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Xác thực thành công!</h2>
                    <p className="text-gray-600 mb-6">{result.message}</p>
                    <button onClick={handleSuccessClick} className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-lg hover:bg-indigo-700 transition-all">
                        Hoàn tất & Về trang cá nhân
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            <Header />
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
                <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden">
                    <div className="bg-indigo-600 p-6 text-center">
                        <h2 className="text-2xl font-bold text-white uppercase">Xác thực danh tính (eKYC)</h2>
                        <p className="text-indigo-100 text-sm mt-1">Vui lòng cung cấp CCCD và quét khuôn mặt</p>
                    </div>

                    <div className="p-8">
                        <div className={`transition-all duration-500 ${(frontFile && backFile) ? 'mb-8 opacity-50 pointer-events-none' : 'mb-0'}`}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-700 flex items-center">
                                    <span className="bg-indigo-600 text-white w-8 h-8 rounded-full flex items-center justify-center mr-2 text-sm">1</span>
                                    Tải lên ảnh CCCD
                                </h3>
                                {frontFile && backFile && <span className="text-green-600 text-sm font-medium">✓ Đã chọn đủ ảnh</span>}
                            </div>
                            <div className="flex flex-row gap-4">
                                <UploadBox id="frontCccd" label="Mặt trước" preview={previewFront} onChange={(e) => handleFileChange(e, 'front')} />
                                <UploadBox id="backCccd" label="Mặt sau" preview={previewBack} onChange={(e) => handleFileChange(e, 'back')} />
                            </div>
                        </div>

                        {frontFile && backFile && (
                            <div className="animate-fade-in-up mt-8 border-t pt-8">
                                <div className="flex items-center mb-4">
                                    <h3 className="text-lg font-semibold text-gray-700 flex items-center">
                                        <span className="bg-indigo-600 text-white w-8 h-8 rounded-full flex items-center justify-center mr-2 text-sm">2</span>
                                        Xác thực khuôn mặt
                                    </h3>
                                </div>

                                <div className={`p-4 rounded-lg mb-4 text-center font-medium border ${isLoading ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-yellow-50 text-yellow-800 border-yellow-200'}`}>
                                    {isLoading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="animate-spin h-5 w-5 text-blue-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                            Đang xử lý AI...
                                        </span>
                                    ) : status}
                                </div>

                                <div className="relative w-full max-w-lg mx-auto aspect-[4/3] bg-black rounded-2xl overflow-hidden shadow-2xl border-4 border-gray-800 group">
                                    {!isCaptured ? (
                                        <>
                                            <Webcam ref={webcamRef} screenshotFormat="image/jpeg" className="w-full h-full object-cover transform -scale-x-100" />
                                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                                <div className="w-48 h-64 border-4 border-dashed border-green-400/70 rounded-[50%] shadow-[0_0_1000px_0_rgba(0,0,0,0.5)] z-10 relative">
                                                    <div className="absolute w-full h-1 bg-green-400/50 top-0 animate-scan"></div>
                                                </div>
                                            </div>
                                            <div className="absolute bottom-4 left-0 right-0 text-center z-20">
                                                <p className="text-white/80 text-sm bg-black/50 inline-block px-3 py-1 rounded-full backdrop-blur-sm">Giữ khuôn mặt trong khung hình</p>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white">
                                            <div className="text-center">
                                                <svg className="w-16 h-16 mx-auto mb-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                                <p>Đã chụp xong!</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {result?.success === false && (
                            <div className="animate-fade-in text-center py-8">
                                <h2 className="text-3xl font-bold mb-2 text-red-700">Xác thực thất bại</h2>
                                <p className="text-gray-600 mb-4">{result?.message}</p>
                                <button onClick={() => window.location.reload()} className="px-8 py-3 bg-gray-800 text-white font-semibold rounded-lg shadow-lg hover:bg-gray-900 transition-all">Thử lại</button>
                            </div>
                        )}
                    </div>
                </div>
                <style jsx>{`
                @keyframes scan { 0% { top: 0%; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
                .animate-scan { animation: scan 2s linear infinite; }
            `}</style>
            </div>
        </>

    );
};

export default EkycVerification;