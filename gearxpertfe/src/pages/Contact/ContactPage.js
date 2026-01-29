import { useEffect, useState } from "react";
import Header from "../../components/navigation/Header";
import Footer from "../../components/homepage/Footer";
import ScrollAnimation from "../../components/common/ScrollAnimation";

/**
 * Contact Page - Liên hệ
 * C2C equipment rental platform - Static UI, no API calls
 */
export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const prevTitle = document.title;
    const metaDesc = document.querySelector('meta[name="description"]');
    const prevContent = metaDesc?.getAttribute("content") || "";

    document.title = "Liên hệ | GearXpert";
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        "Liên hệ GearXpert – Hỗ trợ, câu hỏi, phản hồi và giải quyết tranh chấp cho nền tảng thuê thiết bị C2C."
      );
    }

    return () => {
      document.title = prevTitle;
      if (metaDesc) metaDesc.setAttribute("content", prevContent);
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = "Vui lòng nhập họ và tên";
    if (!formData.email.trim()) newErrors.email = "Vui lòng nhập email";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Email không hợp lệ";
    }
    if (!formData.message.trim()) newErrors.message = "Vui lòng nhập nội dung liên hệ";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitted(true);
    setFormData({ name: "", email: "", phone: "", message: "" });
  };

  const socialLinks = [
    { label: "Facebook", url: "https://facebook.com", icon: "public" },
    { label: "Instagram", url: "https://instagram.com", icon: "photo_camera" },
    { label: "LinkedIn", url: "https://linkedin.com", icon: "work" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background-light">
      <Header />

      <main className="flex-grow w-full pb-12">
        <section className="relative w-full bg-slate-900 overflow-hidden mb-10 pt-16 pb-24 lg:pt-24 lg:pb-32">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1920&q=80')] bg-cover bg-center opacity-30 mix-blend-overlay" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/80 to-background-light" />

          <div className="relative z-10 max-w-[1440px] mx-auto px-6 lg:px-10 text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 font-display tracking-tight">
              Liên <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-cyan to-indigo-400">hệ</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-300 max-w-3xl mx-auto font-light">
              Chúng tôi luôn sẵn sàng lắng nghe và hỗ trợ bạn.
            </p>
          </div>
        </section>

        <div className="max-w-[1440px] mx-auto px-6 lg:px-10 -mt-20 relative z-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-start">
            {/* Left – Contact Information */}
            <ScrollAnimation direction="up" viewportAmount={0.1} className="w-full">
              <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 lg:p-10 w-full">
                <h2 className="text-2xl font-bold text-slate-900 mb-4 font-display">
                  Kết nối với GearXpert
                </h2>
                <p className="text-slate-700 leading-relaxed mb-8">
                  Bạn có thể liên hệ với chúng tôi để được hỗ trợ, đặt câu hỏi, gửi phản hồi
                  hoặc yêu cầu hỗ trợ giải quyết tranh chấp. Đội ngũ GearXpert luôn sẵn sàng
                  phản hồi trong thời gian sớm nhất.
                </p>

                <div className="space-y-6 mb-8">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-primary text-[24px] mt-0.5">mail</span>
                    <div>
                      <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Email</p>
                      <a
                        href="mailto:support@gearxpert.vn"
                        className="text-slate-800 hover:text-primary font-medium transition-colors"
                      >
                        support@gearxpert.vn
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-primary text-[24px] mt-0.5">call</span>
                    <div>
                      <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Hotline</p>
                      <a
                        href="tel:0834438945"
                        className="text-primary font-bold text-lg hover:text-primary-dark transition-colors"
                      >
                        0834 438 945
                      </a>
                    </div>
                  </div>
                </div>

                <div className="mb-8 p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                  <p className="text-sm font-semibold text-slate-700 mb-3">Giờ hỗ trợ</p>
                  <ul className="text-slate-700 text-sm space-y-1">
                    <li>Thứ Hai – Thứ Sáu: 8:30 – 17:30</li>
                    <li>Thứ Bảy, Chủ Nhật & ngày lễ: Hỗ trợ hạn chế (qua email)</li>
                  </ul>
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-3">Mạng xã hội</p>
                  <div className="flex gap-3">
                    {socialLinks.map((item) => (
                      <a
                        key={item.label}
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-12 h-12 rounded-full flex items-center justify-center border-2 border-slate-200 text-slate-600 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all"
                        aria-label={item.label}
                        title={item.label}
                      >
                        <span className="material-symbols-outlined text-[24px]">{item.icon}</span>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollAnimation>

            {/* Right – Contact Form */}
            <ScrollAnimation direction="up" viewportAmount={0.1} className="w-full">
              <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 lg:p-10 w-full">
                <h2 className="text-2xl font-bold text-slate-900 mb-6 font-display">
                  Gửi tin nhắn
                </h2>

                {submitted ? (
                  <div className="p-6 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800">
                    <p className="font-medium">
                      Chúng tôi sẽ phản hồi qua email trong thời gian sớm nhất.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                    <div>
                      <label htmlFor="contact-name" className="block text-sm font-semibold text-slate-700 mb-2">
                        Họ và tên <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="contact-name"
                        name="name"
                        type="text"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Nguyễn Văn A"
                        required
                        className={`w-full px-4 py-3 rounded-xl border bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors ${
                          errors.name ? "border-red-400" : "border-slate-200"
                        }`}
                      />
                      {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
                    </div>

                    <div>
                      <label htmlFor="contact-email" className="block text-sm font-semibold text-slate-700 mb-2">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="contact-email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="email@example.com"
                        required
                        className={`w-full px-4 py-3 rounded-xl border bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors ${
                          errors.email ? "border-red-400" : "border-slate-200"
                        }`}
                      />
                      {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
                    </div>

                    <div>
                      <label htmlFor="contact-phone" className="block text-sm font-semibold text-slate-700 mb-2">
                        Số điện thoại <span className="text-slate-400 text-xs">(tùy chọn)</span>
                      </label>
                      <input
                        id="contact-phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="0901 234 567"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                      />
                    </div>

                    <div>
                      <label htmlFor="contact-message" className="block text-sm font-semibold text-slate-700 mb-2">
                        Nội dung liên hệ <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        id="contact-message"
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        placeholder="Nhập nội dung câu hỏi hoặc phản hồi của bạn..."
                        required
                        rows={5}
                        className={`w-full px-4 py-3 rounded-xl border bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors resize-none ${
                          errors.message ? "border-red-400" : "border-slate-200"
                        }`}
                      />
                      {errors.message && <p className="mt-1 text-sm text-red-500">{errors.message}</p>}
                    </div>

                    <button
                      type="submit"
                      className="w-full lg:w-auto px-8 py-3.5 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2"
                    >
                      Gửi liên hệ
                    </button>
                  </form>
                )}
              </div>
            </ScrollAnimation>
          </div>

          {/* Footer note */}
          <ScrollAnimation direction="up" viewportAmount={0.2}>
            <aside className="mt-10 p-6 bg-slate-50 rounded-2xl border border-slate-200/80 text-center">
              <p className="text-slate-600 text-sm leading-relaxed">
                GearXpert là nền tảng trung gian theo mô hình C2C (người dùng – người dùng),
                không sở hữu thiết bị và không trực tiếp tham gia vào quan hệ thuê.
              </p>
            </aside>
          </ScrollAnimation>
        </div>
      </main>

      <Footer />
    </div>
  );
}
