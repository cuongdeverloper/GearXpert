import { createStore, applyMiddleware, compose } from "redux";
import { persistStore, persistReducer, createTransform } from "redux-persist";
import storage from "redux-persist/lib/storage";

import { thunk } from "redux-thunk";
import rootReducer from "./reducer/rootReducer";

const SetTransform = createTransform(
  (inboundState, key) => {
    if (key === 'user' && inboundState.account) {
      return {
        ...inboundState,
        account: {
          ...inboundState.account,
          socketConnection: null,
        }
      };
    }
    return inboundState;
  },
  (outboundState, key) => {
    return outboundState;
  },
  { whitelist: ['user'] }
);

const persistConfig = {
  key: "root",
  storage,
  transforms: [SetTransform],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);
const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

const store = createStore(
  persistedReducer,
  composeEnhancers(applyMiddleware(thunk))
);

let persistor = persistStore(store);

export { store, persistor };
