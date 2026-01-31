import "./Message.scss";
import ImageUser from "../../../public/avatar.jpg";

const Message = ({ message, own, showTime, receiver, handleDelete }) => {
  const messageDate = new Date(message.createdAt);
  
  // Create a display string that changes based on whether the message is from today or older
  const getDisplayTime = (date) => {
    const today = new Date();
    const isToday = date.getDate() === today.getDate() &&
                    date.getMonth() === today.getMonth() &&
                    date.getFullYear() === today.getFullYear();

    if (isToday) {
      // If today, show only time (e.g., 10:30 AM)
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else {
      // If older than today, show full date and time (e.g., 01/02/2026 10:30 AM)
      return date.toLocaleString('en-US', {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      });
    }
  };

  const displayTime = getDisplayTime(messageDate);
  
  const exactTime = messageDate.toLocaleString('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
    day: 'numeric',
    month: 'short',
    year: 'numeric'
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
            alt="User avatar" 
          />
        )}

        <div className="messageWrapper group relative">
          {message.image && (
            <img 
              className="messageContentImg" 
              src={message.image} 
              alt="Message attachment"
              title={exactTime}
            />
          )}

          {message.text && (
            <p className="messageText" title={exactTime}>
              {message.text}
            </p>
          )}

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