import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import './Messenger.scss'
import Conversation from "../components/conversations";
import { useNavigate, useParams } from "react-router-dom";
import ChatBox from "./ChatBox";
import { ApiDeleteMessage, ApiGetMessageByConversationId, ApiGetUserByUserId, ApiSendMessage, getConversationApi } from "../ApiMessage";
import { toast } from "react-toastify";
import { useSocket } from "../../../SocketContext";
import axios from "axios";
import Peer from "simple-peer";
import VideoCallModal from "../../VideoCallModal/VideoCallModal";
import ChatInfo from "../components/ChatInfor/ChatInfo";
import Header from "../../navigation/Header";

const Messenger = () => {
  const { conversationId } = useParams();
  const { socket } = useSocket();

  const user = useSelector(state => state.user);
  const isAuthenticated = useSelector(state => state.user.isAuthenticated);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [arrivalMessage, setArrivalMessage] = useState(null);
  const [receiver, setReceiver] = useState(null);
  const [showChatInfo, setShowChatInfo] = useState(false);
  const [file, setFile] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const scrollRef = useRef();
  const navigate = useNavigate();

  const [stream, setStream] = useState(null);
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState("");
  const [callerSignal, setCallerSignal] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [callerName, setCallerName] = useState("");
  const [showVideoModal, setShowVideoModal] = useState(false);

  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();

  const uploadImage = async (fileToUpload) => {
    const formData = new FormData();
    formData.append("file", fileToUpload);
    formData.append("upload_preset", process.env.REACT_APP_UPLOAD_PRESET);

    const cloudName = process.env.REACT_APP_CLOUD_NAME;
    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

    try {
      const res = await axios.post(uploadUrl, formData);
      return res.data.secure_url;
    } catch (err) {
      console.error("Upload Cloudinary lỗi:", err);
      toast.error("Lỗi khi tải ảnh lên!");
      return null;
    }
  };

  useEffect(() => {
    const fetchReceiver = async () => {
      if (currentChat) {
        const friendId = currentChat.members.find((m) => m !== user.account.id);
        if (friendId) {
          const res = await ApiGetUserByUserId(friendId);
          setReceiver(res);
        }
      }
    };
    fetchReceiver();
  }, [currentChat, user.account.id]);

  useEffect(() => {
    if (!socket) return;

    socket.on("getUsers", (users) => {
      setOnlineUsers(users);
    });

  }, [socket]);

  const checkOnlineStatus = (chatMemberId) => {
    return onlineUsers.some((u) => u.userId === chatMemberId);
  };

  useEffect(() => {
    const getConversations = async () => {
      try {
        let response = await getConversationApi();

        const enrichedConversations = await Promise.all(response.map(async (conv) => {
          const friendId = conv.members.find(m => m !== user.account.id);
          if (friendId) {
            const friendInfo = await ApiGetUserByUserId(friendId);
            return {
              ...conv,
              friendName: friendInfo?.fullName || friendInfo?.username || "",
            };
          }
          return conv;
        }));

        setConversations(enrichedConversations);
      } catch (err) {
        console.log(err);
      }
    };
    if (user.account.id) {
      getConversations();
    }
  }, [user.account.id]);

  useEffect(() => {
    if (!conversationId || conversations.length === 0) return;
    const matched = conversations.find((c) => c._id === conversationId);
    if (matched) setCurrentChat(matched);
  }, [conversationId, conversations]);

  useEffect(() => {
    if (!currentChat) return;
    const getMessages = async () => {
      try {
        let response = await ApiGetMessageByConversationId(currentChat._id);
        setMessages(response);
      } catch (err) {
        console.error("Error fetching messages:", err);
      }
    };
    getMessages();
  }, [currentChat]);

  useEffect(() => {
    if (!socket) return;
    socket.on("getMessage", (data) => {
      setArrivalMessage({
        sender: data.senderId,
        text: data.text,
        image: data.image,
        createdAt: Date.now(),
        conversationId: data.conversationId,
        textPreview: data.text || (data.image ? "Đã gửi một ảnh" : "")
      });
    });
    socket.on("callUser", (data) => {
      setReceivingCall(true);
      setCaller(data.from);
      setCallerName(data.name);
      setCallerSignal(data.signal);
      setShowVideoModal(true);
    });

    socket.on("endCall", () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      endCallUI();
    });

    return () => {
      socket.off("getMessage");
      socket.off("callUser");
      socket.off("endCall");
    };
  }, [socket, stream]);

  useEffect(() => {
    if (!arrivalMessage) return;
    if (currentChat && arrivalMessage.conversationId === currentChat._id) {
      setMessages((prev) => [...prev, arrivalMessage]);
    } else {
      toast.info(`💬 Tin nhắn mới: "${arrivalMessage.textPreview}"`);
    }
  }, [arrivalMessage, currentChat]);

  useEffect(() => {
    if (!socket) return;
    socket.on("messageSeen", ({ conversationId }) => {
      if (currentChat && currentChat._id === conversationId) {
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.sender._id === user.account.id ? { ...msg, seen: true } : msg
          )
        );
      }
    });
    return () => socket.off("messageSeen");
  }, [socket, currentChat]);

  const callUser = () => {
    if (!receiver) return toast.error("Không tìm thấy người dùng!");
    setShowVideoModal(true);
    setCallEnded(false);

    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((currentStream) => {
      setStream(currentStream);
      if (myVideo.current) myVideo.current.srcObject = currentStream;

      const peer = new Peer({
        initiator: true,
        trickle: false,
        stream: currentStream
      });

      peer.on("signal", (data) => {
        socket.emit("callUser", {
          userToCall: receiver._id,
          signalData: data,
          from: socket.id,
          name: user.account.username || "User"
        });
      });

      peer.on("stream", (userStream) => {
        if (userVideo.current) userVideo.current.srcObject = userStream;
      });

      socket.on("callAccepted", (signal) => {
        setCallAccepted(true);
        peer.signal(signal);
      });

      connectionRef.current = peer;
    }).catch(err => {
      console.error(err);
      toast.error("Không thể truy cập Camera/Micro!");
      setShowVideoModal(false);
    });
  };

  const answerCall = () => {
    setCallAccepted(true);
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((currentStream) => {
      setStream(currentStream);
      if (myVideo.current) myVideo.current.srcObject = currentStream;

      const peer = new Peer({
        initiator: false,
        trickle: false,
        stream: currentStream
      });

      peer.on("signal", (data) => {
        socket.emit("answerCall", { signal: data, to: caller });
      });

      peer.on("stream", (userStream) => {
        if (userVideo.current) userVideo.current.srcObject = userStream;
      });

      peer.signal(callerSignal);
      connectionRef.current = peer;
    });
  };

  const leaveCall = async () => {
    setCallEnded(true);
    if (connectionRef.current) connectionRef.current.destroy();

    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }

    if (currentChat && user.account.id) {
      const receiverId = currentChat.members.find((m) => m !== user.account.id);

      if (receiverId) {
        socket.emit("endCall", { id: receiverId });
      }

      // socket.emit("sendMessage", {
      //   senderId: user.account.id,
      //   receiverId,
      //   text: "Cuộc gọi video",
      //   type: "call",
      //   conversationId: currentChat._id,
      // });

      try {
        const res = await ApiSendMessage(
          receiverId,
          "Cuộc gọi video",
          currentChat._id,
          "",
          "call"
        );

        setMessages((prev) => [...prev, {
          ...res.data,
          sender: { _id: user.account.id, avatar: user.account.avatar }
        }]);
      } catch (e) {
        console.error(e);
      }
    }

    endCallUI();
  };

  const handleDeleteMessage = async (msgId) => {
    const ConfirmDeleteToast = ({ closeToast }) => (
      <div className="flex flex-col gap-2">
        <p className="font-medium text-sm text-gray-800">
          Xóa tin nhắn này ở phía bạn?
        </p>
        <div className="flex gap-2 justify-end mt-2">
          <button
            onClick={closeToast}
            className="px-3 py-1 text-xs font-semibold text-gray-600 bg-gray-200 rounded hover:bg-gray-300 transition"
          >
            Hủy
          </button>

          <button
            onClick={async () => {
              closeToast();
              setMessages((prev) => prev.filter((m) => m._id !== msgId));

              await ApiDeleteMessage(msgId);

              toast.success("Đã xóa tin nhắn!", { autoClose: 2000 });
            }}
            className="px-3 py-1 text-xs font-semibold text-white bg-red-500 rounded hover:bg-red-600 transition"
          >
            Xóa
          </button>
        </div>
      </div>
    );

    toast(<ConfirmDeleteToast />, {
      position: "top-center",
      autoClose: false,
      closeOnClick: false,
      draggable: false,
      closeButton: false,
      style: { minWidth: "250px" }
    });
  };

  const endCallUI = () => {
    setShowVideoModal(false);
    setStream(null);
    setReceivingCall(false);
    setCallAccepted(false);
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && !file) return;

    const receiverId = currentChat.members.find(
      (member) => member !== user.account.id
    );

    let imageUrl = "";

    if (file) {
      toast.info("Đang gửi ảnh...", { autoClose: 1000 });
      imageUrl = await uploadImage(file);
      if (!imageUrl) return;
    }

    socket.emit("sendMessage", {
      senderId: user.account.id,
      receiverId,
      text: newMessage,
      image: imageUrl,
      conversationId: currentChat._id,
    });

    try {
      const data = await ApiSendMessage(receiverId, newMessage, currentChat._id, imageUrl);

      const newMsg = {
        ...data,
        sender: { _id: user.account.id, image: user.account.image },
      };

      setMessages((prev) => [...prev, newMsg]);
      setNewMessage("");
      setFile(null);
    } catch (err) {
      console.error("Lỗi gửi tin:", err);
    }
  };

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!isAuthenticated) navigate("/signin");
  }, [isAuthenticated]);

  const filteredConversations = conversations.filter((c) =>
    c.friendName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="messenger-page-container" style={{display: 'flex', flexDirection: 'column', height: '100vh'}}>
    {/* <Header /> */}
      <div className="messenger">
        <div className="chatMenu">
          <div className="chatMenuWrapper">
            <div className="menuHeader">
              <h2>Chats</h2>
              <div className="menuIcons">
                <button className="menuIconBtn"><i className="fas fa-ellipsis-h"></i></button>
                <button className="menuIconBtn"><i className="fas fa-edit"></i></button>
              </div>
            </div>
            <div className="searchContainer">
              <i className="fas fa-search searchIcon"></i>
              <input
                placeholder="Search Messenger"
                className="chatMenuInput"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="conversationList">
              {filteredConversations.map((c) => (
                <div key={c._id} onClick={() => navigate(`/messenger/${c._id}`)}>
                  <Conversation
                    conversation={c}
                    currentUser={user.account}
                    isActive={currentChat?._id === c._id}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CENTER & RIGHT */}
        <ChatBox
          setMessages={setMessages}
          currentChat={currentChat}
          messages={messages}
          newMessage={newMessage}
          setNewMessage={setNewMessage}
          handleSubmit={handleSubmit}
          scrollRef={scrollRef}
          user={user}
          receiver={receiver}
          socket={socket}
          file={file}
          setFile={setFile}
          handleVideoCall={callUser}
          handleToggleInfo={() => setShowChatInfo(prev => !prev)}
          handleDeleteMessage={handleDeleteMessage}
          isReceiverOnline={checkOnlineStatus(receiver?._id)}
        />

        {/* <div className="chatOnline"> */}
        {showChatInfo && currentChat && (
          <ChatInfo
            currentChat={currentChat}
            receiver={receiver}
            messages={messages}
            setShowChatInfo={setShowChatInfo}
          />
        )}
      </div>
      {/* </div> */}

      {showVideoModal && (
        <VideoCallModal
          stream={stream}
          callAccepted={callAccepted}
          callEnded={callEnded}
          userVideo={userVideo}
          myVideo={myVideo}
          answerCall={answerCall}
          leaveCall={leaveCall}
          receivingCall={receivingCall}
          name={callerName}
          isCalling={!receivingCall}
        />
      )}
    </div>
  );
};

export default Messenger;