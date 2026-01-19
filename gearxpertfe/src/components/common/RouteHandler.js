import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { showHomeLoading, hideHomeLoading } from '../../redux/action/appAction';
import { doLogout } from '../../redux/action/userAction';
import Cookies from 'js-cookie';
import { persistor } from '../../redux/store';

const RouteHandler = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { account, isAuthenticated } = useSelector(state => state.user);

    // Session validation: Check if token exists when authenticated
    useEffect(() => {
        const checkSession = async () => {
            const accessToken = Cookies.get('accessToken');
            if (isAuthenticated && !accessToken) {
                // If Redux says authenticated but cookie is gone (expired/deleted)
                // Disconnect socket if exists
                if (account?.socketConnection) {
                    account.socketConnection.disconnect();
                }

                // Clear everything
                dispatch(doLogout());
                Cookies.remove('accessToken');
                Cookies.remove('refreshToken');
                await persistor.purge();

                // Redirect to signin or just stay as guest depending on preference
                // Here we let it stay as guest for a smoother experience unless it's a restricted page
                console.log("Session expired or token missing, switching to guest mode.");
            }
        };

        checkSession();
    }, [isAuthenticated, account, dispatch, location]);

    useEffect(() => {
        // Enforce phone number requirement
        if (isAuthenticated && !account.phone && !account.phoneNumber && location.pathname !== '/profile') {
            navigate('/profile');
            return;
        }

        if (location.pathname === '/') {
            // Trigger global loading for Home page
            dispatch(showHomeLoading());

            const timer = setTimeout(() => {
                dispatch(hideHomeLoading());
            }, 800);

            return () => clearTimeout(timer);
        } else {
            // Ensure loading is off for other pages
            dispatch(hideHomeLoading());
        }
    }, [location.pathname, dispatch, isAuthenticated, account.phone, account.phoneNumber, navigate]);

    return null;
};

export default RouteHandler;