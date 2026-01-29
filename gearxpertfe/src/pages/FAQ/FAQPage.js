import { useEffect } from "react";
import { Link } from "react-router-dom";
import Header from "../../components/navigation/Header";
import Footer from "../../components/homepage/Footer";
import ScrollAnimation from "../../components/common/ScrollAnimation";

/**
 * FAQ Page - Câu hỏi thường gặp
 * C2C equipment rental platform - Static content
 */
export default function FAQPage() {
  useEffect(() => {
    const prevTitle = document.title;
    const metaDesc = document.querySelector('meta[name="description"]');
    const prevContent = metaDesc?.getAttribute("content") || "";

    document.title = "Câu hỏi thường gặp | GearXpert";
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        "Câu hỏi thường gặp về nền tảng thuê thiết bị C2C GearXpert – Quy trình thuê, đặt cọc, bồi thường và hỗ trợ."
      );
    }

    return () => {
      document.title = prevTitle;
      if (metaDesc) metaDesc.setAttribute("content", prevContent);
    };
  }, []);

  const faqItems = [
    {
      id: "gearxpert-la-gi",
      question: "1. GearXpert là gì?",
      answer: (
        <ul className="list-disc pl-6 space-y-2 text-slate-700">
          <li>Nền tảng trung gian kết nối người cho thuê và người thuê</li>
          <li>Hoạt động theo mô hình C2C (người dùng – người dùng)</li>
          <li>Không sở hữu thiết bị</li>
        </ul>
      ),
    },
    {
      id: "thue-thiet-bi-nao",
      question: "2. Tôi có thể thuê những loại thiết bị nào?",
      answer: (
        <ul className="list-disc pl-6 space-y-2 text-slate-700">
          <li>Thiết bị điện tử</li>
          <li>Thiết bị công nghệ, văn phòng</li>
          <li>Thiết bị học tập, làm việc, giải trí</li>
          <li className="text-slate-600 italic">(Danh sách phụ thuộc vào người cho thuê đăng tải trên nền tảng)</li>
        </ul>
      ),
    },
    {
      id: "nguoi-cho-thue",
      question: "3. Ai là người cho thuê thiết bị?",
      answer: (
        <ul className="list-disc pl-6 space-y-2 text-slate-700">
          <li>Người dùng khác trên nền tảng GearXpert</li>
          <li>Có quyền sở hữu hoặc quyền cho thuê hợp pháp đối với thiết bị</li>
        </ul>
      ),
    },
    {
      id: "quy-trinh-thue",
      question: "4. Quy trình thuê thiết bị diễn ra như thế nào?",
      answer: (
        <ol className="list-decimal pl-6 space-y-2 text-slate-700">
          <li>Tìm kiếm thiết bị phù hợp</li>
          <li>Xem giá, thời gian thuê, tiền đặt cọc</li>
          <li>Xác nhận đơn thuê</li>
          <li>Bàn giao thiết bị và lập biên bản điện tử</li>
          <li>Trả thiết bị khi kết thúc thuê</li>
        </ol>
      ),
    },
    {
      id: "tien-dat-coc",
      question: "5. Tiền đặt cọc dùng để làm gì?",
      answer: (
        <>
          <ul className="list-disc pl-6 space-y-2 text-slate-700">
            <li>Đảm bảo thanh toán</li>
            <li>Đảm bảo hoàn trả thiết bị đúng hạn</li>
            <li>Bồi thường hư hỏng, mất mát (nếu có)</li>
          </ul>
          <p className="mt-4 text-slate-600 text-sm">
            Chi tiết xem tại{" "}
            <Link to="/rental-policy" className="text-primary hover:text-primary-dark hover:underline font-semibold transition-colors">
              Chính sách đặt cọc & bồi thường
            </Link>
            .
          </p>
        </>
      ),
    },
    {
      id: "hoan-tien-dat-coc",
      question: "6. Khi nào tôi được hoàn tiền đặt cọc?",
      answer: (
        <ul className="list-disc pl-6 space-y-2 text-slate-700">
          <li>Trả thiết bị đúng hạn</li>
          <li>Thiết bị đúng tình trạng như biên bản bàn giao</li>
          <li>Thời gian hoàn tiền phụ thuộc vào cổng thanh toán và ngân hàng</li>
        </ul>
      ),
    },
    {
      id: "hao-mon-tu-nhien",
      question: "7. Hao mòn tự nhiên là gì?",
      answer: (
        <ul className="list-disc pl-6 space-y-2 text-slate-700">
          <li>Xuống cấp hợp lý khi sử dụng đúng công năng</li>
          <li>Không bị xem là hư hỏng và không phát sinh nghĩa vụ bồi thường</li>
        </ul>
      ),
    },
    {
      id: "mat-phu-kien",
      question: "8. Mất phụ kiện thì xử lý ra sao?",
      answer: (
        <ul className="list-disc pl-6 space-y-2 text-slate-700">
          <li>Người thuê có nghĩa vụ hoàn trả đầy đủ thiết bị và phụ kiện</li>
          <li>Bồi thường theo giá trị phụ kiện hoặc phí thay thế công bố</li>
        </ul>
      ),
    },
    {
      id: "tranh-chap",
      question: "9. Nếu xảy ra tranh chấp thì xử lý thế nào?",
      answer: (
        <ul className="list-disc pl-6 space-y-2 text-slate-700">
          <li>Ưu tiên thương lượng giữa các bên</li>
          <li>GearXpert hỗ trợ cung cấp dữ liệu và bằng chứng (log, hình ảnh bàn giao)</li>
          <li>Giải quyết theo pháp luật Việt Nam khi cần thiết</li>
        </ul>
      ),
    },
    {
      id: "trach-nhiem-chat-luong",
      question: "10. GearXpert có chịu trách nhiệm về chất lượng thiết bị không?",
      answer: (
        <ul className="list-disc pl-6 space-y-2 text-slate-700">
          <li>GearXpert không sở hữu thiết bị</li>
          <li>Không trực tiếp kiểm định chất lượng thiết bị do người cho thuê đăng tải</li>
        </ul>
      ),
    },
    {
      id: "huy-don",
      question: "11. Tôi có thể hủy đơn thuê không?",
      answer: (
        <ul className="list-disc pl-6 space-y-2 text-slate-700">
          <li>Phụ thuộc vào thỏa thuận giữa người thuê và người cho thuê</li>
          <li>Điều kiện hủy được hiển thị trước khi xác nhận đơn thuê</li>
        </ul>
      ),
    },
    {
      id: "bao-mat-du-lieu",
      question: "12. Dữ liệu cá nhân của tôi có được bảo mật không?",
      answer: (
        <>
          <ul className="list-disc pl-6 space-y-2 text-slate-700">
            <li>GearXpert tuân thủ Luật An ninh mạng 2018</li>
            <li>Tuân thủ Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân</li>
          </ul>
          <p className="mt-4 text-slate-600 text-sm">
            Chi tiết xem tại{" "}
            <Link to="/privacy" className="text-primary hover:text-primary-dark hover:underline font-semibold transition-colors">
              Chính sách quyền riêng tư
            </Link>
            .
          </p>
        </>
      ),
    },
    {
      id: "ho-tro",
      question: "13. Tôi cần hỗ trợ thì liên hệ thế nào?",
      answer: (
        <div className="space-y-2 text-slate-700">
          <p>
            <strong>Email:</strong>{" "}
            <a href="mailto:support@gearxpert.vn" className="text-primary hover:text-primary-dark hover:underline font-semibold transition-colors">
              support@gearxpert.vn
            </a>
          </p>
          <p>
            <strong>Hotline:</strong> 0834 438 945
          </p>
        </div>
      ),
    },
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
              Câu hỏi <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-cyan to-indigo-400">thường gặp</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-300 max-w-3xl mx-auto font-light">
              FAQ – Giải đáp thắc mắc về thuê thiết bị C2C trên GearXpert.
            </p>
          </div>
        </section>

        <div className="max-w-[1440px] mx-auto px-6 lg:px-10 -mt-20 relative z-20">
          <article
            className="max-w-3xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-100 p-8 lg:p-12"
            lang="vi"
            itemScope
            itemType="https://schema.org/FAQPage"
          >
            <ScrollAnimation direction="up" viewportAmount={0.1}>
              <section>
                {faqItems.map((item) => (
                  <section key={item.id} className="mb-10" id={item.id}>
                    <h2 className="text-xl font-bold text-slate-900 mb-4 font-display pb-2 border-b border-slate-200">
                      {item.question}
                    </h2>
                    <div className="text-slate-700">{item.answer}</div>
                  </section>
                ))}

                <aside className="mt-12 p-6 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <p className="text-sm font-semibold text-slate-700 mb-3">Tài liệu liên quan:</p>
                  <div className="flex flex-wrap gap-4">
                    <Link to="/about" className="text-primary hover:text-primary-dark hover:underline text-sm font-medium transition-colors">
                      Về GearXpert
                    </Link>
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
