
const initialState = {
  activeChats: [], 
};

const chatWindowReducer = (state = initialState, action) => {
  switch (action.type) {
    case "OPEN_CHAT_WINDOW":
      const newChat = action.payload;
      const exists = state.activeChats.find((c) => c._id === newChat._id);
      
      if (exists) return state; 

      let updatedChats = [...state.activeChats];
      if (updatedChats.length >= 3) {
        updatedChats.shift(); 
      }
      return {
        ...state,
        activeChats: [...updatedChats, newChat],
      };

    case "CLOSE_CHAT_WINDOW":
      return {
        ...state,
        activeChats: state.activeChats.filter((c) => c._id !== action.payload),
      };

    case "CLOSE_ALL_CHATS":
      return {
        ...state,
        activeChats: [],
      };

    default:
      return state;
  }
};

export const openChatWindow = (conversation) => ({
  type: "OPEN_CHAT_WINDOW",
  payload: conversation,
});

export const closeChatWindow = (conversationId) => ({
  type: "CLOSE_CHAT_WINDOW",
  payload: conversationId,
});

export default chatWindowReducer;