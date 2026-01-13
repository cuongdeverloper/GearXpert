import axios from 'axios';
import NProgress from 'nprogress';
import { store } from '../redux/store';
import { doLogout } from '../redux/action/userAction';
import Cookies from 'js-cookie';
import { persistor } from '../redux/store';

const instance = axios.create({
    baseURL: 'http://localhost:1357/',
    withCredentials: true,
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
                    window.location.href = '/signin';
                }
            }
        }

        return Promise.reject(error);
    }
);

export default instance;
