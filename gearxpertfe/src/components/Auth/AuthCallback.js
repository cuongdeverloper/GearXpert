import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import Cookies from 'js-cookie';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { jwtDecode } from 'jwt-decode';
import { doLoginWGoogle, doLogout } from '../../redux/action/userAction';

const AuthCallback = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    useEffect(() => {
        const handleGoogleRedirect = async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const accessToken = urlParams.get('accessToken');
            const refreshToken = urlParams.get('refreshToken');
            const user = urlParams.get('user');

            const isTokenExpired = (token) => {
                try {
                    const decodedToken = jwtDecode(token);
                    const currentTime = Date.now() / 1000;
                    return decodedToken.exp < currentTime;
                } catch (error) {
                    console.error('Lỗi khi giải mã token:', error);
                    return true;
                }
            };
            if (accessToken && refreshToken) {
                // Set tokens in cookies with correct `expires` format
                Cookies.set('accessToken', accessToken, { expires: 1 }); // 1 day
                Cookies.set('refreshToken', refreshToken, { expires: 7 }); // 7 days
                if (!accessToken || isTokenExpired(accessToken)) {
                    dispatch(doLogout());
                }
                if (user) {
                    const userData = JSON.parse(decodeURIComponent(user));
                    dispatch(doLoginWGoogle(userData, accessToken, refreshToken));

                    const userRole = userData?.role;
                    if (userRole === "ADMIN") {
                        navigate("/admin");
                    } else if (userRole === "SUPPLIER") {
                        navigate("/supplier/dashboard");
                    } else {
                        // CUSTOMER or other roles -> redirect to homepage
                        navigate("/");
                    }
                } else {
                    // If no user data, redirect to homepage
                    navigate('/');
                }
            } else {
                // Handle the case where tokens are not present
                console.error("Authentication failed: No tokens received.");
                toast.error("Authentication failed.");
                navigate('/signin');
            }
        };

        handleGoogleRedirect();
    }, [dispatch, navigate]);


    return (
        <div>
            <h1>Authentication Callback</h1>
            <p>If you see this, the component is rendering!</p>
        </div>
    );

};

export default AuthCallback;
