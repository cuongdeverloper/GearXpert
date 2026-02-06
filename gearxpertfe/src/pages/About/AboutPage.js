import { useEffect } from "react";
import { Link } from "react-router-dom";
import Header from "../../components/navigation/Header";
import Footer from "../../components/homepage/Footer";
import ScrollAnimation from "../../components/common/ScrollAnimation";

/**
 * About Page - Về GearXpert
 * C2C equipment rental platform - Static content
 */
export default function AboutPage() {
  useEffect(() => {
    const prevTitle = document.title;
    const metaDesc = document.querySelector('meta[name="description"]');
    const prevContent = metaDesc?.getAttribute("content") || "";

    document.title = "Về GearXpert | Nền tảng thuê thiết bị C2C";
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        "GearXpert - Nền tảng công nghệ kết nối người có thiết bị nhàn rỗi với người có nhu cầu thuê theo mô hình C2C."
      );
    }

    return () => {
      document.title = prevTitle;
      if (metaDesc) metaDesc.setAttribute("content", prevContent);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background-light">
      <Header />

      <main className="flex-grow w-full pb-12">
        <section className="relative w-full bg-slate-900 overflow-hidden mb-10 pt-16 pb-24 lg:pt-24 lg:pb-32">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1920&q=80')] bg-cover bg-center opacity-30 mix-blend-overlay" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/80 to-background-light" />

          <div className="relative z-10 max-w-[1440px] mx-auto px-6 lg:px-10 text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 font-display tracking-tight">
              Về <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-cyan to-indigo-400">GearXpert</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-300 max-w-3xl mx-auto font-light">
              Nền tảng thuê thiết bị C2C – Kết nối, chia sẻ, tối ưu.
            </p>
          </div>
        </section>

        <div className="max-w-[1440px] mx-auto px-6 lg:px-10 -mt-20 relative z-20">
          <article
            className="max-w-3xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-100 p-8 lg:p-12"
            lang="vi"
            itemScope
            itemType="https://schema.org/AboutPage"
          >
            <ScrollAnimation direction="up" viewportAmount={0.1}>
              <section>
                {/* 1. Introduction */}
                <section className="mb-12">
                  <h2 className="text-2xl font-bold text-slate-900 mb-6 font-display pb-3 border-b-2 border-slate-200">
                    1. GearXpert là gì?
                  </h2>
                  <ul className="list-disc pl-6 space-y-2 text-slate-700">
                    <li>
                      GearXpert là nền tảng công nghệ kết nối người có thiết bị nhàn rỗi
                      với người có nhu cầu thuê theo mô hình C2C (người dùng – người dùng).
                    </li>
                    <li>
                      GearXpert đóng vai trò <strong className="text-primary">nền tảng trung gian</strong>.
                    </li>
                    <li>
                      Không sở hữu thiết bị và không trực tiếp tham gia giao dịch thuê.
                    </li>
                  </ul>
                </section>

                {/* 2. Sứ mệnh */}
                <section className="mb-12">
                  <h2 className="text-2xl font-bold text-slate-900 mb-6 font-display pb-3 border-b-2 border-slate-200">
                    2. Sứ mệnh
                  </h2>
                  <ul className="list-disc pl-6 space-y-2 text-slate-700">
                    <li>Tối ưu hóa việc sử dụng tài nguyên</li>
                    <li>Chia sẻ thay vì sở hữu</li>
                    <li>Giúp người dùng tiếp cận thiết bị với chi phí hợp lý</li>
                    <li>Xây dựng hệ sinh thái minh bạch và đáng tin cậy</li>
                  </ul>
                </section>

                {/* 3. Giá trị mang lại */}
                <section className="mb-12">
                  <h2 className="text-2xl font-bold text-slate-900 mb-6 font-display pb-3 border-b-2 border-slate-200">
                    3. Giá trị mang lại
                  </h2>

                  <h3 className="text-xl font-bold text-slate-800 mb-4 font-display mt-6">
                    Đối với người thuê
                  </h3>
                  <ul className="list-disc pl-6 space-y-2 text-slate-700 mb-8">
                    <li>Dễ dàng tìm và thuê thiết bị</li>
                    <li>Giá cả minh bạch</li>
                    <li>Quy trình thuê – trả rõ ràng</li>
                    <li>Có biên bản bàn giao điện tử</li>
                    <li>Hỗ trợ khi phát sinh tranh chấp</li>
                  </ul>

                  <h3 className="text-xl font-bold text-slate-800 mb-4 font-display">
                    Đối với người cho thuê
                  </h3>
                  <ul className="list-disc pl-6 space-y-2 text-slate-700">
                    <li>Tận dụng thiết bị nhàn rỗi</li>
                    <li>Chủ động giá thuê và đặt cọc</li>
                    <li>Quản lý đơn thuê hiệu quả</li>
                    <li>Có công cụ bàn giao và hình ảnh</li>
                  </ul>
                </section>

                {/* 4. Cách vận hành */}
                <section className="mb-12">
                  <h2 className="text-2xl font-bold text-slate-900 mb-6 font-display pb-3 border-b-2 border-slate-200">
                    4. Cách GearXpert vận hành
                  </h2>
                  <ul className="list-disc pl-6 space-y-2 text-slate-700">
                    <li>Hệ thống tài khoản người dùng</li>
                    <li>Đăng tải và tìm kiếm thiết bị</li>
                    <li>Quy trình thuê – trả</li>
                    <li>Biên bản bàn giao điện tử (checklist + hình ảnh)</li>
                    <li>Cơ chế đặt cọc, bồi thường, hỗ trợ tranh chấp</li>
                    <li>Tuân thủ pháp luật Việt Nam</li>
                  </ul>
                </section>

                {/* 5. Cam kết */}
                <section className="mb-12">
                  <h2 className="text-2xl font-bold text-slate-900 mb-6 font-display pb-3 border-b-2 border-slate-200">
                    5. Cam kết của GearXpert
                  </h2>
                  <ul className="list-disc pl-6 space-y-2 text-slate-700">
                    <li>Minh bạch vai trò nền tảng</li>
                    <li>Bảo vệ dữ liệu cá nhân người dùng</li>
                    <li>Không ngừng cải thiện trải nghiệm</li>
                    <li>Lắng nghe và tiếp thu phản hồi</li>
                  </ul>
                </section>

                {/* 6. Tầm nhìn */}
                <section className="mb-12">
                  <h2 className="text-2xl font-bold text-slate-900 mb-6 font-display pb-3 border-b-2 border-slate-200">
                    6. Tầm nhìn tương lai
                  </h2>
                  <ul className="list-disc pl-6 space-y-2 text-slate-700">
                    <li>Trở thành nền tảng thuê thiết bị đáng tin cậy</li>
                    <li>Thúc đẩy chia sẻ tài nguyên bền vững</li>
                  </ul>
                </section>

                {/* 7. Thông tin liên hệ */}
                <section className="mb-10">
                  <h2 className="text-2xl font-bold text-slate-900 mb-6 font-display pb-3 border-b-2 border-slate-200">
                    7. Thông tin liên hệ
                  </h2>
                  <div className="p-6 bg-gradient-to-br from-indigo-50 to-slate-50 rounded-2xl border border-slate-200/80">
                    <ul className="list-none space-y-3 text-slate-700">
                      <li className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary text-[22px]">business</span>
                        <span><strong>Tên nền tảng:</strong> GearXpert</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary text-[22px]">mail</span>
                        <span>
                          <strong>Email hỗ trợ:</strong>{" "}
                          <a
                            href="mailto:support@gearxpert.vn"
                            className="text-primary hover:text-primary-dark hover:underline font-semibold transition-colors"
                          >
                            support@gearxpert.vn
                          </a>
                        </span>
                      </li>
                      <li className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary text-[22px]">call</span>
                        <span><strong>Hotline:</strong> 0834 438 945</span>
                      </li>
                    </ul>
                  </div>
                </section>

                {/* Footer links */}
                <aside className="mt-12 p-6 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <p className="text-sm font-semibold text-slate-700 mb-3">Tài liệu liên quan:</p>
                  <div className="flex flex-wrap gap-4">
                    <Link to="/terms" className="text-primary hover:text-primary-dark hover:underline text-sm font-medium transition-colors">
                      Điều khoản sử dụng
                    </Link>
                    <Link to="/privacy" className="text-primary hover:text-primary-dark hover:underline text-sm font-medium transition-colors">
                      Chính sách quyền riêng tư
                    </Link>
                    <Link to="/rental-policy" className="text-primary hover:text-primary-dark hover:underline text-sm font-medium transition-colors">
                      Chính sách đặt cọc & bồi thường
                    </Link>
                  </div>
                </aside>
              </section>
            </ScrollAnimation>
          </article>
        </div>
      </main>

      <Footer />
    </div>
  );
}
