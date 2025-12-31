import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import "./ResetPassword.scss"
import { resetPasswordApi } from '../ApiAuth';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const token = searchParams.get('token');
    const navigate = useNavigate();

    const handleResetPassword = async () => {
        if (newPassword !== confirmPassword) {
            toast.error("Passwords do not match!");
            return;
        }
        try {
            const response = await resetPasswordApi(token, newPassword);
            if (response.errorCode === 0) {
                toast.success(response.message);
                navigate('/signin');
            } else {
                toast.error(response.message);
            }
        } catch (error) {
            toast.error("An error occurred while resetting password.");
        }
    };

    return (
        <div className="reset-password__container">
            <h2 className="reset-password__heading">Reset Your Password</h2>
            <div className="reset-password__form-group">
                <label className="reset-password__label">New Password</label>
                <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="reset-password__form-control"
                />
            </div>
            <div className="reset-password__form-group">
                <label className="reset-password__label">Confirm Password</label>
                <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="reset-password__form-control"
                />
            </div>
            <button className="reset-password__btn" onClick={handleResetPassword}>
                Reset Password
            </button>
        </div>
    );
};

export default ResetPassword;
