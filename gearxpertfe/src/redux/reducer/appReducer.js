
import { SHOW_HOME_LOADING, HIDE_HOME_LOADING } from "../action/appAction";

const INITIAL_STATE = {
    isLoadingHome: false,
};

const appReducer = (state = INITIAL_STATE, action) => {
    switch (action.type) {
        case SHOW_HOME_LOADING:
            return {
                ...state,
                isLoadingHome: true,
            };
        case HIDE_HOME_LOADING:
            return {
                ...state,
                isLoadingHome: false,
            };
        default:
            return state;
    }
};

export default appReducer;
