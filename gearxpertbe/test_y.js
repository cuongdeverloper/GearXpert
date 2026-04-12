const PDFDocument = require('pdfkit');
const fs = require('fs');

const doc = new PDFDocument({ size: 'A4', margins: { top: 50, bottom: 50, left: 50, right: 50 } });
doc.font('./fonts/DejaVuSans.ttf');
doc.fontSize(10);
doc.lineGap(3);

const lines = [
  '- Hình thức: ',
  '- Họ và tên / Tên đơn vị: ',
  '- Ngày sinh / Mã số thuế: ',
  '- Số CCCD / Giấy Phép KD: ',
  '- Ngày cấp:                               Nơi cấp: ',
  '- Địa chỉ: ',
  '- Người đại diện (nếu tổ chức): ',
  '- Chức vụ: ',
  '- Số điện thoại: ',
  '- Email: ',
  '- Tài khoản ngân hàng: '
];

const textParts = `GEARXPERT
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

`.split('\n');

for (const line of textParts) {
  doc.text(line, { align: 'left' });
}
for (const line of lines) {
  doc.text(line, { align: 'left' });
}
