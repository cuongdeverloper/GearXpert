import axios from 'axios';
import NProgress from 'nprogress';
import { store } from '../redux/store';
import { doLogout } from '../redux/action/userAction';
import Cookies from 'js-cookie';
import { persistor } from '../redux/store';

const instance = axios.create({
    baseURL: process.env.REACT_APP_BACKEND_URL,
    withCredentials: true,
    timeout: 30000,
});

// Request interceptor
instance.interceptors.request.use(
    function (config) {
        const state = store.getState();
        const accessToken = state.user.account.access_token;
        if (accessToken) {
            config.headers['Authorization'] = 'Bearer ' + accessToken;
        }
        NProgress.start();
        return config;
    },
    function (error) {
        NProgress.done();
        return Promise.reject(error);
    }
);

// Response interceptor
instance.interceptors.response.use(
    function (response) {
        NProgress.done();
        return response && response.data ? response.data : response;
    },
    function (error) {
        NProgress.done();

        if (error.response) {
            const { errorCode } = error.response.data;

            if (errorCode === -999) {
                const currentPath = window.location.pathname;
                if (currentPath !== '/signin') {
                    // Check if the error message indicates a blocked account
                    const serverMessage = error.response.data?.message || "";
                    const isBlocked = serverMessage.toLowerCase().includes("khóa");

                    // Get socket connection before clearing state
                    const state = store.getState();
                    const socketConnection = state.user.account.socketConnection;

                    // Disconnect socket if connected
                    if (socketConnection) {
                        socketConnection.disconnect();
                    }

                    // Dispatch logout action
                    store.dispatch(doLogout());

                    // Remove cookies
                    Cookies.remove('accessToken');
                    Cookies.remove('refreshToken');

                    // Purge Redux persist storage
                    persistor.purge();

                    // Navigate to login page
                    if (isBlocked) {
                        window.location.href = `/signin?error=${encodeURIComponent(serverMessage)}`;
                    } else {
                        window.location.href = '/signin';
                    }
                }
            }
        }

        return Promise.reject(error);
    }
);

export default instance;
