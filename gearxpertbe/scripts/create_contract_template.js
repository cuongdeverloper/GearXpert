const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const contractText = `GEARXPERT
HỢP ĐỒNG HỢP TÁC CUNG CẤP THIẾT BỊ CHO THUÊ
TRÊN NỀN TẢNG GEARXPERT

Số: [GX-SP-01/2026/HĐHT]
Bên A: \tCÔNG TY TNHH GEARXPERT
Bên B: \t
Thời hạn hợp đồng: \t12 tháng, tự động gia hạn nếu không thông báo chấm dứt
Hình thức hiệu lực: \tKý trực tiếp hoặc xác nhận điện tử trên hệ thống


CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc
----------------

HỢP ĐỒNG HỢP TÁC CUNG CẤP THIẾT BỊ CHO THUÊ
TRÊN NỀN TẢNG GEARXPERT
Số: [GX-SP-01/2026/HĐHT]

Căn cứ Bộ luật Dân sự hiện hành và các quy định pháp luật có liên quan;
Căn cứ nhu cầu hợp tác và thỏa thuận tự nguyện giữa các Bên;
Hôm nay, ngày               tháng               năm               , tại TP.HCM, chúng tôi gồm có:

BÊN A: ĐƠN VỊ VẬN HÀNH NỀN TẢNG GEARXPERT
- Tên đơn vị: CÔNG TY TNHH GEARXPERT
- Mã số doanh nghiệp: 0123456789
- Địa chỉ trụ sở: Tầng 3, Toà nhà GearXpert, TP. HCM
- Đại diện bởi: Nguyễn Văn A
- Chức vụ: Giám đốc
- Số điện thoại: 1900 xxxx
- Email: cskh@gearxpert.vn

BÊN B: ĐỐI TÁC CUNG CẤP THIẾT BỊ (SUPPLIER)

- Hình thức: 
- Họ và tên / Tên đơn vị: 
- Ngày sinh / Mã số thuế: 
- Số CCCD / Giấy Phép KD: 
- Ngày cấp:                               Nơi cấp: 
- Địa chỉ: 
- Người đại diện (nếu tổ chức): 
- Chức vụ: 
- Số điện thoại: 
- Email: 
- Tài khoản ngân hàng: 

Sau đây gọi là "Bên B" hoặc "Supplier".
Bên A và Bên B sau đây gọi riêng là "Bên", gọi chung là "Các Bên".

ĐIỀU 1. MỤC ĐÍCH VÀ PHẠM VI HỢP TÁC
1.1. Bên A là đơn vị vận hành nền tảng số GearXpert theo mô hình kết nối người cho thuê và người thuê thiết bị.
1.2. Bên B có nhu cầu đăng ký tham gia GearXpert với tư cách Supplier để đưa thiết bị thuộc quyền sở hữu hoặc quyền khai thác hợp pháp của mình lên nền tảng cho thuê.
1.3. Các Bên thống nhất rằng GearXpert là nền tảng trung gian hỗ trợ kết nối, quản lý đơn thuê, hỗ trợ thanh toán, lưu trữ dữ liệu giao dịch, hỗ trợ giao nhận và hỗ trợ giải quyết tranh chấp.

ĐIỀU 2. GIẢI THÍCH THUẬT NGỮ
2.1. Nền tảng GearXpert là website, ứng dụng hoặc hệ thống số do Bên A sở hữu, quản lý và vận hành.
2.2. Supplier là cá nhân, hộ kinh doanh hoặc tổ chức đã được Bên A phê duyệt.

ĐIỀU 3. HỒ SƠ ĐĂNG KÝ VÀ XÁC MINH SUPPLIER
3.1. Bên B có trách nhiệm cung cấp đầy đủ, chính xác, trung thực các hồ sơ đã điền ở trên.
3.2. Bên A có quyền yêu cầu Bên B bổ sung hồ sơ, xác minh lại thông tin hoặc từ chối phê duyệt nếu phát hiện sai lệch.

ĐIỀU 4. ĐIỀU KIỆN ĐỐI VỚI THIẾT BỊ CHO THUÊ
4.1. Thiết bị do Bên B đăng tải phải thuộc quyền sở hữu hợp pháp.
4.2. Bên B có trách nhiệm cung cấp thông chính xác về tên thiết bị, tình trạng.

ĐIỀU 5 - ĐIỀU 12. CHI TIẾT TẠI WEBSITE GEARXPERT
Quy định chi tiết về nhận đơn, giao nhận, hoàn trả, thanh toán, bảo mật thông tin, và bồi thường được áp dụng 100% theo các chính sách và điều khoản công khai trên ứng dụng GearXpert.
(Xem chi tiết tại https://gearxpert.vn/terms-and-policies)

ĐIỀU 13. THỜI HẠN VÀ CHẤM DỨT
13.1. Hợp đồng có hiệu lực kể từ ngày xác nhận điện tử.
13.2. Thời hạn 12 tháng, tự động gia hạn.

ĐIỀU 14. ĐIỀU KHOẢN CHẤP NHẬN ĐIỆN TỬ
Bằng việc thực hiện chữ ký điện tử, người dùng (Bên B) xác nhận đã đọc, hiểu và đồng ý chịu ràng buộc bởi Hợp đồng hợp tác Supplier cùng toàn bộ chính sách trên GearXpert.

ĐẠI DIỆN BÊN A

(Ký, ghi rõ họ tên, chức vụ và đóng dấu)
[CÔNG TY TNHH GEARXPERT]


ĐẠI DIỆN BÊN B

(Ký, ghi rõ họ tên, chức vụ và đóng dấu)





PHỤ LỤC 01. BIỂU PHÍ VÀ CƠ CHẾ ĐỐI SOÁT
1. Phí nền tảng: Bên A thu phí nền tảng đối với mỗi đơn thuê thành công ở mức 10% - 20% trên doanh thu thuê thực tế, chưa bao gồm các khoản phạt hoặc bồi thường.
2. Mức phí cụ thể áp dụng cho Bên B tại thời điểm ký Hợp đồng là: 10%.
3. Phí thanh toán qua cổng thanh toán được tính theo biểu phí của đối tác thanh toán. Bên A có thể khấu trừ khoản phí này trước khi đối soát doanh thu cho Bên B.
4. Phí giao nhận được xác định theo khoảng cách, khu vực, loại thiết bị và chính sách vận chuyển của Bên A. Phương thức phân bổ chi phí có thể thay đổi tùy theo chương trình.
5. Bên A thực hiện đối soát định kỳ vào ngày 05 và 20 hàng tháng. Thời gian thanh toán: trong vòng 03 - 07 ngày làm việc kể từ ngày đối soát.

PHỤ LỤC 02. BẢNG CHẾ TÀI VẬN HÀNH ĐỐI VỚI SUPPLIER
- Chậm phản hồi đơn thuê: Nhắc nhở; tái diễn có thể giảm độ ưu tiên.
- Hủy đơn do lỗi Supplier: Phạt hoặc bồi thường thực tế.
- Giao sai/ thiếu thiết bị: Bồi thường toàn bộ chi phí đổi/đền bù.
- Gian lận hồ sơ: Cấm vĩnh viễn khỏi nền tảng.
`;

const PDFDocumentOptions = {
    size: 'A4',
    margins: {
        top: 50,
        bottom: 50,
        left: 50,
        right: 50
    }
};

const doc = new PDFDocument(PDFDocumentOptions);
doc.pipe(fs.createWriteStream(path.join(__dirname, '../templatesContract/GearXpert_Contact_Supplier.pdf')));

const fontPath = path.join(__dirname, '../fonts/DejaVuSans.ttf');
doc.font(fontPath);
doc.fontSize(10);
doc.lineGap(3);

doc.text(contractText, {
    align: 'left'
});

doc.end();