import "./Message.scss";
import ImageUser from "../../../public/avatar.jpg";

const Message = ({ message, own, sender, showTime }) => {
  return (
    <div className={own ? "message own" : "message"}>
      {showTime && (
        <p className="messageBottom">
          {new Date(message.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      )}

      <div className="messageTop">
        {!own && (
          <img
            className="messageImg"
            src={sender.image || ImageUser}
            alt="img"
          />
        )}
        <p className="messageText">{message.text}</p>
      </div>
    </div>
  );
};

export default Message;
