
import { SHOW_HOME_LOADING, HIDE_HOME_LOADING, SHOW_ADMIN_LOADING, HIDE_ADMIN_LOADING } from "../action/appAction";

const INITIAL_STATE = {
    isLoadingHome: false,
    isLoadingAdmin: false,
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
        case SHOW_ADMIN_LOADING:
            return {
                ...state,
                isLoadingAdmin: true,
            };
        case HIDE_ADMIN_LOADING:
            return {
                ...state,
                isLoadingAdmin: false,
            };
        default:
            return state;
    }
};

export default appReducer;
