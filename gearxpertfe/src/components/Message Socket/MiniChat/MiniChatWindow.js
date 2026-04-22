import React, { useState, useEffect, useRef, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import EmojiPicker from "emoji-picker-react";
import Peer from "simple-peer";
import { createPortal } from "react-dom";
import {
    ApiGetMessageByConversationId,
    ApiSendMessage,
    ApiMarkMessagesAsSeen,
    ApiGetUserByUserId
} from "../ApiMessage";
import { useSocket } from "../../../SocketContext";
import { closeChatWindow } from "../../../redux/reducer/chatWindowReducer";
import { useTranslation } from "react-i18next";
import defaultAvatar from '../../public/avatar.jpg';

const MiniChatWindow = ({ conversation }) => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const { socket, onlineUsers } = useSocket();
    const user = useSelector((state) => state.user.account);

    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [file, setFile] = useState(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [partnerInfo, setPartnerInfo] = useState(conversation.friendInfo || null);

    const [callActive, setCallActive] = useState(false);
    const [stream, setStream] = useState(null);
    const [receivingCall, setReceivingCall] = useState(false);
    const [callerSignal, setCallerSignal] = useState(null);
    const [callAccepted, setCallAccepted] = useState(false);
    const [callEnded, setCallEnded] = useState(false);
    const [isCalling, setIsCalling] = useState(false);
    const [remoteStream, setRemoteStream] = useState(null);
    // --- REFS ---
    const scrollRef = useRef();
    const fileInputRef = useRef();
    const myVideo = useRef();
    const userVideo = useRef();
    const connectionRef = useRef();
    const streamRef = useRef();
    const currentUserId = user.id || user._id;



    const callUser = () => {
        setIsCalling(true);
        setCallActive(true);
        navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((currentStream) => {
            setStream(currentStream);
            streamRef.current = currentStream;
            const peer = new Peer({ initiator: true, trickle: false, stream: currentStream });


            const receiverId = conversation.members.find(m => {
                const mId = typeof m === 'string' ? m : m._id;
                return mId !== currentUserId;
            });

            peer.on("signal", (data) => {
                socket.emit("callUser", {
                    userToCall: receiverId,
                    signalData: data,
                    from: socket.id,
                    name: user.username
                });
            });
            peer.on("stream", (userStream) => {
                setRemoteStream(userStream);
            });
            connectionRef.current = peer;
        }).catch(err => {
            console.error("Lỗi Camera:", err);
            setCallActive(false);
        });
    };

    const answerCall = () => {
        setCallAccepted(true);
        setReceivingCall(false);
        navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((currentStream) => {
            setStream(currentStream);
            streamRef.current = currentStream;

            const peer = new Peer({ initiator: false, trickle: false, stream: currentStream });
            peer.on("signal", (data) => {
            });
            peer.on("stream", (userStream) => {
                setRemoteStream(userStream);
            });
            peer.signal(callerSignal);
            connectionRef.current = peer;
        });
    };

    const endCall = useCallback(() => {
        setCallEnded(true);
        setCallActive(false);
        setCallAccepted(false);
        setReceivingCall(false);
        setIsCalling(false);

        if (connectionRef.current) connectionRef.current.destroy();

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        setStream(null);
        setRemoteStream(null);

        if (conversation && conversation.members) {
            const receiverId = conversation.members.find(m => {
                const mId = typeof m === 'string' ? m : m._id;
                return mId !== currentUserId;
            });
            if (receiverId) socket.emit("endCall", { id: receiverId });
        }
    }, [conversation, currentUserId, socket]);

    const uploadImage = async (fileToUpload) => {
        const formData = new FormData();
        formData.append("file", fileToUpload);
        formData.append("upload_preset", process.env.REACT_APP_UPLOAD_PRESET);
        const cloudName = process.env.REACT_APP_CLOUD_NAME;
        const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
        try {
            const res = await axios.post(uploadUrl, formData);
            return res.data.secure_url;
        } catch (err) { return null; }
    };

    useEffect(() => {
        const fetchPartnerInfo = async () => {
            if (conversation.friendInfo && Object.keys(conversation.friendInfo).length > 0) {
                setPartnerInfo(conversation.friendInfo); return;
            }
            if (conversation.members && Array.isArray(conversation.members)) {
                const friendMember = conversation.members.find(m => {
                    const mId = typeof m === 'string' ? m : m._id;
                    return mId !== currentUserId;
                });
                const friendId = typeof friendMember === 'string' ? friendMember : friendMember?._id;
                if (friendId) {
                    try {
                        const res = await ApiGetUserByUserId(friendId);
                        setPartnerInfo(res);
                    } catch (error) { console.error(error); }
                }
            }
        };
        fetchPartnerInfo();
    }, [conversation, currentUserId]);

    useEffect(() => {
        const initChat = async () => {
            if (!conversation._id) return;
            try {
                const res = await ApiGetMessageByConversationId(conversation._id);
                if (Array.isArray(res)) setMessages(res);
                await ApiMarkMessagesAsSeen(conversation._id);
            } catch (error) { console.error(error); }
        };
        initChat();
    }, [conversation._id]);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, file]);

    useEffect(() => {
        if (!socket) return;
        const handleMsg = (data) => {
            if (data.conversationId === conversation._id) {
                setMessages((prev) => [...prev, { ...data, sender: { _id: data.senderId } }]);
                ApiMarkMessagesAsSeen(conversation._id);
            }
        };
        socket.on("getMessage", handleMsg);
        return () => socket.off("getMessage", handleMsg);
    }, [socket, conversation._id]);

    useEffect(() => {
        if (!socket) return;
        socket.on("callUser", (data) => {
            setReceivingCall(true);
            setCallerSignal(data.signal);
            setCallActive(true);
        });
        socket.on("callAccepted", (signal) => {
            setCallAccepted(true);
            connectionRef.current?.signal(signal);
        });
        socket.on("endCall", () => {
            endCall();
        });
        return () => {
            socket.off("callUser");
            socket.off("callAccepted");
            socket.off("endCall");
        };
    }, [socket, endCall]);

    useEffect(() => {
        if (myVideo.current && stream) {
            myVideo.current.srcObject = stream;
        }
    }, [stream, callActive]);

    useEffect(() => {
        if (userVideo.current && remoteStream) {
            userVideo.current.srcObject = remoteStream;
        }
    }, [remoteStream, callAccepted]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() && !file) return;
        if (!conversation.members) return;

        const receiverMember = conversation.members.find(m => {
            const mId = typeof m === 'string' ? m : m._id;
            return mId !== currentUserId;
        });
        const receiverId = typeof receiverMember === 'string' ? receiverMember : receiverMember?._id;
        if (!receiverId) return;

        let imageUrl = "";
        if (file) {
            imageUrl = await uploadImage(file);
            if (!imageUrl && !newMessage.trim()) return;
        }

        socket.emit("sendMessage", {
            senderId: currentUserId, receiverId, text: newMessage, image: imageUrl, conversationId: conversation._id
        });

        try {
            const res = await ApiSendMessage(receiverId, newMessage, conversation._id, imageUrl);
            if (res) {
                const messageData = res.data || res;
                setMessages((prev) => [...prev, {
                    ...messageData,
                    sender: { _id: currentUserId, avatar: user.image || user.avatar }
                }]);
                setNewMessage(""); setFile(null); setShowEmojiPicker(false);
            }
        } catch (err) { console.error(err); }
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        const now = new Date();
        const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        if (isToday) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return date.toLocaleString('en-US', { day: 'numeric', month: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true });
    };

    const friendName = partnerInfo?.fullName || partnerInfo?.username || "Người dùng";
    const friendAvatar = partnerInfo?.avatar || partnerInfo?.image || defaultAvatar;

    const VideoCallOverlay = callActive ? (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center pointer-events-none">

            <div className="w-[800px] h-[550px] bg-gray-900 rounded-xl shadow-2xl border border-gray-700 overflow-hidden relative flex flex-col pointer-events-auto animate-in zoom-in-95 duration-200">

                {/* Header nhỏ của cửa sổ video */}
                <div className="h-10 bg-gray-800 flex items-center justify-between px-4 border-b border-gray-700 select-none">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                        <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        <span className="text-gray-300 text-xs ml-2 font-medium">Cuộc gọi với {friendName}</span>
                    </div>
                    <button onClick={() => setCallActive(false)} className="text-gray-400 hover:text-white">
                        <i className="fas fa-minus"></i>
                    </button>
                </div>

                <div className="flex-1 relative bg-black flex items-center justify-center">
                    {callAccepted && !callEnded ? (
                        <video
                            playsInline ref={userVideo} autoPlay
                            className="w-full h-full object-contain"
                        />
                    ) : (
                        <div className="flex flex-col items-center z-10 animate-pulse">
                            <img
                                src={friendAvatar} alt="avt"
                                className="w-24 h-24 rounded-full border-4 border-gray-700 shadow-lg object-cover mb-4"
                            />
                            <h3 className="text-white text-xl font-bold">{friendName}</h3>
                            <p className="text-gray-400 text-sm mt-1">
                                {isCalling ? "Đang gọi..." : "Đang gọi cho bạn..."}
                            </p>
                        </div>
                    )}

                    {stream && (
                        <div className="absolute bottom-24 right-4 w-36 h-48 bg-gray-800 rounded-lg overflow-hidden border border-gray-600 shadow-lg z-20">
                            <video playsInline muted ref={myVideo} autoPlay className="w-full h-full object-cover transform scale-x-[-1]" />
                        </div>
                    )}
                </div>

                <div className="h-20 bg-gray-800 flex items-center justify-center gap-6 border-t border-gray-700">
                    <button className="w-10 h-10 rounded-full bg-gray-700 text-white hover:bg-gray-600 transition flex items-center justify-center">
                        <i className="fas fa-microphone"></i>
                    </button>

                    {receivingCall && !callAccepted ? (
                        <>
                            <button
                                onClick={answerCall}
                                className="w-12 h-12 rounded-full bg-green-500 text-white flex items-center justify-center hover:bg-green-600 animate-bounce shadow-lg"
                                title="Trả lời"
                            >
                                <i className="fas fa-phone"></i>
                            </button>
                            <button
                                onClick={endCall}
                                className="w-12 h-12 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 shadow-lg"
                                title="Từ chối"
                            >
                                <i className="fas fa-phone-slash"></i>
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={endCall}
                            className="w-14 h-14 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 shadow-lg transition-transform active:scale-95"
                            title="Kết thúc"
                        >
                            <i className="fas fa-phone-slash text-xl"></i>
                        </button>
                    )}

                    <button className="w-10 h-10 rounded-full bg-gray-700 text-white hover:bg-gray-600 transition flex items-center justify-center">
                        <i className="fas fa-video"></i>
                    </button>
                </div>
            </div>
        </div>
    ) : null;

    const renderMessage = (m, idx) => {
        const senderId = typeof m.sender === 'string' ? m.sender : m.sender?._id;
        const isOwn = senderId === currentUserId;
        const displayTooltip = formatDateTime(m.createdAt);
        let showTimeSeparator = false;

        if (idx === 0) showTimeSeparator = true;
        else {
            const prevMsg = messages[idx - 1];
            if ((new Date(m.createdAt).getTime() - new Date(prevMsg.createdAt).getTime()) > 5 * 60 * 1000) showTimeSeparator = true;
        }

        return (
            <div key={idx}>
                {showTimeSeparator && (
                    <div className="flex justify-center my-3">
                        <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{displayTooltip}</span>
                    </div>
                )}
                {m.type === "call" ? (
                    <div className="flex justify-center my-2 mb-4">
                        <div className={`flex items-center gap-3 px-4 py-2 rounded-2xl border shadow-sm ${isOwn ? "bg-gray-50 border-gray-200" : "bg-white border-gray-200"}`}>
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                                <i className="fas fa-video text-gray-600 text-sm"></i>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-gray-800">Cuộc gọi video</span>
                                <span className="text-[10px] text-gray-500 font-medium">{displayTooltip}</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div ref={scrollRef} className={`flex mb-1 ${isOwn ? "justify-end" : "justify-start"}`}>
                        {!isOwn && (
                            <img src={friendAvatar} className="w-6 h-6 rounded-full object-cover mr-2 mt-auto border border-gray-200" alt="" onError={(e) => { e.target.src = defaultAvatar }} />
                        )}
                        <div className={`flex flex-col max-w-[70%] min-w-0 ${isOwn ? "items-end" : "items-start"}`}>
                            {m.image && <img src={m.image} alt="att" className="rounded-lg mb-1 max-w-full max-h-40 object-cover border border-gray-200 cursor-pointer" onClick={() => window.open(m.image, "_blank")} />}
                            {m.text && (
                                <div className={`px-3 py-2 text-sm shadow-sm break-all whitespace-pre-wrap ${isOwn ? "bg-blue-600 text-white rounded-2xl rounded-tr-sm" : "bg-white border border-gray-200 text-slate-800 rounded-2xl rounded-tl-sm"}`} title={displayTooltip}>
                                    {m.text}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const partnerName = partnerInfo?.fullName || partnerInfo?.username || "Người dùng";
    const partnerAvatar = partnerInfo?.avatar || partnerInfo?.image || defaultAvatar;

    const partnerId = conversation.members.find(m => {
        const mId = typeof m === 'string' ? m : m._id;
        return mId !== currentUserId;
    });
    const isPartnerOnline = onlineUsers.some(u => u.userId === (typeof partnerId === 'string' ? partnerId : partnerId?._id));

    return (
        <>
            {createPortal(VideoCallOverlay, document.body)}
            <div className="w-80 h-[450px] bg-white rounded-t-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex flex-col border border-gray-300 pointer-events-auto font-sans relative overflow-hidden">

                <div className="h-14 px-3 flex items-center justify-between border-b border-gray-200 bg-white rounded-t-xl z-10">
                    <div className="flex items-center gap-2 cursor-pointer">
                        <div className="relative w-9 h-9">
                            <img src={partnerAvatar} alt="Avt" className="w-full h-full rounded-full object-cover border border-gray-200" onError={(e) => { e.target.src = defaultAvatar }} />
                            <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 border-2 border-white rounded-full ${isPartnerOnline ? "bg-green-500" : "bg-gray-400"}`}></span>
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold text-sm text-slate-800 truncate max-w-[140px] leading-tight">{partnerName}</span>
                            <span className={`text-[11px] font-medium ${isPartnerOnline ? "text-green-600" : "text-gray-500"}`}>
                                {isPartnerOnline ? t('common.active_now') : t('common.offline')}
                            </span>
                        </div>
                    </div>
                    <div className="flex gap-1 items-center">
                        <i className="fas fa-phone p-2 text-blue-500 hover:bg-gray-100 rounded-full cursor-pointer text-sm"></i>
                        <i className="fas fa-video p-2 text-blue-500 hover:bg-gray-100 rounded-full cursor-pointer text-sm" onClick={callUser}></i>
                        <i className="fas fa-times p-2 text-gray-400 hover:text-red-500 hover:bg-gray-100 rounded-full cursor-pointer text-lg" onClick={() => dispatch(closeChatWindow(conversation._id))}></i>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 bg-white flex flex-col custom-scrollbar">
                    {messages.length === 0 && <div className="text-center text-gray-400 mt-10 text-sm">Chưa có tin nhắn nào</div>}
                    {messages.map((m, idx) => renderMessage(m, idx))}
                </div>

                <div className="border-t border-gray-200 bg-white relative">
                    {file && (
                        <div className="absolute bottom-full left-0 w-full p-2 bg-white border-t border-gray-100 flex items-center gap-2 shadow-sm">
                            <div className="relative">
                                <img src={URL.createObjectURL(file)} alt="preview" className="h-16 w-auto rounded-md object-cover border border-gray-200" />
                                <button onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="absolute -top-2 -right-2 bg-white text-red-500 rounded-full w-5 h-5 flex items-center justify-center shadow-md border border-gray-200"><i className="fas fa-times text-xs"></i></button>
                            </div>
                        </div>
                    )}
                    {showEmojiPicker && (
                        <div className="absolute bottom-14 right-0 z-20 shadow-xl border border-gray-200 rounded-lg">
                            <EmojiPicker onEmojiClick={(e) => setNewMessage(prev => prev + e.emoji)} width={300} height={350} />
                        </div>
                    )}
                    <form onSubmit={handleSend} className="p-2 flex items-end gap-2">
                        <div className="flex gap-2 pb-2 text-blue-500">
                            <input type="file" ref={fileInputRef} style={{ display: "none" }} accept="image/*" onChange={(e) => setFile(e.target.files[0])} />
                            <i className="fas fa-images cursor-pointer hover:bg-gray-100 p-2 rounded-full transition-colors text-lg" onClick={() => fileInputRef.current.click()}></i>
                        </div>
                        <div className="flex-1 bg-gray-100 rounded-2xl flex items-center px-3 py-2 min-h-[40px]">
                            <input type="text" placeholder="Aa" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} className="w-full bg-transparent text-sm focus:outline-none" />
                            <i className="fas fa-smile text-blue-500 cursor-pointer hover:text-blue-600 ml-2 text-lg" onClick={() => setShowEmojiPicker(!showEmojiPicker)}></i>
                        </div>
                        <button type="submit" disabled={!newMessage.trim() && !file} className="pb-2 text-blue-600 hover:text-blue-700 disabled:text-gray-300 transition-colors"><i className="fas fa-paper-plane text-xl"></i></button>
                    </form>
                </div>
            </div>
        </>
    );
};

export default MiniChatWindow;