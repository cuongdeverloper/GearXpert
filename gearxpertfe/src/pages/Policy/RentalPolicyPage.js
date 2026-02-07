import { useEffect } from "react";
import { Link } from "react-router-dom";
import Header from "../../components/navigation/Header";
import Footer from "../../components/homepage/Footer";
import ScrollAnimation from "../../components/common/ScrollAnimation";

/**
 * Rental Policy Page - Chính sách đặt cọc & bồi thường
 * C2C equipment rental model - Legal/Policy content
 * Static content - no API calls
 */
export default function RentalPolicyPage() {
  useEffect(() => {
    const prevTitle = document.title;
    const metaDesc = document.querySelector('meta[name="description"]');
    const prevContent = metaDesc?.getAttribute("content") || "";

    document.title = "Chính sách đặt cọc & bồi thường | GearXpert";
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        "Chính sách đặt cọc và bồi thường thiệt hại khi thuê thiết bị C2C trên nền tảng GearXpert."
      );
    }

    return () => {
      document.title = prevTitle;
      if (metaDesc) metaDesc.setAttribute("content", prevContent);
    };
  }, []);

  const lastUpdated = "29/01/2026";

  return (
    <div className="min-h-screen flex flex-col bg-background-light">
      <Header />

      <main className="flex-grow w-full pb-12">
        <section className="relative w-full bg-slate-900 overflow-hidden mb-10 pt-16 pb-24 lg:pt-24 lg:pb-32">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1920&q=80')] bg-cover bg-center opacity-30 mix-blend-overlay" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/80 to-background-light" />

          <div className="relative z-10 max-w-[1440px] mx-auto px-6 lg:px-10 text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 font-display tracking-tight">
              Chính sách <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-cyan to-indigo-400">đặt cọc & bồi thường</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-300 max-w-3xl mx-auto font-light">
              Quy định về tiền đặt cọc, khấu trừ và bồi thường thiệt hại khi thuê thiết bị C2C.
            </p>
          </div>
        </section>

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
                  Chính sách này áp dụng cho các giao dịch thuê thiết bị theo mô hình C2C
                  (người dùng – người dùng) trên nền tảng GearXpert.
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
                      <Link to="/privacy" className="text-primary hover:text-primary-dark hover:underline font-medium transition-colors">
                        Chính sách quyền riêng tư
                      </Link>
                    </li>
                  </ul>
                </nav>

                {/* Section 1–4: Đặt cọc & Bồi thường */}
                <section className="mb-12">
                  <h2 className="text-2xl font-bold text-slate-900 mb-6 font-display pb-3 border-b-2 border-slate-200">
                    1. Mục đích đặt cọc
                  </h2>
                  <ul className="list-disc pl-6 space-y-2 text-slate-700 mb-10">
                    <li>Nghĩa vụ thanh toán và hoàn trả thiết bị đúng hạn</li>
                    <li>
                      Bồi thường thiệt hại trong trường hợp thiết bị bị hư hỏng, mất mát
                      hoặc vi phạm thỏa thuận thuê
                    </li>
                  </ul>

                  <h2 className="text-2xl font-bold text-slate-900 mb-6 font-display pb-3 border-b-2 border-slate-200">
                    2. Mức đặt cọc
                  </h2>
                  <ul className="list-disc pl-6 space-y-2 text-slate-700 mb-10">
                    <li>Mức đặt cọc do bên cho thuê thiết lập</li>
                    <li>Hiển thị công khai trước khi người thuê xác nhận giao dịch</li>
                    <li>GearXpert có thể đề xuất mức đặt cọc tham chiếu</li>
                  </ul>

                  <h2 className="text-2xl font-bold text-slate-900 mb-6 font-display pb-3 border-b-2 border-slate-200">
                    3. Hoàn trả tiền đặt cọc
                  </h2>
                  <ul className="list-disc pl-6 space-y-2 text-slate-700 mb-10">
                    <li>
                      Hoàn trả sau khi:
                      <ul className="list-[circle] pl-6 mt-2 space-y-1">
                        <li>Thiết bị được trả đúng hạn</li>
                        <li>Tình trạng phù hợp với biên bản bàn giao</li>
                      </ul>
                    </li>
                    <li>Thời gian hoàn tiền phụ thuộc vào cổng thanh toán và ngân hàng</li>
                  </ul>

                  <h2 className="text-2xl font-bold text-slate-900 mb-6 font-display pb-3 border-b-2 border-slate-200">
                    4. Khấu trừ và bồi thường
                  </h2>
                  <ul className="list-disc pl-6 space-y-2 text-slate-700">
                    <li>
                      <strong>Các trường hợp khấu trừ:</strong>
                      <ul className="list-[circle] pl-6 mt-2 space-y-1">
                        <li>Hư hỏng vượt quá hao mòn tự nhiên</li>
                        <li>Mất thiết bị hoặc phụ kiện</li>
                        <li>Trả trễ hạn</li>
                      </ul>
                    </li>
                    <li>
                      <strong>Mức bồi thường dựa trên:</strong>
                      <ul className="list-[circle] pl-6 mt-2 space-y-1">
                        <li>Mức độ thiệt hại</li>
                        <li>Giá trị thiết bị tại thời điểm thuê</li>
                        <li>Thỏa thuận giữa hai bên</li>
                      </ul>
                    </li>
                    <li>
                      <strong className="text-primary">GearXpert là nền tảng trung gian</strong> hỗ trợ xử lý tranh chấp
                    </li>
                  </ul>
                </section>

                {/* Divider */}
                <hr className="my-12 border-slate-200" />

                {/* Second main section: BIÊN BẢN BÀN GIAO THIẾT BỊ ĐIỆN TỬ */}
                <section className="mb-12">
                  <h2 className="text-2xl font-bold text-slate-900 mb-8 font-display text-center bg-slate-50 py-4 rounded-xl border border-slate-200/80">
                    Biên bản bàn giao thiết bị điện tử
                  </h2>

                  <h3 className="text-xl font-bold text-slate-800 mb-4 font-display">
                    5. Nội dung biên bản bàn giao
                  </h3>
                  <ul className="list-disc pl-6 space-y-2 text-slate-700 mb-10">
                    <li>Thông tin thiết bị</li>
                    <li>Tình trạng thiết bị</li>
                    <li>Danh sách phụ kiện</li>
                    <li>Thời gian thuê</li>
                    <li>Hình ảnh thiết bị bàn giao</li>
                  </ul>

                  <h3 className="text-xl font-bold text-slate-800 mb-4 font-display">
                    6. Checklist tình trạng thiết bị
                  </h3>
                  <ul className="list-disc pl-6 space-y-2 text-slate-700 mb-10">
                    <li>Thiết bị hoạt động bình thường</li>
                    <li>Không nứt vỡ, móp méo</li>
                    <li>Không lỗi nguồn / pin</li>
                    <li>Màn hình không điểm chết</li>
                    <li>Cổng kết nối hoạt động tốt</li>
                    <li>Phụ kiện đầy đủ</li>
                  </ul>

                  <h3 className="text-xl font-bold text-slate-800 mb-4 font-display">
                    7. Hình ảnh bàn giao
                  </h3>
                  <ul className="list-disc pl-6 space-y-2 text-slate-700">
                    <li>Hình ảnh rõ nét, trung thực</li>
                    <li>Lưu trữ trên hệ thống</li>
                    <li>Làm căn cứ giải quyết tranh chấp</li>
                  </ul>
                </section>

                <hr className="my-12 border-slate-200" />

                {/* Third main section: CÁC ĐIỀU KHOẢN BỔ SUNG */}
                <section className="mb-12">
                  <h2 className="text-2xl font-bold text-slate-900 mb-8 font-display text-center bg-slate-50 py-4 rounded-xl border border-slate-200/80">
                    Các điều khoản bổ sung cho hoạt động thuê
                  </h2>

                  <h3 className="text-xl font-bold text-slate-800 mb-4 font-display">
                    8. Hao mòn tự nhiên
                  </h3>
                  <ul className="list-disc pl-6 space-y-2 text-slate-700 mb-10">
                    <li>Xuống cấp hợp lý khi sử dụng đúng công năng</li>
                    <li>Không bị xem là hư hỏng</li>
                    <li>Không phát sinh nghĩa vụ bồi thường</li>
                  </ul>

                  <h3 className="text-xl font-bold text-slate-800 mb-4 font-display">
                    9. Mất phụ kiện
                  </h3>
                  <ul className="list-disc pl-6 space-y-2 text-slate-700 mb-10">
                    <li>Phải hoàn trả đầy đủ</li>
                    <li>
                      Bồi thường theo:
                      <ul className="list-[circle] pl-6 mt-2 space-y-1">
                        <li>Giá trị phụ kiện</li>
                        <li>Hoặc phí thay thế công bố</li>
                      </ul>
                    </li>
                  </ul>

                  <h3 className="text-xl font-bold text-slate-800 mb-4 font-display">
                    10. Trường hợp bất khả kháng
                  </h3>
                  <ul className="list-disc pl-6 space-y-2 text-slate-700">
                    <li>Thiên tai, hỏa hoạn, dịch bệnh</li>
                    <li>Chiến tranh, bạo loạn</li>
                    <li>Sự cố hạ tầng, mất điện diện rộng</li>
                    <li>Không bị xem là vi phạm nghĩa vụ</li>
                    <li>Có trách nhiệm thông báo và phối hợp xử lý</li>
                  </ul>
                </section>

                <hr className="my-12 border-slate-200" />

                {/* Fourth main section: ĐIỀU CHỈNH TERMS THEO MÔ HÌNH C2C */}
                <section className="mb-12">
                  <h2 className="text-2xl font-bold text-slate-900 mb-8 font-display text-center bg-slate-50 py-4 rounded-xl border border-slate-200/80">
                    Điều chỉnh terms theo mô hình C2C
                  </h2>

                  <h3 className="text-xl font-bold text-slate-800 mb-4 font-display">
                    11. Vai trò của GearXpert
                  </h3>
                  <ul className="list-disc pl-6 space-y-2 text-slate-700 mb-10">
                    <li>
                      <strong className="text-primary">Nền tảng trung gian</strong> kết nối người thuê và người cho thuê
                    </li>
                    <li>Không sở hữu thiết bị</li>
                    <li>Không trực tiếp tham gia quan hệ thuê</li>
                  </ul>

                  <h3 className="text-xl font-bold text-slate-800 mb-4 font-display">
                    12. Trách nhiệm các bên
                  </h3>
                  <div className="space-y-6 mb-10">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                      <p className="font-semibold text-slate-800 mb-2">Người cho thuê:</p>
                      <ul className="list-disc pl-6 space-y-1 text-slate-700">
                        <li>Có quyền cho thuê hợp pháp</li>
                        <li>Cung cấp thông tin trung thực</li>
                      </ul>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                      <p className="font-semibold text-slate-800 mb-2">Người thuê:</p>
                      <ul className="list-disc pl-6 space-y-1 text-slate-700">
                        <li>Sử dụng đúng mục đích</li>
                        <li>Chịu trách nhiệm bồi thường nếu gây thiệt hại</li>
                      </ul>
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-slate-800 mb-4 font-display">
                    13. Giải quyết tranh chấp C2C
                  </h3>
                  <ul className="list-disc pl-6 space-y-2 text-slate-700">
                    <li>Ưu tiên thương lượng</li>
                    <li>GearXpert hỗ trợ cung cấp dữ liệu (log, hình ảnh)</li>
                    <li>Giải quyết theo pháp luật Việt Nam</li>
                  </ul>
                </section>

                {/* Footer */}
                <aside className="mt-12 p-6 bg-gradient-to-br from-indigo-50 to-slate-50 rounded-2xl border border-slate-200/80 shadow-sm">
                  <p className="text-slate-600 text-sm font-medium">
                    Cập nhật lần cuối: {lastUpdated}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-4">
                    <Link to="/terms" className="text-primary hover:text-primary-dark hover:underline text-sm font-medium transition-colors">
                      Điều khoản sử dụng
                    </Link>
                    <Link to="/privacy" className="text-primary hover:text-primary-dark hover:underline text-sm font-medium transition-colors">
                      Chính sách quyền riêng tư
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
