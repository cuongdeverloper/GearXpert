# 📋 Quy Trình Triển Khai Chức Năng: Thuê Nhóm & Chia Hóa Đơn (Rental Splitting)

Tài liệu này mô tả chi tiết cách thức hoạt động, kiến trúc kỹ thuật và luồng người dùng cho tính năng **Thuê Nhóm & Chia Hóa Đơn** dành cho dự án GearXpert.

---

## 🚀 1. Luồng Người Dùng (User Flow)

### Bước 1: Khởi tạo (Trưởng nhóm - Leader)
- Tại trang **Giỏ hàng (Cart)** hoặc **Thanh toán (Checkout)**, người dùng chọn phương thức "Thuê theo nhóm".
- Leader nhập thông tin các thành viên tham gia (Email/SĐT/Username) hoặc chọn trực tiếp từ danh sách bạn bè.
- Leader chọn kiểu chia tiền:
    - **Chia đều (Equal):** Hệ thống tự động chia đều tổng giá trị cho số người tham gia.
    - **Tùy chỉnh (Custom):** Leader nhập số tiền lẻ cho từng người (Tổng phải khớp 100%).

### Bước 2: Chờ Xác nhận (Pending Members)
- Đơn hàng được lưu ở trạng thái `GROUP_PENDING`.
- Hệ thống gửi thông báo (Push Notify/Email/Socket.io) cho các Thành viên (Members).
- Members vào trang "Lời mời Thuê nhóm" để xem danh sách đồ và số tiền cần đóng.
- Members bấm **"Đồng ý & Thanh toán"**.

### Bước 3: Thanh toán Cá nhân (Individual Payment)
- Mỗi Member (bao gồm cả Leader) sẽ có một mã **VietQR (PayOS)** riêng biệt với số tiền tương ứng.
- Member quét mã và thanh toán phần của mình.
- Hệ thống nhận Webhook từ PayOS cho từng mã và cập nhật trạng thái "Đã đóng tiền" cho member đó.

### Bước 4: Hoàn tất & Giao hàng (Completion)
- Khi thanh toán đạt **100%**, đơn hàng tự động chuyển sang trạng thái `READY_TO_SHIP`.
- Thông báo cho Supplier để chuẩn bị thiết bị.

---

## 🏗️ 2. Kiến trúc Kỹ thuật (Technical Architecture)

### A. Mô hình Dữ liệu (Database Models)
Cần bổ sung/sửa đổi các model sau:

1. **GroupRental (Model mới):**
    - `leaderId`: ID người khởi tạo.
    - `rentalItems`: Danh sách thiết bị (deviceId, quantity).
    - `totalAmount`: Tổng tiền đơn hàng.
    - `members`: Array objects `[{userId, amount, status: [PENDING, PAID], paymentLinkId}]`.
    - `status`: [WAITING, COMPLETED, CANCELLED].
    - `expiresAt`: Thời gian tối đa để cả nhóm hoàn tất đóng tiền (VD: 2 giờ).

2. **Rental (Model hiện tại):**
    - Liên kết với `GroupRentalId` nếu là đơn thuê nhóm.

### B. Logic Phía Backend (Node.js/Express)
- **API Create Group:** Kiểm tra tồn kho -> Khởi tạo GroupRental -> Tạo 3 PaymentLinks PayOS -> Trả về ID nhóm.
- **Webhook Handler:** Khi nhận Webhook từ PayOS, backend tìm `paymentLinkId` nằm trong `members` của `GroupRental` nào -> Cập nhật `PAID` cho member đó -> Kiểm tra nếu `PAID` toàn bộ -> Chuyển trạng thái đơn hàng.

---

## 🎨 3. Giao diện người dùng (UI/UX)

1. **Trang Checkout (Nâng cấp):** Thêm nút bật Tab "Thuê theo nhóm" và form nhập danh sách thành viên.
2. **Thanh Tiến độ (Progress Bar):** Hiển thị trực quan AI đã đóng tiền, AI chưa đóng tiền.
3. **Màn hình Thanh toán Cá nhân:** Hiển thị danh sách thiết bị nhóm định thuê + Mã VietQR cá nhân.

---

## 🛠️ 4. Yêu cầu Công nghệ (Requirements)

### Công nghệ hiện có:
- **PayOS:** Dùng để tạo Payment Links riêng biệt cho mỗi mã đơn con.
- **React/Redux:** Quản lý trạng thái đơn hàng nhóm.
- **Socket.io:** Đã có trong dự án, dùng để cập nhật realtime cho Leader khi có Member thanh toán thành công (Vừa có người đóng tiền là Progress bar nhích lên ngay).

### Công nghệ/Yếu tố bổ sung:
- **Redis (Khuyên dùng):** Dùng để quản lý "Hết hạn thanh toán" (Timeout). Nếu sau 2 giờ không đóng đủ tiền, Redis sẽ trigger việc hủy đơn và hoàn tiền vào ví nội bộ.
- **Push Notification (FCM/OneSignal):** Để báo cho các thành viên biết họ vừa được mời vào một nhóm thuê đồ.

---

## ⏳ 5. Xử lý các trường hợp ngoại lệ (Edge Cases)

| Tình huống | Cách xử lý |
| :--- | :--- |
| **Một người không đóng tiền?** | Sau thời gian `expiresAt`, đơn hàng hủy. Tiền của những người đã đóng sẽ được hoàn vào **Ví (Wallet)** của họ trên GearXpert. |
| **Leader muốn đóng hộ cho Member?** | Leader chỉ cần quét mã QR của Member đó để thanh toán. |
| **Supplier hết hàng giữa chừng?** | Khóa tồn kho (Booking) ngay khi tạo GroupRental để đảm bảo đủ đồ cho cả nhóm trong vòng 2 giờ chờ thanh toán. |

---
*Tài liệu này được soạn phục vụ cho lộ trình phát triển tính năng đột phá cho GearXpert.*
