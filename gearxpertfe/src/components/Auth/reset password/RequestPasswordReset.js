import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { FaLock, FaEnvelope } from 'react-icons/fa';
import "./RequestPasswordReset.scss";
import { requestPasswordResetApi } from '../ApiAuth';
import Particles from "../../../Particles";
const RequestPasswordReset = () => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);


    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const response = await requestPasswordResetApi(email);
            if(response && response.errorCode === 6) {
                toast.warning(response.message)
            }
            if (response.errorCode === 0) {
                toast.success(response.message);
            } else {
                toast.error(response.message);
            }
        } catch (error) {
            toast.error('Failed to send reset link. Please try again later.');
        } finally {
            setIsLoading(false);
        }
    };


    return (
      <div className='reset-container' style={{ position: 'relative' }}>
        <div className="ProfileManage-container-parti" style={{ position: 'absolute', zIndex: 1 }}>
                <Particles />
            </div>
                <div className="request-password-reset" style={{ position: 'relative', zIndex: 100, marginTop: '100px', width: '70%' }}>
            <FaLock className="request-password-reset__lock-icon" />
            <h2 className="request-password-reset__heading">Reset Password</h2>
            <form onSubmit={handleSubmit}>
                <div className="request-password-reset__form-group">
                    <label htmlFor="email" className="request-password-reset__label">Enter your email:</label>
                    <div className="request-password-reset__input-group">
                        <FaEnvelope className="request-password-reset__email-icon" />
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="request-password-reset__form-control"
                            required
                        />
                    </div>
                </div>
                <button type="submit" className="request-password-reset__btn" disabled={isLoading}>
                    {isLoading ? 'Sending...' : 'Send Reset Link'}
                </button>
            </form>
        </div>
      </div>

    );
};

export default RequestPasswordReset;
