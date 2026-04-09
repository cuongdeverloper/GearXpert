import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Particles from "react-particles";
import { loadSlim } from "tsparticles-slim";
import { ImSpinner9 } from "react-icons/im";
import { FaCheckCircle, FaTimesCircle, FaArrowRight, FaHome } from "react-icons/fa";
import { verifyAccountApi } from "../Auth/ApiAuth";
// import brandLogo from "../../../assets/logoGearXpert.png";
import "./VerifyAccount.scss";

const VerifyAccount = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("verifying");
  const [message, setMessage] = useState("");
  const [countdown, setCountdown] = useState(5);
  const navigate = useNavigate();

  const particlesInit = useCallback(async (engine) => {
    await loadSlim(engine);
  }, []);

  useEffect(() => {
    const verify = async () => {
      const token = searchParams.get("token");
      if (!token) {
        setStatus("failed");
        setMessage("Liên kết xác thực không hợp lệ hoặc đã hết hạn.");
        return;
      }

      try {
        const response = await verifyAccountApi(token);
        setStatus("success");
        setMessage(response.message || "Tài khoản của bạn đã được xác thực thành công!");
      } catch (error) {
        setStatus("failed");
        setMessage(
          error?.response?.data?.message || "Xác thực thất bại. Vui lòng thử lại sau."
        );
      }
    };

    verify();
  }, [searchParams]);

  useEffect(() => {
    let timer;
    if (status === "success" && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (status === "success" && countdown === 0) {
      navigate("/signin");
    }
    return () => clearInterval(timer);
  }, [status, countdown, navigate]);

  return (
    <div className="verify-page-wrapper">
      <Particles
        id="tsparticles"
        init={particlesInit}
        options={{
          background: {
            color: {
              value: "transparent",
            },
          },
          fpsLimit: 120,
          interactivity: {
            events: {
              onClick: { enable: true, mode: "push" },
              onHover: { enable: true, mode: "grab" },
              resize: true,
            },
            modes: {
              push: { quantity: 4 },
              grab: { distance: 140, links: { opacity: 0.5 } },
            },
          },
          particles: {
            color: { value: "#6366f1" },
            links: {
              color: "#6366f1",
              distance: 150,
              enable: true,
              opacity: 0.3,
              width: 1,
            },
            move: {
              direction: "none",
              enable: true,
              outModes: { default: "bounce" },
              random: false,
              speed: 1,
              straight: false,
            },
            number: {
              density: { enable: true, area: 800 },
              value: 80,
            },
            opacity: { value: 0.4 },
            shape: { type: "circle" },
            size: { value: { min: 1, max: 3 } },
          },
          detectRetina: true,
        }}
      />

      <div className="container-content">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="verify-card"
        >
          <div className="card-top">
            {/* <img src={brandLogo} alt="GearXpert Logo" className="brand-logo" /> */}
            <div className="status-indicator">
              <AnimatePresence mode="wait">
                {status === "verifying" && (
                  <motion.div
                    key="verifying"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="status-icon"
                  >
                    <ImSpinner9 className="icon-spin text-indigo-500" />
                  </motion.div>
                )}
                {status === "success" && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="status-icon success"
                  >
                    <FaCheckCircle />
                  </motion.div>
                )}
                {status === "failed" && (
                  <motion.div
                    key="failed"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="status-icon error"
                  >
                    <FaTimesCircle />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="card-body">
            <AnimatePresence mode="wait">
              <motion.div
                key={status}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4 }}
              >
                {status === "verifying" && (
                  <div className="message-group">
                    <h2 className="title">Đang xác thực...</h2>
                    <p className="description">Vui lòng chờ trong giây lát, chúng tôi đang kiểm tra thông tin tài khoản của bạn.</p>
                  </div>
                )}

                {status === "success" && (
                  <div className="message-group">
                    <h2 className="title success">Xác thực thành công</h2>
                    <p className="description">{message}</p>
                    <div className="redirect-info">
                      Tự động quay lại trang đăng nhập sau <span>{countdown}s</span>
                    </div>
                    <div className="action-buttons">
                      <button onClick={() => navigate("/signin")} className="btn-primary">
                        ĐĂNG NHẬP NGAY <FaArrowRight />
                      </button>
                    </div>
                  </div>
                )}

                {status === "failed" && (
                  <div className="message-group">
                    <h2 className="title error">Xác thực thất bại</h2>
                    <p className="description">{message}</p>
                    <div className="action-buttons">
                      <Link to="/" className="btn-outline">
                        <FaHome /> VỀ TRANG CHỦ
                      </Link>
                      <button onClick={() => window.location.reload()} className="btn-ghost">
                        THỬ LẠI
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="card-footer">
            <p>© {new Date().getFullYear()} GearXpert - Nền tảng cho thuê thiết bị hàng đầu.</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default VerifyAccount;