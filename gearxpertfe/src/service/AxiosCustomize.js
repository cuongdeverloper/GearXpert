import axios from 'axios';
import NProgress from 'nprogress';
import { store } from '../redux/store';
import { doLogout } from '../redux/action/userAction';

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
                    store.dispatch(doLogout());
                    window.location.href = '/signin';
                }
            }
        }

        return Promise.reject(error);
    }
);

export default instance;
