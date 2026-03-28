import { useEffect } from "react";
import { Link } from "react-router-dom";
import Header from "../../components/navigation/Header";
import Footer from "../../components/homepage/Footer";
import ScrollAnimation from "../../components/common/ScrollAnimation";

/**
 * Privacy Policy Page - Chính sách quyền riêng tư
 * Compliant with Vietnam Cybersecurity Law 2018 and Decree 13/2023/NĐ-CP on Personal Data Protection
 * Static content - no API calls
 */
export default function PrivacyPolicyPage() {
  useEffect(() => {
    const prevTitle = document.title;
    const metaDesc = document.querySelector('meta[name="description"]');
    const prevContent = metaDesc?.getAttribute("content") || "";

    document.title = "Chính sách quyền riêng tư | GearXpert";
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        "Chính sách quyền riêng tư của GearXpert - Tuân thủ Luật An ninh mạng 2018 và Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân."
      );
    }

    return () => {
      document.title = prevTitle;
      if (metaDesc) metaDesc.setAttribute("content", prevContent);
    };
  }, []);

  const lastUpdated = "29/01/2025";

  return (
    <div className="min-h-screen flex flex-col bg-background-light">
      <Header />

      <main className="flex-grow w-full pb-12">
        <section className="relative w-full bg-slate-900 overflow-hidden mb-10 pt-48 pb-24 lg:pt-56 lg:pb-32">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1920&q=80')] bg-cover bg-center opacity-30 mix-blend-overlay" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/80 to-background-light" />

          <div className="relative z-10 max-w-[1440px] mx-auto px-6 lg:px-10 text-center">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 font-display tracking-tight">
              Chính sách <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-cyan to-indigo-400">quyền riêng tư</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-300 max-w-3xl mx-auto font-light">
              Tuân thủ Luật An ninh mạng 2018 và Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân. Cập nhật lần cuối: {lastUpdated}
            </p>
          </div>
        </section>

        {/* Content */}
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10 -mt-20 relative z-20">
          <article
            className="max-w-3xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-100 p-8 lg:p-12"
            lang="vi"
            itemScope
            itemType="https://schema.org/PrivacyPolicy"
          >
            <ScrollAnimation direction="up" viewportAmount={0.1}>
              <section>
            <p className="text-slate-700 leading-relaxed mb-10">
                GearXpert cam kết tôn trọng và bảo vệ dữ liệu cá nhân của người dùng
                theo đúng quy định của pháp luật Việt Nam, đặc biệt là Luật An ninh
                mạng 2018 và Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân.
                Chính sách này giải thích cách GearXpert thu thập, xử lý, lưu trữ,
                chia sẻ và bảo vệ dữ liệu cá nhân của người dùng.
              </p>

              <nav className="mb-10 p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                <p className="text-sm font-semibold text-slate-700 mb-2">Tài liệu pháp lý liên quan:</p>
                <ul className="flex flex-wrap gap-3">
                  <li>
                    <Link to="/terms" className="text-primary hover:text-primary-dark hover:underline font-medium transition-colors">
                      Điều khoản sử dụng
                    </Link>
                  </li>
                  <li>
                    <Link to="/rental-policy" className="text-primary hover:text-primary-dark hover:underline font-medium transition-colors">
                      Chính sách đặt cọc & bồi thường
                    </Link>
                  </li>
                </ul>
              </nav>

              {/* Section 1: Định nghĩa */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-slate-900 mb-4 font-display">
                1. Định nghĩa
              </h2>
              <ul className="list-disc pl-6 space-y-2 text-slate-700">
                <li>
                  <strong>Dữ liệu cá nhân:</strong> Thông tin dưới dạng ký hiệu,
                  chữ viết, chữ số, hình ảnh, âm thanh hoặc dạng tương tự gắn liền
                  với một con người cụ thể hoặc giúp xác định một con người cụ thể.
                </li>
                <li>
                  <strong>Chủ thể dữ liệu:</strong> Cá nhân được xác định hoặc có
                  thể xác định được thông qua dữ liệu cá nhân.
                </li>
                <li>
                  <strong>Xử lý dữ liệu cá nhân:</strong> Một hoặc một số hoạt động
                  thu thập, ghi, phân tích, lưu trữ, điều chỉnh, tiết lộ, kết hợp,
                  truy cập, truy xuất, thu hồi, mã hóa, giải mã, sao chép, truyền,
                  chuyển giao, xóa hoặc hủy dữ liệu cá nhân.
                </li>
              </ul>
            </section>

            {/* Section 2: Loại dữ liệu thu thập */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 font-display">
                2. Loại dữ liệu cá nhân được thu thập
              </h2>
              <h3 className="text-lg font-semibold text-slate-800 mb-2 font-display">
                2.1. Dữ liệu cá nhân cơ bản
              </h3>
              <p className="text-slate-700 mb-2">
                GearXpert có thể thu thập các loại dữ liệu sau khi người dùng đăng
                ký, sử dụng dịch vụ hoặc liên hệ hỗ trợ:
              </p>
              <ul className="list-disc pl-6 space-y-1 text-slate-700 mb-4">
                <li>Họ và tên</li>
                <li>Địa chỉ email</li>
                <li>Số điện thoại</li>
                <li>Địa chỉ giao nhận</li>
                <li>Thông tin tài khoản đăng nhập</li>
                <li>Lịch sử giao dịch, thuê mượn thiết bị</li>
              </ul>
              <h3 className="text-lg font-semibold text-slate-800 mb-2 font-display">
                2.2. Dữ liệu phát sinh trong quá trình sử dụng
              </h3>
              <ul className="list-disc pl-6 space-y-1 text-slate-700 mb-4">
                <li>Địa chỉ IP</li>
                <li>Loại thiết bị, trình duyệt</li>
                <li>Cookies và công nghệ tương tự</li>
                <li>Hành vi truy cập, tương tác trên nền tảng</li>
              </ul>
              <h3 className="text-lg font-semibold text-slate-800 mb-2 font-display">
                2.3. Dữ liệu nhạy cảm
              </h3>
              <p className="text-slate-700">
                GearXpert không thu thập dữ liệu cá nhân nhạy cảm (dữ liệu về sức
                khỏe, chính trị, tôn giáo, xu hướng tình dục, v.v.) trừ khi có yêu
                cầu pháp luật bắt buộc hoặc sự đồng ý rõ ràng của người dùng.
              </p>
            </section>

            {/* Section 3: Mục đích xử lý */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 font-display">
                3. Mục đích xử lý dữ liệu cá nhân
              </h2>
              <ul className="list-disc pl-6 space-y-2 text-slate-700">
                <li>Quản lý tài khoản người dùng</li>
                <li>Cung cấp dịch vụ thuê mượn thiết bị và xử lý đơn hàng</li>
                <li>Thanh toán, giao nhận thiết bị, chăm sóc khách hàng</li>
                <li>Gửi thông báo hệ thống, cập nhật dịch vụ</li>
                <li>Cải thiện hệ thống, trải nghiệm người dùng và bảo mật</li>
                <li>Tuân thủ nghĩa vụ pháp lý</li>
              </ul>
            </section>

            {/* Section 4: Căn cứ pháp lý */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 font-display">
                4. Căn cứ pháp lý xử lý dữ liệu
              </h2>
              <ul className="list-disc pl-6 space-y-2 text-slate-700">
                <li>
                  <strong>Sự đồng ý của người dùng:</strong> Khi người dùng chủ
                  động đồng ý cho phép xử lý dữ liệu cá nhân.
                </li>
                <li>
                  <strong>Thực hiện hợp đồng:</strong> Xử lý cần thiết để thực hiện
                  hợp đồng thuê mượn giữa người dùng và GearXpert.
                </li>
                <li>
                  <strong>Nghĩa vụ pháp lý:</strong> Xử lý theo yêu cầu của pháp
                  luật Việt Nam.
                </li>
                <li>
                  <strong>Quyền và lợi ích hợp pháp:</strong> Xử lý để bảo vệ quyền
                  và lợi ích hợp pháp của GearXpert hoặc bên thứ ba trong phạm vi
                  cho phép.
                </li>
              </ul>
            </section>

            {/* Section 5: Chia sẻ dữ liệu */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 font-display">
                5. Chia sẻ dữ liệu cá nhân
              </h2>
              <ul className="list-disc pl-6 space-y-2 text-slate-700">
                <li>
                  GearXpert <strong>không bán hoặc trao đổi</strong> dữ liệu cá nhân
                  của người dùng cho bên thứ ba vì mục đích thương mại.
                </li>
                <li>
                  Dữ liệu có thể được chia sẻ với đối tác vận chuyển, thanh toán,
                  công nghệ thông tin khi cần thiết để cung cấp dịch vụ, với cam
                  kết bảo mật tương đương.
                </li>
                <li>
                  GearXpert có thể chia sẻ dữ liệu theo yêu cầu của cơ quan nhà
                  nước có thẩm quyền theo quy định pháp luật.
                </li>
              </ul>
            </section>

            {/* Section 6: Lưu trữ và bảo vệ */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 font-display">
                6. Lưu trữ và bảo vệ dữ liệu
              </h2>
              <ul className="list-disc pl-6 space-y-2 text-slate-700">
                <li>
                  Dữ liệu cá nhân được lưu trữ tại Việt Nam hoặc quốc gia có mức
                  độ bảo vệ dữ liệu tương đương theo quy định pháp luật.
                </li>
                <li>
                  GearXpert áp dụng các biện pháp kỹ thuật và quản lý phù hợp để
                  bảo vệ dữ liệu khỏi truy cập trái phép, mất mát hoặc hủy hoại.
                </li>
                <li>
                  Dữ liệu được lưu trữ trong thời gian cần thiết để thực hiện mục
                  đích đã nêu hoặc theo yêu cầu pháp luật.
                </li>
              </ul>
            </section>

            {/* Section 7: Quyền của chủ thể dữ liệu */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 font-display">
                7. Quyền của chủ thể dữ liệu
              </h2>
              <p className="text-slate-700 mb-4">
                Theo Luật An ninh mạng 2018 và Nghị định 13/2023/NĐ-CP, người dùng
                có các quyền sau:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-700">
                <li>
                  <strong>Quyền được biết:</strong> Được thông báo về việc thu thập,
                  xử lý dữ liệu cá nhân.
                </li>
                <li>
                  <strong>Quyền đồng ý và rút lại sự đồng ý:</strong> Đồng ý hoặc rút
                  lại sự đồng ý cho việc xử lý dữ liệu cá nhân (trừ trường hợp pháp
                  luật không yêu cầu đồng ý).
                </li>
                <li>
                  <strong>Quyền truy cập, chỉnh sửa, xóa:</strong> Truy cập, yêu cầu
                  chỉnh sửa hoặc xóa dữ liệu cá nhân của mình.
                </li>
                <li>
                  <strong>Quyền hạn chế và phản đối xử lý:</strong> Yêu cầu hạn chế
                  hoặc phản đối việc xử lý dữ liệu trong một số trường hợp.
                </li>
                <li>
                  <strong>Quyền khiếu nại, tố cáo, khởi kiện:</strong> Khiếu nại
                  với GearXpert hoặc cơ quan có thẩm quyền khi quyền của mình bị
                  xâm phạm.
                </li>
              </ul>
              <p className="text-slate-700 mt-4">
                Để thực hiện các quyền trên, vui lòng liên hệ GearXpert qua thông
                tin ở mục 10.
              </p>
            </section>

            {/* Section 8: Cookies */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 font-display">
                8. Cookies
              </h2>
              <p className="text-slate-700 mb-2">
                GearXpert sử dụng cookies và công nghệ tương tự để:
              </p>
              <ul className="list-disc pl-6 space-y-1 text-slate-700 mb-4">
                <li>Duy trì phiên đăng nhập</li>
                <li>Ghi nhớ tùy chọn người dùng</li>
                <li>Phân tích cách sử dụng dịch vụ để cải thiện trải nghiệm</li>
              </ul>
              <p className="text-slate-700">
                Người dùng có thể kiểm soát hoặc vô hiệu hóa cookies thông qua cài
                đặt trình duyệt. Việc vô hiệu hóa một số cookies có thể ảnh hưởng
                đến chức năng của dịch vụ.
              </p>
            </section>

            {/* Section 9: Thay đổi chính sách */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 font-display">
                9. Thay đổi chính sách
              </h2>
              <ul className="list-disc pl-6 space-y-2 text-slate-700">
                <li>
                  GearXpert có thể cập nhật chính sách này theo thay đổi pháp luật
                  hoặc hoạt động kinh doanh.
                </li>
                <li>
                  Phiên bản cập nhật có hiệu lực từ ngày đăng tải trên nền tảng.
                </li>
                <li>
                  GearXpert khuyến khích người dùng xem lại chính sách định kỳ.
                </li>
              </ul>
            </section>

            {/* Section 10: Thông tin liên hệ */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 font-display">
                10. Thông tin liên hệ
              </h2>
              <p className="text-slate-700 mb-4">
                Mọi thắc mắc về chính sách quyền riêng tư hoặc yêu cầu liên quan
                đến dữ liệu cá nhân, vui lòng liên hệ:
              </p>
              <ul className="list-none space-y-2 text-slate-700">
                <li>
                  <strong>Tên đơn vị:</strong> GearXpert
                </li>
                <li>
                  <strong>Email:</strong>{" "}
                  <a
                    href="mailto:support@gearxpert.vn"
                    className="text-primary hover:text-primary-dark hover:underline font-semibold transition-colors"
                  >
                    support@gearxpert.vn
                  </a>
                </li>
                <li>
                  <strong>Hotline:</strong> 0834 438 945
                </li>
              </ul>
            </section>

            {/* Footer note - giống glass panel */}
              <aside className="mt-12 p-6 bg-gradient-to-br from-indigo-50 to-slate-50 rounded-2xl border border-slate-200/80 shadow-sm">
                <p className="text-slate-700 text-sm leading-relaxed italic">
                  Việc người dùng tiếp tục sử dụng dịch vụ đồng nghĩa với việc đã
                  đọc, hiểu và đồng ý cho phép GearXpert xử lý dữ liệu cá nhân theo
                  chính sách này.
                </p>
                <div className="mt-4 flex flex-wrap gap-4">
                  <Link to="/terms" className="text-primary hover:text-primary-dark hover:underline text-sm font-medium transition-colors">
                    Điều khoản sử dụng
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
