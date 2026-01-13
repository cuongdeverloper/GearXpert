import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { showHomeLoading, hideHomeLoading } from '../../redux/action/appAction';

const RouteHandler = () => {
    const location = useLocation();
    const dispatch = useDispatch();

    useEffect(() => {
        if (location.pathname === '/') {
            // Trigger global loading for Home page
            dispatch(showHomeLoading());

            // Artificial delay to show the loader (or wait for data if we had async logic here)
            // For now, consistent 800ms delay for smooth UX
            const timer = setTimeout(() => {
                dispatch(hideHomeLoading());
            }, 800);

            return () => clearTimeout(timer);
        } else {
            // Ensure loading is off for other pages
            dispatch(hideHomeLoading());
        }
    }, [location.pathname, dispatch]);

    return null;
};

export default RouteHandler;
