import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import Header from "../../components/navigation/Header";
import Footer from "../../components/homepage/Footer";
import ScrollAnimation from "../../components/common/ScrollAnimation";

/**
 * Terms of Service Page - Điều khoản sử dụng (C2C Rental)
 * Compliant with Vietnamese law - Platform intermediary model
 * Static content - no API calls
 */
export default function TermsOfServicePage() {
  const location = useLocation();

  useEffect(() => {
    const prevTitle = document.title;
    const metaDesc = document.querySelector('meta[name="description"]');
    const prevContent = metaDesc?.getAttribute("content") || "";

    document.title = "Điều khoản sử dụng | GearXpert";
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        "Điều khoản sử dụng dịch vụ thuê thiết bị C2C trên GearXpert - Nền tảng trung gian kết nối người cho thuê và người thuê."
      );
    }

    return () => {
      document.title = prevTitle;
      if (metaDesc) metaDesc.setAttribute("content", prevContent);
    };
  }, []);

  useEffect(() => {
    const hash = location.hash?.replace("#", "");
    if (hash) {
      const scrollToEl = () => {
        const el = document.getElementById(hash);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      };
      const t = setTimeout(scrollToEl, 100);
      return () => clearTimeout(t);
    }
  }, [location.hash]);

  const lastUpdated = "29/01/2025";

  return (
    <div className="min-h-screen flex flex-col bg-background-light">
      <Header />

      <main className="flex-grow w-full pb-12">
        {/* Hero Section */}
        <section className="relative w-full bg-slate-900 overflow-hidden mb-10 pt-16 pb-24 lg:pt-24 lg:pb-32">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1920&q=80')] bg-cover bg-center opacity-30 mix-blend-overlay" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/80 to-background-light" />

          <div className="relative z-10 max-w-[1440px] mx-auto px-6 lg:px-10 text-center">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 font-display tracking-tight">
              Điều khoản <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-cyan to-indigo-400">sử dụng</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-300 max-w-3xl mx-auto font-light">
              Terms of Service – Thuê thiết bị theo mô hình C2C. Cập nhật lần cuối: {lastUpdated}
            </p>
          </div>
        </section>

        {/* Content */}
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10 -mt-20 relative z-20">
          <article
            className="max-w-3xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-100 p-8 lg:p-12"
            lang="vi"
            itemScope
            itemType="https://schema.org/WebPage"
          >
            <ScrollAnimation direction="up" viewportAmount={0.1}>
              <section>
                <p className="text-slate-700 leading-relaxed mb-10">
                  GearXpert là nền tảng trung gian kết nối người cho thuê và người thuê thiết bị.
                  Việc sử dụng dịch vụ thuê thiết bị trên GearXpert đồng nghĩa với việc người dùng
                  đã đọc, hiểu và đồng ý với các điều khoản dưới đây.
                </p>

                {/* Quick links - Internal navigation */}
                <nav className="mb-10 p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <p className="text-sm font-semibold text-slate-700 mb-2">Tài liệu pháp lý liên quan:</p>
                  <ul className="flex flex-wrap gap-3">
                    <li>
                      <Link
                        to="/privacy"
                        className="text-primary hover:text-primary-dark hover:underline font-medium transition-colors"
                      >
                        Chính sách quyền riêng tư
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/rental-policy"
                        className="text-primary hover:text-primary-dark hover:underline font-medium transition-colors"
                      >
                        Chính sách đặt cọc & bồi thường
                      </Link>
                    </li>
                  </ul>
                </nav>

                {/* Section 1 */}
                <section className="mb-10" id="pham-vi">
                  <h2 className="text-2xl font-bold text-slate-900 mb-4 font-display">
                    1. Phạm vi áp dụng
                  </h2>
                  <ul className="list-disc pl-6 space-y-2 text-slate-700">
                    <li>Áp dụng cho toàn bộ giao dịch thuê thiết bị theo mô hình C2C (người dùng với người dùng) trên nền tảng GearXpert.</li>
                    <li>GearXpert không sở hữu thiết bị và không trực tiếp tham gia quan hệ thuê giữa người cho thuê và người thuê.</li>
                  </ul>
                </section>

                {/* Section 2 */}
                <section className="mb-10" id="dieu-kien">
                  <h2 className="text-2xl font-bold text-slate-900 mb-4 font-display">
                    2. Điều kiện sử dụng
                  </h2>
                  <ul className="list-disc pl-6 space-y-2 text-slate-700">
                    <li>Người dùng phải đủ năng lực hành vi dân sự theo quy định pháp luật Việt Nam.</li>
                    <li>Thông tin cung cấp khi đăng ký và sử dụng dịch vụ phải chính xác, trung thực.</li>
                    <li>Không được sử dụng dịch vụ cho mục đích trái pháp luật hoặc vi phạm quyền của bên thứ ba.</li>
                  </ul>
                </section>

                {/* Section 3 */}
                <section className="mb-10" id="tai-khoan">
                  <h2 className="text-2xl font-bold text-slate-900 mb-4 font-display">
                    3. Tài khoản người dùng
                  </h2>
                  <ul className="list-disc pl-6 space-y-2 text-slate-700">
                    <li>Việc đăng ký tài khoản là bắt buộc để sử dụng dịch vụ thuê thiết bị trên GearXpert.</li>
                    <li>Người dùng chịu trách nhiệm về mọi hoạt động phát sinh từ tài khoản của mình và phải bảo mật thông tin đăng nhập.</li>
                  </ul>
                </section>

                {/* Section 4 */}
                <section className="mb-10" id="dich-vu-thue">
                  <h2 className="text-2xl font-bold text-slate-900 mb-4 font-display">
                    4. Dịch vụ thuê thiết bị
                  </h2>
                  <ul className="list-disc pl-6 space-y-2 text-slate-700">
                    <li>Thông tin thiết bị do bên cho thuê cung cấp; GearXpert không đảm bảo tính chính xác tuyệt đối của thông tin.</li>
                    <li>Thời gian thuê, giá thuê và tiền đặt cọc được hiển thị rõ ràng trước khi người thuê xác nhận đơn hàng.</li>
                    <li>Trả thiết bị trễ hạn có thể phát sinh phí trả chậm theo quy định của nền tảng và thỏa thuận với bên cho thuê.</li>
                  </ul>
                </section>

                {/* Section 5 */}
                <section className="mb-10" id="dat-coc-boi-thuong">
                  <h2 className="text-2xl font-bold text-slate-900 mb-4 font-display">
                    5. Tiền đặt cọc & bồi thường
                  </h2>
                  <ul className="list-disc pl-6 space-y-2 text-slate-700">
                    <li><strong>Mục đích tiền đặt cọc:</strong> Đảm bảo nghĩa vụ trả thiết bị đúng hạn và đúng tình trạng; bảo vệ quyền lợi bên cho thuê trong trường hợp hư hỏng, mất mát.</li>
                    <li><strong>Các trường hợp khấu trừ đặt cọc:</strong> Hư hỏng thiết bị do lỗi người thuê; mất thiết bị hoặc phụ kiện; trả chậm quá thời hạn cho phép; vi phạm điều khoản sử dụng.</li>
                    <li>
                      Chi tiết được quy định tại{" "}
                      <Link
                        to="/rental-policy"
                        className="text-primary hover:text-primary-dark hover:underline font-semibold transition-colors"
                      >
                        Chính sách đặt cọc & bồi thường
                      </Link>
                      .
                    </li>
                  </ul>
                </section>

                {/* Section 6 */}
                <section className="mb-10" id="quyen-nghia-vu-nguoi-thue">
                  <h2 className="text-2xl font-bold text-slate-900 mb-4 font-display">
                    6. Quyền và nghĩa vụ của người thuê
                  </h2>
                  <ul className="list-disc pl-6 space-y-2 text-slate-700">
                    <li>Sử dụng thiết bị đúng công năng, mục đích đã thỏa thuận; không cho người khác thuê lại hoặc chuyển nhượng.</li>
                    <li>Bồi thường thiệt hại trong trường hợp hư hỏng, mất mát do lỗi của mình theo giá trị thị trường hoặc chi phí sửa chữa/thay thế.</li>
                    <li>Trả thiết bị đúng hạn, đúng địa điểm và đúng tình trạng như khi nhận (trừ hao mòn tự nhiên).</li>
                  </ul>
                </section>

                {/* Section 7 */}
                <section className="mb-10" id="quyen-nghia-vu-nguoi-cho-thue">
                  <h2 className="text-2xl font-bold text-slate-900 mb-4 font-display">
                    7. Quyền và nghĩa vụ của người cho thuê
                  </h2>
                  <ul className="list-disc pl-6 space-y-2 text-slate-700">
                    <li>Phải có quyền cho thuê hợp pháp đối với thiết bị (quyền sở hữu hoặc quyền sử dụng được ủy quyền).</li>
                    <li>Cung cấp thông tin trung thực, đầy đủ về thiết bị, tình trạng và phụ kiện đi kèm.</li>
                    <li>Giao thiết bị đúng thời hạn và đúng như mô tả đã đăng tải.</li>
                  </ul>
                </section>

                {/* Section 8 */}
                <section className="mb-10" id="bien-ban-ban-giao">
                  <h2 className="text-2xl font-bold text-slate-900 mb-4 font-display">
                    8. Biên bản bàn giao thiết bị
                  </h2>
                  <ul className="list-disc pl-6 space-y-2 text-slate-700">
                    <li>Bàn giao thiết bị được thực hiện điện tử thông qua hệ thống GearXpert.</li>
                    <li>Checklist tình trạng thiết bị phải được hoàn thành đầy đủ khi nhận và trả thiết bị.</li>
                    <li>Hình ảnh bàn giao được lưu trữ làm căn cứ giải quyết tranh chấp khi có phát sinh.</li>
                  </ul>
                </section>

                {/* Section 9 */}
                <section className="mb-10" id="hao-mon">
                  <h2 className="text-2xl font-bold text-slate-900 mb-4 font-display">
                    9. Hao mòn tự nhiên
                  </h2>
                  <p className="text-slate-700">
                    Hao mòn hợp lý phát sinh từ việc sử dụng thiết bị đúng mục đích và theo hướng dẫn không bị xem là hư hỏng.
                    Người thuê không phải bồi thường cho hao mòn tự nhiên trong phạm vi chấp nhận được.
                  </p>
                </section>

                {/* Section 10 */}
                <section className="mb-10" id="mat-phu-kien">
                  <h2 className="text-2xl font-bold text-slate-900 mb-4 font-display">
                    10. Mất phụ kiện
                  </h2>
                  <ul className="list-disc pl-6 space-y-2 text-slate-700">
                    <li>Người thuê có nghĩa vụ hoàn trả đầy đủ thiết bị và tất cả phụ kiện đi kèm theo biên bản bàn giao.</li>
                    <li>Trường hợp mất phụ kiện, người thuê phải bồi thường theo giá trị thị trường hoặc chi phí thay thế do bên cho thuê xác định và GearXpert hỗ trợ đối chiếu.</li>
                  </ul>
                </section>

                {/* Section 11 */}
                <section className="mb-10" id="bat-kha-khang">
                  <h2 className="text-2xl font-bold text-slate-900 mb-4 font-display">
                    11. Trường hợp bất khả kháng
                  </h2>
                  <ul className="list-disc pl-6 space-y-2 text-slate-700">
                    <li>Thiên tai, dịch bệnh, chiến tranh, sự cố hạ tầng hoặc sự kiện khách quan ngoài tầm kiểm soát được xem là bất khả kháng.</li>
                    <li>Trong trường hợp bất khả kháng, bên bị ảnh hưởng không bị xem là vi phạm nghĩa vụ; các bên thương lượng gia hạn hoặc hủy đơn theo quy định pháp luật.</li>
                  </ul>
                </section>

                {/* Section 12 */}
                <section className="mb-10" id="gioi-han-trach-nhiem">
                  <h2 className="text-2xl font-bold text-slate-900 mb-4 font-display">
                    12. Giới hạn trách nhiệm
                  </h2>
                  <ul className="list-disc pl-6 space-y-2 text-slate-700">
                    <li>GearXpert chỉ là nền tảng trung gian kết nối người cho thuê và người thuê; không phải bên trong hợp đồng thuê.</li>
                    <li>GearXpert không chịu trách nhiệm trực tiếp đối với tranh chấp thuê mượn giữa người cho thuê và người thuê, trừ trường hợp lỗi từ phía nền tảng.</li>
                    <li>Trách nhiệm của GearXpert giới hạn trong phạm vi hỗ trợ cung cấp dữ liệu và công cụ giải quyết tranh chấp theo quy định.</li>
                  </ul>
                </section>

                {/* Section 13 */}
                <section className="mb-10" id="giai-quyet-tranh-chap">
                  <h2 className="text-2xl font-bold text-slate-900 mb-4 font-display">
                    13. Giải quyết tranh chấp
                  </h2>
                  <ul className="list-disc pl-6 space-y-2 text-slate-700">
                    <li>Ưu tiên thương lượng, hòa giải giữa người cho thuê và người thuê.</li>
                    <li>GearXpert hỗ trợ cung cấp dữ liệu giao dịch, biên bản bàn giao khi có yêu cầu hợp pháp.</li>
                    <li>Trường hợp không thương lượng được, các bên giải quyết theo pháp luật Việt Nam và Tòa án có thẩm quyền.</li>
                  </ul>
                </section>

                {/* Section 14 */}
                <section className="mb-10" id="sua-doi">
                  <h2 className="text-2xl font-bold text-slate-900 mb-4 font-display">
                    14. Sửa đổi điều khoản
                  </h2>
                  <ul className="list-disc pl-6 space-y-2 text-slate-700">
                    <li>GearXpert có thể cập nhật Điều khoản Sử dụng theo thay đổi pháp luật và hoạt động nền tảng.</li>
                    <li>Phiên bản cập nhật có hiệu lực từ ngày đăng tải; người dùng tiếp tục sử dụng dịch vụ được xem là đồng ý với điều khoản mới.</li>
                  </ul>
                </section>

                {/* Section 15 */}
                <section className="mb-10" id="lien-he">
                  <h2 className="text-2xl font-bold text-slate-900 mb-4 font-display">
                    15. Thông tin liên hệ
                  </h2>
                  <p className="text-slate-700 mb-4">
                    Mọi thắc mắc về Điều khoản Sử dụng, vui lòng liên hệ:
                  </p>
                  <ul className="list-none space-y-2 text-slate-700">
                    <li><strong>Tên đơn vị:</strong> GearXpert</li>
                    <li>
                      <strong>Email:</strong>{" "}
                      <a
                        href="mailto:support@gearxpert.vn"
                        className="text-primary hover:text-primary-dark hover:underline font-semibold transition-colors"
                      >
                        support@gearxpert.vn
                      </a>
                    </li>
                  </ul>
                </section>

                {/* Footer note */}
                <aside className="mt-12 p-6 bg-gradient-to-br from-indigo-50 to-slate-50 rounded-2xl border border-slate-200/80 shadow-sm">
                  <p className="text-slate-700 text-sm leading-relaxed italic">
                    Việc tiếp tục sử dụng dịch vụ thuê thiết bị trên GearXpert đồng nghĩa với việc
                    người dùng đã đồng ý với Điều khoản Sử dụng này và các chính sách liên quan.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-4">
                    <Link
                      to="/privacy"
                      className="text-primary hover:text-primary-dark hover:underline text-sm font-medium transition-colors"
                    >
                      Chính sách quyền riêng tư
                    </Link>
                    <Link
                      to="/rental-policy"
                      className="text-primary hover:text-primary-dark hover:underline text-sm font-medium transition-colors"
                    >
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
