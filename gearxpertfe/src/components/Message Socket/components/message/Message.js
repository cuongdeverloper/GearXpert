import "./Message.scss";
import ImageUser from "../../../public/avatar.jpg";

const Message = ({ message, own, showTime,receiver,handleDelete }) => {
  const exactTime = new Date(message.createdAt).toLocaleString('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
    day: 'numeric',
    month: 'short'
  });

  const displayTime = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (message.type === "call") {
    return (
      <>
        {showTime && <div className="messageSeparatorTime">{displayTime}</div>}
        
        <div className={own ? "message own" : "message"}>
            {!own && (
                <img
                    className="messageImg"
                    src={receiver?.avatar} 
                    alt="avatar"
                />
            )}
            
            <div className="messageWrapper">
                <div className="callBubble" style={{
                    padding: "12px 16px",
                    borderRadius: "20px",
                    background: own ? "#f3f4f6" : "white", 
                    border: "1px solid #e5e7eb",
                    color: "#374151",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                }}>
                    <div style={{
                        width: "36px", height: "36px", 
                        borderRadius: "50%", 
                        background: "#e5e7eb", 
                        display: "flex", alignItems: "center", justifyContent: "center"
                    }}>
                        <i className="fas fa-video" style={{color: "#333", fontSize: "14px"}}></i>
                    </div>
                    
                    <div style={{display: "flex", flexDirection: "column"}}>
                        <span style={{fontWeight: "600", fontSize: "14px"}}>Cuộc gọi video</span>
                        <span style={{fontSize: "11px", color: "#6b7280"}}>{exactTime}</span>
                    </div>
                </div>
            </div>
        </div>
      </>
    )
  }

  return (
    <>
      {showTime && (
        <div className="messageSeparatorTime">
          {displayTime}
        </div>
      )}

      <div className={own ? "message own" : "message"}>
        
        {!own && (
          <img
            className="messageImg"
            src={receiver?.avatar || ImageUser} 
            alt="avatar"
          />
        )}

        <div className="messageWrapper group relative">
          {message.image && (
            <img 
              className="messageContentImg" 
              src={message.image} 
              alt="sent image" 
              title={exactTime}
            />
          )}

          {message.text && (
            <p className="messageText" title={exactTime}>
              {message.text}
            </p>
          )}

          {/* Nút xóa */}
          <div 
             className="messageActions opacity-0 group-hover:opacity-100 transition-opacity absolute top-1/2 -translate-y-1/2 cursor-pointer"
             style={{ [own ? 'left' : 'right']: '-30px' }} 
           >
               <i 
                 className="fas fa-trash-alt text-red-500 hover:scale-110 transition-transform p-2" 
                 onClick={() => handleDelete(message._id)}
                 title="Xóa ở phía tôi"
               ></i>
           </div>
        </div>
      </div>
    </>
  );
};

export default Message;