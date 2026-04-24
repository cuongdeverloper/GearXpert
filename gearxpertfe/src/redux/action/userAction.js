const Fetch_User_Success = 'FETCH_USER_SUCCESS';
const Fetch_User_LogOut = 'FETCH_USER_LOGOUT';
const Fetch_User_Success_Google = 'FETCH_USER_SUCCESS_GOOGLE';
const Set_Online_Users = 'SET_ONLINE_USERS';
const Set_Socket_Connection = 'SET_SOCKET_CONNECTION';

const doLogin = (response) => {
    const data = response.data;
    return {
        type: Fetch_User_Success,
        payload: {
            id: data?.id || '',
            access_token: data?.access_token || '',
            email: data?.email || '',
            refresh_token: data?.refresh_token || '',
            username: data?.username || data?.fullName || '',
            role: data?.role || '',
            type: data?.type || 'Local',
            phoneNumber: data?.phoneNumber || data?.phone || '',
            phone: data?.phone || data?.phoneNumber || '',
            gender: data?.gender || '',
            image: data?.image || data?.avatar || '',
            address: data?.address || {},
            rank: data?.rank || 'BRONZE',
            walletBalance: data?.walletBalance || 0,
            rewardPoints: data?.rewardPoints || 0,
            isVerified: data?.isVerified || '',
            isVerifiedEkyc: data?.isVerifiedEkyc || '',
            signatureUrl: data?.signatureUrl || ''
        }
    };
};

const doLoginWGoogle = (response, access_token, refresh_token) => {
    return {
        type: Fetch_User_Success_Google,
        payload: {
            id: response?._id || '',
            access_token: access_token || '',
            email: response?.email || '',
            refresh_token: refresh_token || '',
            username: response?.username || response?.fullName || '',
            role: response?.role || '',
            type: response?.type || 'GOOGLE',
            phoneNumber: response?.phoneNumber || response?.phone || '',
            phone: response?.phone || response?.phoneNumber || '',
            gender: response?.gender || '',
            image: response?.image || response?.avatar || '',
            address: response?.address || {},
            rank: response?.rank || 'BRONZE',
            walletBalance: response?.walletBalance || 0,
            rewardPoints: response?.rewardPoints || 0,
            isVerified: response?.isVerified || '',
            isVerifiedEkyc: response?.isVerifiedEkyc || '',
            signatureUrl: response?.signatureUrl || ''
        }
    };
};

const doLogout = () => ({
    type: Fetch_User_LogOut,
});

const setOnlineUser = (onlineUsers) => ({
    type: Set_Online_Users,
    payload: onlineUsers
});

const setSocketConnection = (socketConnection) => ({
    type: Set_Socket_Connection,
    payload: socketConnection
});

module.exports = {
    Fetch_User_Success,
    Fetch_User_LogOut,
    Fetch_User_Success_Google,
    Set_Online_Users,
    Set_Socket_Connection,
    doLogin,
    doLoginWGoogle,
    doLogout,
    setOnlineUser,
    setSocketConnection
};
