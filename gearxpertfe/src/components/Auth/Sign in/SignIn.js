import { useEffect, useState } from "react";
import { FaGoogle, FaFacebook, FaUpload } from "react-icons/fa";
import { ImSpinner9 } from "react-icons/im";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import { useDispatch, useSelector } from "react-redux";
import { doLogin } from "../../../redux/action/userAction";
import { ApiLogin, ApiRegister } from "../ApiAuth";
import Particles from "../../../Particles";
import "./SignIn.scss";

const SignIn = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoadingLogin, setIsLoadingLogin] = useState(false);
  const [isLoadingRegister, setIsLoadingRegister] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  const [isFormValidRegister, setIsFormValidRegister] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const userAccount = useSelector((state) => state.user.account);
  const isAuthenticated = useSelector((state) => state.user.isAuthenticated);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [fullName, setFullName] = useState("");
  const [emailReg, setEmailReg] = useState("");
  const [passwordReg, setPasswordReg] = useState("");
  const [phone, setPhone] = useState("");
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [role, setRole] = useState("CUSTOMER");

  const validateLogin = () => setIsFormValid(email && password);
  const validateRegister = () =>
    setIsFormValidRegister(fullName && emailReg && passwordReg && phone);

  useEffect(() => validateLogin(), [email, password]);
  useEffect(() => validateRegister(), [fullName, emailReg, passwordReg, phone]);

  useEffect(() => {
    if (isAuthenticated) {
      const currentRole = userAccount.role;
      if (currentRole === "ADMIN") navigate("/admin");
      else if (currentRole === "SUPPLIER") navigate("/supplier-dashboard");

    }
  }, [isAuthenticated, userAccount.role, navigate]);


  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatar(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmitLogin = async (e) => {
    e.preventDefault();
    setIsLoadingLogin(true);
    try {
      let response = await ApiLogin(email, password);
      if (response.errorCode === 0) {
        toast.success(response.message);

        // Lưu Token vào Cookie
        Cookies.set("accessToken", response.data.access_token, { expires: 1 });
        Cookies.set("refreshToken", response.data.refresh_token, { expires: 7 });

        // Cập nhật Redux (Hàm doLogin sẽ nhận dữ liệu user mới từ backend)
        await dispatch(doLogin(response));
      } else {
        toast.error(response.message || "Đăng nhập không thành công.");
      }
    } catch {
      toast.error("Lỗi kết nối server.");
    } finally {
      setIsLoadingLogin(false);
    }
  };

  const handleSubmitRegister = async (e) => {
    e.preventDefault();
    setIsLoadingRegister(true);
    try {
      // Gọi API Register với các field của GearXpert
      const response = await ApiRegister(fullName, emailReg, passwordReg, phone, role, avatar);
      if (response?.errorCode === 0) {
        toast.success("Đăng ký thành công! Hãy kiểm tra email để xác thực tài khoản.");
        setIsSignUp(false); // Chuyển về panel đăng nhập
      } else {
        toast.error(response?.message || "Đăng ký thất bại.");
      }
    } catch {
      toast.error("Lỗi hệ thống khi đăng ký.");
    } finally {
      setIsLoadingRegister(false);
    }
  };

  const redirectGoogleLogin = () => {
    window.location.href = "http://localhost:1357/auth/google";
  };

  return (
    <div className="signin-container">
      <div className="signin-particles">
        <Particles />
      </div>

      <div className={`signin-main ${isSignUp ? "right-panel-active" : ""}`}>
        {/* ---------- PANEL ĐĂNG NHẬP ---------- */}
        <div className="signin-form-container">
          <form className="signin-form" onSubmit={handleSubmitLogin}>
            <h2>GearXpert Login</h2>
            <label>
              Email
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label>
              Mật khẩu
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>

            <button
              type="submit"
              className="signin-btn-primary"
              disabled={!isFormValid || isLoadingLogin}
            >
              {isLoadingLogin && <ImSpinner9 className="signin-loader" />}
              ĐĂNG NHẬP
            </button>

            <div className="signin-social-buttons">
              <button
                type="button"
                className="signin-btn-google"
                onClick={redirectGoogleLogin}
              >
                <FaGoogle /> Google Login
              </button>
            </div>

            <span className="forgot-password" onClick={() => navigate("/forgot-password")}>
              Quên mật khẩu?
            </span>
          </form>
        </div>

        {/* ---------- PANEL ĐĂNG KÝ ---------- */}
        <div className="signup-form-container">
          <form className="signup-form" onSubmit={handleSubmitRegister}>
            <h2>Tạo Tài Khoản</h2>
            <label>
              Họ và Tên
              <input
                type="text"
                placeholder="Họ tên của bạn"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </label>
            <label>
              Email
              <input
                type="email"
                placeholder="your@email.com"
                value={emailReg}
                onChange={(e) => setEmailReg(e.target.value)}
                required
              />
            </label>
            <label>
              Mật khẩu
              <input
                type="password"
                placeholder="Ít nhất 6 ký tự"
                value={passwordReg}
                onChange={(e) => setPasswordReg(e.target.value)}
                required
              />
            </label>
            <label>
              Số điện thoại
              <input
                type="text"
                placeholder="Số điện thoại"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </label>

            <div className="signin-upload-section">
              <label htmlFor="upload-avatar" className="signin-upload-btn">
                <FaUpload /> Tải ảnh đại diện
              </label>
              <input
                id="upload-avatar"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                hidden
              />
              {avatarPreview && (
                <div className="signin-image-preview">
                  <img src={avatarPreview} alt="Preview" />
                </div>
              )}
            </div>

            <button
              type="submit"
              className="signin-btn-primary"
              disabled={!isFormValidRegister || isLoadingRegister}
            >
              {isLoadingRegister && <ImSpinner9 className="signin-loader" />}
              ĐĂNG KÝ
            </button>
          </form>
        </div>

        <div className="signin-overlay-container">
          <div className="signin-overlay">
            <div className="signin-overlay-panel signin-overlay-left">
              <h2>Chào mừng trở lại!</h2>
              <p>Hãy đăng nhập để tiếp tục trải nghiệm mua sắm phụ kiện tại GearXpert.</p>
              <button className="signin-ghost-btn" onClick={() => setIsSignUp(false)}>
                ĐĂNG NHẬP
              </button>
            </div>
            <div className="signin-overlay-panel signin-overlay-right">
              <h2>Chào bạn mới!</h2>
              <p>Đăng ký thành viên GearXpert để nhận nhiều ưu đãi và điểm thưởng tích lũy.</p>
              <button className="signin-ghost-btn" onClick={() => setIsSignUp(true)}>
                ĐĂNG KÝ
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignIn;