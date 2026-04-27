
const initialState = {
  activeChats: [], 
};

const chatWindowReducer = (state = initialState, action) => {
  switch (action.type) {
    case "OPEN_CHAT_WINDOW": {
      const newChat = action.payload;
      const newId = String(newChat._id);
      const exists = state.activeChats.some((c) => String(c._id) === newId);
      if (exists) return state;

      let updatedChats = [...state.activeChats];
      if (updatedChats.length >= 3) {
        updatedChats.shift();
      }
      return {
        ...state,
        activeChats: [...updatedChats, newChat],
      };
    }

    /** Bring conversation to front (right column in row-reverse) or add it; cap at 3. */
    case "FOCUS_OR_OPEN_CHAT_WINDOW": {
      const chat = action.payload;
      if (!chat?._id) return state;
      const id = String(chat._id);
      const without = state.activeChats.filter((c) => String(c._id) !== id);
      return {
        ...state,
        activeChats: [chat, ...without].slice(0, 3),
      };
    }

    case "CLOSE_CHAT_WINDOW":
      return {
        ...state,
        activeChats: state.activeChats.filter(
          (c) => String(c._id) !== String(action.payload)
        ),
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

export const focusOrOpenChatWindow = (conversation) => ({
  type: "FOCUS_OR_OPEN_CHAT_WINDOW",
  payload: conversation,
});

export default chatWindowReducer;