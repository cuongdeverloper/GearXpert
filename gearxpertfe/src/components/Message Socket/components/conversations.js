import { useEffect, useState } from "react";
import "./conversation.scss";
import ImageUser from "../../public/avatar.jpg"; 
import { ApiGetUserByUserId } from "../ApiMessage";

const Conversation = ({ conversation, currentUser, isActive, isOnline }) => {
  const [user, setUser] = useState(null);

  const getUser = async (friendId) => {
    try {
      const response = await ApiGetUserByUserId(friendId);
      if (response) setUser(response);
    } catch (err) {
      console.error("Error getting user:", err);
    }
  };

  useEffect(() => {
    const friendId = conversation?.members?.find((m) => m !== currentUser?.id);
    if (friendId) {
      getUser(friendId);
    }
  }, [currentUser, conversation]);

  return (
    <div className={`conversation ${isActive ? "active" : ""}`}>
      <div className="conversationImgContainer">
        <img
          className="conversationImg"
          src={user?.avatar || ImageUser}
          alt=""
        />
        {isOnline && <div className="onlineDot"></div>}
      </div>
      
      <div className="conversationDetails">
        <span className="conversationName">{user?.fullName || "User"}</span>
        <div className="conversationInfo">
            <span className="lastMessage">Click to start chatting</span>
        </div>
      </div>
    </div>
  );
};

export default Conversation;