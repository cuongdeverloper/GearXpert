import { useState } from 'react';
import { getChatDisplayProfile } from '../../chatDisplay';

const ChatInfo = ({ receiver, messages, setShowChatInfo }) => {
    const [isMediaOpen, setIsMediaOpen] = useState(true);
    const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
    const receiverDisplay = getChatDisplayProfile(receiver);

    const mediaList = messages.filter(m => m.image && m.image !== "");

    return (
        <div className="flex-[0.35] min-w-[320px] max-w-[360px] h-screen bg-white border-l border-gray-200 overflow-y-auto flex flex-col py-5 font-sans">

            <div className="flex flex-col items-center mb-6">
                <div className="relative mb-3">
                     <img 
                        src={receiverDisplay.avatar} 
                        alt="avatar" 
                        className="w-20 h-20 rounded-full object-cover cursor-pointer hover:opacity-90 transition-opacity border border-gray-100"
                    />
                    <span className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></span>
                </div>
                <h3 className="text-xl font-bold text-gray-900">{receiverDisplay.name || "User"}</h3>
                <span className="text-xs text-gray-500 mt-1">Đang hoạt động</span>
            </div>

            <div className="flex justify-center gap-4 mb-4 px-4">
                <ActionBtn icon="fas fa-user" text="Trang cá nhân" />
                <ActionBtn icon="fas fa-bell" text="Tắt thông báo" />
                <ActionBtn icon="fas fa-search" text="Tìm kiếm" />
            </div>

            <div className="flex-1 w-full">

                <AccordionItem title="Thông tin về đoạn chat" />

                <div className="border-t border-transparent hover:bg-gray-50 transition-colors">
                    <div
                        className="flex justify-between items-center p-4 cursor-pointer"
                        onClick={() => setIsMediaOpen(!isMediaOpen)}
                    >
                        <span className="font-semibold text-sm text-gray-800">File phương tiện & file</span>
                        <i className={`fas fa-chevron-down text-gray-500 text-xs transition-transform duration-200 ${isMediaOpen ? "rotate-180" : ""}`}></i>
                    </div>

                    {isMediaOpen && (
                        <div className="px-2 pb-2">
                            {mediaList.length > 0 ? (
                                <div className="grid grid-cols-3 gap-1">
                                    {mediaList.map((m, index) => (
                                        <div key={index} className="relative w-full pt-[100%] rounded overflow-hidden cursor-pointer bg-gray-100 border border-gray-200 hover:opacity-90 transition-opacity">
                                            <img
                                                src={m.image}
                                                alt="media"
                                                className="absolute top-0 left-0 w-full h-full object-cover"
                                                onClick={() => window.open(m.image, "_blank")}
                                            />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-xs text-gray-400 py-4">Chưa có file phương tiện nào</p>
                            )}
                        </div>
                    )}
                </div>

                <div className="border-t border-transparent hover:bg-gray-50 transition-colors">
                    <div
                        className="flex justify-between items-center p-4 cursor-pointer"
                        onClick={() => setIsPrivacyOpen(!isPrivacyOpen)}
                    >
                        <span className="font-semibold text-sm text-gray-800">Quyền riêng tư và hỗ trợ</span>
                        <i className={`fas fa-chevron-down text-gray-500 text-xs transition-transform duration-200 ${isPrivacyOpen ? "rotate-180" : ""}`}></i>
                    </div>
                    {isPrivacyOpen && (
                        <div className="px-4 pb-4 flex flex-col gap-3">
                            <div className="flex items-center gap-3 cursor-pointer hover:bg-gray-100 p-2 rounded transition">
                                <i className="fas fa-ban text-lg text-gray-600"></i>
                                <span className="text-sm font-medium text-gray-700">Chặn</span>
                            </div>
                            <div className="flex items-center gap-3 cursor-pointer hover:bg-gray-100 p-2 rounded transition">
                                <i className="fas fa-exclamation-triangle text-lg text-gray-600"></i>
                                <span className="text-sm font-medium text-gray-700">Báo cáo</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div
                className="mt-auto border-t border-gray-200 p-4 text-center text-gray-500 cursor-pointer hover:bg-gray-50 transition"
                onClick={() => setShowChatInfo(false)}
            >
                <span className="text-sm font-semibold">Đóng</span>
            </div>
        </div>
    );
};

const ActionBtn = ({ icon, text }) => {
    return (
        <div className="flex flex-col items-center cursor-pointer group">
            <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center mb-1 transition group-hover:bg-gray-200">
                <i className={`${icon} text-gray-800 text-sm`}></i>
            </div>
            <p className="text-[11px] text-gray-500 text-center max-w-[60px] leading-tight">{text}</p>
        </div>
    );
};

const AccordionItem = ({ title }) => {
    return (
        <div className="hover:bg-gray-50 transition-colors cursor-pointer">
            <div className="flex justify-between items-center p-4">
                <span className="font-semibold text-sm text-gray-800">{title}</span>
                <i className="fas fa-chevron-down text-gray-500 text-xs"></i>
            </div>
        </div>
    );
}

export default ChatInfo;