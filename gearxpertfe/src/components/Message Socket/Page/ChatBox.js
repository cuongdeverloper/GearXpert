import React, { useRef, useState } from "react";
import Message from "../components/message/Message";
import EmojiPicker from "emoji-picker-react";
import { ApiMarkMessagesAsSeen } from "../ApiMessage";
import "./ChatBox.scss"; 
import { getChatDisplayProfile } from "../chatDisplay";

const ChatBox = ({
  currentChat,
  messages,
  newMessage,
  setNewMessage,
  handleSubmit,
  scrollRef,
  user,
  receiver,
  socket,
  file,
  setFile,
  handleVideoCall,
  handleToggleInfo,
  handleDeleteMessage,
  isReceiverOnline,
}) => {
  const receiverDisplay = getChatDisplayProfile(receiver);
  const chatTopRef = useRef();
  const imageInputRef = useRef(); 
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const handleInput = (e) => {
    setNewMessage(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
  };

  const handleScroll = async () => {
    if (!chatTopRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatTopRef.current;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 50;

    if (isAtBottom && currentChat) {
      try {
        const senderId = currentChat.members.find((m) => m !== user.account.id);
        await ApiMarkMessagesAsSeen(currentChat._id);

        socket.current?.emit("seenMessage", {
          senderId,
          conversationId: currentChat._id,
        });
        
      } catch (err) {
        console.error("Error marking messages as seen:", err);
      }
    }
  };

  const handleEmojiClick = (emojiData) => {
    setNewMessage((prev) => prev + emojiData.emoji);
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
        setFile(selected);
    }
  };

  const clearImage = () => {
      setFile(null);
      if(imageInputRef.current) imageInputRef.current.value = "";
  }

  return (
    <div className="chatBox">
      {currentChat ? (
        <>
          <div className="chatHeader">
            <div className="chatHeaderLeft">
              <div className="userAvatarContainer">
                 <img
                    src={receiverDisplay.avatar}
                    alt="avatar"
                    className="chatHeaderAvatar"
                />
                {isReceiverOnline && <span className="onlineStatusDot"></span>}
              </div>
              
              <div className="chatHeaderInfo">
                <span className="chatHeaderName">{receiverDisplay.name || "User"}</span>
                <span className="chatHeaderStatus">
                    {isReceiverOnline ? "Active now" : "Offline"}
                </span>
              </div>
            </div>
            
            <div className="chatHeaderRight">
              
              <i 
                className="fas fa-video iconAction"
                onClick={handleVideoCall} 
                style={{ cursor: "pointer" }}
                title="Video Call"
              ></i>

              <i 
                className="fas fa-info-circle iconAction"
                onClick={handleToggleInfo}
                style={{cursor: 'pointer'}}
             ></i>
            </div>
          </div>

          {/* MESSAGES LIST */}
          <div
            className="chatBoxTop"
            ref={chatTopRef}
            onScroll={handleScroll}
          >
            {messages.length === 0 ? (
              <div className="noMessageContainer">
                 <img src={receiverDisplay.avatar} alt="" className="noMessageAvatar"/>
                 <p className="noMessageName">{receiverDisplay.name}</p>
                 <span className="noMessageText">You are friends on Messenger</span>
              </div>
            ) : (
              messages.map((m, index) => {
                const isLastMessage = index === messages.length - 1;
                const isOwnMessage = m.sender._id === user.account.id;
                const prevMsg = messages[index - 1];
                const showTime = !prevMsg || (new Date(m.createdAt) - new Date(prevMsg.createdAt) > 30 * 60 * 1000);

                return (
                  <div key={m._id || index} ref={isLastMessage ? scrollRef : null} className="messageContainer">
                    <Message
                      message={m}
                      own={isOwnMessage}
                      sender={m.sender} 
                      showTime={showTime}
                      receiver={receiver}
                      handleDelete={handleDeleteMessage}
                    />
                    
                    {isLastMessage && isOwnMessage && m.seen && (
                      <div className="seenStatus">
                          <img src={receiverDisplay.avatar} alt="Seen" className="seenAvatarTiny"/>
                      </div>
                    )}
                      {isLastMessage && isOwnMessage && !m.seen && (
                      <div className="seenStatusText">Sent</div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* INPUT AREA */}
          <div className="chatBoxBottom">
            
            {/* PREVIEW ẢNH */}
            {file && (
                <div className="imagePreviewBox" style={{
                    position: 'absolute', bottom: '60px', left: '20px', 
                    padding: '5px', background: 'white', 
                    borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                    zIndex: 10
                }}>
                    <img 
                        src={URL.createObjectURL(file)} 
                        alt="preview" 
                        style={{height: '80px', borderRadius: '5px', display: 'block'}} 
                    />
                    <i 
                        className="fas fa-times-circle" 
                        onClick={clearImage}
                        style={{
                            position: 'absolute', top: '-8px', right: '-8px', 
                            cursor: 'pointer', color: 'red', background: 'white', 
                            borderRadius: '50%', fontSize: '18px'
                        }}
                    ></i>
                </div>
            )}

            <div className="chatInputWrapper">
                <input 
                    type="file" 
                    id="fileInput" 
                    style={{ display: "none" }} 
                    ref={imageInputRef}
                    accept="image/*"
                    onChange={handleFileChange}
                />

                <i className="fas fa-plus-circle iconAction addIcon"></i>
                
                <i 
                    className="fas fa-images iconAction imageIcon"
                    onClick={() => imageInputRef.current.click()}
                ></i>
                
                <i className="fas fa-sticky-not e iconAction stickerIcon"></i>

                <div className="inputBox">
                    <textarea
                        className="chatMessageInput"
                        placeholder="Aa"
                        onChange={handleInput}
                        value={newMessage}
                        rows={1}
                        onKeyDown={(e) => {
                            if(e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmit(e);
                            }
                        }}
                    ></textarea>
                    
                    <i 
                        className="fas fa-smile iconSmile" 
                        onClick={() => setShowEmojiPicker((prev) => !prev)}
                    ></i>
                    
                    {showEmojiPicker && (
                        <div className="emojiPickerContainer">
                            <EmojiPicker onEmojiClick={handleEmojiClick} width={300} height={400} />
                        </div>
                    )}
                </div>

                {newMessage.trim() || file ? (
                      <i className="fas fa-paper-plane sendIcon" onClick={handleSubmit}></i>
                ) : (
                      <i className="fas fa-thumbs-up likeIcon"></i>
                )}
            </div>
          </div>
        </>
      ) : (
        <div className="noConversationWrapper">
            <span className="noConversationText">Select a chat to start messaging</span>
        </div>
      )}
    </div>
  );
};

export default ChatBox;