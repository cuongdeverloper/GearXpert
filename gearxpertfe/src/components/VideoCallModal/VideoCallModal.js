import React, { useEffect } from "react";

const VideoCallModal = ({ 
    stream, 
    callAccepted, 
    callEnded, 
    userVideo, 
    myVideo, 
    answerCall, 
    leaveCall, 
    receivingCall, 
    name, 
    isCalling 
}) => {

  // 🟢 FIX LỖI: Tự động gắn stream vào video nhỏ khi modal hiện lên
  useEffect(() => {
    if (myVideo.current && stream) {
      myVideo.current.srcObject = stream;
    }
  }, [stream, myVideo]);

  return (
    <div className="fixed inset-0 z-[9999] bg-black/90 flex flex-col items-center justify-center w-screen h-screen">
      
      <div className="relative w-[90%] md:w-[80%] h-[75%] bg-black rounded-2xl overflow-hidden shadow-2xl border border-gray-800">
        
        {/* --- VIDEO ĐỐI PHƯƠNG (Lớn) --- */}
        <div className="w-full h-full">
           {callAccepted && !callEnded ? (
             <video 
                playsInline 
                ref={userVideo} 
                autoPlay 
                className="w-full h-full object-cover" 
             />
           ) : (
             <div className="flex flex-col items-center justify-center h-full text-white animate-pulse">
                <div className="w-24 h-24 rounded-full border-4 border-white mb-4 overflow-hidden shadow-lg">
                    <img 
                        src="/default-avatar.png" 
                        alt="avatar" 
                        className="w-full h-full object-cover"
                        onError={(e) => e.target.style.display = 'none'} 
                    />
                </div>
                <h3 className="text-2xl font-bold tracking-wide">
                    {isCalling ? "Đang gọi..." : `${name} đang gọi...`}
                </h3>
             </div>
           )}
        </div>

        {/* --- VIDEO CỦA MÌNH (Nhỏ - Góc phải dưới) --- */}
        <div className="absolute bottom-5 right-5 w-[150px] h-[110px] md:w-[250px] md:h-[180px] z-10">
          {stream && (
            <video 
                playsInline 
                muted 
                ref={myVideo} 
                autoPlay 
                className="w-full h-full object-cover rounded-xl border-2 border-white shadow-[0_5px_15px_rgba(0,0,0,0.5)]" 
            />
          )}
        </div>
      </div>

      {/* --- CÁC NÚT ĐIỀU KHIỂN --- */}
      <div className="mt-8 flex gap-8 items-center">
        {receivingCall && !callAccepted && (
          <div className="animate-bounce">
            <button 
                onClick={answerCall}
                className="px-8 py-3 rounded-full bg-green-500 text-white font-bold text-lg flex items-center gap-2 transition-transform hover:scale-110 shadow-[0_0_20px_rgba(34,197,94,0.6)]"
            >
               <i className="fas fa-phone"></i> Trả lời
            </button>
          </div>
        )}

        <button 
            onClick={leaveCall}
            className="px-8 py-3 rounded-full bg-red-500 text-white font-bold text-lg flex items-center gap-2 transition-transform hover:scale-110 shadow-[0_0_20px_rgba(239,68,68,0.6)]"
        >
            <i className="fas fa-phone-slash"></i> 
            {receivingCall && !callAccepted ? "Từ chối" : "Kết thúc"}
        </button>
      </div>
    </div>
  );
};

export default VideoCallModal;