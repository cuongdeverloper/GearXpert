import axios from '../../service/AxiosCustomize';
import Cookies from 'js-cookie';

export const ApiMarkMessagesAsSeen = async (conversationId) => {
  try {
    const token = Cookies.get("accessToken");

    if (!token) {
      window.open("/signin", "_blank");
      return;
    }

    const response = await axios.put(`/api/message/seenmessage/${conversationId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response;
  } catch (error) {
    console.error("Error message seen :", error);
    return null;
  }
};

export const ApiSendMessage = async (
  receiverId,
  text,
  conversationId = null,
  image = "",
  type = "text",
  payload = null
) => {
  try {
    const token = Cookies.get("accessToken");

    if (!token) {
      window.open("/signin", "_blank");
      return;
    }

    const response = await axios.post(
      "/api/message/message",
      { 
          receiverId, 
          text, 
          conversationId, 
          image,
          type,
          payload
      }, 
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response;
  } catch (error) {
    console.error("Error sending message:", error);
    return null;
  }
};

export const getConversationApi = async () => {
  try {
    const token = Cookies.get("accessToken");

    if (!token) {
      window.open("/signin", "_blank");
      return null;
    }

    const response = await axios.get(`/api/message/conversation`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response;
  } catch (error) {
    console.error("Error getting conversations:", error);
    return null;
  }
};

export const ApiGetMessageByConversationId = async (conversationId) => {
  try {
    const token = Cookies.get("accessToken");

    if (!token) {
      window.open("/signin", "_blank");
      return;
    }

    const response = await axios.get(`/api/message/messages/${conversationId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response;
  } catch (error) {
    console.error("Error get chat:", error);
    return null;
  }
};

export const ApiCreateConversation = async (receiverId) => {
  const response = await axios.post('/api/message/conversation', { receiverId });
  return response;
};

export const ApiGetUserByUserId = async (userId) => {
  try {
    const token = Cookies.get("accessToken");

    if (!token) {
      window.open("/signin", "_blank");
      return;
    }

    const response = await axios.get(`/api/message/user/${userId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response;
  } catch (error) {
    console.error("Error get user:", error);
    return null;
  }
};
export const ApiDeleteMessage = async (messageId) => {
  try {
    const token = Cookies.get("accessToken");
    if (!token) return false;

    await axios.put(`/api/message/delete/${messageId}`, {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return true;
  } catch (error) {
    console.error("Error deleting message:", error);
    return false;
  }
};