import React, { useRef, useState } from "react";
import Message from "../components/message/Message";
import EmojiPicker from "emoji-picker-react";
import { ApiMarkMessagesAsSeen } from "../ApiMessage";

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
}) => {
  const chatTopRef = useRef();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const handleScroll = async () => {
    if (!chatTopRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatTopRef.current;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;

    if (isAtBottom) {
      try {
        const senderId = currentChat.members.find((m) => m !== user.account.id);
        await ApiMarkMessagesAsSeen(currentChat._id);
        socket.current.emit("seenMessage", {
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

  return (
    <div className="chatBox">
      <div className="chatBoxWrapper">
        {currentChat ? (
          <>
            {/* Header */}
            <div className="chatHeader">
              <div className="chatHeaderLeft">
                <img
                  src={receiver?.image || "/default-avatar.png"}
                  alt="avatar"
                  className="chatHeaderAvatar"
                />
                <div>
                  <div className="chatHeaderName">{receiver?.username}</div>
                </div>
              </div>
              <div className="chatHeaderRight">
                <i className="fas fa-phone"></i>
                <i className="fas fa-video"></i>
                <i className="fas fa-info-circle"></i>
              </div>
            </div>

            {/* Messages */}
            <div
              className="chatBoxTop"
              ref={chatTopRef}
              onScroll={handleScroll}
              style={{ overflowY: "auto", maxHeight: "500px" }}
            >
              {messages.length === 0 ? (
                <div className="noMessageYet">No messages yet. Say hi!</div>
              ) : (
                messages.map((m, index) => {
                  const isLastMessage = index === messages.length - 1;
                  const isOwnMessage = m.sender._id === user.account.id;

                  const prevMsg = messages[index - 1];
                  const showTime =
                    !prevMsg ||
                    m.sender._id !== prevMsg.sender._id ||
                    new Date(m.createdAt) - new Date(prevMsg.createdAt) >
                      5 * 60 * 1000;

                  return (
                    <div key={m._id || index} ref={isLastMessage ? scrollRef : null}>
                      <Message
                        message={m}
                        own={isOwnMessage}
                        sender={m.sender}
                        showTime={showTime}
                      />
                      {isLastMessage && isOwnMessage && (
                        <div className="not-seen-text">
                          {m.seen === false ? "Not seen yet" : "Seen"}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Input area */}
            <div className="chatBoxBottom">
              <div className="chatInputContainer">
                <button
                  type="button"
                  className="iconButton"
                  onClick={() => setShowEmojiPicker((prev) => !prev)}
                >
                  😄
                </button>

                <textarea
                  className="chatMessageInput"
                  placeholder="Write something..."
                  onChange={(e) => setNewMessage(e.target.value)}
                  value={newMessage}
                ></textarea>

                <button className="chatSubmitButton" onClick={handleSubmit}>
                  Send
                </button>
              </div>

              {/* Emoji picker popup */}
              {showEmojiPicker && (
                <div className="emojiPicker">
                  <EmojiPicker onEmojiClick={handleEmojiClick} />
                </div>
              )}
            </div>
          </>
        ) : (
          <span className="noConversationText">
            Open a conversation to start a chat.
          </span>
        )}
      </div>
    </div>
  );
};

export default ChatBox;
