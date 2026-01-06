import { useEffect, useState } from "react";
import "./conversation.scss";
import ImageUser from "../../public/avatar.jpg"
import { ApiGetUserByUserId } from "../ApiMessage";

const  Conversation = ({ conversation, currentUser }) => {
  const [user, setUser] = useState(null);
//   const PF = process.env.REACT_APP_PUBLIC_FOLDER;
const getUser = async (friendId) => {
  try {
    const response = await ApiGetUserByUserId(friendId);
    console.log(response)
    if (response) setUser(response);
  } catch (err) {
    console.error("Error getting user:", err);
  }
};
useEffect(() => {
  const friendId = conversation?.members?.find((m) => m !== currentUser?.id);
  if(friendId) {
    getUser(friendId);
  }
  
}, [currentUser, conversation]);


  return (
    <div className="conversation">
      <img
        className="conversationImg"
        src={user?.avatar || ImageUser
            // 
            // : PF + "person/noAvatar.png"
        }
        alt=""
      />
      <span className="conversationName">{user?.fullName}</span>
    </div>
  );
}
export default Conversation