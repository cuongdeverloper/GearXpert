import { combineReducers } from "redux";
import userReducer from "./userReducer";
import appReducer from "./appReducer";
import chatWindowReducer from "./chatWindowReducer";

const rootReducer = combineReducers({
  user: userReducer,
  app: appReducer,
  chatWindow: chatWindowReducer,
});

export default rootReducer;
