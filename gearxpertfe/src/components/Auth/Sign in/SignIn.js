import { useEffect, useState } from "react";
import { ImSpinner9 } from "react-icons/im";
import { FaGoogle } from "react-icons/fa";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import { useDispatch, useSelector } from "react-redux";
import { doLogin } from "../../../redux/action/userAction";
import { ApiLogin, ApiRegister } from "../ApiAuth";
import Header from "../../navigation/Header";
import Footer from "../../homepage/Footer";
import RequestPasswordReset from "../reset password/RequestPasswordReset";
import BlockedAccountModal from "./BlockedAccountModal";

const SignIn = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [isLoadingLogin, setIsLoadingLogin] = useState(false);
  const [isLoadingRegister, setIsLoadingRegister] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  const [isFormValidRegister, setIsFormValidRegister] = useState(false);
  const [isBlockedModalOpen, setIsBlockedModalOpen] = useState(false);

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
  const [role] = useState("CUSTOMER");

  useEffect(() => {
    setIsFormValid(email && password);
  }, [email, password]);

  useEffect(() => {
    const isPhoneValid = /^\d{10}$/.test(phone);
    setIsFormValidRegister(fullName && emailReg && passwordReg && isPhoneValid);
  }, [fullName, emailReg, passwordReg, phone]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get("error");
    if (error && error.includes("khóa")) {
      setIsBlockedModalOpen(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      const currentRole = userAccount.role;
      // If phone is missing, redirect to profile regardless of role (except maybe admin/supplier if they have different needs, but user request says redirect to /profile)
      if (!userAccount.phone && !userAccount.phoneNumber) {
        navigate("/profile");
        return;
      }

      if (currentRole === "ADMIN") {
        navigate("/admin");
      } else if (currentRole === "SUPPLIER") {
        navigate("/supplier-dashboard");
      } else {
        navigate("/");
      }
    }
  }, [isAuthenticated, userAccount.role, userAccount.phone, userAccount.phoneNumber, navigate]);

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

        Cookies.set("accessToken", response.data.access_token, { expires: 1 });
        Cookies.set("refreshToken", response.data.refresh_token, { expires: 7 });

        await dispatch(doLogin(response));

        if (!response.data.phone) {
          navigate("/profile");
        } else {
          const userRole = response.data?.role;
          if (userRole === "ADMIN") {
            navigate("/admin");
          } else if (userRole === "SUPPLIER") {
            navigate("/supplier-dashboard");
          } else {
            navigate("/");
          }
        }
      } else if (response.errorCode === 4) {
        setIsBlockedModalOpen(true);
      } else {
        toast.error(response.message || "Đăng nhập không thành công.");
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Lỗi kết nối server.");
    } finally {
      setIsLoadingLogin(false);
    }
  };

  const handleSubmitRegister = async (e) => {
    e.preventDefault();
    setIsLoadingRegister(true);
    try {
      const response = await ApiRegister(fullName, emailReg, passwordReg, phone, role, avatar);
      if (response?.errorCode === 0) {
        toast.success("Đăng ký thành công! Hãy kiểm tra email để xác thực tài khoản.");
        setIsSignUp(false);
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
    <div className="min-h-screen flex flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-200 via-slate-50 to-cyan-200 relative">
      <Header />

      {/* Main Content Area */}
      <main className="flex-grow flex items-center justify-center p-4 md:p-6 relative z-10 w-full">
        {/* Main Container */}
        <div className="relative w-full max-w-5xl">
          {/* Outer wrapper for toggle button positioning */}
          <div className="relative">
            <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden">
              <div className="grid md:grid-cols-2 relative min-h-[500px]">
                {/* Column 1: Single parent container */}
                <div className="relative">
                  {/* Login Form - absolute inset-0, visible when !isSignUp */}
                  <div className={`absolute inset-0 bg-gradient-to-br from-primary via-indigo-600 to-accent-cyan p-5 md:p-6 lg:p-8 flex flex-col justify-center transition-opacity duration-700 ease-in-out ${isSignUp ? 'opacity-0 pointer-events-none' : 'opacity-100'
                    }`}>
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/60 via-slate-900/40 to-cyan-900/60"></div>

                    <div className="relative z-10 text-white max-w-md mx-auto w-full">
                      <div className="mb-4">
                        {/* Logo removed here as it is in Header now, or keep as sub-brand? I'll keep it but maybe smaller or adjusted if needed. Keeping it for now as "Form Header". */}
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-panel border-white/30 mb-3">
                          <span className="material-symbols-outlined text-accent-cyan text-[20px] fill-current">videocam</span>
                          <span className="text-sm font-bold tracking-wide font-display">GearXpert</span>
                        </div>
                        <h2 className="font-bold mb-2 font-display leading-tight" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.25rem)' }}>
                          Chào mừng trở lại!
                        </h2>
                        <p className="text-sm md:text-base text-slate-100 font-light leading-relaxed">
                          Đăng nhập để tiếp tục trải nghiệm dịch vụ cho thuê thiết bị chuyên nghiệp
                        </p>
                      </div>

                      <form onSubmit={handleSubmitLogin} className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-white/90 mb-1.5">
                            Email
                          </label>
                          <input
                            type="email"
                            placeholder="your@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:border-transparent transition-all text-base"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-white/90 mb-1.5">
                            Mật khẩu
                          </label>
                          <input
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:border-transparent transition-all text-base"
                            required
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={!isFormValid || isLoadingLogin}
                          className="w-full bg-white text-primary font-bold py-2.5 rounded-lg hover:bg-slate-100 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 text-base mt-1"
                        >
                          {isLoadingLogin && <ImSpinner9 className="animate-spin" />}
                          ĐĂNG NHẬP
                        </button>

                        <div className="pt-1.5">
                          <button
                            type="button"
                            onClick={redirectGoogleLogin}
                            className="w-full bg-white/10 backdrop-blur-sm border border-white/30 text-white font-semibold py-2.5 rounded-lg hover:bg-white/20 transition-all flex items-center justify-center gap-2 text-base"
                          >
                            <FaGoogle className="text-[20px]" />
                            Đăng nhập với Google
                          </button>
                        </div>

                        <div className="text-center pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              // Instead of navigating, we open the modal
                              setIsForgotPasswordOpen(true);
                            }}
                            className="text-sm text-white/80 hover:text-white hover:underline transition-colors"
                          >
                            Quên mật khẩu?
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>

                  {/* Forgot Password Modal Overlay */}
                  {isForgotPasswordOpen && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fade-in">
                      {/* Backdrop */}
                      <div
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
                        onClick={() => setIsForgotPasswordOpen(false)}
                      ></div>

                      {/* Modal Content */}
                      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden transform transition-all animate-scale-up">
                        <button
                          onClick={() => setIsForgotPasswordOpen(false)}
                          className="absolute top-2 right-2 p-2 text-slate-400 hover:text-slate-600 z-50 rounded-full hover:bg-slate-100 transition-all"
                        >
                          <span className="material-symbols-outlined text-xl">close</span>
                        </button>

                        {/*
                          Re-using existing RequestPasswordReset component.
                          Note: We wrap it to constrain its styling which was designed for full page.
                        */}
                        <div className="reset-password-modal-wrapper [&_.reset-container]:h-auto [&_.reset-container]:min-h-0 [&_.request-password-reset]:shadow-none [&_.request-password-reset]:bg-transparent [&_.request-password-reset]:w-full [&_.request-password-reset]:max-w-none [&_.request-password-reset]:m-0 [&_.request-password-reset]:p-8 md:[&_.request-password-reset]:p-10">
                          <RequestPasswordReset />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Image Decoration - absolute inset-0, visible when isSignUp */}
                  <div className={`absolute inset-0 hidden md:block transition-opacity duration-700 ease-in-out ${isSignUp ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}>
                    <div className="absolute inset-0 bg-cover bg-center" style={{
                      backgroundImage: 'url("https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1920&q=80")'
                    }}></div>
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900/20 to-slate-900/10"></div>
                  </div>
                </div>

                {/* Column 2: Single parent container */}
                <div className="relative">
                  {/* Image Decoration - absolute inset-0, visible when !isSignUp */}
                  <div className={`absolute inset-0 hidden md:block transition-opacity duration-700 ease-in-out ${isSignUp ? 'opacity-0 pointer-events-none' : 'opacity-100'
                    }`}>
                    <div className="absolute inset-0 bg-cover bg-center" style={{
                      backgroundImage: 'url("https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1920&q=80")'
                    }}></div>
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900/20 to-slate-900/10"></div>
                  </div>

                  {/* Register Form - relative flow layout, visible when isSignUp */}
                  <div className={`relative bg-white p-6 md:p-8 lg:p-10 flex flex-col justify-start transition-opacity duration-700 ease-in-out ${isSignUp ? 'opacity-100' : 'opacity-0 pointer-events-none absolute inset-0'
                    }`}>
                    <div className="relative z-10">
                      <div className="mb-4">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-3">
                          <span className="material-symbols-outlined text-primary text-[20px] fill-current">auto_awesome</span>
                          <span className="text-sm font-bold tracking-wide text-primary font-display">Tạo tài khoản mới</span>
                        </div>
                        <h2 className="font-bold mb-2 text-slate-900 font-display leading-tight" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.25rem)' }}>
                          Chào bạn mới!
                        </h2>
                        <p className="text-sm md:text-base text-slate-600 font-light">
                          Đăng ký để nhận nhiều ưu đãi và điểm thưởng tích lũy
                        </p>
                      </div>

                      <form onSubmit={handleSubmitRegister} className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Họ và Tên
                          </label>
                          <input
                            type="text"
                            placeholder="Họ tên của bạn"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-base"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Email
                          </label>
                          <input
                            type="email"
                            placeholder="your@email.com"
                            value={emailReg}
                            onChange={(e) => setEmailReg(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-base"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Mật khẩu
                          </label>
                          <input
                            type="password"
                            placeholder="Ít nhất 6 ký tự"
                            value={passwordReg}
                            onChange={(e) => setPasswordReg(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-base"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Số điện thoại
                          </label>
                          <input
                            type="text"
                            placeholder="Số điện thoại"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-base"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Ảnh đại diện (tùy chọn)
                          </label>
                          <div className="flex items-center gap-3">
                            <label
                              htmlFor="upload-avatar"
                              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer transition-all flex items-center justify-center gap-2"
                            >
                              <span className="material-symbols-outlined text-[20px]">upload</span>
                              <span className="text-sm font-medium">Tải ảnh lên</span>
                            </label>
                            <input
                              id="upload-avatar"
                              type="file"
                              accept="image/*"
                              onChange={handleImageChange}
                              className="hidden"
                            />
                            {avatarPreview && (
                              <div className="w-14 h-14 rounded-xl overflow-hidden border-2 border-primary">
                                <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                              </div>
                            )}
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={!isFormValidRegister || isLoadingRegister}
                          className="w-full bg-gradient-to-r from-primary to-accent-cyan text-white font-bold py-2.5 rounded-xl hover:from-primary-dark hover:to-cyan-500 transition-all duration-300 shadow-lg hover:shadow-glow-cyan transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 text-base"
                        >
                          {isLoadingRegister && <ImSpinner9 className="animate-spin" />}
                          ĐĂNG KÝ
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Toggle Button - Positioned outside overflow-hidden container */}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className={`absolute top-1/2 -translate-y-1/2 z-30 px-4 py-2 md:px-5 md:py-2.5 rounded-full bg-white shadow-2xl flex items-center justify-center text-primary hover:scale-110 transition-all duration-300 border-2 md:border-4 border-background-light font-semibold text-sm md:text-base whitespace-nowrap ${isSignUp
                ? 'left-0 -translate-x-[70%] md:-translate-x-[50%]'
                : 'right-0 translate-x-[70%] md:translate-x-[50%]'
                }`}
            >
              {isSignUp ? 'Đăng nhập' : 'Đăng ký'}
            </button>
          </div>
        </div>
      </main>

      <Footer />

      <BlockedAccountModal
        isOpen={isBlockedModalOpen}
        onClose={() => setIsBlockedModalOpen(false)}
      />
    </div>
  );
};

export default SignIn;
