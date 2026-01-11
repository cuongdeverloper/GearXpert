import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import "./VerifyAccount.scss"; 
import { ImSpinner9 } from "react-icons/im";
import { useNavigate } from "react-router-dom";
import { verifyAccountApi } from "../Auth/ApiAuth";

const VerifyAccount = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("verifying");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

   useEffect(() => {
    const verify = async () => {
      const token = searchParams.get("token");
      if (!token) {
        setStatus("failed");
        setMessage("Invalid verification link.");
        return;
      }

      try {
        const response = await verifyAccountApi(token);
        setStatus("success");
        setMessage(response.message || "Your account has been verified.");
        setTimeout(() => {
          navigate("/signin");
        }, 3000);
      } catch (error) {
        setStatus("failed");
        setMessage(
          error?.response?.message || "Verification failed. Please try again."
        );
      }
    };

    verify();
  }, [searchParams, navigate]);

  return (
    <div className="verify-account-container">
      {status === "verifying" && (
        <>
          <ImSpinner9 className="spinner" />
          <p>Verifying your account...</p>
        </>
      )}
      {status === "success" && (
        <>
          <h2>✅ Verified!</h2>
          <p>{message}</p>
          <p>Redirecting to login page...</p>
        </>
      )}
      {status === "failed" && (
        <>
          <h2>❌ Verification Failed</h2>
          <p>{message}</p>
        </>
      )}
    </div>
  );
};

export default VerifyAccount;