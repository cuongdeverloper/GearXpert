import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { showHomeLoading, hideHomeLoading } from '../../redux/action/appAction';

const RouteHandler = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { account, isAuthenticated } = useSelector(state => state.user);

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