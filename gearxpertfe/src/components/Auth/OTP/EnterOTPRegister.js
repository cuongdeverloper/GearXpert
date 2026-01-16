import {useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { ImSpinner9 } from "react-icons/im";
import "./otp.scss"
import { sendOTPApi } from "../ApiAuth";

const EnterOTPRegister = () => {
  const [otp, setOtp] = useState('');
  const location = useLocation();
  const userId = location.state?.userId;
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleVerifyOtp = async () => {
    setIsLoading(true);
    try {
      // Call the correct function to verify OTP
      const response = await sendOTPApi(userId, otp);
      if (response && response.errorCode === 0) {
        toast.success(response.message);
        navigate('/signin'); 
      } else {
        toast.error(response.message);
      }
    } catch (error) {
      toast.error('An error occurred while verifying the OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="enterotp-bigcontainer">
      <div className="EnterOTP-container">
      <h1 className="otp-title">Enter OTP</h1>
      <div className="otp-input-group">
        <input
          type="text"
          placeholder="Enter your OTP"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          className="otp-input"
        />
        <button
          type="button"
          className="btn-verify-otp"
          onClick={handleVerifyOtp}
          disabled={isLoading || !otp} 
        >
          {isLoading && <ImSpinner9 className="loaderIcon" />}
          VERIFY OTP
        </button>
      </div>
    </div>
    </div>
    
  );
};

export default EnterOTPRegister;
