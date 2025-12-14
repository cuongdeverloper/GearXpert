import { Fetch_User_Success, Fetch_User_Success_Google, Set_Online_Users, Set_Socket_Connection } from "../action/userAction";
import { Fetch_User_LogOut } from "../action/userAction";
const INITIAL_STATE = {
    account: {
        id: '',
        access_token: '',
        email: '',
        refresh_token: '',
        username: '',
        role: '',
        onlineUser: null,
        socketConnection: null,
        image:''
    },
    isAuthenticated: false
};

const userReducer = (state = INITIAL_STATE, action) => {
    switch (action.type) {
        case Fetch_User_Success:
        case Fetch_User_Success_Google:
            return {
                ...state,
                account: {
                    ...state.account,
                    ...action.payload, 
                    onlineUser: state.account.onlineUser
                },
                isAuthenticated: true,
            };
        case Set_Online_Users:
            return {
                ...state,
                account: {
                    ...state.account,
                    onlineUser: action.payload
                }
            };
        case Fetch_User_LogOut:
            return {
                ...state,
                account: INITIAL_STATE.account, 
                isAuthenticated: false,
            };
        case Set_Socket_Connection:
            return {
                ...state,
                account: {
                    ...state.account,
                    socketConnection: action.payload
                }
            };
        default:
            return state;
    }
};

export default userReducer;